import { Hono } from 'hono';
import { sign } from 'hono/jwt';
import type { Env, JwtPayload } from '../types';
import { hashPassword, verifyPassword } from '../utils/password';
import { authMiddleware, requireRole } from '../middleware/auth';

const auth = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();

const TOKEN_EXPIRY_SECONDS = 60 * 60 * 24 * 7; // 7 days

// POST /auth/register-college - one-time setup: creates college + first admin
auth.post('/register-college', async (c) => {
  const body = await c.req.json<{
    college_name: string;
    address?: string;
    contact_email?: string;
    contact_phone?: string;
    admin_name: string;
    admin_email: string;
    admin_password: string;
  }>();

  if (!body.college_name || !body.admin_name || !body.admin_email || !body.admin_password) {
    return c.json({ error: 'Missing required fields' }, 400);
  }

  const db = c.env.DB;

  const existing = await db.prepare('SELECT id FROM users WHERE email = ?').bind(body.admin_email).first();
  if (existing) {
    return c.json({ error: 'Email already in use' }, 409);
  }

  const collegeResult = await db
    .prepare('INSERT INTO colleges (name, address, contact_email, contact_phone) VALUES (?, ?, ?, ?)')
    .bind(body.college_name, body.address ?? null, body.contact_email ?? null, body.contact_phone ?? null)
    .run();

  const collegeId = collegeResult.meta.last_row_id as number;
  const passwordHash = await hashPassword(body.admin_password);

  const userResult = await db
    .prepare('INSERT INTO users (college_id, role, name, email, password_hash) VALUES (?, ?, ?, ?, ?)')
    .bind(collegeId, 'admin', body.admin_name, body.admin_email, passwordHash)
    .run();

  const userId = userResult.meta.last_row_id as number;

  const payload: JwtPayload = {
    sub: userId,
    college_id: collegeId,
    role: 'admin',
    email: body.admin_email,
    name: body.admin_name,
    exp: Math.floor(Date.now() / 1000) + TOKEN_EXPIRY_SECONDS,
  };

  const token = await sign(payload, c.env.JWT_SECRET);

  return c.json({
    token,
    user: { id: userId, name: body.admin_name, email: body.admin_email, role: 'admin', college_id: collegeId },
    college: { id: collegeId, name: body.college_name },
  }, 201);
});

// POST /auth/login
auth.post('/login', async (c) => {
  const body = await c.req.json<{ email: string; password: string }>();
  if (!body.email || !body.password) {
    return c.json({ error: 'Email and password required' }, 400);
  }

  const db = c.env.DB;
  const user = await db
    .prepare('SELECT id, college_id, role, name, email, password_hash, is_active FROM users WHERE email = ?')
    .bind(body.email)
    .first<{
      id: number;
      college_id: number;
      role: 'admin' | 'teacher' | 'student' | 'parent';
      name: string;
      email: string;
      password_hash: string;
      is_active: number;
    }>();

  if (!user || !user.is_active) {
    return c.json({ error: 'Invalid credentials' }, 401);
  }

  const valid = await verifyPassword(body.password, user.password_hash);
  if (!valid) {
    return c.json({ error: 'Invalid credentials' }, 401);
  }

  const payload: JwtPayload = {
    sub: user.id,
    college_id: user.college_id,
    role: user.role,
    email: user.email,
    name: user.name,
    exp: Math.floor(Date.now() / 1000) + TOKEN_EXPIRY_SECONDS,
  };

  const token = await sign(payload, c.env.JWT_SECRET);

  return c.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, college_id: user.college_id },
  });
});

// GET /auth/me
auth.get('/me', authMiddleware, async (c) => {
  const user = c.get('user');
  return c.json({ user });
});

// POST /auth/users - admin creates teacher/student/parent accounts
auth.post('/users', authMiddleware, requireRole('admin'), async (c) => {
  const currentUser = c.get('user');
  const body = await c.req.json<{
    name: string;
    email: string;
    password: string;
    role: 'admin' | 'teacher' | 'student' | 'parent';
    phone?: string;
  }>();

  if (!body.name || !body.email || !body.password || !body.role) {
    return c.json({ error: 'Missing required fields' }, 400);
  }
  if (!['admin', 'teacher', 'student', 'parent'].includes(body.role)) {
    return c.json({ error: 'Invalid role' }, 400);
  }

  const db = c.env.DB;
  const existing = await db.prepare('SELECT id FROM users WHERE email = ?').bind(body.email).first();
  if (existing) {
    return c.json({ error: 'Email already in use' }, 409);
  }

  const passwordHash = await hashPassword(body.password);

  const result = await db
    .prepare('INSERT INTO users (college_id, role, name, email, phone, password_hash) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(currentUser.college_id, body.role, body.name, body.email, body.phone ?? null, passwordHash)
    .run();

  return c.json({
    id: result.meta.last_row_id,
    name: body.name,
    email: body.email,
    role: body.role,
  }, 201);
});

// POST /auth/change-password
auth.post('/change-password', authMiddleware, async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{ old_password: string; new_password: string }>();

  if (!body.old_password || !body.new_password) {
    return c.json({ error: 'Missing fields' }, 400);
  }

  const db = c.env.DB;
  const row = await db.prepare('SELECT password_hash FROM users WHERE id = ?').bind(user.sub).first<{ password_hash: string }>();
  if (!row) return c.json({ error: 'User not found' }, 404);

  const valid = await verifyPassword(body.old_password, row.password_hash);
  if (!valid) return c.json({ error: 'Old password incorrect' }, 401);

  const newHash = await hashPassword(body.new_password);
  await db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').bind(newHash, user.sub).run();

  return c.json({ success: true });
});

export default auth;
