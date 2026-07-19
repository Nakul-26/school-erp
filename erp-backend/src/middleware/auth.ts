import { Context, Next } from 'hono';
import { verify } from 'hono/jwt';
import type { Env, JwtPayload } from '../types';
import { UserRepository } from '../modules/users/users.repository';

export async function authMiddleware(c: Context<{ Bindings: Env; Variables: { user: JwtPayload } }>, next: Next) {
  let token = '';
  const authHeader = c.req.header('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  } else {
    token = c.req.query('token') || '';
  }

  if (!token) {
    return c.json({ error: 'Missing or invalid Authorization header or token param' }, 401);
  }
  try {
    const payload = (await verify(token, c.env.JWT_SECRET, 'HS256')) as unknown as JwtPayload;
    if (!payload.sub || !payload.institution_id) {
      return c.json({ error: 'Invalid or stale token. Please log in again.' }, 401);
    }
    c.set('user', payload);
    await next();
  } catch (err) {
    return c.json({ error: 'Invalid or expired token' }, 401);
  }
}

export function requireRole(...roles: string[]) {
  return async (c: Context<{ Bindings: Env; Variables: { user: JwtPayload } }>, next: Next) => {
    const user = c.get('user');
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    
    const userRoles = user.roles || (user.role ? [user.role] : []);
    const hasRole = userRoles.some(r => roles.includes(r) || r === 'super_admin' || r === 'Super Admin' || r === 'Principal' || r === 'principal');
    
    if (!hasRole) {
      return c.json({ error: 'Forbidden: insufficient role' }, 403);
    }
    await next();
  };
}

const PERMISSION_CACHE = new Map<string, { permissions: string[]; expiresAt: number }>();
const CACHE_TTL_MS = 30000; // 30 seconds

export function requirePermission(...permissions: string[]) {
  return async (c: Context<{ Bindings: Env; Variables: { user: JwtPayload } }>, next: Next) => {
    const user = c.get('user');
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    // Super Admin gets bypass
    const userRoles = user.roles || (user.role ? [user.role] : []);
    if (userRoles.includes('Super Admin') || userRoles.includes('super_admin') || userRoles.includes('role-super-admin')) {
      return await next();
    }

    const now = Date.now();
    const cacheKey = `${user.institution_id}:${user.sub}`;
    const cached = PERMISSION_CACHE.get(cacheKey);
    let userPermissions: string[];

    if (cached && cached.expiresAt > now) {
      userPermissions = cached.permissions;
    } else {
      const repo = new UserRepository(c.env.DB);
      userPermissions = await repo.getUserPermissions(user.sub);
      PERMISSION_CACHE.set(cacheKey, {
        permissions: userPermissions,
        expiresAt: now + CACHE_TTL_MS
      });
    }
    
    const hasPermission = permissions.every(p => userPermissions.includes(p));
    if (!hasPermission) {
      return c.json({ error: 'Forbidden: insufficient permissions' }, 403);
    }
    await next();
  };
}
