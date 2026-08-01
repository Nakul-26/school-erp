import { Context, Next } from 'hono';
import { verify } from 'hono/jwt';
import { getCookie } from 'hono/cookie';
import type { Env, JwtPayload } from '../types';
import { UserRepository } from '../modules/users/users.repository';
import { hasAnyRole, normalizeRole, ROLES } from '../utils/roles';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export async function authMiddleware(c: Context<{ Bindings: Env; Variables: { user: JwtPayload } }>, next: Next) {
  let token = '';
  let tokenSource: 'header' | 'cookie' = 'cookie';
  const authHeader = c.req.header('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7);
    tokenSource = 'header';
  } else {
    token = getCookie(c, 'erp_token') || '';
    tokenSource = 'cookie';
  }

  if (!token) {
    return c.json({ error: 'Missing or invalid Authorization header or session cookie' }, 401);
  }
  try {
    const payload = (await verify(token, c.env.JWT_SECRET, 'HS256')) as unknown as JwtPayload;
    if (!payload.sub || !payload.institution_id) {
      return c.json({ error: 'Invalid or stale token. Please log in again.' }, 401);
    }

    // Browsers attach cookies automatically, so cookie-authenticated mutating
    // requests need a matching double-submit CSRF token. Header-authenticated
    // requests (Authorization: Bearer) aren't auto-attached by browsers and
    // are not vulnerable to CSRF, so they're exempt.
    if (tokenSource === 'cookie' && MUTATING_METHODS.has(c.req.method)) {
      const csrfCookie = getCookie(c, 'erp_csrf');
      const csrfHeader = c.req.header('X-CSRF-Token');
      if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
        return c.json({ error: 'Missing or invalid CSRF token' }, 403);
      }
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
    const hasRole = hasAnyRole(userRoles, roles);
    
    if (!hasRole) {
      return c.json({ error: 'Forbidden: insufficient role' }, 403);
    }
    await next();
  };
}

export function requirePermission(...permissions: string[]) {
  return async (c: Context<{ Bindings: Env; Variables: { user: JwtPayload } }>, next: Next) => {
    const user = c.get('user');
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    // Super Admin gets bypass
    const userRoles = (user.roles || (user.role ? [user.role] : [])).map(normalizeRole);
    if (userRoles.includes(ROLES.SUPER_ADMIN)) {
      return await next();
    }

    const repo = new UserRepository(c.env.DB);
    const userPermissions = await repo.getUserPermissions(user.sub);
    
    const hasPermission = permissions.every(p => userPermissions.includes(p));
    if (!hasPermission) {
      return c.json({ error: 'Forbidden: insufficient permissions' }, 403);
    }
    await next();
  };
}
