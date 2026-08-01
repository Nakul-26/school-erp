import { Hono } from 'hono';
import { Env, JwtPayload } from '../../types';
import { ElectivesRepository } from './electives.repository';
import { ElectivesService, ElectivesServiceError } from './electives.service';
import { PrerequisitesRepository } from '../prerequisites/prerequisites.repository';
import { PrerequisitesService } from '../prerequisites/prerequisites.service';
import { GradesRepository } from '../grades/grades.repository';
import { GradesService } from '../grades/grades.service';
import { authMiddleware } from '../../middleware/auth';

const electives = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();

electives.use('*', authMiddleware);

const ACADEMIC_STAFF_ROLES = new Set([
  'admin', 'Admin', 'super_admin', 'Super Admin', 'Principal', 'principal', 'HOD', 'hod', 'Teacher', 'teacher',
]);

function hasAcademicStaffRole(user: JwtPayload): boolean {
  const roles = user.roles || (user.role ? [user.role] : []);
  return roles.some((role) => ACADEMIC_STAFF_ROLES.has(role));
}

function isStudentRole(user: JwtPayload): boolean {
  const roles = user.roles || (user.role ? [user.role] : []);
  return roles.some((r: string) => ['student', 'Student'].includes(r));
}

async function resolveOwnStudentId(c: any, user: JwtPayload): Promise<string | null> {
  const row = await c.env.DB.prepare(
    'SELECT id FROM students WHERE user_id = ? AND institution_id = ? AND is_active = 1'
  ).bind(user.sub, user.institution_id).first();
  return row?.id || null;
}

async function canAccessStudentElectives(c: any, user: JwtPayload, studentId: string): Promise<boolean> {
  if (hasAcademicStaffRole(user)) return true;

  const roles = user.roles || (user.role ? [user.role] : []);
  const isParent = roles.some((r: string) => ['parent', 'Parent', 'guardian', 'Guardian'].includes(r));

  if (isStudentRole(user)) {
    const own = await resolveOwnStudentId(c, user);
    return own === studentId;
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

function buildService(db: D1Database): ElectivesService {
  const prerequisitesService = new PrerequisitesService(new PrerequisitesRepository(db), new GradesService(new GradesRepository(db)));
  return new ElectivesService(new ElectivesRepository(db), prerequisitesService);
}

// Subjects offered as electives for a program/semester, with live registration counts.
// If the requester is a student (or staff pass ?studentId=), eligibility/registration flags are annotated.
electives.get('/offerings/:courseId', async (c) => {
  const user = c.get('user');
  const courseId = c.req.param('courseId')!;
  const academicYearId = c.req.query('academicYearId');
  const semester = Number(c.req.query('semester'));

  if (!academicYearId || !semester) {
    return c.json({ error: 'academicYearId and semester are required' }, 400);
  }

  let studentIdForEligibility: string | undefined;
  if (isStudentRole(user)) {
    studentIdForEligibility = (await resolveOwnStudentId(c, user)) || undefined;
  } else if (hasAcademicStaffRole(user)) {
    const queryStudentId = c.req.query('studentId');
    if (queryStudentId) studentIdForEligibility = queryStudentId;
  }

  const service = buildService(c.env.DB);
  const result = await service.listOfferings(user.institution_id, courseId, semester, academicYearId, studentIdForEligibility);
  return c.json(result);
});

// A student's own elective registrations (student/parent/staff, same access model as transcript/backlogs).
electives.get('/my/:studentId', async (c) => {
  const user = c.get('user');
  const studentId = c.req.param('studentId')!;
  const courseId = c.req.query('courseId');

  if (!(await canAccessStudentElectives(c, user, studentId))) {
    return c.json({ error: 'Forbidden: cannot access this student\'s elective registrations' }, 403);
  }

  const service = buildService(c.env.DB);
  const result = await service.listForStudent(user.institution_id, studentId, courseId || undefined);
  return c.json(result);
});

// Staff-only roster of everyone currently registered for a specific elective offering.
electives.get('/roster/:courseId', async (c) => {
  const user = c.get('user');
  if (!hasAcademicStaffRole(user)) {
    return c.json({ error: 'Forbidden: academic staff role required' }, 403);
  }
  const courseId = c.req.param('courseId')!;
  const academicYearId = c.req.query('academicYearId');
  const semester = Number(c.req.query('semester'));
  const subjectId = c.req.query('subjectId');

  if (!academicYearId || !semester || !subjectId) {
    return c.json({ error: 'academicYearId, semester, and subjectId are required' }, 400);
  }

  const service = buildService(c.env.DB);
  const result = await service.listRoster(courseId, academicYearId, semester, subjectId);
  return c.json(result);
});

// Register for an elective. A student registers themselves; staff may register on a student's behalf.
electives.post('/', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();

  let studentId: string | null = null;
  if (isStudentRole(user)) {
    studentId = await resolveOwnStudentId(c, user);
    if (!studentId) return c.json({ error: 'No student profile linked to this account' }, 403);
  } else if (hasAcademicStaffRole(user)) {
    studentId = body.student_id || null;
    if (!studentId) return c.json({ error: 'student_id is required' }, 400);
  } else {
    return c.json({ error: 'Forbidden' }, 403);
  }

  try {
    const service = buildService(c.env.DB);
    const id = await service.registerElective(user.institution_id, studentId, {
      course_id: body.course_id,
      academic_year_id: body.academic_year_id,
      semester: Number(body.semester),
      subject_id: body.subject_id,
    }, user.sub);
    return c.json({ id }, 201);
  } catch (e: any) {
    const status = e instanceof ElectivesServiceError ? e.statusCode : 400;
    return c.json({ error: e.message }, status as any);
  }
});

// Withdraw an elective registration. Student may withdraw their own; staff may withdraw any.
electives.delete('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;

  const repo = new ElectivesRepository(c.env.DB);
  const existing = await repo.findById(id);
  if (!existing || existing.institution_id !== user.institution_id) {
    return c.json({ error: 'Elective registration not found' }, 404);
  }

  if (!hasAcademicStaffRole(user)) {
    if (!isStudentRole(user)) return c.json({ error: 'Forbidden' }, 403);
    const own = await resolveOwnStudentId(c, user);
    if (!own || own !== existing.student_id) return c.json({ error: 'Forbidden' }, 403);
  }

  try {
    const service = buildService(c.env.DB);
    await service.withdrawElective(user.institution_id, id, user.sub);
    return c.json({ success: true });
  } catch (e: any) {
    const status = e instanceof ElectivesServiceError ? e.statusCode : 400;
    return c.json({ error: e.message }, status as any);
  }
});

export default electives;
