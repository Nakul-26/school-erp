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
import enrollments from './modules/enrollments/enrollments.routes';
import auditLogs from './modules/audit-logs/audit-logs.routes';
import roles from './modules/roles/roles.routes';
import departments from './modules/departments/departments.routes';
import calendar from './modules/academic-calendar/academic-calendar.routes';
import slots from './modules/timetable-slots/timetable-slots.routes';
import timetable from './modules/weekly-timetable/weekly-timetable.routes';
import attendance from './modules/attendance/attendance.routes';
import exams from './modules/exams/exams.routes';

const app = new Hono<{ Bindings: Env }>();

app.use('*', cors());

app.get('/', (c) => c.json({ status: 'ok', service: 'erp-backend', version: '2.0.0' }));

// Dashboard stats (Using role array checks)
app.get('/dashboard/stats', authMiddleware, async (c) => {
  const user = c.get('user');
  const db = c.env.DB;

  const stats: Record<string, number> = {};

  if (!user || !user.institution_id) {
    return c.json({ error: 'Invalid session' }, 401);
  }

  const userRoles = user.roles || (user.role ? [user.role] : []);
  const isAdmin = userRoles.includes('super_admin') || userRoles.includes('Super Admin') || userRoles.includes('admin') || userRoles.includes('Principal');

  if (isAdmin) {
    const studentsCount = await db.prepare('SELECT COUNT(*) as count FROM students WHERE institution_id = ? AND is_active = 1').bind(user.institution_id).first<{ count: number }>();
    const teachersCount = await db.prepare('SELECT COUNT(*) as count FROM teachers WHERE institution_id = ? AND is_active = 1').bind(user.institution_id).first<{ count: number }>();
    
    stats.totalStudents = studentsCount?.count || 0;
    stats.totalTeachers = teachersCount?.count || 0;
  }

  return c.json(stats);
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
app.route('/enrollments', enrollments);
app.route('/audit-logs', auditLogs);
app.route('/roles', roles);
app.route('/departments', departments);
app.route('/academic-calendar', calendar);
app.route('/timetable-slots', slots);
app.route('/weekly-timetable', timetable);
app.route('/attendance', attendance);
app.route('/exams', exams);

export default app;
