import { Hono } from 'hono';
import { Env, JwtPayload } from '../../types';
import { authMiddleware } from '../../middleware/auth';
import { normalizeRole, ROLES } from '../../utils/roles';

const dashboard = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();

dashboard.use('*', authMiddleware);

dashboard.get('/stats', async (c) => {
  const user = c.get('user');
  const db = c.env.DB;

  if (!user || !user.institution_id) {
    return c.json({ error: 'Invalid session' }, 401);
  }

  const userRoles = (user.roles || (user.role ? [user.role] : [])).map(normalizeRole);
  const isAdmin = userRoles.some(r => [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.PRINCIPAL].includes(r as any));
  const isTeacher = userRoles.some(r => [ROLES.TEACHER, ROLES.HOD].includes(r as any));
  const isStudent = userRoles.includes(ROLES.STUDENT);
  const isParent = userRoles.includes(ROLES.PARENT);
  const isAccountant = userRoles.includes(ROLES.ACCOUNTANT);

  if (isAccountant) {
    const todayResult = await db.prepare(`
      SELECT SUM(amount) as total FROM fee_payments 
      WHERE institution_id = ? AND date(payment_date) = date('now') AND is_active = 1
    `).bind(user.institution_id).first<{ total: number }>();

    const duesResult = await db.prepare(`
      SELECT 
        SUM(total_amount - paid_amount) as total_due,
        COUNT(DISTINCT student_id) as student_count
      FROM student_fee_records
      WHERE institution_id = ? AND status != 'PAID' AND is_active = 1
    `).bind(user.institution_id).first<{ total_due: number; student_count: number }>();

    const receiptsCount = await db.prepare(`
      SELECT COUNT(*) as count FROM fee_receipts
      WHERE institution_id = ? AND date(created_at) = date('now') AND is_active = 1
    `).bind(user.institution_id).first<{ count: number }>();

    const onlinePayments = await db.prepare(`
      SELECT COUNT(*) as count FROM fee_payments
      WHERE institution_id = ? AND payment_method LIKE '%Online%' AND date(payment_date) = date('now') AND is_active = 1
    `).bind(user.institution_id).first<{ count: number }>();

    return c.json({
      role: 'accountant',
      todayCollections: todayResult?.total || 0,
      pendingDues: duesResult?.total_due || 0,
      pendingDuesStudents: duesResult?.student_count || 0,
      receiptsIssuedToday: receiptsCount?.count || 0,
      onlinePaymentsToVerify: onlinePayments?.count || 0
    });
  }

  if (isAdmin) {
    const studentsCount = await db.prepare('SELECT COUNT(*) as count FROM students WHERE institution_id = ? AND is_active = 1').bind(user.institution_id).first<{ count: number }>();
    const teachersCount = await db.prepare('SELECT COUNT(*) as count FROM teachers WHERE institution_id = ? AND is_active = 1').bind(user.institution_id).first<{ count: number }>();
    
    const attResult = await db.prepare(`
      SELECT 
        COUNT(CASE WHEN status IN ('present', 'late') THEN 1 END) as present,
        COUNT(*) as total
      FROM student_attendance
      WHERE institution_id = ? AND is_active = 1
    `).bind(user.institution_id).first<{ present: number; total: number }>();
    
    const attendancePercentage = attResult && attResult.total > 0 
      ? Math.round((attResult.present / attResult.total) * 100 * 10) / 10 
      : 100;

    const feeResult = await db.prepare(`
      SELECT SUM(amount) as total FROM fee_payments WHERE institution_id = ? AND is_active = 1
    `).bind(user.institution_id).first<{ total: number }>();

    const examsResult = await db.prepare(`
      SELECT COUNT(*) as count FROM exams WHERE institution_id = ? AND is_active = 1 AND date(start_date) >= date('now')
    `).bind(user.institution_id).first<{ count: number }>();

    return c.json({
      role: 'admin',
      totalStudents: studentsCount?.count || 0,
      totalTeachers: teachersCount?.count || 0,
      overallAttendance: attendancePercentage,
      feeCollection: feeResult?.total || 0,
      upcomingExams: examsResult?.count || 0
    });
  }

  if (isTeacher) {
    const teacher = await db.prepare('SELECT id FROM teachers WHERE user_id = ? AND institution_id = ? AND is_active = 1').bind(user.sub, user.institution_id).first<{ id: string }>();
    if (!teacher) {
      return c.json({ error: 'Teacher profile not found' }, 404);
    }

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayDay = days[new Date().getDay()];

    const classesToday = await db.prepare(`
      SELECT COUNT(*) as count FROM weekly_timetable 
      WHERE institution_id = ? AND teacher_id = ? AND day_of_week = ? AND is_active = 1
    `).bind(user.institution_id, teacher.id, todayDay).first<{ count: number }>();

    const uniqueStudents = await db.prepare(`
      SELECT COUNT(DISTINCT se.student_id) as count
      FROM weekly_timetable wt
      JOIN student_enrollments se ON wt.section_id = se.section_id AND se.is_active = 1
      WHERE wt.teacher_id = ? AND wt.institution_id = ? AND wt.is_active = 1
    `).bind(teacher.id, user.institution_id).first<{ count: number }>();

    const pendingMarks = await db.prepare(`
      SELECT COUNT(DISTINCT es.id) as count
      FROM exam_subjects es
      JOIN exams e ON e.id = es.exam_id AND e.is_active = 1
      JOIN weekly_timetable wt ON wt.subject_id = es.subject_id AND wt.is_active = 1
      WHERE wt.teacher_id = ? AND e.status IN ('DRAFT', 'PUBLISHED')
        AND NOT EXISTS (
          SELECT 1 FROM student_marks sm 
          WHERE sm.exam_subject_id = es.id
        )
    `).bind(teacher.id).first<{ count: number }>();

    return c.json({
      role: 'teacher',
      classesToday: classesToday?.count || 0,
      totalStudents: uniqueStudents?.count || 0,
      pendingMarks: pendingMarks?.count || 0
    });
  }

  if (isStudent) {
    const student = await db.prepare(`
      SELECT s.id, s.first_name, s.last_name, s.roll_number, s.admission_number, se.course_id, se.section_id, se.semester 
      FROM students s
      LEFT JOIN student_enrollments se ON s.id = se.student_id AND se.is_active = 1
      WHERE s.user_id = ? AND s.institution_id = ? AND s.is_active = 1
    `).bind(user.sub, user.institution_id).first<{ id: string; first_name: string; last_name: string; roll_number: string; admission_number: string; course_id: string | null; section_id: string | null; semester: number | null }>();
    if (!student) {
      return c.json({ error: 'Student profile not found' }, 404);
    }

    const attResult = await db.prepare(`
      SELECT 
        COUNT(CASE WHEN status IN ('present', 'late') THEN 1 END) as present,
        COUNT(*) as total
      FROM student_attendance
      WHERE student_id = ? AND is_active = 1
    `).bind(student.id).first<{ present: number; total: number }>();

    const attendancePercentage = attResult && attResult.total > 0 
      ? Math.round((attResult.present / attResult.total) * 100 * 10) / 10 
      : 100;

    const feesResult = await db.prepare(`
      SELECT 
        COALESCE(SUM(total_amount), 0) as total,
        COALESCE(SUM(paid_amount), 0) as paid,
        COALESCE(SUM(total_amount - paid_amount), 0) as due
      FROM student_fee_records
      WHERE student_id = ? AND is_active = 1
    `).bind(student.id).first<{ total: number; paid: number; due: number }>();

    const { results: resultsList } = await db.prepare(`
      SELECT 
        e.name as exam_name,
        sub.subject_name,
        sm.marks_obtained,
        sm.max_marks
      FROM student_marks sm
      JOIN exam_subjects es ON sm.exam_subject_id = es.id
      JOIN exams e ON es.exam_id = e.id
      JOIN subjects sub ON es.subject_id = sub.id
      WHERE sm.student_id = ? AND sm.is_active = 1
      ORDER BY e.start_date DESC, sub.subject_name ASC
      LIMIT 5
    `).bind(student.id).all<{ exam_name: string; subject_name: string; marks_obtained: number; max_marks: number }>();

    return c.json({
      role: 'student',
      studentInfo: student,
      attendance: {
        percentage: attendancePercentage,
        present: attResult?.present || 0,
        total: attResult?.total || 0
      },
      fees: {
        total: feesResult?.total || 0,
        paid: feesResult?.paid || 0,
        due: feesResult?.due || 0
      },
      results: resultsList || []
    });
  }

  if (isParent) {
    const { results: children } = await db.prepare(`
      SELECT s.id, s.first_name, s.last_name, s.roll_number, s.admission_number, g.relationship, se.course_id, se.section_id, se.semester
      FROM guardians g
      JOIN students s ON g.student_id = s.id
      LEFT JOIN student_enrollments se ON s.id = se.student_id AND se.is_active = 1
      WHERE g.user_id = ? AND g.is_active = 1 AND s.is_active = 1
    `).bind(user.sub).all<{ id: string; first_name: string; last_name: string; roll_number: string; admission_number: string; relationship: string; course_id: string | null; section_id: string | null; semester: number | null }>();

    const childrenList = children || [];
    const childrenDetails = await Promise.all(childrenList.map(async (child) => {
      const [attResult, feesResult, { results: resultsList }] = await Promise.all([
        db.prepare(`
          SELECT 
            COUNT(CASE WHEN status IN ('present', 'late') THEN 1 END) as present,
            COUNT(*) as total
          FROM student_attendance
          WHERE student_id = ? AND is_active = 1
        `).bind(child.id).first<{ present: number; total: number }>(),

        db.prepare(`
          SELECT 
            COALESCE(SUM(total_amount), 0) as total,
            COALESCE(SUM(paid_amount), 0) as paid,
            COALESCE(SUM(total_amount - paid_amount), 0) as due
          FROM student_fee_records
          WHERE student_id = ? AND is_active = 1
        `).bind(child.id).first<{ total: number; paid: number; due: number }>(),

        db.prepare(`
          SELECT 
            e.name as exam_name,
            sub.subject_name,
            sm.marks_obtained,
            sm.max_marks
          FROM student_marks sm
          JOIN exam_subjects es ON sm.exam_subject_id = es.id
          JOIN exams e ON es.exam_id = e.id
          JOIN subjects sub ON es.subject_id = sub.id
          WHERE sm.student_id = ? AND sm.is_active = 1
          ORDER BY e.start_date DESC, sub.subject_name ASC
          LIMIT 5
        `).bind(child.id).all<{ exam_name: string; subject_name: string; marks_obtained: number; max_marks: number }>()
      ]);

      const attendancePercentage = attResult && attResult.total > 0 
        ? Math.round((attResult.present / attResult.total) * 100 * 10) / 10 
        : 100;

      return {
        student_id: child.id,
        id: child.id,
        name: `${child.first_name} ${child.last_name}`,
        roll_number: child.roll_number,
        admission_number: child.admission_number,
        relationship: child.relationship,
        course_id: child.course_id,
        section_id: child.section_id,
        semester: child.semester,
        attendance: {
          percentage: attendancePercentage,
          present: attResult?.present || 0,
          total: attResult?.total || 0
        },
        fees: {
          total: feesResult?.total || 0,
          paid: feesResult?.paid || 0,
          due: feesResult?.due || 0
        },
        results: resultsList || []
      };
    }));

    return c.json({
      role: 'parent',
      children: childrenDetails
    });
  }

  return c.json({ error: 'Forbidden: unrecognized role' }, 403);
});

export default dashboard;
