import { Hono } from 'hono';
import { Env, JwtPayload } from '../../types';
import { ProgramRepository } from './programs.repository';
import { ProgramService } from './programs.service';
import { authMiddleware, requireRole } from '../../middleware/auth';

const programs = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();

programs.use('*', authMiddleware);

programs.get('/', async (c) => {
  const user = c.get('user');
  const repo = new ProgramRepository(c.env.DB);
  const service = new ProgramService(repo);
  const results = await service.listPrograms(user.institution_id);
  return c.json(results);
});

programs.get('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const repo = new ProgramRepository(c.env.DB);
  const service = new ProgramService(repo);
  const result = await service.getProgram(id);
  
  if (!result || result.institution_id !== user.institution_id) {
    return c.json({ error: 'Program not found' }, 404);
  }
  return c.json(result);
});

programs.post('/', requireRole('admin', 'super_admin'), async (c) => {
  const user = c.get('user');
  const input = await c.req.json();
  const repo = new ProgramRepository(c.env.DB);
  const service = new ProgramService(repo);
  const id = await service.createProgram(user.institution_id, input, user.sub);
  return c.json({ id }, 201);
});

programs.put('/:id', requireRole('admin', 'super_admin'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const input = await c.req.json();
  const repo = new ProgramRepository(c.env.DB);
  const service = new ProgramService(repo);
  
  const existing = await service.getProgram(id);
  if (!existing || existing.institution_id !== user.institution_id) {
    return c.json({ error: 'Program not found' }, 404);
  }
  
  await service.updateProgram(id, input, user.sub);
  return c.json({ success: true });
});

programs.delete('/:id', requireRole('admin', 'super_admin'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const repo = new ProgramRepository(c.env.DB);
  const service = new ProgramService(repo);
  
  const existing = await service.getProgram(id);
  if (!existing || existing.institution_id !== user.institution_id) {
    return c.json({ error: 'Program not found' }, 404);
  }
  
  await service.deleteProgram(id, user.sub);
  return c.json({ success: true });
});

export default programs;
