import { Hono } from 'hono';
import { Env, JwtPayload } from '../../types';
import { WeeklyTimetableRepository } from './weekly-timetable.repository';
import { WeeklyTimetableService } from './weekly-timetable.service';
import { authMiddleware } from '../../middleware/auth';
import { createAuditLog } from '../../utils/audit';

const timetable = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();

timetable.use('*', authMiddleware);

timetable.get('/', async (c) => {
  const user = c.get('user');
  const sectionId = c.req.query('section_id');
  const teacherId = c.req.query('teacher_id');
  
  const repo = new WeeklyTimetableRepository(c.env.DB);
  const service = new WeeklyTimetableService(repo);
  
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

timetable.get('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const repo = new WeeklyTimetableRepository(c.env.DB);
  const service = new WeeklyTimetableService(repo);
  const result = await service.getEntry(id);
  
  if (!result || result.institution_id !== user.institution_id) {
    return c.json({ error: 'Timetable entry not found' }, 404);
  }
  return c.json(result);
});

timetable.post('/', async (c) => {
  const user = c.get('user');
  const input = await c.req.json();
  const repo = new WeeklyTimetableRepository(c.env.DB);
  const service = new WeeklyTimetableService(repo);
  
  try {
    const id = await service.createEntry(user.institution_id, input, user.sub);
    await createAuditLog(c.env.DB, user.sub, 'CREATE_TIMETABLE_ENTRY', 'weekly-timetable', id, `Created timetable entry for Day: ${input.day_of_week}`);
    return c.json({ id }, 201);
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

timetable.put('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const input = await c.req.json();
  const repo = new WeeklyTimetableRepository(c.env.DB);
  const service = new WeeklyTimetableService(repo);
  
  const existing = await service.getEntry(id);
  if (!existing || existing.institution_id !== user.institution_id) {
    return c.json({ error: 'Timetable entry not found' }, 404);
  }
  
  try {
    await service.updateEntry(id, input, user.sub);
    await createAuditLog(c.env.DB, user.sub, 'UPDATE_TIMETABLE_ENTRY', 'weekly-timetable', id, `Updated timetable entry`);
    return c.json({ success: true });
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

timetable.delete('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const repo = new WeeklyTimetableRepository(c.env.DB);
  const service = new WeeklyTimetableService(repo);
  
  const existing = await service.getEntry(id);
  if (!existing || existing.institution_id !== user.institution_id) {
    return c.json({ error: 'Timetable entry not found' }, 404);
  }
  
  await service.deleteEntry(id, user.sub);
  await createAuditLog(c.env.DB, user.sub, 'DELETE_TIMETABLE_ENTRY', 'weekly-timetable', id, `Deleted timetable entry`);
  return c.json({ success: true });
});

export default timetable;
