import { Hono } from 'hono';
import { Env, JwtPayload } from '../../types';
import { StudyMaterialsRepository } from './study-materials.repository';
import { StudyMaterialsService, StudyMaterialsServiceError } from './study-materials.service';
import { authMiddleware } from '../../middleware/auth';
import { createAuditLog } from '../../utils/audit';
import { isTeacherOnly, teacherHasSectionAccess, teacherHasSubjectAccess, getTeacherIdForUser } from '../../utils/teacher-scope';
import { validateUploadedFile, sanitizeFileName } from '../../utils/file-upload';

const studyMaterials = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();

studyMaterials.use('*', authMiddleware);

function getService(c: any): StudyMaterialsService {
  return new StudyMaterialsService(new StudyMaterialsRepository(c.env.DB));
}

function handleError(c: any, e: any) {
  const statusCode = e instanceof StudyMaterialsServiceError ? e.statusCode : 400;
  return c.json({ error: e.message }, statusCode as any);
}

async function canAccessMaterial(db: D1Database, user: JwtPayload, sectionId: string): Promise<boolean> {
  const roles = (user.roles || (user.role ? [user.role] : [])).map(r => r.toLowerCase().replace(' ', '_').replace('role-', ''));
  const isStudent = roles.includes('student');
  const isParent = roles.some(r => ['parent', 'guardian'].includes(r));

  if (isStudent) {
    const row = await db.prepare(`
      SELECT 1 FROM student_enrollments se JOIN students s ON se.student_id = s.id
      WHERE s.user_id = ? AND se.section_id = ? AND se.is_active = 1 AND s.is_active = 1
    `).bind(user.sub, sectionId).first();
    return !!row;
  }
  if (isParent) {
    const row = await db.prepare(`
      SELECT 1 FROM student_enrollments se
      JOIN guardians g ON se.student_id = g.student_id
      WHERE g.user_id = ? AND se.section_id = ? AND se.is_active = 1 AND g.is_active = 1
    `).bind(user.sub, sectionId).first();
    return !!row;
  }
  return true; // staff — the section/subject scoping is informational, not a security boundary for staff
}

async function checkManageAccess(db: D1Database, user: JwtPayload, sectionId: string, subjectId: string, teacherIdToCheck?: string): Promise<boolean> {
  const roles = (user.roles || (user.role ? [user.role] : [])).map(r => r.toLowerCase().replace(' ', '_').replace('role-', ''));
  const isPrivileged = roles.some(r => ['super_admin', 'admin', 'principal'].includes(r));
  if (isPrivileged) return true;

  const perms = user.permissions || [];
  if (!perms.includes('study_materials.manage') && !roles.includes('teacher')) return false;

  const currentTeacherId = await getTeacherIdForUser(db, user);
  if (teacherIdToCheck && currentTeacherId && teacherIdToCheck === currentTeacherId) return true;

  const hasSection = await teacherHasSectionAccess(db, user, sectionId);
  const hasSubject = await teacherHasSubjectAccess(db, user, subjectId, sectionId);
  return hasSection && hasSubject;
}

studyMaterials.get('/', async (c) => {
  const user = c.get('user');
  const sectionId = c.req.query('section_id');
  const subjectId = c.req.query('subject_id');
  const db = c.env.DB;
  const service = getService(c);

  const roles = (user.roles || (user.role ? [user.role] : [])).map(r => r.toLowerCase().replace(' ', '_').replace('role-', ''));
  const isPrivileged = roles.some(r => ['super_admin', 'admin', 'principal'].includes(r));
  const isTeacher = roles.some(r => ['teacher', 'hod'].includes(r));
  const isStudent = roles.some(r => ['student'].includes(r));
  const isParent = roles.some(r => ['parent', 'guardian'].includes(r));

  if (isPrivileged) {
    return c.json(await service.listForInstitution(user.institution_id, sectionId, subjectId));
  }
  if (isTeacher) {
    const teacherId = await getTeacherIdForUser(db, user);
    if (!teacherId) return c.json([]);
    return c.json(await service.listForTeacher(user.institution_id, teacherId, sectionId, subjectId));
  }
  if (isStudent) {
    const enrollment = await db.prepare(`
      SELECT se.section_id FROM student_enrollments se
      JOIN students s ON se.student_id = s.id
      WHERE s.user_id = ? AND se.is_active = 1 AND s.is_active = 1
      LIMIT 1
    `).bind(user.sub).first<{ section_id: string }>();
    if (!enrollment) return c.json([]);
    return c.json(await service.listForSection(user.institution_id, enrollment.section_id, subjectId));
  }
  if (isParent) {
    const { results } = await db.prepare(`
      SELECT DISTINCT se.section_id FROM student_enrollments se
      JOIN guardians g ON se.student_id = g.student_id
      WHERE g.user_id = ? AND se.is_active = 1 AND g.is_active = 1
    `).bind(user.sub).all<{ section_id: string }>();
    const sectionIds = (results || []).map(r => r.section_id);
    if (sectionIds.length === 0) return c.json([]);
    const all = await Promise.all(sectionIds.map(sid => service.listForSection(user.institution_id, sid, subjectId)));
    return c.json(all.flat());
  }
  return c.json([]);
});

studyMaterials.post('/upload', async (c) => {
  const user = c.get('user');
  const db = c.env.DB;

  const body = await c.req.parseBody();
  const sectionId = String(body['section_id'] || '');
  const subjectId = String(body['subject_id'] || '');
  let teacherId = String(body['teacher_id'] || '');
  const title = String(body['title'] || '');
  const description = body['description'] ? String(body['description']) : undefined;
  const materialType = (body['material_type'] ? String(body['material_type']) : 'DOCUMENT') as any;
  const externalUrl = body['external_url'] ? String(body['external_url']) : undefined;
  const file = body['file'];

  if (isTeacherOnly(user)) {
    const currentTeacherId = await getTeacherIdForUser(db, user);
    if (!currentTeacherId) return c.json({ error: 'Forbidden: Teacher profile not found for current user' }, 403);
    teacherId = currentTeacherId;
  }

  const hasAccess = await checkManageAccess(db, user, sectionId, subjectId, teacherId);
  if (!hasAccess) {
    return c.json({ error: 'Forbidden: You are not assigned to teach this subject and section' }, 403);
  }

  let fileKey: string | undefined;
  if (file && file instanceof File) {
    const validationError = await validateUploadedFile(file);
    if (validationError) return c.json({ error: validationError }, 400);

    const safeName = sanitizeFileName(file.name);
    const materialId = crypto.randomUUID();
    fileKey = `study_materials/${user.institution_id}/${materialId}_${safeName}`;
    const bytes = await file.arrayBuffer();
    await c.env.FILES.put(fileKey, bytes, { httpMetadata: { contentType: file.type || 'application/octet-stream' } });
  }

  const service = getService(c);
  try {
    const id = await service.create(user.institution_id, {
      section_id: sectionId, subject_id: subjectId, teacher_id: teacherId, title, description,
      material_type: materialType, file_key: fileKey, external_url: externalUrl,
    }, user.sub);
    await createAuditLog(c.env.DB, { institutionId: user.institution_id, userId: user.sub, module: 'STUDY_MATERIALS', action: 'UPLOAD_MATERIAL', entityType: 'study_materials', entityId: id });
    return c.json({ id }, 201);
  } catch (e: any) {
    return handleError(c, e);
  }
});

studyMaterials.get('/:id/download', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const service = getService(c);

  try {
    const material = await service.getById(user.institution_id, id);
    if (!(await canAccessMaterial(c.env.DB, user, material.section_id))) {
      return c.json({ error: 'Forbidden: cannot access this study material' }, 403);
    }
    if (!material.file_key) return c.json({ error: 'This material has no file attached (it may be an external link).' }, 400);

    const file = await c.env.FILES.get(material.file_key);
    if (!file) return c.json({ error: 'File data not found in storage' }, 404);

    const headers = new Headers();
    headers.set('Content-Type', file.httpMetadata?.contentType || 'application/octet-stream');
    headers.set('Content-Disposition', `attachment; filename="${material.title}"`);
    return new Response(file.body, { headers });
  } catch (e: any) {
    return handleError(c, e);
  }
});

studyMaterials.delete('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const db = c.env.DB;
  const service = getService(c);

  try {
    const existing = await service.getById(user.institution_id, id);
    const hasAccess = await checkManageAccess(db, user, existing.section_id, existing.subject_id, existing.teacher_id);
    if (!hasAccess) return c.json({ error: 'Forbidden: You do not have permission to manage this material' }, 403);

    const fileKey = await service.delete(user.institution_id, id, user.sub);
    if (fileKey) {
      try {
        await c.env.FILES.delete(fileKey);
      } catch (err) {
        console.error('Failed to delete study material file from R2:', err);
      }
    }
    await createAuditLog(c.env.DB, { institutionId: user.institution_id, userId: user.sub, module: 'STUDY_MATERIALS', action: 'DELETE_MATERIAL', entityType: 'study_materials', entityId: id });
    return c.json({ success: true });
  } catch (e: any) {
    return handleError(c, e);
  }
});

export default studyMaterials;
