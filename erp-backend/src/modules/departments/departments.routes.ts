import { Hono } from 'hono';
import { Env, JwtPayload } from '../../types';
import { DepartmentRepository } from './departments.repository';
import { DepartmentService } from './departments.service';
import { authMiddleware, requirePermission } from '../../middleware/auth';
import { createAuditLog } from '../../utils/audit';

const departments = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();

departments.use('*', authMiddleware);

departments.get('/', async (c) => {
  const user = c.get('user');
  const repo = new DepartmentRepository(c.env.DB);
  const service = new DepartmentService(repo);
  const results = await service.listDepartments(user.institution_id);
  return c.json(results);
});

departments.get('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const repo = new DepartmentRepository(c.env.DB);
  const service = new DepartmentService(repo);
  const result = await service.getDepartment(id);
  
  if (!result || result.institution_id !== user.institution_id) {
    return c.json({ error: 'Department not found' }, 404);
  }
  return c.json(result);
});

departments.post('/', requirePermission('academic.manage'), async (c) => {
  const user = c.get('user');
  const input = await c.req.json();
  const repo = new DepartmentRepository(c.env.DB);
  const service = new DepartmentService(repo);
  
  try {
    const id = await service.createDepartment(user.institution_id, input, user.sub);
    await createAuditLog(c.env.DB, user.sub, 'CREATE_DEPARTMENT', 'departments', id, `Created department: ${input.name} (${input.code})`);
    return c.json({ id }, 201);
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

departments.put('/:id', requirePermission('academic.manage'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const input = await c.req.json();
  const repo = new DepartmentRepository(c.env.DB);
  const service = new DepartmentService(repo);
  
  const existing = await service.getDepartment(id);
  if (!existing || existing.institution_id !== user.institution_id) {
    return c.json({ error: 'Department not found' }, 404);
  }
  
  try {
    await service.updateDepartment(id, input, user.sub);
    await createAuditLog(c.env.DB, user.sub, 'UPDATE_DEPARTMENT', 'departments', id, `Updated department: ${existing.name}`);
    return c.json({ success: true });
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

departments.delete('/:id', requirePermission('academic.manage'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const repo = new DepartmentRepository(c.env.DB);
  const service = new DepartmentService(repo);
  
  const existing = await service.getDepartment(id);
  if (!existing || existing.institution_id !== user.institution_id) {
    return c.json({ error: 'Department not found' }, 404);
  }
  
  await service.deleteDepartment(id, user.sub);
  await createAuditLog(c.env.DB, user.sub, 'DELETE_DEPARTMENT', 'departments', id, `Deleted department: ${existing.name}`);
  return c.json({ success: true });
});

export default departments;
