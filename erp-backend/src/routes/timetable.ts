import { Hono } from 'hono';
import type { Env, JwtPayload } from '../types';
import { authMiddleware, requireRole } from '../middleware/auth';

const timetable = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();
timetable.use('*', authMiddleware);

// Get timetable for a section
timetable.get('/section/:id', async (c) => {
  const user = c.get('user');
  const sectionId = c.req.param('id');

  const { results } = await c.env.DB
    .prepare(`
      SELECT ts.*, s.name as subject_name, s.code as subject_code, t.employee_code, u.name as teacher_name
      FROM timetable_slots ts
      JOIN subjects s ON ts.subject_id = s.id
      LEFT JOIN teachers t ON ts.teacher_id = t.id
      LEFT JOIN users u ON t.user_id = u.id
      WHERE ts.section_id = ? AND ts.college_id = ?
      ORDER BY ts.day_of_week, ts.start_time
    `)
    .bind(sectionId, user.college_id)
    .all();

  return c.json({ timetable: results });
});

// Create timetable slot
timetable.post('/', requireRole('admin'), async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{
    section_id: number;
    subject_id: number;
    teacher_id?: number;
    day_of_week: number;
    start_time: string;
    end_time: string;
    room?: string;
  }>();

  if (!body.section_id || !body.subject_id || !body.day_of_week || !body.start_time || !body.end_time) {
    return c.json({ error: 'Missing fields' }, 400);
  }

  const result = await c.env.DB
    .prepare(`
      INSERT INTO timetable_slots (college_id, section_id, subject_id, teacher_id, day_of_week, start_time, end_time, room)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .bind(
      user.college_id,
      body.section_id,
      body.subject_id,
      body.teacher_id ?? null,
      body.day_of_week,
      body.start_time,
      body.end_time,
      body.room ?? null
    )
    .run();

  return c.json({ id: result.meta.last_row_id, ...body }, 201);
});

// Delete timetable slot
timetable.delete('/:id', requireRole('admin'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');

  await c.env.DB
    .prepare('DELETE FROM timetable_slots WHERE id = ? AND college_id = ?')
    .bind(id, user.college_id)
    .run();

  return c.json({ success: true });
});

export default timetable;
