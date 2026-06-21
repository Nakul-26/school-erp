import { Hono } from 'hono';
import { Env, JwtPayload } from '../../types';
import { EnrollmentRepository } from './enrollments.repository';
import { EnrollmentService } from './enrollments.service';
import { authMiddleware, requireRole } from '../../middleware/auth';

const enrollments = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();

enrollments.use('*', authMiddleware);

enrollments.get('/student/:studentId', async (c) => {
  const user = c.get('user');
  const studentId = c.req.param('studentId')!;
  const repo = new EnrollmentRepository(c.env.DB);
  if (!await repo.studentBelongsToInstitution(studentId, user.institution_id)) {
    return c.json({ error: 'Student not found' }, 404);
  }

  // Security checks
  const userRoles = user.roles || (user.role ? [user.role] : []);
  const isStudent = userRoles.some(r => ['student', 'Student'].includes(r));
  const isParent = userRoles.some(r => ['parent', 'Parent', 'guardian', 'Guardian'].includes(r));
  const isAdminOrStaff = userRoles.some(r => ['super_admin', 'Super Admin', 'admin', 'Principal', 'HOD', 'Teacher'].includes(r));

  if (isStudent) {
    const student = await c.env.DB.prepare('SELECT user_id FROM students WHERE id = ? AND is_active = 1').bind(studentId).first<{ user_id: string }>();
    if (student && student.user_id !== user.sub) {
      return c.json({ error: 'Forbidden: You cannot access other student enrollments' }, 403);
    }
  }

  if (isParent) {
    const isChild = await c.env.DB.prepare(
      'SELECT 1 FROM guardians WHERE user_id = ? AND student_id = ? AND is_active = 1'
    ).bind(user.sub, studentId).first();
    if (!isChild && !isAdminOrStaff) {
      return c.json({ error: 'Forbidden: You cannot access enrollments of students who are not your children' }, 403);
    }
  }

  if (!isStudent && !isParent && !isAdminOrStaff) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const service = new EnrollmentService(repo);
  const results = await service.listEnrollmentsByStudent(studentId);
  return c.json(results);
});

enrollments.post('/', requireRole('admin', 'super_admin'), async (c) => {
  const user = c.get('user');
  const input = await c.req.json();
  const repo = new EnrollmentRepository(c.env.DB);
  if (!await repo.referencesBelongToInstitution(input, user.institution_id)) {
    return c.json({ error: 'Invalid enrollment references' }, 400);
  }
  const service = new EnrollmentService(repo);
  const id = await service.createEnrollment(input, user.sub);
  return c.json({ id }, 201);
});

enrollments.put('/:id', requireRole('admin', 'super_admin'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const input = await c.req.json();
  const repo = new EnrollmentRepository(c.env.DB);
  if (!await repo.belongsToInstitution(id, user.institution_id)) {
    return c.json({ error: 'Enrollment not found' }, 404);
  }
  if (!await repo.updateReferencesBelongToInstitution(id, input, user.institution_id)) {
    return c.json({ error: 'Invalid enrollment references' }, 400);
  }
  const service = new EnrollmentService(repo);
  await service.updateEnrollment(id, input, user.sub);
  return c.json({ success: true });
});

enrollments.delete('/:id', requireRole('admin', 'super_admin'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const repo = new EnrollmentRepository(c.env.DB);
  if (!await repo.belongsToInstitution(id, user.institution_id)) {
    return c.json({ error: 'Enrollment not found' }, 404);
  }
  const service = new EnrollmentService(repo);
  await service.deleteEnrollment(id, user.sub);
  return c.json({ success: true });
});

export default enrollments;
