import { Hono } from 'hono';
import { Env, JwtPayload } from '../../types';
import { authMiddleware } from '../../middleware/auth';

const push = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();

push.use('*', authMiddleware);

// POST /notifications/push/subscribe
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

// DELETE /notifications/push/unsubscribe
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

// GET /notifications/push/vapid-public-key
push.get('/vapid-public-key', async (c) => {
  const key = c.env.VAPID_PUBLIC_KEY || null;
  return c.json({ key });
});

export default push;
