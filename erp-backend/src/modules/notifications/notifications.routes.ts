import { Hono } from 'hono';
import { Env, JwtPayload } from '../../types';
import { NotificationRepository } from './notifications.repository';
import { NotificationService } from './notifications.service';
import { authMiddleware } from '../../middleware/auth';

const notifications = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();

notifications.use('*', authMiddleware);

notifications.get('/', async (c) => {
  const user = c.get('user');
  
  const repo = new NotificationRepository(c.env.DB);
  const service = new NotificationService(repo);
  const results = await service.listNotifications(user.institution_id, user.sub);
  return c.json(results);
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
