import type { JwtPayload } from '../types';

const TEACHER_ROLES = new Set(['teacher', 'Teacher']);
const PRIVILEGED_ROLES = new Set([
  'super_admin',
  'Super Admin',
  'admin',
  'Admin',
  'principal',
  'Principal',
  'hod',
  'HOD',
  'role-super-admin',
]);

function rolesFor(user: JwtPayload): string[] {
  return user.roles || (user.role ? [user.role] : []);
}

export function isTeacherOnly(user: JwtPayload): boolean {
  const roles = rolesFor(user);
  return roles.some((role) => TEACHER_ROLES.has(role)) && !roles.some((role) => PRIVILEGED_ROLES.has(role));
}

export async function getTeacherIdForUser(db: D1Database, user: JwtPayload): Promise<string | null> {
  const teacher = await db.prepare(`
    SELECT id
    FROM teachers
    WHERE user_id = ? AND institution_id = ? AND is_active = 1
    LIMIT 1
  `).bind(user.sub, user.institution_id).first<{ id: string }>();

  return teacher?.id || null;
}

export async function teacherHasSectionAccess(db: D1Database, user: JwtPayload, sectionId: string): Promise<boolean> {
  if (!isTeacherOnly(user)) return true;

  const teacherId = await getTeacherIdForUser(db, user);
  if (!teacherId) return false;

  const match = await db.prepare(`
    SELECT 1
    FROM (
      SELECT tsa.section_id
      FROM teacher_subject_assignments tsa
      JOIN sections sec ON sec.id = tsa.section_id
      WHERE tsa.teacher_id = ?
        AND tsa.section_id = ?
        AND tsa.is_active = 1
        AND sec.institution_id = ?
        AND sec.is_active = 1
      UNION
      SELECT ta.section_id
      FROM teaching_allocations ta
      JOIN sections sec ON sec.id = ta.section_id
      WHERE ta.teacher_id = ?
        AND ta.section_id = ?
        AND ta.institution_id = ?
        AND LOWER(ta.status) = 'active'
        AND sec.is_active = 1
    ) scope
    LIMIT 1
  `).bind(teacherId, sectionId, user.institution_id, teacherId, sectionId, user.institution_id).first();

  return Boolean(match);
}

export async function teacherHasSubjectAccess(
  db: D1Database,
  user: JwtPayload,
  subjectId: string,
  sectionId?: string,
  courseId?: string,
  academicYearId?: string
): Promise<boolean> {
  if (!isTeacherOnly(user)) return true;

  const teacherId = await getTeacherIdForUser(db, user);
  if (!teacherId) return false;

  const paramsA: any[] = [teacherId, subjectId, user.institution_id];
  let whereA = `
    tsa.teacher_id = ?
    AND tsa.subject_id = ?
    AND tsa.is_active = 1
    AND sub.institution_id = ?
    AND sub.is_active = 1
  `;

  const paramsB: any[] = [teacherId, subjectId, user.institution_id];
  let whereB = `
    ta.teacher_id = ?
    AND ta.subject_id = ?
    AND ta.institution_id = ?
    AND LOWER(ta.status) = 'active'
    AND sub.is_active = 1
  `;

  if (sectionId) {
    whereA += ' AND tsa.section_id = ?';
    paramsA.push(sectionId);
    whereB += ' AND ta.section_id = ?';
    paramsB.push(sectionId);
  }
  if (courseId) {
    whereA += ' AND tsa.course_id = ?';
    paramsA.push(courseId);
    whereB += ' AND ta.program_id = ?';
    paramsB.push(courseId);
  }
  if (academicYearId) {
    whereA += ' AND tsa.academic_year_id = ?';
    paramsA.push(academicYearId);
    whereB += ' AND ta.academic_year_id = ?';
    paramsB.push(academicYearId);
  }

  const match = await db.prepare(`
    SELECT 1
    FROM (
      SELECT tsa.subject_id
      FROM teacher_subject_assignments tsa
      JOIN subjects sub ON sub.id = tsa.subject_id
      WHERE ${whereA}
      UNION
      SELECT ta.subject_id
      FROM teaching_allocations ta
      JOIN subjects sub ON sub.id = ta.subject_id
      WHERE ${whereB}
    ) scope
    LIMIT 1
  `).bind(...paramsA, ...paramsB).first();

  return Boolean(match);
}

export async function teacherCanAccessStudent(db: D1Database, user: JwtPayload, studentId: string): Promise<boolean> {
  if (!isTeacherOnly(user)) return true;

  const teacherId = await getTeacherIdForUser(db, user);
  if (!teacherId) return false;

  const match = await db.prepare(`
    SELECT 1
    FROM student_enrollments se
    JOIN students st ON st.id = se.student_id
    WHERE se.student_id = ?
      AND se.is_active = 1
      AND st.institution_id = ?
      AND st.is_active = 1
      AND (
        EXISTS (
          SELECT 1
          FROM teacher_subject_assignments tsa
          WHERE tsa.teacher_id = ?
            AND tsa.section_id = se.section_id
            AND tsa.is_active = 1
        )
        OR EXISTS (
          SELECT 1
          FROM teaching_allocations ta
          WHERE ta.teacher_id = ?
            AND ta.section_id = se.section_id
            AND ta.institution_id = ?
            AND LOWER(ta.status) = 'active'
        )
      )
    LIMIT 1
  `).bind(studentId, user.institution_id, teacherId, teacherId, user.institution_id).first();

  return Boolean(match);
}

export async function teacherCanAccessExamSubject(db: D1Database, user: JwtPayload, examSubjectId: string): Promise<boolean> {
  if (!isTeacherOnly(user)) return true;

  const examSubject = await db.prepare(`
    SELECT es.subject_id, e.course_id, e.academic_year_id
    FROM exam_subjects es
    JOIN exams e ON e.id = es.exam_id
    WHERE es.id = ?
      AND es.institution_id = ?
      AND es.is_active = 1
      AND e.is_active = 1
  `).bind(examSubjectId, user.institution_id).first<{ subject_id: string; course_id: string; academic_year_id: string }>();

  if (!examSubject) return false;
  return teacherHasSubjectAccess(
    db,
    user,
    examSubject.subject_id,
    undefined,
    examSubject.course_id,
    examSubject.academic_year_id
  );
}

export async function teacherCanAccessExam(db: D1Database, user: JwtPayload, examId: string): Promise<boolean> {
  if (!isTeacherOnly(user)) return true;

  const teacherId = await getTeacherIdForUser(db, user);
  if (!teacherId) return false;

  const match = await db.prepare(`
    SELECT 1
    FROM exams e
    WHERE e.id = ?
      AND e.institution_id = ?
      AND e.is_active = 1
      AND (
        EXISTS (
          SELECT 1
          FROM teacher_subject_assignments tsa
          WHERE tsa.teacher_id = ?
            AND tsa.course_id = e.course_id
            AND tsa.academic_year_id = e.academic_year_id
            AND tsa.is_active = 1
        )
        OR EXISTS (
          SELECT 1
          FROM teaching_allocations ta
          WHERE ta.teacher_id = ?
            AND ta.program_id = e.course_id
            AND ta.academic_year_id = e.academic_year_id
            AND ta.institution_id = ?
            AND LOWER(ta.status) = 'active'
        )
      )
    LIMIT 1
  `).bind(examId, user.institution_id, teacherId, teacherId, user.institution_id).first();

  return Boolean(match);
}
