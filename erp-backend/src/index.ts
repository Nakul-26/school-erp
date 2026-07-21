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
import broadcasts from './modules/broadcasts/broadcasts.routes';
import messageTemplates from './modules/message-templates/message-templates.routes';
import { visitors, assets, alumni } from './modules/remaining.routes';


const app = new Hono<{ Bindings: Env }>();

app.use('*', async (c, next) => {
  const corsMiddleware = cors({
    origin: (origin) => {
      const allowed = [
        c.env.FRONTEND_ORIGIN,
        'http://localhost:5173',
        'http://localhost:3000',
        'http://localhost:3001',
      ].filter(Boolean);
      return allowed.includes(origin) ? origin : (c.env.FRONTEND_ORIGIN || 'http://localhost:3001');
    },
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
    maxAge: 86400,
  });
  return corsMiddleware(c, next);
});

app.use('*', async (c, next) => {
  await next();
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('X-XSS-Protection', '1; mode=block');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
});

app.use('*', async (c, next) => {
  const method = c.req.method;
  const pathname = new URL(c.req.url).pathname;
  const looksLikeStaticFile = /\.[a-z0-9]+$/i.test(pathname);

  if (c.env.ASSETS && (method === 'GET' || method === 'HEAD') && looksLikeStaticFile) {
    const response = await c.env.ASSETS.fetch(c.req.raw);
    if (response.status !== 404) {
      return response;
    }
  }

  await next();
});

app.get('/', (c) => c.json({ status: 'ok', service: 'erp-backend', version: '2.0.0' }));

import dashboard from './modules/dashboard/dashboard.routes';

app.route('/dashboard', dashboard);

app.route('/auth', auth);
app.route('/institutions', institutions);
app.route('/users', users);
app.route('/academic-years', academicYears);
app.route('/programs', programs);
app.route('/sections', sections);
app.route('/classes', sections);
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
app.route('/broadcasts', broadcasts);
app.route('/message-templates', messageTemplates);
app.route('/visitors', visitors);
app.route('/assets', assets);
app.route('/alumni', alumni);

app.get('*', async (c) => {
  const accept = c.req.header('Accept') || '';

  if (c.env.ASSETS && accept.includes('text/html')) {
    return c.env.ASSETS.fetch(c.req.raw);
  }

  return c.json({ error: 'Not found' }, 404);
});

export default {
  fetch: app.fetch,
  async scheduled(event: any, env: any, ctx: any) {
    console.log('[Scheduled Worker] Checking for scheduled broadcasts...');
    try {
      const { BroadcastsRepository } = await import('./modules/broadcasts/broadcasts.repository');
      const { BroadcastsService } = await import('./modules/broadcasts/broadcasts.service');
      const repo = new BroadcastsRepository(env.DB);
      const service = new BroadcastsService(repo);
      await service.processScheduledBroadcasts(env);
      console.log('[Scheduled Worker] Scheduled broadcasts processing completed.');
    } catch (err) {
      console.error('[Scheduled Worker] Failed to process scheduled broadcasts:', err);
    }
  }
};
