import { Hono } from 'hono';
import { Env, JwtPayload } from '../../types';
import { SectionRepository } from './sections.repository';
import { SectionService } from './sections.service';
import { authMiddleware, requirePermission } from '../../middleware/auth';
import { createAuditLog } from '../../utils/audit';
import { getTeacherIdForUser, isTeacherOnly, teacherHasSectionAccess } from '../../utils/teacher-scope';
import { validateUploadedFile, sanitizeFileName } from '../../utils/file-upload';

const sections = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();

sections.use('*', authMiddleware);

sections.use('*', async (c, next) => {
  const user = c.get('user');
  const userRoles = user.roles || (user.role ? [user.role] : []);
  const isStaff = userRoles.some(r => ['admin', 'super_admin', 'Principal', 'HOD', 'Teacher', 'teacher'].includes(r));
  if (!isStaff) {
    return c.json({ error: 'Forbidden' }, 403);
  }
  await next();
});

sections.get('/', async (c) => {
  const user = c.get('user');
  const filters = c.req.query();

  if (isTeacherOnly(user)) {
    const teacherId = await getTeacherIdForUser(c.env.DB, user);
    if (!teacherId) return c.json([]);

    let query = `
      SELECT DISTINCT
        s.*,
        (t.first_name || ' ' || t.last_name) AS class_teacher_name,
        c.name AS course_name,
        ay.name AS academic_year_name,
        (
          SELECT COUNT(*)
          FROM student_enrollments se
          JOIN students st ON se.student_id = st.id
          WHERE se.section_id = s.id AND se.is_active = 1 AND st.is_active = 1
        ) AS student_count
      FROM sections s
      LEFT JOIN teachers t ON s.class_teacher_id = t.id
      LEFT JOIN courses c ON s.course_id = c.id
      LEFT JOIN academic_years ay ON s.academic_year_id = ay.id
      WHERE s.institution_id = ? AND s.is_active = 1
        AND (
          EXISTS (
            SELECT 1 FROM teacher_subject_assignments tsa
            WHERE tsa.teacher_id = ? AND tsa.section_id = s.id AND tsa.is_active = 1
          )
          OR EXISTS (
            SELECT 1 FROM teaching_allocations ta
            WHERE ta.teacher_id = ? AND ta.section_id = s.id AND ta.institution_id = ? AND LOWER(ta.status) = 'active'
          )
        )
    `;
    const params: any[] = [user.institution_id, teacherId, teacherId, user.institution_id];

    if (filters.academic_year_id) {
      query += ' AND s.academic_year_id = ?';
      params.push(filters.academic_year_id);
    }
    if (filters.course_id) {
      query += ' AND s.course_id = ?';
      params.push(filters.course_id);
    }
    if (filters.year_number) {
      query += ' AND s.year_number = ?';
      params.push(Number(filters.year_number));
    }
    if (filters.search) {
      query += ' AND (s.name LIKE ? OR s.room LIKE ? OR c.name LIKE ?)';
      params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
    }

    query += ' ORDER BY c.name ASC, s.year_number ASC, s.name ASC';
    const { results } = await c.env.DB.prepare(query).bind(...params).all();
    return c.json(results || []);
  }

  const repo = new SectionRepository(c.env.DB);
  const service = new SectionService(repo, c.env.DB);
  const results = await service.listSections(user.institution_id, filters);
  return c.json(results);
});

sections.get('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const repo = new SectionRepository(c.env.DB);
  const service = new SectionService(repo, c.env.DB);
  const result = await service.getSection(id);
  
  if (!result || result.institution_id !== user.institution_id) {
    return c.json({ error: 'Section not found' }, 404);
  }
  if (!(await teacherHasSectionAccess(c.env.DB, user, id))) {
    return c.json({ error: 'Forbidden: section is outside your teaching assignment' }, 403);
  }
  return c.json(result);
});

sections.get('/:id/dependencies', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const repo = new SectionRepository(c.env.DB);
  const service = new SectionService(repo, c.env.DB);

  const existing = await service.getSection(id);
  if (!existing || existing.institution_id !== user.institution_id) {
    return c.json({ error: 'Section not found' }, 404);
  }

  const deps = await service.getDependencies(id);
  return c.json(deps);
});

sections.post('/', requirePermission('academic.manage'), async (c) => {
  const user = c.get('user');
  const input = await c.req.json();
  const repo = new SectionRepository(c.env.DB);
  const service = new SectionService(repo, c.env.DB);
  
  try {
    const id = await service.createSection(user.institution_id, input, user.sub);
    await createAuditLog(c.env.DB, user.sub, 'CREATE_SECTION', 'sections', id, `Created section: ${input.name} (Year: ${input.year_number})`);
    return c.json({ id }, 201);
  } catch (e: any) {
    const status = e.statusCode || 400;
    return c.json({ error: e.message }, status as any);
  }
});

sections.put('/:id', requirePermission('academic.manage'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const input = await c.req.json();
  const repo = new SectionRepository(c.env.DB);
  const service = new SectionService(repo, c.env.DB);
  
  const existing = await service.getSection(id);
  if (!existing || existing.institution_id !== user.institution_id) {
    return c.json({ error: 'Section not found' }, 404);
  }
  
  try {
    await service.updateSection(id, input, user.sub);
    await createAuditLog(c.env.DB, user.sub, 'UPDATE_SECTION', 'sections', id, `Updated section: ${existing.name}`);
    return c.json({ success: true });
  } catch (e: any) {
    const status = e.statusCode || 400;
    return c.json({ error: e.message }, status as any);
  }
});

sections.post('/:id/archive', requirePermission('academic.manage'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const repo = new SectionRepository(c.env.DB);
  const service = new SectionService(repo, c.env.DB);
  
  const existing = await service.getSection(id);
  if (!existing || existing.institution_id !== user.institution_id) {
    return c.json({ error: 'Section not found' }, 404);
  }
  
  try {
    await service.archiveSection(id, user.sub);
    await createAuditLog(c.env.DB, user.sub, 'ARCHIVE_SECTION', 'sections', id, `Archived section: ${existing.name}`);
    return c.json({ success: true });
  } catch (e: any) {
    const status = e.statusCode || 400;
    return c.json({ error: e.message }, status as any);
  }
});

sections.post('/:id/restore', requirePermission('academic.manage'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const repo = new SectionRepository(c.env.DB);
  const service = new SectionService(repo, c.env.DB);
  
  const existing = await service.getSection(id);
  if (!existing || existing.institution_id !== user.institution_id) {
    return c.json({ error: 'Section not found' }, 404);
  }
  
  try {
    await service.restoreSection(id, user.sub);
    await createAuditLog(c.env.DB, user.sub, 'RESTORE_SECTION', 'sections', id, `Restored section: ${existing.name}`);
    return c.json({ success: true });
  } catch (e: any) {
    const status = e.statusCode || 400;
    return c.json({ error: e.message }, status as any);
  }
});

sections.delete('/:id', requirePermission('academic.manage'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const force = c.req.query('force') === 'true';

  const repo = new SectionRepository(c.env.DB);
  const service = new SectionService(repo, c.env.DB);
  
  const existing = await service.getSection(id);
  if (!existing || existing.institution_id !== user.institution_id) {
    return c.json({ error: 'Section not found' }, 404);
  }
  
  try {
    await service.deleteSection(id, user.sub, force);
    await createAuditLog(c.env.DB, user.sub, 'DELETE_SECTION', 'sections', id, `Deleted/Archived section: ${existing.name}`);
    return c.json({ success: true });
  } catch (e: any) {
    const status = e.statusCode || 400;
    return c.json({ error: e.message }, status as any);
  }
});

// --- SECTION TIMELINE ---
sections.get('/:id/timeline', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  
  const repo = new SectionRepository(c.env.DB);
  const service = new SectionService(repo);
  const section = await service.getSection(id);
  if (!section || section.institution_id !== user.institution_id) {
    return c.json({ error: 'Section not found' }, 404);
  }
  if (!(await teacherHasSectionAccess(c.env.DB, user, id))) {
    return c.json({ error: 'Forbidden: section is outside your teaching assignment' }, 403);
  }
  
  // Fetch all audit logs matching section actions or attendance sessions/announcements containing section ID
  const { results: logs } = await c.env.DB.prepare(`
    SELECT al.*, u.name as user_name, u.email as user_email
    FROM audit_logs al
    JOIN users u ON al.user_id = u.id
    WHERE u.institution_id = ? 
      AND (
        (al.module = 'sections' AND al.record_id = ?)
        OR (al.module = 'attendance' AND al.description LIKE ?)
        OR (al.module = 'announcements' AND al.description LIKE ?)
      )
    ORDER BY al.timestamp DESC
  `).bind(
    user.institution_id, 
    id, 
    `%section ${id}%`, 
    `%section ${id}%`
  ).all<any>();
  
  return c.json(logs || []);
});

// --- SECTION DOCUMENTS ENDPOINTS ---
// GET Documents list
sections.get('/:id/documents', async (c) => {
  const user = c.get('user');
  const sectionId = c.req.param('id')!;

  const section = await c.env.DB.prepare('SELECT 1 FROM sections WHERE id = ? AND institution_id = ? AND is_active = 1').bind(sectionId, user.institution_id).first();
  if (!section) return c.json({ error: 'Section not found' }, 404);
  if (!(await teacherHasSectionAccess(c.env.DB, user, sectionId))) {
    return c.json({ error: 'Forbidden: section is outside your teaching assignment' }, 403);
  }

  const { results } = await c.env.DB.prepare('SELECT * FROM documents WHERE entity_type = "section" AND entity_id = ? AND is_active = 1 ORDER BY created_at DESC').bind(sectionId).all();
  return c.json(results || []);
});

// POST upload file to R2 + metadata to D1
sections.post('/:id/documents/upload', requirePermission('academic.manage'), async (c) => {
  const user = c.get('user');
  const sectionId = c.req.param('id')!;

  const section = await c.env.DB.prepare('SELECT 1 FROM sections WHERE id = ? AND institution_id = ? AND is_active = 1').bind(sectionId, user.institution_id).first();
  if (!section) return c.json({ error: 'Section not found' }, 404);
  if (!(await teacherHasSectionAccess(c.env.DB, user, sectionId))) {
    return c.json({ error: 'Forbidden: section is outside your teaching assignment' }, 403);
  }

  const body = await c.req.parseBody();
  const file = body['file'];
  const folder = body['folder'] || 'Other';

  if (!file || !(file instanceof File)) {
    return c.json({ error: 'No document file uploaded' }, 400);
  }

  const validationError = await validateUploadedFile(file);
  if (validationError) {
    return c.json({ error: validationError }, 400);
  }

  const safeName = sanitizeFileName(file.name);

  try {
    const bytes = await file.arrayBuffer();
    const docId = crypto.randomUUID();
    const fileKey = `section_docs/${sectionId}/${docId}_${safeName}`;
    
    // Put file in R2 Bucket
    await c.env.FILES.put(fileKey, bytes, {
      httpMetadata: { contentType: file.type || 'application/octet-stream' }
    });

    // Save metadata in D1 Database
    await c.env.DB.prepare(`
      INSERT INTO documents (id, institution_id, entity_type, entity_id, name, folder, file_key, file_size, mime_type, uploaded_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(docId, user.institution_id, 'section', sectionId, safeName, folder, fileKey, file.size, file.type || 'application/octet-stream', user.sub).run();

    await createAuditLog(c.env.DB, user.sub, 'UPLOAD_SECTION_DOCUMENT', 'sections', sectionId, `Uploaded document ${safeName} to folder ${folder}`);

    return c.json({ success: true, id: docId });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// GET file stream / download from R2
sections.get('/:id/documents/:docId/download', async (c) => {
  const user = c.get('user');
  const sectionId = c.req.param('id')!;
  const docId = c.req.param('docId')!;

  const section = await c.env.DB.prepare('SELECT 1 FROM sections WHERE id = ? AND institution_id = ? AND is_active = 1').bind(sectionId, user.institution_id).first();
  if (!section) return c.json({ error: 'Section not found' }, 404);
  if (!(await teacherHasSectionAccess(c.env.DB, user, sectionId))) {
    return c.json({ error: 'Forbidden: section is outside your teaching assignment' }, 403);
  }

  const metadata = await c.env.DB.prepare('SELECT * FROM documents WHERE id = ? AND entity_type = "section" AND entity_id = ? AND is_active = 1')
    .bind(docId, sectionId).first<any>();

  if (!metadata) return c.json({ error: 'Document not found' }, 404);

  try {
    const file = await c.env.FILES.get(metadata.file_key);
    if (!file) {
      return c.json({ error: 'File data not found in storage' }, 404);
    }

    const headers = new Headers();
    headers.set('Content-Type', file.httpMetadata?.contentType || 'application/octet-stream');
    headers.set('Content-Disposition', `attachment; filename="${metadata.name}"`);
    return new Response(file.body, { headers });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// DELETE Document
sections.delete('/:id/documents/:docId', requirePermission('academic.manage'), async (c) => {
  const user = c.get('user');
  const sectionId = c.req.param('id')!;
  const docId = c.req.param('docId')!;

  const section = await c.env.DB.prepare('SELECT 1 FROM sections WHERE id = ? AND institution_id = ? AND is_active = 1').bind(sectionId, user.institution_id).first();
  if (!section) return c.json({ error: 'Section not found' }, 404);
  if (!(await teacherHasSectionAccess(c.env.DB, user, sectionId))) {
    return c.json({ error: 'Forbidden: section is outside your teaching assignment' }, 403);
  }

  const metadata = await c.env.DB.prepare('SELECT * FROM documents WHERE id = ? AND entity_type = "section" AND entity_id = ? AND is_active = 1')
    .bind(docId, sectionId).first<any>();

  if (!metadata) return c.json({ error: 'Document not found' }, 404);

  try {
    await c.env.DB.prepare('UPDATE documents SET is_active = 0 WHERE id = ?').bind(docId).run();
    await createAuditLog(c.env.DB, user.sub, 'DELETE_SECTION_DOCUMENT', 'sections', sectionId, `Deleted document: ${metadata.name}`);
    
    // Attempt delete from R2 (optional but good practice)
    try {
      await c.env.FILES.delete(metadata.file_key);
    } catch (err) {
      console.error('Failed to delete document from R2:', err);
    }

    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// --- BULK SECTION ACTIONS ---
sections.post('/bulk-action', requirePermission('academic.manage'), async (c) => {
  const user = c.get('user');
  const { section_ids, action, payload } = await c.req.json();

  if (!section_ids || !Array.isArray(section_ids) || section_ids.length === 0) {
    return c.json({ error: 'No section_ids provided' }, 400);
  }

  const db = c.env.DB;
  
  // Verify section_ids belong to user's institution (Tenant Isolation)
  const placeholders = section_ids.map(() => '?').join(',');
  const { results: validSections } = await db.prepare(
    `SELECT id, name FROM sections WHERE id IN (${placeholders}) AND institution_id = ?`
  ).bind(...section_ids, user.institution_id).all<{ id: string; name: string }>();

  if (!validSections || validSections.length === 0) {
    return c.json({ error: 'No valid sections found for this institution' }, 400);
  }

  const validIds = validSections.map(s => s.id);
  const validPlaceholders = validIds.map(() => '?').join(',');

  if (action === 'assign_class_teacher') {
    const { class_teacher_id } = payload || {};
    if (class_teacher_id) {
      const teacher = await db.prepare('SELECT id FROM teachers WHERE id = ? AND institution_id = ? AND is_active = 1')
        .bind(class_teacher_id, user.institution_id).first();
      if (!teacher) return c.json({ error: 'Invalid class teacher' }, 400);
    }

    await db.prepare(
      `UPDATE sections SET class_teacher_id = ?, updated_at = datetime('now'), updated_by = ? WHERE id IN (${validPlaceholders}) AND institution_id = ?`
    ).bind(class_teacher_id || null, user.sub, ...validIds, user.institution_id).run();

    await createAuditLog(db, user.sub, 'BULK_ASSIGN_CLASS_TEACHER', 'sections', validIds[0], `Bulk assigned class teacher for ${validIds.length} classes/sections.`);
    return c.json({ success: true, message: `Successfully updated class teacher for ${validIds.length} sections.` });
  }

  if (action === 'deactivate') {
    await db.prepare(
      `UPDATE sections SET is_active = 0, updated_at = datetime('now'), updated_by = ? WHERE id IN (${validPlaceholders}) AND institution_id = ?`
    ).bind(user.sub, ...validIds, user.institution_id).run();

    await createAuditLog(db, user.sub, 'BULK_DEACTIVATE_SECTIONS', 'sections', validIds[0], `Bulk deactivated ${validIds.length} classes/sections.`);
    return c.json({ success: true, message: `Successfully deactivated ${validIds.length} sections.` });
  }

  if (action === 'reactivate') {
    await db.prepare(
      `UPDATE sections SET is_active = 1, updated_at = datetime('now'), updated_by = ? WHERE id IN (${validPlaceholders}) AND institution_id = ?`
    ).bind(user.sub, ...validIds, user.institution_id).run();

    await createAuditLog(db, user.sub, 'BULK_REACTIVATE_SECTIONS', 'sections', validIds[0], `Bulk reactivated ${validIds.length} classes/sections.`);
    return c.json({ success: true, message: `Successfully reactivated ${validIds.length} sections.` });
  }

  if (action === 'delete') {
    const repo = new SectionRepository(db);
    const service = new SectionService(repo);
    let count = 0;
    for (const sId of validIds) {
      await service.deleteSection(sId, user.sub);
      count++;
    }
    await createAuditLog(db, user.sub, 'BULK_DELETE_SECTIONS', 'sections', validIds[0], `Bulk deleted ${count} classes/sections.`);
    return c.json({ success: true, message: `Successfully deleted ${count} sections.` });
  }

  return c.json({ error: 'Invalid action' }, 400);
});

export default sections;
