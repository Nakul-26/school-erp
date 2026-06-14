import { Hono } from 'hono';
import type { Env, JwtPayload } from '../types';
import { authMiddleware, requireRole } from '../middleware/auth';
import { sendEmail } from '../utils/email';

const comms = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();
comms.use('*', authMiddleware);

// ---------------- Announcements ----------------

comms.get('/announcements', async (c) => {
  const user = c.get('user');
  const sectionId = c.req.query('section_id');

  let query = 'SELECT * FROM announcements WHERE college_id = ?';
  const params: (string | number)[] = [user.college_id];

  // Filtering for students/parents
  if (user.role === 'student' || user.role === 'parent') {
    query += ' AND (target_role = "all" OR target_role = ?)';
    params.push(user.role);
    
    if (sectionId) {
      query += ' AND (target_section_id IS NULL OR target_section_id = ?)';
      params.push(sectionId);
    }
  }

  query += ' ORDER BY created_at DESC';

  const { results } = await c.env.DB.prepare(query).bind(...params).all();
  return c.json({ announcements: results });
});

comms.post('/announcements', requireRole('admin'), async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{
    title: string;
    content: string;
    target_role?: 'all' | 'student' | 'teacher' | 'parent';
    target_section_id?: number;
    send_email?: boolean;
  }>();

  if (!body.title || !body.content) return c.json({ error: 'Title and content required' }, 400);

  const db = c.env.DB;
  const result = await db
    .prepare('INSERT INTO announcements (college_id, title, content, target_role, target_section_id, created_by) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(user.college_id, body.title, body.content, body.target_role ?? 'all', body.target_section_id ?? null, user.sub)
    .run();

  if (body.send_email) {
    // Fetch target emails
    let emailQuery = 'SELECT email FROM users WHERE college_id = ?';
    const emailParams: (string | number)[] = [user.college_id];

    if (body.target_role && body.target_role !== 'all') {
      emailQuery += ' AND role = ?';
      emailParams.push(body.target_role);
    }

    const { results: users } = await db.prepare(emailQuery).bind(...emailParams).all();
    
    // Send emails (batching or loop)
    for (const u of users as { email: string }[]) {
      try {
        await sendEmail(c.env, {
          to: u.email,
          subject: `Announcement: ${body.title}`,
          html: `<p>${body.content}</p>`,
        });
      } catch (e) {
        console.error('Failed to send email to', u.email);
      }
    }
  }

  return c.json({ id: result.meta.last_row_id, ...body }, 201);
});

// POST /comms/test-email
comms.post('/test-email', requireRole('admin'), async (c) => {
  const { to } = await c.req.json<{ to: string }>();
  if (!to) return c.json({ error: 'to address required' }, 400);

  try {
    await sendEmail(c.env, {
      to,
      subject: 'ERP Email Test',
      html: '<h1>Test Successful</h1><p>Your Resend integration is working.</p>',
    });
    return c.json({ success: true });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// ---------------- Notifications ----------------

comms.get('/notifications', async (c) => {
  const user = c.get('user');
  const { results } = await c.env.DB
    .prepare('SELECT * FROM notifications WHERE user_id = ? AND college_id = ? ORDER BY created_at DESC')
    .bind(user.sub, user.college_id)
    .all();
  return c.json({ notifications: results });
});

comms.patch('/notifications/:id/read', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');

  await c.env.DB
    .prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ? AND college_id = ?')
    .bind(id, user.sub, user.college_id)
    .run();

  return c.json({ success: true });
});

// Helper to send notification (internal use or via admin)
comms.post('/notifications', requireRole('admin'), async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{ user_id: number; title: string; message: string; type?: string }>();

  await c.env.DB
    .prepare('INSERT INTO notifications (college_id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)')
    .bind(user.college_id, body.user_id, body.title, body.message, body.type ?? 'info')
    .run();

  return c.json({ success: true }, 201);
});

export default comms;
