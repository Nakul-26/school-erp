import { Hono } from 'hono';
import { Env, JwtPayload } from '../../types';
import { StudentLeavesRepository } from './student-leaves.repository';
import { StudentLeavesService } from './student-leaves.service';
import { authMiddleware, requireRole } from '../../middleware/auth';
import { createAuditLog } from '../../utils/audit';
import { teacherCanAccessStudent } from '../../utils/teacher-scope';

const studentLeaves = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();

studentLeaves.use('*', authMiddleware);

function userRoles(user: JwtPayload): string[] {
  return user.roles || (user.role ? [user.role] : []);
}

function hasRole(user: JwtPayload, roles: string[]): boolean {
  return userRoles(user).some((role) => roles.includes(role));
}

function isStudentUser(user: JwtPayload): boolean {
  return hasRole(user, ['student', 'Student']);
}

function isParentUser(user: JwtPayload): boolean {
  return hasRole(user, ['parent', 'Parent', 'guardian', 'Guardian']);
}

function isStudentLeaveManager(user: JwtPayload): boolean {
  return hasRole(user, [
    'admin',
    'Admin',
    'super_admin',
    'Super Admin',
    'role-super-admin',
    'Principal',
    'principal',
    'HOD',
    'hod'
  ]);
}

function isTeacherUser(user: JwtPayload): boolean {
  return hasRole(user, ['Teacher', 'teacher']);
}

async function ensureStudentInInstitution(db: D1Database, user: JwtPayload, studentId: string) {
  return await db.prepare(
    'SELECT id, user_id FROM students WHERE id = ? AND institution_id = ? AND is_active = 1'
  ).bind(studentId, user.institution_id).first<{ id: string; user_id: string | null }>();
}

async function parentCanAccessStudent(db: D1Database, user: JwtPayload, studentId: string): Promise<boolean> {
  const link = await db.prepare(`
    SELECT 1
    FROM guardians g
    JOIN students s ON s.id = g.student_id
    WHERE g.user_id = ?
      AND g.student_id = ?
      AND g.is_active = 1
      AND s.institution_id = ?
      AND s.is_active = 1
  `).bind(user.sub, studentId, user.institution_id).first();
  return Boolean(link);
}

async function canAccessStudentLeave(db: D1Database, user: JwtPayload, studentId: string): Promise<boolean> {
  const student = await ensureStudentInInstitution(db, user, studentId);
  if (!student) return false;
  if (isStudentLeaveManager(user)) return true;
  if (isStudentUser(user)) return student.user_id === user.sub;
  if (isParentUser(user)) return await parentCanAccessStudent(db, user, studentId);
  if (isTeacherUser(user)) return await teacherCanAccessStudent(db, user, studentId);
  return false;
}

async function getReviewableLeave(db: D1Database, user: JwtPayload, leaveId: string) {
  const leave = await db.prepare(
    'SELECT id, student_id FROM student_leave_applications WHERE id = ? AND institution_id = ? AND is_active = 1'
  ).bind(leaveId, user.institution_id).first<{ id: string; student_id: string }>();

  if (!leave) return { found: false, allowed: false, leave: null };
  const allowed = isStudentLeaveManager(user) || (isTeacherUser(user) && await teacherCanAccessStudent(db, user, leave.student_id));
  return { found: true, allowed, leave };
}

studentLeaves.post('/', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const repo = new StudentLeavesRepository(c.env.DB);
  const service = new StudentLeavesService(repo);

  if (!body.student_id) {
    return c.json({ error: 'student_id is required' }, 400);
  }

  if (!(await canAccessStudentLeave(c.env.DB, user, body.student_id))) {
    return c.json({ error: 'Forbidden' }, 403);
  }
  
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
  
  if (!(await canAccessStudentLeave(c.env.DB, user, studentId))) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const list = await service.listStudentLeaves(studentId);
  return c.json(list);
});

studentLeaves.get('/review', requireRole('admin', 'super_admin', 'Principal', 'principal', 'HOD', 'hod', 'Teacher', 'teacher'), async (c) => {
  const user = c.get('user');
  const repo = new StudentLeavesRepository(c.env.DB);
  const service = new StudentLeavesService(repo);
  const userRoles = user.roles || (user.role ? [user.role] : []);
  const list = await service.listApplicationsForReview(user.institution_id, userRoles, user.sub, c.env.DB);
  return c.json(list);
});

studentLeaves.patch('/:id/approve', requireRole('admin', 'super_admin', 'Principal', 'principal', 'HOD', 'hod', 'Teacher', 'teacher'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const body = await c.req.json();
  const repo = new StudentLeavesRepository(c.env.DB);
  const service = new StudentLeavesService(repo);

  const review = await getReviewableLeave(c.env.DB, user, id);
  if (!review.found) return c.json({ error: 'Leave application not found' }, 404);
  if (!review.allowed) return c.json({ error: 'Forbidden' }, 403);
  
  try {
    await service.approveLeave(id, user.sub, body.remarks);
    await createAuditLog(c.env.DB, user.sub, 'APPROVE_STUDENT_LEAVE', 'student-leaves', id, `Approved student leave application`);
    return c.json({ success: true });
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

studentLeaves.patch('/:id/reject', requireRole('admin', 'super_admin', 'Principal', 'principal', 'HOD', 'hod', 'Teacher', 'teacher'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const body = await c.req.json();
  const repo = new StudentLeavesRepository(c.env.DB);
  const service = new StudentLeavesService(repo);

  const review = await getReviewableLeave(c.env.DB, user, id);
  if (!review.found) return c.json({ error: 'Leave application not found' }, 404);
  if (!review.allowed) return c.json({ error: 'Forbidden' }, 403);
  
  try {
    await service.rejectLeave(id, user.sub, body.remarks);
    await createAuditLog(c.env.DB, user.sub, 'REJECT_STUDENT_LEAVE', 'student-leaves', id, `Rejected student leave application`);
    return c.json({ success: true });
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

export default studentLeaves;
