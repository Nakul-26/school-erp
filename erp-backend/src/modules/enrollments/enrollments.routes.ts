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
