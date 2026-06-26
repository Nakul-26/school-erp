import { Hono } from 'hono';
import { Env, JwtPayload } from '../../types';
import { AcademicYearRepository } from './academic-year.repository';
import { AcademicYearService } from './academic-year.service';
import { authMiddleware, requirePermission } from '../../middleware/auth';
import { createAuditLog } from '../../utils/audit';

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

academicYears.post('/', requirePermission('academic.manage'), async (c) => {
  const user = c.get('user');
  const input = await c.req.json();
  const repo = new AcademicYearRepository(c.env.DB);
  const service = new AcademicYearService(repo);
  
  try {
    const id = await service.createAcademicYear(user.institution_id, input, user.sub);
    await createAuditLog(c.env.DB, user.sub, 'CREATE_ACADEMIC_YEAR', 'academic_years', id, `Created academic year: ${input.name}`);
    return c.json({ id }, 201);
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

academicYears.put('/:id', requirePermission('academic.manage'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const input = await c.req.json();
  const repo = new AcademicYearRepository(c.env.DB);
  const service = new AcademicYearService(repo);
  
  const existing = await service.getAcademicYear(id);
  if (!existing || existing.institution_id !== user.institution_id) {
    return c.json({ error: 'Academic year not found' }, 404);
  }
  
  try {
    await service.updateAcademicYear(id, user.institution_id, input, user.sub);
    await createAuditLog(c.env.DB, user.sub, 'UPDATE_ACADEMIC_YEAR', 'academic_years', id, `Updated academic year: ${existing.name}`);
    return c.json({ success: true });
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

academicYears.delete('/:id', requirePermission('academic.manage'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const repo = new AcademicYearRepository(c.env.DB);
  const service = new AcademicYearService(repo);
  
  const existing = await service.getAcademicYear(id);
  if (!existing || existing.institution_id !== user.institution_id) {
    return c.json({ error: 'Academic year not found' }, 404);
  }
  
  await service.deleteAcademicYear(id, user.sub);
  await createAuditLog(c.env.DB, user.sub, 'DELETE_ACADEMIC_YEAR', 'academic_years', id, `Deleted academic year: ${existing.name}`);
  return c.json({ success: true });
});

// Rollover Endpoint
academicYears.post('/rollover', requirePermission('academic.manage'), async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{
    source_year_id: string;
    target_year_id: string;
    checklist: string[];
    preview?: boolean;
  }>();

  const repo = new AcademicYearRepository(c.env.DB);
  const service = new AcademicYearService(repo);

  try {
    const res = await service.rollover(
      user.institution_id,
      body.source_year_id,
      body.target_year_id,
      body.checklist,
      body.preview !== false,
      user.sub
    );
    
    if (!body.preview) {
      await createAuditLog(
        c.env.DB,
        user.sub,
        'ROLLOVER_ACADEMIC_YEAR',
        'academic_years',
        body.target_year_id,
        `Executed rollover from ${body.source_year_id} to ${body.target_year_id}`
      );
    }
    
    return c.json(res);
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

// Promotion Endpoint
academicYears.post('/promote', requirePermission('academic.manage'), async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{
    source_year_id: string;
    target_year_id: string;
    source_course_id: string;
    source_section_id: string;
    target_course_id: string;
    target_section_id: string;
    target_semester?: number;
    student_ids: string[];
    generate_fees?: boolean;
    preview?: boolean;
  }>();

  const repo = new AcademicYearRepository(c.env.DB);
  const service = new AcademicYearService(repo);

  try {
    const res = await service.promote(
      user.institution_id,
      body.source_year_id,
      body.target_year_id,
      body.source_course_id,
      body.source_section_id,
      body.target_course_id,
      body.target_section_id,
      body.target_semester,
      body.student_ids,
      body.generate_fees !== false,
      body.preview !== false,
      user.sub
    );

    if (!body.preview) {
      await createAuditLog(
        c.env.DB,
        user.sub,
        'PROMOTE_STUDENTS',
        'student_enrollments',
        body.target_section_id,
        `Promoted ${res.promoted_count} students to section ${body.target_section_id}`
      );
    }

    return c.json(res);
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

// Year Closing Endpoint
academicYears.post('/close', requirePermission('academic.manage'), async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{
    academic_year_id: string;
    preview?: boolean;
  }>();

  const repo = new AcademicYearRepository(c.env.DB);
  const service = new AcademicYearService(repo);

  try {
    const res = await service.closeYear(
      user.institution_id,
      body.academic_year_id,
      body.preview !== false,
      user.sub
    );

    if (!body.preview) {
      await createAuditLog(
        c.env.DB,
        user.sub,
        'CLOSE_ACADEMIC_YEAR',
        'academic_years',
        body.academic_year_id,
        `Closed and archived academic year ID ${body.academic_year_id}`
      );
    }

    return c.json(res);
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

export default academicYears;

