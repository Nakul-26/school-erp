import { Hono } from 'hono';
import { Env, JwtPayload } from '../../types';
import { UserRepository } from './users.repository';
import { UserService } from './users.service';
import { authMiddleware, requireRole } from '../../middleware/auth';

const users = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();

users.use('*', authMiddleware);

users.get('/', requireRole('admin', 'super_admin'), async (c) => {
  const user = c.get('user');
  const repo = new UserRepository(c.env.DB);
  const service = new UserService(repo);
  const results = await service.listUsers(user.institution_id);
  return c.json(results);
});

users.get('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const repo = new UserRepository(c.env.DB);
  const service = new UserService(repo);
  
  const targetUser = await service.getUser(id);
  if (!targetUser) return c.json({ error: 'User not found' }, 404);
  
  // Security check: only self or admin from same institution
  const canReadTarget = targetUser.id === user.sub
    || user.role === 'super_admin'
    || (user.role === 'admin' && targetUser.institution_id === user.institution_id);
  if (!canReadTarget) {
    return c.json({ error: 'Unauthorized' }, 403);
  }
  
  return c.json(targetUser);
});

users.post('/', requireRole('admin', 'super_admin'), async (c) => {
  const user = c.get('user');
  const input = await c.req.json();
  const repo = new UserRepository(c.env.DB);
  const service = new UserService(repo);
  
  try {
    const id = await service.createUser({ ...input, institution_id: user.institution_id }, user.sub);
    return c.json({ id }, 201);
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

users.put('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const input = await c.req.json();
  const repo = new UserRepository(c.env.DB);
  const service = new UserService(repo);
  
  const targetUser = await service.getUser(id);
  if (!targetUser) return c.json({ error: 'User not found' }, 404);
  
  if (user.role !== 'super_admin' && targetUser.id !== user.sub && (user.role !== 'admin' || targetUser.institution_id !== user.institution_id)) {
    return c.json({ error: 'Unauthorized' }, 403);
  }
  
  await service.updateUser(id, input, user.sub);
  return c.json({ success: true });
});

users.delete('/:id', requireRole('admin', 'super_admin'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const repo = new UserRepository(c.env.DB);
  const service = new UserService(repo);
  
  const targetUser = await service.getUser(id);
  if (!targetUser) return c.json({ error: 'User not found' }, 404);
  
  if (user.role !== 'super_admin' && targetUser.institution_id !== user.institution_id) {
    return c.json({ error: 'Unauthorized' }, 403);
  }
  
  await service.deleteUser(id, user.sub);
  return c.json({ success: true });
});

export default users;
