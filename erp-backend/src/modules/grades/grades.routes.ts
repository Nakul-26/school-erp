import { Hono } from 'hono';
import { Env, JwtPayload } from '../../types';
import { GradesRepository } from './grades.repository';
import { GradesService } from './grades.service';
import { authMiddleware, requireRole } from '../../middleware/auth';
import { createAuditLog } from '../../utils/audit';

const grades = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();

grades.use('*', authMiddleware);

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
  const repo = new GradesRepository(c.env.DB);
  const service = new GradesService(repo);
  
  try {
    const exam = await repo.getExamWithSubjects(examId);
    if (!exam || exam.institution_id !== user.institution_id) {
      return c.json({ error: 'Exam not found or unauthorized' }, 404);
    }
    
    const result = await service.buildReportCard(examId, studentId);
    return c.json(result);
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

grades.get('/report-card/:examId', async (c) => {
  const user = c.get('user');
  const examId = c.req.param('examId')!;
  const repo = new GradesRepository(c.env.DB);
  const service = new GradesService(repo);

  try {
    const exam = await repo.getExamWithSubjects(examId);
    if (!exam || exam.institution_id !== user.institution_id) {
      return c.json({ error: 'Exam not found or unauthorized' }, 404);
    }

    const results = await service.buildAllReportCards(examId, user.institution_id);
    return c.json(results);
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

export default grades;
