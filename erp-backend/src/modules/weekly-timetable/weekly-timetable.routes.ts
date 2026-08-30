import { Hono } from 'hono';
import { Env, JwtPayload } from '../../types';
import { WeeklyTimetableRepository } from './weekly-timetable.repository';
import { WeeklyTimetableService } from './weekly-timetable.service';
import { authMiddleware, requirePermission } from '../../middleware/auth';
import { createAuditLog } from '../../utils/audit';
import { isYearLockedOrArchived } from '../../utils/academic-year-lock';
import { isTeacherOnly, getTeacherIdForUser, teacherHasSectionAccess } from '../../utils/teacher-scope';

const timetable = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();

timetable.use('*', authMiddleware);

timetable.get('/', requirePermission('timetable.view'), async (c) => {
  const user = c.get('user');
  let sectionId = c.req.query('section_id');
  let teacherId = c.req.query('teacher_id');
  
  const db = c.env.DB;
  const repo = new WeeklyTimetableRepository(db);
  const service = new WeeklyTimetableService(repo);
  
  if (isTeacherOnly(user)) {
    const assignedTeacherId = await getTeacherIdForUser(db, user);
    if (!assignedTeacherId) return c.json([]);

    if (sectionId) {
      if (!(await teacherHasSectionAccess(db, user, sectionId))) {
        return c.json({ error: 'Forbidden: Section is outside your teaching assignment' }, 403);
      }
    } else if (teacherId) {
      if (teacherId !== assignedTeacherId) {
        return c.json({ error: 'Forbidden: You can only view your own timetable entries' }, 403);
      }
    } else {
      teacherId = assignedTeacherId;
    }
  }

  let results;
  if (sectionId) {
    results = await service.listEntriesBySection(user.institution_id, sectionId);
  } else if (teacherId) {
    results = await service.listEntriesByTeacher(user.institution_id, teacherId);
  } else {
    results = await service.listEntries(user.institution_id);
  }
  
  return c.json(results);
});

timetable.get('/:id', requirePermission('timetable.view'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const db = c.env.DB;
  const repo = new WeeklyTimetableRepository(db);
  const service = new WeeklyTimetableService(repo);
  const result = await service.getEntry(id);
  
  if (!result || result.institution_id !== user.institution_id) {
    return c.json({ error: 'Timetable entry not found' }, 404);
  }

  if (isTeacherOnly(user)) {
    if (!(await teacherHasSectionAccess(db, user, result.section_id))) {
      return c.json({ error: 'Forbidden: Section is outside your teaching assignment' }, 403);
    }
  }

  return c.json(result);
});

timetable.post('/', requirePermission('timetable.manage'), async (c) => {
  const user = c.get('user');
  if (isTeacherOnly(user)) {
    return c.json({ error: 'Forbidden: Teachers cannot modify timetable entries' }, 403);
  }
  const input = await c.req.json();
  const repo = new WeeklyTimetableRepository(c.env.DB);
  const service = new WeeklyTimetableService(repo, c.env.DB);
  
  // Validate academic year is not locked/archived
  const isLocked = await isYearLockedOrArchived(c.env.DB, input.academic_year_id);
  if (isLocked) {
    return c.json({ error: 'This academic year is locked or archived. Modifications are not allowed.' }, 400);
  }
  
  try {
    const id = await service.createEntry(user.institution_id, input, user.sub);
    await createAuditLog(c.env.DB, user.sub, 'CREATE_TIMETABLE_ENTRY', 'weekly-timetable', id, `Created timetable entry for Day: ${input.day_of_week}`);
    return c.json({ id }, 201);
  } catch (e: any) {
    const status = e.statusCode || 400;
    return c.json({ error: e.message }, status as any);
  }
});

timetable.put('/:id', requirePermission('timetable.manage'), async (c) => {
  const user = c.get('user');
  if (isTeacherOnly(user)) {
    return c.json({ error: 'Forbidden: Teachers cannot modify timetable entries' }, 403);
  }
  const id = c.req.param('id')!;
  const input = await c.req.json();
  const repo = new WeeklyTimetableRepository(c.env.DB);
  const service = new WeeklyTimetableService(repo, c.env.DB);
  
  const existing = await service.getEntry(id);
  if (!existing || existing.institution_id !== user.institution_id) {
    return c.json({ error: 'Timetable entry not found' }, 404);
  }

  // Validate academic year is not locked/archived
  const isLockedOld = await isYearLockedOrArchived(c.env.DB, existing.academic_year_id);
  const isLockedNew = input.academic_year_id ? await isYearLockedOrArchived(c.env.DB, input.academic_year_id) : false;
  if (isLockedOld || isLockedNew) {
    return c.json({ error: 'This academic year is locked or archived. Modifications are not allowed.' }, 400);
  }
  
  try {
    await service.updateEntry(id, user.institution_id, input, user.sub);
    await createAuditLog(c.env.DB, user.sub, 'UPDATE_TIMETABLE_ENTRY', 'weekly-timetable', id, `Updated timetable entry`);
    return c.json({ success: true });
  } catch (e: any) {
    const status = e.statusCode || 400;
    return c.json({ error: e.message }, status as any);
  }
});

timetable.delete('/:id', requirePermission('timetable.manage'), async (c) => {
  const user = c.get('user');
  if (isTeacherOnly(user)) {
    return c.json({ error: 'Forbidden: Teachers cannot modify timetable entries' }, 403);
  }
  const id = c.req.param('id')!;
  const repo = new WeeklyTimetableRepository(c.env.DB);
  const service = new WeeklyTimetableService(repo, c.env.DB);
  
  const existing = await service.getEntry(id);
  if (!existing || existing.institution_id !== user.institution_id) {
    return c.json({ error: 'Timetable entry not found' }, 404);
  }

  // Validate academic year is not locked/archived
  const isLocked = await isYearLockedOrArchived(c.env.DB, existing.academic_year_id);
  if (isLocked) {
    return c.json({ error: 'This academic year is locked or archived. Modifications are not allowed.' }, 400);
  }
  
  try {
    await service.deleteEntry(id, user.institution_id, user.sub);
    await createAuditLog(c.env.DB, user.sub, 'DELETE_TIMETABLE_ENTRY', 'weekly-timetable', id, `Deleted timetable entry`);
    return c.json({ success: true });
  } catch (e: any) {
    const status = e.statusCode || 400;
    return c.json({ error: e.message }, status as any);
  }
});

export default timetable;
