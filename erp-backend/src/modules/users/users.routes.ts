import { Hono } from 'hono';
import { Env, JwtPayload } from '../../types';
import { UserRepository } from './users.repository';
import { UserService } from './users.service';
import { authMiddleware, requirePermission } from '../../middleware/auth';
import { createAuditLog } from '../../utils/audit';

const users = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();

// GET profile photo (Public route so <img> can load it directly without Authorization headers)
users.get('/profile-photo/:userId', async (c) => {
  const userId = c.req.param('userId');
  const key = `profile-photos/${userId}`;
  try {
    const file = await c.env.FILES.get(key);
    if (!file) {
      return c.json({ error: 'Photo not found' }, 404);
    }
    const headers = new Headers();
    headers.set('Content-Type', file.httpMetadata?.contentType || 'image/jpeg');
    return new Response(file.body, { headers });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

users.use('*', authMiddleware);

users.get('/', requirePermission('user.manage'), async (c) => {
  const user = c.get('user');
  const repo = new UserRepository(c.env.DB);
  const service = new UserService(repo);
  const results = await service.listUsers(user.institution_id);
  return c.json(results);
});

users.get('/:id', async (c) => {
  try {
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
  } catch (err: any) {
    return c.json({ error: err.message, stack: err.stack }, 500);
  }
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

users.post('/profile', async (c) => {
  const user = c.get('user');
  const input = await c.req.json();
  const repo = new UserRepository(c.env.DB);
  const service = new UserService(repo);

  const targetUser = await service.getUser(user.sub);
  if (!targetUser) return c.json({ error: 'User not found' }, 404);

  // If password change is requested
  let passwordHash = undefined;
  if (input.current_password && input.new_password) {
    // We need to fetch the password_hash from db since getUser doesn't return it
    const fullUser = await repo.findByEmail(targetUser.email);
    const { verifyPassword, hashPassword } = await import('../../utils/password');
    const valid = await verifyPassword(input.current_password, fullUser.password_hash);
    if (!valid) {
      return c.json({ error: 'Incorrect current password' }, 400);
    }
    passwordHash = await hashPassword(input.new_password);
  }

  // Update target user
  const updatePayload: any = {};
  if (input.name !== undefined) updatePayload.name = input.name;
  if (input.phone !== undefined) updatePayload.phone = input.phone;
  if (input.email !== undefined) {
    // check unique email
    const existing = await repo.findByEmail(input.email);
    if (existing && existing.id !== user.sub) {
      return c.json({ error: 'Email already in use' }, 400);
    }
    updatePayload.email = input.email;
  }
  if (passwordHash !== undefined) {
    updatePayload.password_hash = passwordHash;
  }

  if (Object.keys(updatePayload).length > 0) {
    await repo.update(user.sub, updatePayload, user.sub);
    await createAuditLog(c.env.DB, user.sub, 'UPDATE_PROFILE', 'users', user.sub, `User updated their own profile`);
  }

  return c.json({ success: true });
});

users.post('/profile-photo', async (c) => {
  const user = c.get('user');
  const body = await c.req.parseBody();
  const file = body['file'];

  if (!file || !(file instanceof File)) {
    return c.json({ error: 'No image file provided' }, 400);
  }

  const repo = new UserRepository(c.env.DB);
  const targetUser = await repo.findById(user.sub);
  if (!targetUser) return c.json({ error: 'User not found' }, 404);

  try {
    const bytes = await file.arrayBuffer();
    const key = `profile-photos/${user.sub}`;
    await c.env.FILES.put(key, bytes, {
      httpMetadata: { contentType: file.type || 'image/jpeg' }
    });

    const photoUrl = `/users/profile-photo/${user.sub}`;
    await repo.update(user.sub, { profile_photo: photoUrl }, user.sub);
    await createAuditLog(c.env.DB, user.sub, 'UPDATE_PROFILE_PHOTO', 'users', user.sub, `User updated profile photo`);

    return c.json({ success: true, url: photoUrl });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

export default users;
