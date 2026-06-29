import { Hono } from 'hono';
import { Env, JwtPayload } from '../../types';
import { NotificationRepository } from './notifications.repository';
import { NotificationService } from './notifications.service';
import { authMiddleware, requireRole } from '../../middleware/auth';

const notifications = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();

notifications.use('*', authMiddleware);

notifications.get('/', async (c) => {
  const user = c.get('user');
  
  const repo = new NotificationRepository(c.env.DB);
  const service = new NotificationService(repo);
  const results = await service.listNotifications(user.institution_id, user.sub);
  return c.json(results);
});

notifications.post('/', requireRole('admin', 'super_admin', 'Principal'), async (c) => {
  const user = c.get('user');
  const input = await c.req.json();
  
  const db = c.env.DB;
  const repo = new NotificationRepository(db);
  
  let query = `SELECT id FROM users WHERE institution_id = ? AND is_active = 1`;
  const params: any[] = [user.institution_id];
  
  if (input.target_role === 'Student') {
    query = `
      SELECT DISTINCT u.id 
      FROM users u
      JOIN students s ON s.user_id = u.id
      WHERE u.institution_id = ? AND u.is_active = 1
    `;
  } else if (input.target_role === 'Teacher') {
    query = `
      SELECT DISTINCT u.id 
      FROM users u
      JOIN teachers t ON t.user_id = u.id
      WHERE u.institution_id = ? AND u.is_active = 1
    `;
  } else if (input.target_role && input.target_role !== 'all') {
    query = `SELECT id FROM users WHERE id = ? AND institution_id = ? AND is_active = 1`;
    params.unshift(input.target_role);
  }

  const { results } = await db.prepare(query).bind(...params).all<{ id: string }>();

  if (results && results.length > 0) {
    const inputs = results.map(row => ({
      user_id: row.id,
      title: input.title,
      message: input.message,
      type: input.type || 'general'
    }));
    await repo.createBulk(user.institution_id, inputs);
  }

  return c.json({ success: true }, 201);
});

notifications.post('/:id/read', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  
  const repo = new NotificationRepository(c.env.DB);
  const service = new NotificationService(repo);
  await service.markAsRead(id, user.sub);
  return c.json({ success: true });
});

notifications.post('/read-all', async (c) => {
  const user = c.get('user');
  
  const repo = new NotificationRepository(c.env.DB);
  const service = new NotificationService(repo);
  await service.markAllAsRead(user.institution_id, user.sub);
  return c.json({ success: true });
});

export default notifications;
