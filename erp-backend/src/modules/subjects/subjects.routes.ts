import { Hono } from 'hono';
import { Env, JwtPayload } from '../../types';
import { SubjectRepository } from './subjects.repository';
import { SubjectService } from './subjects.service';
import { authMiddleware, requirePermission } from '../../middleware/auth';
import { createAuditLog } from '../../utils/audit';

const subjects = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();

subjects.use('*', authMiddleware);

subjects.get('/', async (c) => {
  const user = c.get('user');
  const filters = c.req.query();
  const repo = new SubjectRepository(c.env.DB);
  const service = new SubjectService(repo);
  const results = await service.listSubjects(user.institution_id, {
    course_id: filters.course_id,
    semester: filters.semester ? parseInt(filters.semester) : undefined
  });
  return c.json(results);
});

subjects.get('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  
  const result = await c.env.DB.prepare(`
    SELECT 
      s.*,
      c.name as course_name,
      c.department_id,
      d.name as department_name
    FROM subjects s
    JOIN courses c ON c.id = s.course_id
    LEFT JOIN departments d ON d.id = c.department_id
    WHERE s.id = ? AND s.is_active = 1
  `).bind(id).first<any>();
  
  if (!result || result.institution_id !== user.institution_id) {
    return c.json({ error: 'Subject not found' }, 404);
  }
  return c.json(result);
});

subjects.post('/', requirePermission('academic.manage'), async (c) => {
  const user = c.get('user');
  const input = await c.req.json();
  const repo = new SubjectRepository(c.env.DB);
  const service = new SubjectService(repo);
  
  try {
    const id = await service.createSubject(user.institution_id, input, user.sub);
    await createAuditLog(c.env.DB, user.sub, 'CREATE_SUBJECT', 'subjects', id, `Created subject: ${input.subject_name} (${input.subject_code})`);
    return c.json({ id }, 201);
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

subjects.put('/:id', requirePermission('academic.manage'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const input = await c.req.json();
  const repo = new SubjectRepository(c.env.DB);
  const service = new SubjectService(repo);
  
  const existing = await service.getSubject(id);
  if (!existing || existing.institution_id !== user.institution_id) {
    return c.json({ error: 'Subject not found' }, 404);
  }
  
  try {
    await service.updateSubject(id, input, user.sub);
    await createAuditLog(c.env.DB, user.sub, 'UPDATE_SUBJECT', 'subjects', id, `Updated subject: ${existing.subject_name}`);
    return c.json({ success: true });
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

subjects.delete('/:id', requirePermission('academic.manage'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const repo = new SubjectRepository(c.env.DB);
  const service = new SubjectService(repo);
  
  const existing = await service.getSubject(id);
  if (!existing || existing.institution_id !== user.institution_id) {
    return c.json({ error: 'Subject not found' }, 404);
  }
  
  await service.deleteSubject(id, user.sub);
  await createAuditLog(c.env.DB, user.sub, 'DELETE_SUBJECT', 'subjects', id, `Deleted subject: ${existing.subject_name}`);
  return c.json({ success: true });
});

// --- OPERATIONAL TEACHING DATA ---
subjects.get('/:id/teaching', async (c) => {
  const user = c.get('user');
  const subjectId = c.req.param('id')!;

  const subject = await c.env.DB.prepare('SELECT 1 FROM subjects WHERE id = ? AND institution_id = ? AND is_active = 1').bind(subjectId, user.institution_id).first();
  if (!subject) return c.json({ error: 'Subject not found' }, 404);

  const { results } = await c.env.DB.prepare(`
    SELECT 
      tsa.id,
      tsa.teacher_id,
      tsa.section_id,
      tsa.academic_year_id,
      (t.first_name || ' ' || t.last_name) as teacher_name,
      t.employee_id as teacher_employee_id,
      s.name as section_name,
      s.year_number as section_year,
      y.name as academic_year_name
    FROM teacher_subject_assignments tsa
    JOIN teachers t ON t.id = tsa.teacher_id
    JOIN sections s ON s.id = tsa.section_id
    JOIN academic_years y ON y.id = tsa.academic_year_id
    WHERE tsa.subject_id = ? AND tsa.is_active = 1 AND t.is_active = 1 AND s.is_active = 1
  `).bind(subjectId).all();

  return c.json(results || []);
});

// --- STUDENTS ENROLLED & STATS ---
subjects.get('/:id/students', async (c) => {
  const user = c.get('user');
  const subjectId = c.req.param('id')!;

  const subject = await c.env.DB.prepare('SELECT 1 FROM subjects WHERE id = ? AND institution_id = ? AND is_active = 1').bind(subjectId, user.institution_id).first();
  if (!subject) return c.json({ error: 'Subject not found' }, 404);

  // Get enrolled students & attendance stats
  const { results: students } = await c.env.DB.prepare(`
    SELECT 
      s.id,
      s.first_name,
      s.last_name,
      s.roll_no,
      s.admission_no,
      sec.id as section_id,
      sec.name as section_name,
      COUNT(DISTINCT att_sess.id) as total_classes,
      COUNT(DISTINCT CASE WHEN sa.status = 'present' THEN att_sess.id END) as present_classes
    FROM student_enrollments se
    JOIN students s ON s.id = se.student_id
    JOIN sections sec ON sec.id = se.section_id
    JOIN teacher_subject_assignments tsa ON tsa.section_id = se.section_id AND tsa.subject_id = ? AND tsa.is_active = 1
    LEFT JOIN attendance_sessions att_sess ON att_sess.subject_id = ? AND att_sess.section_id = se.section_id AND att_sess.is_active = 1
    LEFT JOIN student_attendance sa ON sa.session_id = att_sess.id AND sa.student_id = s.id AND sa.is_active = 1
    WHERE se.is_active = 1 AND s.is_active = 1 AND tsa.is_active = 1
    GROUP BY s.id, sec.id
    ORDER BY sec.name, s.first_name, s.last_name
  `).bind(subjectId, subjectId).all<any>();

  // Fetch all marks for this subject
  const { results: marks } = await c.env.DB.prepare(`
    SELECT 
      sm.student_id,
      sm.marks_obtained,
      sm.max_marks,
      e.name as exam_name
    FROM student_marks sm
    JOIN exam_subjects es ON es.id = sm.exam_subject_id
    JOIN exams e ON e.id = es.exam_id
    WHERE es.subject_id = ? AND sm.is_active = 1 AND es.is_active = 1
  `).bind(subjectId).all<any>();

  // Map marks to students
  const studentsWithStats = students.map((std: any) => {
    const studentMarks = marks.filter((m: any) => m.student_id === std.id);
    let avgMarks = null;
    if (studentMarks.length > 0) {
      const obtained = studentMarks.reduce((acc, curr) => acc + curr.marks_obtained, 0);
      const max = studentMarks.reduce((acc, curr) => acc + curr.max_marks, 0);
      avgMarks = max > 0 ? Math.round((obtained / max) * 100) : null;
    }
    return {
      ...std,
      attendance_percent: std.total_classes > 0 ? Math.round((std.present_classes / std.total_classes) * 100) : null,
      marks_avg: avgMarks,
      exams: studentMarks.map((m: any) => ({ exam_name: m.exam_name, marks: m.marks_obtained, max: m.max_marks }))
    };
  });

  return c.json(studentsWithStats || []);
});

// --- CURRICULUM & LESSON PLAN ---
subjects.get('/:id/lesson-plan', async (c) => {
  const user = c.get('user');
  const subjectId = c.req.param('id')!;

  const subject = await c.env.DB.prepare('SELECT 1 FROM subjects WHERE id = ? AND institution_id = ? AND is_active = 1').bind(subjectId, user.institution_id).first();
  if (!subject) return c.json({ error: 'Subject not found' }, 404);

  const { results } = await c.env.DB.prepare(`
    SELECT * FROM subject_lesson_plans 
    WHERE subject_id = ? AND is_active = 1 
    ORDER BY unit_number, topic_title
  `).bind(subjectId).all();

  return c.json(results || []);
});

subjects.post('/:id/lesson-plan', requirePermission('academic.manage'), async (c) => {
  const user = c.get('user');
  const subjectId = c.req.param('id')!;
  const body = await c.req.json();

  if (!body.unit_number || !body.topic_title) {
    return c.json({ error: 'Unit number and Topic title are required' }, 400);
  }

  const subject = await c.env.DB.prepare('SELECT 1 FROM subjects WHERE id = ? AND institution_id = ? AND is_active = 1').bind(subjectId, user.institution_id).first();
  if (!subject) return c.json({ error: 'Subject not found' }, 404);

  const id = crypto.randomUUID();
  await c.env.DB.prepare(`
    INSERT INTO subject_lesson_plans (id, subject_id, unit_number, topic_title, topic_description, planned_hours, status)
    VALUES (?, ?, ?, ?, ?, ?, 'pending')
  `).bind(id, subjectId, body.unit_number, body.topic_title, body.topic_description || '', body.planned_hours || 1).run();

  await createAuditLog(c.env.DB, user.sub, 'CREATE_LESSON_PLAN', 'subjects', subjectId, `Added lesson plan topic: ${body.topic_title} to ${body.unit_number}`);

  return c.json({ success: true, id }, 201);
});

subjects.patch('/:id/lesson-plan/:topicId', requirePermission('academic.manage'), async (c) => {
  const user = c.get('user');
  const subjectId = c.req.param('id')!;
  const topicId = c.req.param('topicId')!;
  const body = await c.req.json();

  const topic = await c.env.DB.prepare('SELECT * FROM subject_lesson_plans WHERE id = ? AND subject_id = ? AND is_active = 1').bind(topicId, subjectId).first<any>();
  if (!topic) return c.json({ error: 'Lesson plan topic not found' }, 404);

  const status = body.status || topic.status;
  const completedHours = body.completed_hours !== undefined ? body.completed_hours : topic.completed_hours;
  const completedAt = status === 'completed' ? (body.completed_at || new Date().toISOString().split('T')[0]) : null;

  await c.env.DB.prepare(`
    UPDATE subject_lesson_plans 
    SET status = ?, completed_hours = ?, completed_at = ?, updated_at = datetime('now')
    WHERE id = ? AND subject_id = ?
  `).bind(status, completedHours, completedAt, topicId, subjectId).run();

  await createAuditLog(c.env.DB, user.sub, 'UPDATE_LESSON_PLAN', 'subjects', subjectId, `Updated lesson plan topic ${topic.topic_title} to status ${status}`);

  return c.json({ success: true });
});

subjects.delete('/:id/lesson-plan/:topicId', requirePermission('academic.manage'), async (c) => {
  const user = c.get('user');
  const subjectId = c.req.param('id')!;
  const topicId = c.req.param('topicId')!;

  const topic = await c.env.DB.prepare('SELECT 1 FROM subject_lesson_plans WHERE id = ? AND subject_id = ? AND is_active = 1').bind(topicId, subjectId).first();
  if (!topic) return c.json({ error: 'Lesson plan topic not found' }, 404);

  await c.env.DB.prepare("UPDATE subject_lesson_plans SET is_active = 0, updated_at = datetime('now') WHERE id = ? AND subject_id = ?").bind(topicId, subjectId).run();
  await createAuditLog(c.env.DB, user.sub, 'DELETE_LESSON_PLAN', 'subjects', subjectId, `Deleted lesson plan topic ID: ${topicId}`);

  return c.json({ success: true });
});

// --- ASSESSMENTS ---
subjects.get('/:id/assessments', async (c) => {
  const user = c.get('user');
  const subjectId = c.req.param('id')!;

  const subject = await c.env.DB.prepare('SELECT 1 FROM subjects WHERE id = ? AND institution_id = ? AND is_active = 1').bind(subjectId, user.institution_id).first();
  if (!subject) return c.json({ error: 'Subject not found' }, 404);

  const { results } = await c.env.DB.prepare(`
    SELECT * FROM subject_assessments 
    WHERE subject_id = ? AND is_active = 1 
    ORDER BY due_date ASC
  `).bind(subjectId).all();

  return c.json(results || []);
});

subjects.post('/:id/assessments', requirePermission('academic.manage'), async (c) => {
  const user = c.get('user');
  const subjectId = c.req.param('id')!;
  const body = await c.req.json();

  if (!body.name || !body.assessment_type) {
    return c.json({ error: 'Assessment Name and Type are required' }, 400);
  }

  const subject = await c.env.DB.prepare('SELECT 1 FROM subjects WHERE id = ? AND institution_id = ? AND is_active = 1').bind(subjectId, user.institution_id).first();
  if (!subject) return c.json({ error: 'Subject not found' }, 404);

  const id = crypto.randomUUID();
  await c.env.DB.prepare(`
    INSERT INTO subject_assessments (id, subject_id, name, assessment_type, max_marks, weightage_percent, due_date)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(id, subjectId, body.name, body.assessment_type, body.max_marks || 100, body.weightage_percent || 0, body.due_date || null).run();

  await createAuditLog(c.env.DB, user.sub, 'CREATE_SUBJECT_ASSESSMENT', 'subjects', subjectId, `Created assessment ${body.name} for subject`);

  return c.json({ success: true, id }, 201);
});

subjects.delete('/:id/assessments/:assessmentId', requirePermission('academic.manage'), async (c) => {
  const user = c.get('user');
  const subjectId = c.req.param('id')!;
  const assessmentId = c.req.param('assessmentId')!;

  const assessment = await c.env.DB.prepare('SELECT 1 FROM subject_assessments WHERE id = ? AND subject_id = ? AND is_active = 1').bind(assessmentId, subjectId).first();
  if (!assessment) return c.json({ error: 'Assessment not found' }, 404);

  await c.env.DB.prepare('UPDATE subject_assessments SET is_active = 0 WHERE id = ? AND subject_id = ?').bind(assessmentId, subjectId).run();
  await createAuditLog(c.env.DB, user.sub, 'DELETE_SUBJECT_ASSESSMENT', 'subjects', subjectId, `Deleted assessment ID ${assessmentId}`);

  return c.json({ success: true });
});

// --- GENERIC SUBJECT DOCUMENTS SYSTEM ---
subjects.get('/:id/documents', async (c) => {
  const user = c.get('user');
  const subjectId = c.req.param('id')!;

  const subject = await c.env.DB.prepare('SELECT 1 FROM subjects WHERE id = ? AND institution_id = ? AND is_active = 1').bind(subjectId, user.institution_id).first();
  if (!subject) return c.json({ error: 'Subject not found' }, 404);

  const { results } = await c.env.DB.prepare('SELECT * FROM documents WHERE entity_type = "subject" AND entity_id = ? AND is_active = 1 ORDER BY created_at DESC').bind(subjectId).all();
  return c.json(results || []);
});

subjects.post('/:id/documents/upload', async (c) => {
  const user = c.get('user');
  const subjectId = c.req.param('id')!;

  const subject = await c.env.DB.prepare('SELECT 1 FROM subjects WHERE id = ? AND institution_id = ? AND is_active = 1').bind(subjectId, user.institution_id).first();
  if (!subject) return c.json({ error: 'Subject not found' }, 404);

  const body = await c.req.parseBody();
  const file = body['file'];
  const folder = body['folder'] || 'General';

  if (!file || !(file instanceof File)) {
    return c.json({ error: 'No document file uploaded' }, 400);
  }

  try {
    const bytes = await file.arrayBuffer();
    const docId = crypto.randomUUID();
    const fileKey = `subject_docs/${subjectId}/${docId}_${file.name}`;
    
    // Put file in R2 Bucket
    await c.env.FILES.put(fileKey, bytes, {
      httpMetadata: { contentType: file.type || 'application/octet-stream' }
    });

    // Save metadata in D1 Database
    await c.env.DB.prepare(`
      INSERT INTO documents (id, institution_id, entity_type, entity_id, name, folder, file_key, file_size, mime_type, uploaded_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(docId, user.institution_id, 'subject', subjectId, file.name, folder, fileKey, file.size, file.type || 'application/octet-stream', user.sub).run();

    await createAuditLog(c.env.DB, user.sub, 'UPLOAD_SUBJECT_DOCUMENT', 'subjects', subjectId, `Uploaded document: ${file.name} to folder ${folder}`);

    return c.json({ success: true, id: docId });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

subjects.get('/:id/documents/:docId/download', async (c) => {
  const user = c.get('user');
  const subjectId = c.req.param('id')!;
  const docId = c.req.param('docId')!;

  const subject = await c.env.DB.prepare('SELECT 1 FROM subjects WHERE id = ? AND institution_id = ? AND is_active = 1').bind(subjectId, user.institution_id).first();
  if (!subject) return c.json({ error: 'Subject not found' }, 404);

  const metadata = await c.env.DB.prepare('SELECT * FROM documents WHERE id = ? AND entity_type = "subject" AND entity_id = ? AND is_active = 1')
    .bind(docId, subjectId).first<any>();

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

subjects.delete('/:id/documents/:docId', async (c) => {
  const user = c.get('user');
  const subjectId = c.req.param('id')!;
  const docId = c.req.param('docId')!;

  const subject = await c.env.DB.prepare('SELECT 1 FROM subjects WHERE id = ? AND institution_id = ? AND is_active = 1').bind(subjectId, user.institution_id).first();
  if (!subject) return c.json({ error: 'Subject not found' }, 404);

  const metadata = await c.env.DB.prepare('SELECT * FROM documents WHERE id = ? AND entity_type = "subject" AND entity_id = ? AND is_active = 1')
    .bind(docId, subjectId).first<any>();

  if (!metadata) return c.json({ error: 'Document not found' }, 404);

  try {
    await c.env.DB.prepare('UPDATE documents SET is_active = 0 WHERE id = ?').bind(docId).run();
    await createAuditLog(c.env.DB, user.sub, 'DELETE_SUBJECT_DOCUMENT', 'subjects', subjectId, `Deleted document: ${metadata.name}`);
    
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

subjects.get('/:id/timeline', async (c) => {
  const user = c.get('user');
  const subjectId = c.req.param('id')!;

  const subject = await c.env.DB.prepare('SELECT 1 FROM subjects WHERE id = ? AND institution_id = ? AND is_active = 1').bind(subjectId, user.institution_id).first();
  if (!subject) return c.json({ error: 'Subject not found' }, 404);

  const { results } = await c.env.DB.prepare(`
    SELECT al.id, al.action, al.description, al.timestamp, u.name as user_name, u.email as user_email
    FROM audit_logs al
    JOIN users u ON al.user_id = u.id
    WHERE al.record_id = ? AND al.module = 'subjects'
    ORDER BY al.timestamp DESC
    LIMIT 100
  `).bind(subjectId).all();

  return c.json(results || []);
});

export default subjects;
