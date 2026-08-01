import { Hono } from 'hono';
import { Env, JwtPayload } from '../../types';
import { TranscriptRepository } from './transcript.repository';
import { TranscriptService, TranscriptServiceError } from './transcript.service';
import { GradesRepository } from '../grades/grades.repository';
import { GradesService } from '../grades/grades.service';
import { authMiddleware } from '../../middleware/auth';

const transcript = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();

transcript.use('*', authMiddleware);

const ACADEMIC_STAFF_ROLES = new Set([
  'admin', 'Admin', 'super_admin', 'Super Admin', 'Principal', 'principal', 'HOD', 'hod', 'Teacher', 'teacher',
]);

function hasAcademicStaffRole(user: JwtPayload): boolean {
  const roles = user.roles || (user.role ? [user.role] : []);
  return roles.some((role) => ACADEMIC_STAFF_ROLES.has(role));
}

async function canAccessStudentTranscript(c: any, user: JwtPayload, studentId: string): Promise<boolean> {
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

function buildService(db: D1Database): TranscriptService {
  return new TranscriptService(new TranscriptRepository(db), new GradesService(new GradesRepository(db)));
}

// Full transcript: SGPA per semester with data recorded so far, plus CGPA.
transcript.get('/:studentId', async (c) => {
  const user = c.get('user');
  const studentId = c.req.param('studentId')!;
  const courseId = c.req.query('courseId');

  if (!courseId) return c.json({ error: 'courseId is required' }, 400);
  if (!(await canAccessStudentTranscript(c, user, studentId))) {
    return c.json({ error: 'Forbidden: cannot access this student\'s transcript' }, 403);
  }

  try {
    const service = buildService(c.env.DB);
    const result = await service.getTranscript(studentId, user.institution_id, courseId);
    return c.json(result);
  } catch (e: any) {
    const statusCode = e instanceof TranscriptServiceError ? e.statusCode : 400;
    return c.json({ error: e.message }, statusCode as any);
  }
});

// Single-semester SGPA breakdown.
transcript.get('/:studentId/semester', async (c) => {
  const user = c.get('user');
  const studentId = c.req.param('studentId')!;
  const courseId = c.req.query('courseId');
  const academicYearId = c.req.query('academicYearId');
  const semester = Number(c.req.query('semester'));

  if (!courseId || !academicYearId || !semester) {
    return c.json({ error: 'courseId, academicYearId, and semester are required' }, 400);
  }
  if (!(await canAccessStudentTranscript(c, user, studentId))) {
    return c.json({ error: 'Forbidden: cannot access this student\'s transcript' }, 403);
  }

  try {
    const service = buildService(c.env.DB);
    const result = await service.getSemesterGpa(studentId, user.institution_id, courseId, academicYearId, semester);
    return c.json(result);
  } catch (e: any) {
    const statusCode = e instanceof TranscriptServiceError ? e.statusCode : 400;
    return c.json({ error: e.message }, statusCode as any);
  }
});

export default transcript;
