import { Hono } from 'hono';
import { Env, JwtPayload } from '../../types';
import { ProgramRepository } from './programs.repository';
import { ProgramService, ProgramServiceError } from './programs.service';
import { authMiddleware, requirePermission } from '../../middleware/auth';
import { createAuditLog } from '../../utils/audit';

const programs = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();

programs.use('*', authMiddleware);

const STAFF_ROLES = new Set([
  'admin',
  'Admin',
  'super_admin',
  'Super Admin',
  'Principal',
  'principal',
  'HOD',
  'hod',
  'Teacher',
  'teacher',
  'Accountant',
  'accountant',
]);

function hasStaffRole(user: JwtPayload): boolean {
  const roles = user.roles || (user.role ? [user.role] : []);
  return roles.some((role) => STAFF_ROLES.has(role));
}

programs.use('*', async (c, next) => {
  const user = c.get('user');
  if (!hasStaffRole(user)) {
    return c.json({ error: 'Forbidden' }, 403);
  }
  await next();
});

programs.get('/', async (c) => {
  const user = c.get('user');
  const includeArchived = c.req.query('include_archived') === 'true';
  const search = c.req.query('search');
  const status = c.req.query('status') as 'ACTIVE' | 'ARCHIVED' | 'ALL' | undefined;
  const degree_type = c.req.query('degree_type');
  const department_id = c.req.query('department_id');

  const repo = new ProgramRepository(c.env.DB);
  const service = new ProgramService(repo);
  const results = await service.listPrograms(user.institution_id, {
    includeArchived,
    search,
    status,
    degree_type,
    department_id
  });
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

programs.get('/:id/dependencies', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const repo = new ProgramRepository(c.env.DB);
  const service = new ProgramService(repo);

  const existing = await service.getProgram(id);
  if (!existing || existing.institution_id !== user.institution_id) {
    return c.json({ error: 'Program not found' }, 404);
  }

  const deps = await service.getDependencies(id);
  return c.json(deps);
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
    const status = e instanceof ProgramServiceError ? e.statusCode : 400;
    return c.json({ error: e.message }, status as any);
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
    const status = e instanceof ProgramServiceError ? e.statusCode : 400;
    return c.json({ error: e.message }, status as any);
  }
});

programs.post('/:id/archive', requirePermission('academic.manage'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const repo = new ProgramRepository(c.env.DB);
  const service = new ProgramService(repo);
  
  const existing = await service.getProgram(id);
  if (!existing || existing.institution_id !== user.institution_id) {
    return c.json({ error: 'Program not found' }, 404);
  }
  
  try {
    await service.archiveProgram(id, user.sub);
    await createAuditLog(c.env.DB, user.sub, 'ARCHIVE_COURSE', 'courses', id, `Archived course: ${existing.name}`);
    return c.json({ success: true });
  } catch (e: any) {
    const status = e instanceof ProgramServiceError ? e.statusCode : 400;
    return c.json({ error: e.message }, status as any);
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
    const status = e instanceof ProgramServiceError ? e.statusCode : 400;
    return c.json({ error: e.message }, status as any);
  }
});

programs.delete('/:id', requirePermission('academic.manage'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const force = c.req.query('force') === 'true';

  const repo = new ProgramRepository(c.env.DB);
  const service = new ProgramService(repo);
  
  const existing = await service.getProgram(id);
  if (!existing || existing.institution_id !== user.institution_id) {
    return c.json({ error: 'Program not found' }, 404);
  }
  
  try {
    await service.deleteProgram(id, user.sub, force);
    await createAuditLog(c.env.DB, user.sub, 'DELETE_COURSE', 'courses', id, `Deleted/Archived course: ${existing.name}`);
    return c.json({ success: true });
  } catch (e: any) {
    const status = e instanceof ProgramServiceError ? e.statusCode : 400;
    return c.json({ error: e.message }, status as any);
  }
});

export default programs;
