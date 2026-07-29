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
    const status = e.statusCode || 400;
    return c.json({ error: e.message }, status);
  }
});

fees.post('/structures/:id/version', requireRole('admin', 'super_admin', 'Principal', 'HOD', 'Accountant'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const { new_amount } = await c.req.json();

  const repo = new FeesRepository(c.env.DB);
  const service = new FeesService(repo);

  try {
    const newId = await service.createNewVersion(user.institution_id, id, new_amount, user.sub);
    await createAuditLog(c.env.DB, user.sub, 'NEW_FEE_STRUCTURE_VERSION', 'fees', newId, `Created new fee structure version of ₹${new_amount}`);
    return c.json({ id: newId }, 201);
  } catch (e: any) {
    const status = e.statusCode || 400;
    return c.json({ error: e.message }, status);
  }
});

fees.delete('/structures/:id', requireRole('admin', 'super_admin', 'Principal', 'HOD', 'Accountant'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const repo = new FeesRepository(c.env.DB);
  const service = new FeesService(repo);

  try {
    await service.deleteStructure(id, user.institution_id, user.sub);
    await createAuditLog(c.env.DB, user.sub, 'DELETE_FEE_STRUCTURE', 'fees', id, `Deleted fee structure ${id}`);
    return c.json({ message: 'Fee structure deleted successfully' });
  } catch (e: any) {
    const status = e.statusCode || 400;
    return c.json({ error: e.message }, status);
  }
});

// --- STUDENT FEE RECORDS / ALLOCATIONS ---
fees.get('/records', async (c) => {
  const user = c.get('user');
  const repo = new FeesRepository(c.env.DB);
  const service = new FeesService(repo);

  const student_id = c.req.query('student_id');
  const academic_year_id = c.req.query('academic_year_id');
  const course_id = c.req.query('course_id');
  const status = c.req.query('status');
  const search = c.req.query('search');

  if (student_id) {
    const canAccess = await canAccessStudentFeeData(c.env.DB, user, student_id);
    if (!canAccess) return c.json({ error: 'Forbidden access to student fee records' }, 403);
  } else if (!isFeeStaff(user)) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const results = await service.listStudentRecords(user.institution_id, {
    student_id, academic_year_id, course_id, status, search
  });
  return c.json(results);
});

fees.post('/records', requireRole('admin', 'super_admin', 'Principal', 'HOD', 'Accountant'), async (c) => {
  const user = c.get('user');
  const input = await c.req.json();

  const isLocked = await isYearLockedOrArchived(c.env.DB, input.academic_year_id);
  if (isLocked) {
    return c.json({ error: 'This academic year is locked or archived. Modifications are not allowed.' }, 400);
  }

  const repo = new FeesRepository(c.env.DB);
  const service = new FeesService(repo);

  try {
    const id = await service.createFeeRecord(user.institution_id, input, user.sub);
    await createAuditLog(c.env.DB, user.sub, 'CREATE_STUDENT_FEE_RECORD', 'fees', id, `Allocated ${input.fee_type} fee of ₹${input.total_amount}`);
    return c.json({ id }, 201);
  } catch (e: any) {
    const status = e.statusCode || 400;
    return c.json({ error: e.message }, status);
  }
});

fees.post('/records/generate', requireRole('admin', 'super_admin', 'Principal', 'HOD', 'Accountant'), async (c) => {
  const user = c.get('user');
  const { student_id, academic_year_id, course_id, year_number } = await c.req.json();

  if (!student_id || !academic_year_id || !course_id || !year_number) {
    return c.json({ error: 'Missing required parameters' }, 400);
  }

  const isLocked = await isYearLockedOrArchived(c.env.DB, academic_year_id);
  if (isLocked) {
    return c.json({ error: 'This academic year is locked or archived.' }, 400);
  }

  const repo = new FeesRepository(c.env.DB);
  const service = new FeesService(repo);

  try {
    const result = await service.generateRecordsForStudent(user.institution_id, student_id, academic_year_id, course_id, year_number, user.sub);
    await createAuditLog(c.env.DB, user.sub, 'GENERATE_STUDENT_FEE_RECORDS', 'fees', student_id, `Generated fee records for student ${student_id}`);
    return c.json({ message: 'Fee records process completed', ...result });
  } catch (e: any) {
    const status = e.statusCode || 400;
    return c.json({ error: e.message }, status);
  }
});

fees.delete('/records/:id', requireRole('admin', 'super_admin', 'Principal', 'HOD', 'Accountant'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const repo = new FeesRepository(c.env.DB);
  const service = new FeesService(repo);

  try {
    await service.deleteFeeRecord(id, user.institution_id, user.sub);
    await createAuditLog(c.env.DB, user.sub, 'DELETE_STUDENT_FEE_RECORD', 'fees', id, `Deleted fee record ${id}`);
    return c.json({ message: 'Fee record deleted successfully' });
  } catch (e: any) {
    const status = e.statusCode || 400;
    return c.json({ error: e.message }, status);
  }
});

fees.get('/ledger/:studentId', async (c) => {
  const user = c.get('user');
  const studentId = c.req.param('studentId')!;

  const canAccess = await canAccessStudentFeeData(c.env.DB, user, studentId);
  if (!canAccess) {
    return c.json({ error: 'Forbidden access to student ledger' }, 403);
  }

  const repo = new FeesRepository(c.env.DB);
  const service = new FeesService(repo);

  const records = await service.getStudentLedger(studentId);
  const financialEntries = await service.getLedgerEntries(user.institution_id, { student_id: studentId });

  return c.json({
    records,
    financial_ledger: financialEntries
  });
});

// --- PAYMENTS & RECEIPTS ---
fees.get('/payments', async (c) => {
  const user = c.get('user');
  const repo = new FeesRepository(c.env.DB);
  const service = new FeesService(repo);

  const student_id = c.req.query('student_id');
  const payment_method = c.req.query('payment_method');
  const receipt_number = c.req.query('receipt_number');
  const transaction_reference = c.req.query('transaction_reference');
  const start_date = c.req.query('start_date');
  const end_date = c.req.query('end_date');

  if (student_id) {
    const canAccess = await canAccessStudentFeeData(c.env.DB, user, student_id);
    if (!canAccess) return c.json({ error: 'Forbidden' }, 403);
  } else if (!isFeeStaff(user)) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const results = await service.listPayments(user.institution_id, {
    student_id, payment_method, receipt_number, transaction_reference, start_date, end_date
  });
  return c.json(results);
});

fees.post('/payments', requireRole('admin', 'super_admin', 'Principal', 'HOD', 'Accountant'), async (c) => {
  const user = c.get('user');
  const input = await c.req.json();

  const repo = new FeesRepository(c.env.DB);
  const service = new FeesService(repo);

  try {
    const result = await service.makePayment(user.institution_id, input, user.sub);
    await createAuditLog(c.env.DB, user.sub, 'MAKE_FEE_PAYMENT', 'fees', result.paymentId, `Collected fee payment of ₹${input.amount} (Receipt: ${result.receiptNumber})`);
    return c.json(result, 201);
  } catch (e: any) {
    const status = e.statusCode || 400;
    return c.json({ error: e.message }, status);
  }
});

fees.post('/payments/:id/refund', requireRole('admin', 'super_admin', 'Principal', 'HOD', 'Accountant'), async (c) => {
  const user = c.get('user');
  const paymentId = c.req.param('id')!;
  const input = await c.req.json();

  const repo = new FeesRepository(c.env.DB);
  const service = new FeesService(repo);

  try {
    const refundId = await service.processRefund(user.institution_id, paymentId, input, user.sub);
    await createAuditLog(c.env.DB, user.sub, 'PROCESS_FEE_REFUND', 'fees', refundId, `Refunded ₹${input.refund_amount} for payment ${paymentId}`);
    return c.json({ refund_id: refundId, message: 'Refund processed successfully' }, 201);
  } catch (e: any) {
    const status = e.statusCode || 400;
    return c.json({ error: e.message }, status);
  }
});

fees.get('/refunds', requireRole('admin', 'super_admin', 'Principal', 'HOD', 'Accountant'), async (c) => {
  const user = c.get('user');
  const repo = new FeesRepository(c.env.DB);
  const service = new FeesService(repo);
  const refunds = await service.listRefunds(user.institution_id);
  return c.json(refunds);
});

fees.get('/receipts', async (c) => {
  const user = c.get('user');
  if (!isFeeStaff(user)) {
    return c.json({ error: 'Forbidden' }, 403);
  }
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

  const receipt = await service.getReceiptDetails(id);
  if (!receipt) {
    return c.json({ error: 'Receipt not found' }, 404);
  }

  const canAccess = await canAccessStudentFeeData(c.env.DB, user, receipt.student_id);
  if (!canAccess) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  return c.json(receipt);
});

fees.get('/receipts/:id/print', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const repo = new FeesRepository(c.env.DB);
  const service = new FeesService(repo);

  const receipt = await service.getReceiptDetails(id);
  if (!receipt) {
    return c.text('Receipt not found', 404);
  }

  const canAccess = await canAccessStudentFeeData(c.env.DB, user, receipt.student_id);
  if (!canAccess) {
    return c.text('Forbidden', 403);
  }

  const html = renderFeeReceiptHtml(receipt);
  return c.html(html);
});

// --- FINE RULES & ENGINE ---
fees.get('/fine-rules', requireRole('admin', 'super_admin', 'Principal', 'HOD', 'Accountant'), async (c) => {
  const user = c.get('user');
  const repo = new FeesRepository(c.env.DB);
  const service = new FeesService(repo);
  const rules = await service.listFineRules(user.institution_id);
  return c.json(rules);
});

fees.post('/fine-rules', requireRole('admin', 'super_admin', 'Principal', 'HOD', 'Accountant'), async (c) => {
  const user = c.get('user');
  const input = await c.req.json();
  const repo = new FeesRepository(c.env.DB);
  const service = new FeesService(repo);

  try {
    const id = await service.createFineRule(user.institution_id, input, user.sub);
    await createAuditLog(c.env.DB, user.sub, 'CREATE_FINE_RULE', 'fees', id, `Created fine rule ${input.name}`);
    return c.json({ id }, 201);
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

fees.delete('/fine-rules/:id', requireRole('admin', 'super_admin', 'Principal', 'HOD', 'Accountant'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const repo = new FeesRepository(c.env.DB);
  const service = new FeesService(repo);
  await service.deleteFineRule(id, user.institution_id, user.sub);
  return c.json({ message: 'Fine rule deleted' });
});

fees.post('/calculate-fines', requireRole('admin', 'super_admin', 'Principal', 'HOD', 'Accountant'), async (c) => {
  const user = c.get('user');
  const repo = new FeesRepository(c.env.DB);
  const service = new FeesService(repo);

  const result = await service.calculateAndApplyFines(user.institution_id, user.sub);
  await createAuditLog(c.env.DB, user.sub, 'CALCULATE_FINES', 'fees', user.institution_id, `Ran fine calculation engine: ${result.finesApplied} fines applied`);
  return c.json(result);
});

// --- IMMUTABLE FINANCIAL LEDGER ---
fees.get('/financial-ledger', requireRole('admin', 'super_admin', 'Principal', 'HOD', 'Accountant'), async (c) => {
  const user = c.get('user');
  const student_id = c.req.query('student_id');
  const record_id = c.req.query('record_id');

  const repo = new FeesRepository(c.env.DB);
  const service = new FeesService(repo);
  const entries = await service.getLedgerEntries(user.institution_id, { student_id, record_id });
  return c.json(entries);
});

// --- CONCESSIONS & SCHOLARSHIPS ---
fees.post('/concessions', requireRole('admin', 'super_admin', 'Principal', 'HOD', 'Accountant'), async (c) => {
  const user = c.get('user');
  const input = await c.req.json();

  const repo = new FeesRepository(c.env.DB);
  const service = new FeesService(repo);

  try {
    const id = await service.applyConcession(user.institution_id, input, user.sub);
    await createAuditLog(c.env.DB, user.sub, 'APPLY_FEE_CONCESSION', 'fees', id, `Applied ${input.concession_type} concession`);
    return c.json({ id }, 201);
  } catch (e: any) {
    const status = e.statusCode || 400;
    return c.json({ error: e.message }, status);
  }
});

fees.get('/concessions/:recordId', async (c) => {
  const user = c.get('user');
  const recordId = c.req.param('recordId')!;
  const repo = new FeesRepository(c.env.DB);
  const service = new FeesService(repo);

  const record = await repo.getRecordById(recordId);
  if (!record || record.institution_id !== user.institution_id) {
    return c.json({ error: 'Fee record not found' }, 404);
  }

  const canAccess = await canAccessStudentFeeData(c.env.DB, user, record.student_id);
  if (!canAccess) return c.json({ error: 'Forbidden' }, 403);

  const concessions = await service.listConcessions(recordId);
  return c.json(concessions);
});

fees.delete('/concessions/:id', requireRole('admin', 'super_admin', 'Principal', 'HOD', 'Accountant'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const repo = new FeesRepository(c.env.DB);
  const service = new FeesService(repo);

  try {
    await service.removeConcession(id, user.institution_id, user.sub);
    await createAuditLog(c.env.DB, user.sub, 'REMOVE_FEE_CONCESSION', 'fees', id, `Removed concession ${id}`);
    return c.json({ message: 'Concession removed successfully' });
  } catch (e: any) {
    const status = e.statusCode || 400;
    return c.json({ error: e.message }, status);
  }
});

// --- REMINDERS ---
fees.get('/reminders', requireRole('admin', 'super_admin', 'Principal', 'HOD', 'Accountant'), async (c) => {
  const user = c.get('user');
  const student_id = c.req.query('student_id');
  const repo = new FeesRepository(c.env.DB);
  const service = new FeesService(repo);
  const reminders = await service.listReminders(user.institution_id, student_id);
  return c.json(reminders);
});

fees.post('/reminders', requireRole('admin', 'super_admin', 'Principal', 'HOD', 'Accountant'), async (c) => {
  const user = c.get('user');
  const { student_id, student_fee_record_id, reminder_type, recipient, message } = await c.req.json();

  if (!student_id || !reminder_type || !recipient || !message) {
    return c.json({ error: 'Missing required parameters' }, 400);
  }

  const repo = new FeesRepository(c.env.DB);
  const service = new FeesService(repo);

  try {
    const id = await service.sendFeeReminder(user.institution_id, student_id, student_fee_record_id || null, reminder_type, recipient, message, user.sub);
    await createAuditLog(c.env.DB, user.sub, 'SEND_FEE_REMINDER', 'fees', id, `Sent ${reminder_type} reminder to ${recipient}`);
    return c.json({ id, message: 'Fee reminder logged and sent' }, 201);
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

// --- INSTALLMENTS ---
fees.post('/installments', requireRole('admin', 'super_admin', 'Principal', 'HOD', 'Accountant'), async (c) => {
  const user = c.get('user');
  const input = await c.req.json();
  const repo = new FeesRepository(c.env.DB);
  const service = new FeesService(repo);

  try {
    await service.createInstallmentPlan(user.institution_id, input, user.sub);
    await createAuditLog(c.env.DB, user.sub, 'CREATE_FEE_INSTALLMENTS', 'fees', input.student_fee_record_id, `Created installment plan`);
    return c.json({ message: 'Installment plan created' }, 201);
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

fees.get('/installments/:recordId', async (c) => {
  const user = c.get('user');
  const recordId = c.req.param('recordId')!;
  const repo = new FeesRepository(c.env.DB);
  const service = new FeesService(repo);

  const record = await repo.getRecordById(recordId);
  if (!record || record.institution_id !== user.institution_id) {
    return c.json({ error: 'Fee record not found' }, 404);
  }

  const canAccess = await canAccessStudentFeeData(c.env.DB, user, record.student_id);
  if (!canAccess) return c.json({ error: 'Forbidden' }, 403);

  const installments = await service.listInstallments(recordId);
  return c.json(installments);
});

fees.post('/installments/:id/pay', requireRole('admin', 'super_admin', 'Principal', 'HOD', 'Accountant'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const { amount } = await c.req.json();

  const repo = new FeesRepository(c.env.DB);
  const service = new FeesService(repo);

  try {
    await service.payInstallment(id, user.institution_id, amount, user.sub);
    return c.json({ message: 'Installment paid' });
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

// --- REPORTS & ANALYTICS ---
fees.get('/stats', requireRole('admin', 'super_admin', 'Principal', 'HOD', 'Accountant'), async (c) => {
  const user = c.get('user');
  const repo = new FeesRepository(c.env.DB);
  const service = new FeesService(repo);
  const stats = await service.getFeeSummaryStats(user.institution_id);
  return c.json(stats);
});

fees.get('/monthly-collection', requireRole('admin', 'super_admin', 'Principal', 'HOD', 'Accountant'), async (c) => {
  const user = c.get('user');
  const repo = new FeesRepository(c.env.DB);
  const service = new FeesService(repo);
  const data = await service.getMonthlyCollection(user.institution_id);
  return c.json(data);
});

fees.get('/cashier-summary', requireRole('admin', 'super_admin', 'Principal', 'HOD', 'Accountant'), async (c) => {
  const user = c.get('user');
  const repo = new FeesRepository(c.env.DB);
  const service = new FeesService(repo);
  const data = await service.getCashierSummary(user.institution_id);
  return c.json(data);
});

fees.get('/payment-method-distribution', requireRole('admin', 'super_admin', 'Principal', 'HOD', 'Accountant'), async (c) => {
  const user = c.get('user');
  const repo = new FeesRepository(c.env.DB);
  const service = new FeesService(repo);
  const data = await service.getPaymentMethodDistribution(user.institution_id);
  return c.json(data);
});

fees.get('/revenue-by-head', requireRole('admin', 'super_admin', 'Principal', 'HOD', 'Accountant'), async (c) => {
  const user = c.get('user');
  const repo = new FeesRepository(c.env.DB);
  const service = new FeesService(repo);
  const data = await service.getRevenueByFeeHead(user.institution_id);
  return c.json(data);
});

fees.get('/top-defaulters', requireRole('admin', 'super_admin', 'Principal', 'HOD', 'Accountant'), async (c) => {
  const user = c.get('user');
  const repo = new FeesRepository(c.env.DB);
  const service = new FeesService(repo);
  const defaulters = await service.getTopDefaulters(user.institution_id);
  return c.json(defaulters);
});

export default fees;
