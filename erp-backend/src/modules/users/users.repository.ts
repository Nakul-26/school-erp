import { User, CreateUserInput, UpdateUserInput } from './users.types';
import { getUpdateFields } from '../../utils/repository';

const UPDATE_FIELDS = ['name', 'phone', 'password_hash', 'reset_token', 'reset_expires'] as const;
const PUBLIC_COLUMNS = `
  id, institution_id, username, email, role, name, phone, is_active,
  created_at, updated_at, deleted_at, created_by, updated_by
`;

export class UserRepository {
  constructor(private db: D1Database) {}

  async create(id: string, input: CreateUserInput & { password_hash: string }, userId?: string): Promise<void> {
    await this.db.prepare(`
      INSERT INTO users (
        id, institution_id, username, email, password_hash, role, name, phone, created_by, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      input.institution_id,
      input.username,
      input.email,
      input.password_hash,
      input.role,
      input.name,
      input.phone || null,
      userId || null,
      userId || null
    ).run();
  }

  async findById(id: string): Promise<User | null> {
    return await this.db.prepare(`SELECT ${PUBLIC_COLUMNS} FROM users WHERE id = ? AND is_active = 1`).bind(id).first<User>();
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.db.prepare('SELECT * FROM users WHERE email = ? AND is_active = 1').bind(email).first<User>();
  }

  async findByUsername(username: string): Promise<User | null> {
    return await this.db.prepare('SELECT * FROM users WHERE username = ? AND is_active = 1').bind(username).first<User>();
  }

  async findByResetToken(token: string): Promise<User | null> {
    return await this.db.prepare('SELECT * FROM users WHERE reset_token = ? AND is_active = 1').bind(token).first<User>();
  }

  async update(id: string, input: UpdateUserInput & { password_hash?: string; reset_token?: string | null; reset_expires?: string | null }, userId?: string): Promise<void> {
    const fields = getUpdateFields(input, UPDATE_FIELDS);
    if (fields.length === 0) return;

    const sets = fields.map(field => `${field} = ?`).join(', ');
    const values = [...fields.map(field => input[field]), userId || null, id];

    await this.db.prepare(`
      UPDATE users 
      SET ${sets}, updated_at = datetime('now'), updated_by = ?
      WHERE id = ? AND is_active = 1
    `).bind(...values).run();
  }

  async softDelete(id: string, userId?: string): Promise<void> {
    await this.db.prepare(`
      UPDATE users 
      SET is_active = 0, deleted_at = datetime('now'), updated_by = ? 
      WHERE id = ?
    `).bind(userId || null, id).run();
  }

  async listByInstitution(institution_id: string): Promise<User[]> {
    const { results } = await this.db.prepare(`SELECT ${PUBLIC_COLUMNS} FROM users WHERE institution_id = ? AND is_active = 1`).bind(institution_id).all<User>();
    return results || [];
  }
}
