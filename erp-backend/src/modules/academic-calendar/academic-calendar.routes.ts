import { Hono } from 'hono';
import { Env, JwtPayload } from '../../types';
import { AcademicCalendarRepository } from './academic-calendar.repository';
import { AcademicCalendarService } from './academic-calendar.service';
import { authMiddleware } from '../../middleware/auth';
import { createAuditLog } from '../../utils/audit';

const calendar = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();

calendar.use('*', authMiddleware);

calendar.get('/', async (c) => {
  const user = c.get('user');
  const repo = new AcademicCalendarRepository(c.env.DB);
  const service = new AcademicCalendarService(repo);
  const results = await service.listCalendarEntries(user.institution_id);
  return c.json(results);
});

calendar.get('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const repo = new AcademicCalendarRepository(c.env.DB);
  const service = new AcademicCalendarService(repo);
  const result = await service.getCalendarEntry(id);
  
  if (!result || result.institution_id !== user.institution_id) {
    return c.json({ error: 'Entry not found' }, 404);
  }
  return c.json(result);
});

calendar.post('/', async (c) => {
  const user = c.get('user');
  const input = await c.req.json();
  const repo = new AcademicCalendarRepository(c.env.DB);
  const service = new AcademicCalendarService(repo);
  
  try {
    const id = await service.createCalendarEntry(user.institution_id, input, user.sub);
    await createAuditLog(c.env.DB, user.sub, 'CREATE_CALENDAR_ENTRY', 'academic-calendar', id, `Created calendar entry: ${input.name} (${input.type})`);
    return c.json({ id }, 201);
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

calendar.put('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const input = await c.req.json();
  const repo = new AcademicCalendarRepository(c.env.DB);
  const service = new AcademicCalendarService(repo);
  
  const existing = await service.getCalendarEntry(id);
  if (!existing || existing.institution_id !== user.institution_id) {
    return c.json({ error: 'Entry not found' }, 404);
  }
  
  try {
    await service.updateCalendarEntry(id, input, user.sub);
    await createAuditLog(c.env.DB, user.sub, 'UPDATE_CALENDAR_ENTRY', 'academic-calendar', id, `Updated calendar entry: ${existing.name}`);
    return c.json({ success: true });
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

calendar.delete('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const repo = new AcademicCalendarRepository(c.env.DB);
  const service = new AcademicCalendarService(repo);
  
  const existing = await service.getCalendarEntry(id);
  if (!existing || existing.institution_id !== user.institution_id) {
    return c.json({ error: 'Entry not found' }, 404);
  }
  
  await service.deleteCalendarEntry(id, user.sub);
  await createAuditLog(c.env.DB, user.sub, 'DELETE_CALENDAR_ENTRY', 'academic-calendar', id, `Deleted calendar entry: ${existing.name}`);
  return c.json({ success: true });
});

export default calendar;
