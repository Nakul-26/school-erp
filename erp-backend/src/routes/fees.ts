import { Hono } from 'hono';
import type { Env, JwtPayload } from '../types';
import { authMiddleware, requireRole } from '../middleware/auth';

const fees = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();
fees.use('*', authMiddleware);

// ---------------- Fee Structures ----------------

fees.get('/structures', async (c) => {
  const user = c.get('user');
  const courseId = c.req.query('course_id');

  let query = 'SELECT * FROM fee_structures WHERE college_id = ?';
  const params: (string | number)[] = [user.college_id];

  if (courseId) {
    query += ' AND course_id = ?';
    params.push(courseId);
  }

  const { results } = await c.env.DB.prepare(query).bind(...params).all();
  return c.json({ structures: results });
});

fees.post('/structures', requireRole('admin'), async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{
    course_id: number;
    academic_year: string;
    fee_type: string;
    amount: number;
    due_date?: string;
  }>();

  if (!body.course_id || !body.academic_year || !body.fee_type || !body.amount) {
    return c.json({ error: 'Missing fields' }, 400);
  }

  const result = await c.env.DB
    .prepare('INSERT INTO fee_structures (college_id, course_id, academic_year, fee_type, amount, due_date) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(user.college_id, body.course_id, body.academic_year, body.fee_type, body.amount, body.due_date ?? null)
    .run();

  return c.json({ id: result.meta.last_row_id, ...body }, 201);
});

// ---------------- Fee Records (Students) ----------------

// Generate records for a course/year (admin only)
fees.post('/generate-records', requireRole('admin'), async (c) => {
  const user = c.get('user');
  const { structure_id, section_id } = await c.req.json<{ structure_id: number; section_id: number }>();

  if (!structure_id || !section_id) return c.json({ error: 'structure_id and section_id required' }, 400);

  const db = c.env.DB;

  // Get structure details
  const structure = await db.prepare('SELECT amount, due_date FROM fee_structures WHERE id = ? AND college_id = ?').bind(structure_id, user.college_id).first<{ amount: number; due_date: string | null }>();
  if (!structure) return c.json({ error: 'Structure not found' }, 404);

  // Get students in section
  const { results: students } = await db.prepare('SELECT id FROM students WHERE section_id = ? AND college_id = ?').bind(section_id, user.college_id).all();

  const stmts = students.map(s => {
    return db.prepare(`
      INSERT INTO fee_records (college_id, student_id, fee_structure_id, amount_due, due_date)
      VALUES (?, ?, ?, ?, ?)
    `).bind(user.college_id, s.id, structure_id, structure.amount, structure.due_date);
  });

  await db.batch(stmts);

  return c.json({ success: true, count: students.length });
});

fees.get('/records', async (c) => {
  const user = c.get('user');
  const studentId = c.req.query('student_id');

  let query = `
    SELECT fr.*, fs.fee_type, fs.academic_year, u.name as student_name, s.roll_number
    FROM fee_records fr
    JOIN fee_structures fs ON fr.fee_structure_id = fs.id
    JOIN students s ON fr.student_id = s.id
    JOIN users u ON s.user_id = u.id
    WHERE fr.college_id = ?
  `;
  const params: (string | number)[] = [user.college_id];

  if (studentId) {
    query += ' AND fr.student_id = ?';
    params.push(studentId);
  }

  const { results } = await c.env.DB.prepare(query).bind(...params).all();
  return c.json({ records: results });
});

// ---------------- Payments ----------------

fees.post('/pay', requireRole('admin'), async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{
    fee_record_id: number;
    amount: number;
    payment_date: string;
    payment_mode?: string;
    reference_number?: string;
    remarks?: string;
  }>();

  if (!body.fee_record_id || !body.amount || !body.payment_date) {
    return c.json({ error: 'Missing fields' }, 400);
  }

  const db = c.env.DB;

  // Get current record
  const record = await db.prepare('SELECT amount_due, amount_paid FROM fee_records WHERE id = ? AND college_id = ?').bind(body.fee_record_id, user.college_id).first<{ amount_due: number; amount_paid: number }>();
  if (!record) return c.json({ error: 'Record not found' }, 404);

  const receiptNumber = `REC-${Date.now()}`;

  // 1. Insert payment
  const paymentResult = await db.prepare(`
    INSERT INTO fee_payments (college_id, fee_record_id, amount, payment_date, payment_mode, reference_number, recorded_by, receipt_number)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    user.college_id,
    body.fee_record_id,
    body.amount,
    body.payment_date,
    body.payment_mode ?? 'Cash',
    body.reference_number ?? null,
    user.sub,
    receiptNumber
  ).run();

  // 2. Update record
  const newPaid = record.amount_paid + body.amount;
  const newStatus = newPaid >= record.amount_due ? 'paid' : (newPaid > 0 ? 'partial' : 'pending');

  await db.prepare('UPDATE fee_records SET amount_paid = ?, status = ? WHERE id = ?').bind(newPaid, newStatus, body.fee_record_id).run();

  return c.json({
    id: paymentResult.meta.last_row_id,
    receipt_number: receiptNumber,
    new_status: newStatus,
    new_paid: newPaid
  }, 201);
});

// Get my fee records (student)
fees.get('/my', async (c) => {
  const user = c.get('user');
  if (user.role !== 'student') return c.json({ error: 'Only students' }, 403);

  const db = c.env.DB;
  const student = await db.prepare('SELECT id FROM students WHERE user_id = ?').bind(user.sub).first<{ id: number }>();
  if (!student) return c.json({ records: [] });

  const { results } = await db.prepare(`
    SELECT fr.*, fs.fee_type, fs.academic_year
    FROM fee_records fr
    JOIN fee_structures fs ON fr.fee_structure_id = fs.id
    WHERE fr.student_id = ? AND fr.college_id = ?
  `).bind(student.id, user.college_id).all();

  return c.json({ records: results });
});

// Get payment receipt data
fees.get('/payments/:id', async (c) => {
  const user = c.get('user');
  const paymentId = c.req.param('id');

  const payment = await c.env.DB.prepare(`
    SELECT 
      fp.*, 
      fr.amount_due, 
      fs.fee_type, 
      fs.academic_year,
      u.name as student_name,
      s.roll_number,
      c.name as college_name,
      c.address as college_address
    FROM fee_payments fp
    JOIN fee_records fr ON fp.fee_record_id = fr.id
    JOIN fee_structures fs ON fr.fee_structure_id = fs.id
    JOIN students s ON fr.student_id = s.id
    JOIN users u ON s.user_id = u.id
    JOIN colleges c ON fp.college_id = c.id
    WHERE fp.id = ? AND fp.college_id = ?
  `).bind(paymentId, user.college_id).first();

  if (!payment) return c.json({ error: 'Payment not found' }, 404);

  return c.json({ payment });
});

export default fees;
