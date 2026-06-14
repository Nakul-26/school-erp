import { Hono } from 'hono';
import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';
import { authMiddleware, requireRole } from '../../middleware/auth';
import type { Env, JwtPayload } from '../../types';

const auth = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();

const getServices = (c: any) => {
  const repo = new AuthRepository(c.env.DB);
  const service = new AuthService(repo, c.env);
  return { repo, service };
};

auth.post('/login', async (c) => {
  const { service } = getServices(c);
  const { email, password } = await c.req.json();
  try {
    const result = await service.login(email, password);
    return c.json(result);
  } catch (e: any) {
    return c.json({ error: e.message }, 401);
  }
});

auth.post('/register-college', async (c) => {
  const { service } = getServices(c);
  const data = await c.req.json();
  try {
    const result = await service.registerCollege(data);
    return c.json(result, 201);
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

auth.get('/me', authMiddleware, async (c) => {
  return c.json({ user: c.get('user') });
});

auth.post('/forgot-password', async (c) => {
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

auth.get('/users', authMiddleware, requireRole('admin', 'super_admin'), async (c) => {
  const { repo } = getServices(c);
  const user = c.get('user');
  const results = await repo.listUsers(user.college_id);
  return c.json(results);
});

export default auth;
