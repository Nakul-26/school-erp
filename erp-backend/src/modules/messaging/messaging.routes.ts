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

function getUserRoles(user: any): string[] {
  return user.roles || (user.role ? [user.role] : []);
}

function hasAnyRole(user: any, roles: string[]): boolean {
  return getUserRoles(user).some((role) => roles.includes(role));
}

async function canMessageContact(db: D1Database, user: any, contactId: string): Promise<boolean> {
  const contact = await db.prepare(
    'SELECT id, role, institution_id FROM users WHERE id = ? AND institution_id = ? AND is_active = 1'
  ).bind(contactId, user.institution_id).first<{ id: string; role: string | null; institution_id: string }>();
  if (!contact || contact.id === user.sub) return false;

  const isStudent = hasAnyRole(user, ['Student', 'student']);
  const isParent = hasAnyRole(user, ['Parent', 'parent', 'Guardian', 'guardian']);
  const isTeacherOrStaff = hasAnyRole(user, ['Teacher', 'teacher', 'HOD', 'hod', 'Principal', 'admin', 'Admin', 'super_admin', 'Super Admin']);
  const contactRole = contact.role || '';

  if (isStudent) {
    const teacherOrAdmin = await db.prepare(`
      SELECT 1 FROM teachers WHERE user_id = ? AND institution_id = ? AND is_active = 1
      UNION
      SELECT 1 FROM users WHERE id = ? AND institution_id = ? AND is_active = 1 AND (role = 'admin' OR role = 'super_admin' OR name = 'Principal')
      LIMIT 1
    `).bind(contactId, user.institution_id, contactId, user.institution_id).first();
    return Boolean(teacherOrAdmin);
  }

  if (isParent) {
    const teacherOrAdmin = await db.prepare(`
      SELECT 1 FROM teachers WHERE user_id = ? AND institution_id = ? AND is_active = 1
      UNION
      SELECT 1 FROM users WHERE id = ? AND institution_id = ? AND is_active = 1 AND (role = 'admin' OR role = 'super_admin' OR name = 'Principal')
      LIMIT 1
    `).bind(contactId, user.institution_id, contactId, user.institution_id).first();
    return Boolean(teacherOrAdmin);
  }

  if (isTeacherOrStaff) {
    return ['parent', 'Parent', 'guardian', 'Guardian', 'teacher', 'Teacher', 'admin', 'super_admin'].includes(contactRole) || Boolean(contactRole);
  }

  return false;
}

// 1. Get contacts list
messaging.get('/contacts', authMiddleware, async (c) => {
  const user = c.get('user');
  await ensureMessagingTables(c.env.DB);

  const userRoles = user.roles || (user.role ? [user.role] : []);
  const isParent = userRoles.some((r: string) => ['Parent', 'parent', 'Guardian', 'guardian'].includes(r));
  const isStudent = userRoles.some((r: string) => ['Student', 'student'].includes(r));
  const isTeacher = userRoles.some((r: string) => ['Teacher', 'HOD', 'teacher', 'hod', 'Principal'].includes(r));
  const isAdmin = userRoles.some((r: string) => ['super_admin', 'Super Admin', 'admin', 'Admin'].includes(r));

  let query = '';
  if (isStudent || isParent) {
    // Students and parents can message teachers and admins. They never receive the guardian directory.
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
  } else if (isTeacher || isAdmin) {
    // Teachers and admins can message parents and staff
    query = `
      SELECT id, name, role FROM (
        SELECT u.id, u.name, 'Parent' as role
        FROM guardians g
        JOIN users u ON g.user_id = u.id
        JOIN students s ON g.student_id = s.id
        WHERE s.institution_id = ? AND g.is_active = 1
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

  return c.json([]);
});

// 2. Get message history with a contact
messaging.get('/history/:contactId', authMiddleware, async (c) => {
  const user = c.get('user');
  const contactId = c.req.param('contactId');
  await ensureMessagingTables(c.env.DB);

  if (!contactId) {
    return c.json({ error: 'Contact ID is required' }, 400);
  }

  if (!(await canMessageContact(c.env.DB, user, contactId))) {
    return c.json({ error: 'Forbidden' }, 403);
  }

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

  if (!(await canMessageContact(c.env.DB, user, receiver_id))) {
    return c.json({ error: 'Forbidden' }, 403);
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
