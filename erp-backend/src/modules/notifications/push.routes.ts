import { Hono } from 'hono';
import { Env, JwtPayload } from '../../types';
import { authMiddleware, requireRole } from '../../middleware/auth';

const push = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();

push.use('*', authMiddleware);

// 1. GET /notifications/push/preferences - Retrieve user-specific category preferences
push.get('/preferences', async (c) => {
  const user = c.get('user');
  const db = c.env.DB;

  const result = await db.prepare(`
    SELECT preferences FROM user_notification_preferences WHERE user_id = ?
  `).bind(user.sub).first<{ preferences: string }>();

  if (result) {
    try {
      return c.json({ preferences: JSON.parse(result.preferences) });
    } catch {
      // Fallback if parsing fails
    }
  }

  // Generate default preferences based on user roles
  const userRoles = user.roles || (user.role ? [user.role] : []);
  const isStudent = userRoles.some(r => ['Student', 'student'].includes(r));
  const isParent = userRoles.some(r => ['Parent', 'parent', 'Guardian', 'guardian'].includes(r));
  const isTeacher = userRoles.some(r => ['Teacher', 'HOD', 'teacher', 'hod'].includes(r));

  let defaultPrefs = {};
  if (isStudent) {
    defaultPrefs = { attendance: true, exams: true, homework: true, timetable: true, events: true };
  } else if (isParent) {
    defaultPrefs = { attendance: true, fees: true, results: true, leave: true, ptm: true, events: true, transport: true };
  } else if (isTeacher) {
    defaultPrefs = { leave: true, timetable: true, announcements: true, messages: true };
  } else {
    defaultPrefs = { announcements: true, messages: true };
  }

  return c.json({ preferences: defaultPrefs });
});

// 2. POST /notifications/push/preferences - Save user-specific category preferences
push.post('/preferences', async (c) => {
  const user = c.get('user');
  const db = c.env.DB;
  const body = await c.req.json();
  const { preferences } = body;

  if (!preferences) {
    return c.json({ error: 'preferences object is required' }, 400);
  }

  await db.prepare(`
    INSERT INTO user_notification_preferences (user_id, preferences)
    VALUES (?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      preferences = excluded.preferences,
      updated_at = datetime('now')
  `).bind(user.sub, JSON.stringify(preferences)).run();

  return c.json({ success: true });
});

// 3. GET /notifications/push/devices - Fetch registered devices for the user
push.get('/devices', async (c) => {
  const user = c.get('user');
  const db = c.env.DB;

  const { results } = await db.prepare(`
    SELECT id, user_agent, created_at 
    FROM push_subscriptions 
    WHERE user_id = ? AND is_active = 1
    ORDER BY created_at DESC
  `).bind(user.sub).all();

  return c.json(results || []);
});

// 4. DELETE /notifications/push/devices/:id - Unsubscribe/Remove specific device
push.delete('/devices/:id', async (c) => {
  const user = c.get('user');
  const db = c.env.DB;
  const id = c.req.param('id')!;

  await db.prepare(`
    UPDATE push_subscriptions 
    SET is_active = 0 
    WHERE id = ? AND user_id = ?
  `).bind(id, user.sub).run();

  return c.json({ success: true });
});

// 5. GET /notifications/push/adoption - Get adoption stats for students & parents
push.get('/adoption', requireRole('admin', 'super_admin', 'Principal', 'HOD'), async (c) => {
  const user = c.get('user');
  const db = c.env.DB;

  // Student stats
  const totalStudentsRes = await db.prepare(`
    SELECT COUNT(DISTINCT u.id) as count 
    FROM users u
    JOIN user_roles ur ON u.id = ur.user_id
    JOIN roles r ON ur.role_id = r.id
    WHERE LOWER(r.name) = 'student' AND u.institution_id = ? AND u.is_active = 1
  `).bind(user.institution_id).first<{ count: number }>();

  const enabledStudentsRes = await db.prepare(`
    SELECT COUNT(DISTINCT u.id) as count 
    FROM users u
    JOIN user_roles ur ON u.id = ur.user_id
    JOIN roles r ON ur.role_id = r.id
    JOIN push_subscriptions ps ON u.id = ps.user_id
    WHERE LOWER(r.name) = 'student' AND u.institution_id = ? AND u.is_active = 1 AND ps.is_active = 1
  `).bind(user.institution_id).first<{ count: number }>();

  // Parent stats
  const totalParentsRes = await db.prepare(`
    SELECT COUNT(DISTINCT u.id) as count 
    FROM users u
    JOIN user_roles ur ON u.id = ur.user_id
    JOIN roles r ON ur.role_id = r.id
    WHERE LOWER(r.name) = 'parent' AND u.institution_id = ? AND u.is_active = 1
  `).bind(user.institution_id).first<{ count: number }>();

  const enabledParentsRes = await db.prepare(`
    SELECT COUNT(DISTINCT u.id) as count 
    FROM users u
    JOIN user_roles ur ON u.id = ur.user_id
    JOIN roles r ON ur.role_id = r.id
    JOIN push_subscriptions ps ON u.id = ps.user_id
    WHERE LOWER(r.name) = 'parent' AND u.institution_id = ? AND u.is_active = 1 AND ps.is_active = 1
  `).bind(user.institution_id).first<{ count: number }>();

  const totalStudents = totalStudentsRes?.count || 0;
  const enabledStudents = enabledStudentsRes?.count || 0;
  const totalParents = totalParentsRes?.count || 0;
  const enabledParents = enabledParentsRes?.count || 0;

  return c.json({
    students: {
      total: totalStudents,
      enabled: enabledStudents,
      disabled: Math.max(0, totalStudents - enabledStudents)
    },
    parents: {
      total: totalParents,
      enabled: enabledParents,
      disabled: Math.max(0, totalParents - enabledParents)
    }
  });
});

// 6. POST /notifications/push/subscribe - Keep original subscription logic
push.post('/subscribe', async (c) => {
  const user = c.get('user');
  const db = c.env.DB;
  const body = await c.req.json();
  const { endpoint, p256dh, auth, userAgent } = body;

  if (!endpoint || !p256dh || !auth) {
    return c.json({ error: 'endpoint, p256dh and auth are required' }, 400);
  }

  const id = crypto.randomUUID();
  await db.prepare(`
    INSERT INTO push_subscriptions (id, user_id, institution_id, endpoint, p256dh, auth, user_agent)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, endpoint) DO UPDATE SET
      p256dh = excluded.p256dh,
      auth = excluded.auth,
      is_active = 1,
      user_agent = excluded.user_agent
  `).bind(id, user.sub, user.institution_id, endpoint, p256dh, auth, userAgent || null).run();

  return c.json({ success: true });
});

// 7. DELETE /notifications/push/unsubscribe - Keep original unsubscribing logic
push.delete('/unsubscribe', async (c) => {
  const user = c.get('user');
  const db = c.env.DB;
  const body = await c.req.json();
  const { endpoint } = body;

  if (!endpoint) return c.json({ error: 'endpoint required' }, 400);

  await db.prepare(
    `UPDATE push_subscriptions SET is_active = 0 WHERE user_id = ? AND endpoint = ?`
  ).bind(user.sub, endpoint).run();

  return c.json({ success: true });
});

// 8. GET /notifications/push/vapid-public-key - Keep original VAPID key logic
push.get('/vapid-public-key', async (c) => {
  const key = c.env.VAPID_PUBLIC_KEY || null;
  return c.json({ key });
});

export default push;
