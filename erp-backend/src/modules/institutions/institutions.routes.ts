import { Hono } from 'hono';
import { Env, JwtPayload } from '../../types';
import { InstitutionRepository } from './institutions.repository';
import { InstitutionService } from './institutions.service';
import { UserRepository } from '../users/users.repository';
import { MessageTemplatesRepository } from '../message-templates/message-templates.repository';
import { MessageTemplatesService } from '../message-templates/message-templates.service';
import { authMiddleware } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { InstitutionCreateSchema, InstitutionUpdateSchema } from '../../utils/schemas';
import { createAuditLog } from '../../utils/audit';
import { normalizeRole, ROLES } from '../../utils/roles';
import { validateUploadedFile, sanitizeFileName } from '../../utils/file-upload';

const institutions = new Hono<{ Bindings: Env; Variables: { user: JwtPayload; validBody: any } }>();

institutions.use('*', authMiddleware);

function isSuperAdminUser(user: JwtPayload): boolean {
  const userRoles = (user.roles || (user.role ? [user.role] : [])).map(normalizeRole);
  return userRoles.includes(ROLES.SUPER_ADMIN);
}

// GET / - List institutions (Super Admin only, supports ?search= & ?page= & ?limit=)
institutions.get('/', async (c) => {
  const user = c.get('user');
  if (!isSuperAdminUser(user)) {
    return c.json({ error: 'Forbidden' }, 403);
  }
  
  const search = c.req.query('search') || undefined;
  const pageStr = c.req.query('page');
  const limitStr = c.req.query('limit');
  const page = pageStr ? parseInt(pageStr, 10) : undefined;
  const limit = limitStr ? parseInt(limitStr, 10) : undefined;

  const repo = new InstitutionRepository(c.env.DB);
  const service = new InstitutionService(repo);
  const results = await service.getAllInstitutions({ search, page, limit });
  return c.json(results);
});

// GET /:id - Get institution details
institutions.get('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  
  if (!isSuperAdminUser(user) && id !== user.institution_id) {
    return c.json({ error: 'Institution not found' }, 404);
  }
  
  const repo = new InstitutionRepository(c.env.DB);
  const service = new InstitutionService(repo);
  const result = await service.getInstitution(id);
  if (!result) return c.json({ error: 'Institution not found' }, 404);
  return c.json(result);
});

// POST / - Create institution (Super Admin only, validated with Zod)
institutions.post('/', validateBody(InstitutionCreateSchema), async (c) => {
  const user = c.get('user');
  if (!isSuperAdminUser(user)) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const input = c.get('validBody');
  const repo = new InstitutionRepository(c.env.DB);
  const service = new InstitutionService(repo);
  const id = await service.createInstitution(input, user.sub);

  // Seed default message templates for the new institution
  try {
    const templatesRepo = new MessageTemplatesRepository(c.env.DB);
    const templatesService = new MessageTemplatesService(templatesRepo);
    await templatesService.seedDefaultTemplates(id, user.sub);
  } catch (err) {
    console.error('Failed to seed templates for new institution:', err);
  }

  await createAuditLog(c.env.DB, user.sub, 'CREATE_INSTITUTION', 'institutions', id, `Super Admin created institution ${input.name}`);
  return c.json({ id }, 201);
});

// PUT /:id - Update institution profile (Super Admin or institution.manage)
institutions.put('/:id', validateBody(InstitutionUpdateSchema), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  
  const userRepo = new UserRepository(c.env.DB);
  const userPermissions = await userRepo.getUserPermissions(user.sub);
  const hasInstManage = userPermissions.includes('institution.manage');
  
  const canWrite = isSuperAdminUser(user) || (hasInstManage && id === user.institution_id);
  if (!canWrite) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const input = c.get('validBody');
  const repo = new InstitutionRepository(c.env.DB);
  const service = new InstitutionService(repo);
  await service.updateInstitution(id, input, user.sub);
  
  await createAuditLog(c.env.DB, user.sub, 'UPDATE_INSTITUTION', 'institutions', id, `Updated institution profile details`);
  
  return c.json({ success: true });
});

// POST /:id/logo - Upload institution logo file to R2
institutions.post('/:id/logo', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;

  const userRepo = new UserRepository(c.env.DB);
  const userPermissions = await userRepo.getUserPermissions(user.sub);
  const hasInstManage = userPermissions.includes('institution.manage');

  const canWrite = isSuperAdminUser(user) || (hasInstManage && id === user.institution_id);
  if (!canWrite) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const body = await c.req.parseBody();
  const file = body['file'] as File;

  if (!file || typeof file === 'string') {
    return c.json({ error: 'No file uploaded under form field "file"' }, 400);
  }

  const validationError = validateUploadedFile(file, { photoOnly: true });
  if (validationError) {
    return c.json({ error: validationError }, 400);
  }

  try {
    const bytes = await file.arrayBuffer();
    const key = `institution-logos/${id}`;
    await c.env.FILES.put(key, bytes, {
      httpMetadata: { contentType: file.type || 'image/png' }
    });

    const logoUrl = `/institutions/${id}/logo?t=${Date.now()}`;
    const repo = new InstitutionRepository(c.env.DB);
    const service = new InstitutionService(repo);
    await service.updateInstitution(id, { logo: logoUrl }, user.sub);

    await createAuditLog(c.env.DB, user.sub, 'UPDATE_INSTITUTION_LOGO', 'institutions', id, `Uploaded institution logo`);

    return c.json({ success: true, url: logoUrl });
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to upload logo' }, 500);
  }
});

// GET /:id/logo - Serve institution logo file from R2
institutions.get('/:id/logo', async (c) => {
  const id = c.req.param('id')!;
  const key = `institution-logos/${id}`;
  
  try {
    const object = await c.env.FILES.get(key);
    if (!object) {
      return c.json({ error: 'Logo not found' }, 404);
    }
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set('Cache-Control', 'public, max-age=86400');
    return new Response(object.body, { headers });
  } catch (err: any) {
    return c.json({ error: 'Failed to retrieve logo' }, 500);
  }
});

// DELETE /:id - Soft delete institution (Super Admin only, with delete protection safeguards)
institutions.delete('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  
  if (!isSuperAdminUser(user)) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const repo = new InstitutionRepository(c.env.DB);
  const service = new InstitutionService(repo);

  // Apply Safeguards check
  const protection = await service.checkDeleteProtection(id);
  if (!protection.safe) {
    return c.json({ error: protection.reason }, 400);
  }

  await service.deleteInstitution(id, user.sub);
  await createAuditLog(c.env.DB, user.sub, 'DELETE_INSTITUTION', 'institutions', id, `Super Admin soft-deleted institution ${id}`);
  return c.json({ success: true });
});

export default institutions;
