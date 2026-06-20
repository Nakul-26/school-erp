import { Hono } from 'hono';
import { Env, JwtPayload } from '../../types';
import { InstitutionRepository } from './institutions.repository';
import { InstitutionService } from './institutions.service';
import { UserRepository } from '../users/users.repository';
import { authMiddleware, requirePermission } from '../../middleware/auth';
import { createAuditLog } from '../../utils/audit';

const institutions = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();

institutions.use('*', authMiddleware);

// Only Super Admin can list all institutions
institutions.get('/', async (c) => {
  const user = c.get('user');
  const userRoles = user.roles || [];
  const isSuperAdmin = userRoles.includes('super_admin') || userRoles.includes('Super Admin');
  
  if (!isSuperAdmin) {
    return c.json({ error: 'Forbidden' }, 403);
  }
  
  const repo = new InstitutionRepository(c.env.DB);
  const service = new InstitutionService(repo);
  const results = await service.getAllInstitutions();
  return c.json(results);
});

institutions.get('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  
  const userRoles = user.roles || [];
  const isSuperAdmin = userRoles.includes('super_admin') || userRoles.includes('Super Admin');
  
  if (!isSuperAdmin && id !== user.institution_id) {
    return c.json({ error: 'Institution not found' }, 404);
  }
  
  const repo = new InstitutionRepository(c.env.DB);
  const service = new InstitutionService(repo);
  const result = await service.getInstitution(id);
  if (!result) return c.json({ error: 'Institution not found' }, 404);
  return c.json(result);
});

institutions.post('/', async (c) => {
  const user = c.get('user');
  const userRoles = user.roles || [];
  const isSuperAdmin = userRoles.includes('super_admin') || userRoles.includes('Super Admin');
  
  if (!isSuperAdmin) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const input = await c.req.json();
  const repo = new InstitutionRepository(c.env.DB);
  const service = new InstitutionService(repo);
  const id = await service.createInstitution(input, user.sub);
  await createAuditLog(c.env.DB, user.sub, 'CREATE_INSTITUTION', 'institutions', id, `Super Admin created institution ${input.name}`);
  return c.json({ id }, 201);
});

institutions.put('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  
  const userRoles = user.roles || [];
  const isSuperAdmin = userRoles.includes('super_admin') || userRoles.includes('Super Admin');
  
  const userRepo = new UserRepository(c.env.DB);
  const userPermissions = await userRepo.getUserPermissions(user.sub);
  const hasInstManage = userPermissions.includes('institution.manage');
  
  const canWrite = isSuperAdmin || (hasInstManage && id === user.institution_id);
  if (!canWrite) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const input = await c.req.json();
  const repo = new InstitutionRepository(c.env.DB);
  const service = new InstitutionService(repo);
  await service.updateInstitution(id, input, user.sub);
  
  await createAuditLog(c.env.DB, user.sub, 'UPDATE_INSTITUTION', 'institutions', id, `Updated institution profile details`);
  
  return c.json({ success: true });
});

institutions.delete('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  
  const userRoles = user.roles || [];
  const isSuperAdmin = userRoles.includes('super_admin') || userRoles.includes('Super Admin');
  
  if (!isSuperAdmin) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const repo = new InstitutionRepository(c.env.DB);
  const service = new InstitutionService(repo);
  await service.deleteInstitution(id, user.sub);
  await createAuditLog(c.env.DB, user.sub, 'DELETE_INSTITUTION', 'institutions', id, `Super Admin soft-deleted institution ${id}`);
  return c.json({ success: true });
});

export default institutions;
