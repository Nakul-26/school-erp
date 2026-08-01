import { Hono } from 'hono';
import { Env, JwtPayload } from '../../types';
import { PlacementsRepository } from './placements.repository';
import { PlacementsService, PlacementsServiceError } from './placements.service';
import { TranscriptRepository } from '../transcript/transcript.repository';
import { TranscriptService } from '../transcript/transcript.service';
import { BacklogsRepository } from '../backlogs/backlogs.repository';
import { BacklogsService } from '../backlogs/backlogs.service';
import { GradesRepository } from '../grades/grades.repository';
import { GradesService } from '../grades/grades.service';
import { authMiddleware, requirePermission } from '../../middleware/auth';
import { createAuditLog } from '../../utils/audit';

const placements = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();

placements.use('*', authMiddleware);

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

async function canAccessStudentPlacements(c: any, user: JwtPayload, studentId: string): Promise<boolean> {
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

function buildService(db: D1Database): PlacementsService {
  const transcriptService = new TranscriptService(new TranscriptRepository(db), new GradesService(new GradesRepository(db)));
  const backlogsService = new BacklogsService(new BacklogsRepository(db), transcriptService);
  return new PlacementsService(new PlacementsRepository(db), transcriptService, backlogsService);
}

// ---- Companies ----

placements.get('/companies', async (c) => {
  const user = c.get('user');
  const service = buildService(c.env.DB);
  const result = await service.listCompanies(user.institution_id);
  return c.json(result);
});

placements.post('/companies', requirePermission('academic.manage'), async (c) => {
  const user = c.get('user');
  const input = await c.req.json();
  const service = buildService(c.env.DB);

  try {
    const id = await service.createCompany(user.institution_id, input, user.sub);
    await createAuditLog(c.env.DB, user.sub, 'CREATE_COMPANY', 'companies', id, `Added company ${input.name}`);
    return c.json({ id }, 201);
  } catch (e: any) {
    const status = e instanceof PlacementsServiceError ? e.statusCode : 400;
    return c.json({ error: e.message }, status as any);
  }
});

placements.put('/companies/:id', requirePermission('academic.manage'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const input = await c.req.json();
  const service = buildService(c.env.DB);

  try {
    await service.updateCompany(user.institution_id, id, input, user.sub);
    await createAuditLog(c.env.DB, user.sub, 'UPDATE_COMPANY', 'companies', id, 'Updated company details');
    return c.json({ success: true });
  } catch (e: any) {
    const status = e instanceof PlacementsServiceError ? e.statusCode : 400;
    return c.json({ error: e.message }, status as any);
  }
});

placements.delete('/companies/:id', requirePermission('academic.manage'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const service = buildService(c.env.DB);

  try {
    await service.deleteCompany(user.institution_id, id, user.sub);
    await createAuditLog(c.env.DB, user.sub, 'DELETE_COMPANY', 'companies', id, 'Removed company');
    return c.json({ success: true });
  } catch (e: any) {
    const status = e instanceof PlacementsServiceError ? e.statusCode : 400;
    return c.json({ error: e.message }, status as any);
  }
});

// ---- Drives ----

placements.get('/drives', async (c) => {
  const user = c.get('user');
  const courseId = c.req.query('courseId') || undefined;
  const service = buildService(c.env.DB);
  const result = await service.listDrives(user.institution_id, courseId);
  return c.json(result);
});

placements.post('/drives', requirePermission('academic.manage'), async (c) => {
  const user = c.get('user');
  const input = await c.req.json();
  const service = buildService(c.env.DB);

  try {
    const id = await service.createDrive(user.institution_id, input, user.sub);
    await createAuditLog(c.env.DB, user.sub, 'CREATE_PLACEMENT_DRIVE', 'placement_drives', id, `Created drive ${input.title}`);
    return c.json({ id }, 201);
  } catch (e: any) {
    const status = e instanceof PlacementsServiceError ? e.statusCode : 400;
    return c.json({ error: e.message }, status as any);
  }
});

placements.get('/drives/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const service = buildService(c.env.DB);

  try {
    const result = await service.getDrive(user.institution_id, id);
    return c.json(result);
  } catch (e: any) {
    const status = e instanceof PlacementsServiceError ? e.statusCode : 400;
    return c.json({ error: e.message }, status as any);
  }
});

placements.put('/drives/:id', requirePermission('academic.manage'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const input = await c.req.json();
  const service = buildService(c.env.DB);

  try {
    await service.updateDrive(user.institution_id, id, input, user.sub);
    await createAuditLog(c.env.DB, user.sub, 'UPDATE_PLACEMENT_DRIVE', 'placement_drives', id, 'Updated placement drive');
    return c.json({ success: true });
  } catch (e: any) {
    const status = e instanceof PlacementsServiceError ? e.statusCode : 400;
    return c.json({ error: e.message }, status as any);
  }
});

placements.delete('/drives/:id', requirePermission('academic.manage'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const service = buildService(c.env.DB);

  try {
    await service.deleteDrive(user.institution_id, id, user.sub);
    await createAuditLog(c.env.DB, user.sub, 'DELETE_PLACEMENT_DRIVE', 'placement_drives', id, 'Removed placement drive');
    return c.json({ success: true });
  } catch (e: any) {
    const status = e instanceof PlacementsServiceError ? e.statusCode : 400;
    return c.json({ error: e.message }, status as any);
  }
});

// Whether a given student meets a drive's eligibility criteria (min CGPA / max backlogs).
placements.get('/drives/:id/eligibility', async (c) => {
  const user = c.get('user');
  const driveId = c.req.param('id')!;

  let studentId: string | undefined;
  if (isStudentRole(user)) {
    studentId = (await resolveOwnStudentId(c, user)) || undefined;
  } else {
    studentId = c.req.query('studentId') || undefined;
  }
  if (!studentId) return c.json({ error: 'studentId is required' }, 400);
  if (!(await canAccessStudentPlacements(c, user, studentId))) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  try {
    const service = buildService(c.env.DB);
    const result = await service.checkEligibility(studentId, user.institution_id, driveId);
    return c.json(result);
  } catch (e: any) {
    const status = e instanceof PlacementsServiceError ? e.statusCode : 400;
    return c.json({ error: e.message }, status as any);
  }
});

// Roster of every (non-withdrawn) applicant for a drive — staff only.
placements.get('/drives/:id/applications', async (c) => {
  const user = c.get('user');
  if (!hasAcademicStaffRole(user)) {
    return c.json({ error: 'Forbidden: academic staff role required' }, 403);
  }
  const driveId = c.req.param('id')!;
  const service = buildService(c.env.DB);

  try {
    const result = await service.listApplicationsForDrive(user.institution_id, driveId);
    return c.json(result);
  } catch (e: any) {
    const status = e instanceof PlacementsServiceError ? e.statusCode : 400;
    return c.json({ error: e.message }, status as any);
  }
});

// Apply to a drive. A student applies for themselves; staff may apply on a student's behalf.
placements.post('/drives/:id/apply', async (c) => {
  const user = c.get('user');
  const driveId = c.req.param('id')!;
  const body = await c.req.json().catch(() => ({}));

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
    const id = await service.applyToDrive(user.institution_id, studentId, driveId, user.sub);
    return c.json({ id }, 201);
  } catch (e: any) {
    const status = e instanceof PlacementsServiceError ? e.statusCode : 400;
    return c.json({ error: e.message }, status as any);
  }
});

// A student's own placement applications (student/parent/staff — same access model as transcript/electives).
placements.get('/my/:studentId', async (c) => {
  const user = c.get('user');
  const studentId = c.req.param('studentId')!;

  if (!(await canAccessStudentPlacements(c, user, studentId))) {
    return c.json({ error: 'Forbidden: cannot access this student\'s placement applications' }, 403);
  }

  const service = buildService(c.env.DB);
  const result = await service.listApplicationsForStudent(user.institution_id, studentId);
  return c.json(result);
});

// Staff updates an application's pipeline status (shortlist / interview / offer / reject) or offer details.
placements.patch('/applications/:id', requirePermission('academic.manage'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const input = await c.req.json();
  const service = buildService(c.env.DB);

  try {
    await service.updateApplicationStatus(user.institution_id, id, input, user.sub);
    await createAuditLog(c.env.DB, user.sub, 'UPDATE_PLACEMENT_APPLICATION', 'placement_applications', id, `Set application status to ${input.status || '(unchanged)'}`);
    return c.json({ success: true });
  } catch (e: any) {
    const status = e instanceof PlacementsServiceError ? e.statusCode : 400;
    return c.json({ error: e.message }, status as any);
  }
});

// Withdraw an application. Student may withdraw their own; staff may withdraw any.
placements.delete('/applications/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;

  const repo = new PlacementsRepository(c.env.DB);
  const existing = await repo.findApplicationById(id);
  if (!existing || existing.institution_id !== user.institution_id) {
    return c.json({ error: 'Application not found' }, 404);
  }

  if (!hasAcademicStaffRole(user)) {
    if (!isStudentRole(user)) return c.json({ error: 'Forbidden' }, 403);
    const own = await resolveOwnStudentId(c, user);
    if (!own || own !== existing.student_id) return c.json({ error: 'Forbidden' }, 403);
  }

  try {
    const service = buildService(c.env.DB);
    await service.withdrawApplication(user.institution_id, id, user.sub);
    return c.json({ success: true });
  } catch (e: any) {
    const status = e instanceof PlacementsServiceError ? e.statusCode : 400;
    return c.json({ error: e.message }, status as any);
  }
});

export default placements;
