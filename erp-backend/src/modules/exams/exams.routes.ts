import { Hono } from 'hono';
import { Env, JwtPayload } from '../../types';
import { ExamsRepository } from './exams.repository';
import { ExamsService } from './exams.service';
import { authMiddleware, requireRole } from '../../middleware/auth';

import { createAuditLog } from '../../utils/audit';
import { NotificationRepository } from '../notifications/notifications.repository';
import { NotificationService } from '../notifications/notifications.service';

const exams = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();

exams.use('*', authMiddleware);

// --- EXAMS CRUD ---
exams.get('/', async (c) => {
  const user = c.get('user');
  const repo = new ExamsRepository(c.env.DB);
  const service = new ExamsService(repo);
  const results = await service.listExams(user.institution_id);
  return c.json(results);
});

exams.get('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const repo = new ExamsRepository(c.env.DB);
  const service = new ExamsService(repo);
  
  const result = await service.getExam(id);
  if (!result || result.institution_id !== user.institution_id) {
    return c.json({ error: 'Exam not found' }, 404);
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
  
  await service.deleteExam(id, user.sub);
  await createAuditLog(c.env.DB, user.sub, 'DELETE_EXAM', 'exams', id, `Deleted exam event: ${existing.name}`);
  return c.json({ success: true });
});

// --- EXAM SUBJECTS ---
exams.get('/:id/subjects', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const repo = new ExamsRepository(c.env.DB);
  const service = new ExamsService(repo);
  
  const exam = await service.getExam(id);
  if (!exam || exam.institution_id !== user.institution_id) {
    return c.json({ error: 'Exam not found' }, 404);
  }
  
  const results = await service.listExamSubjects(id);
  return c.json(results);
});

exams.post('/:id/subjects', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const input = await c.req.json();
  const repo = new ExamsRepository(c.env.DB);
  const service = new ExamsService(repo);
  
  const exam = await service.getExam(id);
  if (!exam || exam.institution_id !== user.institution_id) {
    return c.json({ error: 'Exam not found' }, 404);
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
  const id = c.req.param('id')!;
  const repo = new ExamsRepository(c.env.DB);
  const service = new ExamsService(repo);
  
  const existing = await repo.findSubjectById(id);
  if (!existing || existing.institution_id !== user.institution_id) {
    return c.json({ error: 'Exam subject not found' }, 404);
  }
  
  await service.removeExamSubject(id, user.sub);
  await createAuditLog(c.env.DB, user.sub, 'REMOVE_EXAM_SUBJECT', 'exams', id, `Removed exam subject ${existing.subject_id} from exam`);
  return c.json({ success: true });
});

// --- MARKS ---
exams.get('/subjects/:id/marks', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const repo = new ExamsRepository(c.env.DB);
  const service = new ExamsService(repo);
  
  const examSub = await repo.findSubjectById(id);
  if (!examSub || examSub.institution_id !== user.institution_id) {
    return c.json({ error: 'Exam subject not found' }, 404);
  }
  
  try {
    const results = await service.getMarksheet(id);
    return c.json(results);
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

exams.post('/subjects/:id/marks', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const input = await c.req.json();
  const repo = new ExamsRepository(c.env.DB);
  const service = new ExamsService(repo);
  
  const examSub = await repo.findSubjectById(id);
  if (!examSub || examSub.institution_id !== user.institution_id) {
    return c.json({ error: 'Exam subject not found' }, 404);
  }
  
  try {
    await service.saveMarks(user.institution_id, id, input, user.sub);
    await createAuditLog(c.env.DB, user.sub, 'ENTER_EXAM_MARKS', 'exams', id, `Entered marks for exam subject ${id}`);
    
    // Trigger in-app notification
    try {
      const notifRepo = new NotificationRepository(c.env.DB);
      const notifService = new NotificationService(notifRepo, c.env.DB);
      await notifService.notifyResultPublished(user.institution_id, examSub.exam_id);
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
  const id = c.req.param('id')!;
  const repo = new ExamsRepository(c.env.DB);
  const service = new ExamsService(repo);
  
  const exam = await service.getExam(id);
  if (!exam || exam.institution_id !== user.institution_id) {
    return c.json({ error: 'Exam not found' }, 404);
  }
  
  const results = await service.getExamResults(id);
  return c.json(results);
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
