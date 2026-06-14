import { Hono } from 'hono';
import { Env, JwtPayload } from '../../types';
import { StudentRepository } from './students.repository';
import { StudentService } from './students.service';
import { authMiddleware, requireRole } from '../../middleware/auth';

const students = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();

students.use('*', authMiddleware);

students.get('/', async (c) => {
  const user = c.get('user');
  const repo = new StudentRepository(c.env.DB);
  const service = new StudentService(repo);
  const results = await service.listStudents(user.institution_id);
  return c.json(results);
});

students.get('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const repo = new StudentRepository(c.env.DB);
  const service = new StudentService(repo);
  const result = await service.getStudent(id);
  
  if (!result || result.institution_id !== user.institution_id) {
    return c.json({ error: 'Student not found' }, 404);
  }
  return c.json(result);
});

students.post('/', requireRole('admin', 'super_admin'), async (c) => {
  const user = c.get('user');
  const input = await c.req.json();
  const repo = new StudentRepository(c.env.DB);
  const service = new StudentService(repo);
  const id = await service.createStudent(user.institution_id, input, user.sub);
  return c.json({ id }, 201);
});

students.put('/:id', requireRole('admin', 'super_admin'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const input = await c.req.json();
  const repo = new StudentRepository(c.env.DB);
  const service = new StudentService(repo);
  
  const existing = await service.getStudent(id);
  if (!existing || existing.institution_id !== user.institution_id) {
    return c.json({ error: 'Student not found' }, 404);
  }
  
  await service.updateStudent(id, input, user.sub);
  return c.json({ success: true });
});

students.delete('/:id', requireRole('admin', 'super_admin'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const repo = new StudentRepository(c.env.DB);
  const service = new StudentService(repo);
  
  const existing = await service.getStudent(id);
  if (!existing || existing.institution_id !== user.institution_id) {
    return c.json({ error: 'Student not found' }, 404);
  }
  
  await service.deleteStudent(id, user.sub);
  return c.json({ success: true });
});

export default students;
