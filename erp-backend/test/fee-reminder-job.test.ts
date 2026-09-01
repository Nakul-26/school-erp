import { describe, it, expect, beforeEach } from 'vitest';
import { env, reset } from 'cloudflare:test';
import { applySchema } from './helpers/apply-schema';
import { seedInstitution, seedAcademicYear, seedCourse, seedStudent } from './helpers/seed';
import { jobRegistry } from '../src/modules/background-jobs/job-registry';

beforeEach(async () => {
  await reset();
  await applySchema(env.DB);
});

function daysAgo(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}
function daysFromNow(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

async function makeOverdueFeeRecord(opts: {
  dueDate: string;
  status?: string;
  totalAmount?: number;
  paidAmount?: number;
  withStudentUser?: boolean;
  withGuardianUser?: boolean;
}) {
  const institutionId = crypto.randomUUID();
  const academicYearId = crypto.randomUUID();
  const courseId = crypto.randomUUID();
  const studentId = crypto.randomUUID();
  const recordId = crypto.randomUUID();
  const studentUserId = crypto.randomUUID();
  const guardianUserId = crypto.randomUUID();

  await seedInstitution(env.DB, institutionId);
  await seedAcademicYear(env.DB, academicYearId, institutionId);
  await seedCourse(env.DB, courseId, institutionId);
  await seedStudent(env.DB, studentId, institutionId, 'ADM-REM-' + studentId.slice(0, 6));

  if (opts.withStudentUser !== false) {
    await env.DB.prepare(`INSERT INTO users (id, institution_id, username, email, password_hash, name) VALUES (?, ?, 'su', 'student@example.com', 'x', 'Student User')`).bind(studentUserId, institutionId).run();
    await env.DB.prepare('UPDATE students SET user_id = ? WHERE id = ?').bind(studentUserId, studentId).run();
  }
  if (opts.withGuardianUser) {
    await env.DB.prepare(`INSERT INTO users (id, institution_id, username, email, password_hash, name) VALUES (?, ?, 'gu', 'guardian@example.com', 'x', 'Guardian User')`).bind(guardianUserId, institutionId).run();
    await env.DB.prepare(`INSERT INTO guardians (id, student_id, user_id, name, relationship) VALUES (?, ?, ?, 'Test Guardian', 'Father')`).bind(crypto.randomUUID(), studentId, guardianUserId).run();
  }

  await env.DB.prepare(`
    INSERT INTO student_fee_records (id, institution_id, student_id, academic_year_id, course_id, year_number, fee_type, total_amount, paid_amount, due_date, status)
    VALUES (?, ?, ?, ?, ?, 1, 'Tuition Fee', ?, ?, ?, ?)
  `).bind(recordId, institutionId, studentId, academicYearId, courseId, opts.totalAmount ?? 5000, opts.paidAmount ?? 0, opts.dueDate, opts.status ?? 'UNPAID').run();

  return { institutionId, studentId, recordId, studentUserId, guardianUserId };
}

function fakeCtx(institutionId: string) {
  const logs: string[] = [];
  return {
    db: env.DB,
    env: { DB: env.DB },
    job: { id: crypto.randomUUID(), institution_id: institutionId } as any,
    log: (m: string) => logs.push(m),
    logs,
  };
}

describe('FeeReminderJob', () => {
  it('notifies the student and their guardian for an overdue, unpaid fee', async () => {
    const { institutionId, studentUserId, guardianUserId, recordId } = await makeOverdueFeeRecord({
      dueDate: daysAgo(3),
      withGuardianUser: true,
    });

    const handler = jobRegistry.getHandler('FeeReminderJob')!;
    const result = await handler({}, fakeCtx(institutionId));

    expect(result.success).toBe(true);
    expect(result.data.remindersSent).toBe(1);

    const studentNotif = await env.DB.prepare(`SELECT * FROM notifications WHERE user_id = ?`).bind(studentUserId).first<any>();
    expect(studentNotif).not.toBeNull();
    expect(studentNotif.title).toContain('Fee payment due');

    const guardianNotif = await env.DB.prepare(`SELECT * FROM notifications WHERE user_id = ?`).bind(guardianUserId).first<any>();
    expect(guardianNotif).not.toBeNull();

    const reminderRow = await env.DB.prepare(`SELECT * FROM fee_reminders WHERE student_fee_record_id = ?`).bind(recordId).first<any>();
    expect(reminderRow).not.toBeNull();
  });

  it('does not send a second reminder for the same record within 24 hours', async () => {
    const { institutionId } = await makeOverdueFeeRecord({ dueDate: daysAgo(3) });

    const handler = jobRegistry.getHandler('FeeReminderJob')!;
    const first = await handler({}, fakeCtx(institutionId));
    expect(first.data.remindersSent).toBe(1);

    const second = await handler({}, fakeCtx(institutionId));
    expect(second.data.remindersSent).toBe(0);
    expect(second.data.recordsChecked).toBe(0);
  });

  it('skips a fee record that is already fully paid', async () => {
    const { institutionId } = await makeOverdueFeeRecord({ dueDate: daysAgo(3), status: 'PAID', totalAmount: 5000, paidAmount: 5000 });

    const handler = jobRegistry.getHandler('FeeReminderJob')!;
    const result = await handler({}, fakeCtx(institutionId));

    expect(result.data.remindersSent).toBe(0);
  });

  it('skips a fee record whose due date is in the future', async () => {
    const { institutionId } = await makeOverdueFeeRecord({ dueDate: daysFromNow(5) });

    const handler = jobRegistry.getHandler('FeeReminderJob')!;
    const result = await handler({}, fakeCtx(institutionId));

    expect(result.data.remindersSent).toBe(0);
    expect(result.data.recordsChecked).toBe(0);
  });

  it('skips a student with no linked user account and no guardians (nowhere to send it)', async () => {
    const { institutionId, recordId } = await makeOverdueFeeRecord({ dueDate: daysAgo(3), withStudentUser: false });

    const handler = jobRegistry.getHandler('FeeReminderJob')!;
    const result = await handler({}, fakeCtx(institutionId));

    expect(result.data.remindersSent).toBe(0);
    const reminderRow = await env.DB.prepare(`SELECT * FROM fee_reminders WHERE student_fee_record_id = ?`).bind(recordId).first<any>();
    expect(reminderRow).toBeNull();
  });
});
