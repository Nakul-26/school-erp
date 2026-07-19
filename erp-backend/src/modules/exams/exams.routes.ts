import { Hono } from 'hono';
import { Env, JwtPayload } from '../../types';
import { ExamsRepository } from './exams.repository';
import { ExamsService } from './exams.service';
import { authMiddleware, requireRole } from '../../middleware/auth';

import { createAuditLog } from '../../utils/audit';
import { NotificationRepository } from '../notifications/notifications.repository';
import { NotificationService } from '../notifications/notifications.service';
import { isYearLockedOrArchived, isExamYearLockedOrArchived } from '../../utils/academic-year-lock';
import {
  getTeacherIdForUser,
  isTeacherOnly,
  teacherCanAccessExam,
  teacherCanAccessExamSubject,
  teacherCanAccessStudent,
  teacherHasSubjectAccess,
} from '../../utils/teacher-scope';

const exams = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();

exams.use('*', authMiddleware);

const ACADEMIC_STAFF_ROLES = new Set([
  'admin',
  'Admin',
  'super_admin',
  'Super Admin',
  'Principal',
  'principal',
  'HOD',
  'hod',
  'Teacher',
  'teacher',
]);

function hasAcademicStaffRole(user: JwtPayload): boolean {
  const roles = user.roles || (user.role ? [user.role] : []);
  return roles.some((role) => ACADEMIC_STAFF_ROLES.has(role));
}

function requireAcademicStaff(user: JwtPayload) {
  return hasAcademicStaffRole(user) ? null : { error: 'Forbidden' };
}

// --- EXAMS CRUD ---
exams.get('/', async (c) => {
  const user = c.get('user');
  const forbidden = requireAcademicStaff(user);
  if (forbidden) return c.json(forbidden, 403);

  const repo = new ExamsRepository(c.env.DB);
  const service = new ExamsService(repo);

  if (isTeacherOnly(user)) {
    const teacherId = await getTeacherIdForUser(c.env.DB, user);
    if (!teacherId) return c.json([]);

    const { results } = await c.env.DB.prepare(`
      SELECT DISTINCT e.*,
             ay.name AS academic_year_name,
             c.name AS course_name,
             c.course_code AS course_code
      FROM exams e
      LEFT JOIN academic_years ay ON e.academic_year_id = ay.id
      LEFT JOIN courses c ON e.course_id = c.id
      WHERE e.institution_id = ? AND e.is_active = 1
        AND (
          EXISTS (
            SELECT 1 FROM teacher_subject_assignments tsa
            WHERE tsa.teacher_id = ?
              AND tsa.course_id = e.course_id
              AND tsa.academic_year_id = e.academic_year_id
              AND tsa.is_active = 1
          )
          OR EXISTS (
            SELECT 1 FROM teaching_allocations ta
            WHERE ta.teacher_id = ?
              AND ta.program_id = e.course_id
              AND ta.academic_year_id = e.academic_year_id
              AND ta.institution_id = ?
              AND LOWER(ta.status) = 'active'
          )
        )
      ORDER BY e.start_date DESC
    `).bind(user.institution_id, teacherId, teacherId, user.institution_id).all();
    return c.json(results || []);
  }

  const results = await service.listExams(user.institution_id);
  return c.json(results);
});

exams.get('/:id', async (c) => {
  const user = c.get('user');
  const forbidden = requireAcademicStaff(user);
  if (forbidden) return c.json(forbidden, 403);

  const id = c.req.param('id')!;
  const repo = new ExamsRepository(c.env.DB);
  const service = new ExamsService(repo);
  
  const result = await service.getExam(id);
  if (!result || result.institution_id !== user.institution_id) {
    return c.json({ error: 'Exam not found' }, 404);
  }
  if (!(await teacherCanAccessExam(c.env.DB, user, id))) {
    return c.json({ error: 'Forbidden: exam is outside your teaching assignment' }, 403);
  }
  return c.json(result);
});

exams.post('/', requireRole('admin', 'super_admin', 'Principal', 'HOD', 'Teacher'), async (c) => {
  const user = c.get('user');
  const input = await c.req.json();

  // Input validation
  if (!input.name || !input.academic_year_id || !input.course_id || !input.semester || !input.start_date || !input.end_date) {
    return c.json({ error: 'Missing required fields: name, academic_year_id, course_id, semester, start_date, end_date' }, 400);
  }
  if (new Date(input.start_date) > new Date(input.end_date)) {
    return c.json({ error: 'start_date cannot be after end_date' }, 400);
  }
  if (isTeacherOnly(user)) {
    const teacherId = await getTeacherIdForUser(c.env.DB, user);
    if (!teacherId) return c.json({ error: 'Teacher profile not found for this user' }, 403);
    const assignment = await c.env.DB.prepare(`
      SELECT 1
      FROM (
        SELECT 1
        FROM teacher_subject_assignments
        WHERE teacher_id = ? AND course_id = ? AND academic_year_id = ? AND is_active = 1
        UNION
        SELECT 1
        FROM teaching_allocations
        WHERE teacher_id = ? AND program_id = ? AND academic_year_id = ? AND institution_id = ? AND LOWER(status) = 'active'
      )
      LIMIT 1
    `).bind(teacherId, input.course_id, input.academic_year_id, teacherId, input.course_id, input.academic_year_id, user.institution_id).first();
    if (!assignment) {
      return c.json({ error: 'Forbidden: exam course/year is outside your teaching assignment' }, 403);
    }
  }

  // Validate academic year is not locked/archived
  const isYearLocked = await isYearLockedOrArchived(c.env.DB, input.academic_year_id);
  if (isYearLocked) {
    return c.json({ error: 'This academic year is locked or archived. Modifications are not allowed.' }, 400);
  }

  const repo = new ExamsRepository(c.env.DB);
  const service = new ExamsService(repo);
  
  try {
    const id = await service.createExam(user.institution_id, input, user.sub);
    await createAuditLog(c.env.DB, user.sub, 'CREATE_EXAM', 'exams', id, `Created exam event: ${input.name}`);
    
    // Trigger in-app notification if published
    if (input.status === 'PUBLISHED') {
      try {
        const notifRepo = new NotificationRepository(c.env.DB);
        const notifService = new NotificationService(notifRepo, c.env.DB);
        await notifService.notifyExamCreated(user.institution_id, input.name, input.course_id, input.semester);
      } catch (err) {
        console.error('Failed to trigger exam notification:', err);
      }
    }

    return c.json({ id }, 201);
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});


exams.put('/:id', requireRole('admin', 'super_admin', 'Principal', 'HOD', 'Teacher'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const input = await c.req.json();
  const repo = new ExamsRepository(c.env.DB);
  const service = new ExamsService(repo);
  
  const existing = await service.getExam(id);
  if (!existing || existing.institution_id !== user.institution_id) {
    return c.json({ error: 'Exam not found' }, 404);
  }
  if (!(await teacherCanAccessExam(c.env.DB, user, id))) {
    return c.json({ error: 'Forbidden: exam is outside your teaching assignment' }, 403);
  }

  // Validate academic year is not locked/archived
  const isLockedOld = await isYearLockedOrArchived(c.env.DB, existing.academic_year_id);
  const isLockedNew = input.academic_year_id ? await isYearLockedOrArchived(c.env.DB, input.academic_year_id) : false;
  if (isLockedOld || isLockedNew) {
    return c.json({ error: 'This academic year is locked or archived. Modifications are not allowed.' }, 400);
  }
  
  try {
    await service.updateExam(id, input, user.sub);
    await createAuditLog(c.env.DB, user.sub, 'UPDATE_EXAM', 'exams', id, `Updated exam event: ${existing.name}`);
    
    // Trigger in-app notification if status is being set to PUBLISHED
    if (input.status === 'PUBLISHED' && existing.status !== 'PUBLISHED') {
      try {
        const notifRepo = new NotificationRepository(c.env.DB);
        const notifService = new NotificationService(notifRepo, c.env.DB);
        await notifService.notifyExamCreated(user.institution_id, existing.name, existing.course_id, existing.semester);
      } catch (err) {
        console.error('Failed to trigger exam notification on update:', err);
      }
    }

    return c.json({ success: true });
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

exams.delete('/:id', requireRole('admin', 'super_admin', 'Principal', 'HOD'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const repo = new ExamsRepository(c.env.DB);
  const service = new ExamsService(repo);
  
  const existing = await service.getExam(id);
  if (!existing || existing.institution_id !== user.institution_id) {
    return c.json({ error: 'Exam not found' }, 404);
  }

  // Validate academic year is not locked/archived
  const isLocked = await isYearLockedOrArchived(c.env.DB, existing.academic_year_id);
  if (isLocked) {
    return c.json({ error: 'This academic year is locked or archived. Modifications are not allowed.' }, 400);
  }
  
  await service.deleteExam(id, user.sub);
  await createAuditLog(c.env.DB, user.sub, 'DELETE_EXAM', 'exams', id, `Deleted exam event: ${existing.name}`);
  return c.json({ success: true });
});

// --- EXAM SUBJECTS ---
exams.get('/:id/subjects', async (c) => {
  const user = c.get('user');
  const forbidden = requireAcademicStaff(user);
  if (forbidden) return c.json(forbidden, 403);

  const id = c.req.param('id')!;
  const repo = new ExamsRepository(c.env.DB);
  const service = new ExamsService(repo);
  
  const exam = await service.getExam(id);
  if (!exam || exam.institution_id !== user.institution_id) {
    return c.json({ error: 'Exam not found' }, 404);
  }
  if (!(await teacherCanAccessExam(c.env.DB, user, id))) {
    return c.json({ error: 'Forbidden: exam is outside your teaching assignment' }, 403);
  }
  
  const results = await service.listExamSubjects(id);
  if (!isTeacherOnly(user)) return c.json(results);

  const filtered = [];
  for (const subject of results) {
    if (await teacherHasSubjectAccess(c.env.DB, user, subject.subject_id, undefined, exam.course_id, exam.academic_year_id)) {
      filtered.push(subject);
    }
  }
  return c.json(filtered);
});

exams.post('/:id/subjects', async (c) => {
  const user = c.get('user');
  const forbidden = requireAcademicStaff(user);
  if (forbidden) return c.json(forbidden, 403);

  const id = c.req.param('id')!;
  const input = await c.req.json();
  const repo = new ExamsRepository(c.env.DB);
  const service = new ExamsService(repo);
  
  const exam = await service.getExam(id);
  if (!exam || exam.institution_id !== user.institution_id) {
    return c.json({ error: 'Exam not found' }, 404);
  }
  if (!(await teacherHasSubjectAccess(c.env.DB, user, input.subject_id, undefined, exam.course_id, exam.academic_year_id))) {
    return c.json({ error: 'Forbidden: subject is outside your teaching assignment for this exam' }, 403);
  }

  // Validate academic year is not locked/archived
  const isLocked = await isYearLockedOrArchived(c.env.DB, exam.academic_year_id);
  if (isLocked) {
    return c.json({ error: 'This academic year is locked or archived. Modifications are not allowed.' }, 400);
  }
  
  try {
    const examSubjectId = await service.addExamSubject(user.institution_id, id, input, user.sub);
    await createAuditLog(c.env.DB, user.sub, 'ADD_EXAM_SUBJECT', 'exams', examSubjectId, `Added subject ${input.subject_id} to exam ${id}`);
    return c.json({ id: examSubjectId }, 201);
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

exams.delete('/subjects/:id', async (c) => {
  const user = c.get('user');
  const forbidden = requireAcademicStaff(user);
  if (forbidden) return c.json(forbidden, 403);

  const id = c.req.param('id')!;
  const repo = new ExamsRepository(c.env.DB);
  const service = new ExamsService(repo);
  
  const existing = await repo.findSubjectById(id);
  if (!existing || existing.institution_id !== user.institution_id) {
    return c.json({ error: 'Exam subject not found' }, 404);
  }
  if (!(await teacherCanAccessExamSubject(c.env.DB, user, id))) {
    return c.json({ error: 'Forbidden: exam subject is outside your teaching assignment' }, 403);
  }

  // Validate academic year is not locked/archived
  const isLocked = await isExamYearLockedOrArchived(c.env.DB, existing.exam_id);
  if (isLocked) {
    return c.json({ error: 'This academic year is locked or archived. Modifications are not allowed.' }, 400);
  }
  
  await service.removeExamSubject(id, user.sub);
  await createAuditLog(c.env.DB, user.sub, 'REMOVE_EXAM_SUBJECT', 'exams', id, `Removed exam subject ${existing.subject_id} from exam`);
  return c.json({ success: true });
});

// --- MARKS ---
exams.get('/subjects/:id/marks', async (c) => {
  const user = c.get('user');
  const forbidden = requireAcademicStaff(user);
  if (forbidden) return c.json(forbidden, 403);

  const id = c.req.param('id')!;
  const repo = new ExamsRepository(c.env.DB);
  const service = new ExamsService(repo);
  
  const examSub = await repo.findSubjectById(id);
  if (!examSub || examSub.institution_id !== user.institution_id) {
    return c.json({ error: 'Exam subject not found' }, 404);
  }
  if (!(await teacherCanAccessExamSubject(c.env.DB, user, id))) {
    return c.json({ error: 'Forbidden: exam subject is outside your teaching assignment' }, 403);
  }
  
  try {
    const results = await service.getMarksheet(id);
    if (!isTeacherOnly(user)) return c.json(results);

    const filtered = [];
    for (const row of results) {
      if (await teacherHasSubjectAccess(c.env.DB, user, examSub.subject_id, row.section_id)) {
        filtered.push(row);
      }
    }
    return c.json(filtered);
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

exams.post('/subjects/:id/marks', async (c) => {
  const user = c.get('user');
  const forbidden = requireAcademicStaff(user);
  if (forbidden) return c.json(forbidden, 403);

  const id = c.req.param('id')!;
  const input = await c.req.json();
  const repo = new ExamsRepository(c.env.DB);
  const service = new ExamsService(repo);
  
  const examSub = await repo.findSubjectById(id);
  if (!examSub || examSub.institution_id !== user.institution_id) {
    return c.json({ error: 'Exam subject not found' }, 404);
  }
  if (!(await teacherCanAccessExamSubject(c.env.DB, user, id))) {
    return c.json({ error: 'Forbidden: exam subject is outside your teaching assignment' }, 403);
  }

  const exam = await service.getExam(examSub.exam_id);
  if (!exam || exam.institution_id !== user.institution_id) {
    return c.json({ error: 'Exam not found' }, 404);
  }
  if (!Array.isArray(input)) {
    return c.json({ error: 'Marks payload must be an array' }, 400);
  }
  for (const record of input) {
    const enrollment = await c.env.DB.prepare(`
      SELECT se.section_id
      FROM student_enrollments se
      JOIN students s ON s.id = se.student_id
      WHERE se.student_id = ?
        AND se.academic_year_id = ?
        AND se.course_id = ?
        AND se.semester = ?
        AND se.is_active = 1
        AND s.institution_id = ?
        AND s.is_active = 1
      LIMIT 1
    `).bind(record.student_id, exam.academic_year_id, exam.course_id, exam.semester, user.institution_id).first<{ section_id: string }>();

    if (
      !enrollment ||
      !(await teacherCanAccessStudent(c.env.DB, user, record.student_id)) ||
      !(await teacherHasSubjectAccess(c.env.DB, user, examSub.subject_id, enrollment.section_id, exam.course_id, exam.academic_year_id))
    ) {
      return c.json({ error: 'Forbidden: marks include a student or subject outside your teaching assignment' }, 403);
    }
  }

  // Validate academic year is not locked/archived
  const isLocked = await isExamYearLockedOrArchived(c.env.DB, examSub.exam_id);
  if (isLocked) {
    return c.json({ error: 'This academic year is locked or archived. Modifications are not allowed.' }, 400);
  }
  
  try {
    await service.saveMarks(user.institution_id, id, input, user.sub);
    await createAuditLog(c.env.DB, user.sub, 'ENTER_EXAM_MARKS', 'exams', id, `Entered marks for exam subject ${id}`);
    
    // Trigger in-app notification
    try {
      const notifRepo = new NotificationRepository(c.env.DB);
      const notifService = new NotificationService(notifRepo, c.env.DB);
      await notifService.notifyResultPublished(user.institution_id, examSub.exam_id, c.env);
    } catch (err) {
      console.error('Failed to trigger result publication notification:', err);
    }

    return c.json({ success: true });
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

// --- RESULTS ---
exams.get('/:id/results', async (c) => {
  const user = c.get('user');
  const forbidden = requireAcademicStaff(user);
  if (forbidden) return c.json(forbidden, 403);

  const id = c.req.param('id')!;
  const repo = new ExamsRepository(c.env.DB);
  const service = new ExamsService(repo);
  
  const exam = await service.getExam(id);
  if (!exam || exam.institution_id !== user.institution_id) {
    return c.json({ error: 'Exam not found' }, 404);
  }
  if (!(await teacherCanAccessExam(c.env.DB, user, id))) {
    return c.json({ error: 'Forbidden: exam is outside your teaching assignment' }, 403);
  }
  
  const results = await service.getExamResults(id);
  if (!isTeacherOnly(user)) return c.json(results);

  const filteredResults = [];
  for (const result of results) {
    if (!(await teacherCanAccessStudent(c.env.DB, user, result.student_id))) continue;

    const enrollment = await c.env.DB.prepare(`
      SELECT section_id FROM student_enrollments
      WHERE student_id = ? AND academic_year_id = ? AND course_id = ? AND semester = ? AND is_active = 1
      LIMIT 1
    `).bind(result.student_id, exam.academic_year_id, exam.course_id, exam.semester).first<{ section_id: string }>();
    if (!enrollment) continue;

    const subjects = [];
    for (const subject of result.subjects) {
      if (await teacherHasSubjectAccess(c.env.DB, user, subject.subject_id, enrollment.section_id, exam.course_id, exam.academic_year_id)) {
        subjects.push(subject);
      }
    }

    if (subjects.length === 0) continue;

    const totalObtained = subjects.reduce((sum, subject) => sum + Number(subject.marks_obtained || 0), 0);
    const totalMax = subjects.reduce((sum, subject) => sum + Number(subject.max_marks || 0), 0);
    filteredResults.push({
      ...result,
      subjects,
      total_obtained: totalObtained,
      total_max: totalMax,
      percentage: totalMax > 0 ? Math.round((totalObtained / totalMax) * 10000) / 100 : 0,
      result: subjects.some((subject) => subject.status === 'FAIL') ? 'FAIL' : 'PASS',
    });
  }
  return c.json(filteredResults);
});

exams.get('/students/:studentId/results', async (c) => {
  const user = c.get('user');
  const studentId = c.req.param('studentId')!;
  const repo = new ExamsRepository(c.env.DB);
  const service = new ExamsService(repo);
  
  const student = await c.env.DB.prepare('SELECT * FROM students WHERE id = ? AND institution_id = ? AND is_active = 1').bind(studentId, user.institution_id).first<any>();
  if (!student) {
    return c.json({ error: 'Student not found' }, 404);
  }
  
  const userRoles = user.roles || (user.role ? [user.role] : []);
  const isStudent = userRoles.some(r => ['student', 'Student'].includes(r));
  const isParent = userRoles.some(r => ['parent', 'Parent', 'guardian', 'Guardian'].includes(r));
  const isAdminOrStaff = userRoles.some(r => ['super_admin', 'Super Admin', 'admin', 'Principal', 'HOD', 'Teacher'].includes(r));

  if (isStudent && student.user_id !== user.sub) {
    return c.json({ error: 'Forbidden: You cannot access other student results' }, 403);
  }

  if (isParent) {
    const isChild = await c.env.DB.prepare(
      'SELECT 1 FROM guardians WHERE user_id = ? AND student_id = ? AND is_active = 1'
    ).bind(user.sub, studentId).first();
    if (!isChild && !isAdminOrStaff) {
      return c.json({ error: 'Forbidden: You cannot access results of students who are not your children' }, 403);
    }
  }

  if (!isStudent && !isParent && !isAdminOrStaff) {
    return c.json({ error: 'Forbidden' }, 403);
  }
  if (isTeacherOnly(user) && !(await teacherCanAccessStudent(c.env.DB, user, studentId))) {
    return c.json({ error: 'Forbidden: student is outside your teaching assignment' }, 403);
  }

  const results = await service.listExamsForStudent(studentId);
  return c.json(results);
});

exams.get('/students/:studentId/exams/:examId/result', async (c) => {
  const user = c.get('user');
  const studentId = c.req.param('studentId')!;
  const examId = c.req.param('examId')!;
  const repo = new ExamsRepository(c.env.DB);
  const service = new ExamsService(repo);
  
  const student = await c.env.DB.prepare('SELECT * FROM students WHERE id = ? AND institution_id = ? AND is_active = 1').bind(studentId, user.institution_id).first<any>();
  if (!student) {
    return c.json({ error: 'Student not found' }, 404);
  }

  const userRoles = user.roles || (user.role ? [user.role] : []);
  const isStudent = userRoles.some(r => ['student', 'Student'].includes(r));
  const isParent = userRoles.some(r => ['parent', 'Parent', 'guardian', 'Guardian'].includes(r));
  const isAdminOrStaff = userRoles.some(r => ['super_admin', 'Super Admin', 'admin', 'Principal', 'HOD', 'Teacher'].includes(r));

  if (isStudent && student.user_id !== user.sub) {
    return c.json({ error: 'Forbidden: You cannot access other student results' }, 403);
  }

  if (isParent) {
    const isChild = await c.env.DB.prepare(
      'SELECT 1 FROM guardians WHERE user_id = ? AND student_id = ? AND is_active = 1'
    ).bind(user.sub, studentId).first();
    if (!isChild && !isAdminOrStaff) {
      return c.json({ error: 'Forbidden: You cannot access results of students who are not your children' }, 403);
    }
  }

  if (!isStudent && !isParent && !isAdminOrStaff) {
    return c.json({ error: 'Forbidden' }, 403);
  }
  if (isTeacherOnly(user) && !(await teacherCanAccessStudent(c.env.DB, user, studentId))) {
    return c.json({ error: 'Forbidden: student is outside your teaching assignment' }, 403);
  }
  
  const exam = await service.getExam(examId);
  if (!exam || exam.institution_id !== user.institution_id) {
    return c.json({ error: 'Exam not found' }, 404);
  }
  
  const resultCard = await service.getStudentResult(
    studentId, 
    examId, 
    `${student.first_name} ${student.last_name}`, 
    student.roll_number, 
    student.admission_number
  );
  
  if (!resultCard) {
    return c.json({ error: 'No marks entered yet for this student exam' }, 404);
  }
  
  return c.json(resultCard);
});

export default exams;
