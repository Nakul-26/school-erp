import { describe, it, expect, beforeEach } from 'vitest';
import { env, reset } from 'cloudflare:test';
import { applySchema } from './helpers/apply-schema';
import {
  seedInstitution,
  seedAcademicYear,
  seedCourse,
  seedStudent,
  seedSection,
  seedStudentEnrollment,
} from './helpers/seed';

// The bulk "assign section" / "promote semester" actions on
// students.routes.ts used to fetch each student's latest active enrollment
// with a separate "ORDER BY created_at DESC LIMIT 1" query per student. That
// was rewritten as a single set-based query using a window function so bulk
// operations don't do one round-trip per row. This test proves that
// rewritten query picks the same row a per-student query would have picked —
// the newest active enrollment — even when older rows were inserted later.
describe('latest-active-enrollment window query (used by students bulk-action)', () => {
  beforeEach(async () => {
    await reset();
    await applySchema(env.DB);
  });

  it('picks the most recently created active enrollment per student, not the last row inserted', async () => {
    const institutionId = crypto.randomUUID();
    const academicYearId = crypto.randomUUID();
    const courseId = crypto.randomUUID();
    const sectionId = crypto.randomUUID();
    const studentA = crypto.randomUUID();
    const studentB = crypto.randomUUID();

    await seedInstitution(env.DB, institutionId);
    await seedAcademicYear(env.DB, academicYearId, institutionId);
    await seedCourse(env.DB, courseId, institutionId);
    await seedSection(env.DB, sectionId, institutionId, academicYearId, courseId);
    await seedStudent(env.DB, studentA, institutionId, 'ADM-A');
    await seedStudent(env.DB, studentB, institutionId, 'ADM-B');

    // Student A: two enrollments, the newer one (by created_at) inserted
    // FIRST — so a naive "last row wins" assumption would get this wrong.
    const aOld = crypto.randomUUID();
    const aNew = crypto.randomUUID();
    await seedStudentEnrollment(env.DB, aNew, studentA, academicYearId, courseId, sectionId, 2, '2026-06-05T00:00:00Z');
    await seedStudentEnrollment(env.DB, aOld, studentA, academicYearId, courseId, sectionId, 1, '2026-06-01T00:00:00Z');

    // Student B: a single enrollment.
    const bOnly = crypto.randomUUID();
    await seedStudentEnrollment(env.DB, bOnly, studentB, academicYearId, courseId, sectionId, 3, '2026-06-02T00:00:00Z');

    const validIds = [studentA, studentB];
    const validPh = validIds.map(() => '?').join(',');
    const { results } = await env.DB.prepare(
      `SELECT id, student_id, semester FROM (
         SELECT id, student_id, semester, ROW_NUMBER() OVER (PARTITION BY student_id ORDER BY created_at DESC) AS rn
         FROM student_enrollments WHERE student_id IN (${validPh}) AND is_active = 1
       ) WHERE rn = 1`
    ).bind(...validIds).all<{ id: string; student_id: string; semester: number }>();

    expect(results).toHaveLength(2);
    const byStudent = new Map((results || []).map((r) => [r.student_id, r]));
    expect(byStudent.get(studentA)?.id).toBe(aNew);
    expect(byStudent.get(studentA)?.semester).toBe(2);
    expect(byStudent.get(studentB)?.id).toBe(bOnly);
  });
});
