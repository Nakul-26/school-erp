import { describe, it, expect, beforeEach } from 'vitest';
import { env, reset } from 'cloudflare:test';
import { applySchema } from './helpers/apply-schema';
import { seedInstitution, seedUser, seedAcademicYear, seedCourse, seedStudent, seedSection, seedStudentEnrollment } from './helpers/seed';
import { isStudentOnly, isParentOnly, getOwnStudentInfo, getGuardianChildSectionId, isGuardianOf, isOwnStudentOrGuardianOf } from '../src/utils/student-scope';
import type { JwtPayload } from '../src/types';

// These helpers back the Student/Parent scoping added to the weekly-timetable
// routes (a student/parent can only ever resolve their own/their child's
// section, never an arbitrary one) - covered here directly against real D1,
// the same way the codebase already tests other authorization helpers
// (repository/service functions) rather than through a full HTTP+JWT round trip.
beforeEach(async () => {
  await reset();
  await applySchema(env.DB);
});

function payload(overrides: Partial<JwtPayload>): JwtPayload {
  return {
    sub: 'user-x',
    institution_id: 'inst-x',
    roles: [],
    email: 'x@example.com',
    name: 'X',
    exp: 0,
    ...overrides,
  };
}

describe('isStudentOnly / isParentOnly', () => {
  it('is true for a plain student/parent role and false for anyone with a privileged role too', () => {
    expect(isStudentOnly(payload({ roles: ['Student'] }))).toBe(true);
    expect(isStudentOnly(payload({ roles: ['Student', 'admin'] }))).toBe(false);
    expect(isParentOnly(payload({ roles: ['Parent'] }))).toBe(true);
    expect(isParentOnly(payload({ roles: ['Guardian'] }))).toBe(true);
    expect(isParentOnly(payload({ roles: ['Parent', 'Principal'] }))).toBe(false);
  });

  it('is false for unrelated roles', () => {
    expect(isStudentOnly(payload({ roles: ['Teacher'] }))).toBe(false);
    expect(isParentOnly(payload({ roles: ['Teacher'] }))).toBe(false);
  });
});

describe('getOwnStudentInfo', () => {
  it("resolves the logged-in student's own id and current section", async () => {
    const institutionId = crypto.randomUUID();
    const userId = crypto.randomUUID();
    const academicYearId = crypto.randomUUID();
    const courseId = crypto.randomUUID();
    const studentId = crypto.randomUUID();
    const sectionId = crypto.randomUUID();

    await seedInstitution(env.DB, institutionId);
    await seedUser(env.DB, userId, institutionId);
    await seedAcademicYear(env.DB, academicYearId, institutionId);
    await seedCourse(env.DB, courseId, institutionId);
    await seedStudent(env.DB, studentId, institutionId, 'ADM-0001');
    await env.DB.prepare('UPDATE students SET user_id = ? WHERE id = ?').bind(userId, studentId).run();
    await seedSection(env.DB, sectionId, institutionId, academicYearId, courseId);
    await seedStudentEnrollment(env.DB, crypto.randomUUID(), studentId, academicYearId, courseId, sectionId, 1, '2026-01-01');

    const user = payload({ sub: userId, institution_id: institutionId, roles: ['Student'] });
    const info = await getOwnStudentInfo(env.DB, user);

    expect(info).not.toBeNull();
    expect(info!.id).toBe(studentId);
    expect(info!.section_id).toBe(sectionId);
  });

  it('returns null for a user with no linked student record', async () => {
    const institutionId = crypto.randomUUID();
    const userId = crypto.randomUUID();
    await seedInstitution(env.DB, institutionId);
    await seedUser(env.DB, userId, institutionId);

    const user = payload({ sub: userId, institution_id: institutionId, roles: ['Student'] });
    expect(await getOwnStudentInfo(env.DB, user)).toBeNull();
  });
});

describe('getGuardianChildSectionId', () => {
  it("resolves a child's section for a parent with a real guardian link", async () => {
    const institutionId = crypto.randomUUID();
    const parentUserId = crypto.randomUUID();
    const academicYearId = crypto.randomUUID();
    const courseId = crypto.randomUUID();
    const studentId = crypto.randomUUID();
    const sectionId = crypto.randomUUID();

    await seedInstitution(env.DB, institutionId);
    await seedUser(env.DB, parentUserId, institutionId);
    await seedAcademicYear(env.DB, academicYearId, institutionId);
    await seedCourse(env.DB, courseId, institutionId);
    await seedStudent(env.DB, studentId, institutionId, 'ADM-0002');
    await seedSection(env.DB, sectionId, institutionId, academicYearId, courseId);
    await seedStudentEnrollment(env.DB, crypto.randomUUID(), studentId, academicYearId, courseId, sectionId, 1, '2026-01-01');
    await env.DB.prepare(`
      INSERT INTO guardians (id, student_id, user_id, name, relationship)
      VALUES (?, ?, ?, 'Test Parent', 'Father')
    `).bind(crypto.randomUUID(), studentId, parentUserId).run();

    const user = payload({ sub: parentUserId, institution_id: institutionId, roles: ['Parent'] });
    const result = await getGuardianChildSectionId(env.DB, user, studentId);

    expect(result).toBe(sectionId);
  });

  it("refuses to resolve a section for a student the caller has no guardian link to", async () => {
    const institutionId = crypto.randomUUID();
    const parentUserId = crypto.randomUUID();
    const otherParentUserId = crypto.randomUUID();
    const academicYearId = crypto.randomUUID();
    const courseId = crypto.randomUUID();
    const studentId = crypto.randomUUID();
    const sectionId = crypto.randomUUID();

    await seedInstitution(env.DB, institutionId);
    await seedUser(env.DB, parentUserId, institutionId);
    await seedUser(env.DB, otherParentUserId, institutionId);
    await seedAcademicYear(env.DB, academicYearId, institutionId);
    await seedCourse(env.DB, courseId, institutionId);
    await seedStudent(env.DB, studentId, institutionId, 'ADM-0003');
    await seedSection(env.DB, sectionId, institutionId, academicYearId, courseId);
    await seedStudentEnrollment(env.DB, crypto.randomUUID(), studentId, academicYearId, courseId, sectionId, 1, '2026-01-01');
    await env.DB.prepare(`
      INSERT INTO guardians (id, student_id, user_id, name, relationship)
      VALUES (?, ?, ?, 'Actual Parent', 'Mother')
    `).bind(crypto.randomUUID(), studentId, parentUserId).run();

    // otherParentUserId has no guardian row for this student at all.
    const attacker = payload({ sub: otherParentUserId, institution_id: institutionId, roles: ['Parent'] });
    expect(await getGuardianChildSectionId(env.DB, attacker, studentId)).toBeNull();
  });
});

describe('isOwnStudentOrGuardianOf (used to scope self-service certificate access)', () => {
  it('is true for the student themselves, false for any other student', async () => {
    const institutionId = crypto.randomUUID();
    const userId = crypto.randomUUID();
    const studentId = crypto.randomUUID();
    const otherStudentId = crypto.randomUUID();

    await seedInstitution(env.DB, institutionId);
    await seedUser(env.DB, userId, institutionId);
    await seedStudent(env.DB, studentId, institutionId, 'ADM-CERT-1');
    await seedStudent(env.DB, otherStudentId, institutionId, 'ADM-CERT-2');
    await env.DB.prepare('UPDATE students SET user_id = ? WHERE id = ?').bind(userId, studentId).run();

    const user = payload({ sub: userId, institution_id: institutionId, roles: ['Student'] });
    expect(await isOwnStudentOrGuardianOf(env.DB, user, studentId)).toBe(true);
    expect(await isOwnStudentOrGuardianOf(env.DB, user, otherStudentId)).toBe(false);
  });

  it('is true for a real guardian of the student, false for an unrelated parent', async () => {
    const institutionId = crypto.randomUUID();
    const parentUserId = crypto.randomUUID();
    const strangerUserId = crypto.randomUUID();
    const studentId = crypto.randomUUID();

    await seedInstitution(env.DB, institutionId);
    await seedUser(env.DB, parentUserId, institutionId);
    await seedUser(env.DB, strangerUserId, institutionId);
    await seedStudent(env.DB, studentId, institutionId, 'ADM-CERT-3');
    await env.DB.prepare(`
      INSERT INTO guardians (id, student_id, user_id, name, relationship)
      VALUES (?, ?, ?, 'Test Parent', 'Mother')
    `).bind(crypto.randomUUID(), studentId, parentUserId).run();

    const parent = payload({ sub: parentUserId, institution_id: institutionId, roles: ['Parent'] });
    const stranger = payload({ sub: strangerUserId, institution_id: institutionId, roles: ['Parent'] });

    expect(await isGuardianOf(env.DB, parent, studentId)).toBe(true);
    expect(await isOwnStudentOrGuardianOf(env.DB, parent, studentId)).toBe(true);
    expect(await isGuardianOf(env.DB, stranger, studentId)).toBe(false);
    expect(await isOwnStudentOrGuardianOf(env.DB, stranger, studentId)).toBe(false);
  });

  it('is false for a role that is neither student nor parent', async () => {
    const institutionId = crypto.randomUUID();
    const studentId = crypto.randomUUID();
    await seedInstitution(env.DB, institutionId);
    await seedStudent(env.DB, studentId, institutionId, 'ADM-CERT-4');

    const teacher = payload({ sub: 'teacher-1', institution_id: institutionId, roles: ['Teacher'] });
    expect(await isOwnStudentOrGuardianOf(env.DB, teacher, studentId)).toBe(false);
  });
});
