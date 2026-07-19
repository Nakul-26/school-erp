import { Hono } from 'hono';
import { Env, JwtPayload } from '../../types';
import { HomeworkRepository } from './homework.repository';
import { HomeworkService } from './homework.service';
import { authMiddleware } from '../../middleware/auth';
import { createAuditLog } from '../../utils/audit';
import { isTeacherOnly, teacherHasSectionAccess, teacherHasSubjectAccess, getTeacherIdForUser } from '../../utils/teacher-scope';

const homework = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();

homework.use('*', authMiddleware);

// Helper for homework management authority validation (permission + resource scope check)
async function checkHomeworkManageAccess(db: D1Database, user: JwtPayload, sectionId: string, subjectId: string, teacherIdToCheck?: string): Promise<boolean> {
  const roles = (user.roles || (user.role ? [user.role] : [])).map(r => r.toLowerCase().replace(' ', '_').replace('role-', ''));
  const isPrivileged = roles.some(r => ['super_admin', 'admin', 'principal'].includes(r));
  if (isPrivileged) return true;

  // 1. Check permission
  const { UserRepository } = await import('../users/users.repository');
  const userRepo = new UserRepository(db);
  const userPermissions = await userRepo.getUserPermissions(user.sub);
  if (!userPermissions.includes('homework.manage')) {
    return false;
  }

  // 2. Check if owner/creator
  const currentTeacherId = await getTeacherIdForUser(db, user);
  if (teacherIdToCheck && currentTeacherId && teacherIdToCheck === currentTeacherId) {
    return true;
  }

  // 3. Check section & subject access
  const hasSection = await teacherHasSectionAccess(db, user, sectionId);
  const hasSubject = await teacherHasSubjectAccess(db, user, subjectId, sectionId);
  return hasSection && hasSubject;
}

homework.get('/', async (c) => {
  const user = c.get('user');
  const sectionId = c.req.query('section_id');
  const subjectId = c.req.query('subject_id');
  const db = c.env.DB;

  const roles = (user.roles || (user.role ? [user.role] : [])).map(r => r.toLowerCase().replace(' ', '_').replace('role-', ''));
  
  const isPrivileged = roles.some(r => ['super_admin', 'admin', 'principal'].includes(r));
  const isTeacher = roles.some(r => ['teacher', 'hod'].includes(r));
  const isStudent = roles.some(r => ['student'].includes(r));
  const isParent = roles.some(r => ['parent', 'guardian'].includes(r));

  let results: any[] = [];
  
  if (isPrivileged) {
    // See all homework, optionally filtered by sectionId / subjectId
    const repo = new HomeworkRepository(db);
    const service = new HomeworkService(repo);
    results = await service.list(user.institution_id, sectionId, subjectId);
  } else if (isTeacher) {
    // See homework they created or homework for their assigned classes/subjects
    const teacherId = await getTeacherIdForUser(db, user);
    if (!teacherId) return c.json([]);

    let query = `
      SELECT h.*, s.subject_name, s.subject_code, t.first_name as teacher_first, t.last_name as teacher_last, sec.name as section_name
      FROM homework h
      JOIN subjects s ON h.subject_id = s.id
      JOIN teachers t ON h.teacher_id = t.id
      JOIN sections sec ON h.section_id = sec.id
      WHERE h.institution_id = ? AND h.is_active = 1
        AND (
          h.teacher_id = ?
          OR EXISTS (
            SELECT 1 FROM teacher_subject_assignments tsa
            WHERE tsa.teacher_id = ? AND tsa.section_id = h.section_id AND tsa.subject_id = h.subject_id AND tsa.is_active = 1
          )
          OR EXISTS (
            SELECT 1 FROM teaching_allocations ta
            WHERE ta.teacher_id = ? AND ta.section_id = h.section_id AND ta.subject_id = h.subject_id AND ta.institution_id = ? AND LOWER(ta.status) = 'active'
          )
        )
    `;
    const params: any[] = [user.institution_id, teacherId, teacherId, teacherId, user.institution_id];
    if (sectionId) {
      query += ` AND h.section_id = ?`;
      params.push(sectionId);
    }
    if (subjectId) {
      query += ` AND h.subject_id = ?`;
      params.push(subjectId);
    }
    query += ` ORDER BY h.due_date ASC, h.created_at DESC`;
    const { results: qRes } = await db.prepare(query).bind(...params).all<any>();
    results = qRes || [];
  } else if (isStudent) {
    // See only homework assigned to: Their class/section, Their enrolled subjects
    const enrollment = await db.prepare(`
      SELECT se.section_id
      FROM student_enrollments se
      JOIN students s ON se.student_id = s.id
      WHERE s.user_id = ? AND se.is_active = 1 AND s.is_active = 1
      LIMIT 1
    `).bind(user.sub).first<{ section_id: string }>();

    if (!enrollment) return c.json([]);

    let query = `
      SELECT h.*, s.subject_name, s.subject_code, t.first_name as teacher_first, t.last_name as teacher_last, sec.name as section_name
      FROM homework h
      JOIN subjects s ON h.subject_id = s.id
      JOIN teachers t ON h.teacher_id = t.id
      JOIN sections sec ON h.section_id = sec.id
      WHERE h.institution_id = ? AND h.is_active = 1 AND h.section_id = ?
    `;
    const params: any[] = [user.institution_id, enrollment.section_id];
    if (subjectId) {
      query += ` AND h.subject_id = ?`;
      params.push(subjectId);
    }
    query += ` ORDER BY h.due_date ASC, h.created_at DESC`;
    const { results: qRes } = await db.prepare(query).bind(...params).all<any>();
    results = qRes || [];
  } else if (isParent) {
    // See only homework for their linked child(ren)
    const { results: childEnrollments } = await db.prepare(`
      SELECT DISTINCT se.section_id
      FROM student_enrollments se
      JOIN guardians g ON se.student_id = g.student_id
      WHERE g.user_id = ? AND se.is_active = 1 AND g.is_active = 1
    `).bind(user.sub).all<{ section_id: string }>();

    const sectionIds = (childEnrollments || []).map(e => e.section_id);
    if (sectionIds.length === 0) return c.json([]);

    const placeholders = sectionIds.map(() => '?').join(', ');
    let query = `
      SELECT h.*, s.subject_name, s.subject_code, t.first_name as teacher_first, t.last_name as teacher_last, sec.name as section_name
      FROM homework h
      JOIN subjects s ON h.subject_id = s.id
      JOIN teachers t ON h.teacher_id = t.id
      JOIN sections sec ON h.section_id = sec.id
      WHERE h.institution_id = ? AND h.is_active = 1 AND h.section_id IN (${placeholders})
    `;
    const params: any[] = [user.institution_id, ...sectionIds];
    if (subjectId) {
      query += ` AND h.subject_id = ?`;
      params.push(subjectId);
    }
    query += ` ORDER BY h.due_date ASC, h.created_at DESC`;
    const { results: qRes } = await db.prepare(query).bind(...params).all<any>();
    results = qRes || [];
  } else {
    return c.json([]);
  }

  return c.json(results);
});

homework.post('/', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const db = c.env.DB;

  const hasAccess = await checkHomeworkManageAccess(db, user, body.section_id, body.subject_id);
  if (!hasAccess) {
    return c.json({ error: 'Forbidden: You do not have permission to manage homework' }, 403);
  }

  const repo = new HomeworkRepository(db);
  const service = new HomeworkService(repo);
  
  try {
    const id = await service.create(user.institution_id, body, user.sub);
    await createAuditLog(db, user.sub, 'CREATE_HOMEWORK', 'homework', id, `Created homework in section ${body.section_id}`);

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

homework.put('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const body = await c.req.json();
  const db = c.env.DB;
  const repo = new HomeworkRepository(db);
  const service = new HomeworkService(repo);
  
  try {
    const existing = await repo.getById(id);
    if (!existing || existing.institution_id !== user.institution_id) {
      return c.json({ error: 'Homework not found' }, 404);
    }

    const hasAccess = await checkHomeworkManageAccess(db, user, existing.section_id, existing.subject_id, existing.teacher_id);
    if (!hasAccess) {
      return c.json({ error: 'Forbidden: You do not have permission to manage this homework' }, 403);
    }
    
    await service.update(id, body.title, body.description, body.due_date, user.sub);
    await createAuditLog(c.env.DB, user.sub, 'UPDATE_HOMEWORK', 'homework', id, `Updated homework`);
    return c.json({ success: true });
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

homework.delete('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const db = c.env.DB;
  const repo = new HomeworkRepository(db);
  const service = new HomeworkService(repo);
  
  try {
    const existing = await repo.getById(id);
    if (!existing || existing.institution_id !== user.institution_id) {
      return c.json({ error: 'Homework not found' }, 404);
    }

    const hasAccess = await checkHomeworkManageAccess(db, user, existing.section_id, existing.subject_id, existing.teacher_id);
    if (!hasAccess) {
      return c.json({ error: 'Forbidden: You do not have permission to manage this homework' }, 403);
    }
    
    await service.delete(id, user.sub);
    await createAuditLog(c.env.DB, user.sub, 'DELETE_HOMEWORK', 'homework', id, `Deleted homework`);
    return c.json({ success: true });
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

export default homework;
