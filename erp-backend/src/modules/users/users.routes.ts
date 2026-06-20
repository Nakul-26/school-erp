import { Hono } from 'hono';
import { Env, JwtPayload } from '../../types';
import { UserRepository } from './users.repository';
import { UserService } from './users.service';
import { authMiddleware, requirePermission } from '../../middleware/auth';
import { createAuditLog } from '../../utils/audit';

const users = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();

users.use('*', authMiddleware);

users.get('/', requirePermission('user.manage'), async (c) => {
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
  
  // Security check: only self or users with user.manage permission from same institution
  const isSelf = targetUser.id === user.sub;
  const userPermissions = await repo.getUserPermissions(user.sub);
  const hasUserManage = userPermissions.includes('user.manage');
  const isSameInst = targetUser.institution_id === user.institution_id;
  
  const canReadTarget = isSelf || (hasUserManage && isSameInst);
  if (!canReadTarget) {
    return c.json({ error: 'Unauthorized' }, 403);
  }
  
  return c.json(targetUser);
});

users.post('/', requirePermission('user.manage'), async (c) => {
  const user = c.get('user');
  const input = await c.req.json();
  const repo = new UserRepository(c.env.DB);
  const service = new UserService(repo);
  
  try {
    const id = await service.createUser({ ...input, institution_id: user.institution_id }, user.sub);
    await createAuditLog(c.env.DB, user.sub, 'CREATE_USER', 'users', id, `Created user ${input.email} with roles: ${JSON.stringify(input.roles)}`);
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
  
  const isSelf = targetUser.id === user.sub;
  const userPermissions = await repo.getUserPermissions(user.sub);
  const hasUserManage = userPermissions.includes('user.manage');
  const isSameInst = targetUser.institution_id === user.institution_id;
  
  if (!isSelf && !(hasUserManage && isSameInst)) {
    return c.json({ error: 'Unauthorized' }, 403);
  }
  
  await service.updateUser(id, input, user.sub);
  await createAuditLog(c.env.DB, user.sub, 'UPDATE_USER', 'users', id, `Updated user ${targetUser.email} details/roles`);
  return c.json({ success: true });
});

users.delete('/:id', requirePermission('user.manage'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const repo = new UserRepository(c.env.DB);
  const service = new UserService(repo);
  
  const targetUser = await service.getUser(id);
  if (!targetUser) return c.json({ error: 'User not found' }, 404);
  
  if (targetUser.institution_id !== user.institution_id) {
    return c.json({ error: 'Unauthorized' }, 403);
  }
  
  await service.deleteUser(id, user.sub);
  await createAuditLog(c.env.DB, user.sub, 'DELETE_USER', 'users', id, `Soft-deleted user ${targetUser.email}`);
  return c.json({ success: true });
});

export default users;
