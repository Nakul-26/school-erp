import { Hono } from 'hono';
import { Env, JwtPayload } from '../../types';
import { authMiddleware, requirePermission } from '../../middleware/auth';
import { createAuditLog } from '../../utils/audit';

const roles = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();

const SYSTEM_ROLE_NAMES = ['super admin', 'principal', 'teacher', 'student', 'parent'];

function isSystemRoleName(name: string) {
  return SYSTEM_ROLE_NAMES.includes(name.trim().toLowerCase());
}

roles.use('*', authMiddleware);

roles.get('/', requirePermission('user.manage'), async (c) => {
  const { results } = await c.env.DB.prepare('SELECT id, name, description FROM roles').all<any>();
  return c.json(results || []);
});

roles.get('/permissions', requirePermission('user.manage'), async (c) => {
  const { results } = await c.env.DB.prepare('SELECT id, code, description FROM permissions').all<any>();
  return c.json(results || []);
});

roles.get('/matrix', requirePermission('user.manage'), async (c) => {
  const { results } = await c.env.DB.prepare(`
    SELECT
      r.id AS role_id,
      r.name AS role_name,
      r.description AS role_description,
      GROUP_CONCAT(DISTINCT p.code) AS permissions_csv,
      COUNT(DISTINCT rp.permission_id) AS permission_count,
      COUNT(DISTINCT ur.user_id) AS user_count
    FROM roles r
    LEFT JOIN role_permissions rp ON rp.role_id = r.id
    LEFT JOIN permissions p ON p.id = rp.permission_id
    LEFT JOIN user_roles ur ON ur.role_id = r.id
    GROUP BY r.id, r.name, r.description
    ORDER BY r.name
  `).all<any>();

  return c.json((results || []).map((row: any) => ({
    id: row.role_id,
    name: row.role_name,
    description: row.role_description,
    permissions: row.permissions_csv ? row.permissions_csv.split(',') : [],
    permissionCount: Number(row.permission_count || 0),
    userCount: Number(row.user_count || 0),
    isSystem: isSystemRoleName(row.role_name)
  })));
});

roles.post('/', requirePermission('user.manage'), async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const name = String(body.name || '').trim();
  const description = String(body.description || '').trim();
  const permissionCodes = Array.isArray(body.permissionCodes) ? body.permissionCodes : [];

  if (!name) {
    return c.json({ error: 'Role name is required' }, 400);
  }

  const existing = await c.env.DB.prepare('SELECT id FROM roles WHERE LOWER(name) = LOWER(?)').bind(name).first<{ id: string }>();
  if (existing) {
    return c.json({ error: 'Role already exists' }, 400);
  }

  const id = crypto.randomUUID();
  await c.env.DB.prepare('INSERT INTO roles (id, name, description) VALUES (?, ?, ?)')
    .bind(id, name, description || null)
    .run();

  for (const code of permissionCodes) {
    const perm = await c.env.DB.prepare('SELECT id FROM permissions WHERE code = ?').bind(code).first<{ id: string }>();
    if (perm) {
      await c.env.DB.prepare('INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)')
        .bind(id, perm.id)
        .run();
    }
  }

  await createAuditLog(c.env.DB, user.sub, 'CREATE_ROLE', 'roles', id, `Created role ${name}`);
  return c.json({ id, name, description, permissions: permissionCodes }, 201);
});

roles.put('/:id', requirePermission('user.manage'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const body = await c.req.json();
  const role = await c.env.DB.prepare('SELECT id, name, description FROM roles WHERE id = ?').bind(id).first<any>();

  if (!role) {
    return c.json({ error: 'Role not found' }, 404);
  }

  const nextName = body.name !== undefined ? String(body.name).trim() : role.name;
  const nextDescription = body.description !== undefined ? String(body.description).trim() : role.description || '';

  if (isSystemRoleName(role.name) && nextName !== role.name) {
    return c.json({ error: 'System role names cannot be changed' }, 403);
  }

  if (!nextName) {
    return c.json({ error: 'Role name is required' }, 400);
  }

  if (nextName !== role.name) {
    const existing = await c.env.DB.prepare('SELECT id FROM roles WHERE LOWER(name) = LOWER(?) AND id <> ?').bind(nextName, id).first<any>();
    if (existing) {
      return c.json({ error: 'Role already exists' }, 400);
    }
  }

  await c.env.DB.prepare('UPDATE roles SET name = ?, description = ? WHERE id = ?')
    .bind(nextName, nextDescription || null, id)
    .run();

  await createAuditLog(c.env.DB, user.sub, 'UPDATE_ROLE', 'roles', id, `Updated role ${nextName}`);
  return c.json({ success: true });
});

roles.put('/:id/permissions', requirePermission('user.manage'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const body = await c.req.json();
  const permissionCodes = Array.isArray(body.permissionCodes) ? body.permissionCodes : [];

  const role = await c.env.DB.prepare('SELECT id, name FROM roles WHERE id = ?').bind(id).first<any>();
  if (!role) {
    return c.json({ error: 'Role not found' }, 404);
  }

  await c.env.DB.prepare('DELETE FROM role_permissions WHERE role_id = ?').bind(id).run();

  for (const code of permissionCodes) {
    const perm = await c.env.DB.prepare('SELECT id FROM permissions WHERE code = ?').bind(code).first<{ id: string }>();
    if (perm) {
      await c.env.DB.prepare('INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)')
        .bind(id, perm.id)
        .run();
    }
  }

  await createAuditLog(c.env.DB, user.sub, 'UPDATE_ROLE_PERMISSIONS', 'roles', id, `Updated permissions for role ${role.name}`);
  return c.json({ success: true });
});

roles.post('/:id/duplicate', requirePermission('user.manage'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const body = await c.req.json().catch(() => ({}));
  const role = await c.env.DB.prepare('SELECT id, name, description FROM roles WHERE id = ?').bind(id).first<any>();

  if (!role) {
    return c.json({ error: 'Role not found' }, 404);
  }

  const sourcePermissions = await c.env.DB.prepare(`
    SELECT p.code
    FROM role_permissions rp
    JOIN permissions p ON p.id = rp.permission_id
    WHERE rp.role_id = ?
  `).bind(id).all<{ code: string }>();

  const baseName = String(body.name || `${role.name} Copy`).trim();
  const duplicateName = baseName || `${role.name} Copy`;
  const exists = await c.env.DB.prepare('SELECT id FROM roles WHERE LOWER(name) = LOWER(?)').bind(duplicateName).first<any>();
  if (exists) {
    return c.json({ error: 'Duplicate role name already exists' }, 400);
  }

  const newId = crypto.randomUUID();
  await c.env.DB.prepare('INSERT INTO roles (id, name, description) VALUES (?, ?, ?)')
    .bind(newId, duplicateName, body.description !== undefined ? String(body.description).trim() : role.description)
    .run();

  for (const perm of sourcePermissions.results || []) {
    const permRow = await c.env.DB.prepare('SELECT id FROM permissions WHERE code = ?').bind(perm.code).first<{ id: string }>();
    if (permRow) {
      await c.env.DB.prepare('INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)')
        .bind(newId, permRow.id)
        .run();
    }
  }

  await createAuditLog(c.env.DB, user.sub, 'DUPLICATE_ROLE', 'roles', newId, `Duplicated role ${role.name} to ${duplicateName}`);
  return c.json({ id: newId, name: duplicateName }, 201);
});

roles.delete('/:id', requirePermission('user.manage'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const role = await c.env.DB.prepare('SELECT id, name FROM roles WHERE id = ?').bind(id).first<any>();

  if (!role) {
    return c.json({ error: 'Role not found' }, 404);
  }

  if (isSystemRoleName(role.name)) {
    return c.json({ error: 'System roles cannot be deleted' }, 403);
  }

  await c.env.DB.prepare('DELETE FROM roles WHERE id = ?').bind(id).run();
  await createAuditLog(c.env.DB, user.sub, 'DELETE_ROLE', 'roles', id, `Deleted role ${role.name}`);
  return c.json({ success: true });
});

export default roles;
