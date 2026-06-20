import { Hono } from 'hono';
import { Env, JwtPayload } from '../../types';
import { authMiddleware, requireRole } from '../../middleware/auth';

const roles = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();

roles.use('*', authMiddleware);

roles.get('/', requireRole('admin', 'super_admin', 'Principal'), async (c) => {
  const { results } = await c.env.DB.prepare('SELECT id, name, description FROM roles').all<any>();
  return c.json(results || []);
});

roles.get('/permissions', requireRole('admin', 'super_admin', 'Principal'), async (c) => {
  const { results } = await c.env.DB.prepare('SELECT id, code, description FROM permissions').all<any>();
  return c.json(results || []);
});

export default roles;
