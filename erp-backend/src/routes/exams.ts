import { Hono } from 'hono';
import type { Env, JwtPayload } from '../types';
import { authMiddleware, requireRole } from '../middleware/auth';

const exams = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();
exams.use('*', authMiddleware);

// List exams for a course
exams.get('/', async (c) => {
  const user = c.get('user');
  const courseId = c.req.query('course_id');

  let query = 'SELECT * FROM exams WHERE college_id = ?';
  const params: (string | number)[] = [user.college_id];

  if (courseId) {
    query += ' AND course_id = ?';
    params.push(courseId);
  }

  const { results } = await c.env.DB.prepare(query).bind(...params).all();
  return c.json({ exams: results });
});

// Create exam
exams.post('/', requireRole('admin'), async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{
    course_id: number;
    name: string;
    academic_year: string;
    semester?: number;
  }>();

  if (!body.course_id || !body.name || !body.academic_year) {
    return c.json({ error: 'Missing fields' }, 400);
  }

  const result = await c.env.DB
    .prepare('INSERT INTO exams (college_id, course_id, name, academic_year, semester) VALUES (?, ?, ?, ?, ?)')
    .bind(user.college_id, body.course_id, body.name, body.academic_year, body.semester ?? null)
    .run();

  return c.json({ id: result.meta.last_row_id, ...body }, 201);
});

// Bulk enter marks
exams.post('/:id/marks', requireRole('admin', 'teacher'), async (c) => {
  const user = c.get('user');
  const examId = c.req.param('id');
  const body = await c.req.json<{
    subject_id: number;
    records: { student_id: number; marks_obtained: number; max_marks: number; grade?: string }[];
  }>();

  if (!body.subject_id || !body.records) {
    return c.json({ error: 'Missing fields' }, 400);
  }

  const db = c.env.DB;
  const stmts = body.records.map(r => {
    return db.prepare(`
      INSERT INTO exam_marks (college_id, exam_id, student_id, subject_id, marks_obtained, max_marks, grade, entered_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(exam_id, student_id, subject_id) DO UPDATE SET
        marks_obtained = excluded.marks_obtained,
        max_marks = excluded.max_marks,
        grade = excluded.grade,
        entered_by = excluded.entered_by
    `).bind(
      user.college_id,
      examId,
      r.student_id,
      body.subject_id,
      r.marks_obtained,
      r.max_marks,
      r.grade ?? null,
      user.sub
    );
  });

  await db.batch(stmts);

  return c.json({ success: true });
});

// Get marks for an exam
exams.get('/:id/marks', async (c) => {
  const user = c.get('user');
  const examId = c.req.param('id');
  const subjectId = c.req.query('subject_id');

  let query = `
    SELECT em.*, u.name as student_name, s.roll_number
    FROM exam_marks em
    JOIN students s ON em.student_id = s.id
    JOIN users u ON s.user_id = u.id
    WHERE em.exam_id = ? AND em.college_id = ?
  `;
  const params: (string | number)[] = [examId, user.college_id];

  if (subjectId) {
    query += ' AND em.subject_id = ?';
    params.push(subjectId);
  }

  const { results } = await c.env.DB.prepare(query).bind(...params).all();
  return c.json({ marks: results });
});

export default exams;
