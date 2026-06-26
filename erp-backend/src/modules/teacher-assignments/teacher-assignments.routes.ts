import { Hono } from 'hono';
import { Env, JwtPayload } from '../../types';
import { TeacherAssignmentRepository } from './teacher-assignments.repository';
import { TeacherAssignmentService } from './teacher-assignments.service';
import { authMiddleware, requireRole } from '../../middleware/auth';

// NOTE: This module and the underlying teacher_subject_assignments table are DEPRECATED.
// Active features should migrate to the teaching-allocations module.

const teacherAssignments = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();

teacherAssignments.use('*', authMiddleware);

teacherAssignments.get('/teacher/:teacherId', async (c) => {
  const user = c.get('user');
  const teacherId = c.req.param('teacherId')!;
  const repo = new TeacherAssignmentRepository(c.env.DB);
  if (!await repo.teacherBelongsToInstitution(teacherId, user.institution_id)) {
    return c.json({ error: 'Teacher not found' }, 404);
  }
  const service = new TeacherAssignmentService(repo);
  const results = await service.listAssignmentsByTeacher(teacherId);
  return c.json(results);
});

teacherAssignments.get('/section/:sectionId', async (c) => {
  const user = c.get('user');
  const sectionId = c.req.param('sectionId')!;
  const academicYearId = c.req.query('academic_year_id');
  if (!academicYearId) return c.json({ error: 'academic_year_id is required' }, 400);

  const repo = new TeacherAssignmentRepository(c.env.DB);
  if (!await repo.sectionBelongsToInstitution(sectionId, user.institution_id)) {
    return c.json({ error: 'Section not found' }, 404);
  }
  const service = new TeacherAssignmentService(repo);
  const results = await service.listAssignmentsBySection(sectionId, academicYearId);
  return c.json(results);
});

teacherAssignments.post('/', requireRole('admin', 'super_admin'), async (c) => {
  const user = c.get('user');
  const input = await c.req.json();
  const repo = new TeacherAssignmentRepository(c.env.DB);
  if (!await repo.referencesBelongToInstitution(input, user.institution_id)) {
    return c.json({ error: 'Invalid assignment references' }, 400);
  }
  const service = new TeacherAssignmentService(repo);
  const id = await service.createAssignment(input, user.sub);
  return c.json({ id }, 201);
});

teacherAssignments.delete('/:id', requireRole('admin', 'super_admin'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const repo = new TeacherAssignmentRepository(c.env.DB);
  if (!await repo.belongsToInstitution(id, user.institution_id)) {
    return c.json({ error: 'Assignment not found' }, 404);
  }
  const service = new TeacherAssignmentService(repo);
  await service.deleteAssignment(id, user.sub);
  return c.json({ success: true });
});

export default teacherAssignments;
