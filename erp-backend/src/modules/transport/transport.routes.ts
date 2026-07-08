import { Hono } from 'hono';
import { authMiddleware } from '../../middleware/auth';
import type { Env } from '../../types';

const transport = new Hono<{ Bindings: Env }>();

// Helper to ensure tables exist
async function ensureTransportTables(db: D1Database) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS transport_routes (
      id TEXT PRIMARY KEY,
      institution_id TEXT NOT NULL,
      route_name TEXT NOT NULL,
      start_location TEXT,
      end_location TEXT,
      vehicle_number TEXT,
      driver_name TEXT,
      driver_phone TEXT,
      monthly_charge REAL NOT NULL DEFAULT 0.0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `).run();

  await db.prepare(`
    CREATE TABLE IF NOT EXISTS transport_allocations (
      id TEXT PRIMARY KEY,
      institution_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      route_id TEXT NOT NULL REFERENCES transport_routes(id),
      pickup_point TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(student_id)
    )
  `).run();
}

// 1. Get all routes
transport.get('/routes', authMiddleware, async (c) => {
  const user = c.get('user');
  await ensureTransportTables(c.env.DB);
  
  const { results } = await c.env.DB.prepare(`
    SELECT * FROM transport_routes 
    WHERE institution_id = ? AND is_active = 1 
    ORDER BY route_name ASC
  `).bind(user.institution_id).all();

  return c.json(results);
});

// 2. Create route
transport.post('/routes', authMiddleware, async (c) => {
  const user = c.get('user');
  await ensureTransportTables(c.env.DB);
  const body = await c.req.json();

  if (!body.route_name || body.monthly_charge === undefined) {
    return c.json({ error: 'Route name and monthly charge are required' }, 400);
  }

  const id = crypto.randomUUID();
  await c.env.DB.prepare(`
    INSERT INTO transport_routes (id, institution_id, route_name, start_location, end_location, vehicle_number, driver_name, driver_phone, monthly_charge)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    user.institution_id,
    body.route_name,
    body.start_location || '',
    body.end_location || '',
    body.vehicle_number || '',
    body.driver_name || '',
    body.driver_phone || '',
    Number(body.monthly_charge) || 0.0
  ).run();

  return c.json({ success: true, id }, 201);
});

// 3. Edit route
transport.put('/routes/:id', authMiddleware, async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  await ensureTransportTables(c.env.DB);
  const body = await c.req.json();

  await c.env.DB.prepare(`
    UPDATE transport_routes 
    SET route_name = ?, start_location = ?, end_location = ?, vehicle_number = ?, driver_name = ?, driver_phone = ?, monthly_charge = ?
    WHERE id = ? AND institution_id = ?
  `).bind(
    body.route_name,
    body.start_location || '',
    body.end_location || '',
    body.vehicle_number || '',
    body.driver_name || '',
    body.driver_phone || '',
    Number(body.monthly_charge) || 0.0,
    id,
    user.institution_id
  ).run();

  return c.json({ success: true });
});

// 4. Delete route (Soft delete)
transport.delete('/routes/:id', authMiddleware, async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  await ensureTransportTables(c.env.DB);

  await c.env.DB.prepare(`
    UPDATE transport_routes SET is_active = 0 WHERE id = ? AND institution_id = ?
  `).bind(id, user.institution_id).run();

  return c.json({ success: true });
});

// 5. Get all transport allocations
transport.get('/allocations', authMiddleware, async (c) => {
  const user = c.get('user');
  await ensureTransportTables(c.env.DB);

  const { results } = await c.env.DB.prepare(`
    SELECT ta.*, tr.route_name, tr.vehicle_number, tr.monthly_charge,
           s.first_name || ' ' || s.last_name as student_name, s.admission_number,
           c.name as course_name, se.name as section_name
    FROM transport_allocations ta
    JOIN transport_routes tr ON ta.route_id = tr.id
    JOIN students s ON ta.student_id = s.id
    LEFT JOIN student_enrollments sen ON s.id = sen.student_id AND sen.is_active = 1
    LEFT JOIN courses c ON sen.course_id = c.id
    LEFT JOIN sections se ON sen.section_id = se.id
    WHERE ta.institution_id = ? AND ta.is_active = 1
    ORDER BY tr.route_name ASC, s.first_name ASC
  `).bind(user.institution_id).all();

  return c.json(results);
});

// 6. Assign student to route
transport.post('/allocations', authMiddleware, async (c) => {
  const user = c.get('user');
  await ensureTransportTables(c.env.DB);
  const body = await c.req.json();

  if (!body.student_id || !body.route_id) {
    return c.json({ error: 'Student ID and Route ID are required' }, 400);
  }

  // Check if student already allocated
  const existing = await c.env.DB.prepare(`
    SELECT id FROM transport_allocations WHERE student_id = ? AND is_active = 1
  `).bind(body.student_id).first();

  if (existing) {
    // Update existing route assignment
    await c.env.DB.prepare(`
      UPDATE transport_allocations 
      SET route_id = ?, pickup_point = ?
      WHERE student_id = ? AND institution_id = ?
    `).bind(body.route_id, body.pickup_point || '', body.student_id, user.institution_id).run();
  } else {
    // Insert new assignment
    const id = crypto.randomUUID();
    await c.env.DB.prepare(`
      INSERT INTO transport_allocations (id, institution_id, student_id, route_id, pickup_point)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      id,
      user.institution_id,
      body.student_id,
      body.route_id,
      body.pickup_point || ''
    ).run();
  }

  return c.json({ success: true });
});

// 7. Remove student from route (soft delete)
transport.delete('/allocations/:studentId', authMiddleware, async (c) => {
  const user = c.get('user');
  const studentId = c.req.param('studentId');
  await ensureTransportTables(c.env.DB);

  await c.env.DB.prepare(`
    UPDATE transport_allocations SET is_active = 0 
    WHERE student_id = ? AND institution_id = ?
  `).bind(studentId, user.institution_id).run();

  return c.json({ success: true });
});

// 8. Generate monthly billing in student_fee_records
transport.post('/billing/generate', authMiddleware, async (c) => {
  const user = c.get('user');
  await ensureTransportTables(c.env.DB);
  const { due_date, billing_month_name } = await c.req.json(); // e.g. "July 2026", "2026-07-31"

  if (!due_date || !billing_month_name) {
    return c.json({ error: 'Due Date and Billing Month Name are required' }, 400);
  }

  // Fetch all active transport assignments
  const { results: allocations } = await c.env.DB.prepare(`
    SELECT ta.student_id, tr.monthly_charge, tr.route_name,
           sen.academic_year_id, sen.course_id, sen.semester
    FROM transport_allocations ta
    JOIN transport_routes tr ON ta.route_id = tr.id
    JOIN student_enrollments sen ON ta.student_id = sen.student_id AND sen.is_active = 1
    WHERE ta.institution_id = ? AND ta.is_active = 1
  `).bind(user.institution_id).all<{
    student_id: string;
    monthly_charge: number;
    route_name: string;
    academic_year_id: string;
    course_id: string;
    semester: number;
  }>();

  if (!allocations || allocations.length === 0) {
    return c.json({ message: 'No students currently allocated to any transport route.' });
  }

  let successCount = 0;
  let skipCount = 0;

  for (const alloc of allocations) {
    const feeTypeName = `Transport Fee - ${billing_month_name}`;
    const id = crypto.randomUUID();

    try {
      // Check if student already billed for this month's transport fee
      const alreadyBilled = await c.env.DB.prepare(`
        SELECT id FROM student_fee_records 
        WHERE student_id = ? AND fee_type = ? AND is_active = 1
      `).bind(alloc.student_id, feeTypeName).first();

      if (alreadyBilled) {
        skipCount++;
        continue;
      }

      await c.env.DB.prepare(`
        INSERT INTO student_fee_records (
          id, institution_id, student_id, academic_year_id, course_id, 
          year_number, fee_type, total_amount, paid_amount, due_date, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0.0, ?, 'UNPAID')
      `).bind(
        id,
        user.institution_id,
        alloc.student_id,
        alloc.academic_year_id,
        alloc.course_id,
        alloc.semester, // semester maps to year_number / academic term
        feeTypeName,
        alloc.monthly_charge,
        due_date
      ).run();

      successCount++;
    } catch (err) {
      console.error(`Failed to bill student ${alloc.student_id} for transport:`, err);
    }
  }

  return c.json({
    success: true,
    message: `Generated monthly billing successfully. Billed: ${successCount} students. Skipped (already billed): ${skipCount} students.`
  });
});

export default transport;
