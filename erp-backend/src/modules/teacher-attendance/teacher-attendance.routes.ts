import { Hono } from 'hono';
import { Env, JwtPayload } from '../../types';
import { TeacherAttendanceRepository } from './teacher-attendance.repository';
import { TeacherAttendanceService } from './teacher-attendance.service';
import { authMiddleware, requireRole } from '../../middleware/auth';
import { createAuditLog } from '../../utils/audit';

const teacherAttendance = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();

teacherAttendance.use('*', authMiddleware);

teacherAttendance.get('/', requireRole('admin', 'super_admin', 'Principal', 'HOD'), async (c) => {
  const user = c.get('user');
  const date = c.req.query('date') || new Date().toISOString().split('T')[0];
  
  const repo = new TeacherAttendanceRepository(c.env.DB);
  const service = new TeacherAttendanceService(repo);
  const results = await service.listAttendanceByDate(user.institution_id, date);
  return c.json(results);
});

teacherAttendance.post('/', requireRole('admin', 'super_admin', 'Principal', 'HOD'), async (c) => {
  const user = c.get('user');
  const { date, records } = await c.req.json<{ date: string; records: any[] }>();
  
  if (!date || !records || !Array.isArray(records)) {
    return c.json({ error: 'Invalid payload' }, 400);
  }

  const repo = new TeacherAttendanceRepository(c.env.DB);
  const service = new TeacherAttendanceService(repo);
  
  try {
    await service.markAttendance(user.institution_id, date, records, user.sub);
    await createAuditLog(
      c.env.DB, 
      user.sub, 
      'MARK_TEACHER_ATTENDANCE', 
      'teacher-attendance', 
      null, 
      `Marked teacher attendance for date ${date}`
    );
    return c.json({ success: true });
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

teacherAttendance.get('/history/:teacherId', requireRole('admin', 'super_admin', 'Principal', 'HOD', 'Teacher'), async (c) => {
  const user = c.get('user');
  const teacherId = c.req.param('teacherId')!;
  
  // Tenant isolation: ensure teacher belongs to this institution
  const teacherCheck = await c.env.DB.prepare(
    'SELECT id FROM teachers WHERE id = ? AND institution_id = ? AND is_active = 1'
  ).bind(teacherId, user.institution_id).first();
  if (!teacherCheck) {
    return c.json({ error: 'Teacher not found' }, 404);
  }

  const repo = new TeacherAttendanceRepository(c.env.DB);
  const service = new TeacherAttendanceService(repo);
  
  const results = await service.getTeacherAttendanceHistory(teacherId);
  return c.json(results);
});

export default teacherAttendance;

