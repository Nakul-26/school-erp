import { Hono } from 'hono';
import { sign } from 'hono/jwt';
import type { Env, JwtPayload } from '../types';
import { hashPassword, verifyPassword } from '../utils/password';
import { authMiddleware, requireRole } from '../middleware/auth';
import { sendEmail } from '../utils/email';

const auth = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();

const TOKEN_EXPIRY_SECONDS = 60 * 60 * 24 * 7; // 7 days

// POST /auth/forgot-password
auth.post('/forgot-password', async (c) => {
  const { email } = await c.req.json<{ email: string }>();
  if (!email) return c.json({ error: 'Email required' }, 400);

  const db = c.env.DB;
  const user = await db.prepare('SELECT id, name FROM users WHERE email = ?').bind(email).first<{ id: number; name: string }>();

  if (user) {
    const resetToken = crypto.randomUUID();
    const expiry = new Date(Date.now() + 3600000).toISOString(); // 1 hour

    await db.prepare('UPDATE users SET reset_token = ?, reset_expires = ? WHERE id = ?')
      .bind(resetToken, expiry, user.id)
      .run();

    // In a real app, this URL would point to your frontend
    const resetUrl = `http://localhost:5173/reset-password?token=${resetToken}`;

    await sendEmail(c.env, {
      to: email,
      subject: 'Password Reset Request',
      html: `<p>Hi ${user.name},</p><p>You requested a password reset. Click the link below to reset it:</p><a href="${resetUrl}">${resetUrl}</a><p>This link expires in 1 hour.</p>`,
    });
  }

  // Always return success to avoid user enumeration
  return c.json({ message: 'If an account exists with that email, a reset link has been sent.' });
});

// POST /auth/reset-password
auth.post('/reset-password', async (c) => {
  const { token, new_password } = await c.req.json<{ token: string; new_password: string }>();
  if (!token || !new_password) return c.json({ error: 'Token and new password required' }, 400);

  const db = c.env.DB;
  const user = await db.prepare('SELECT id, reset_expires FROM users WHERE reset_token = ?')
    .bind(token)
    .first<{ id: number; reset_expires: string }>();

  if (!user || new Date(user.reset_expires) < new Date()) {
    return c.json({ error: 'Invalid or expired token' }, 400);
  }

  const newHash = await hashPassword(new_password);
  await db.prepare('UPDATE users SET password_hash = ?, reset_token = NULL, reset_expires = NULL WHERE id = ?')
    .bind(newHash, user.id)
    .run();

  return c.json({ message: 'Password reset successfully' });
});

// GET /auth/users - admin lists users for their college
auth.get('/users', authMiddleware, requireRole('admin'), async (c) => {
  const user = c.get('user');
  const db = c.env.DB;
  const { results } = await db.prepare('SELECT id, name, email, role, phone, is_active FROM users WHERE college_id = ?')
    .bind(user.college_id)
    .all();
  return c.json(results);
});

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
