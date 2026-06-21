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
  
  const userRoles = user.roles || (user.role ? [user.role] : []);
  const isStudent = userRoles.some(r => ['student', 'Student'].includes(r));
  const isParent = userRoles.some(r => ['parent', 'Parent', 'guardian', 'Guardian'].includes(r));

  if (isStudent) {
    // Return only their own student record
    const { results } = await c.env.DB.prepare('SELECT * FROM students WHERE user_id = ? AND institution_id = ? AND is_active = 1').bind(user.sub, user.institution_id).all();
    return c.json(results || []);
  }

  if (isParent) {
    // Return only their children
    const { results } = await c.env.DB.prepare(`
      SELECT s.* FROM students s
      JOIN guardians g ON g.student_id = s.id
      WHERE g.user_id = ? AND s.institution_id = ? AND s.is_active = 1 AND g.is_active = 1
    `).bind(user.sub, user.institution_id).all();
    return c.json(results || []);
  }

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

  const userRoles = user.roles || (user.role ? [user.role] : []);
  const isStudent = userRoles.some(r => ['student', 'Student'].includes(r));
  const isParent = userRoles.some(r => ['parent', 'Parent', 'guardian', 'Guardian'].includes(r));
  const isAdminOrStaff = userRoles.some(r => ['super_admin', 'Super Admin', 'admin', 'Principal', 'HOD', 'Teacher'].includes(r));

  if (isStudent && result.user_id !== user.sub) {
    return c.json({ error: 'Forbidden: You cannot access other student profiles' }, 403);
  }

  if (isParent) {
    const isChild = await c.env.DB.prepare(
      'SELECT 1 FROM guardians WHERE user_id = ? AND student_id = ? AND is_active = 1'
    ).bind(user.sub, id).first();
    if (!isChild && !isAdminOrStaff) {
      return c.json({ error: 'Forbidden: You cannot access profiles of students who are not your children' }, 403);
    }
  }

  if (!isStudent && !isParent && !isAdminOrStaff) {
    return c.json({ error: 'Forbidden' }, 403);
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
