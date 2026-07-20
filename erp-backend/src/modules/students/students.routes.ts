import { Hono } from 'hono';
import { Env, JwtPayload } from '../../types';
import { StudentRepository } from './students.repository';
import { StudentService } from './students.service';
import { authMiddleware, requireRole } from '../../middleware/auth';
import { getTeacherIdForUser, isTeacherOnly, teacherCanAccessStudent } from '../../utils/teacher-scope';
import { validateUploadedFile, sanitizeFileName } from '../../utils/file-upload';

const students = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();

students.use('*', authMiddleware);

// GET photo (Protected route, token can be in header or query parameter)
students.get('/photo/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  try {
    const student = await c.env.DB.prepare('SELECT photo, institution_id FROM students WHERE id = ? AND is_active = 1').bind(id).first<{ photo: string; institution_id: string }>();
    if (!student || !student.photo) {
      return c.json({ error: 'Photo not found' }, 404);
    }

    // Verify institution isolation
    if (student.institution_id !== user.institution_id) {
      return c.json({ error: 'Forbidden: unauthorized resource access' }, 403);
    }
    
    if (student.photo.startsWith('data:image')) {
      const match = student.photo.match(/^data:([^;]+);base64,(.*)$/);
      if (match) {
        const contentType = match[1];
        const base64Data = match[2];
        const binaryString = atob(base64Data);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        return new Response(bytes, {
          headers: { 'Content-Type': contentType }
        });
      }
    }

    const file = await c.env.FILES.get(student.photo);
    if (!file) {
      return c.json({ error: 'Photo not found in storage' }, 404);
    }
    const headers = new Headers();
    headers.set('Content-Type', file.httpMetadata?.contentType || 'image/jpeg');
    return new Response(file.body, { headers });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

students.get('/', async (c) => {
  const user = c.get('user');
  const repo = new StudentRepository(c.env.DB);
  
  const userRoles = user.roles || (user.role ? [user.role] : []);
  const isStudent = userRoles.some(r => ['student', 'Student'].includes(r));
  const isParent = userRoles.some(r => ['parent', 'Parent', 'guardian', 'Guardian'].includes(r));
  const isStaff = userRoles.some(r => [
    'admin',
    'Admin',
    'super_admin',
    'Super Admin',
    'role-super-admin',
    'Principal',
    'principal',
    'HOD',
    'hod',
    'Teacher',
    'teacher'
  ].includes(r));

  if (isStudent) {
    // Return only their own student record
    const { results } = await c.env.DB.prepare(`
      SELECT 
        s.*,
        se.academic_year_id,
        se.course_id,
        se.section_id,
        se.semester,
        c.name AS program_name,
        c.course_code AS program_code,
        sec.name AS section_name,
        ay.name AS academic_year_name,
        (
          SELECT CASE 
            WHEN COUNT(status) > 0 THEN ROUND(100.0 * COUNT(CASE WHEN status IN ('present', 'late') THEN 1 END) / COUNT(status), 0)
            ELSE 100 
          END
          FROM student_attendance 
          WHERE student_id = s.id AND is_active = 1
        ) AS attendance_percentage,
        (
          SELECT COALESCE(SUM(total_amount - paid_amount), 0) 
          FROM student_fee_records 
          WHERE student_id = s.id AND is_active = 1
        ) AS fee_due
      FROM students s
      LEFT JOIN student_enrollments se ON se.id = (
        SELECT id FROM student_enrollments 
        WHERE student_id = s.id AND is_active = 1 
        ORDER BY created_at DESC LIMIT 1
      )
      LEFT JOIN courses c ON c.id = se.course_id AND c.is_active = 1
      LEFT JOIN sections sec ON sec.id = se.section_id AND sec.is_active = 1
      LEFT JOIN academic_years ay ON ay.id = se.academic_year_id AND ay.is_active = 1
      WHERE s.user_id = ? AND s.institution_id = ? AND s.is_active = 1
    `).bind(user.sub, user.institution_id).all();
    return c.json(results || []);
  }

  if (isParent) {
    // Return only their children
    const { results } = await c.env.DB.prepare(`
      SELECT 
        s.*,
        se.academic_year_id,
        se.course_id,
        se.section_id,
        se.semester,
        c.name AS program_name,
        c.course_code AS program_code,
        sec.name AS section_name,
        ay.name AS academic_year_name,
        (
          SELECT CASE 
            WHEN COUNT(status) > 0 THEN ROUND(100.0 * COUNT(CASE WHEN status IN ('present', 'late') THEN 1 END) / COUNT(status), 0)
            ELSE 100 
          END
          FROM student_attendance 
          WHERE student_id = s.id AND is_active = 1
        ) AS attendance_percentage,
        (
          SELECT COALESCE(SUM(total_amount - paid_amount), 0) 
          FROM student_fee_records 
          WHERE student_id = s.id AND is_active = 1
        ) AS fee_due
      FROM students s
      JOIN guardians g ON g.student_id = s.id
      LEFT JOIN student_enrollments se ON se.id = (
        SELECT id FROM student_enrollments 
        WHERE student_id = s.id AND is_active = 1 
        ORDER BY created_at DESC LIMIT 1
      )
      LEFT JOIN courses c ON c.id = se.course_id AND c.is_active = 1
      LEFT JOIN sections sec ON sec.id = se.section_id AND sec.is_active = 1
      LEFT JOIN academic_years ay ON ay.id = se.academic_year_id AND ay.is_active = 1
      WHERE g.user_id = ? AND s.institution_id = ? AND s.is_active = 1 AND g.is_active = 1
    `).bind(user.sub, user.institution_id).all();
    return c.json(results || []);
  }

  const search = c.req.query('search') || undefined;
  const program_id = c.req.query('program_id') || undefined;
  const section_id = c.req.query('section_id') || undefined;
  const academic_year_id = c.req.query('academic_year_id') || undefined;
  const status = c.req.query('status') || undefined;
  const limitVal = c.req.query('limit');
  const offsetVal = c.req.query('offset');

  const limit = limitVal ? parseInt(limitVal, 10) : undefined;
  const offset = offsetVal ? parseInt(offsetVal, 10) : undefined;

  if (isTeacherOnly(user)) {
    const teacherId = await getTeacherIdForUser(c.env.DB, user);
    if (!teacherId) {
      return limit !== undefined || offset !== undefined ? c.json({ students: [], total: 0 }) : c.json([]);
    }

    let whereClause = `
      WHERE s.institution_id = ? AND s.is_active = 1
        AND (
          EXISTS (
            SELECT 1 FROM teacher_subject_assignments tsa
            WHERE tsa.teacher_id = ? AND tsa.section_id = se.section_id AND tsa.is_active = 1
          )
          OR EXISTS (
            SELECT 1 FROM teaching_allocations ta
            WHERE ta.teacher_id = ? AND ta.section_id = se.section_id AND ta.institution_id = ? AND LOWER(ta.status) = 'active'
          )
          OR EXISTS (
            SELECT 1 FROM sections sec_ct
            WHERE sec_ct.id = se.section_id AND sec_ct.class_teacher_id = ? AND sec_ct.is_active = 1
          )
        )
    `;
    const params: any[] = [user.institution_id, teacherId, teacherId, user.institution_id, teacherId];

    if (status) {
      whereClause += ' AND s.status = ?';
      params.push(status);
    }
    if (academic_year_id) {
      whereClause += ' AND se.academic_year_id = ?';
      params.push(academic_year_id);
    }
    if (program_id) {
      whereClause += ' AND se.course_id = ?';
      params.push(program_id);
    }
    if (section_id) {
      whereClause += ' AND se.section_id = ?';
      params.push(section_id);
    }
    if (search) {
      whereClause += ` AND (
        s.first_name LIKE ?
        OR s.last_name LIKE ?
        OR s.admission_number LIKE ?
        OR (s.roll_number IS NOT NULL AND s.roll_number LIKE ?)
      )`;
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    const joinLatestEnrollment = `
      LEFT JOIN student_enrollments se ON se.id = (
        SELECT id FROM student_enrollments
        WHERE student_id = s.id AND is_active = 1
        ORDER BY created_at DESC LIMIT 1
      )
    `;

    const countResult = await c.env.DB.prepare(`
      SELECT COUNT(DISTINCT s.id) as count
      FROM students s
      ${joinLatestEnrollment}
      ${whereClause}
    `).bind(...params).first<{ count: number }>();

    let selectQuery = `
      SELECT
        s.*,
        se.academic_year_id,
        se.course_id,
        se.section_id,
        se.semester,
        c.name AS program_name,
        c.course_code AS program_code,
        sec.name AS section_name,
        ay.name AS academic_year_name,
        (
          SELECT CASE
            WHEN COUNT(status) > 0 THEN ROUND(100.0 * COUNT(CASE WHEN status IN ('present', 'late') THEN 1 END) / COUNT(status), 0)
            ELSE 100
          END
          FROM student_attendance
          WHERE student_id = s.id AND is_active = 1
        ) AS attendance_percentage,
        (
          SELECT COALESCE(SUM(total_amount - paid_amount), 0)
          FROM student_fee_records
          WHERE student_id = s.id AND is_active = 1
        ) AS fee_due,
        g.name AS guardian_name,
        g.relationship AS guardian_relationship,
        g.phone AS guardian_phone,
        g.email AS guardian_email
      FROM students s
      ${joinLatestEnrollment}
      LEFT JOIN courses c ON c.id = se.course_id AND c.is_active = 1
      LEFT JOIN sections sec ON sec.id = se.section_id AND sec.is_active = 1
      LEFT JOIN academic_years ay ON ay.id = se.academic_year_id AND ay.is_active = 1
      LEFT JOIN guardians g ON g.id = (
        SELECT id FROM guardians
        WHERE student_id = s.id AND is_active = 1
        ORDER BY created_at DESC LIMIT 1
      )
      ${whereClause}
      ORDER BY s.created_at DESC
    `;
    const selectParams = [...params];
    if (typeof limit === 'number') {
      selectQuery += ' LIMIT ?';
      selectParams.push(limit);
      if (typeof offset === 'number') {
        selectQuery += ' OFFSET ?';
        selectParams.push(offset);
      }
    }

    const { results } = await c.env.DB.prepare(selectQuery).bind(...selectParams).all<any>();
    const payload = { students: results || [], total: countResult?.count || 0 };
    return limit !== undefined || offset !== undefined ? c.json(payload) : c.json(payload.students);
  }

  if (!isStaff) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const service = new StudentService(repo);

  if (limit !== undefined || offset !== undefined) {
    const results = await service.listStudents(user.institution_id, {
      search,
      program_id,
      section_id,
      academic_year_id,
      status,
      limit,
      offset
    });
    return c.json(results);
  } else {
    const results = await service.listStudents(user.institution_id, {
      search,
      program_id,
      section_id,
      academic_year_id,
      status
    });
    return c.json(results.students);
  }
});

students.get('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const repo = new StudentRepository(c.env.DB);
  const service = new StudentService(repo);
  const result = await service.getStudent(id);
  
  if (!result || result.institution_id !== user.institution_id) {
    return c.json({ error: 'Student not found' }, 404);
  }

  const userRoles = user.roles || (user.role ? [user.role] : []);
  const isStudent = userRoles.some(r => ['student', 'Student'].includes(r));
  const isParent = userRoles.some(r => ['parent', 'Parent', 'guardian', 'Guardian'].includes(r));
  const isAdminOrStaff = userRoles.some(r => ['super_admin', 'Super Admin', 'admin', 'Principal', 'HOD', 'Teacher'].includes(r));

  if (isStudent && result.user_id !== user.sub) {
    return c.json({ error: 'Forbidden: You cannot access other student profiles' }, 403);
  }

  if (isParent) {
    const isChild = await c.env.DB.prepare(
      'SELECT 1 FROM guardians WHERE user_id = ? AND student_id = ? AND is_active = 1'
    ).bind(user.sub, id).first();
    if (!isChild && !isAdminOrStaff) {
      return c.json({ error: 'Forbidden: You cannot access profiles of students who are not your children' }, 403);
    }
  }

  if (!isStudent && !isParent && !isAdminOrStaff) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  if (isTeacherOnly(user) && !(await teacherCanAccessStudent(c.env.DB, user, id))) {
    return c.json({ error: 'Forbidden: student is outside your teaching assignment' }, 403);
  }

  return c.json(result);
});

students.post('/', requireRole('admin', 'super_admin'), async (c) => {
  const user = c.get('user');
  const input = await c.req.json();
  const repo = new StudentRepository(c.env.DB);
  const service = new StudentService(repo);
  try {
    const id = await service.createStudent(user.institution_id, input, user.sub);
    return c.json({ id }, 201);
  } catch (err: any) {
    if (err.message && (err.message.includes('UNIQUE constraint failed: students.admission_number') || err.message.includes('students.admission_number'))) {
      return c.json({ error: 'Admission number already exists. Please choose a unique admission number.' }, 400);
    }
    throw err;
  }
});

students.put('/:id', requireRole('admin', 'super_admin'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const input = await c.req.json();
  const repo = new StudentRepository(c.env.DB);
  const service = new StudentService(repo);
  
  const existing = await service.getStudent(id);
  if (!existing || existing.institution_id !== user.institution_id) {
    return c.json({ error: 'Student not found' }, 404);
  }
  
  try {
    await service.updateStudent(id, input, user.sub);
    return c.json({ success: true });
  } catch (err: any) {
    if (err.message && (err.message.includes('UNIQUE constraint failed: students.admission_number') || err.message.includes('students.admission_number'))) {
      return c.json({ error: 'Admission number already exists. Please enter a unique admission number.' }, 400);
    }
    throw err;
  }
});

students.delete('/:id', requireRole('admin', 'super_admin'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const repo = new StudentRepository(c.env.DB);
  const service = new StudentService(repo);
  
  const existing = await service.getStudent(id);
  if (!existing || existing.institution_id !== user.institution_id) {
    return c.json({ error: 'Student not found' }, 404);
  }
  
  await service.deleteStudent(id, user.sub);
  return c.json({ success: true });
});

// --- BULK STUDENT ACTIONS ---
students.post('/bulk-action', requireRole('admin', 'super_admin'), async (c) => {
  const user = c.get('user');
  const { student_ids, action, payload } = await c.req.json();

  if (!student_ids || !Array.isArray(student_ids) || student_ids.length === 0) {
    return c.json({ error: 'No student_ids provided' }, 400);
  }

  const db = c.env.DB;
  
  if (action === 'assign_section') {
    const { section_id } = payload || {};
    if (!section_id) return c.json({ error: 'section_id is required' }, 400);

    // Verify section belongs to institution
    const secExists = await db.prepare('SELECT course_id, academic_year_id FROM sections WHERE id = ? AND institution_id = ? AND is_active = 1').bind(section_id, user.institution_id).first<{ course_id: string; academic_year_id: string }>();
    if (!secExists) return c.json({ error: 'Invalid section' }, 400);

    for (const sId of student_ids) {
      // Check if student belongs to this institution
      const stu = await db.prepare('SELECT 1 FROM students WHERE id = ? AND institution_id = ? AND is_active = 1').bind(sId, user.institution_id).first();
      if (!stu) continue;

      // Check if enrollment exists in current section
      const activeEnrollment = await db.prepare('SELECT id FROM student_enrollments WHERE student_id = ? AND is_active = 1 ORDER BY created_at DESC LIMIT 1').bind(sId).first<{ id: string }>();
      
      if (activeEnrollment) {
        // Update section
        await db.prepare('UPDATE student_enrollments SET section_id = ?, updated_at = datetime(\'now\'), updated_by = ? WHERE id = ?')
          .bind(section_id, user.sub, activeEnrollment.id).run();
      } else {
        // Create new enrollment
        const enrollId = crypto.randomUUID();
        await db.prepare('INSERT INTO student_enrollments (id, student_id, academic_year_id, course_id, section_id, semester, created_by, updated_by) VALUES (?, ?, ?, ?, ?, 1, ?, ?)')
          .bind(enrollId, sId, secExists.academic_year_id, secExists.course_id, section_id, user.sub, user.sub).run();
      }
    }
    return c.json({ success: true, message: `Successfully assigned section for ${student_ids.length} students.` });
  }

  if (action === 'promote_semester') {
    for (const sId of student_ids) {
      const stu = await db.prepare('SELECT 1 FROM students WHERE id = ? AND institution_id = ? AND is_active = 1').bind(sId, user.institution_id).first();
      if (!stu) continue;

      const activeEnrollment = await db.prepare('SELECT id, semester FROM student_enrollments WHERE student_id = ? AND is_active = 1 ORDER BY created_at DESC LIMIT 1').bind(sId).first<{ id: string; semester: number }>();
      if (activeEnrollment) {
        const nextSem = (activeEnrollment.semester || 1) + 1;
        await db.prepare('UPDATE student_enrollments SET semester = ?, updated_at = datetime(\'now\'), updated_by = ? WHERE id = ?')
          .bind(nextSem, user.sub, activeEnrollment.id).run();
      }
    }
    return c.json({ success: true, message: `Successfully promoted semester for ${student_ids.length} students.` });
  }

  if (action === 'deactivate') {
    for (const sId of student_ids) {
      await db.prepare('UPDATE students SET status = \'DROPPED\', updated_at = datetime(\'now\'), updated_by = ? WHERE id = ? AND institution_id = ?')
        .bind(user.sub, sId, user.institution_id).run();
    }
    return c.json({ success: true, message: `Successfully deactivated ${student_ids.length} students.` });
  }

  if (action === 'reactivate') {
    for (const sId of student_ids) {
      await db.prepare('UPDATE students SET status = \'ACTIVE\', updated_at = datetime(\'now\'), updated_by = ? WHERE id = ? AND institution_id = ?')
        .bind(user.sub, sId, user.institution_id).run();
    }
    return c.json({ success: true, message: `Successfully reactivated ${student_ids.length} students.` });
  }

  if (action === 'delete') {
    const repo = new StudentRepository(db);
    const service = new StudentService(repo);
    for (const sId of student_ids) {
      await service.deleteStudent(sId, user.sub);
    }
    return c.json({ success: true, message: `Successfully deleted ${student_ids.length} students.` });
  }

  return c.json({ error: 'Invalid action' }, 400);
});

// --- STUDENT NOTES ENDPOINTS ---
// GET Notes
students.get('/:id/notes', async (c) => {
  const user = c.get('user');
  const studentId = c.req.param('id')!;
  
  // Verify student matches institution
  const student = await c.env.DB.prepare('SELECT 1 FROM students WHERE id = ? AND institution_id = ? AND is_active = 1').bind(studentId, user.institution_id).first();
  if (!student) return c.json({ error: 'Student not found' }, 404);
  if (!(await teacherCanAccessStudent(c.env.DB, user, studentId))) {
    return c.json({ error: 'Forbidden: student is outside your teaching assignment' }, 403);
  }

  const { results } = await c.env.DB.prepare('SELECT * FROM notes WHERE entity_type = "student" AND entity_id = ? AND is_active = 1 ORDER BY created_at DESC').bind(studentId).all();
  return c.json(results || []);
});

// POST Note
students.post('/:id/notes', async (c) => {
  const user = c.get('user');
  const studentId = c.req.param('id')!;
  const { content } = await c.req.json();

  if (!content || content.trim() === '') {
    return c.json({ error: 'Note content is required' }, 400);
  }

  const student = await c.env.DB.prepare('SELECT 1 FROM students WHERE id = ? AND institution_id = ? AND is_active = 1').bind(studentId, user.institution_id).first();
  if (!student) return c.json({ error: 'Student not found' }, 404);
  if (!(await teacherCanAccessStudent(c.env.DB, user, studentId))) {
    return c.json({ error: 'Forbidden: student is outside your teaching assignment' }, 403);
  }

  const noteId = crypto.randomUUID();
  const authorName = user.name || 'Staff member';
  
  await c.env.DB.prepare('INSERT INTO notes (id, institution_id, entity_type, entity_id, author_id, author_name, content) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(noteId, user.institution_id, 'student', studentId, user.sub, authorName, content).run();

  return c.json({ id: noteId, success: true }, 201);
});

// DELETE Note
students.delete('/:id/notes/:noteId', async (c) => {
  const user = c.get('user');
  const studentId = c.req.param('id')!;
  const noteId = c.req.param('noteId')!;

  const student = await c.env.DB.prepare('SELECT 1 FROM students WHERE id = ? AND institution_id = ? AND is_active = 1').bind(studentId, user.institution_id).first();
  if (!student) return c.json({ error: 'Student not found' }, 404);
  if (!(await teacherCanAccessStudent(c.env.DB, user, studentId))) {
    return c.json({ error: 'Forbidden: student is outside your teaching assignment' }, 403);
  }

  await c.env.DB.prepare('UPDATE notes SET is_active = 0 WHERE id = ? AND entity_type = "student" AND entity_id = ?').bind(noteId, studentId).run();
  return c.json({ success: true });
});

// --- STUDENT DOCUMENTS ENDPOINTS ---
// GET Documents list
students.get('/:id/documents', async (c) => {
  const user = c.get('user');
  const studentId = c.req.param('id')!;

  const student = await c.env.DB.prepare('SELECT 1 FROM students WHERE id = ? AND institution_id = ? AND is_active = 1').bind(studentId, user.institution_id).first();
  if (!student) return c.json({ error: 'Student not found' }, 404);
  if (!(await teacherCanAccessStudent(c.env.DB, user, studentId))) {
    return c.json({ error: 'Forbidden: student is outside your teaching assignment' }, 403);
  }

  const { results } = await c.env.DB.prepare('SELECT * FROM documents WHERE entity_type = "student" AND entity_id = ? AND is_active = 1 ORDER BY created_at DESC').bind(studentId).all();
  return c.json(results || []);
});

// POST upload file to R2 + metadata to D1
students.post('/:id/documents/upload', async (c) => {
  const user = c.get('user');
  const studentId = c.req.param('id')!;

  const student = await c.env.DB.prepare('SELECT 1 FROM students WHERE id = ? AND institution_id = ? AND is_active = 1').bind(studentId, user.institution_id).first();
  if (!student) return c.json({ error: 'Student not found' }, 404);
  if (!(await teacherCanAccessStudent(c.env.DB, user, studentId))) {
    return c.json({ error: 'Forbidden: student is outside your teaching assignment' }, 403);
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
    const fileKey = `student_docs/${studentId}/${docId}_${safeName}`;
    
    // Put file in R2 Bucket
    await c.env.FILES.put(fileKey, bytes, {
      httpMetadata: { contentType: file.type || 'application/octet-stream' }
    });

    // Save metadata in D1 Database
    await c.env.DB.prepare(`
      INSERT INTO documents (id, institution_id, entity_type, entity_id, name, folder, file_key, file_size, mime_type, uploaded_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(docId, user.institution_id, 'student', studentId, safeName, documentType, fileKey, file.size, file.type || 'application/octet-stream', user.sub).run();

    return c.json({ success: true, id: docId });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// GET file stream / download from R2
students.get('/:id/documents/:docId/download', async (c) => {
  const user = c.get('user');
  const studentId = c.req.param('id')!;
  const docId = c.req.param('docId')!;

  const student = await c.env.DB.prepare('SELECT 1 FROM students WHERE id = ? AND institution_id = ? AND is_active = 1').bind(studentId, user.institution_id).first();
  if (!student) return c.json({ error: 'Student not found' }, 404);
  if (!(await teacherCanAccessStudent(c.env.DB, user, studentId))) {
    return c.json({ error: 'Forbidden: student is outside your teaching assignment' }, 403);
  }

  const metadata = await c.env.DB.prepare('SELECT * FROM documents WHERE id = ? AND entity_type = "student" AND entity_id = ? AND is_active = 1')
    .bind(docId, studentId).first<any>();

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
students.delete('/:id/documents/:docId', async (c) => {
  const user = c.get('user');
  const studentId = c.req.param('id')!;
  const docId = c.req.param('docId')!;

  const student = await c.env.DB.prepare('SELECT 1 FROM students WHERE id = ? AND institution_id = ? AND is_active = 1').bind(studentId, user.institution_id).first();
  if (!student) return c.json({ error: 'Student not found' }, 404);

  if (!(await teacherCanAccessStudent(c.env.DB, user, studentId))) {
    return c.json({ error: 'Forbidden: student is outside your teaching assignment' }, 403);
  }

  const metadata = await c.env.DB.prepare('SELECT * FROM documents WHERE id = ? AND entity_type = "student" AND entity_id = ? AND is_active = 1')
    .bind(docId, studentId).first<any>();

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

// POST upload photo to R2
students.post('/:id/photo', requireRole('admin', 'super_admin'), async (c) => {
  const user = c.get('user');
  const studentId = c.req.param('id')!;

  const student = await c.env.DB.prepare('SELECT 1 FROM students WHERE id = ? AND institution_id = ? AND is_active = 1').bind(studentId, user.institution_id).first();
  if (!student) return c.json({ error: 'Student not found' }, 404);

  const body = await c.req.parseBody();
  const file = body['file'];

  if (!file || !(file instanceof File)) {
    return c.json({ error: 'No photo file uploaded' }, 400);
  }

  const validationError = validateUploadedFile(file, { photoOnly: true });
  if (validationError) {
    return c.json({ error: validationError }, 400);
  }

  const safeName = sanitizeFileName(file.name);

  try {
    const bytes = await file.arrayBuffer();
    const fileKey = `student_photos/${studentId}_${Date.now()}_${safeName}`;
    
    await c.env.FILES.put(fileKey, bytes, {
      httpMetadata: { contentType: file.type || 'image/jpeg' }
    });

    await c.env.DB.prepare('UPDATE students SET photo = ? WHERE id = ?').bind(fileKey, studentId).run();

    return c.json({ success: true, photoUrl: `/students/photo/${studentId}` });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

export default students;
