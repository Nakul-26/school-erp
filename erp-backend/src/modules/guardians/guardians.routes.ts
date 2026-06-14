import { Hono } from 'hono';
import { Env, JwtPayload } from '../../types';
import { GuardianRepository } from './guardians.repository';
import { GuardianService } from './guardians.service';
import { authMiddleware, requireRole } from '../../middleware/auth';

const guardians = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();

guardians.use('*', authMiddleware);

guardians.get('/student/:studentId', async (c) => {
  const user = c.get('user');
  const studentId = c.req.param('studentId')!;
  const repo = new GuardianRepository(c.env.DB);
  if (!await repo.studentBelongsToInstitution(studentId, user.institution_id)) {
    return c.json({ error: 'Student not found' }, 404);
  }
  const service = new GuardianService(repo);
  const results = await service.listGuardiansByStudent(studentId);
  return c.json(results);
});

guardians.get('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const repo = new GuardianRepository(c.env.DB);
  if (!await repo.belongsToInstitution(id, user.institution_id)) {
    return c.json({ error: 'Guardian not found' }, 404);
  }
  const service = new GuardianService(repo);
  const result = await service.getGuardian(id);
  if (!result) return c.json({ error: 'Guardian not found' }, 404);
  return c.json(result);
});

guardians.post('/', requireRole('admin', 'super_admin'), async (c) => {
  const user = c.get('user');
  const input = await c.req.json();
  const repo = new GuardianRepository(c.env.DB);
  if (!await repo.studentBelongsToInstitution(input.student_id, user.institution_id)) {
    return c.json({ error: 'Student not found' }, 404);
  }
  const service = new GuardianService(repo);
  const id = await service.createGuardian(input, user.sub);
  return c.json({ id }, 201);
});

guardians.put('/:id', requireRole('admin', 'super_admin'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const input = await c.req.json();
  const repo = new GuardianRepository(c.env.DB);
  if (!await repo.belongsToInstitution(id, user.institution_id)) {
    return c.json({ error: 'Guardian not found' }, 404);
  }
  const service = new GuardianService(repo);
  await service.updateGuardian(id, input, user.sub);
  return c.json({ success: true });
});

guardians.delete('/:id', requireRole('admin', 'super_admin'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const repo = new GuardianRepository(c.env.DB);
  if (!await repo.belongsToInstitution(id, user.institution_id)) {
    return c.json({ error: 'Guardian not found' }, 404);
  }
  const service = new GuardianService(repo);
  await service.deleteGuardian(id, user.sub);
  return c.json({ success: true });
});

export default guardians;
