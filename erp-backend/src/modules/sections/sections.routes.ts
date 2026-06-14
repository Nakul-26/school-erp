import { Hono } from 'hono';
import { Env, JwtPayload } from '../../types';
import { SectionRepository } from './sections.repository';
import { SectionService } from './sections.service';
import { authMiddleware, requireRole } from '../../middleware/auth';

const sections = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();

sections.use('*', authMiddleware);

sections.get('/', async (c) => {
  const user = c.get('user');
  const filters = c.req.query();
  const repo = new SectionRepository(c.env.DB);
  const service = new SectionService(repo);
  const results = await service.listSections(user.institution_id, filters);
  return c.json(results);
});

sections.get('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const repo = new SectionRepository(c.env.DB);
  const service = new SectionService(repo);
  const result = await service.getSection(id);
  
  if (!result || result.institution_id !== user.institution_id) {
    return c.json({ error: 'Section not found' }, 404);
  }
  return c.json(result);
});

sections.post('/', requireRole('admin', 'super_admin'), async (c) => {
  const user = c.get('user');
  const input = await c.req.json();
  const repo = new SectionRepository(c.env.DB);
  const service = new SectionService(repo);
  const id = await service.createSection(user.institution_id, input, user.sub);
  return c.json({ id }, 201);
});

sections.put('/:id', requireRole('admin', 'super_admin'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const input = await c.req.json();
  const repo = new SectionRepository(c.env.DB);
  const service = new SectionService(repo);
  
  const existing = await service.getSection(id);
  if (!existing || existing.institution_id !== user.institution_id) {
    return c.json({ error: 'Section not found' }, 404);
  }
  
  await service.updateSection(id, input, user.sub);
  return c.json({ success: true });
});

sections.delete('/:id', requireRole('admin', 'super_admin'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const repo = new SectionRepository(c.env.DB);
  const service = new SectionService(repo);
  
  const existing = await service.getSection(id);
  if (!existing || existing.institution_id !== user.institution_id) {
    return c.json({ error: 'Section not found' }, 404);
  }
  
  await service.deleteSection(id, user.sub);
  return c.json({ success: true });
});

export default sections;
