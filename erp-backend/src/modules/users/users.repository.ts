import { User, CreateUserInput, UpdateUserInput } from './users.types';
import { getUpdateFields } from '../../utils/repository';

const UPDATE_FIELDS = ['name', 'phone', 'password_hash', 'reset_token', 'reset_expires'] as const;

export class UserRepository {
  constructor(private db: D1Database) {}

  async create(id: string, input: CreateUserInput & { password_hash: string; roles?: string[] }, userId?: string): Promise<void> {
    await this.db.prepare(`
      INSERT INTO users (
        id, institution_id, username, email, password_hash, name, phone, created_by, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      input.institution_id,
      input.username,
      input.email,
      input.password_hash,
      input.name,
      input.phone || null,
      userId || null,
      userId || null
    ).run();

    if (input.roles && input.roles.length > 0) {
      for (const roleName of input.roles) {
        const role = await this.db.prepare('SELECT id FROM roles WHERE name = ?').bind(roleName).first<{ id: string }>();
        if (role) {
          await this.db.prepare(`
            INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)
          `).bind(id, role.id).run();
        }
      }
    }
  }

  async findById(id: string): Promise<any | null> {
    const user = await this.db.prepare(`
      SELECT id, institution_id, username, email, name, phone, is_active, created_at, updated_at
      FROM users 
      WHERE id = ? AND is_active = 1
    `).bind(id).first<any>();

    if (!user) return null;

    const roles = await this.getUserRoles(id);
    return {
      ...user,
      roles,
      role: roles[0] || '', // fallback primary role
    };
  }

  async findByEmail(email: string): Promise<any | null> {
    const user = await this.db.prepare('SELECT * FROM users WHERE email = ? AND is_active = 1').bind(email).first<any>();
    if (!user) return null;

    const roles = await this.getUserRoles(user.id);
    return {
      ...user,
      roles,
      role: roles[0] || '', // fallback primary role
    };
  }

  async findByUsername(username: string): Promise<any | null> {
    const user = await this.db.prepare('SELECT * FROM users WHERE username = ? AND is_active = 1').bind(username).first<any>();
    if (!user) return null;

    const roles = await this.getUserRoles(user.id);
    return {
      ...user,
      roles,
      role: roles[0] || '',
    };
  }

  async findByResetToken(token: string): Promise<any | null> {
    const user = await this.db.prepare('SELECT * FROM users WHERE reset_token = ? AND is_active = 1').bind(token).first<any>();
    if (!user) return null;

    const roles = await this.getUserRoles(user.id);
    return {
      ...user,
      roles,
      role: roles[0] || '',
    };
  }

  async update(id: string, input: UpdateUserInput & { password_hash?: string; reset_token?: string | null; reset_expires?: string | null; roles?: string[] }, userId?: string): Promise<void> {
    const fields = getUpdateFields(input, UPDATE_FIELDS);
    
    if (fields.length > 0) {
      const sets = fields.map(field => `${field} = ?`).join(', ');
      const values = [...fields.map(field => input[field as keyof typeof input]), userId || null, id];

      await this.db.prepare(`
        UPDATE users 
        SET ${sets}, updated_at = datetime('now'), updated_by = ?
        WHERE id = ? AND is_active = 1
      `).bind(...values).run();
    }

    if (input.roles) {
      await this.updateUserRoles(id, input.roles);
    }
  }

  async softDelete(id: string, userId?: string): Promise<void> {
    await this.db.prepare(`
      UPDATE users 
      SET is_active = 0, deleted_at = datetime('now'), updated_by = ? 
      WHERE id = ?
    `).bind(userId || null, id).run();
  }

  async listByInstitution(institution_id: string): Promise<any[]> {
    const { results } = await this.db.prepare(`
      SELECT u.id, u.institution_id, u.username, u.email, u.name, u.phone, u.is_active,
             GROUP_CONCAT(r.name) as roles_list
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      WHERE u.institution_id = ? AND u.is_active = 1
      GROUP BY u.id
    `).bind(institution_id).all<any>();
    
    return results ? results.map(row => ({
      ...row,
      roles: row.roles_list ? row.roles_list.split(',') : [],
      role: row.roles_list ? row.roles_list.split(',')[0] : ''
    })) : [];
  }

  async getUserRoles(userId: string): Promise<string[]> {
    const { results } = await this.db.prepare(`
      SELECT r.name 
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = ?
    `).bind(userId).all<{ name: string }>();
    return results ? results.map(r => r.name) : [];
  }

  async getUserPermissions(userId: string): Promise<string[]> {
    const { results } = await this.db.prepare(`
      SELECT DISTINCT p.code 
      FROM user_roles ur
      JOIN role_permissions rp ON ur.role_id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE ur.user_id = ?
    `).bind(userId).all<{ code: string }>();
    return results ? results.map(r => r.code) : [];
  }

  async updateUserRoles(userId: string, roleNames: string[]): Promise<void> {
    await this.db.prepare('DELETE FROM user_roles WHERE user_id = ?').bind(userId).run();
    for (const roleName of roleNames) {
      const role = await this.db.prepare('SELECT id FROM roles WHERE name = ?').bind(roleName).first<{ id: string }>();
      if (role) {
        await this.db.prepare('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)').bind(userId, role.id).run();
      }
    }
  }
}
