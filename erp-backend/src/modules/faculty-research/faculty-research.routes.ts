import { Hono } from 'hono';
import { Env, JwtPayload } from '../../types';
import { FacultyResearchRepository } from './faculty-research.repository';
import { FacultyResearchService, FacultyResearchServiceError } from './faculty-research.service';
import { authMiddleware } from '../../middleware/auth';
import { createAuditLog } from '../../utils/audit';
import { isTeacherOnly, getTeacherIdForUser } from '../../utils/teacher-scope';

const facultyResearch = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();

facultyResearch.use('*', authMiddleware);

function getService(c: any): FacultyResearchService {
  return new FacultyResearchService(new FacultyResearchRepository(c.env.DB));
}

function handleError(c: any, e: any) {
  const statusCode = e instanceof FacultyResearchServiceError ? e.statusCode : 400;
  return c.json({ error: e.message }, statusCode as any);
}

facultyResearch.get('/', async (c) => {
  const user = c.get('user');
  const service = getService(c);
  const perms = user.permissions || [];

  if (perms.includes('faculty_research.view') || perms.includes('faculty_research.manage')) {
    return c.json(await service.listForInstitution(user.institution_id));
  }
  return c.json({ error: 'Forbidden: missing faculty_research.view permission' }, 403);
});

// A teacher's own publications, or any teacher's for staff with faculty_research.view/manage.
facultyResearch.get('/teacher/:teacherId', async (c) => {
  const user = c.get('user');
  const teacherId = c.req.param('teacherId')!;
  const service = getService(c);
  const perms = user.permissions || [];

  if (isTeacherOnly(user)) {
    const currentTeacherId = await getTeacherIdForUser(c.env.DB, user);
    if (currentTeacherId !== teacherId && !perms.includes('faculty_research.view') && !perms.includes('faculty_research.manage')) {
      return c.json({ error: 'Forbidden: cannot view another teacher’s research records' }, 403);
    }
  } else if (!perms.includes('faculty_research.view') && !perms.includes('faculty_research.manage')) {
    return c.json({ error: 'Forbidden: missing faculty_research.view permission' }, 403);
  }

  return c.json(await service.listForTeacher(teacherId, user.institution_id));
});

facultyResearch.post('/', async (c) => {
  const user = c.get('user');
  const service = getService(c);
  const body = await c.req.json();
  const perms = user.permissions || [];

  if (isTeacherOnly(user)) {
    const currentTeacherId = await getTeacherIdForUser(c.env.DB, user);
    if (!currentTeacherId) return c.json({ error: 'Forbidden: Teacher profile not found for current user' }, 403);
    body.teacher_id = currentTeacherId;
  } else if (!perms.includes('faculty_research.manage')) {
    return c.json({ error: 'Forbidden: missing faculty_research.manage permission' }, 403);
  }

  try {
    const id = await service.create(user.institution_id, body, user.sub);
    await createAuditLog(c.env.DB, { institutionId: user.institution_id, userId: user.sub, module: 'FACULTY_RESEARCH', action: 'CREATE_PUBLICATION', entityType: 'faculty_publications', entityId: id, afterData: body });
    return c.json({ id }, 201);
  } catch (e: any) {
    return handleError(c, e);
  }
});

facultyResearch.put('/:id', async (c) => {
  const user = c.get('user');
  const service = getService(c);
  const id = c.req.param('id')!;
  const body = await c.req.json();
  const perms = user.permissions || [];

  try {
    const existing = await service.getById(user.institution_id, id);
    if (isTeacherOnly(user)) {
      const currentTeacherId = await getTeacherIdForUser(c.env.DB, user);
      if (currentTeacherId !== existing.teacher_id && !perms.includes('faculty_research.manage')) {
        return c.json({ error: 'Forbidden: you can only edit your own publication records' }, 403);
      }
    } else if (!perms.includes('faculty_research.manage')) {
      return c.json({ error: 'Forbidden: missing faculty_research.manage permission' }, 403);
    }

    await service.update(user.institution_id, id, body, user.sub);
    return c.json({ success: true });
  } catch (e: any) {
    return handleError(c, e);
  }
});

facultyResearch.delete('/:id', async (c) => {
  const user = c.get('user');
  const service = getService(c);
  const id = c.req.param('id')!;
  const perms = user.permissions || [];

  try {
    const existing = await service.getById(user.institution_id, id);
    if (isTeacherOnly(user)) {
      const currentTeacherId = await getTeacherIdForUser(c.env.DB, user);
      if (currentTeacherId !== existing.teacher_id && !perms.includes('faculty_research.manage')) {
        return c.json({ error: 'Forbidden: you can only delete your own publication records' }, 403);
      }
    } else if (!perms.includes('faculty_research.manage')) {
      return c.json({ error: 'Forbidden: missing faculty_research.manage permission' }, 403);
    }

    await service.delete(user.institution_id, id, user.sub);
    await createAuditLog(c.env.DB, { institutionId: user.institution_id, userId: user.sub, module: 'FACULTY_RESEARCH', action: 'DELETE_PUBLICATION', entityType: 'faculty_publications', entityId: id });
    return c.json({ success: true });
  } catch (e: any) {
    return handleError(c, e);
  }
});

export default facultyResearch;
