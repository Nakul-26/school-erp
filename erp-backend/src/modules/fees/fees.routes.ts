import { Hono } from 'hono';
import { Env, JwtPayload } from '../../types';
import { FeesRepository } from './fees.repository';
import { FeesService } from './fees.service';
import { authMiddleware, requireRole } from '../../middleware/auth';
import { createAuditLog } from '../../utils/audit';
import { isYearLockedOrArchived } from '../../utils/academic-year-lock';
import { renderFeeReceiptHtml } from '../../utils/print-template';

const fees = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();

fees.use('*', authMiddleware);

function userRoles(user: JwtPayload): string[] {
  return user.roles || (user.role ? [user.role] : []);
}

function hasRole(user: JwtPayload, roles: string[]): boolean {
  return userRoles(user).some((role) => roles.includes(role));
}

function isFeeStaff(user: JwtPayload): boolean {
  return hasRole(user, ['super_admin', 'Super Admin', 'admin', 'Admin', 'Principal', 'HOD', 'Accountant', 'accountant']);
}

async function canAccessStudentFeeData(db: D1Database, user: JwtPayload, studentId: string): Promise<boolean> {
  if (isFeeStaff(user)) return true;

  if (hasRole(user, ['student', 'Student'])) {
    const student = await db.prepare(
      'SELECT 1 FROM students WHERE id = ? AND user_id = ? AND institution_id = ? AND is_active = 1'
    ).bind(studentId, user.sub, user.institution_id).first();
    return Boolean(student);
  }

  if (hasRole(user, ['parent', 'Parent', 'guardian', 'Guardian'])) {
    const linked = await db.prepare(`
      SELECT 1
      FROM guardians g
      JOIN students s ON s.id = g.student_id
      WHERE g.user_id = ? AND g.student_id = ? AND g.is_active = 1
        AND s.institution_id = ? AND s.is_active = 1
    `).bind(user.sub, studentId, user.institution_id).first();
    return Boolean(linked);
  }

  return false;
}

async function canAccessFeeRecord(db: D1Database, user: JwtPayload, record: { student_id: string; institution_id: string }): Promise<boolean> {
  return record.institution_id === user.institution_id && await canAccessStudentFeeData(db, user, record.student_id);
}

// --- FEE STRUCTURES ---
fees.get('/structures', async (c) => {
  const user = c.get('user');
  const repo = new FeesRepository(c.env.DB);
  const service = new FeesService(repo);
  const results = await service.listStructures(user.institution_id);
  return c.json(results);
});

fees.post('/structures', requireRole('admin', 'super_admin', 'Principal', 'HOD', 'Accountant'), async (c) => {
  const user = c.get('user');
  const input = await c.req.json();
  // Validate academic year is not locked/archived
  const isYearLocked = await isYearLockedOrArchived(c.env.DB, input.academic_year_id);
  if (isYearLocked) {
    return c.json({ error: 'This academic year is locked or archived. Modifications are not allowed.' }, 400);
  }

  const repo = new FeesRepository(c.env.DB);
  const service = new FeesService(repo);

  try {
    const id = await service.createStructure(user.institution_id, input, user.sub);
    await createAuditLog(c.env.DB, user.sub, 'CREATE_FEE_STRUCTURE', 'fees', id, `Created fee structure ${input.fee_type} of ₹${input.amount}`);
    return c.json({ id }, 201);
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

fees.delete('/structures/:id', requireRole('admin', 'super_admin', 'Principal', 'HOD', 'Accountant'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const repo = new FeesRepository(c.env.DB);
  const service = new FeesService(repo);

  const existing = await repo.getStructureById(id);
  if (!existing || existing.institution_id !== user.institution_id) {
    return c.json({ error: 'Fee structure not found' }, 404);
  }

  // Validate academic year is not locked/archived
  const isLocked = await isYearLockedOrArchived(c.env.DB, existing.academic_year_id);
  if (isLocked) {
    return c.json({ error: 'This academic year is locked or archived. Modifications are not allowed.' }, 400);
  }

  await service.deleteStructure(id, user.sub);
  await createAuditLog(c.env.DB, user.sub, 'DELETE_FEE_STRUCTURE', 'fees', id, 'Deleted fee structure');
  return c.json({ success: true });
});

// --- STUDENT LEDGER / FEE RECORDS ---
fees.get('/student-records', async (c) => {
  const user = c.get('user');
  const search = c.req.query('search');
  const repo = new FeesRepository(c.env.DB);
  const service = new FeesService(repo);

  const userRoles = user.roles || (user.role ? [user.role] : []);
  const isStudent = userRoles.some(r => ['student', 'Student'].includes(r));
  const isParent = userRoles.some(r => ['parent', 'Parent', 'guardian', 'Guardian'].includes(r));
  const isAdminOrStaff = userRoles.some(r => ['super_admin', 'Super Admin', 'admin', 'Principal', 'HOD', 'Accountant', 'Teacher'].includes(r));

  if (isStudent) {
    const student = await c.env.DB.prepare('SELECT id FROM students WHERE user_id = ? AND institution_id = ? AND is_active = 1').bind(user.sub, user.institution_id).first<{ id: string }>();
    if (!student) return c.json([]);
    const results = await service.listStudentRecords(user.institution_id, undefined);
    return c.json(results.filter((r: any) => r.student_id === student.id));
  }

  if (isParent) {
    const { results: children } = await c.env.DB.prepare('SELECT student_id FROM guardians WHERE user_id = ? AND is_active = 1').bind(user.sub).all<{ student_id: string }>();
    const childIds = (children || []).map(ch => ch.student_id);
    const results = await service.listStudentRecords(user.institution_id, undefined);
    return c.json(results.filter((r: any) => childIds.includes(r.student_id)));
  }

  if (!isAdminOrStaff) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const results = await service.listStudentRecords(user.institution_id, search);
  return c.json(results);
});

fees.get('/ledger/:studentId', async (c) => {
  const user = c.get('user');
  const studentId = c.req.param('studentId')!;
  
  // Verify student belongs to this institution
  const student = await c.env.DB.prepare('SELECT * FROM students WHERE id = ? AND institution_id = ? AND is_active = 1').bind(studentId, user.institution_id).first<any>();
  if (!student) {
    return c.json({ error: 'Student not found' }, 404);
  }

  const userRoles = user.roles || (user.role ? [user.role] : []);
  const isStudent = userRoles.some(r => ['student', 'Student'].includes(r));
  const isParent = userRoles.some(r => ['parent', 'Parent', 'guardian', 'Guardian'].includes(r));
  const isAdminOrStaff = userRoles.some(r => ['super_admin', 'Super Admin', 'admin', 'Principal', 'HOD', 'Accountant', 'Teacher'].includes(r));

  if (isStudent && student.user_id !== user.sub) {
    return c.json({ error: 'Forbidden: You cannot access other student fee records' }, 403);
  }

  if (isParent) {
    const isChild = await c.env.DB.prepare(
      'SELECT 1 FROM guardians WHERE user_id = ? AND student_id = ? AND is_active = 1'
    ).bind(user.sub, studentId).first();
    if (!isChild && !isAdminOrStaff) {
      return c.json({ error: 'Forbidden: You cannot access fee records of students who are not your children' }, 403);
    }
  }

  if (!isStudent && !isParent && !isAdminOrStaff) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const repo = new FeesRepository(c.env.DB);
  const service = new FeesService(repo);
  const results = await service.getStudentLedger(studentId);
  return c.json(results);
});

fees.post('/generate-ledger', requireRole('admin', 'super_admin', 'Principal', 'HOD', 'Accountant'), async (c) => {
  const user = c.get('user');
  const { student_id, academic_year_id, course_id, year_number } = await c.req.json();

  if (!student_id || !academic_year_id || !course_id || !year_number) {
    return c.json({ error: 'Missing required parameters' }, 400);
  }

  // Validate academic year is not locked/archived
  const isLocked = await isYearLockedOrArchived(c.env.DB, academic_year_id);
  if (isLocked) {
    return c.json({ error: 'This academic year is locked or archived. Modifications are not allowed.' }, 400);
  }

  const repo = new FeesRepository(c.env.DB);
  const service = new FeesService(repo);
  
  try {
    await service.generateRecordsForStudent(user.institution_id, student_id, academic_year_id, course_id, year_number, user.sub);
    await createAuditLog(c.env.DB, user.sub, 'GENERATE_STUDENT_LEDGER', 'fees', student_id, 'Generated student fee ledger entries');
    return c.json({ success: true });
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

// --- PAYMENTS ---
fees.get('/payments', async (c) => {
  const user = c.get('user');
  const studentId = c.req.query('student_id');
  const db = c.env.DB;

  const userRoles = user.roles || (user.role ? [user.role] : []);
  const isAdminOrStaff = userRoles.some(r =>
    ['super_admin', 'admin', 'Principal', 'HOD', 'Accountant'].includes(r)
  );

  if (!isAdminOrStaff) {
    if (!studentId) {
      return c.json({ error: 'Forbidden: student_id is required' }, 403);
    }
    
    // Verify student belongs to the same institution
    const student = await db.prepare('SELECT user_id, institution_id FROM students WHERE id = ? AND is_active = 1').bind(studentId).first<{ user_id: string; institution_id: string }>();
    if (!student || student.institution_id !== user.institution_id) {
      return c.json({ error: 'Student not found' }, 404);
    }

    // Verify student ownership
    if (userRoles.some((role) => ['student', 'Student'].includes(role)) && student.user_id !== user.sub) {
      return c.json({ error: 'Forbidden: cannot access other student\'s ledger' }, 403);
    }

    // Verify parent linkage
    if (userRoles.some((role) => ['parent', 'Parent', 'guardian', 'Guardian'].includes(role))) {
      const parentLinked = await db.prepare('SELECT 1 FROM guardians WHERE student_id = ? AND user_id = ? AND is_active = 1').bind(studentId, user.sub).first();
      if (!parentLinked) {
        return c.json({ error: 'Forbidden: student is not linked to this parent account' }, 403);
      }
    }
  }

  const repo = new FeesRepository(db);
  const service = new FeesService(repo);
  const results = await service.listPayments(user.institution_id, studentId);
  return c.json(results);
});

fees.post('/payments', requireRole('admin', 'super_admin', 'Principal', 'HOD', 'Accountant'), async (c) => {
  const user = c.get('user');
  const input = await c.req.json();
  // Validate academic year is not locked/archived
  const feeRec = await c.env.DB.prepare('SELECT academic_year_id FROM student_fee_records WHERE id = ?').bind(input.student_fee_record_id).first<{ academic_year_id: string }>();
  if (feeRec) {
    const isLocked = await isYearLockedOrArchived(c.env.DB, feeRec.academic_year_id);
    if (isLocked) {
      return c.json({ error: 'This academic year is locked or archived. Modifications are not allowed.' }, 400);
    }
  }

  const repo = new FeesRepository(c.env.DB);
  const service = new FeesService(repo);

  try {
    const result = await service.makePayment(user.institution_id, input, user.sub);
    await createAuditLog(
      c.env.DB, 
      user.sub, 
      'COLLECT_FEE_PAYMENT', 
      'fees', 
      result.paymentId, 
      `Collected fee payment of ₹${input.amount} for student ${input.student_id}`
    );
    return c.json(result, 201);
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

// --- RECEIPTS ---
fees.get('/receipts', async (c) => {
  const user = c.get('user');
  const repo = new FeesRepository(c.env.DB);
  const service = new FeesService(repo);
  const results = await service.listReceipts(user.institution_id);

  if (isFeeStaff(user)) {
    return c.json(results);
  }

  const allowed: any[] = [];
  for (const receipt of results) {
    if (await canAccessStudentFeeData(c.env.DB, user, receipt.student_id)) {
      allowed.push(receipt);
    }
  }
  return c.json(allowed);
});

fees.get('/receipts/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const repo = new FeesRepository(c.env.DB);
  const service = new FeesService(repo);
  const result = await service.getReceiptDetails(id);

  if (!result || result.institution_name === null) {
    return c.json({ error: 'Receipt not found' }, 404);
  }

  // Double check that it matches user's institution
  const instCheck = await c.env.DB.prepare('SELECT 1 FROM fee_receipts WHERE id = ? AND institution_id = ?').bind(id, user.institution_id).first();
  if (!instCheck) {
    return c.json({ error: 'Receipt not found' }, 404);
  }

  const receiptStudent = await c.env.DB.prepare(`
    SELECT fp.student_id
    FROM fee_receipts fr
    JOIN fee_payments fp ON fp.id = fr.payment_id
    WHERE fr.id = ? AND fr.institution_id = ? AND fr.is_active = 1 AND fp.is_active = 1
  `).bind(id, user.institution_id).first<{ student_id: string }>();
  if (!receiptStudent || !(await canAccessStudentFeeData(c.env.DB, user, receiptStudent.student_id))) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  return c.json(result);
});

// --- REPORTS ---
fees.get('/reports/summary', requireRole('admin', 'super_admin', 'Principal', 'HOD', 'Accountant'), async (c) => {
  const user = c.get('user');
  const repo = new FeesRepository(c.env.DB);
  const service = new FeesService(repo);
  const stats = await service.getFeeSummaryStats(user.institution_id);
  return c.json(stats);
});

fees.get('/reports/monthly', requireRole('admin', 'super_admin', 'Principal', 'HOD', 'Accountant'), async (c) => {
  const user = c.get('user');
  const repo = new FeesRepository(c.env.DB);
  const service = new FeesService(repo);
  const list = await service.getMonthlyCollection(user.institution_id);
  return c.json(list);
});

fees.get('/reports/defaulters', requireRole('admin', 'super_admin', 'Principal', 'HOD', 'Accountant'), async (c) => {
  const user = c.get('user');
  const repo = new FeesRepository(c.env.DB);
  const service = new FeesService(repo);
  const list = await service.getTopDefaulters(user.institution_id);
  return c.json(list);
});

// --- CONCESSIONS ---
fees.get('/records/:id/concessions', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const repo = new FeesRepository(c.env.DB);
  const service = new FeesService(repo);
  const record = await repo.getRecordById(id);
  if (!record || record.institution_id !== user.institution_id) return c.json({ error: 'Not found' }, 404);
  if (!(await canAccessFeeRecord(c.env.DB, user, record))) {
    return c.json({ error: 'Forbidden' }, 403);
  }
  const concessions = await service.listConcessions(id);
  return c.json(concessions);
});

fees.post('/records/:id/concession', requireRole('admin', 'super_admin', 'Principal', 'HOD', 'Accountant'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const body = await c.req.json();
  const repo = new FeesRepository(c.env.DB);
  const service = new FeesService(repo);
  try {
    const concessionId = await service.applyConcession(user.institution_id, { student_fee_record_id: id, ...body }, user.sub);
    await createAuditLog(c.env.DB, user.sub, 'APPLY_CONCESSION', 'fees', concessionId, `Applied ${body.discount_type} concession of ${body.discount_value} to fee record ${id}`);
    return c.json({ id: concessionId }, 201);
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

fees.delete('/concessions/:id', requireRole('admin', 'super_admin', 'Principal', 'Accountant'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const repo = new FeesRepository(c.env.DB);
  const service = new FeesService(repo);
  try {
    await service.removeConcession(id, user.institution_id, user.sub);
    await createAuditLog(c.env.DB, user.sub, 'REMOVE_CONCESSION', 'fees', id, `Removed concession`);
    return c.json({ success: true });
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

// --- INSTALLMENTS ---
fees.get('/records/:id/installments', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const repo = new FeesRepository(c.env.DB);
  const service = new FeesService(repo);
  const record = await repo.getRecordById(id);
  if (!record || record.institution_id !== user.institution_id) return c.json({ error: 'Not found' }, 404);
  if (!(await canAccessFeeRecord(c.env.DB, user, record))) {
    return c.json({ error: 'Forbidden' }, 403);
  }
  const installments = await service.listInstallments(id);
  return c.json(installments);
});

fees.post('/records/:id/installments', requireRole('admin', 'super_admin', 'Principal', 'HOD', 'Accountant'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const body = await c.req.json();
  const repo = new FeesRepository(c.env.DB);
  const service = new FeesService(repo);
  try {
    await service.createInstallmentPlan(user.institution_id, { student_fee_record_id: id, student_id: body.student_id, installments: body.installments }, user.sub);
    await createAuditLog(c.env.DB, user.sub, 'CREATE_INSTALLMENT_PLAN', 'fees', id, `Created installment plan with ${body.installments.length} installments`);
    return c.json({ success: true }, 201);
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

fees.patch('/installments/:id/pay', requireRole('admin', 'super_admin', 'Principal', 'HOD', 'Accountant'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const body = await c.req.json();
  const repo = new FeesRepository(c.env.DB);
  const service = new FeesService(repo);
  try {
    await service.payInstallment(id, user.institution_id, body.amount || 0, user.sub);
    await createAuditLog(c.env.DB, user.sub, 'PAY_INSTALLMENT', 'fees', id, `Paid installment ₹${body.amount}`);
    return c.json({ success: true });
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

fees.post('/reminder', requireRole('admin', 'super_admin', 'Principal', 'HOD', 'Accountant'), async (c) => {
  const user = c.get('user');
  const { student_id, pending_amount } = await c.req.json();

  if (!student_id || !pending_amount) {
    return c.json({ error: 'student_id and pending_amount are required' }, 400);
  }

  // 1. Fetch student info
  const student = await c.env.DB.prepare(`
    SELECT first_name, last_name, admission_number 
    FROM students 
    WHERE id = ? AND institution_id = ? AND is_active = 1
  `).bind(student_id, user.institution_id).first<{ first_name: string; last_name: string; admission_number: string }>();

  if (!student) {
    return c.json({ error: 'Student not found' }, 404);
  }

  const studentName = `${student.first_name} ${student.last_name}`;

  // 2. Fetch parent/guardians
  const guardians = await c.env.DB.prepare(`
    SELECT g.name, COALESCE(g.email, u.email, '') as email, COALESCE(g.phone, u.phone, '') as phone, g.user_id
    FROM guardians g
    LEFT JOIN users u ON g.user_id = u.id
    WHERE g.student_id = ? AND g.is_active = 1
  `).bind(student_id).all<{ name: string; email: string; phone: string; user_id: string | null }>();

  if (!guardians.results || guardians.results.length === 0) {
    return c.json({ error: 'No parent or guardian linked to this student.' }, 404);
  }

  const { BroadcastsRepository } = await import('../broadcasts/broadcasts.repository');
  const { BroadcastsService } = await import('../broadcasts/broadcasts.service');
  const { NotificationService: CentralNotifService } = await import('../broadcasts/notification.service');

  const broadcastsRepo = new BroadcastsRepository(c.env.DB);
  const broadcastsService = new BroadcastsService(broadcastsRepo);
  const centralNotif = new CentralNotifService();
  let sentCount = 0;

  for (const guardian of guardians.results) {
    const alertSubject = `Fee Outstanding Reminder: ${studentName}`;
    const alertBody = `Dear ${guardian.name || 'Parent/Guardian'},\n\nThis is a friendly reminder that an outstanding amount of ₹${pending_amount.toLocaleString('en-IN')} is due for the fee component linked to your child, ${studentName} (Admission ID: ${student.admission_number}).\n\nWe request you to kindly clear the outstanding balance at your earliest convenience.\n\nRegards,\nAccounts Office`;

    if (guardian.user_id) {
      try {
        await broadcastsService.createBroadcast(
          user.institution_id,
          user.sub,
          {
            subject: alertSubject,
            body: alertBody,
            category: 'fees',
            priority: 'normal',
            recipient_type: 'custom',
            recipient_filter: JSON.stringify({
              type: 'custom',
              userIds: [guardian.user_id]
            }),
            channel: 'erp,email,sms',
            status: 'sent',
            expires_at: null,
            attachments: []
          },
          c.env
        );
        sentCount++;
      } catch (err) {
        console.error(`Failed to send fee broadcast reminder to ${guardian.email}:`, err);
      }
    } else {
      // Fallback for guardians without user account (send direct email/SMS)
      try {
        await centralNotif.deliver(
          c.env,
          ['email', 'sms'],
          [{
            id: 'anonymous',
            name: guardian.name,
            email: guardian.email,
            phone: guardian.phone
          }],
          {
            subject: alertSubject,
            body: alertBody
          }
        );
        sentCount++;
      } catch (err) {
        console.error(`Failed to send direct fee notification to guardian without user account:`, err);
      }
    }
  }

  await createAuditLog(c.env.DB, user.sub, 'SEND_FEE_REMINDER', 'fees', student_id, `Dispatched outstanding fee reminder to ${sentCount} parents of ${studentName}`);
  return c.json({ success: true, message: `Reminder sent successfully to ${sentCount} guardians.` });
});

fees.post('/records/:id/pay-online', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const { amount, payment_method, transaction_reference } = await c.req.json();

  if (!amount || amount <= 0) {
    return c.json({ error: 'Valid payment amount is required' }, 400);
  }

  const db = c.env.DB;

  // 1. Fetch student fee record
  const record = await db.prepare(`
    SELECT * FROM student_fee_records WHERE id = ? AND institution_id = ? AND is_active = 1
  `).bind(id, user.institution_id).first<{
    student_id: string;
    academic_year_id: string;
    course_id: string;
    year_number: number;
    fee_type: string;
    total_amount: number;
    paid_amount: number;
  }>();

  if (!record) {
    return c.json({ error: 'Fee ledger record not found' }, 404);
  }

  const userRoles = user.roles || (user.role ? [user.role] : []);
  const isStudent = userRoles.some(r => ['student', 'Student'].includes(r));
  const isParent = userRoles.some(r => ['parent', 'Parent', 'guardian', 'Guardian'].includes(r));
  const isStaff = userRoles.some(r => ['admin', 'super_admin', 'Principal', 'HOD', 'Accountant', 'accountant'].includes(r));

  if (!isStaff) {
    if (isStudent) {
      const student = await db.prepare('SELECT 1 FROM students WHERE user_id = ? AND id = ? AND is_active = 1').bind(user.sub, record.student_id).first();
      if (!student) return c.json({ error: 'Forbidden: Cannot pay another student\'s fee record' }, 403);
    } else if (isParent) {
      const linked = await db.prepare('SELECT 1 FROM guardians WHERE user_id = ? AND student_id = ? AND is_active = 1').bind(user.sub, record.student_id).first();
      if (!linked) return c.json({ error: 'Forbidden: Cannot pay a fee record for a student who is not your child' }, 403);
    } else {
      return c.json({ error: 'Forbidden' }, 403);
    }
  }

  const remaining = record.total_amount - record.paid_amount;
  if (amount > remaining) {
    return c.json({ error: `Amount ₹${amount} exceeds the remaining balance ₹${remaining}` }, 400);
  }

  // 2. Insert fee payment as PENDING verification
  const paymentId = crypto.randomUUID();
  const today = new Date().toISOString().split('T')[0];
  await db.prepare(`
    INSERT INTO fee_payments (id, institution_id, student_id, student_fee_record_id, amount, payment_date, payment_method, transaction_reference, remarks, verification_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Self-service online payment', 'PENDING')
  `).bind(
    paymentId,
    user.institution_id,
    record.student_id,
    id,
    amount,
    today,
    payment_method || 'Online',
    transaction_reference || `TXN-${Date.now()}`
  ).run();

  await createAuditLog(db, user.sub, 'PAY_FEE_ONLINE_PENDING', 'fees', id, `Initiated online payment of ₹${amount} via ${payment_method} (Pending verification)`);

  return c.json({ success: true, message: 'Payment recorded and pending accountant verification.', payment_id: paymentId });
});

// Verify a pending online payment (Accountant-only)
fees.post('/payments/:id/verify', requireRole('admin', 'super_admin', 'Principal', 'Accountant'), async (c) => {
  const user = c.get('user');
  const paymentId = c.req.param('id')!;
  const { status } = await c.req.json(); // 'VERIFIED' or 'FAILED'

  if (!['VERIFIED', 'FAILED'].includes(status)) {
    return c.json({ error: 'Invalid verification status' }, 400);
  }

  const db = c.env.DB;

  const payment = await db.prepare(`
    SELECT * FROM fee_payments WHERE id = ? AND institution_id = ? AND is_active = 1
  `).bind(paymentId, user.institution_id).first<{
    id: string;
    student_id: string;
    student_fee_record_id: string;
    amount: number;
    payment_date: string;
    payment_method: string;
    verification_status: string;
  }>();

  if (!payment) {
    return c.json({ error: 'Payment record not found' }, 404);
  }

  if (payment.verification_status !== 'PENDING') {
    return c.json({ error: `Payment is already ${payment.verification_status}` }, 400);
  }

  try {
    if (status === 'VERIFIED') {
      const record = await db.prepare(`
        SELECT total_amount, paid_amount FROM student_fee_records WHERE id = ?
      `).bind(payment.student_fee_record_id).first<{ total_amount: number; paid_amount: number }>();

      if (!record) {
        return c.json({ error: 'Student fee record not found' }, 404);
      }

      const newPaidAmount = record.paid_amount + payment.amount;
      const newStatus = newPaidAmount >= record.total_amount ? 'PAID' : 'PARTIAL';

      const receiptId = crypto.randomUUID();
      const receiptNo = `REC-${Date.now().toString().slice(-8)}`;

      const stmts = [
        db.prepare('UPDATE fee_payments SET verification_status = "VERIFIED", updated_at = (datetime(\'now\')), updated_by = ? WHERE id = ?')
          .bind(user.sub, paymentId),
        db.prepare(`
          INSERT INTO fee_receipts (id, institution_id, student_fee_record_id, payment_id, receipt_number, receipt_date, amount)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(receiptId, user.institution_id, payment.student_fee_record_id, paymentId, receiptNo, payment.payment_date, payment.amount),
        db.prepare(`
          UPDATE student_fee_records 
          SET paid_amount = ?, status = ?, updated_at = (datetime(\'now\'))
          WHERE id = ?
        `).bind(newPaidAmount, newStatus, payment.student_fee_record_id)
      ];

      await db.batch(stmts);
      await createAuditLog(db, user.sub, 'VERIFY_PAYMENT_SUCCESS', 'fees', paymentId, `Verified payment of ₹${payment.amount}. Receipt: ${receiptNo}`);

      return c.json({ success: true, status: 'VERIFIED', receipt_number: receiptNo });
    } else {
      await db.prepare('UPDATE fee_payments SET verification_status = "FAILED", updated_at = (datetime(\'now\')), updated_by = ? WHERE id = ?')
        .bind(user.sub, paymentId).run();
      await createAuditLog(db, user.sub, 'VERIFY_PAYMENT_FAILED', 'fees', paymentId, `Payment verification failed for payment ID: ${paymentId}`);

      return c.json({ success: true, status: 'FAILED' });
    }
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// Serve print-ready HTML fee receipt
fees.get('/receipts/:id/print', async (c) => {
  const user = c.get('user');
  const receiptId = c.req.param('id')!;
  const db = c.env.DB;

  const receipt = await db.prepare(`
    SELECT 
      fr.receipt_number,
      fr.created_at as receipt_date,
      fp.amount,
      fp.payment_method,
      fp.transaction_reference,
      fp.remarks,
      sfr.fee_type,
      s.first_name,
      s.last_name,
      s.admission_number,
      s.roll_number,
      crs.name as course_name,
      sec.name as section_name,
      inst.name as institution_name,
      inst.address as institution_address,
      inst.phone as institution_phone
    FROM fee_receipts fr
    JOIN fee_payments fp ON fp.id = fr.payment_id
    JOIN student_fee_records sfr ON sfr.id = fp.student_fee_record_id
    JOIN students s ON s.id = fp.student_id
    JOIN institutions inst ON inst.id = fr.institution_id
    LEFT JOIN student_enrollments se ON se.student_id = s.id AND se.is_active = 1
    LEFT JOIN courses crs ON crs.id = se.course_id
    LEFT JOIN sections sec ON sec.id = se.section_id
    WHERE fr.id = ? AND fr.institution_id = ? AND fr.is_active = 1
  `).bind(receiptId, user.institution_id).first<any>();

  if (!receipt) {
    return c.json({ error: 'Receipt not found' }, 404);
  }

  const html = renderFeeReceiptHtml({
    institutionName: receipt.institution_name,
    institutionAddress: receipt.institution_address,
    institutionPhone: receipt.institution_phone,
    receiptNumber: receipt.receipt_number,
    receiptDate: receipt.receipt_date ? receipt.receipt_date.split('T')[0] : '',
    studentName: `${receipt.first_name} ${receipt.last_name}`,
    admissionNumber: receipt.admission_number,
    rollNumber: receipt.roll_number,
    courseName: receipt.course_name,
    sectionName: receipt.section_name,
    feeType: receipt.fee_type,
    amountPaid: receipt.amount,
    paymentMethod: receipt.payment_method,
    transactionRef: receipt.transaction_reference,
    remarks: receipt.remarks
  });

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
});

// --- EXPENSES ---
fees.get('/expenses', requireRole('admin', 'super_admin', 'Principal', 'HOD', 'Accountant'), async (c) => {
  const user = c.get('user');
  const db = c.env.DB;
  try {
    const { results } = await db.prepare(
      'SELECT * FROM expenses WHERE institution_id = ? AND is_active = 1 ORDER BY date DESC, created_at DESC'
    ).bind(user.institution_id).all();
    return c.json(results || []);
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

fees.post('/expenses', requireRole('admin', 'super_admin', 'Principal', 'HOD', 'Accountant'), async (c) => {
  const user = c.get('user');
  const db = c.env.DB;
  const input = await c.req.json();

  if (!input.date || !input.category || !input.description || !input.amount || !input.payment_method) {
    return c.json({ error: 'Missing required expense fields' }, 400);
  }

  const id = crypto.randomUUID();
  try {
    await db.prepare(`
      INSERT INTO expenses (id, institution_id, date, category, description, amount, payment_method, recorded_by, status, created_by, updated_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      user.institution_id,
      input.date,
      input.category,
      input.description,
      input.amount,
      input.payment_method,
      input.recorded_by || 'Staff',
      input.status || 'PAID',
      user.sub,
      user.sub
    ).run();

    await createAuditLog(db, user.sub, 'CREATE_EXPENSE', 'fees', id, `Recorded expense of ₹${input.amount} for ${input.category}: ${input.description}`);

    return c.json({ success: true, id }, 201);
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

fees.delete('/expenses/:id', requireRole('admin', 'super_admin', 'Principal', 'Accountant'), async (c) => {
  const user = c.get('user');
  const db = c.env.DB;
  const id = c.req.param('id')!;

  try {
    const existing = await db.prepare(
      'SELECT institution_id FROM expenses WHERE id = ? AND is_active = 1'
    ).bind(id).first<{ institution_id: string }>();

    if (!existing || existing.institution_id !== user.institution_id) {
      return c.json({ error: 'Expense not found' }, 404);
    }

    await db.prepare('UPDATE expenses SET is_active = 0, updated_at = (datetime(\'now\')), updated_by = ? WHERE id = ?')
      .bind(user.sub, id).run();

    await createAuditLog(db, user.sub, 'DELETE_EXPENSE', 'fees', id, 'Deleted expense record');

    return c.json({ success: true });
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

export default fees;
