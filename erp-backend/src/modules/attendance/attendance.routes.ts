import { Hono } from 'hono';
import { Env, JwtPayload } from '../../types';
import { AttendanceRepository } from './attendance.repository';
import { AttendanceService } from './attendance.service';
import { authMiddleware } from '../../middleware/auth';
import { createAuditLog } from '../../utils/audit';
import { NotificationRepository } from '../notifications/notifications.repository';
import { NotificationService } from '../notifications/notifications.service';
import { isSectionYearLockedOrArchived } from '../../utils/academic-year-lock';

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
  
  // Validate academic year is not locked/archived
  const isLocked = await isSectionYearLockedOrArchived(c.env.DB, input.section_id);
  if (isLocked) {
    return c.json({ error: 'This academic year is locked or archived. Modifications are not allowed.' }, 400);
  }
  
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

  // Validate academic year is not locked/archived
  const isLocked = await isSectionYearLockedOrArchived(c.env.DB, existing.section_id);
  if (isLocked) {
    return c.json({ error: 'This academic year is locked or archived. Modifications are not allowed.' }, 400);
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

  // Validate academic year is not locked/archived
  const isLocked = await isSectionYearLockedOrArchived(c.env.DB, session.section_id);
  if (isLocked) {
    return c.json({ error: 'This academic year is locked or archived. Modifications are not allowed.' }, 400);
  }
  
  try {
    await service.markAttendance(user.institution_id, id, input, user.sub);
    await createAuditLog(c.env.DB, user.sub, 'MARK_ATTENDANCE', 'attendance', id, `Marked attendance for session ${id}`);
    
    // Trigger in-app notification
    try {
      const notifRepo = new NotificationRepository(c.env.DB);
      const notifService = new NotificationService(notifRepo, c.env.DB);
      await notifService.notifyAttendanceMarked(user.institution_id, id);
    } catch (err) {
      console.error('Failed to trigger attendance notification:', err);
    }

    return c.json({ success: true });
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

attendance.get('/reports/students', async (c) => {
  const user = c.get('user');
  const sectionId = c.req.query('section_id')!;
  
  if (!sectionId) {
    return c.json({ error: 'section_id is required' }, 400);
  }
  
  const repo = new AttendanceRepository(c.env.DB);
  const service = new AttendanceService(repo);
  const results = await service.getStudentAttendanceReport(user.institution_id, sectionId);
  return c.json(results);
});

attendance.get('/student/:studentId', async (c) => {
  const user = c.get('user');
  const studentId = c.req.param('studentId')!;
  
  // Verify student belongs to this institution
  const student = await c.env.DB.prepare('SELECT * FROM students WHERE id = ? AND institution_id = ? AND is_active = 1').bind(studentId, user.institution_id).first<any>();
  if (!student) {
    return c.json({ error: 'Student not found' }, 404);
  }

  // Security checks
  const userRoles = user.roles || (user.role ? [user.role] : []);
  const isStudent = userRoles.some(r => ['student', 'Student'].includes(r));
  const isParent = userRoles.some(r => ['parent', 'Parent', 'guardian', 'Guardian'].includes(r));
  const isAdminOrStaff = userRoles.some(r => ['super_admin', 'Super Admin', 'admin', 'Principal', 'HOD', 'Teacher'].includes(r));

  if (isStudent && student.user_id !== user.sub) {
    return c.json({ error: 'Forbidden: You cannot access other student attendance' }, 403);
  }

  if (isParent) {
    const isChild = await c.env.DB.prepare(
      'SELECT 1 FROM guardians WHERE user_id = ? AND student_id = ? AND is_active = 1'
    ).bind(user.sub, studentId).first();
    if (!isChild && !isAdminOrStaff) {
      return c.json({ error: 'Forbidden: You cannot access attendance of students who are not your children' }, 403);
    }
  }

  if (!isStudent && !isParent && !isAdminOrStaff) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  // Fetch student detailed attendance
  const { results } = await c.env.DB.prepare(`
    SELECT 
      sa.status, 
      sa.remarks, 
      asess.date, 
      sub.subject_name, 
      t.first_name || ' ' || t.last_name as teacher_name
    FROM student_attendance sa
    JOIN attendance_sessions asess ON sa.session_id = asess.id
    JOIN subjects sub ON asess.subject_id = sub.id
    JOIN teachers t ON asess.teacher_id = t.id
    WHERE sa.student_id = ? AND sa.is_active = 1 AND asess.is_active = 1
    ORDER BY asess.date DESC
  `).bind(studentId).all<any>();

  // Calculate summary
  const present = results ? results.filter(r => ['present', 'late'].includes(r.status)).length : 0;
  const total = results ? results.length : 0;
  const percentage = total > 0 ? Math.round((present / total) * 100 * 10) / 10 : 100;

  return c.json({
    studentId,
    percentage,
    present,
    total,
    records: results || []
  });
});

export default attendance;
