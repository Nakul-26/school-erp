import { describe, it, expect, beforeEach } from 'vitest';
import { env, reset } from 'cloudflare:test';
import { sign } from 'hono/jwt';
import { applySchema } from './helpers/apply-schema';
import { seedInstitution, seedAcademicYear, seedCourse, seedSection } from './helpers/seed';
import allocations from '../src/modules/teaching-allocations/allocations.routes';

// Exercises the real HTTP route (not just the service layer) because the
// bulk-assign logic lives inline in allocations.routes.ts - this is the
// endpoint the new "Bulk Assign" modal in AcademicSetup.tsx now calls for
// the first time, so it's worth confirming the actual preview/commit
// contract end-to-end rather than just its building blocks. (This is also
// how a real undefined-bind-param 500 in commit mode was found: the route
// requires department_id/program_id/semester/year_number - NOT NULL columns
// with no server-side default - and neither this test nor the frontend
// modal originally supplied them.)
beforeEach(async () => {
  await reset();
  await applySchema(env.DB);
});

async function makeFixture() {
  const institutionId = crypto.randomUUID();
  const academicYearId = crypto.randomUUID();
  const courseId = crypto.randomUUID();
  const departmentId = crypto.randomUUID();
  const sectionA = crypto.randomUUID();
  const sectionB = crypto.randomUUID();
  const subjectId = crypto.randomUUID();
  const teacherId = crypto.randomUUID();

  await seedInstitution(env.DB, institutionId);
  await seedAcademicYear(env.DB, academicYearId, institutionId);
  await seedCourse(env.DB, courseId, institutionId);
  await seedSection(env.DB, sectionA, institutionId, academicYearId, courseId, 'Section A');
  await seedSection(env.DB, sectionB, institutionId, academicYearId, courseId, 'Section B');

  await env.DB.prepare(`INSERT INTO departments (id, institution_id, name, code) VALUES (?, ?, 'Science', 'SCI')`).bind(departmentId, institutionId).run();

  await env.DB.prepare(`
    INSERT INTO subjects (id, institution_id, course_id, subject_code, subject_name, semester)
    VALUES (?, ?, ?, 'MATH101', 'Mathematics', 1)
  `).bind(subjectId, institutionId, courseId).run();

  await env.DB.prepare(`
    INSERT INTO teachers (id, institution_id, employee_id, first_name, last_name, status)
    VALUES (?, ?, 'EMP-BULK-1', 'Test', 'Teacher', 'ACTIVE')
  `).bind(teacherId, institutionId).run();

  const token = await sign(
    { sub: crypto.randomUUID(), institution_id: institutionId, roles: ['super_admin'], email: 'a@b.com', name: 'A', exp: Math.floor(Date.now() / 1000) + 3600 },
    env.JWT_SECRET,
    'HS256'
  );

  return { institutionId, academicYearId, courseId, departmentId, sectionA, sectionB, subjectId, teacherId, token };
}

async function post(token: string, path: string, body: any) {
  return allocations.request(
    path,
    { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify(body) },
    { DB: env.DB, JWT_SECRET: env.JWT_SECRET }
  );
}

// Mirrors exactly what the AcademicSetup.tsx bulk-assign modal now sends.
function allocPayload(fx: Awaited<ReturnType<typeof makeFixture>>, sectionId: string, classesPerWeek = 5) {
  return {
    teacher_id: fx.teacherId,
    subject_id: fx.subjectId,
    section_id: sectionId,
    department_id: fx.departmentId,
    program_id: fx.courseId,
    semester: 1,
    year_number: 1,
    classes_per_week: classesPerWeek,
  };
}

describe('POST /teaching-allocations/bulk', () => {
  it('preview mode validates without writing anything', async () => {
    const fx = await makeFixture();

    const res = await post(fx.token, '/bulk', {
      academic_year_id: fx.academicYearId,
      preview: true,
      allocations: [allocPayload(fx, fx.sectionA), allocPayload(fx, fx.sectionB)],
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.errors).toHaveLength(0);
    expect(body.total_allocations).toBe(2);

    const { results } = await env.DB.prepare('SELECT * FROM teaching_allocations').all();
    expect(results).toHaveLength(0);
  });

  it('commit mode actually inserts one row per section', async () => {
    const fx = await makeFixture();

    const res = await post(fx.token, '/bulk', {
      academic_year_id: fx.academicYearId,
      preview: false,
      allocations: [allocPayload(fx, fx.sectionA), allocPayload(fx, fx.sectionB)],
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    const { results } = await env.DB.prepare('SELECT section_id, classes_per_week, is_active FROM teaching_allocations WHERE teacher_id = ? AND subject_id = ?').bind(fx.teacherId, fx.subjectId).all<any>();
    expect(results).toHaveLength(2);
    expect(results!.every((r: any) => r.classes_per_week === 5 && r.is_active === 1)).toBe(true);
  });

  it('flags an already-existing mapping as a duplicate instead of silently re-creating it', async () => {
    const fx = await makeFixture();

    await post(fx.token, '/bulk', {
      academic_year_id: fx.academicYearId,
      preview: false,
      allocations: [allocPayload(fx, fx.sectionA)],
    });

    const second = await post(fx.token, '/bulk', {
      academic_year_id: fx.academicYearId,
      preview: true,
      allocations: [allocPayload(fx, fx.sectionA, 6)],
    });
    const body = await second.json();

    expect(body.success).toBe(false);
    expect(body.errors.length).toBeGreaterThan(0);
    expect(body.errors[0]).toMatch(/already exists/i);

    const { results } = await env.DB.prepare('SELECT * FROM teaching_allocations WHERE teacher_id = ? AND subject_id = ? AND section_id = ?').bind(fx.teacherId, fx.subjectId, fx.sectionA).all();
    expect(results).toHaveLength(1);
  });

  it('rejects an inactive teacher without touching the database', async () => {
    const fx = await makeFixture();
    await env.DB.prepare("UPDATE teachers SET status = 'RESIGNED' WHERE id = ?").bind(fx.teacherId).run();

    const res = await post(fx.token, '/bulk', {
      academic_year_id: fx.academicYearId,
      preview: true,
      allocations: [allocPayload(fx, fx.sectionA)],
    });
    const body = await res.json();

    expect(body.success).toBe(false);
    expect(body.errors[0]).toMatch(/inactive status/i);
  });

  it('rejects a payload missing the required department/program/semester/year fields cleanly, instead of a raw D1 error', async () => {
    const fx = await makeFixture();

    const res = await post(fx.token, '/bulk', {
      academic_year_id: fx.academicYearId,
      preview: false,
      allocations: [{ teacher_id: fx.teacherId, subject_id: fx.subjectId, section_id: fx.sectionA, classes_per_week: 5 }],
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.errors[0]).toMatch(/Missing department_id/i);

    const { results } = await env.DB.prepare('SELECT * FROM teaching_allocations').all();
    expect(results).toHaveLength(0);
  });
});
