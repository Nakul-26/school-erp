import { Hono } from 'hono';
import { Env, JwtPayload } from '../../types';
import { BacklogsRepository } from './backlogs.repository';
import { BacklogsService } from './backlogs.service';
import { TranscriptRepository } from '../transcript/transcript.repository';
import { TranscriptService, TranscriptServiceError } from '../transcript/transcript.service';
import { GradesRepository } from '../grades/grades.repository';
import { GradesService } from '../grades/grades.service';
import { authMiddleware } from '../../middleware/auth';

const backlogs = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();

backlogs.use('*', authMiddleware);

const ACADEMIC_STAFF_ROLES = new Set([
  'admin', 'Admin', 'super_admin', 'Super Admin', 'Principal', 'principal', 'HOD', 'hod', 'Teacher', 'teacher',
]);

function hasAcademicStaffRole(user: JwtPayload): boolean {
  const roles = user.roles || (user.role ? [user.role] : []);
  return roles.some((role) => ACADEMIC_STAFF_ROLES.has(role));
}

async function canAccessStudentBacklogs(c: any, user: JwtPayload, studentId: string): Promise<boolean> {
  if (hasAcademicStaffRole(user)) return true;

  const roles = user.roles || (user.role ? [user.role] : []);
  const isStudent = roles.some((r: string) => ['student', 'Student'].includes(r));
  const isParent = roles.some((r: string) => ['parent', 'Parent', 'guardian', 'Guardian'].includes(r));

  if (isStudent) {
    const student = await c.env.DB.prepare(
      'SELECT 1 FROM students WHERE user_id = ? AND id = ? AND institution_id = ? AND is_active = 1'
    ).bind(user.sub, studentId, user.institution_id).first();
    return !!student;
  }
  if (isParent) {
    const linked = await c.env.DB.prepare(`
      SELECT 1 FROM guardians g
      JOIN students s ON s.id = g.student_id
      WHERE g.user_id = ? AND g.student_id = ? AND g.is_active = 1 AND s.institution_id = ? AND s.is_active = 1
      LIMIT 1
    `).bind(user.sub, studentId, user.institution_id).first();
    return !!linked;
  }
  return false;
}

function buildBacklogsService(db: D1Database): BacklogsService {
  const transcriptService = new TranscriptService(new TranscriptRepository(db), new GradesService(new GradesRepository(db)));
  return new BacklogsService(new BacklogsRepository(db), transcriptService);
}

// Course-wide report: every enrolled student who currently has an open (unresolved) backlog.
// Registered before the '/:studentId' route below so 'course' is never captured as a studentId param.
// Staff-only — used to plan supplementary/backlog exams.
backlogs.get('/course/:courseId', async (c) => {
  const user = c.get('user');
  if (!hasAcademicStaffRole(user)) {
    return c.json({ error: 'Forbidden: academic staff role required' }, 403);
  }
  const courseId = c.req.param('courseId')!;

  try {
    const service = buildBacklogsService(c.env.DB);
    const result = await service.getCourseBacklogs(user.institution_id, courseId);
    return c.json(result);
  } catch (e: any) {
    const statusCode = e instanceof TranscriptServiceError ? e.statusCode : 400;
    return c.json({ error: e.message }, statusCode as any);
  }
});

// Single student's open backlogs (student sees own, parent sees linked child, staff see any).
backlogs.get('/:studentId', async (c) => {
  const user = c.get('user');
  const studentId = c.req.param('studentId')!;
  const courseId = c.req.query('courseId');

  if (!courseId) return c.json({ error: 'courseId is required' }, 400);
  if (!(await canAccessStudentBacklogs(c, user, studentId))) {
    return c.json({ error: 'Forbidden: cannot access this student\'s backlog record' }, 403);
  }

  try {
    const service = buildBacklogsService(c.env.DB);
    const result = await service.getStudentBacklogs(studentId, user.institution_id, courseId);
    return c.json({ open_backlogs: result, open_backlog_count: result.length });
  } catch (e: any) {
    const statusCode = e instanceof TranscriptServiceError ? e.statusCode : 400;
    return c.json({ error: e.message }, statusCode as any);
  }
});

export default backlogs;
