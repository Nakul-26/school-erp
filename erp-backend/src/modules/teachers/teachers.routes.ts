import { Hono } from 'hono';
import { Env, JwtPayload } from '../../types';
import { TeacherRepository } from './teachers.repository';
import { TeacherService } from './teachers.service';
import { authMiddleware, requireRole } from '../../middleware/auth';

const teachers = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();

teachers.use('*', authMiddleware);

teachers.get('/', async (c) => {
  const user = c.get('user');
  const repo = new TeacherRepository(c.env.DB);
  const service = new TeacherService(repo);
  const results = await service.listTeachers(user.institution_id);
  return c.json(results);
});

teachers.get('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const repo = new TeacherRepository(c.env.DB);
  const service = new TeacherService(repo);
  const result = await service.getTeacher(id);
  
  if (!result || result.institution_id !== user.institution_id) {
    return c.json({ error: 'Teacher not found' }, 404);
  }
  return c.json(result);
});

teachers.post('/', requireRole('admin', 'super_admin'), async (c) => {
  const user = c.get('user');
  const input = await c.req.json();
  const repo = new TeacherRepository(c.env.DB);
  const service = new TeacherService(repo);
  const id = await service.createTeacher(user.institution_id, input, user.sub);
  return c.json({ id }, 201);
});

teachers.put('/:id', requireRole('admin', 'super_admin'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const input = await c.req.json();
  const repo = new TeacherRepository(c.env.DB);
  const service = new TeacherService(repo);
  
  const existing = await service.getTeacher(id);
  if (!existing || existing.institution_id !== user.institution_id) {
    return c.json({ error: 'Teacher not found' }, 404);
  }
  
  await service.updateTeacher(id, input, user.sub);
  return c.json({ success: true });
});

teachers.delete('/:id', requireRole('admin', 'super_admin'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const repo = new TeacherRepository(c.env.DB);
  const service = new TeacherService(repo);
  
  const existing = await service.getTeacher(id);
  if (!existing || existing.institution_id !== user.institution_id) {
    return c.json({ error: 'Teacher not found' }, 404);
  }
  
  await service.deleteTeacher(id, user.sub);
  return c.json({ success: true });
});

export default teachers;
