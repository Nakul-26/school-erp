import { Hono } from 'hono';
import type { Env, JwtPayload } from '../types';
import { authMiddleware, requireRole } from '../middleware/auth';

const attendance = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();
attendance.use('*', authMiddleware);

// Get attendance for a section/subject on a specific date
attendance.get('/', async (c) => {
  const user = c.get('user');
  const sectionId = c.req.query('section_id');
  const subjectId = c.req.query('subject_id');
  const date = c.req.query('date') || new Date().toISOString().split('T')[0];

  if (!sectionId) return c.json({ error: 'section_id required' }, 400);

  // Fetch student list for the section
  const { results: students } = await c.env.DB
    .prepare('SELECT s.id, u.name, s.roll_number FROM students s JOIN users u ON s.user_id = u.id WHERE s.section_id = ? AND s.college_id = ?')
    .bind(sectionId, user.college_id)
    .all();

  // Fetch existing attendance records
  let query = 'SELECT student_id, status FROM attendance WHERE section_id = ? AND date = ? AND college_id = ?';
  const params: (string | number)[] = [sectionId, date, user.college_id];

  if (subjectId) {
    query += ' AND subject_id = ?';
    params.push(subjectId);
  } else {
    query += ' AND subject_id IS NULL';
  }

  const { results: records } = await c.env.DB.prepare(query).bind(...params).all();

  // Map records for easy lookup
  const attendanceMap = new Map(records.map((r: any) => [r.student_id, r.status]));

  const data = students.map((s: any) => ({
    ...s,
    status: attendanceMap.get(s.id) || null
  }));

  return c.json({ date, students: data });
});

// Bulk mark attendance
attendance.post('/bulk', requireRole('admin', 'teacher'), async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{
    section_id: number;
    subject_id?: number;
    date: string;
    records: { student_id: number; status: 'present' | 'absent' | 'late' | 'excused' }[];
  }>();

  if (!body.section_id || !body.date || !body.records) {
    return c.json({ error: 'Missing fields' }, 400);
  }

  const db = c.env.DB;
  const stmts = body.records.map(r => {
    return db.prepare(`
      INSERT INTO attendance (college_id, student_id, section_id, subject_id, date, status, marked_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(student_id, subject_id, date) DO UPDATE SET
        status = excluded.status,
        marked_by = excluded.marked_by
    `).bind(
      user.college_id,
      r.student_id,
      body.section_id,
      body.subject_id ?? null,
      body.date,
      r.status,
      user.sub
    );
  });

  await db.batch(stmts);

  return c.json({ success: true });
});

// Get attendance report for a student
attendance.get('/student/:id', async (c) => {
  const user = c.get('user');
  const studentId = c.req.param('id');

  // Access control
  if (user.role === 'student') {
    const student = await c.env.DB.prepare('SELECT id FROM students WHERE user_id = ?').bind(user.sub).first<{ id: number }>();
    if (!student || student.id !== parseInt(studentId)) return c.json({ error: 'Forbidden' }, 403);
  }

  const { results } = await c.env.DB
    .prepare(`
      SELECT a.date, a.status, s.name as subject_name, a.subject_id
      FROM attendance a
      LEFT JOIN subjects s ON a.subject_id = s.id
      WHERE a.student_id = ? AND a.college_id = ?
      ORDER BY a.date DESC
    `)
    .bind(studentId, user.college_id)
    .all();

  return c.json({ records: results });
});

export default attendance;
