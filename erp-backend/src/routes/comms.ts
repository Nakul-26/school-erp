import { Hono } from 'hono';
import type { Env, JwtPayload } from '../types';
import { authMiddleware, requireRole } from '../middleware/auth';

const comms = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();
comms.use('*', authMiddleware);

// ---------------- Announcements ----------------

comms.get('/announcements', async (c) => {
  const user = c.get('user');
  const sectionId = c.req.query('section_id');

  let query = 'SELECT * FROM announcements WHERE college_id = ?';
  const params: (string | number)[] = [user.college_id];

  // Filtering for students/parents
  if (user.role === 'student' || user.role === 'parent') {
    query += ' AND (target_role = "all" OR target_role = ?)';
    params.push(user.role);
    
    if (sectionId) {
      query += ' AND (target_section_id IS NULL OR target_section_id = ?)';
      params.push(sectionId);
    }
  }

  query += ' ORDER BY created_at DESC';

  const { results } = await c.env.DB.prepare(query).bind(...params).all();
  return c.json({ announcements: results });
});

comms.post('/announcements', requireRole('admin'), async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{
    title: string;
    content: string;
    target_role?: 'all' | 'student' | 'teacher' | 'parent';
    target_section_id?: number;
  }>();

  if (!body.title || !body.content) return c.json({ error: 'Title and content required' }, 400);

  const result = await c.env.DB
    .prepare('INSERT INTO announcements (college_id, title, content, target_role, target_section_id, created_by) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(user.college_id, body.title, body.content, body.target_role ?? 'all', body.target_section_id ?? null, user.sub)
    .run();

  return c.json({ id: result.meta.last_row_id, ...body }, 201);
});

// ---------------- Notifications ----------------

comms.get('/notifications', async (c) => {
  const user = c.get('user');
  const { results } = await c.env.DB
    .prepare('SELECT * FROM notifications WHERE user_id = ? AND college_id = ? ORDER BY created_at DESC')
    .bind(user.sub, user.college_id)
    .all();
  return c.json({ notifications: results });
});

comms.patch('/notifications/:id/read', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');

  await c.env.DB
    .prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ? AND college_id = ?')
    .bind(id, user.sub, user.college_id)
    .run();

  return c.json({ success: true });
});

// Helper to send notification (internal use or via admin)
comms.post('/notifications', requireRole('admin'), async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{ user_id: number; title: string; message: string; type?: string }>();

  await c.env.DB
    .prepare('INSERT INTO notifications (college_id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)')
    .bind(user.college_id, body.user_id, body.title, body.message, body.type ?? 'info')
    .run();

  return c.json({ success: true }, 201);
});

export default comms;
