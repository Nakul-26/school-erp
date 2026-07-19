import { Hono } from 'hono';
import { Env, JwtPayload } from '../../types';
import { GradesRepository } from './grades.repository';
import { GradesService } from './grades.service';
import { authMiddleware, requireRole } from '../../middleware/auth';
import { createAuditLog } from '../../utils/audit';
import { isTeacherOnly, teacherCanAccessExam, teacherCanAccessStudent, teacherHasSubjectAccess } from '../../utils/teacher-scope';

const grades = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();

grades.use('*', authMiddleware);

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

// --- GRADE SCALES ---
grades.get('/scales', async (c) => {
  const user = c.get('user');
  const repo = new GradesRepository(c.env.DB);
  const service = new GradesService(repo);
  const results = await service.listScales(user.institution_id);
  return c.json(results);
});

grades.post('/scales/seed', requireRole('admin', 'super_admin', 'Principal'), async (c) => {
  const user = c.get('user');
  const repo = new GradesRepository(c.env.DB);
  const service = new GradesService(repo);
  try {
    await service.seedDefaultScales(user.institution_id, user.sub);
    await createAuditLog(c.env.DB, user.sub, 'SEED_GRADE_SCALES', 'grades', null, `Seeded default grade scales`);
    return c.json({ success: true }, 201);
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

grades.put('/scales', requireRole('admin', 'super_admin', 'Principal'), async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const repo = new GradesRepository(c.env.DB);
  const service = new GradesService(repo);
  try {
    await service.replaceScales(user.institution_id, body.scales, user.sub);
    await createAuditLog(c.env.DB, user.sub, 'UPDATE_GRADE_SCALES', 'grades', null, `Updated grade scales configuration`);
    return c.json({ success: true });
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

// --- REPORT CARDS ---
grades.get('/report-card/:examId/:studentId', async (c) => {
  const user = c.get('user');
  const examId = c.req.param('examId')!;
  const studentId = c.req.param('studentId')!;

  const userRoles = user.roles || (user.role ? [user.role] : []);
  const isStudent = userRoles.some(r => ['student', 'Student'].includes(r));
  const isParent = userRoles.some(r => ['parent', 'Parent', 'guardian', 'Guardian'].includes(r));
  const isStaff = hasAcademicStaffRole(user);

  if (!isStaff) {
    if (isStudent) {
      const student = await c.env.DB.prepare('SELECT 1 FROM students WHERE user_id = ? AND id = ? AND institution_id = ? AND is_active = 1')
        .bind(user.sub, studentId, user.institution_id)
        .first();
      if (!student) return c.json({ error: 'Forbidden: Cannot access another student\'s report card' }, 403);
    } else if (isParent) {
      const linked = await c.env.DB.prepare(`
        SELECT 1
        FROM guardians g
        JOIN students s ON s.id = g.student_id
        WHERE g.user_id = ?
          AND g.student_id = ?
          AND g.is_active = 1
          AND s.institution_id = ?
          AND s.is_active = 1
        LIMIT 1
      `).bind(user.sub, studentId, user.institution_id).first();
      if (!linked) return c.json({ error: 'Forbidden: Cannot access report card of a student who is not your child' }, 403);
    } else {
      return c.json({ error: 'Forbidden' }, 403);
    }
  }

  const repo = new GradesRepository(c.env.DB);
  const service = new GradesService(repo);
  
  try {
    const exam = await repo.getExamWithSubjects(examId);
    if (!exam || exam.institution_id !== user.institution_id) {
      return c.json({ error: 'Exam not found or unauthorized' }, 404);
    }
    if (!(await teacherCanAccessExam(c.env.DB, user, examId))) {
      return c.json({ error: 'Forbidden: exam is outside your teaching assignment' }, 403);
    }
    if (!(await teacherCanAccessStudent(c.env.DB, user, studentId))) {
      return c.json({ error: 'Forbidden: student is outside your teaching assignment' }, 403);
    }

    const examEnrollment = await c.env.DB.prepare(`
      SELECT 1
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
    `).bind(studentId, exam.academic_year_id, exam.course_id, exam.semester, user.institution_id).first();
    if (!examEnrollment) {
      return c.json({ error: 'Forbidden: student is outside this exam cohort' }, 403);
    }
    
    const result = await service.buildReportCard(examId, studentId);
    if (!isTeacherOnly(user)) return c.json(result);

    const enrollment = await c.env.DB.prepare(`
      SELECT section_id
      FROM student_enrollments
      WHERE student_id = ? AND academic_year_id = ? AND course_id = ? AND semester = ? AND is_active = 1
      LIMIT 1
    `).bind(studentId, exam.academic_year_id, exam.course_id, exam.semester).first<{ section_id: string }>();

    if (!enrollment) {
      return c.json({ error: 'Forbidden: student is outside this exam cohort' }, 403);
    }

    const subjects = [];
    for (const subject of result.subjects) {
      if (await teacherHasSubjectAccess(c.env.DB, user, subject.subject_id, enrollment.section_id, exam.course_id, exam.academic_year_id)) {
        subjects.push(subject);
      }
    }
    if (subjects.length === 0) {
      return c.json({ error: 'Forbidden: report card has no subjects inside your teaching assignment' }, 403);
    }

    const scales = await service.listScales(user.institution_id);
    const totalMax = subjects.reduce((sum, subject) => sum + Number(subject.max_marks || 0), 0);
    const totalObtained = subjects.reduce((sum, subject) => sum + Number(subject.marks_obtained || 0), 0);
    const percent = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;
    const gradeInfo = service.computeGrade(percent, scales);

    return c.json({
      ...result,
      subjects,
      total: {
        ...result.total,
        max_marks: totalMax,
        marks_obtained: totalObtained,
        percent: Math.round(percent * 10) / 10,
        grade: gradeInfo.grade,
        grade_point: gradeInfo.grade_point,
        rank: null,
      },
      result: subjects.some((subject) => !subject.is_passing) ? 'FAIL' : 'PASS',
    });
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

grades.get('/report-card/:examId', async (c) => {
  const user = c.get('user');
  if (!hasAcademicStaffRole(user)) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const examId = c.req.param('examId')!;
  const repo = new GradesRepository(c.env.DB);
  const service = new GradesService(repo);

  try {
    const exam = await repo.getExamWithSubjects(examId);
    if (!exam || exam.institution_id !== user.institution_id) {
      return c.json({ error: 'Exam not found or unauthorized' }, 404);
    }
    if (!(await teacherCanAccessExam(c.env.DB, user, examId))) {
      return c.json({ error: 'Forbidden: exam is outside your teaching assignment' }, 403);
    }

    const results = await service.buildAllReportCards(examId, user.institution_id);
    if (!isTeacherOnly(user)) return c.json(results);

    const filtered = [];
    for (const result of results) {
      if (!(await teacherCanAccessStudent(c.env.DB, user, result.student.id))) continue;
      const enrollment = await c.env.DB.prepare(`
        SELECT section_id
        FROM student_enrollments
        WHERE student_id = ? AND academic_year_id = ? AND course_id = ? AND semester = ? AND is_active = 1
        LIMIT 1
      `).bind(result.student.id, exam.academic_year_id, exam.course_id, exam.semester).first<{ section_id: string }>();
      if (!enrollment) continue;

      const subjects = [];
      for (const subject of result.subjects) {
        if (await teacherHasSubjectAccess(c.env.DB, user, subject.subject_id, enrollment.section_id, exam.course_id, exam.academic_year_id)) {
          subjects.push(subject);
        }
      }
      if (subjects.length === 0) continue;

      filtered.push({ ...result, subjects });
    }
    return c.json(filtered);
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

export default grades;
