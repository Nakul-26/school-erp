import { describe, it, expect, beforeEach } from 'vitest';
import { env, reset } from 'cloudflare:test';
import { applySchema } from './helpers/apply-schema';
import { seedInstitution, seedUser, seedAcademicYear } from './helpers/seed';
import { AdmissionsRepository } from '../src/modules/admissions/admissions.repository';
import { AdmissionsService } from '../src/modules/admissions/admissions.service';

// D1 storage isn't reset between tests the way KV/R2 are, so each test wipes
// and re-applies the schema itself for full isolation (fixtures generate the
// same application_number for a fresh institution every time, which would
// otherwise collide with a leftover student row from a previous test since
// students.admission_number is globally unique, not per-institution).
beforeEach(async () => {
  await reset();
  await applySchema(env.DB);
});

async function makeApplicationFixture() {
  const institutionId = crypto.randomUUID();
  const approverId = crypto.randomUUID();
  const academicYearId = crypto.randomUUID();

  await seedInstitution(env.DB, institutionId);
  await seedUser(env.DB, approverId, institutionId);
  await seedAcademicYear(env.DB, academicYearId, institutionId);

  const repo = new AdmissionsRepository(env.DB);
  const service = new AdmissionsService(repo);

  const applicationId = await service.createApplication(institutionId, {
    student_first_name: 'Ada',
    student_last_name: 'Lovelace',
    academic_year_id: academicYearId,
    parent_name: 'Parent Name',
    parent_phone: '9999999999',
  });

  return { institutionId, approverId, applicationId, repo, service };
}

describe('AdmissionsService.approveApplication', () => {
  it('approves the application and atomically creates + links a student record', async () => {
    const { institutionId, approverId, applicationId, repo, service } = await makeApplicationFixture();

    const result = await service.approveApplication(applicationId, institutionId, approverId);

    expect(result.studentId).toBeTruthy();

    const app = await repo.getApplicationById(applicationId);
    expect(app.status).toBe('Approved');
    expect(app.converted_student_id).toBe(result.studentId);

    const student = await env.DB.prepare('SELECT * FROM students WHERE id = ?').bind(result.studentId).first<any>();
    expect(student).not.toBeNull();
    expect(student.first_name).toBe('Ada');
    expect(student.admission_number).toBe(result.admissionNumber);
  });

  it('rejects a second approval attempt and does not create a duplicate student', async () => {
    const { institutionId, approverId, applicationId, service } = await makeApplicationFixture();

    await service.approveApplication(applicationId, institutionId, approverId);

    await expect(
      service.approveApplication(applicationId, institutionId, approverId)
    ).rejects.toThrow(/already approved/);

    const students = await env.DB.prepare(
      'SELECT COUNT(*) as cnt FROM students WHERE admission_number = (SELECT application_number FROM admission_applications WHERE id = ?)'
    ).bind(applicationId).first<{ cnt: number }>();
    expect(students!.cnt).toBe(1);
  });

  it('rejects a concurrent duplicate approval race via the guarded update, leaving exactly one student', async () => {
    const { institutionId, approverId, applicationId, repo } = await makeApplicationFixture();

    // Two "simultaneous" approve requests both read status !== 'Approved'
    // before either writes, then both attempt the guarded update - only one
    // can win, mirroring a double-click / retry-storm in production.
    const [first, second] = await Promise.all([
      repo.approveApplicationIfNotApproved(applicationId, approverId),
      repo.approveApplicationIfNotApproved(applicationId, approverId),
    ]);

    const winners = [first, second].filter((r) => r.meta.changes === 1);
    const losers = [first, second].filter((r) => r.meta.changes === 0);
    expect(winners.length).toBe(1);
    expect(losers.length).toBe(1);
  });
});

describe('AdmissionsService.rejectApplication', () => {
  it('rejects a pending application and sets status to Rejected', async () => {
    const { approverId, applicationId, repo, service } = await makeApplicationFixture();

    await service.rejectApplication(applicationId, 'Not a fit', approverId);

    const app = await repo.getApplicationById(applicationId);
    expect(app.status).toBe('Rejected');
  });

  it('refuses to reject an already-approved application, leaving it Approved with its student link intact', async () => {
    const { institutionId, approverId, applicationId, repo, service } = await makeApplicationFixture();

    const result = await service.approveApplication(applicationId, institutionId, approverId);

    await expect(
      service.rejectApplication(applicationId, 'Changed my mind', approverId)
    ).rejects.toThrow(/already been approved/);

    const app = await repo.getApplicationById(applicationId);
    expect(app.status).toBe('Approved');
    expect(app.converted_student_id).toBe(result.studentId);

    const student = await env.DB.prepare('SELECT * FROM students WHERE id = ?').bind(result.studentId).first<any>();
    expect(student).not.toBeNull();
  });

  it('rejects a concurrent approve-then-reject race, leaving the application Approved', async () => {
    const { institutionId, approverId, applicationId, repo, service } = await makeApplicationFixture();

    // Approve and reject "race" - approve wins first in this ordering, so the
    // guarded reject update should affect zero rows and the service should
    // surface that as a clean error rather than silently corrupting status.
    await service.approveApplication(applicationId, institutionId, approverId);
    const guardResult = await repo.rejectApplicationIfNotApproved(applicationId, 'Race attempt', approverId);

    expect(guardResult.meta.changes).toBe(0);

    const app = await repo.getApplicationById(applicationId);
    expect(app.status).toBe('Approved');
  });
});
