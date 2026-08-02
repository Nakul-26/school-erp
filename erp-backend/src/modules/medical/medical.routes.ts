import { Hono } from 'hono';
import { Env, JwtPayload } from '../../types';
import { MedicalRepository } from './medical.repository';
import { MedicalService, MedicalServiceError } from './medical.service';
import { authMiddleware, requirePermission } from '../../middleware/auth';
import { createAuditLog } from '../../utils/audit';

const medical = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();

medical.use('*', authMiddleware);

function getService(c: any): MedicalService {
  return new MedicalService(new MedicalRepository(c.env.DB));
}

function handleError(c: any, e: any) {
  const statusCode = e instanceof MedicalServiceError ? e.statusCode : 400;
  return c.json({ error: e.message }, statusCode as any);
}

function hasMedicalStaffPermission(user: JwtPayload, permissions: string[], perm: string): boolean {
  const roles = user.roles || (user.role ? [user.role] : []);
  if (roles.some((r: string) => ['super_admin', 'Super Admin'].includes(r))) return true;
  return permissions.includes(perm);
}

async function canViewStudentMedical(c: any, user: JwtPayload, studentId: string, userPermissions: string[]): Promise<boolean> {
  if (hasMedicalStaffPermission(user, userPermissions, 'medical.view')) return true;

  const roles = user.roles || (user.role ? [user.role] : []);
  const isStudent = roles.some((r: string) => ['student', 'Student'].includes(r));
  const isParent = roles.some((r: string) => ['parent', 'Parent', 'guardian', 'Guardian'].includes(r));

  if (isStudent) {
    const row = await c.env.DB.prepare(
      'SELECT 1 FROM students WHERE user_id = ? AND id = ? AND institution_id = ? AND is_active = 1'
    ).bind(user.sub, studentId, user.institution_id).first();
    return !!row;
  }
  if (isParent) {
    const row = await c.env.DB.prepare(`
      SELECT 1 FROM guardians g JOIN students s ON s.id = g.student_id
      WHERE g.user_id = ? AND g.student_id = ? AND g.is_active = 1 AND s.institution_id = ? AND s.is_active = 1
    `).bind(user.sub, studentId, user.institution_id).first();
    return !!row;
  }
  return false;
}

async function getUserPermissions(c: any, user: JwtPayload): Promise<string[]> {
  const { UserRepository } = await import('../users/users.repository');
  const repo = new UserRepository(c.env.DB);
  return repo.getUserPermissions(user.sub);
}

// GET /medical/:studentId/summary — self/parent/staff-with-medical.view
medical.get('/:studentId/summary', async (c) => {
  const user = c.get('user');
  const studentId = c.req.param('studentId');
  const permissions = await getUserPermissions(c, user);

  if (!(await canViewStudentMedical(c, user, studentId, permissions))) {
    return c.json({ error: "Forbidden: cannot access this student's medical record" }, 403);
  }

  try {
    const service = getService(c);
    const summary = await service.getSummary(studentId, user.institution_id);
    return c.json(summary);
  } catch (e: any) {
    return handleError(c, e);
  }
});

// ==================== VISITS ==================== //

medical.post('/:studentId/visits', requirePermission('medical.manage'), async (c) => {
  const user = c.get('user');
  const studentId = c.req.param('studentId');
  const body = await c.req.json();
  try {
    const service = getService(c);
    const id = await service.addVisit(studentId, user.institution_id, body, user.sub);
    await createAuditLog(c.env.DB, { institutionId: user.institution_id, userId: user.sub, module: 'MEDICAL', action: 'ADD_HEALTH_VISIT', entityType: 'student_health_visits', entityId: id, afterData: body });
    return c.json({ id }, 201);
  } catch (e: any) {
    return handleError(c, e);
  }
});

medical.delete('/visits/:id', requirePermission('medical.manage'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  await getService(c).deleteVisit(user.institution_id, id);
  return c.json({ success: true });
});

// ==================== IMMUNIZATIONS ==================== //

medical.post('/:studentId/immunizations', requirePermission('medical.manage'), async (c) => {
  const user = c.get('user');
  const studentId = c.req.param('studentId');
  const body = await c.req.json();
  try {
    const service = getService(c);
    const id = await service.addImmunization(studentId, user.institution_id, body, user.sub);
    await createAuditLog(c.env.DB, { institutionId: user.institution_id, userId: user.sub, module: 'MEDICAL', action: 'ADD_IMMUNIZATION', entityType: 'student_immunizations', entityId: id, afterData: body });
    return c.json({ id }, 201);
  } catch (e: any) {
    return handleError(c, e);
  }
});

medical.delete('/immunizations/:id', requirePermission('medical.manage'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  await getService(c).deleteImmunization(user.institution_id, id);
  return c.json({ success: true });
});

// ==================== INCIDENTS ==================== //

medical.post('/:studentId/incidents', requirePermission('medical.manage'), async (c) => {
  const user = c.get('user');
  const studentId = c.req.param('studentId');
  const body = await c.req.json();
  try {
    const service = getService(c);
    const id = await service.addIncident(studentId, user.institution_id, body, user.sub);
    await createAuditLog(c.env.DB, { institutionId: user.institution_id, userId: user.sub, module: 'MEDICAL', action: 'ADD_HEALTH_INCIDENT', entityType: 'student_health_incidents', entityId: id, afterData: body });
    return c.json({ id }, 201);
  } catch (e: any) {
    return handleError(c, e);
  }
});

medical.delete('/incidents/:id', requirePermission('medical.manage'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  await getService(c).deleteIncident(user.institution_id, id);
  return c.json({ success: true });
});

export default medical;
