import { Hono } from 'hono';
import { Env, JwtPayload } from '../../types';
import { NotificationsRepository } from './notifications.repository';
import { NotificationsService } from './notifications.service';
import { authMiddleware, requireRole } from '../../middleware/auth';
import { createAuditLog } from '../../utils/audit';

const notifications = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();

notifications.use('*', authMiddleware);

// --- USER INBOX ---
notifications.get('/', async (c) => {
  const user = c.get('user');
  const repo = new NotificationsRepository(c.env.DB);
  const service = new NotificationsService(repo);

  const limit = c.req.query('limit') ? parseInt(c.req.query('limit')!, 10) : 50;
  const targetUserId = c.req.query('user_id') || user.sub;
  const list = await service.listUserNotifications(targetUserId, limit);
  return c.json(list);
});

notifications.get('/unread-count', async (c) => {
  const user = c.get('user');
  const repo = new NotificationsRepository(c.env.DB);
  const service = new NotificationsService(repo);

  const count = await service.countUnread(user.sub);
  return c.json({ count });
});

notifications.put('/read-all', async (c) => {
  const user = c.get('user');
  const repo = new NotificationsRepository(c.env.DB);
  const service = new NotificationsService(repo);

  await service.markAllAsRead(user.sub);
  return c.json({ message: 'All notifications marked as read' });
});

notifications.put('/:id/read', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const repo = new NotificationsRepository(c.env.DB);
  const service = new NotificationsService(repo);

  await service.markAsRead(id, user.sub);
  return c.json({ message: 'Notification marked as read' });
});

// --- DISPATCH & SCHEDULING ---
notifications.post('/send', requireRole('admin', 'super_admin', 'Principal', 'HOD', 'Accountant'), async (c) => {
  const user = c.get('user');
  const { recipient_user_id, title, message, type = 'general', channels, priority, scheduled_at } = await c.req.json();

  if (!recipient_user_id || !title || !message) {
    return c.json({ error: 'Missing required parameters: recipient_user_id, title, message' }, 400);
  }

  const repo = new NotificationsRepository(c.env.DB);
  const service = new NotificationsService(repo);

  try {
    const id = await service.sendDirectNotification(
      c.env, user.institution_id, recipient_user_id, title, message, type, channels, priority, scheduled_at
    );
    await createAuditLog(c.env.DB, user.sub, 'SEND_NOTIFICATION', 'notifications', id, `Sent notification to user ${recipient_user_id}`);
    return c.json({ id, message: 'Notification queued/sent successfully' }, 201);
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

notifications.post('/schedule', requireRole('admin', 'super_admin', 'Principal', 'HOD', 'Accountant'), async (c) => {
  const user = c.get('user');
  const { recipient_user_id, title, message, type = 'general', channels, priority, scheduled_at } = await c.req.json();

  if (!recipient_user_id || !title || !message || !scheduled_at) {
    return c.json({ error: 'Missing required parameters: recipient_user_id, title, message, scheduled_at' }, 400);
  }

  const repo = new NotificationsRepository(c.env.DB);
  const service = new NotificationsService(repo);

  try {
    const id = await service.sendDirectNotification(
      c.env, user.institution_id, recipient_user_id, title, message, type, channels, priority, scheduled_at
    );
    await createAuditLog(c.env.DB, user.sub, 'SCHEDULE_NOTIFICATION', 'notifications', id, `Scheduled notification for ${scheduled_at}`);
    return c.json({ id, message: 'Notification scheduled successfully' }, 201);
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

notifications.post('/event', requireRole('admin', 'super_admin', 'Principal', 'HOD', 'Accountant'), async (c) => {
  const user = c.get('user');
  const { event_type, recipient_user_id, variables, channels, priority, scheduled_at } = await c.req.json();

  if (!event_type || !recipient_user_id) {
    return c.json({ error: 'Missing required parameters: event_type, recipient_user_id' }, 400);
  }

  const repo = new NotificationsRepository(c.env.DB);
  const service = new NotificationsService(repo);

  try {
    const id = await service.dispatchEventNotification(
      c.env, user.institution_id, event_type, recipient_user_id, variables || {}, channels, priority, scheduled_at
    );
    return c.json({ id, message: 'Event notification triggered successfully' }, 201);
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

// --- TEMPLATES ---
notifications.get('/templates', requireRole('admin', 'super_admin', 'Principal', 'HOD', 'Accountant'), async (c) => {
  const user = c.get('user');
  const repo = new NotificationsRepository(c.env.DB);
  const service = new NotificationsService(repo);

  const templates = await service.listTemplates(user.institution_id);
  return c.json(templates);
});

notifications.post('/templates', requireRole('admin', 'super_admin', 'Principal', 'HOD', 'Accountant'), async (c) => {
  const user = c.get('user');
  const input = await c.req.json();

  if (!input.name || !input.event_type || !input.subject || !input.body) {
    return c.json({ error: 'Missing required template fields: name, event_type, subject, body' }, 400);
  }

  const repo = new NotificationsRepository(c.env.DB);
  const service = new NotificationsService(repo);

  try {
    const id = await service.createTemplate(user.institution_id, input);
    await createAuditLog(c.env.DB, user.sub, 'CREATE_NOTIFICATION_TEMPLATE', 'notifications', id, `Created template ${input.name}`);
    return c.json({ id }, 201);
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

notifications.get('/templates/:id', requireRole('admin', 'super_admin', 'Principal', 'HOD', 'Accountant'), async (c) => {
  const id = c.req.param('id')!;
  const repo = new NotificationsRepository(c.env.DB);
  const service = new NotificationsService(repo);

  const template = await service.getTemplateById(id);
  if (!template) return c.json({ error: 'Template not found' }, 404);
  return c.json(template);
});

notifications.patch('/templates/:id', requireRole('admin', 'super_admin', 'Principal', 'HOD', 'Accountant'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const updates = await c.req.json();

  const repo = new NotificationsRepository(c.env.DB);
  const service = new NotificationsService(repo);

  try {
    await service.updateTemplate(id, user.institution_id, updates);
    await createAuditLog(c.env.DB, user.sub, 'UPDATE_NOTIFICATION_TEMPLATE', 'notifications', id, `Updated template ${id}`);
    return c.json({ message: 'Template updated successfully' });
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

notifications.delete('/templates/:id', requireRole('admin', 'super_admin', 'Principal', 'HOD', 'Accountant'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;

  const repo = new NotificationsRepository(c.env.DB);
  const service = new NotificationsService(repo);

  try {
    await service.deleteTemplate(id, user.institution_id);
    await createAuditLog(c.env.DB, user.sub, 'DELETE_NOTIFICATION_TEMPLATE', 'notifications', id, `Deleted template ${id}`);
    return c.json({ message: 'Template deleted successfully' });
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

// --- QUEUE & WORKER ---
notifications.get('/queue', requireRole('admin', 'super_admin', 'Principal', 'HOD', 'Accountant'), async (c) => {
  const user = c.get('user');
  const status = c.req.query('status');

  const repo = new NotificationsRepository(c.env.DB);
  const service = new NotificationsService(repo);

  const items = await service.listQueueItems(user.institution_id, status);
  return c.json(items);
});

notifications.post('/process-queue', requireRole('admin', 'super_admin', 'Principal', 'HOD', 'Accountant'), async (c) => {
  const repo = new NotificationsRepository(c.env.DB);
  const service = new NotificationsService(repo);

  const result = await service.processNotificationQueue(c.env);
  return c.json(result);
});

notifications.post('/:id/retry', requireRole('admin', 'super_admin', 'Principal', 'HOD', 'Accountant'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;

  const repo = new NotificationsRepository(c.env.DB);
  const service = new NotificationsService(repo);

  try {
    await service.retryNotification(c.env, id, user.institution_id);
    await createAuditLog(c.env.DB, user.sub, 'RETRY_NOTIFICATION', 'notifications', id, `Retried notification ${id}`);
    return c.json({ message: 'Notification queued for retry' });
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

// --- PREFERENCES ---
notifications.get('/preferences', async (c) => {
  const user = c.get('user');
  const repo = new NotificationsRepository(c.env.DB);
  const service = new NotificationsService(repo);

  const prefs = await service.getPreferencesByUser(user.sub);
  return c.json(prefs || {
    user_id: user.sub,
    email_enabled: 1,
    sms_enabled: 1,
    whatsapp_enabled: 1,
    push_enabled: 1,
    in_app_enabled: 1,
    quiet_hours_start: null,
    quiet_hours_end: null,
    language: 'en',
    timezone: 'Asia/Kolkata'
  });
});

notifications.put('/preferences', async (c) => {
  const user = c.get('user');
  const prefs = await c.req.json();

  const repo = new NotificationsRepository(c.env.DB);
  const service = new NotificationsService(repo);

  await service.updatePreferences(user.sub, prefs);
  return c.json({ message: 'Notification preferences updated successfully' });
});

// --- LOGS & ANALYTICS ---
notifications.get('/logs', requireRole('admin', 'super_admin', 'Principal', 'HOD', 'Accountant'), async (c) => {
  const user = c.get('user');
  const limit = c.req.query('limit') ? parseInt(c.req.query('limit')!, 10) : 100;

  const repo = new NotificationsRepository(c.env.DB);
  const service = new NotificationsService(repo);

  const logs = await service.listAuditLogs(user.institution_id, limit);
  return c.json(logs);
});

notifications.get('/analytics', requireRole('admin', 'super_admin', 'Principal', 'HOD', 'Accountant'), async (c) => {
  const user = c.get('user');
  const repo = new NotificationsRepository(c.env.DB);
  const service = new NotificationsService(repo);

  const analytics = await service.getAnalytics(user.institution_id);
  return c.json(analytics);
});

export default notifications;
