import { Hono } from 'hono';
import { Env, JwtPayload } from '../../types';
import { ProgramRepository } from './programs.repository';
import { ProgramService } from './programs.service';
import { authMiddleware, requirePermission } from '../../middleware/auth';
import { createAuditLog } from '../../utils/audit';

const programs = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();

programs.use('*', authMiddleware);

programs.get('/', async (c) => {
  const user = c.get('user');
  const includeArchived = c.req.query('include_archived') === 'true';
  const repo = new ProgramRepository(c.env.DB);
  const service = new ProgramService(repo);
  const results = await service.listPrograms(user.institution_id, includeArchived);
  return c.json(results);
});

programs.get('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const repo = new ProgramRepository(c.env.DB);
  const service = new ProgramService(repo);
  const result = await service.getProgram(id);
  
  if (!result || result.institution_id !== user.institution_id) {
    return c.json({ error: 'Program not found' }, 404);
  }
  return c.json(result);
});

programs.post('/', requirePermission('academic.manage'), async (c) => {
  const user = c.get('user');
  const input = await c.req.json();
  const repo = new ProgramRepository(c.env.DB);
  const service = new ProgramService(repo);
  
  try {
    const id = await service.createProgram(user.institution_id, input, user.sub);
    await createAuditLog(c.env.DB, user.sub, 'CREATE_COURSE', 'courses', id, `Created course: ${input.name} (${input.course_code})`);
    return c.json({ id }, 201);
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

programs.put('/:id', requirePermission('academic.manage'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const input = await c.req.json();
  const repo = new ProgramRepository(c.env.DB);
  const service = new ProgramService(repo);
  
  const existing = await service.getProgram(id);
  if (!existing || existing.institution_id !== user.institution_id) {
    return c.json({ error: 'Program not found' }, 404);
  }
  
  try {
    await service.updateProgram(id, input, user.sub);
    await createAuditLog(c.env.DB, user.sub, 'UPDATE_COURSE', 'courses', id, `Updated course: ${existing.name}`);
    return c.json({ success: true });
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

programs.post('/:id/restore', requirePermission('academic.manage'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const repo = new ProgramRepository(c.env.DB);
  const service = new ProgramService(repo);
  
  const existing = await service.getProgram(id);
  if (!existing || existing.institution_id !== user.institution_id) {
    return c.json({ error: 'Program not found' }, 404);
  }
  
  try {
    await service.restoreProgram(id, user.sub);
    await createAuditLog(c.env.DB, user.sub, 'RESTORE_COURSE', 'courses', id, `Restored course: ${existing.name}`);
    return c.json({ success: true });
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

programs.delete('/:id', requirePermission('academic.manage'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const repo = new ProgramRepository(c.env.DB);
  const service = new ProgramService(repo);
  
  const existing = await service.getProgram(id);
  if (!existing || existing.institution_id !== user.institution_id) {
    return c.json({ error: 'Program not found' }, 404);
  }
  
  try {
    await service.deleteProgram(id, user.sub);
    await createAuditLog(c.env.DB, user.sub, 'ARCHIVE_COURSE', 'courses', id, `Archived course: ${existing.name}`);
    return c.json({ success: true });
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

export default programs;
