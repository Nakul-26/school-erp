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

const app = new Hono<{ Bindings: Env }>();

app.use('*', cors());

app.get('/', (c) => c.json({ status: 'ok', service: 'erp-backend', version: '2.0.0' }));

// Dashboard stats (Placeholder for now, needs update later)
app.get('/dashboard/stats', authMiddleware, async (c) => {
  const user = c.get('user');
  const db = c.env.DB;

  const stats: Record<string, number> = {};

  if (!user || !user.institution_id) {
    return c.json({ error: 'Invalid session' }, 401);
  }

  if (user.role === 'admin' || user.role === 'super_admin') {
    const students = await db.prepare('SELECT COUNT(*) as count FROM students WHERE institution_id = ? AND is_active = 1').bind(user.institution_id).first<{ count: number }>();
    const teachers = await db.prepare('SELECT COUNT(*) as count FROM teachers WHERE institution_id = ? AND is_active = 1').bind(user.institution_id).first<{ count: number }>();
    
    stats.totalStudents = students?.count || 0;
    stats.totalTeachers = teachers?.count || 0;
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

export default app;
