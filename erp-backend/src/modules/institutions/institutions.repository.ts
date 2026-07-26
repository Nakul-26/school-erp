import { Institution, CreateInstitutionInput, UpdateInstitutionInput } from './institutions.types';
import { getUpdateFields } from '../../utils/repository';

const UPDATE_FIELDS = ['name', 'address', 'phone', 'email', 'logo', 'institution_type'] as const;

export class InstitutionRepository {
  constructor(private db: D1Database) {}

  async create(id: string, input: CreateInstitutionInput, userId?: string): Promise<void> {
    await this.db.prepare(`
      INSERT INTO institutions (
        id, name, address, phone, email, logo, institution_type, created_by, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      input.name,
      input.address || null,
      input.phone || null,
      input.email || null,
      input.logo || null,
      input.institution_type || 'college',
      userId || null,
      userId || null
    ).run();
  }

  async findById(id: string): Promise<Institution | null> {
    return await this.db.prepare('SELECT * FROM institutions WHERE id = ? AND is_active = 1').bind(id).first<Institution>();
  }

  async findAll(options?: { search?: string; page?: number; limit?: number }): Promise<{ data: Institution[]; total: number }> {
    let query = 'SELECT * FROM institutions WHERE is_active = 1';
    let countQuery = 'SELECT COUNT(*) as count FROM institutions WHERE is_active = 1';
    const params: any[] = [];

    if (options?.search) {
      const searchPattern = `%${options.search}%`;
      query += ' AND (name LIKE ? OR email LIKE ? OR address LIKE ?)';
      countQuery += ' AND (name LIKE ? OR email LIKE ? OR address LIKE ?)';
      params.push(searchPattern, searchPattern, searchPattern);
    }

    const countRes = await this.db.prepare(countQuery).bind(...params).first<{ count: number }>();
    const total = countRes?.count || 0;

    query += ' ORDER BY created_at DESC';

    if (options?.limit) {
      const limit = options.limit;
      const page = options.page && options.page > 0 ? options.page : 1;
      const offset = (page - 1) * limit;
      query += ' LIMIT ? OFFSET ?';
      params.push(limit, offset);
    }

    const { results } = await this.db.prepare(query).bind(...params).all<Institution>();
    return { data: results || [], total };
  }

  async checkDeleteProtection(id: string): Promise<{ safe: boolean; reason?: string }> {
    const totalActive = await this.db.prepare('SELECT COUNT(*) as count FROM institutions WHERE is_active = 1').first<{ count: number }>();
    if ((totalActive?.count || 0) <= 1) {
      return { safe: false, reason: 'Cannot delete the last active institution in the system.' };
    }

    const activeCounts = await this.db.prepare(`
      SELECT 
        (SELECT COUNT(*) FROM users WHERE institution_id = ? AND is_active = 1) as users_count,
        (SELECT COUNT(*) FROM students WHERE institution_id = ? AND is_active = 1) as students_count,
        (SELECT COUNT(*) FROM teachers WHERE institution_id = ? AND is_active = 1) as teachers_count
    `).bind(id, id, id).first<{ users_count: number; students_count: number; teachers_count: number }>();

    if (activeCounts) {
      const { users_count, students_count, teachers_count } = activeCounts;
      if (users_count > 0 || students_count > 0 || teachers_count > 0) {
        return {
          safe: false,
          reason: `Cannot delete institution with active records (${users_count} users, ${students_count} students, ${teachers_count} teachers). Please archive or reassign them first.`
        };
      }
    }

    return { safe: true };
  }

  async update(id: string, input: UpdateInstitutionInput, userId?: string): Promise<void> {
    const fields = getUpdateFields(input, UPDATE_FIELDS);
    if (fields.length === 0) return;

    const sets = fields.map(field => `${field} = ?`).join(', ');
    const values = [...fields.map(field => input[field as keyof UpdateInstitutionInput]), userId || null, id];

    await this.db.prepare(`
      UPDATE institutions 
      SET ${sets}, updated_at = datetime('now'), updated_by = ?
      WHERE id = ? AND is_active = 1
    `).bind(...values).run();
  }

  async softDelete(id: string, userId?: string): Promise<void> {
    await this.db.prepare(`
      UPDATE institutions 
      SET is_active = 0, deleted_at = datetime('now'), updated_by = ? 
      WHERE id = ?
    `).bind(userId || null, id).run();
  }
}
