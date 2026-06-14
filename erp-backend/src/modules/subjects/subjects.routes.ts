import { Hono } from 'hono';
import { Env, JwtPayload } from '../../types';
import { SubjectRepository } from './subjects.repository';
import { SubjectService } from './subjects.service';
import { authMiddleware, requireRole } from '../../middleware/auth';

const subjects = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();

subjects.use('*', authMiddleware);

subjects.get('/', async (c) => {
  const user = c.get('user');
  const filters = c.req.query();
  const repo = new SubjectRepository(c.env.DB);
  const service = new SubjectService(repo);
  const results = await service.listSubjects(user.institution_id, {
    course_id: filters.course_id,
    semester: filters.semester ? parseInt(filters.semester) : undefined
  });
  return c.json(results);
});

subjects.get('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const repo = new SubjectRepository(c.env.DB);
  const service = new SubjectService(repo);
  const result = await service.getSubject(id);
  
  if (!result || result.institution_id !== user.institution_id) {
    return c.json({ error: 'Subject not found' }, 404);
  }
  return c.json(result);
});

subjects.post('/', requireRole('admin', 'super_admin'), async (c) => {
  const user = c.get('user');
  const input = await c.req.json();
  const repo = new SubjectRepository(c.env.DB);
  const service = new SubjectService(repo);
  const id = await service.createSubject(user.institution_id, input, user.sub);
  return c.json({ id }, 201);
});

subjects.put('/:id', requireRole('admin', 'super_admin'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const input = await c.req.json();
  const repo = new SubjectRepository(c.env.DB);
  const service = new SubjectService(repo);
  
  const existing = await service.getSubject(id);
  if (!existing || existing.institution_id !== user.institution_id) {
    return c.json({ error: 'Subject not found' }, 404);
  }
  
  await service.updateSubject(id, input, user.sub);
  return c.json({ success: true });
});

subjects.delete('/:id', requireRole('admin', 'super_admin'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const repo = new SubjectRepository(c.env.DB);
  const service = new SubjectService(repo);
  
  const existing = await service.getSubject(id);
  if (!existing || existing.institution_id !== user.institution_id) {
    return c.json({ error: 'Subject not found' }, 404);
  }
  
  await service.deleteSubject(id, user.sub);
  return c.json({ success: true });
});

export default subjects;
