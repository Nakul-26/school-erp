import { Hono } from 'hono';
import { Env, JwtPayload } from '../../types';
import { TeacherRepository } from './teachers.repository';
import { TeacherService } from './teachers.service';
import { authMiddleware, requireRole } from '../../middleware/auth';
import { UserRepository } from '../users/users.repository';
import { UserService } from '../users/users.service';
import { validateUploadedFile, sanitizeFileName } from '../../utils/file-upload';

const teachers = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();

teachers.use('*', authMiddleware);

function userRoles(user: JwtPayload): string[] {
  return user.roles || (user.role ? [user.role] : []);
}

function isTeacherRole(user: JwtPayload): boolean {
  return userRoles(user).some((role) => ['teacher', 'Teacher'].includes(role));
}

function isTeacherManager(user: JwtPayload): boolean {
  return userRoles(user).some((role) => [
    'admin',
    'Admin',
    'super_admin',
    'Super Admin',
    'role-super-admin',
    'Principal',
    'principal',
    'HOD',
    'hod'
  ].includes(role));
}

async function teacherBelongsToUser(db: D1Database, user: JwtPayload, teacherId: string): Promise<boolean> {
  const teacher = await db.prepare(
    'SELECT id FROM teachers WHERE id = ? AND user_id = ? AND institution_id = ? AND is_active = 1'
  ).bind(teacherId, user.sub, user.institution_id).first<{ id: string }>();
  return Boolean(teacher);
}

async function canViewTeacher(db: D1Database, user: JwtPayload, teacherId: string): Promise<boolean> {
  if (isTeacherManager(user)) return true;
  return isTeacherRole(user) && await teacherBelongsToUser(db, user, teacherId);
}

teachers.get('/', requireRole('admin', 'super_admin', 'Principal', 'HOD'), async (c) => {
  const user = c.get('user');
  const repo = new TeacherRepository(c.env.DB);
  const service = new TeacherService(repo);
  const results = await service.listTeachers(user.institution_id);
  return c.json(results);
});

teachers.get('/reports/workload', requireRole('admin', 'super_admin', 'Principal', 'HOD'), async (c) => {
  const user = c.get('user');
  const repo = new TeacherRepository(c.env.DB);
  const service = new TeacherService(repo);
  const results = await service.getTeacherWorkloadReport(user.institution_id);
  return c.json(results);
});

teachers.get('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const repo = new TeacherRepository(c.env.DB);
  const service = new TeacherService(repo);
  const result = await service.getTeacher(id);
  
  if (!result || result.institution_id !== user.institution_id) {
    return c.json({ error: 'Teacher not found' }, 404);
  }

  if (!(await canViewTeacher(c.env.DB, user, id))) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  // Count unique students enrolled in sections assigned to this teacher
  const studentsCountRow = await c.env.DB.prepare(`
    SELECT COUNT(DISTINCT se.student_id) as count
    FROM teacher_subject_assignments a
    JOIN student_enrollments se ON a.section_id = se.section_id
    WHERE a.teacher_id = ? AND a.is_active = 1 AND se.is_active = 1
  `).bind(id).first<{ count: number }>();

  // Count periods/classes per week in the timetable
  const periodsCountRow = await c.env.DB.prepare(`
    SELECT COUNT(*) as count
    FROM weekly_timetable
    WHERE teacher_id = ? AND is_active = 1
  `).bind(id).first<{ count: number }>();

  return c.json({
    ...result,
    students_count: studentsCountRow?.count || 0,
    periods_count: periodsCountRow?.count || 0
  });
});

teachers.post('/', requireRole('admin', 'super_admin'), async (c) => {
  const user = c.get('user');
  const input = await c.req.json();
  
  const userRepo = new UserRepository(c.env.DB);
  const userService = new UserService(userRepo);
  const teacherRepo = new TeacherRepository(c.env.DB);
  const teacherService = new TeacherService(teacherRepo);

  let linkedUserId: string | null = null;
  let tempPassword = '';
  let finalUsername = '';

  if (input.create_login) {
    let username = input.username || input.employee_id?.toLowerCase() || `${input.first_name.toLowerCase()}.${input.last_name.toLowerCase()}`;
    username = username.replace(/[^a-zA-Z0-9._-]/g, '');
    
    finalUsername = username;
    let counter = 1;
    while (true) {
      const existing = await userRepo.findByUsername(finalUsername);
      if (!existing) break;
      finalUsername = `${username}${counter}`;
      counter++;
    }

    tempPassword = input.password || `${input.employee_id || 'Teacher'}@2026`;
    
    try {
      linkedUserId = await userService.createUser({
        institution_id: user.institution_id,
        username: finalUsername,
        email: input.email || `${finalUsername}@school.com`,
        name: `${input.first_name} ${input.middle_name ? input.middle_name + ' ' : ''}${input.last_name}`.trim(),
        phone: input.phone || '',
        roles: ['teacher'],
        password: tempPassword
      }, user.sub);
    } catch (e: any) {
      return c.json({ error: `Failed to create login account: ${e.message}` }, 400);
    }
  }

  // Create the teacher
  try {
    const teacherId = await teacherService.createTeacher(user.institution_id, {
      ...input,
      user_id: linkedUserId
    }, user.sub);

    return c.json({ 
      id: teacherId,
      login_created: !!linkedUserId,
      username: finalUsername,
      password: tempPassword
    }, 201);
  } catch (e: any) {
    // Transaction Rollback: if teacher creation fails and we created a user, delete the user!
    if (linkedUserId) {
      try {
        await c.env.DB.prepare('DELETE FROM user_roles WHERE user_id = ?').bind(linkedUserId).run();
        await c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(linkedUserId).run();
      } catch (err) {
        console.error('Failed to rollback/delete user account after teacher creation error:', err);
      }
    }
    if (e.message?.includes('UNIQUE constraint failed: teachers.employee_id') || e.message?.includes('teachers.employee_id')) {
      return c.json({ error: 'A teacher with this Employee ID already exists. Please use a different ID.' }, 409);
    }
    return c.json({ error: `Failed to create teacher: ${e.message}` }, 400);
  }
});

teachers.put('/:id', requireRole('admin', 'super_admin', 'Principal'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const input = await c.req.json();
  const repo = new TeacherRepository(c.env.DB);
  const service = new TeacherService(repo);
  
  const existing = await service.getTeacher(id);
  if (!existing || existing.institution_id !== user.institution_id) {
    return c.json({ error: 'Teacher not found' }, 404);
  }
  
  try {
    await service.updateTeacher(id, input, user.sub);
    return c.json({ success: true });
  } catch (e: any) {
    if (e.message?.includes('UNIQUE constraint failed: teachers.employee_id') || e.message?.includes('teachers.employee_id')) {
      return c.json({ error: 'A teacher with this Employee ID already exists. Please use a different ID.' }, 409);
    }
    return c.json({ error: `Failed to update teacher: ${e.message}` }, 400);
  }
});

teachers.delete('/:id', requireRole('admin', 'super_admin'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const repo = new TeacherRepository(c.env.DB);
  const service = new TeacherService(repo);
  
  const existing = await service.getTeacher(id);
  if (!existing || existing.institution_id !== user.institution_id) {
    return c.json({ error: 'Teacher not found' }, 404);
  }
  
  await service.deleteTeacher(id, user.sub);
  return c.json({ success: true });
});

// --- BULK TEACHER ACTIONS ---
teachers.post('/bulk-action', requireRole('admin', 'super_admin'), async (c) => {
  const user = c.get('user');
  const { teacher_ids, action, payload } = await c.req.json();

  if (!teacher_ids || !Array.isArray(teacher_ids) || teacher_ids.length === 0) {
    return c.json({ error: 'No teacher_ids provided' }, 400);
  }

  const db = c.env.DB;
  
  if (action === 'assign_department') {
    const { department } = payload || {};
    if (!department) return c.json({ error: 'department is required' }, 400);

    for (const tId of teacher_ids) {
      await db.prepare("UPDATE teachers SET department = ?, updated_at = datetime('now'), updated_by = ? WHERE id = ? AND institution_id = ? AND is_active = 1")
        .bind(department, user.sub, tId, user.institution_id).run();
    }
    return c.json({ success: true, message: `Successfully updated department for ${teacher_ids.length} teachers.` });
  }

  if (action === 'deactivate') {
    for (const tId of teacher_ids) {
      await db.prepare("UPDATE teachers SET status = 'INACTIVE', updated_at = datetime('now'), updated_by = ? WHERE id = ? AND institution_id = ? AND is_active = 1")
        .bind(user.sub, tId, user.institution_id).run();
    }
    return c.json({ success: true, message: `Successfully deactivated ${teacher_ids.length} teachers.` });
  }

  if (action === 'reactivate') {
    for (const tId of teacher_ids) {
      await db.prepare("UPDATE teachers SET status = 'ACTIVE', updated_at = datetime('now'), updated_by = ? WHERE id = ? AND institution_id = ? AND is_active = 1")
        .bind(user.sub, tId, user.institution_id).run();
    }
    return c.json({ success: true, message: `Successfully reactivated ${teacher_ids.length} teachers.` });
  }

  if (action === 'delete') {
    const repo = new TeacherRepository(db);
    const service = new TeacherService(repo);
    for (const tId of teacher_ids) {
      const existing = await service.getTeacher(tId);
      if (!existing || existing.institution_id !== user.institution_id) {
        continue;
      }
      await service.deleteTeacher(tId, user.sub);
    }
    return c.json({ success: true, message: `Successfully deleted ${teacher_ids.length} teachers.` });
  }

  return c.json({ error: 'Invalid action' }, 400);
});

// --- TEACHER NOTES ENDPOINTS ---
// GET Notes
teachers.get('/:id/notes', async (c) => {
  const user = c.get('user');
  const teacherId = c.req.param('id')!;
  
  // Verify teacher matches institution
  const teacher = await c.env.DB.prepare('SELECT 1 FROM teachers WHERE id = ? AND institution_id = ? AND is_active = 1').bind(teacherId, user.institution_id).first();
  if (!teacher) return c.json({ error: 'Teacher not found' }, 404);
  if (!(await canViewTeacher(c.env.DB, user, teacherId))) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const { results } = await c.env.DB.prepare('SELECT * FROM notes WHERE entity_type = "teacher" AND entity_id = ? AND is_active = 1 ORDER BY created_at DESC').bind(teacherId).all();
  return c.json(results || []);
});

// POST Note
teachers.post('/:id/notes', requireRole('admin', 'super_admin', 'Principal'), async (c) => {
  const user = c.get('user');
  const teacherId = c.req.param('id')!;
  const { content } = await c.req.json();

  if (!content || content.trim() === '') {
    return c.json({ error: 'Note content is required' }, 400);
  }

  const teacher = await c.env.DB.prepare('SELECT 1 FROM teachers WHERE id = ? AND institution_id = ? AND is_active = 1').bind(teacherId, user.institution_id).first();
  if (!teacher) return c.json({ error: 'Teacher not found' }, 404);

  const noteId = crypto.randomUUID();
  const authorName = user.name || 'Staff member';
  
  await c.env.DB.prepare('INSERT INTO notes (id, institution_id, entity_type, entity_id, author_id, author_name, content) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(noteId, user.institution_id, 'teacher', teacherId, user.sub, authorName, content).run();

  return c.json({ id: noteId, success: true }, 201);
});

// DELETE Note
teachers.delete('/:id/notes/:noteId', requireRole('admin', 'super_admin', 'Principal'), async (c) => {
  const user = c.get('user');
  const teacherId = c.req.param('id')!;
  const noteId = c.req.param('noteId')!;

  const teacher = await c.env.DB.prepare('SELECT 1 FROM teachers WHERE id = ? AND institution_id = ? AND is_active = 1').bind(teacherId, user.institution_id).first();
  if (!teacher) return c.json({ error: 'Teacher not found' }, 404);
  if (!(await canViewTeacher(c.env.DB, user, teacherId))) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  await c.env.DB.prepare('UPDATE notes SET is_active = 0 WHERE id = ? AND entity_type = "teacher" AND entity_id = ?').bind(noteId, teacherId).run();
  return c.json({ success: true });
});

// --- TEACHER DOCUMENTS ENDPOINTS ---
// GET Documents list
teachers.get('/:id/documents', async (c) => {
  const user = c.get('user');
  const teacherId = c.req.param('id')!;

  const teacher = await c.env.DB.prepare('SELECT 1 FROM teachers WHERE id = ? AND institution_id = ? AND is_active = 1').bind(teacherId, user.institution_id).first();
  if (!teacher) return c.json({ error: 'Teacher not found' }, 404);
  if (!(await canViewTeacher(c.env.DB, user, teacherId))) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const { results } = await c.env.DB.prepare('SELECT * FROM documents WHERE entity_type = "teacher" AND entity_id = ? AND is_active = 1 ORDER BY created_at DESC').bind(teacherId).all();
  return c.json(results || []);
});

// POST upload file to R2 + metadata to D1
teachers.post('/:id/documents/upload', requireRole('admin', 'super_admin', 'Principal'), async (c) => {
  const user = c.get('user');
  const teacherId = c.req.param('id')!;

  const teacher = await c.env.DB.prepare('SELECT 1 FROM teachers WHERE id = ? AND institution_id = ? AND is_active = 1').bind(teacherId, user.institution_id).first();
  if (!teacher) return c.json({ error: 'Teacher not found' }, 404);
  if (!(await canViewTeacher(c.env.DB, user, teacherId))) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const body = await c.req.parseBody();
  const file = body['file'];
  const documentType = body['document_type'] || 'Other';

  if (!file || !(file instanceof File)) {
    return c.json({ error: 'No document file uploaded' }, 400);
  }

  const validationError = validateUploadedFile(file);
  if (validationError) {
    return c.json({ error: validationError }, 400);
  }

  const safeName = sanitizeFileName(file.name);

  try {
    const bytes = await file.arrayBuffer();
    const docId = crypto.randomUUID();
    const fileKey = `teacher_docs/${teacherId}/${docId}_${safeName}`;
    
    // Put file in R2 Bucket
    await c.env.FILES.put(fileKey, bytes, {
      httpMetadata: { contentType: file.type || 'application/octet-stream' }
    });

    // Save metadata in D1 Database
    await c.env.DB.prepare(`
      INSERT INTO documents (id, institution_id, entity_type, entity_id, name, folder, file_key, file_size, mime_type, uploaded_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(docId, user.institution_id, 'teacher', teacherId, safeName, documentType, fileKey, file.size, file.type || 'application/octet-stream', user.sub).run();

    return c.json({ success: true, id: docId });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// GET file stream / download from R2
teachers.get('/:id/documents/:docId/download', async (c) => {
  const user = c.get('user');
  const teacherId = c.req.param('id')!;
  const docId = c.req.param('docId')!;

  const teacher = await c.env.DB.prepare('SELECT 1 FROM teachers WHERE id = ? AND institution_id = ? AND is_active = 1').bind(teacherId, user.institution_id).first();
  if (!teacher) return c.json({ error: 'Teacher not found' }, 404);
  if (!(await canViewTeacher(c.env.DB, user, teacherId))) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const metadata = await c.env.DB.prepare('SELECT * FROM documents WHERE id = ? AND entity_type = "teacher" AND entity_id = ? AND is_active = 1')
    .bind(docId, teacherId).first<any>();

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
teachers.delete('/:id/documents/:docId', requireRole('admin', 'super_admin', 'Principal'), async (c) => {
  const user = c.get('user');
  const teacherId = c.req.param('id')!;
  const docId = c.req.param('docId')!;

  const teacher = await c.env.DB.prepare('SELECT 1 FROM teachers WHERE id = ? AND institution_id = ? AND is_active = 1').bind(teacherId, user.institution_id).first();
  if (!teacher) return c.json({ error: 'Teacher not found' }, 404);

  const metadata = await c.env.DB.prepare('SELECT * FROM documents WHERE id = ? AND entity_type = "teacher" AND entity_id = ? AND is_active = 1')
    .bind(docId, teacherId).first<any>();

  if (!metadata) return c.json({ error: 'Document not found' }, 404);

  // Soft delete in database
  await c.env.DB.prepare('UPDATE documents SET is_active = 0 WHERE id = ?').bind(docId).run();

  // Delete from R2 bucket in background / ignore errors
  try {
    await c.env.FILES.delete(metadata.file_key);
  } catch (err) {
    console.error('Failed to delete document from R2:', err);
  }

  return c.json({ success: true });
});

export default teachers;
