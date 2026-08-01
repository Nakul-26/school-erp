import { Hono } from 'hono';
import { Env, JwtPayload } from '../../types';
import { SemesterRepository } from './semesters.repository';
import { SemesterService, SemesterServiceError } from './semesters.service';
import { authMiddleware, requirePermission } from '../../middleware/auth';
import { createAuditLog } from '../../utils/audit';

const semesters = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();

semesters.use('*', authMiddleware);

semesters.get('/', async (c) => {
  const user = c.get('user');
  const filters = {
    course_id: c.req.query('course_id') || undefined,
    academic_year_id: c.req.query('academic_year_id') || undefined,
    status: (c.req.query('status') as any) || undefined,
    is_active: c.req.query('is_active') || undefined,
  };
  const repo = new SemesterRepository(c.env.DB);
  const service = new SemesterService(repo, c.env.DB);
  const results = await service.listSemesters(user.institution_id, filters);
  return c.json(results);
});

semesters.get('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const repo = new SemesterRepository(c.env.DB);
  const service = new SemesterService(repo, c.env.DB);
  const result = await service.getSemester(id);

  if (!result || result.institution_id !== user.institution_id) {
    return c.json({ error: 'Semester not found' }, 404);
  }
  return c.json(result);
});

semesters.post('/', requirePermission('academic.manage'), async (c) => {
  const user = c.get('user');
  const input = await c.req.json();
  const repo = new SemesterRepository(c.env.DB);
  const service = new SemesterService(repo, c.env.DB);

  try {
    const id = await service.createSemester(user.institution_id, input, user.sub);
    await createAuditLog(c.env.DB, user.sub, 'CREATE_SEMESTER', 'semesters', id, `Created semester ${input.semester_number} for program`);
    return c.json({ id }, 201);
  } catch (e: any) {
    const status = e instanceof SemesterServiceError ? e.statusCode : 400;
    return c.json({ error: e.message }, status as any);
  }
});

semesters.put('/:id', requirePermission('academic.manage'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const input = await c.req.json();
  const repo = new SemesterRepository(c.env.DB);
  const service = new SemesterService(repo, c.env.DB);

  const existing = await service.getSemester(id);
  if (!existing || existing.institution_id !== user.institution_id) {
    return c.json({ error: 'Semester not found' }, 404);
  }

  try {
    await service.updateSemester(id, input, user.sub);
    await createAuditLog(c.env.DB, user.sub, 'UPDATE_SEMESTER', 'semesters', id, `Updated semester ${existing.semester_number}`);
    return c.json({ success: true });
  } catch (e: any) {
    const status = e instanceof SemesterServiceError ? e.statusCode : 400;
    return c.json({ error: e.message }, status as any);
  }
});

semesters.patch('/:id/status', requirePermission('academic.manage'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const { status } = await c.req.json();
  const repo = new SemesterRepository(c.env.DB);
  const service = new SemesterService(repo, c.env.DB);

  const existing = await service.getSemester(id);
  if (!existing || existing.institution_id !== user.institution_id) {
    return c.json({ error: 'Semester not found' }, 404);
  }

  try {
    await service.updateStatus(id, status, user.sub);
    await createAuditLog(c.env.DB, user.sub, 'UPDATE_SEMESTER_STATUS', 'semesters', id, `Set semester ${existing.semester_number} status to ${status}`);
    return c.json({ success: true });
  } catch (e: any) {
    const status2 = e instanceof SemesterServiceError ? e.statusCode : 400;
    return c.json({ error: e.message }, status2 as any);
  }
});

semesters.delete('/:id', requirePermission('academic.manage'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const repo = new SemesterRepository(c.env.DB);
  const service = new SemesterService(repo, c.env.DB);

  const existing = await service.getSemester(id);
  if (!existing || existing.institution_id !== user.institution_id) {
    return c.json({ error: 'Semester not found' }, 404);
  }

  try {
    await service.deleteSemester(id, user.sub);
    await createAuditLog(c.env.DB, user.sub, 'DELETE_SEMESTER', 'semesters', id, `Deleted semester ${existing.semester_number}`);
    return c.json({ success: true });
  } catch (e: any) {
    const status = e instanceof SemesterServiceError ? e.statusCode : 400;
    return c.json({ error: e.message }, status as any);
  }
});

export default semesters;
