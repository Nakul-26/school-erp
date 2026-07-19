import { Hono } from 'hono';
import { Env, JwtPayload } from '../../types';
import { PayrollRepository } from './payroll.repository';
import { PayrollService } from './payroll.service';
import { authMiddleware, requireRole } from '../../middleware/auth';
import { createAuditLog } from '../../utils/audit';

const payroll = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();

payroll.use('*', authMiddleware);

function userRoles(user: JwtPayload): string[] {
  return user.roles || (user.role ? [user.role] : []);
}

function canManagePayroll(user: JwtPayload): boolean {
  return userRoles(user).some((role) => [
    'admin',
    'Admin',
    'super_admin',
    'Super Admin',
    'role-super-admin',
    'Principal',
    'principal'
  ].includes(role));
}

function isTeacherRole(user: JwtPayload): boolean {
  return userRoles(user).some((role) => ['teacher', 'Teacher'].includes(role));
}

async function getTeacherForPayrollAccess(db: D1Database, user: JwtPayload, teacherId: string) {
  const teacher = await db.prepare(
    'SELECT id, user_id, institution_id FROM teachers WHERE id = ? AND institution_id = ? AND is_active = 1'
  ).bind(teacherId, user.institution_id).first<{ id: string; user_id: string | null; institution_id: string }>();

  if (!teacher) return { allowed: false, found: false };
  if (canManagePayroll(user)) return { allowed: true, found: true };
  if (isTeacherRole(user) && teacher.user_id === user.sub) return { allowed: true, found: true };
  return { allowed: false, found: true };
}

// --- SALARY STRUCTURES ---
payroll.get('/salary-structures', requireRole('admin', 'super_admin', 'Principal'), async (c) => {
  const user = c.get('user');
  const repo = new PayrollRepository(c.env.DB);
  const service = new PayrollService(repo);
  const results = await service.listSalaryStructures(user.institution_id);
  return c.json(results);
});

payroll.post('/salary-structures', requireRole('admin', 'super_admin', 'Principal'), async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const repo = new PayrollRepository(c.env.DB);
  const service = new PayrollService(repo);
  try {
    const id = await service.saveSalaryStructure(user.institution_id, body, user.sub);
    await createAuditLog(c.env.DB, user.sub, 'SAVE_SALARY_STRUCTURE', 'payroll', id, `Saved salary structure for teacher ${body.teacher_id}`);
    return c.json({ id }, 201);
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

payroll.get('/salary-structures/:teacherId', async (c) => {
  const user = c.get('user');
  const teacherId = c.req.param('teacherId')!;
  const access = await getTeacherForPayrollAccess(c.env.DB, user, teacherId);
  if (!access.found) return c.json({ error: 'Teacher not found' }, 404);
  if (!access.allowed) return c.json({ error: 'Forbidden' }, 403);

  const repo = new PayrollRepository(c.env.DB);
  const service = new PayrollService(repo);
  const result = await service.getSalaryStructure(teacherId);
  return c.json(result);
});

payroll.delete('/salary-structures/:teacherId', requireRole('admin', 'super_admin', 'Principal'), async (c) => {
  const user = c.get('user');
  const teacherId = c.req.param('teacherId')!;
  const repo = new PayrollRepository(c.env.DB);
  try {
    await repo.deleteSalaryStructure(teacherId);
    await createAuditLog(c.env.DB, user.sub, 'DELETE_SALARY_STRUCTURE', 'payroll', teacherId, `Deleted salary structure for teacher ${teacherId}`);
    return c.json({ success: true });
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

payroll.get('/teacher/:teacherId/payslips', async (c) => {
  const user = c.get('user');
  const teacherId = c.req.param('teacherId')!;
  const access = await getTeacherForPayrollAccess(c.env.DB, user, teacherId);
  if (!access.found) return c.json({ error: 'Teacher not found' }, 404);
  if (!access.allowed) return c.json({ error: 'Forbidden' }, 403);

  const repo = new PayrollRepository(c.env.DB);
  const slips = await repo.getPayslipsForTeacher(teacherId);
  return c.json(slips);
});

// --- PAYROLL RUNS ---
payroll.get('/runs', requireRole('admin', 'super_admin', 'Principal'), async (c) => {
  const user = c.get('user');
  const repo = new PayrollRepository(c.env.DB);
  const service = new PayrollService(repo);
  const results = await service.listRuns(user.institution_id);
  return c.json(results);
});

payroll.post('/runs', requireRole('admin', 'super_admin', 'Principal'), async (c) => {
  const user = c.get('user');
  const body = await c.req.json(); // { month, year }
  const repo = new PayrollRepository(c.env.DB);
  const service = new PayrollService(repo);
  try {
    const runId = await service.generatePayrollForMonth(user.institution_id, Number(body.month), Number(body.year), user.sub);
    await createAuditLog(c.env.DB, user.sub, 'GENERATE_PAYROLL', 'payroll', runId, `Generated payroll run for ${body.month}/${body.year}`);
    return c.json({ id: runId }, 201);
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

payroll.get('/runs/:id', requireRole('admin', 'super_admin', 'Principal'), async (c) => {
  const id = c.req.param('id')!;
  const repo = new PayrollRepository(c.env.DB);
  const service = new PayrollService(repo);
  try {
    const result = await service.getRunDetail(id);
    return c.json(result);
  } catch (e: any) {
    return c.json({ error: e.message }, 404);
  }
});

payroll.patch('/runs/:id/finalize', requireRole('admin', 'super_admin', 'Principal'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const repo = new PayrollRepository(c.env.DB);
  const service = new PayrollService(repo);
  try {
    await service.finalizeRun(id, user.sub);
    await createAuditLog(c.env.DB, user.sub, 'FINALIZE_PAYROLL', 'payroll', id, `Finalized payroll run`);
    return c.json({ success: true });
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

payroll.delete('/runs/:id', requireRole('admin', 'super_admin', 'Principal'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const repo = new PayrollRepository(c.env.DB);
  try {
    await repo.deletePayrollRun(id);
    await createAuditLog(c.env.DB, user.sub, 'DELETE_PAYROLL_RUN', 'payroll', id, `Deleted payroll run ${id}`);
    return c.json({ success: true });
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

// --- PAYSLIPS ---
payroll.get('/payslips/my', async (c) => {
  const user = c.get('user');
  const db = c.env.DB;
  
  // Lookup teacher by user.sub
  const teacher = await db.prepare('SELECT id FROM teachers WHERE user_id = ? AND institution_id = ? AND is_active = 1')
    .bind(user.sub, user.institution_id).first<{ id: string }>();
  if (!teacher) {
    return c.json({ error: 'Teacher profile not found' }, 404);
  }

  const repo = new PayrollRepository(c.env.DB);
  const service = new PayrollService(repo);
  const slips = await service.getTeacherPayslips(teacher.id);
  return c.json(slips);
});

payroll.get('/payslips/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const repo = new PayrollRepository(c.env.DB);
  const service = new PayrollService(repo);
  
  const slip = await service.getPayslip(id);
  if (!slip || slip.institution_id !== user.institution_id) {
    return c.json({ error: 'Payslip not found' }, 404);
  }
  
  // Security check: teacher can only see own slip
  const userRoles = user.roles || (user.role ? [user.role] : []);
  const isAdmin = userRoles.some(r => ['admin', 'super_admin', 'Principal'].includes(r));
  if (!isAdmin) {
    const teacher = await c.env.DB.prepare('SELECT id FROM teachers WHERE user_id = ? AND institution_id = ? AND is_active = 1')
      .bind(user.sub, user.institution_id).first<{ id: string }>();
    if (!teacher || teacher.id !== slip.teacher_id) {
      return c.json({ error: 'Unauthorized access' }, 403);
    }
  }

  return c.json(slip);
});

export default payroll;
