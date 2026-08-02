import { Hono } from 'hono';
import { Env, JwtPayload } from '../../types';
import { HostelRepository } from './hostel.repository';
import { HostelService, HostelServiceError } from './hostel.service';
import { authMiddleware, requirePermission } from '../../middleware/auth';
import { createAuditLog } from '../../utils/audit';

const hostel = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();

hostel.use('*', authMiddleware);

function getService(c: any): HostelService {
  return new HostelService(new HostelRepository(c.env.DB), c.env.DB);
}

function handleError(c: any, e: any) {
  const statusCode = e instanceof HostelServiceError ? e.statusCode : 400;
  return c.json({ error: e.message }, statusCode as any);
}

async function canAccessStudentHostel(c: any, user: JwtPayload, studentId: string): Promise<boolean> {
  const roles = user.roles || (user.role ? [user.role] : []);
  const isStudent = roles.some((r: string) => ['student', 'Student'].includes(r));
  const isParent = roles.some((r: string) => ['parent', 'Parent', 'guardian', 'Guardian'].includes(r));

  if (isStudent) {
    const row = await c.env.DB.prepare(
      'SELECT 1 FROM students WHERE user_id = ? AND id = ? AND institution_id = ? AND is_active = 1'
    ).bind(user.sub, studentId, user.institution_id).first();
    return !!row;
  }
  if (isParent) {
    const row = await c.env.DB.prepare(`
      SELECT 1 FROM guardians g JOIN students s ON s.id = g.student_id
      WHERE g.user_id = ? AND g.student_id = ? AND g.is_active = 1 AND s.institution_id = ? AND s.is_active = 1
    `).bind(user.sub, studentId, user.institution_id).first();
    return !!row;
  }
  return true; // staff — gated by hostel.view/manage at the route level for mutating actions
}

// ==================== BLOCKS ==================== //

hostel.get('/blocks', requirePermission('hostel.view'), async (c) => {
  const user = c.get('user');
  const service = getService(c);
  return c.json(await service.listBlocks(user.institution_id));
});

hostel.post('/blocks', requirePermission('hostel.manage'), async (c) => {
  const user = c.get('user');
  const service = getService(c);
  const body = await c.req.json();
  try {
    const id = await service.createBlock(user.institution_id, body, user.sub);
    await createAuditLog(c.env.DB, { institutionId: user.institution_id, userId: user.sub, module: 'HOSTEL', action: 'CREATE_BLOCK', entityType: 'hostel_blocks', entityId: id, afterData: body });
    return c.json({ id }, 201);
  } catch (e: any) {
    return handleError(c, e);
  }
});

hostel.put('/blocks/:id', requirePermission('hostel.manage'), async (c) => {
  const user = c.get('user');
  const service = getService(c);
  const id = c.req.param('id');
  const body = await c.req.json();
  try {
    await service.updateBlock(user.institution_id, id, body, user.sub);
    return c.json({ success: true });
  } catch (e: any) {
    return handleError(c, e);
  }
});

hostel.delete('/blocks/:id', requirePermission('hostel.manage'), async (c) => {
  const user = c.get('user');
  const service = getService(c);
  const id = c.req.param('id');
  try {
    await service.deleteBlock(user.institution_id, id);
    return c.json({ success: true });
  } catch (e: any) {
    return handleError(c, e);
  }
});

// ==================== ROOMS ==================== //

hostel.get('/rooms', requirePermission('hostel.view'), async (c) => {
  const user = c.get('user');
  const service = getService(c);
  const blockId = c.req.query('blockId');
  return c.json(await service.listRooms(user.institution_id, blockId));
});

hostel.post('/rooms', requirePermission('hostel.manage'), async (c) => {
  const user = c.get('user');
  const service = getService(c);
  const body = await c.req.json();
  try {
    const id = await service.createRoom(user.institution_id, body, user.sub);
    await createAuditLog(c.env.DB, { institutionId: user.institution_id, userId: user.sub, module: 'HOSTEL', action: 'CREATE_ROOM', entityType: 'hostel_rooms', entityId: id, afterData: body });
    return c.json({ id }, 201);
  } catch (e: any) {
    return handleError(c, e);
  }
});

hostel.put('/rooms/:id', requirePermission('hostel.manage'), async (c) => {
  const user = c.get('user');
  const service = getService(c);
  const id = c.req.param('id');
  const body = await c.req.json();
  try {
    await service.updateRoom(user.institution_id, id, body, user.sub);
    return c.json({ success: true });
  } catch (e: any) {
    return handleError(c, e);
  }
});

hostel.delete('/rooms/:id', requirePermission('hostel.manage'), async (c) => {
  const user = c.get('user');
  const service = getService(c);
  const id = c.req.param('id');
  try {
    await service.deleteRoom(user.institution_id, id);
    return c.json({ success: true });
  } catch (e: any) {
    return handleError(c, e);
  }
});

// ==================== ALLOCATIONS ==================== //

hostel.get('/allocations', requirePermission('hostel.view'), async (c) => {
  const user = c.get('user');
  const service = getService(c);
  const roomId = c.req.query('roomId');
  const blockId = c.req.query('blockId');
  return c.json(await service.listAllocations(user.institution_id, { roomId, blockId }));
});

// Single student's current hostel allocation (self/parent/staff) — used for the per-student modal.
hostel.get('/student/:studentId', async (c) => {
  const user = c.get('user');
  const studentId = c.req.param('studentId');
  if (!(await canAccessStudentHostel(c, user, studentId))) {
    return c.json({ error: "Forbidden: cannot access this student's hostel record" }, 403);
  }
  const service = getService(c);
  const allocation = await service.getStudentAllocation(user.institution_id, studentId);
  return c.json({ allocation });
});

hostel.post('/allocations', requirePermission('hostel.manage'), async (c) => {
  const user = c.get('user');
  const service = getService(c);
  const body = await c.req.json();
  try {
    const id = await service.allocateRoom(user.institution_id, body, user.sub);
    await createAuditLog(c.env.DB, { institutionId: user.institution_id, userId: user.sub, module: 'HOSTEL', action: 'ALLOCATE_ROOM', entityType: 'hostel_allocations', entityId: id, afterData: body });
    return c.json({ id }, 201);
  } catch (e: any) {
    return handleError(c, e);
  }
});

hostel.post('/allocations/:id/vacate', requirePermission('hostel.manage'), async (c) => {
  const user = c.get('user');
  const service = getService(c);
  const id = c.req.param('id');
  try {
    await service.vacateAllocation(user.institution_id, id, user.sub);
    await createAuditLog(c.env.DB, { institutionId: user.institution_id, userId: user.sub, module: 'HOSTEL', action: 'VACATE_ROOM', entityType: 'hostel_allocations', entityId: id });
    return c.json({ success: true });
  } catch (e: any) {
    return handleError(c, e);
  }
});

// ==================== BILLING ==================== //

hostel.post('/billing/generate', requirePermission('hostel.manage'), async (c) => {
  const user = c.get('user');
  const service = getService(c);
  const { due_date, billing_month_name } = await c.req.json();
  try {
    const result = await service.generateMonthlyBilling(user.institution_id, due_date, billing_month_name);
    return c.json({ success: true, message: `Billed: ${result.billed} students. Skipped (already billed): ${result.skipped} students.` });
  } catch (e: any) {
    return handleError(c, e);
  }
});

export default hostel;
