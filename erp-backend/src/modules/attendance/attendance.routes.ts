import { Hono } from 'hono';
import { Env, JwtPayload } from '../../types';
import { AttendanceRepository } from './attendance.repository';
import { AttendanceService } from './attendance.service';
import { authMiddleware } from '../../middleware/auth';
import { createAuditLog } from '../../utils/audit';
import { NotificationRepository } from '../notifications/notifications.repository';
import { NotificationService } from '../notifications/notifications.service';
import { isSectionYearLockedOrArchived } from '../../utils/academic-year-lock';
import {
  getTeacherIdForUser,
  isTeacherOnly,
  teacherCanAccessStudent,
  teacherHasSectionAccess,
  teacherHasSubjectAccess,
} from '../../utils/teacher-scope';

const attendance = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();

attendance.use('*', authMiddleware);

attendance.get('/sessions', async (c) => {
  const user = c.get('user');
  const sectionId = c.req.query('section_id');
  const date = c.req.query('date');
  
  const userRoles = user.roles || (user.role ? [user.role] : []);
  const isStaff = userRoles.some(r => ['admin', 'super_admin', 'Principal', 'HOD', 'Teacher', 'teacher'].includes(r));
  if (!isStaff) {
    return c.json({ error: 'Forbidden' }, 403);
  }
  
  const repo = new AttendanceRepository(c.env.DB);
  const service = new AttendanceService(repo);

  if (isTeacherOnly(user)) {
    if (sectionId && !(await teacherHasSectionAccess(c.env.DB, user, sectionId))) {
      return c.json({ error: 'Forbidden: section is outside your teaching assignment' }, 403);
    }

    const teacherId = await getTeacherIdForUser(c.env.DB, user);
    if (!teacherId) return c.json([]);

    let query = `
      SELECT asess.*,
             sec.name AS section_name,
             s.subject_name AS subject_name,
             s.subject_code AS subject_code,
             (t.first_name || ' ' || t.last_name) AS teacher_name,
             ts.name AS slot_name
      FROM attendance_sessions asess
      LEFT JOIN sections sec ON asess.section_id = sec.id
      LEFT JOIN subjects s ON asess.subject_id = s.id
      LEFT JOIN teachers t ON asess.teacher_id = t.id
      LEFT JOIN timetable_slots ts ON asess.slot_id = ts.id
      WHERE asess.institution_id = ? AND asess.is_active = 1
        AND (
          EXISTS (
            SELECT 1 FROM teacher_subject_assignments tsa
            WHERE tsa.teacher_id = ? AND tsa.section_id = asess.section_id AND tsa.subject_id = asess.subject_id AND tsa.is_active = 1
          )
          OR EXISTS (
            SELECT 1 FROM teaching_allocations ta
            WHERE ta.teacher_id = ? AND ta.section_id = asess.section_id AND ta.subject_id = asess.subject_id AND ta.institution_id = ? AND LOWER(ta.status) = 'active'
          )
        )
    `;
    const params: any[] = [user.institution_id, teacherId, teacherId, user.institution_id];

    if (sectionId) {
      query += ' AND asess.section_id = ?';
      params.push(sectionId);
    }
    if (date) {
      query += ' AND asess.date = ?';
      params.push(date);
    }

    query += ' ORDER BY asess.date DESC, asess.created_at DESC';
    const { results } = await c.env.DB.prepare(query).bind(...params).all();
    return c.json(results || []);
  }

  const results = await service.listSessions(user.institution_id, sectionId, date);
  return c.json(results);
});

attendance.get('/sessions/:id', async (c) => {
  const user = c.get('user');
  const userRoles = user.roles || (user.role ? [user.role] : []);
  const isStaff = userRoles.some(r => ['admin', 'super_admin', 'Principal', 'HOD', 'Teacher', 'teacher'].includes(r));
  if (!isStaff) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const id = c.req.param('id')!;
  const repo = new AttendanceRepository(c.env.DB);
  const service = new AttendanceService(repo);
  const result = await service.getSession(id);
  
  if (!result || result.institution_id !== user.institution_id) {
    return c.json({ error: 'Session not found' }, 404);
  }
  if (!(await teacherHasSubjectAccess(c.env.DB, user, result.subject_id, result.section_id))) {
    return c.json({ error: 'Forbidden: attendance session is outside your teaching assignment' }, 403);
  }
  return c.json(result);
});

attendance.post('/sessions', async (c) => {
  const user = c.get('user');
  const userRoles = user.roles || (user.role ? [user.role] : []);
  const isStaff = userRoles.some(r => ['admin', 'super_admin', 'Principal', 'HOD', 'Teacher', 'teacher'].includes(r));
  if (!isStaff) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const input = await c.req.json();
  const repo = new AttendanceRepository(c.env.DB);
  const service = new AttendanceService(repo);

  if (!(await teacherHasSectionAccess(c.env.DB, user, input.section_id))) {
    return c.json({ error: 'Forbidden: section is outside your teaching assignment' }, 403);
  }
  if (!(await teacherHasSubjectAccess(c.env.DB, user, input.subject_id, input.section_id))) {
    return c.json({ error: 'Forbidden: subject is outside your teaching assignment for this section' }, 403);
  }
  if (isTeacherOnly(user)) {
    const teacherId = await getTeacherIdForUser(c.env.DB, user);
    if (!teacherId) return c.json({ error: 'Teacher profile not found for this user' }, 403);
    input.teacher_id = teacherId;
  }
  
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
  const userRoles = user.roles || (user.role ? [user.role] : []);
  const isStaff = userRoles.some(r => ['admin', 'super_admin', 'Principal', 'HOD', 'Teacher', 'teacher'].includes(r));
  if (!isStaff) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const id = c.req.param('id')!;
  const repo = new AttendanceRepository(c.env.DB);
  const service = new AttendanceService(repo);
  
  const existing = await service.getSession(id);
  if (!existing || existing.institution_id !== user.institution_id) {
    return c.json({ error: 'Session not found' }, 404);
  }
  if (!(await teacherHasSubjectAccess(c.env.DB, user, existing.subject_id, existing.section_id))) {
    return c.json({ error: 'Forbidden: attendance session is outside your teaching assignment' }, 403);
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
  const userRoles = user.roles || (user.role ? [user.role] : []);
  const isStaff = userRoles.some(r => ['admin', 'super_admin', 'Principal', 'HOD', 'Teacher', 'teacher'].includes(r));
  if (!isStaff) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const id = c.req.param('id')!;
  const repo = new AttendanceRepository(c.env.DB);
  const service = new AttendanceService(repo);
  
  const session = await service.getSession(id);
  if (!session || session.institution_id !== user.institution_id) {
    return c.json({ error: 'Session not found' }, 404);
  }
  if (!(await teacherHasSubjectAccess(c.env.DB, user, session.subject_id, session.section_id))) {
    return c.json({ error: 'Forbidden: attendance session is outside your teaching assignment' }, 403);
  }
  
  const results = await service.getSessionAttendance(id, session.section_id);
  return c.json(results);
});

attendance.post('/sessions/:id/attendance', async (c) => {
  const user = c.get('user');
  const userRoles = user.roles || (user.role ? [user.role] : []);
  const isStaff = userRoles.some(r => ['admin', 'super_admin', 'Principal', 'HOD', 'Teacher', 'teacher'].includes(r));
  if (!isStaff) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const id = c.req.param('id')!;
  const input = await c.req.json();
  
  const repo = new AttendanceRepository(c.env.DB);
  const service = new AttendanceService(repo);
  
  const session = await service.getSession(id);
  if (!session || session.institution_id !== user.institution_id) {
    return c.json({ error: 'Session not found' }, 404);
  }
  if (!(await teacherHasSubjectAccess(c.env.DB, user, session.subject_id, session.section_id))) {
    return c.json({ error: 'Forbidden: attendance session is outside your teaching assignment' }, 403);
  }

  if (Array.isArray(input) && input.length > 0) {
    const ids = input.map((record: any) => record.student_id).filter(Boolean);
    if (ids.length !== input.length) {
      return c.json({ error: 'Each attendance row must include student_id' }, 400);
    }

    for (const studentId of ids) {
      const enrolled = await c.env.DB.prepare(`
        SELECT 1
        FROM student_enrollments se
        JOIN students s ON s.id = se.student_id
        WHERE se.student_id = ?
          AND se.section_id = ?
          AND se.is_active = 1
          AND s.institution_id = ?
          AND s.is_active = 1
        LIMIT 1
      `).bind(studentId, session.section_id, user.institution_id).first();
      if (!enrolled || !(await teacherCanAccessStudent(c.env.DB, user, studentId))) {
        return c.json({ error: 'Forbidden: attendance includes a student outside this session section' }, 403);
      }
    }
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
      await notifService.notifyAttendanceMarked(user.institution_id, id, c.env);
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
  const userRoles = user.roles || (user.role ? [user.role] : []);
  const isStaff = userRoles.some(r => ['admin', 'super_admin', 'Principal', 'HOD', 'Teacher', 'teacher'].includes(r));
  if (!isStaff) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const sectionId = c.req.query('section_id')!;
  
  if (!sectionId) {
    return c.json({ error: 'section_id is required' }, 400);
  }
  if (!(await teacherHasSectionAccess(c.env.DB, user, sectionId))) {
    return c.json({ error: 'Forbidden: section is outside your teaching assignment' }, 403);
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

  if (isTeacherOnly(user) && !(await teacherCanAccessStudent(c.env.DB, user, studentId))) {
    return c.json({ error: 'Forbidden: student is outside your teaching assignment' }, 403);
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
