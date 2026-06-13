import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './types';
import auth from './routes/auth';
import students from './routes/students';
import attendance from './routes/attendance';
import timetable from './routes/timetable';
import exams from './routes/exams';
import fees from './routes/fees';
import comms from './routes/comms';

const app = new Hono<{ Bindings: Env }>();

app.use('*', cors());

app.get('/', (c) => c.json({ status: 'ok', service: 'erp-backend' }));

app.route('/auth', auth);
app.route('/students', students);
app.route('/attendance', attendance);
app.route('/timetable', timetable);
app.route('/exams', exams);
app.route('/fees', fees);
app.route('/comms', comms);

export default app;
