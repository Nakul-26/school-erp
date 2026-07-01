import { Hono } from 'hono';
import { Env, JwtPayload } from '../../types';
import { FeesRepository } from './fees.repository';
import { FeesService } from './fees.service';
import { authMiddleware, requireRole } from '../../middleware/auth';
import { createAuditLog } from '../../utils/audit';
import { isYearLockedOrArchived } from '../../utils/academic-year-lock';

const fees = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();

fees.use('*', authMiddleware);

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
  const repo = new FeesRepository(c.env.DB);
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
  return c.json(results);
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
    SELECT name, COALESCE(email, '') as email
    FROM guardians
    WHERE student_id = ? AND is_active = 1
  `).bind(student_id).all<{ name: string; email: string }>();

  if (!guardians.results || guardians.results.length === 0) {
    return c.json({ error: 'No parent or guardian linked to this student.' }, 404);
  }

  const { sendEmail } = await import('../../utils/email');
  let sentCount = 0;

  for (const guardian of guardians.results) {
    if (guardian.email) {
      try {
        await sendEmail(c.env, {
          to: guardian.email,
          subject: `Fee Outstanding Reminder: ${studentName}`,
          html: `
            <div style="font-family: sans-serif; padding: 20px; line-height: 1.6; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px;">
              <h2 style="color: #ea580c; margin-top: 0;">Fee Due Outstanding Reminder</h2>
              <p>Dear ${guardian.name || 'Parent/Guardian'},</p>
              <p>This is a friendly reminder that an outstanding amount of <strong>₹${pending_amount.toLocaleString('en-IN')}</strong> is due for the fee component linked to your child, <strong>${studentName}</strong> (Admission ID: ${student.admission_number}).</p>
              <p>We request you to kindly clear the outstanding balance at your earliest convenience. You can view details or check invoices directly on your Parent Portal.</p>
              <p>If you have already made this payment, please disregard this notice or contact the school finance department to verify the transaction.</p>
              <hr style="border: 0; border-top: 1px solid #cbd5e1; margin: 20px 0;" />
              <p style="font-size: 0.8rem; color: #64748b;">This is an automated notification from your School ERP Portal.</p>
            </div>
          `
        });
        sentCount++;
      } catch (err) {
        console.error(`Failed to send fee reminder to ${guardian.email}:`, err);
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

  const remaining = record.total_amount - record.paid_amount;
  if (amount > remaining) {
    return c.json({ error: `Amount ₹${amount} exceeds the remaining balance ₹${remaining}` }, 400);
  }

  const newPaidAmount = record.paid_amount + amount;
  const newStatus = newPaidAmount >= record.total_amount ? 'PAID' : 'PARTIAL';

  // 2. Insert fee payment
  const paymentId = crypto.randomUUID();
  const today = new Date().toISOString().split('T')[0];
  await db.prepare(`
    INSERT INTO fee_payments (id, institution_id, student_fee_record_id, amount_paid, payment_date, payment_method, transaction_reference, remarks)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'Self-service online payment')
  `).bind(
    paymentId,
    user.institution_id,
    id,
    amount,
    today,
    payment_method || 'Online',
    transaction_reference || `TXN-${Date.now()}`
  ).run();

  // 3. Generate receipt
  const receiptId = crypto.randomUUID();
  const receiptNo = `REC-${Date.now().toString().slice(-8)}`;
  await db.prepare(`
    INSERT INTO fee_receipts (id, institution_id, student_fee_record_id, payment_id, receipt_number, receipt_date, amount)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    receiptId,
    user.institution_id,
    id,
    paymentId,
    receiptNo,
    today,
    amount
  ).run();

  // 4. Update student fee record ledger
  await db.prepare(`
    UPDATE student_fee_records 
    SET paid_amount = ?, status = ?, updated_at = (datetime('now'))
    WHERE id = ?
  `).bind(newPaidAmount, newStatus, id).run();

  await createAuditLog(db, user.sub, 'PAY_FEE_ONLINE', 'fees', id, `Self paid ₹${amount} online via ${payment_method}`);

  return c.json({ success: true, receipt_number: receiptNo });
});

export default fees;
