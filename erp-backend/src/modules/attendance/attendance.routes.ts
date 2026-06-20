import { Hono } from 'hono';
import { Env, JwtPayload } from '../../types';
import { AttendanceRepository } from './attendance.repository';
import { AttendanceService } from './attendance.service';
import { authMiddleware } from '../../middleware/auth';
import { createAuditLog } from '../../utils/audit';

const attendance = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();

attendance.use('*', authMiddleware);

attendance.get('/sessions', async (c) => {
  const user = c.get('user');
  const sectionId = c.req.query('section_id');
  const date = c.req.query('date');
  
  const repo = new AttendanceRepository(c.env.DB);
  const service = new AttendanceService(repo);
  const results = await service.listSessions(user.institution_id, sectionId, date);
  return c.json(results);
});

attendance.get('/sessions/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const repo = new AttendanceRepository(c.env.DB);
  const service = new AttendanceService(repo);
  const result = await service.getSession(id);
  
  if (!result || result.institution_id !== user.institution_id) {
    return c.json({ error: 'Session not found' }, 404);
  }
  return c.json(result);
});

attendance.post('/sessions', async (c) => {
  const user = c.get('user');
  const input = await c.req.json();
  const repo = new AttendanceRepository(c.env.DB);
  const service = new AttendanceService(repo);
  
  try {
    const id = await service.createSession(user.institution_id, input, user.sub);
    await createAuditLog(c.env.DB, user.sub, 'CREATE_ATTENDANCE_SESSION', 'attendance', id, `Created attendance session for section ${input.section_id} on ${input.date}`);
    return c.json({ id }, 201);
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

attendance.delete('/sessions/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const repo = new AttendanceRepository(c.env.DB);
  const service = new AttendanceService(repo);
  
  const existing = await service.getSession(id);
  if (!existing || existing.institution_id !== user.institution_id) {
    return c.json({ error: 'Session not found' }, 404);
  }
  
  await service.deleteSession(id, user.sub);
  await createAuditLog(c.env.DB, user.sub, 'DELETE_ATTENDANCE_SESSION', 'attendance', id, `Deleted attendance session`);
  return c.json({ success: true });
});

attendance.get('/sessions/:id/attendance', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const repo = new AttendanceRepository(c.env.DB);
  const service = new AttendanceService(repo);
  
  const session = await service.getSession(id);
  if (!session || session.institution_id !== user.institution_id) {
    return c.json({ error: 'Session not found' }, 404);
  }
  
  const results = await service.getSessionAttendance(id, session.section_id);
  return c.json(results);
});

attendance.post('/sessions/:id/attendance', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const input = await c.req.json();
  
  const repo = new AttendanceRepository(c.env.DB);
  const service = new AttendanceService(repo);
  
  const session = await service.getSession(id);
  if (!session || session.institution_id !== user.institution_id) {
    return c.json({ error: 'Session not found' }, 404);
  }
  
  try {
    await service.markAttendance(user.institution_id, id, input, user.sub);
    await createAuditLog(c.env.DB, user.sub, 'MARK_ATTENDANCE', 'attendance', id, `Marked attendance for session ${id}`);
    return c.json({ success: true });
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

export default attendance;
