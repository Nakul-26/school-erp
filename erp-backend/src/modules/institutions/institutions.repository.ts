import { Institution, CreateInstitutionInput, UpdateInstitutionInput } from './institutions.types';
import { getUpdateFields } from '../../utils/repository';

const UPDATE_FIELDS = ['name', 'address', 'contact_email', 'contact_phone', 'institution_type'] as const;

export class InstitutionRepository {
  constructor(private db: D1Database) {}

  async create(id: string, input: CreateInstitutionInput, userId?: string): Promise<void> {
    await this.db.prepare(`
      INSERT INTO institutions (
        id, name, address, contact_email, contact_phone, institution_type, created_by, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      input.name,
      input.address || null,
      input.contact_email || null,
      input.contact_phone || null,
      input.institution_type,
      userId || null,
      userId || null
    ).run();
  }

  async findById(id: string): Promise<Institution | null> {
    return await this.db.prepare('SELECT * FROM institutions WHERE id = ? AND is_active = 1').bind(id).first<Institution>();
  }

  async findAll(): Promise<Institution[]> {
    const { results } = await this.db.prepare('SELECT * FROM institutions WHERE is_active = 1').all<Institution>();
    return results || [];
  }

  async update(id: string, input: UpdateInstitutionInput, userId?: string): Promise<void> {
    const fields = getUpdateFields(input, UPDATE_FIELDS);
    if (fields.length === 0) return;

    const sets = fields.map(field => `${field} = ?`).join(', ');
    const values = [...fields.map(field => input[field]), userId || null, id];

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
