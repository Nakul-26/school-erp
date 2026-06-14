import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './types';
import { authMiddleware } from './middleware/auth';
import auth from './modules/auth/auth.routes';
import students from './routes/students';
import attendance from './routes/attendance';
import timetable from './routes/timetable';
import exams from './routes/exams';
import fees from './routes/fees';
import comms from './routes/comms';

const app = new Hono<{ Bindings: Env }>();

app.use('*', cors());

app.get('/', (c) => c.json({ status: 'ok', service: 'erp-backend' }));

app.get('/dashboard/stats', authMiddleware, async (c) => {
  const user = c.get('user');
  const db = c.env.DB;

  const stats: any = {};

  if (user.role === 'admin') {
    const students = await db.prepare('SELECT COUNT(*) as count FROM students WHERE college_id = ?').bind(user.college_id).first<{ count: number }>();
    const teachers = await db.prepare('SELECT COUNT(*) as count FROM teachers WHERE college_id = ?').bind(user.college_id).first<{ count: number }>();
    const sections = await db.prepare('SELECT COUNT(*) as count FROM sections WHERE college_id = ?').bind(user.college_id).first<{ count: number }>();
    
    stats.totalStudents = students?.count || 0;
    stats.totalTeachers = teachers?.count || 0;
    stats.totalSections = sections?.count || 0;
  } else if (user.role === 'student') {
    const attendance = await db.prepare(`
      SELECT 
        COUNT(id) as total,
        SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present
      FROM attendance 
      WHERE student_id = (SELECT id FROM students WHERE user_id = ?) AND subject_id IS NULL
    `).bind(user.sub).first<{ total: number; present: number }>();
    
    stats.attendancePercentage = attendance?.total ? (attendance.present / attendance.total * 100).toFixed(1) : 'N/A';
  }

  return c.json(stats);
});

app.route('/auth', auth);
app.route('/students', students);
app.route('/attendance', attendance);
app.route('/timetable', timetable);
app.route('/exams', exams);
app.route('/fees', fees);
app.route('/comms', comms);

export default app;
