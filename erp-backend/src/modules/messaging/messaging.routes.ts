import { Hono } from 'hono';
import { authMiddleware } from '../../middleware/auth';
import type { Env } from '../../types';

const messaging = new Hono<{ Bindings: Env }>();

// Helper to ensure tables exist
async function ensureMessagingTables(db: D1Database) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS direct_messages (
      id TEXT PRIMARY KEY,
      institution_id TEXT NOT NULL,
      sender_id TEXT NOT NULL REFERENCES users(id),
      receiver_id TEXT NOT NULL REFERENCES users(id),
      message TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `).run();
}

// 1. Get contacts list
messaging.get('/contacts', authMiddleware, async (c) => {
  const user = c.get('user');
  await ensureMessagingTables(c.env.DB);

  const userRoles = user.roles || (user.role ? [user.role] : []);
  const isParent = userRoles.some((r: string) => ['Parent', 'parent', 'Guardian', 'guardian'].includes(r));
  const isTeacher = userRoles.some((r: string) => ['Teacher', 'HOD', 'teacher', 'hod', 'Principal'].includes(r));
  const isAdmin = userRoles.some((r: string) => ['super_admin', 'Super Admin', 'admin', 'Admin'].includes(r));

  let query = '';
  if (isParent) {
    // Parents can message teachers and admins
    query = `
      SELECT id, name, role FROM (
        SELECT user_id as id, first_name || ' ' || last_name as name, 'Teacher' as role 
        FROM teachers 
        WHERE institution_id = ? AND is_active = 1 AND user_id IS NOT NULL
        UNION
        SELECT id, name, 'Admin' as role 
        FROM users 
        WHERE institution_id = ? AND is_active = 1 AND id != ? AND (role = 'admin' OR role = 'super_admin' OR name = 'Principal')
      ) ORDER BY name ASC
    `;
    const { results } = await c.env.DB.prepare(query).bind(user.institution_id, user.institution_id, user.sub).all();
    return c.json(results);
  } else {
    // Teachers and admins can message parents and staff
    query = `
      SELECT id, name, role FROM (
        SELECT u.id, u.name, 'Parent' as role
        FROM guardians g
        JOIN users u ON g.user_id = u.id
        WHERE g.institution_id = ? AND g.is_active = 1
        UNION
        SELECT user_id as id, first_name || ' ' || last_name as name, 'Teacher' as role 
        FROM teachers 
        WHERE institution_id = ? AND is_active = 1 AND user_id IS NOT NULL AND user_id != ?
        UNION
        SELECT id, name, 'Admin' as role 
        FROM users 
        WHERE institution_id = ? AND is_active = 1 AND id != ? AND (role = 'admin' OR role = 'super_admin')
      ) ORDER BY name ASC
    `;
    const { results } = await c.env.DB.prepare(query).bind(user.institution_id, user.institution_id, user.sub, user.institution_id, user.sub).all();
    return c.json(results);
  }
});

// 2. Get message history with a contact
messaging.get('/history/:contactId', authMiddleware, async (c) => {
  const user = c.get('user');
  const contactId = c.req.param('contactId');
  await ensureMessagingTables(c.env.DB);

  const { results } = await c.env.DB.prepare(`
    SELECT * FROM direct_messages 
    WHERE institution_id = ? AND (
      (sender_id = ? AND receiver_id = ?) OR
      (sender_id = ? AND receiver_id = ?)
    )
    ORDER BY created_at ASC
  `).bind(user.institution_id, user.sub, contactId, contactId, user.sub).all();

  return c.json(results);
});

// 3. Send message
messaging.post('/send', authMiddleware, async (c) => {
  const user = c.get('user');
  await ensureMessagingTables(c.env.DB);
  const { receiver_id, message } = await c.req.json();

  if (!receiver_id || !message) {
    return c.json({ error: 'Receiver ID and message content are required' }, 400);
  }

  const id = crypto.randomUUID();
  await c.env.DB.prepare(`
    INSERT INTO direct_messages (id, institution_id, sender_id, receiver_id, message)
    VALUES (?, ?, ?, ?, ?)
  `).bind(
    id,
    user.institution_id,
    user.sub,
    receiver_id,
    message
  ).run();

  // Trigger internal notification for the recipient
  try {
    const notifRepo = await import('../notifications/notifications.repository');
    const notifServ = await import('../notifications/notifications.service');
    const repo = new notifRepo.NotificationRepository(c.env.DB);
    const service = new notifServ.NotificationService(repo, c.env.DB);
    await service.createNotification(user.institution_id, {
      user_id: receiver_id,
      title: 'New Message Received',
      message: `You received a new direct chat message from ${user.name || user.email}`,
      type: 'general'
    });
  } catch (err) {
    // Silent fail
  }

  return c.json({ success: true, id }, 201);
});

// 4. Mark messages as read
messaging.post('/read/:contactId', authMiddleware, async (c) => {
  const user = c.get('user');
  const contactId = c.req.param('contactId');
  await ensureMessagingTables(c.env.DB);

  await c.env.DB.prepare(`
    UPDATE direct_messages SET is_read = 1 
    WHERE institution_id = ? AND sender_id = ? AND receiver_id = ? AND is_read = 0
  `).bind(user.institution_id, contactId, user.sub).run();

  return c.json({ success: true });
});

messaging.get('/unread-count', authMiddleware, async (c) => {
  const user = c.get('user');
  await ensureMessagingTables(c.env.DB);
  const result = await c.env.DB.prepare(
    'SELECT COUNT(*) as count FROM direct_messages WHERE institution_id = ? AND receiver_id = ? AND is_read = 0'
  ).bind(user.institution_id, user.sub).first<{ count: number }>();
  return c.json({ count: result?.count ?? 0 });
});

export default messaging;
