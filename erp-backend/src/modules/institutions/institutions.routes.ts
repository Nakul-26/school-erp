import { Hono } from 'hono';
import { Env, JwtPayload } from '../../types';
import { InstitutionRepository } from './institutions.repository';
import { InstitutionService } from './institutions.service';
import { authMiddleware, requireRole } from '../../middleware/auth';

const institutions = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();

institutions.use('*', authMiddleware);

institutions.get('/', requireRole('super_admin'), async (c) => {
  const repo = new InstitutionRepository(c.env.DB);
  const service = new InstitutionService(repo);
  const results = await service.getAllInstitutions();
  return c.json(results);
});

institutions.get('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  if (user.role !== 'super_admin' && id !== user.institution_id) {
    return c.json({ error: 'Institution not found' }, 404);
  }
  const repo = new InstitutionRepository(c.env.DB);
  const service = new InstitutionService(repo);
  const result = await service.getInstitution(id);
  if (!result) return c.json({ error: 'Institution not found' }, 404);
  return c.json(result);
});

institutions.post('/', requireRole('super_admin'), async (c) => {
  const user = c.get('user');
  const input = await c.req.json();
  const repo = new InstitutionRepository(c.env.DB);
  const service = new InstitutionService(repo);
  const id = await service.createInstitution(input, user.sub);
  return c.json({ id }, 201);
});

institutions.put('/:id', requireRole('super_admin'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;

  const input = await c.req.json();
  const repo = new InstitutionRepository(c.env.DB);
  const service = new InstitutionService(repo);
  await service.updateInstitution(id, input, user.sub);
  return c.json({ success: true });
});

institutions.delete('/:id', requireRole('super_admin'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;

  const repo = new InstitutionRepository(c.env.DB);
  const service = new InstitutionService(repo);
  await service.deleteInstitution(id, user.sub);
  return c.json({ success: true });
});

export default institutions;
