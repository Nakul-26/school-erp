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
      stops TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `).run();

  try {
    await db.prepare(`ALTER TABLE transport_routes ADD COLUMN stops TEXT`).run();
  } catch (err) {
    // Ignore error if column already exists
  }

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
    INSERT INTO transport_routes (id, institution_id, route_name, start_location, end_location, vehicle_number, driver_name, driver_phone, monthly_charge, stops)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    user.institution_id,
    body.route_name,
    body.start_location || '',
    body.end_location || '',
    body.vehicle_number || '',
    body.driver_name || '',
    body.driver_phone || '',
    Number(body.monthly_charge) || 0.0,
    body.stops || ''
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
    SET route_name = ?, start_location = ?, end_location = ?, vehicle_number = ?, driver_name = ?, driver_phone = ?, monthly_charge = ?, stops = ?
    WHERE id = ? AND institution_id = ?
  `).bind(
    body.route_name,
    body.start_location || '',
    body.end_location || '',
    body.vehicle_number || '',
    body.driver_name || '',
    body.driver_phone || '',
    Number(body.monthly_charge) || 0.0,
    body.stops || '',
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

// 4.5 Send alert notification to all users allocated to route
transport.post('/routes/:id/notify', authMiddleware, async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const { message, priority } = await c.req.json();

  if (!message) {
    return c.json({ error: 'Message is required' }, 400);
  }

  await ensureTransportTables(c.env.DB);

  // 1. Fetch route info
  const route = await c.env.DB.prepare(`
    SELECT route_name FROM transport_routes WHERE id = ? AND institution_id = ? AND is_active = 1
  `).bind(id, user.institution_id).first<{ route_name: string }>();

  if (!route) {
    return c.json({ error: 'Route not found' }, 404);
  }

  // 2. Find students allocated to this route + their parent users
  const allocations = await c.env.DB.prepare(`
    SELECT DISTINCT 
      s.user_id as student_user_id,
      g.user_id as guardian_user_id,
      g.name as guardian_name,
      COALESCE(g.email, u.email, '') as guardian_email,
      COALESCE(g.phone, u.phone, '') as guardian_phone
    FROM transport_allocations ta
    JOIN students s ON ta.student_id = s.id
    LEFT JOIN guardians g ON s.id = g.student_id AND g.is_active = 1
    LEFT JOIN users u ON g.user_id = u.id
    WHERE ta.route_id = ? AND ta.is_active = 1 AND ta.institution_id = ? AND s.is_active = 1
  `).bind(id, user.institution_id).all<{ student_user_id: string | null; guardian_user_id: string | null; guardian_name: string | null; guardian_email: string | null; guardian_phone: string | null }>();

  if (!allocations.results || allocations.results.length === 0) {
    return c.json({ message: 'No students allocated to this route to notify.' });
  }

  const userIdsSet = new Set<string>();
  const directContacts: { id: string; name: string; email: string; phone?: string | null }[] = [];

  for (const row of allocations.results) {
    if (row.student_user_id) userIdsSet.add(row.student_user_id);
    if (row.guardian_user_id) userIdsSet.add(row.guardian_user_id);
    else if (row.guardian_email || row.guardian_phone) {
      directContacts.push({
        id: 'anonymous',
        name: row.guardian_name || 'Parent/Guardian',
        email: row.guardian_email || '',
        phone: row.guardian_phone || ''
      });
    }
  }

  const targetUserIds = Array.from(userIdsSet);
  const alertSubject = `Transport Alert: ${route.route_name}`;

  if (targetUserIds.length > 0) {
    const { BroadcastsRepository } = await import('../broadcasts/broadcasts.repository');
    const { BroadcastsService } = await import('../broadcasts/broadcasts.service');
    const broadcastsRepo = new BroadcastsRepository(c.env.DB);
    const broadcastsService = new BroadcastsService(broadcastsRepo);

    try {
      await broadcastsService.createBroadcast(
        user.institution_id,
        user.sub,
        {
          subject: alertSubject,
          body: message,
          category: 'transport',
          priority: priority || 'important',
          recipient_type: 'custom',
          recipient_filter: JSON.stringify({
            type: 'custom',
            userIds: targetUserIds
          }),
          channel: 'erp,email,sms',
          status: 'sent',
          expires_at: null,
          attachments: []
        },
        c.env
      );
    } catch (err) {
      console.error('Failed to create route broadcast:', err);
    }
  }

  if (directContacts.length > 0) {
    try {
      const { NotificationService: CentralNotifService } = await import('../broadcasts/notification.service');
      const centralNotif = new CentralNotifService();
      await centralNotif.deliver(
        c.env,
        ['email', 'sms'],
        directContacts,
        {
          subject: alertSubject,
          body: message
        }
      );
    } catch (err) {
      console.error('Failed to send direct notifications for transport route:', err);
    }
  }

  return c.json({ success: true, notified_count: targetUserIds.length + directContacts.length });
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
