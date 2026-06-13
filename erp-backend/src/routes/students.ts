import { Hono } from 'hono';
import type { Env, JwtPayload } from '../types';
import { hashPassword } from '../utils/password';
import { authMiddleware, requireRole } from '../middleware/auth';

const students = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();
students.use('*', authMiddleware);

// ---------------- Courses ----------------

students.post('/courses', requireRole('admin'), async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{ name: string; duration_years: number }>();
  if (!body.name || !body.duration_years) return c.json({ error: 'Missing fields' }, 400);

  const result = await c.env.DB
    .prepare('INSERT INTO courses (college_id, name, duration_years) VALUES (?, ?, ?)')
    .bind(user.college_id, body.name, body.duration_years)
    .run();

  return c.json({ id: result.meta.last_row_id, name: body.name, duration_years: body.duration_years }, 201);
});

students.get('/courses', async (c) => {
  const user = c.get('user');
  const { results } = await c.env.DB
    .prepare('SELECT * FROM courses WHERE college_id = ?')
    .bind(user.college_id)
    .all();
  return c.json({ courses: results });
});

// ---------------- Sections ----------------

students.post('/sections', requireRole('admin'), async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{ course_id: number; name: string; year: number; academic_year: string }>();
  if (!body.course_id || !body.name || !body.year || !body.academic_year) {
    return c.json({ error: 'Missing fields' }, 400);
  }

  const result = await c.env.DB
    .prepare('INSERT INTO sections (college_id, course_id, name, year, academic_year) VALUES (?, ?, ?, ?, ?)')
    .bind(user.college_id, body.course_id, body.name, body.year, body.academic_year)
    .run();

  return c.json({ id: result.meta.last_row_id, ...body }, 201);
});

students.get('/sections', async (c) => {
  const user = c.get('user');
  const courseId = c.req.query('course_id');

  let query = 'SELECT s.*, c.name as course_name FROM sections s JOIN courses c ON s.course_id = c.id WHERE s.college_id = ?';
  const params: (string | number)[] = [user.college_id];

  if (courseId) {
    query += ' AND s.course_id = ?';
    params.push(courseId);
  }

  const { results } = await c.env.DB.prepare(query).bind(...params).all();
  return c.json({ sections: results });
});

// ---------------- Students ----------------

// Create student (creates a 'users' record with role=student + 'students' profile)
students.post('/', requireRole('admin'), async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{
    name: string;
    email: string;
    password: string;
    phone?: string;
    section_id?: number;
    roll_number: string;
    admission_number?: string;
    date_of_birth?: string;
    gender?: string;
    address?: string;
    guardian_name?: string;
    guardian_phone?: string;
    admission_date?: string;
  }>();

  if (!body.name || !body.email || !body.password || !body.roll_number) {
    return c.json({ error: 'Missing required fields (name, email, password, roll_number)' }, 400);
  }

  const db = c.env.DB;

  const existingEmail = await db.prepare('SELECT id FROM users WHERE email = ?').bind(body.email).first();
  if (existingEmail) return c.json({ error: 'Email already in use' }, 409);

  const existingRoll = await db
    .prepare('SELECT id FROM students WHERE college_id = ? AND roll_number = ?')
    .bind(user.college_id, body.roll_number)
    .first();
  if (existingRoll) return c.json({ error: 'Roll number already exists' }, 409);

  const passwordHash = await hashPassword(body.password);

  const userResult = await db
    .prepare('INSERT INTO users (college_id, role, name, email, phone, password_hash) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(user.college_id, 'student', body.name, body.email, body.phone ?? null, passwordHash)
    .run();

  const newUserId = userResult.meta.last_row_id as number;

  const studentResult = await db
    .prepare(`INSERT INTO students 
      (user_id, college_id, section_id, roll_number, admission_number, date_of_birth, gender, address, guardian_name, guardian_phone, admission_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(
      newUserId,
      user.college_id,
      body.section_id ?? null,
      body.roll_number,
      body.admission_number ?? null,
      body.date_of_birth ?? null,
      body.gender ?? null,
      body.address ?? null,
      body.guardian_name ?? null,
      body.guardian_phone ?? null,
      body.admission_date ?? null
    )
    .run();

  return c.json({
    student_id: studentResult.meta.last_row_id,
    user_id: newUserId,
    name: body.name,
    email: body.email,
    roll_number: body.roll_number,
  }, 201);
});

// List students (with optional section filter)
students.get('/', requireRole('admin', 'teacher'), async (c) => {
  const user = c.get('user');
  const sectionId = c.req.query('section_id');
  const search = c.req.query('search');

  let query = `
    SELECT st.id as student_id, st.roll_number, st.admission_number, st.status,
           u.id as user_id, u.name, u.email, u.phone,
           sec.name as section_name, sec.year, sec.academic_year,
           co.name as course_name
    FROM students st
    JOIN users u ON st.user_id = u.id
    LEFT JOIN sections sec ON st.section_id = sec.id
    LEFT JOIN courses co ON sec.course_id = co.id
    WHERE st.college_id = ?
  `;
  const params: (string | number)[] = [user.college_id];

  if (sectionId) {
    query += ' AND st.section_id = ?';
    params.push(sectionId);
  }
  if (search) {
    query += ' AND (u.name LIKE ? OR st.roll_number LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  query += ' ORDER BY st.roll_number';

  const { results } = await c.env.DB.prepare(query).bind(...params).all();
  return c.json({ students: results });
});

// Get single student (admin/teacher: any student in college; student: only self; parent: only their child)
students.get('/:id', async (c) => {
  const user = c.get('user');
  const studentId = c.req.param('id');

  const student = await c.env.DB
    .prepare(`
      SELECT st.*, u.name, u.email, u.phone,
             sec.name as section_name, sec.year, sec.academic_year,
             co.name as course_name, co.id as course_id
      FROM students st
      JOIN users u ON st.user_id = u.id
      LEFT JOIN sections sec ON st.section_id = sec.id
      LEFT JOIN courses co ON sec.course_id = co.id
      WHERE st.id = ? AND st.college_id = ?
    `)
    .bind(studentId, user.college_id)
    .first<{ user_id: number; parent_user_id: number | null }>();

  if (!student) return c.json({ error: 'Student not found' }, 404);

  // Access control for non-admin/teacher
  if (user.role === 'student' && student.user_id !== user.sub) {
    return c.json({ error: 'Forbidden' }, 403);
  }
  if (user.role === 'parent' && student.parent_user_id !== user.sub) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  return c.json({ student });
});

// Update student profile (admin only)
students.put('/:id', requireRole('admin'), async (c) => {
  const user = c.get('user');
  const studentId = c.req.param('id');
  const body = await c.req.json<{
    section_id?: number;
    roll_number?: string;
    admission_number?: string;
    date_of_birth?: string;
    gender?: string;
    address?: string;
    guardian_name?: string;
    guardian_phone?: string;
    status?: 'active' | 'inactive' | 'graduated';
    parent_user_id?: number;
  }>();

  const existing = await c.env.DB
    .prepare('SELECT id FROM students WHERE id = ? AND college_id = ?')
    .bind(studentId, user.college_id)
    .first();
  if (!existing) return c.json({ error: 'Student not found' }, 404);

  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  for (const [key, val] of Object.entries(body)) {
    fields.push(`${key} = ?`);
    values.push(val ?? null);
  }

  if (fields.length === 0) return c.json({ error: 'No fields to update' }, 400);

  values.push(studentId);
  await c.env.DB.prepare(`UPDATE students SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();

  return c.json({ success: true });
});

// Deactivate student (soft delete)
students.delete('/:id', requireRole('admin'), async (c) => {
  const user = c.get('user');
  const studentId = c.req.param('id');

  const existing = await c.env.DB
    .prepare('SELECT id FROM students WHERE id = ? AND college_id = ?')
    .bind(studentId, user.college_id)
    .first();
  if (!existing) return c.json({ error: 'Student not found' }, 404);

  await c.env.DB.prepare("UPDATE students SET status = 'inactive' WHERE id = ?").bind(studentId).run();
  return c.json({ success: true });
});

export default students;
