import { User } from './auth.types';

export class AuthRepository {
  constructor(private db: D1Database) {}

  async findByEmail(email: string): Promise<User | null> {
    return await this.db
      .prepare('SELECT * FROM users WHERE email = ?')
      .bind(email)
      .first<User>();
  }

  async findById(id: number): Promise<User | null> {
    return await this.db
      .prepare('SELECT * FROM users WHERE id = ?')
      .bind(id)
      .first<User>();
  }

  async createUser(data: {
    college_id: number;
    role: string;
    name: string;
    email: string;
    password_hash: string;
    phone?: string;
  }): Promise<number> {
    const result = await this.db
      .prepare('INSERT INTO users (college_id, role, name, email, phone, password_hash) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(data.college_id, data.role, data.name, data.email, data.phone ?? null, data.password_hash)
      .run();
    return result.meta.last_row_id as number;
  }

  async createCollege(name: string, address?: string, email?: string, phone?: string): Promise<number> {
    const result = await this.db
      .prepare('INSERT INTO colleges (name, address, contact_email, contact_phone) VALUES (?, ?, ?, ?)')
      .bind(name, address ?? null, email ?? null, phone ?? null)
      .run();
    return result.meta.last_row_id as number;
  }

  async updatePassword(id: number, hash: string): Promise<void> {
    await this.db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').bind(hash, id).run();
  }

  async setResetToken(id: number, token: string, expiry: string): Promise<void> {
    await this.db.prepare('UPDATE users SET reset_token = ?, reset_expires = ? WHERE id = ?')
      .bind(token, expiry, id)
      .run();
  }

  async findByResetToken(token: string): Promise<User | null> {
    return await this.db.prepare('SELECT * FROM users WHERE reset_token = ?').bind(token).first<User>();
  }

  async clearResetToken(id: number): Promise<void> {
    await this.db.prepare('UPDATE users SET reset_token = NULL, reset_expires = NULL WHERE id = ?')
      .bind(id)
      .run();
  }

  async listUsers(college_id: number): Promise<Partial<User>[]> {
    const { results } = await this.db
      .prepare('SELECT id, name, email, role, phone, is_active FROM users WHERE college_id = ?')
      .bind(college_id)
      .all<User>();
    return results;
  }
}
