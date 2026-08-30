import { Hono } from 'hono';
import { Env, JwtPayload } from '../types';
import { authMiddleware, requireRole, requirePermission } from '../middleware/auth';
import { createAuditLog } from '../utils/audit';

// Helper to generate UUIDs locally if needed
const generateUuid = () => crypto.randomUUID();

// ─── VISITOR REGISTER ────────────────────────────────────────────────────────

export const visitors = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();
visitors.use('*', authMiddleware);
// Front-desk/visitor register — staff only, same permission the seeded RBAC
// catalog already reserves for this module (never granted to student/parent/teacher).
visitors.use('*', requirePermission('visitors.manage'));

visitors.get('/', async (c) => {
  const user = c.get('user');
  const db = c.env.DB;
  
  try {
    const { results } = await db
      .prepare('SELECT * FROM visitors WHERE institution_id = ? ORDER BY created_at DESC')
      .bind(user.institution_id)
      .all();
    return c.json(results);
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

visitors.post('/', async (c) => {
  const user = c.get('user');
  const db = c.env.DB;
  const input = await c.req.json();

  if (!input.name || !input.purpose || !input.host_name || !input.phone || !input.in_time) {
    return c.json({ error: 'Missing required visitor fields' }, 400);
  }

  const id = generateUuid();
  try {
    await db
      .prepare(
        'INSERT INTO visitors (id, institution_id, name, purpose, host_name, phone, in_time, out_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      )
      .bind(id, user.institution_id, input.name, input.purpose, input.host_name, input.phone, input.in_time, input.out_time || null)
      .run();

    await createAuditLog(
      db, user.sub || null, 'CREATE_VISITOR_ENTRY', 'visitors', id,
      `Visitor check-in: ${input.name} meeting ${input.host_name}`
    );

    return c.json({ success: true, id }, 201);
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

visitors.patch('/:id/checkout', async (c) => {
  const user = c.get('user');
  const db = c.env.DB;
  const id = c.req.param('id')!;
  const input = await c.req.json();

  if (!input.out_time) {
    return c.json({ error: 'Missing checkout out_time' }, 400);
  }

  try {
    const { success } = await db
      .prepare('UPDATE visitors SET out_time = ? WHERE id = ? AND institution_id = ?')
      .bind(input.out_time, id, user.institution_id)
      .run();

    if (!success) {
      return c.json({ error: 'Visitor record not found or update failed' }, 404);
    }

    await createAuditLog(
      db, user.sub || null, 'VISITOR_CHECKOUT', 'visitors', id,
      `Visitor checkout complete for ID: ${id}`
    );

    return c.json({ success: true });
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

// ─── ASSETS & INVENTORY ──────────────────────────────────────────────────────

export const assets = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();
assets.use('*', authMiddleware);

assets.get('/', async (c) => {
  const user = c.get('user');
  const db = c.env.DB;
  
  try {
    const { results } = await db
      .prepare('SELECT * FROM assets WHERE institution_id = ? ORDER BY name ASC')
      .bind(user.institution_id)
      .all();
    return c.json(results);
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

assets.post('/', requireRole('admin', 'super_admin', 'Principal'), async (c) => {
  const user = c.get('user');
  const db = c.env.DB;
  const input = await c.req.json();

  if (!input.name || !input.category) {
    return c.json({ error: 'Missing required asset fields' }, 400);
  }

  const id = generateUuid();
  try {
    await db
      .prepare(
        'INSERT INTO assets (id, institution_id, name, category, quantity, assigned_to, room, condition, purchase_date, value) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      )
      .bind(
        id, user.institution_id, input.name, input.category, 
        input.quantity || 1, input.assigned_to || null, input.room || null, 
        input.condition || 'Good', input.purchase_date || null, input.value || null
      )
      .run();

    await createAuditLog(
      db, user.sub || null, 'CREATE_ASSET', 'assets', id,
      `Created asset: ${input.name} (Qty: ${input.quantity || 1})`
    );

    return c.json({ success: true, id }, 201);
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

assets.put('/:id', requireRole('admin', 'super_admin', 'Principal'), async (c) => {
  const user = c.get('user');
  const db = c.env.DB;
  const id = c.req.param('id')!;
  const input = await c.req.json();

  if (!input.name || !input.category) {
    return c.json({ error: 'Missing required asset fields' }, 400);
  }

  try {
    await db
      .prepare(
        'UPDATE assets SET name = ?, category = ?, quantity = ?, assigned_to = ?, room = ?, condition = ?, purchase_date = ?, value = ? WHERE id = ? AND institution_id = ?'
      )
      .bind(
        input.name, input.category, input.quantity || 1, 
        input.assigned_to || null, input.room || null, input.condition || 'Good', 
        input.purchase_date || null, input.value || null, id, user.institution_id
      )
      .run();

    await createAuditLog(
      db, user.sub || null, 'UPDATE_ASSET', 'assets', id,
      `Updated asset details for: ${input.name}`
    );

    return c.json({ success: true });
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

assets.delete('/:id', requireRole('admin', 'super_admin', 'Principal'), async (c) => {
  const user = c.get('user');
  const db = c.env.DB;
  const id = c.req.param('id')!;

  try {
    const { success } = await db
      .prepare('DELETE FROM assets WHERE id = ? AND institution_id = ?')
      .bind(id, user.institution_id)
      .run();

    if (!success) {
      return c.json({ error: 'Asset not found or delete failed' }, 404);
    }

    await createAuditLog(
      db, user.sub || null, 'DELETE_ASSET', 'assets', id,
      `Disposed/deleted asset record ID: ${id}`
    );

    return c.json({ success: true });
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

// ─── ALUMNI DATABASE ─────────────────────────────────────────────────────────

export const alumni = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();
alumni.use('*', authMiddleware);

alumni.get('/', async (c) => {
  const user = c.get('user');
  const db = c.env.DB;

  try {
    const { results } = await db
      .prepare('SELECT * FROM alumni WHERE institution_id = ? AND is_active = 1 ORDER BY graduation_year DESC, last_name ASC')
      .bind(user.institution_id)
      .all();
    return c.json(results);
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// Registered before the '/:id' route below so 'events' is never captured as an alumni id.
alumni.get('/events', async (c) => {
  const user = c.get('user');
  const db = c.env.DB;
  try {
    const { results } = await db.prepare(`
      SELECT e.*, (SELECT COUNT(*) FROM alumni_event_rsvps r WHERE r.event_id = e.id AND r.status = 'GOING') as going_count
      FROM alumni_events e
      WHERE e.institution_id = ? AND e.is_active = 1
      ORDER BY e.start_date DESC
    `).bind(user.institution_id).all();
    return c.json(results);
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

alumni.get('/:id', async (c) => {
  const user = c.get('user');
  const db = c.env.DB;
  const id = c.req.param('id');
  try {
    const row = await db.prepare('SELECT * FROM alumni WHERE id = ? AND institution_id = ? AND is_active = 1').bind(id, user.institution_id).first();
    if (!row) return c.json({ error: 'Alumnus not found' }, 404);
    return c.json(row);
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

alumni.post('/', requireRole('admin', 'super_admin', 'Principal'), async (c) => {
  const user = c.get('user');
  const db = c.env.DB;
  const input = await c.req.json();

  if (!input.first_name || !input.last_name || !input.graduation_year) {
    return c.json({ error: 'Missing required alumnus fields' }, 400);
  }

  const id = generateUuid();
  try {
    await db
      .prepare(
        'INSERT INTO alumni (id, institution_id, student_id, first_name, last_name, graduation_year, current_status, institution, contact) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
      )
      .bind(
        id, user.institution_id, input.student_id || null, input.first_name, 
        input.last_name, input.graduation_year, input.current_status || null, 
        input.institution || null, input.contact || null
      )
      .run();

    await createAuditLog(
      db, user.sub || null, 'CREATE_ALUMNI_RECORD', 'alumni', id,
      `Added alumnus record: ${input.first_name} ${input.last_name} (${input.graduation_year})`
    );

    return c.json({ success: true, id }, 201);
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

alumni.put('/:id', requireRole('admin', 'super_admin', 'Principal', 'HOD'), async (c) => {
  const user = c.get('user');
  const db = c.env.DB;
  const id = c.req.param('id');
  const input = await c.req.json();

  try {
    const existing = await db.prepare('SELECT id FROM alumni WHERE id = ? AND institution_id = ? AND is_active = 1').bind(id, user.institution_id).first();
    if (!existing) return c.json({ error: 'Alumnus not found' }, 404);

    await db.prepare(`
      UPDATE alumni SET first_name = ?, last_name = ?, graduation_year = ?, current_status = ?, institution = ?, contact = ?, updated_at = ?
      WHERE id = ? AND institution_id = ?
    `).bind(
      input.first_name, input.last_name, input.graduation_year, input.current_status || null,
      input.institution || null, input.contact || null, new Date().toISOString(), id, user.institution_id
    ).run();

    await createAuditLog(db, user.sub || null, 'UPDATE_ALUMNI_RECORD', 'alumni', id, `Updated alumnus record: ${input.first_name} ${input.last_name}`);
    return c.json({ success: true });
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

alumni.delete('/:id', requireRole('admin', 'super_admin', 'Principal'), async (c) => {
  const user = c.get('user');
  const db = c.env.DB;
  const id = c.req.param('id');
  try {
    await db.prepare('UPDATE alumni SET is_active = 0, updated_at = ? WHERE id = ? AND institution_id = ?')
      .bind(new Date().toISOString(), id, user.institution_id).run();
    await createAuditLog(db, user.sub || null, 'DELETE_ALUMNI_RECORD', 'alumni', id, `Removed alumnus record ${id}`);
    return c.json({ success: true });
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

// ─── ALUMNI EVENTS (write endpoints; GET /events is registered above, before '/:id') ────────

alumni.post('/events', requireRole('admin', 'super_admin', 'Principal', 'HOD'), async (c) => {
  const user = c.get('user');
  const db = c.env.DB;
  const input = await c.req.json();

  if (!input.name || !input.start_date) {
    return c.json({ error: 'Event name and start date are required' }, 400);
  }

  const id = generateUuid();
  try {
    await db.prepare(`
      INSERT INTO alumni_events (id, institution_id, name, event_type, start_date, end_date, location, description, created_by, updated_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, user.institution_id, input.name, input.event_type || 'reunion', input.start_date,
      input.end_date || null, input.location || null, input.description || null, user.sub || null, user.sub || null
    ).run();

    await createAuditLog(db, user.sub || null, 'CREATE_ALUMNI_EVENT', 'alumni_events', id, `Created alumni event: ${input.name}`);
    return c.json({ success: true, id }, 201);
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

alumni.delete('/events/:id', requireRole('admin', 'super_admin', 'Principal'), async (c) => {
  const user = c.get('user');
  const db = c.env.DB;
  const id = c.req.param('id');
  try {
    await db.prepare('UPDATE alumni_events SET is_active = 0, updated_at = ? WHERE id = ? AND institution_id = ?')
      .bind(new Date().toISOString(), id, user.institution_id).run();
    return c.json({ success: true });
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

// RSVP: identified by the alumni record linked to the caller's own student_id (self-service) or explicit alumniId (staff on behalf).
alumni.post('/events/:id/rsvp', async (c) => {
  const user = c.get('user');
  const db = c.env.DB;
  const eventId = c.req.param('id');
  const input = await c.req.json();

  let alumniId = input.alumniId;
  if (!alumniId) {
    const own = await db.prepare(`
      SELECT a.id FROM alumni a JOIN students s ON s.id = a.student_id
      WHERE s.user_id = ? AND a.institution_id = ? AND a.is_active = 1
    `).bind(user.sub, user.institution_id).first<{ id: string }>();
    alumniId = own?.id;
  }
  if (!alumniId) return c.json({ error: 'No linked alumni record found for this user; specify alumniId explicitly.' }, 400);

  const status = ['INTERESTED', 'GOING', 'DECLINED'].includes(input.status) ? input.status : 'INTERESTED';
  try {
    const id = generateUuid();
    await db.prepare(`
      INSERT INTO alumni_event_rsvps (id, event_id, alumni_id, status) VALUES (?, ?, ?, ?)
      ON CONFLICT(event_id, alumni_id) DO UPDATE SET status = excluded.status
    `).bind(id, eventId, alumniId, status).run();
    return c.json({ success: true, status });
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});
