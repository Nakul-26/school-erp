import { Hono } from 'hono';
import { Env, JwtPayload } from '../../types';
import { BroadcastsRepository } from './broadcasts.repository';
import { BroadcastsService } from './broadcasts.service';
import { authMiddleware, requireRole } from '../../middleware/auth';
import { createAuditLog } from '../../utils/audit';

const broadcasts = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();

broadcasts.use('*', authMiddleware);

function userRoles(user: JwtPayload): string[] {
  return user.roles || (user.role ? [user.role] : []);
}

function isBroadcastAdmin(user: JwtPayload): boolean {
  return userRoles(user).some((role) => ['super_admin', 'Super Admin', 'admin', 'Admin', 'Principal'].includes(role));
}

// 1. Get broadcasts received by current user (inbox)
broadcasts.get('/inbox', async (c) => {
  const user = c.get('user');
  const category = c.req.query('category');
  
  const repo = new BroadcastsRepository(c.env.DB);
  const service = new BroadcastsService(repo);
  const results = await service.listReceivedBroadcasts(user.sub, user.institution_id, category);
  return c.json(results);
});

// Get unread broadcast count for current user
broadcasts.get('/unread-count', async (c) => {
  const user = c.get('user');
  const result = await c.env.DB.prepare(`
    SELECT COUNT(*) as count
    FROM broadcast_recipients br
    JOIN broadcasts b ON br.broadcast_id = b.id
    WHERE br.user_id = ? AND b.institution_id = ? AND br.is_read = 0 AND b.status = 'sent' AND b.is_active = 1
  `).bind(user.sub, user.institution_id).first<{ count: number }>();
  return c.json({ count: result?.count ?? 0 });
});

// 2. List all broadcasts created by institution (admin/teacher panel)
// Teachers/HOD only see their own broadcasts; admins/principals see all
broadcasts.get('/', requireRole('admin', 'super_admin', 'Principal', 'HOD', 'Teacher'), async (c) => {
  const user = c.get('user');
  const status = c.req.query('status');
  const category = c.req.query('category');

  const isAdmin = user.roles.some(r => ['admin', 'super_admin', 'Admin', 'Super Admin', 'Principal'].includes(r));
  const createdBy = isAdmin ? undefined : user.sub;

  const repo = new BroadcastsRepository(c.env.DB);
  const service = new BroadcastsService(repo);
  const results = await service.listBroadcasts(user.institution_id, status, category, createdBy);
  return c.json(results);
});

// 3. Get single broadcast details
broadcasts.get('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;

  const repo = new BroadcastsRepository(c.env.DB);
  const service = new BroadcastsService(repo);
  const result = await service.getBroadcast(id);

  if (!result || result.institution_id !== user.institution_id) {
    return c.json({ error: 'Broadcast not found' }, 404);
  }

  const recipient = await c.env.DB.prepare(
    'SELECT 1 FROM broadcast_recipients WHERE broadcast_id = ? AND user_id = ?'
  ).bind(id, user.sub).first();
  const isCreator = result.created_by === user.sub;
  if (!isBroadcastAdmin(user) && !isCreator && !(result.status === 'sent' && recipient)) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  return c.json(result);
});

// 4. Get broadcast analytics/recipient read status (admin/teacher only)
broadcasts.get('/:id/analytics', requireRole('admin', 'super_admin', 'Principal', 'HOD', 'Teacher'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;

  const repo = new BroadcastsRepository(c.env.DB);
  const service = new BroadcastsService(repo);
  
  try {
    const analytics = await service.getRecipientAnalytics(id);
    return c.json(analytics);
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

// 5. Create draft or send immediate broadcast
broadcasts.post('/', requireRole('admin', 'super_admin', 'Principal', 'HOD', 'Teacher'), async (c) => {
  const user = c.get('user');
  const input = await c.req.json();

  const repo = new BroadcastsRepository(c.env.DB);
  const service = new BroadcastsService(repo);

  try {
    const id = await service.createBroadcast(user.institution_id, user.sub, input, c.env);
    await createAuditLog(
      c.env.DB,
      user.sub,
      'CREATE_BROADCAST',
      'broadcasts',
      id,
      `Created broadcast: ${input.subject} (${input.status})`
    );
    return c.json({ id, success: true }, 201);
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

// 6. Update draft broadcast
broadcasts.put('/:id', requireRole('admin', 'super_admin', 'Principal', 'HOD', 'Teacher'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const input = await c.req.json();

  const repo = new BroadcastsRepository(c.env.DB);
  const service = new BroadcastsService(repo);

  try {
    await service.updateBroadcast(id, input, user.institution_id, c.env);
    await createAuditLog(
      c.env.DB,
      user.sub,
      'UPDATE_BROADCAST',
      'broadcasts',
      id,
      `Updated broadcast: ${input.subject || id}`
    );
    return c.json({ success: true });
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

// 7. Send a draft broadcast
broadcasts.post('/:id/send', requireRole('admin', 'super_admin', 'Principal', 'HOD', 'Teacher'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;

  const repo = new BroadcastsRepository(c.env.DB);
  const service = new BroadcastsService(repo);

  try {
    await service.updateBroadcast(id, { status: 'sent' }, user.institution_id, c.env);
    await createAuditLog(
      c.env.DB,
      user.sub,
      'SEND_BROADCAST',
      'broadcasts',
      id,
      `Sent broadcast ID: ${id}`
    );
    return c.json({ success: true });
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

// 8. Mark broadcast as read for current user
broadcasts.post('/:id/read', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;

  const repo = new BroadcastsRepository(c.env.DB);
  const service = new BroadcastsService(repo);

  try {
    await service.markAsRead(id, user.sub);
    return c.json({ success: true });
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

// 9. Soft delete / archive a broadcast
broadcasts.delete('/:id', requireRole('admin', 'super_admin', 'Principal'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;

  const repo = new BroadcastsRepository(c.env.DB);
  const service = new BroadcastsService(repo);

  try {
    await service.deleteBroadcast(id);
    await createAuditLog(
      c.env.DB,
      user.sub,
      'DELETE_BROADCAST',
      'broadcasts',
      id,
      `Deleted (archived) broadcast ID: ${id}`
    );
    return c.json({ success: true });
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

export default broadcasts;
