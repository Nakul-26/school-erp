import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './types';
import { authMiddleware } from './middleware/auth';
import auth from './modules/auth/auth.routes';
import institutions from './modules/institutions/institutions.routes';
import users from './modules/users/users.routes';
import academicYears from './modules/academic-years/academic-year.routes';
import programs from './modules/programs/programs.routes';
import sections from './modules/sections/sections.routes';
import subjects from './modules/subjects/subjects.routes';
import students from './modules/students/students.routes';
import guardians from './modules/guardians/guardians.routes';
import teachers from './modules/teachers/teachers.routes';
import teacherAssignments from './modules/teacher-assignments/teacher-assignments.routes';
import allocations from './modules/teaching-allocations/allocations.routes';
import enrollments from './modules/enrollments/enrollments.routes';
import auditLogs from './modules/audit-logs/audit-logs.routes';
import roles from './modules/roles/roles.routes';
import departments from './modules/departments/departments.routes';
import calendar from './modules/academic-calendar/academic-calendar.routes';
import slots from './modules/timetable-slots/timetable-slots.routes';
import timetable from './modules/weekly-timetable/weekly-timetable.routes';
import attendance from './modules/attendance/attendance.routes';
import teacherAttendance from './modules/teacher-attendance/teacher-attendance.routes';
import announcements from './modules/announcements/announcements.routes';
import notifications from './modules/notifications/notifications.routes';
import fees from './modules/fees/fees.routes';
import exams from './modules/exams/exams.routes';
import system from './modules/system/system.routes';
import settings from './modules/system-settings/settings.routes';
import approvals from './modules/approvals/approvals.routes';
import leave from './modules/leave/leave.routes';
import admissions from './modules/admissions/admissions.routes';
import grades from './modules/grades/grades.routes';
import payroll from './modules/payroll/payroll.routes';
import studentLeaves from './modules/student-leaves/student-leaves.routes';
import homework from './modules/homework/homework.routes';
import library from './modules/library/library.routes';
import transport from './modules/transport/transport.routes';
import messaging from './modules/messaging/messaging.routes';


const app = new Hono<{ Bindings: Env }>();

app.use('*', cors());

app.get('/', (c) => c.json({ status: 'ok', service: 'erp-backend', version: '2.0.0' }));

// Dashboard stats (Using role array checks)
app.get('/dashboard/stats', authMiddleware, async (c) => {
  const user = c.get('user');
  const db = c.env.DB;

  if (!user || !user.institution_id) {
    return c.json({ error: 'Invalid session' }, 401);
  }

  const userRoles = user.roles || (user.role ? [user.role] : []);
  const isAdmin = userRoles.some(r => ['super_admin', 'Super Admin', 'admin', 'Principal'].includes(r));
  const isTeacher = userRoles.some(r => ['Teacher', 'HOD', 'teacher', 'hod'].includes(r));
  const isStudent = userRoles.some(r => ['Student', 'student'].includes(r));
  const isParent = userRoles.some(r => ['Parent', 'parent', 'Guardian', 'guardian'].includes(r));

  if (isAdmin) {
    const studentsCount = await db.prepare('SELECT COUNT(*) as count FROM students WHERE institution_id = ? AND is_active = 1').bind(user.institution_id).first<{ count: number }>();
    const teachersCount = await db.prepare('SELECT COUNT(*) as count FROM teachers WHERE institution_id = ? AND is_active = 1').bind(user.institution_id).first<{ count: number }>();
    
    // Overall attendance %
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

    // Fee collection
    const feeResult = await db.prepare(`
      SELECT SUM(amount) as total FROM fee_payments WHERE institution_id = ? AND is_active = 1
    `).bind(user.institution_id).first<{ total: number }>();

    // Upcoming exams
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
      SELECT s.id, s.first_name, s.last_name, s.roll_number, s.admission_number, se.course_id, se.semester 
      FROM students s
      LEFT JOIN student_enrollments se ON s.id = se.student_id AND se.is_active = 1
      WHERE s.user_id = ? AND s.institution_id = ? AND s.is_active = 1
    `).bind(user.sub, user.institution_id).first<{ id: string; first_name: string; last_name: string; roll_number: string; admission_number: string; course_id: string | null; semester: number | null }>();
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
      SELECT s.id, s.first_name, s.last_name, s.roll_number, s.admission_number, g.relationship, se.course_id, se.semester
      FROM guardians g
      JOIN students s ON g.student_id = s.id
      LEFT JOIN student_enrollments se ON s.id = se.student_id AND se.is_active = 1
      WHERE g.user_id = ? AND g.is_active = 1 AND s.is_active = 1
    `).bind(user.sub).all<{ id: string; first_name: string; last_name: string; roll_number: string; admission_number: string; relationship: string; course_id: string | null; semester: number | null }>();

    const childrenDetails = [];

    for (const child of children || []) {
      const attResult = await db.prepare(`
        SELECT 
          COUNT(CASE WHEN status IN ('present', 'late') THEN 1 END) as present,
          COUNT(*) as total
        FROM student_attendance
        WHERE student_id = ? AND is_active = 1
      `).bind(child.id).first<{ present: number; total: number }>();

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
      `).bind(child.id).first<{ total: number; paid: number; due: number }>();

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
      `).bind(child.id).all<{ exam_name: string; subject_name: string; marks_obtained: number; max_marks: number }>();

      childrenDetails.push({
        student_id: child.id,
        name: `${child.first_name} ${child.last_name}`,
        roll_number: child.roll_number,
        admission_number: child.admission_number,
        relationship: child.relationship,
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

    return c.json({
      role: 'parent',
      children: childrenDetails
    });
  }

  return c.json({ role: 'unknown', stats: {} });
});

app.route('/auth', auth);
app.route('/institutions', institutions);
app.route('/users', users);
app.route('/academic-years', academicYears);
app.route('/programs', programs);
app.route('/sections', sections);
app.route('/subjects', subjects);
app.route('/students', students);
app.route('/guardians', guardians);
app.route('/teachers', teachers);
app.route('/teacher-assignments', teacherAssignments);
app.route('/teaching-allocations', allocations);
app.route('/enrollments', enrollments);
app.route('/audit-logs', auditLogs);
app.route('/roles', roles);
app.route('/departments', departments);
app.route('/academic-calendar', calendar);
app.route('/timetable-slots', slots);
app.route('/weekly-timetable', timetable);
app.route('/attendance', attendance);
app.route('/teacher-attendance', teacherAttendance);
app.route('/announcements', announcements);
app.route('/notifications', notifications);
app.route('/fees', fees);
app.route('/exams', exams);
app.route('/system', system);
app.route('/system-settings', settings);
app.route('/approvals', approvals);
app.route('/leave', leave);
app.route('/admissions', admissions);
app.route('/grades', grades);
app.route('/payroll', payroll);
app.route('/student-leaves', studentLeaves);
app.route('/homework', homework);
app.route('/library', library);
app.route('/transport', transport);
app.route('/messaging', messaging);


export default app;
