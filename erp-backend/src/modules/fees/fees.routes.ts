import { Hono } from 'hono';
import { Env, JwtPayload } from '../../types';
import { FeesRepository } from './fees.repository';
import { FeesService } from './fees.service';
import { authMiddleware, requireRole } from '../../middleware/auth';
import { createAuditLog } from '../../utils/audit';

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

export default fees;
