import { Hono } from 'hono';
import { Env, JwtPayload } from '../../types';
import { CertificatesRepository } from './certificates.repository';
import { CertificatesService, CertificatesServiceError } from './certificates.service';
import { authMiddleware, requirePermission } from '../../middleware/auth';
import { createAuditLog } from '../../utils/audit';
import { isOwnStudentOrGuardianOf } from '../../utils/student-scope';

const certificates = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();

certificates.use('*', authMiddleware);

function getService(c: any): CertificatesService {
  return new CertificatesService(new CertificatesRepository(c.env.DB));
}

function handleError(c: any, e: any) {
  const statusCode = e instanceof CertificatesServiceError ? e.statusCode : 400;
  return c.json({ error: e.message }, statusCode as any);
}

// `ownStudentId`, when given, allows a second path in: a student viewing
// their own certificates, or a parent viewing their own child's - without
// granting them the broader staff-level certificates.view permission (which
// would let them browse every student's certificates, not just their own).
async function requireCertAccess(c: any, ownStudentId?: string): Promise<boolean> {
  const user = c.get('user') as JwtPayload;
  const roles = (user.roles || (user.role ? [user.role] : [])).map((r: string) => r.toLowerCase());
  if (roles.includes('super_admin')) return true;
  const { UserRepository } = await import('../users/users.repository');
  const permissions = await new UserRepository(c.env.DB).getUserPermissions(user.sub);
  if (permissions.includes('certificates.view') || permissions.includes('certificates.manage')) return true;

  if (ownStudentId) {
    return isOwnStudentOrGuardianOf(c.env.DB, user, ownStudentId);
  }
  return false;
}

// GET /certificates/templates?type=
certificates.get('/templates', async (c) => {
  const user = c.get('user');
  if (!(await requireCertAccess(c))) return c.json({ error: 'Forbidden' }, 403);
  const type = c.req.query('type');
  const service = getService(c);
  return c.json(await service.listTemplates(user.institution_id, type));
});

certificates.post('/templates', requirePermission('certificates.manage'), async (c) => {
  const user = c.get('user');
  const service = getService(c);
  const body = await c.req.json();
  try {
    const id = await service.createTemplate(user.institution_id, body, user.sub);
    await createAuditLog(c.env.DB, { institutionId: user.institution_id, userId: user.sub, module: 'CERTIFICATES', action: 'CREATE_TEMPLATE', entityType: 'certificate_templates', entityId: id, afterData: { name: body.name, type: body.type } });
    return c.json({ id }, 201);
  } catch (e: any) {
    return handleError(c, e);
  }
});

certificates.put('/templates/:id', requirePermission('certificates.manage'), async (c) => {
  const user = c.get('user');
  const service = getService(c);
  const id = c.req.param('id')!;
  const body = await c.req.json();
  try {
    await service.updateTemplate(user.institution_id, id, body, user.sub);
    return c.json({ success: true });
  } catch (e: any) {
    return handleError(c, e);
  }
});

certificates.delete('/templates/:id', requirePermission('certificates.manage'), async (c) => {
  const user = c.get('user');
  const service = getService(c);
  const id = c.req.param('id')!;
  try {
    await service.deleteTemplate(user.institution_id, id);
    return c.json({ success: true });
  } catch (e: any) {
    return handleError(c, e);
  }
});

// POST /certificates/preview — render without recording an issuance (for the template editor / print preview)
certificates.post('/preview', async (c) => {
  const user = c.get('user');
  const { templateId, studentId } = await c.req.json();
  if (!templateId || !studentId) return c.json({ error: 'templateId and studentId are required' }, 400);
  if (!(await requireCertAccess(c, studentId))) return c.json({ error: 'Forbidden' }, 403);
  const service = getService(c);
  try {
    const html = await service.previewCertificate(templateId, studentId, user.institution_id);
    return c.json({ html });
  } catch (e: any) {
    return handleError(c, e);
  }
});

// POST /certificates/issue — renders and records a permanent issuance record with a reference number
certificates.post('/issue', async (c) => {
  const user = c.get('user');
  if (!(await requireCertAccess(c))) return c.json({ error: 'Forbidden' }, 403);
  const service = getService(c);
  const { templateId, studentId } = await c.req.json();
  if (!templateId || !studentId) return c.json({ error: 'templateId and studentId are required' }, 400);
  try {
    const result = await service.issueCertificate(templateId, studentId, user.institution_id, user.sub);
    await createAuditLog(c.env.DB, { institutionId: user.institution_id, userId: user.sub, module: 'CERTIFICATES', action: 'ISSUE_CERTIFICATE', entityType: 'certificate_issuances', entityId: result.issuance_id, afterData: { templateId, studentId, referenceNumber: result.reference_number } });
    return c.json(result, 201);
  } catch (e: any) {
    return handleError(c, e);
  }
});

// GET /certificates/issuances/:studentId — issuance history for a student
certificates.get('/issuances/:studentId', async (c) => {
  const user = c.get('user');
  const studentId = c.req.param('studentId')!;
  if (!(await requireCertAccess(c, studentId))) return c.json({ error: 'Forbidden' }, 403);
  const service = getService(c);
  return c.json(await service.listIssuances(studentId, user.institution_id));
});

export default certificates;
