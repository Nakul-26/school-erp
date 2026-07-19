import { Hono } from 'hono';
import { AuthService } from './auth.service';
import { UserRepository } from '../users/users.repository';
import { InstitutionRepository } from '../institutions/institutions.repository';
import { authMiddleware } from '../../middleware/auth';
import { rateLimit } from '../../middleware/rate-limit';
import type { Env, JwtPayload } from '../../types';

const auth = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();

const getServices = (c: any) => {
  const userRepo = new UserRepository(c.env.DB);
  const instRepo = new InstitutionRepository(c.env.DB);
  const service = new AuthService(userRepo, instRepo, c.env);
  return { userRepo, instRepo, service };
};

auth.post('/login', rateLimit(10, 15 * 60 * 1000), async (c) => {
  const { service } = getServices(c);
  const { email, password } = await c.req.json();
  try {
    const result = await service.login(email, password);
    return c.json(result);
  } catch (e: any) {
    return c.json({ error: e.message }, 401);
  }
});

auth.post('/register-institution', async (c) => {
  const { service } = getServices(c);
  const data = await c.req.json();
  
  const inviteCode = data.invite_code;
  const secret = c.env.INSTITUTION_INVITE_SECRET;
  if (secret && (!inviteCode || inviteCode !== secret)) {
    return c.json({ error: 'Forbidden: invalid or missing registration invite code' }, 403);
  }

  try {
    const result = await service.registerInstitution(data);
    return c.json(result, 201);
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

auth.get('/me', authMiddleware, async (c) => {
  const tokenUser = c.get('user');
  const { userRepo } = getServices(c);
  const dbUser = await userRepo.findById(tokenUser.sub);
  if (!dbUser) {
    return c.json({ user: tokenUser });
  }
  const permissions = await userRepo.getUserPermissions(dbUser.id);
  return c.json({
    user: {
      id: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      roles: dbUser.roles || [],
      role: dbUser.role || '',
      permissions,
      institution_id: dbUser.institution_id
    }
  });
});

auth.post('/forgot-password', rateLimit(3, 60 * 60 * 1000), async (c) => {
  const { service } = getServices(c);
  const { email } = await c.req.json();
  const result = await service.forgotPassword(email);
  return c.json(result);
});

auth.post('/reset-password', async (c) => {
  const { service } = getServices(c);
  const { token, new_password } = await c.req.json();
  try {
    const result = await service.resetPassword(token, new_password);
    return c.json(result);
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

auth.post('/switch-branch', authMiddleware, async (c) => {
  const user = c.get('user');
  const { institution_id } = await c.req.json();

  if (!institution_id) {
    return c.json({ error: 'institution_id is required' }, 400);
  }

  const userRoles = user.roles || [];
  const isSuperAdmin = userRoles.includes('super_admin') || userRoles.includes('Super Admin');

  if (!isSuperAdmin) {
    return c.json({ error: 'Only super administrators are authorized to toggle institution branches.' }, 403);
  }

  const inst = await c.env.DB.prepare(`
    SELECT name FROM institutions WHERE id = ? AND is_active = 1
  `).bind(institution_id).first<{ name: string }>();

  if (!inst) {
    return c.json({ error: 'Selected branch / institution not found' }, 404);
  }

  const { userRepo, service } = getServices(c);
  const dbUser = await userRepo.findById(user.sub);
  if (!dbUser) {
    return c.json({ error: 'User session not active' }, 404);
  }

  dbUser.institution_id = institution_id;
  dbUser.permissions = await userRepo.getUserPermissions(dbUser.id);
  const newToken = await service.generateToken(dbUser);

  return c.json({
    success: true,
    token: newToken,
    user: {
      ...user,
      institution_id,
      institution_name: inst.name
    }
  });
});

export default auth;
