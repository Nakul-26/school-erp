import { Hono } from 'hono';
import { Env, JwtPayload } from '../../types';
import { LeaveRepository } from './leave.repository';
import { LeaveService } from './leave.service';
import { authMiddleware, requireRole } from '../../middleware/auth';
import { createAuditLog } from '../../utils/audit';

const leave = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();

leave.use('*', authMiddleware);

// Helper: resolve teacher_id from user_id + institution_id
async function resolveTeacherId(db: D1Database, userId: string, institutionId: string): Promise<string | null> {
  const row = await db.prepare(
    'SELECT id FROM teachers WHERE user_id = ? AND institution_id = ? AND is_active = 1'
  ).bind(userId, institutionId).first<{ id: string }>();
  return row?.id || null;
}

// --- LEAVE TYPES ---

leave.get('/types', async (c) => {
  const user = c.get('user');
  const repo = new LeaveRepository(c.env.DB);
  const service = new LeaveService(repo);
  const results = await service.listLeaveTypes(user.institution_id);
  return c.json(results);
});

leave.post('/types', requireRole('admin', 'super_admin', 'Principal', 'HOD'), async (c) => {
  const user = c.get('user');
  const input = await c.req.json();

  if (!input.name || !input.code || !input.days_per_year) {
    return c.json({ error: 'name, code, and days_per_year are required' }, 400);
  }

  const repo = new LeaveRepository(c.env.DB);
  const service = new LeaveService(repo);

  try {
    const id = await service.createLeaveType(user.institution_id, input, user.sub);
    await createAuditLog(c.env.DB, user.sub, 'CREATE_LEAVE_TYPE', 'leave', id, `Created leave type ${input.name} (${input.code})`);
    return c.json({ id }, 201);
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

leave.put('/types/:id', requireRole('admin', 'super_admin', 'Principal', 'HOD'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const { name, days_per_year } = await c.req.json();

  if (!name || !days_per_year) {
    return c.json({ error: 'name and days_per_year are required' }, 400);
  }

  const repo = new LeaveRepository(c.env.DB);
  const service = new LeaveService(repo);

  const existing = await repo.getLeaveTypeById(id);
  if (!existing || existing.institution_id !== user.institution_id) {
    return c.json({ error: 'Leave type not found' }, 404);
  }

  try {
    await service.updateLeaveType(id, name, days_per_year, user.sub);
    await createAuditLog(c.env.DB, user.sub, 'UPDATE_LEAVE_TYPE', 'leave', id, `Updated leave type ${name}`);
    return c.json({ success: true });
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

leave.delete('/types/:id', requireRole('admin', 'super_admin', 'Principal', 'HOD'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;

  const repo = new LeaveRepository(c.env.DB);
  const service = new LeaveService(repo);

  const existing = await repo.getLeaveTypeById(id);
  if (!existing || existing.institution_id !== user.institution_id) {
    return c.json({ error: 'Leave type not found' }, 404);
  }

  await service.deleteLeaveType(id, user.sub);
  await createAuditLog(c.env.DB, user.sub, 'DELETE_LEAVE_TYPE', 'leave', id, `Deleted leave type ${existing.name}`);
  return c.json({ success: true });
});

// --- LEAVE BALANCES ---

leave.post('/balances/seed', requireRole('admin', 'super_admin', 'Principal'), async (c) => {
  const user = c.get('user');
  const { academic_year_id } = await c.req.json();

  if (!academic_year_id) {
    return c.json({ error: 'academic_year_id is required' }, 400);
  }

  const repo = new LeaveRepository(c.env.DB);
  const service = new LeaveService(repo);

  try {
    await service.seedBalancesForYear(user.institution_id, academic_year_id, user.sub);
    await createAuditLog(c.env.DB, user.sub, 'SEED_LEAVE_BALANCES', 'leave', academic_year_id, `Seeded leave balances for academic year ${academic_year_id}`);
    return c.json({ success: true });
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

leave.get('/balances', requireRole('admin', 'super_admin', 'Principal', 'HOD'), async (c) => {
  const user = c.get('user');
  const academicYearId = c.req.query('academic_year_id');

  if (!academicYearId) {
    return c.json({ error: 'academic_year_id query parameter is required' }, 400);
  }

  const repo = new LeaveRepository(c.env.DB);
  const service = new LeaveService(repo);
  const results = await service.getBalancesForInstitution(user.institution_id, academicYearId);
  return c.json(results);
});

leave.get('/balances/my', async (c) => {
  const user = c.get('user');
  const academicYearId = c.req.query('academic_year_id');

  if (!academicYearId) {
    return c.json({ error: 'academic_year_id query parameter is required' }, 400);
  }

  const teacherId = await resolveTeacherId(c.env.DB, user.sub, user.institution_id);
  if (!teacherId) {
    return c.json({ error: 'Teacher profile not found for this user' }, 404);
  }

  const repo = new LeaveRepository(c.env.DB);
  const service = new LeaveService(repo);
  const results = await service.getMyBalances(teacherId, academicYearId);
  return c.json(results);
});

// --- LEAVE APPLICATIONS ---

leave.post('/applications', async (c) => {
  const user = c.get('user');
  const roles = user.roles || (user.role ? [user.role] : []);
  const isTeacher = roles.some((role) => ['teacher', 'Teacher'].includes(role));
  if (!isTeacher) {
    return c.json({ error: 'Forbidden: leave applications must be submitted by a teacher account' }, 403);
  }

  const body = await c.req.json();

  const teacherId = await resolveTeacherId(c.env.DB, user.sub, user.institution_id);
  if (!teacherId) {
    return c.json({ error: 'Teacher profile not found for this user' }, 404);
  }

  const { leave_type_id, academic_year_id, from_date, to_date, days_count, reason } = body;

  if (!leave_type_id || !academic_year_id || !from_date || !to_date || !days_count || !reason) {
    return c.json({ error: 'All fields are required: leave_type_id, academic_year_id, from_date, to_date, days_count, reason' }, 400);
  }

  const repo = new LeaveRepository(c.env.DB);
  const service = new LeaveService(repo);

  try {
    const id = await service.applyForLeave(user.institution_id, {
      teacher_id: teacherId,
      leave_type_id,
      academic_year_id,
      from_date,
      to_date,
      days_count,
      reason,
    }, user.sub);
    await createAuditLog(c.env.DB, user.sub, 'APPLY_LEAVE', 'leave', id, `Applied for leave from ${from_date} to ${to_date}`);
    return c.json({ id }, 201);
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

leave.get('/applications/my', async (c) => {
  const user = c.get('user');

  const teacherId = await resolveTeacherId(c.env.DB, user.sub, user.institution_id);
  if (!teacherId) {
    return c.json({ error: 'Teacher profile not found for this user' }, 404);
  }

  const repo = new LeaveRepository(c.env.DB);
  const service = new LeaveService(repo);
  const results = await service.listMyApplications(teacherId);
  return c.json(results);
});

leave.get('/applications', requireRole('admin', 'super_admin', 'Principal', 'HOD'), async (c) => {
  const user = c.get('user');
  const status = c.req.query('status');
  const teacherId = c.req.query('teacher_id');

  const repo = new LeaveRepository(c.env.DB);
  const service = new LeaveService(repo);
  const results = await service.listApplications(user.institution_id, status, teacherId);
  return c.json(results);
});

leave.patch('/applications/:id/approve', requireRole('admin', 'super_admin', 'Principal', 'HOD'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const body = await c.req.json().catch(() => ({}));
  const remarks = body?.remarks;

  const repo = new LeaveRepository(c.env.DB);
  const service = new LeaveService(repo);

  try {
    await service.approveApplication(id, user.sub, remarks);
    await createAuditLog(c.env.DB, user.sub, 'APPROVE_LEAVE', 'leave', id, `Approved leave application ${id}`);
    return c.json({ success: true });
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

leave.patch('/applications/:id/reject', requireRole('admin', 'super_admin', 'Principal', 'HOD'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const { remarks } = await c.req.json();

  if (!remarks) {
    return c.json({ error: 'remarks are required when rejecting a leave application' }, 400);
  }

  const repo = new LeaveRepository(c.env.DB);
  const service = new LeaveService(repo);

  try {
    await service.rejectApplication(id, user.sub, remarks);
    await createAuditLog(c.env.DB, user.sub, 'REJECT_LEAVE', 'leave', id, `Rejected leave application ${id}: ${remarks}`);
    return c.json({ success: true });
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

export default leave;
