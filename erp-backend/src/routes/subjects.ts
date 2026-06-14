import { Hono } from 'hono';
import type { Env, JwtPayload } from '../types';
import { authMiddleware, requireRole } from '../middleware/auth';

const subjects = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();
subjects.use('*', authMiddleware);

subjects.get('/', async (c) => {
  const user = c.get('user');
  const courseId = c.req.query('course_id');

  let query = 'SELECT * FROM subjects WHERE college_id = ?';
  const params: (string | number)[] = [user.college_id];

  if (courseId) {
    query += ' AND course_id = ?';
    params.push(courseId);
  }

  const { results } = await c.env.DB.prepare(query).bind(...params).all();
  return c.json({ subjects: results });
});

subjects.post('/', requireRole('admin'), async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{ name: string; code: string; course_id: number; semester?: number }>();
  
  if (!body.name || !body.course_id) {
    return c.json({ error: 'Name and course_id required' }, 400);
  }

  const result = await c.env.DB
    .prepare('INSERT INTO subjects (college_id, course_id, name, code, semester) VALUES (?, ?, ?, ?, ?)')
    .bind(user.college_id, body.course_id, body.name, body.code ?? null, body.semester ?? null)
    .run();

  return c.json({ id: result.meta.last_row_id, ...body }, 201);
});

export default subjects;
