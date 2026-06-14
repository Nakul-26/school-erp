import { Hono } from 'hono';
import { Env, JwtPayload } from '../../types';
import { AcademicYearRepository } from './academic-year.repository';
import { AcademicYearService } from './academic-year.service';
import { authMiddleware, requireRole } from '../../middleware/auth';

const academicYears = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();

academicYears.use('*', authMiddleware);

academicYears.get('/', async (c) => {
  const user = c.get('user');
  const repo = new AcademicYearRepository(c.env.DB);
  const service = new AcademicYearService(repo);
  const results = await service.listAcademicYears(user.institution_id);
  return c.json(results);
});

academicYears.get('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const repo = new AcademicYearRepository(c.env.DB);
  const service = new AcademicYearService(repo);
  const result = await service.getAcademicYear(id);
  
  if (!result || result.institution_id !== user.institution_id) {
    return c.json({ error: 'Academic year not found' }, 404);
  }
  return c.json(result);
});

academicYears.post('/', requireRole('admin', 'super_admin'), async (c) => {
  const user = c.get('user');
  const input = await c.req.json();
  const repo = new AcademicYearRepository(c.env.DB);
  const service = new AcademicYearService(repo);
  const id = await service.createAcademicYear(user.institution_id, input, user.sub);
  return c.json({ id }, 201);
});

academicYears.put('/:id', requireRole('admin', 'super_admin'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const input = await c.req.json();
  const repo = new AcademicYearRepository(c.env.DB);
  const service = new AcademicYearService(repo);
  
  const existing = await service.getAcademicYear(id);
  if (!existing || existing.institution_id !== user.institution_id) {
    return c.json({ error: 'Academic year not found' }, 404);
  }
  
  await service.updateAcademicYear(id, user.institution_id, input, user.sub);
  return c.json({ success: true });
});

academicYears.delete('/:id', requireRole('admin', 'super_admin'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const repo = new AcademicYearRepository(c.env.DB);
  const service = new AcademicYearService(repo);
  
  const existing = await service.getAcademicYear(id);
  if (!existing || existing.institution_id !== user.institution_id) {
    return c.json({ error: 'Academic year not found' }, 404);
  }
  
  await service.deleteAcademicYear(id, user.sub);
  return c.json({ success: true });
});

export default academicYears;
