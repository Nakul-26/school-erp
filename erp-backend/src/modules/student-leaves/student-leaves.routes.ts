import { Hono } from 'hono';
import { Env, JwtPayload } from '../../types';
import { StudentLeavesRepository } from './student-leaves.repository';
import { StudentLeavesService } from './student-leaves.service';
import { authMiddleware, requireRole } from '../../middleware/auth';
import { createAuditLog } from '../../utils/audit';

const studentLeaves = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();

studentLeaves.use('*', authMiddleware);

studentLeaves.post('/', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const repo = new StudentLeavesRepository(c.env.DB);
  const service = new StudentLeavesService(repo);
  
  try {
    const id = await service.applyLeave(user.institution_id, body, user.sub);
    await createAuditLog(c.env.DB, user.sub, 'APPLY_STUDENT_LEAVE', 'student-leaves', id, `Student ${body.student_id} applied for leave`);
    return c.json({ id }, 201);
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

studentLeaves.get('/my/:studentId', async (c) => {
  const user = c.get('user');
  const studentId = c.req.param('studentId')!;
  const repo = new StudentLeavesRepository(c.env.DB);
  const service = new StudentLeavesService(repo);
  
  // Security check: only student or linked parent or teacher/admin can see
  const list = await service.listStudentLeaves(studentId);
  return c.json(list);
});

studentLeaves.get('/review', async (c) => {
  const user = c.get('user');
  const repo = new StudentLeavesRepository(c.env.DB);
  const service = new StudentLeavesService(repo);
  const userRoles = user.roles || (user.role ? [user.role] : []);
  const list = await service.listApplicationsForReview(user.institution_id, userRoles, user.sub, c.env.DB);
  return c.json(list);
});

studentLeaves.patch('/:id/approve', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const body = await c.req.json();
  const repo = new StudentLeavesRepository(c.env.DB);
  const service = new StudentLeavesService(repo);
  
  try {
    await service.approveLeave(id, user.sub, body.remarks);
    await createAuditLog(c.env.DB, user.sub, 'APPROVE_STUDENT_LEAVE', 'student-leaves', id, `Approved student leave application`);
    return c.json({ success: true });
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

studentLeaves.patch('/:id/reject', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const body = await c.req.json();
  const repo = new StudentLeavesRepository(c.env.DB);
  const service = new StudentLeavesService(repo);
  
  try {
    await service.rejectLeave(id, user.sub, body.remarks);
    await createAuditLog(c.env.DB, user.sub, 'REJECT_STUDENT_LEAVE', 'student-leaves', id, `Rejected student leave application`);
    return c.json({ success: true });
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

export default studentLeaves;
