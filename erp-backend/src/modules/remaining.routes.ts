import { Hono } from 'hono';
import { Env, JwtPayload } from '../types';
import { authMiddleware, requireRole } from '../middleware/auth';
import { createAuditLog } from '../utils/audit';

// Helper to generate UUIDs locally if needed
const generateUuid = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

// ─── VISITOR REGISTER ────────────────────────────────────────────────────────

export const visitors = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();
visitors.use('*', authMiddleware);

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
      .prepare('SELECT * FROM alumni WHERE institution_id = ? ORDER BY graduation_year DESC, last_name ASC')
      .bind(user.institution_id)
      .all();
    return c.json(results);
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
