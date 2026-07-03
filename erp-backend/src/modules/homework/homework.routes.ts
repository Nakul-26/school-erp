import { Hono } from 'hono';
import { Env, JwtPayload } from '../../types';
import { HomeworkRepository } from './homework.repository';
import { HomeworkService } from './homework.service';
import { authMiddleware, requireRole } from '../../middleware/auth';
import { createAuditLog } from '../../utils/audit';

const homework = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();

homework.use('*', authMiddleware);

homework.get('/', async (c) => {
  const user = c.get('user');
  const sectionId = c.req.query('section_id');
  const subjectId = c.req.query('subject_id');
  const repo = new HomeworkRepository(c.env.DB);
  const service = new HomeworkService(repo);
  
  const list = await service.list(user.institution_id, sectionId, subjectId);
  return c.json(list);
});

homework.post('/', requireRole('admin', 'super_admin', 'Principal', 'HOD', 'Teacher'), async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const repo = new HomeworkRepository(c.env.DB);
  const service = new HomeworkService(repo);
  
  try {
    const id = await service.create(user.institution_id, body, user.sub);
    await createAuditLog(c.env.DB, user.sub, 'CREATE_HOMEWORK', 'homework', id, `Created homework in section ${body.section_id}`);

    // Send notifications to students and parents in the section
    try {
      const { NotificationRepository } = await import('../notifications/notifications.repository');
      const { NotificationService } = await import('../notifications/notifications.service');
      const notifRepo = new NotificationRepository(c.env.DB);
      const notifService = new NotificationService(notifRepo, c.env.DB);

      // Get subject name for the notification
      const subjectRow = await c.env.DB.prepare(
        'SELECT subject_name FROM subjects WHERE id = ? LIMIT 1'
      ).bind(body.subject_id).first<{ subject_name: string }>();

      await notifService.notifyHomeworkPosted(
        user.institution_id,
        body.section_id,
        subjectRow?.subject_name || 'Subject',
        body.title,
        body.due_date || null,
        c.env
      );
    } catch (notifErr) {
      console.warn('[Homework] Notification dispatch failed (non-fatal):', notifErr);
    }

    return c.json({ id }, 201);
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

homework.put('/:id', requireRole('admin', 'super_admin', 'Principal', 'HOD', 'Teacher'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const body = await c.req.json(); // { title, description, due_date }
  const repo = new HomeworkRepository(c.env.DB);
  const service = new HomeworkService(repo);
  
  try {
    const existing = await repo.getById(id);
    if (!existing || existing.institution_id !== user.institution_id) {
      return c.json({ error: 'Homework not found' }, 404);
    }
    
    await service.update(id, body.title, body.description, body.due_date, user.sub);
    await createAuditLog(c.env.DB, user.sub, 'UPDATE_HOMEWORK', 'homework', id, `Updated homework`);
    return c.json({ success: true });
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

homework.delete('/:id', requireRole('admin', 'super_admin', 'Principal', 'HOD', 'Teacher'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const repo = new HomeworkRepository(c.env.DB);
  const service = new HomeworkService(repo);
  
  try {
    const existing = await repo.getById(id);
    if (!existing || existing.institution_id !== user.institution_id) {
      return c.json({ error: 'Homework not found' }, 404);
    }
    
    await service.delete(id, user.sub);
    await createAuditLog(c.env.DB, user.sub, 'DELETE_HOMEWORK', 'homework', id, `Deleted homework`);
    return c.json({ success: true });
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

export default homework;
