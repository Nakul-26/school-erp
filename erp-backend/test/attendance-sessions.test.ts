import { describe, it, expect, beforeEach } from 'vitest';
import { env, reset } from 'cloudflare:test';
import { applySchema } from './helpers/apply-schema';
import { seedInstitution, seedAcademicYear, seedCourse, seedSection, seedStudent, seedStudentEnrollment } from './helpers/seed';
import { AttendanceRepository } from '../src/modules/attendance/attendance.repository';
import { AttendanceService, AttendanceServiceError } from '../src/modules/attendance/attendance.service';

beforeEach(async () => {
  await reset();
  await applySchema(env.DB);
});

// A recent weekday (never Sunday, so it never trips the holiday/weekend
// guard) - `daysAgo` days back from today.
function recentWeekday(daysAgo: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  while (d.getUTCDay() === 0) {
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return d.toISOString().slice(0, 10);
}

async function makeFixture() {
  const institutionId = crypto.randomUUID();
  const academicYearId = crypto.randomUUID();
  const courseId = crypto.randomUUID();
  const sectionId = crypto.randomUUID();
  const subjectId = crypto.randomUUID();
  const teacherId = crypto.randomUUID();
  const studentId = crypto.randomUUID();

  await seedInstitution(env.DB, institutionId);
  await seedAcademicYear(env.DB, academicYearId, institutionId);
  await seedCourse(env.DB, courseId, institutionId);
  await seedSection(env.DB, sectionId, institutionId, academicYearId, courseId);
  await seedStudent(env.DB, studentId, institutionId, 'ADM-ATT-1');
  await seedStudentEnrollment(env.DB, crypto.randomUUID(), studentId, academicYearId, courseId, sectionId, 1, '2026-01-01');

  await env.DB.prepare(`
    INSERT INTO subjects (id, institution_id, course_id, subject_code, subject_name)
    VALUES (?, ?, ?, 'MATH101', 'Mathematics')
  `).bind(subjectId, institutionId, courseId).run();

  await env.DB.prepare(`
    INSERT INTO teachers (id, institution_id, employee_id, first_name, last_name)
    VALUES (?, ?, 'EMP-1', 'Test', 'Teacher')
  `).bind(teacherId, institutionId).run();

  await env.DB.prepare(`
    INSERT INTO teacher_subject_assignments (id, teacher_id, subject_id, course_id, section_id, academic_year_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(crypto.randomUUID(), teacherId, subjectId, courseId, sectionId, academicYearId).run();

  const repo = new AttendanceRepository(env.DB);
  const service = new AttendanceService(repo, env.DB);

  return { institutionId, academicYearId, courseId, sectionId, subjectId, teacherId, studentId, repo, service };
}

describe('AttendanceService.createSession - future date guard', () => {
  it('rejects a session date in the future, with no override possible', async () => {
    const { institutionId, sectionId, subjectId, teacherId, service } = await makeFixture();

    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const futureDate = tomorrow.toISOString().slice(0, 10);

    await expect(
      service.createSession(institutionId, { section_id: sectionId, subject_id: subjectId, teacher_id: teacherId, date: futureDate }, 'u1', true)
    ).rejects.toThrow(/future date/i);
  });

  it('allows a session for today', async () => {
    const { institutionId, sectionId, subjectId, teacherId, service } = await makeFixture();
    const today = recentWeekday(0);

    const id = await service.createSession(institutionId, { section_id: sectionId, subject_id: subjectId, teacher_id: teacherId, date: today });
    expect(id).toBeTruthy();
  });
});

describe('AttendanceService.markAttendance - editing an already-marked day', () => {
  it('re-marking the same session updates the existing record instead of erroring or duplicating', async () => {
    const { institutionId, sectionId, subjectId, teacherId, studentId, repo, service } = await makeFixture();
    const today = recentWeekday(0);

    const sessionId = await service.createSession(institutionId, { section_id: sectionId, subject_id: subjectId, teacher_id: teacherId, date: today });

    await service.markAttendance(institutionId, sessionId, [{ student_id: studentId, status: 'absent' }]);
    let rows = await repo.getSessionAttendance(sessionId, sectionId);
    expect(rows.find((r: any) => r.student_id === studentId)?.status).toBe('absent');

    // Re-mark the same day: should update in place, not throw or create a
    // second row for the same student in the same session.
    await service.markAttendance(institutionId, sessionId, [{ student_id: studentId, status: 'present' }]);
    rows = await repo.getSessionAttendance(sessionId, sectionId);
    const matching = rows.filter((r: any) => r.student_id === studentId);
    expect(matching).toHaveLength(1);
    expect(matching[0].status).toBe('present');
  });

  it('blocks editing a session older than 24 hours without override', async () => {
    const { institutionId, sectionId, subjectId, teacherId, studentId, service } = await makeFixture();
    const oldDate = recentWeekday(5);

    const sessionId = await service.createSession(institutionId, { section_id: sectionId, subject_id: subjectId, teacher_id: teacherId, date: oldDate });

    await expect(
      service.markAttendance(institutionId, sessionId, [{ student_id: studentId, status: 'present' }])
    ).rejects.toThrow(/locked/i);
  });

  it('allows editing an old session when override is passed', async () => {
    const { institutionId, sectionId, subjectId, teacherId, studentId, repo, service } = await makeFixture();
    const oldDate = recentWeekday(5);

    const sessionId = await service.createSession(institutionId, { section_id: sectionId, subject_id: subjectId, teacher_id: teacherId, date: oldDate });

    await service.markAttendance(institutionId, sessionId, [{ student_id: studentId, status: 'present' }], 'u1', true);
    const rows = await repo.getSessionAttendance(sessionId, sectionId);
    expect(rows.find((r: any) => r.student_id === studentId)?.status).toBe('present');
  });
});
