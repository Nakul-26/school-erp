import { Hono } from 'hono';
import { Env, JwtPayload } from '../../types';
import { AnnouncementRepository } from './announcements.repository';
import { AnnouncementService } from './announcements.service';
import { authMiddleware, requireRole } from '../../middleware/auth';
import { createAuditLog } from '../../utils/audit';

const announcements = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();

announcements.use('*', authMiddleware);

function userRoles(user: JwtPayload): string[] {
  return user.roles || (user.role ? [user.role] : []);
}

function hasAnyRole(user: JwtPayload, roles: string[]): boolean {
  return userRoles(user).some((role) => roles.includes(role));
}

async function canViewAnnouncementSection(db: D1Database, user: JwtPayload, sectionId: string): Promise<boolean> {
  if (hasAnyRole(user, ['super_admin', 'Super Admin', 'admin', 'Admin', 'Principal', 'HOD', 'hod', 'Teacher', 'teacher'])) {
    return true;
  }

  if (hasAnyRole(user, ['student', 'Student'])) {
    const enrolled = await db.prepare(`
      SELECT 1
      FROM student_enrollments se
      JOIN students s ON s.id = se.student_id
      WHERE s.user_id = ? AND s.institution_id = ? AND se.section_id = ?
        AND s.is_active = 1 AND se.is_active = 1
    `).bind(user.sub, user.institution_id, sectionId).first();
    return Boolean(enrolled);
  }

  if (hasAnyRole(user, ['parent', 'Parent', 'guardian', 'Guardian'])) {
    const linked = await db.prepare(`
      SELECT 1
      FROM guardians g
      JOIN students s ON s.id = g.student_id
      JOIN student_enrollments se ON se.student_id = s.id
      WHERE g.user_id = ? AND s.institution_id = ? AND se.section_id = ?
        AND g.is_active = 1 AND s.is_active = 1 AND se.is_active = 1
    `).bind(user.sub, user.institution_id, sectionId).first();
    return Boolean(linked);
  }

  return false;
}

announcements.get('/', async (c) => {
  const user = c.get('user');
  const userRoles = user.roles || (user.role ? [user.role] : []);
  const sectionId = c.req.query('section_id');

  if (sectionId && !(await canViewAnnouncementSection(c.env.DB, user, sectionId))) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const repo = new AnnouncementRepository(c.env.DB);
  const service = new AnnouncementService(repo);
  const results = await service.listAnnouncements(user.institution_id, userRoles, sectionId);
  return c.json(results);
});

announcements.get('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  
  const repo = new AnnouncementRepository(c.env.DB);
  const service = new AnnouncementService(repo);
  const result = await service.getAnnouncement(id);
  
  if (!result || result.institution_id !== user.institution_id) {
    return c.json({ error: 'Announcement not found' }, 404);
  }
  return c.json(result);
});

announcements.post('/', requireRole('admin', 'super_admin', 'Principal', 'HOD', 'Teacher'), async (c) => {
  const user = c.get('user');
  const input = await c.req.json();
  
  const repo = new AnnouncementRepository(c.env.DB);
  const service = new AnnouncementService(repo);
  
  try {
    const id = await service.createAnnouncement(user.institution_id, input, user.sub);
    await createAuditLog(
      c.env.DB, 
      user.sub, 
      'CREATE_ANNOUNCEMENT', 
      'announcements', 
      id, 
      `Created announcement: ${input.title}`
    );
    return c.json({ id }, 201);
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

announcements.put('/:id', requireRole('admin', 'super_admin', 'Principal', 'HOD', 'Teacher'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const input = await c.req.json();
  
  const repo = new AnnouncementRepository(c.env.DB);
  const service = new AnnouncementService(repo);
  
  const existing = await service.getAnnouncement(id);
  if (!existing || existing.institution_id !== user.institution_id) {
    return c.json({ error: 'Announcement not found' }, 404);
  }
  
  try {
    await service.updateAnnouncement(id, input, user.sub);
    await createAuditLog(
      c.env.DB, 
      user.sub, 
      'UPDATE_ANNOUNCEMENT', 
      'announcements', 
      id, 
      `Updated announcement: ${existing.title}`
    );
    return c.json({ success: true });
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

announcements.delete('/:id', requireRole('admin', 'super_admin', 'Principal', 'HOD', 'Teacher'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  
  const repo = new AnnouncementRepository(c.env.DB);
  const service = new AnnouncementService(repo);
  
  const existing = await service.getAnnouncement(id);
  if (!existing || existing.institution_id !== user.institution_id) {
    return c.json({ error: 'Announcement not found' }, 404);
  }
  
  await service.deleteAnnouncement(id, user.sub);
  await createAuditLog(
    c.env.DB, 
    user.sub, 
    'DELETE_ANNOUNCEMENT', 
    'announcements', 
    id, 
    `Deleted announcement`
  );
  return c.json({ success: true });
});

export default announcements;
