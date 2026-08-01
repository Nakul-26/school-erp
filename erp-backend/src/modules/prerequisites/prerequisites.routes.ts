import { Hono } from 'hono';
import { Env, JwtPayload } from '../../types';
import { PrerequisitesRepository } from './prerequisites.repository';
import { PrerequisitesService, PrerequisitesServiceError } from './prerequisites.service';
import { GradesRepository } from '../grades/grades.repository';
import { GradesService } from '../grades/grades.service';
import { authMiddleware, requirePermission } from '../../middleware/auth';
import { createAuditLog } from '../../utils/audit';

const prerequisites = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();

prerequisites.use('*', authMiddleware);

function buildService(db: D1Database): PrerequisitesService {
  return new PrerequisitesService(new PrerequisitesRepository(db), new GradesService(new GradesRepository(db)));
}

// All prerequisite links defined for a program's curriculum.
prerequisites.get('/course/:courseId', async (c) => {
  const user = c.get('user');
  const courseId = c.req.param('courseId')!;
  const service = buildService(c.env.DB);
  const result = await service.listForCourse(user.institution_id, courseId);
  return c.json(result);
});

// Whether a given student currently meets the prerequisites for a subject.
prerequisites.get('/eligibility/:studentId', async (c) => {
  const user = c.get('user');
  const studentId = c.req.param('studentId')!;
  const subjectId = c.req.query('subjectId');
  if (!subjectId) return c.json({ error: 'subjectId is required' }, 400);

  const service = buildService(c.env.DB);
  const result = await service.checkEligibility(studentId, user.institution_id, subjectId);
  return c.json(result);
});

prerequisites.post('/', requirePermission('academic.manage'), async (c) => {
  const user = c.get('user');
  const input = await c.req.json();
  const service = buildService(c.env.DB);

  try {
    const id = await service.addPrerequisite(user.institution_id, input, user.sub);
    await createAuditLog(c.env.DB, user.sub, 'CREATE_PREREQUISITE', 'subject_prerequisites', id, `Linked subject ${input.subject_id} to require ${input.prerequisite_subject_id}`);
    return c.json({ id }, 201);
  } catch (e: any) {
    const status = e instanceof PrerequisitesServiceError ? e.statusCode : 400;
    return c.json({ error: e.message }, status as any);
  }
});

prerequisites.delete('/:id', requirePermission('academic.manage'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const service = buildService(c.env.DB);

  try {
    await service.removePrerequisite(user.institution_id, id);
    await createAuditLog(c.env.DB, user.sub, 'DELETE_PREREQUISITE', 'subject_prerequisites', id, 'Removed prerequisite link');
    return c.json({ success: true });
  } catch (e: any) {
    const status = e instanceof PrerequisitesServiceError ? e.statusCode : 400;
    return c.json({ error: e.message }, status as any);
  }
});

export default prerequisites;
