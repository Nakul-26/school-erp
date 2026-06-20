import { Hono } from 'hono';
import { Env, JwtPayload } from '../../types';
import { TimetableSlotRepository } from './timetable-slots.repository';
import { TimetableSlotService } from './timetable-slots.service';
import { authMiddleware } from '../../middleware/auth';
import { createAuditLog } from '../../utils/audit';

const slots = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();

slots.use('*', authMiddleware);

slots.get('/', async (c) => {
  const user = c.get('user');
  const repo = new TimetableSlotRepository(c.env.DB);
  const service = new TimetableSlotService(repo);
  const results = await service.listSlots(user.institution_id);
  return c.json(results);
});

slots.get('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const repo = new TimetableSlotRepository(c.env.DB);
  const service = new TimetableSlotService(repo);
  const result = await service.getSlot(id);
  
  if (!result || result.institution_id !== user.institution_id) {
    return c.json({ error: 'Slot not found' }, 404);
  }
  return c.json(result);
});

slots.post('/', async (c) => {
  const user = c.get('user');
  const input = await c.req.json();
  const repo = new TimetableSlotRepository(c.env.DB);
  const service = new TimetableSlotService(repo);
  
  try {
    const id = await service.createSlot(user.institution_id, input, user.sub);
    await createAuditLog(c.env.DB, user.sub, 'CREATE_TIMETABLE_SLOT', 'timetable-slots', id, `Created timetable slot: ${input.name} (${input.start_time} - ${input.end_time})`);
    return c.json({ id }, 201);
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

slots.put('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const input = await c.req.json();
  const repo = new TimetableSlotRepository(c.env.DB);
  const service = new TimetableSlotService(repo);
  
  const existing = await service.getSlot(id);
  if (!existing || existing.institution_id !== user.institution_id) {
    return c.json({ error: 'Slot not found' }, 404);
  }
  
  try {
    await service.updateSlot(id, input, user.sub);
    await createAuditLog(c.env.DB, user.sub, 'UPDATE_TIMETABLE_SLOT', 'timetable-slots', id, `Updated timetable slot: ${existing.name}`);
    return c.json({ success: true });
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

slots.delete('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const repo = new TimetableSlotRepository(c.env.DB);
  const service = new TimetableSlotService(repo);
  
  const existing = await service.getSlot(id);
  if (!existing || existing.institution_id !== user.institution_id) {
    return c.json({ error: 'Slot not found' }, 404);
  }
  
  await service.deleteSlot(id, user.sub);
  await createAuditLog(c.env.DB, user.sub, 'DELETE_TIMETABLE_SLOT', 'timetable-slots', id, `Deleted timetable slot: ${existing.name}`);
  return c.json({ success: true });
});

export default slots;
