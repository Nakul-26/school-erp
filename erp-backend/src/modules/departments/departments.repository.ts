import { Department, CreateDepartmentInput, UpdateDepartmentInput } from './departments.types';
import { getUpdateFields } from '../../utils/repository';

const UPDATE_FIELDS = ['name', 'code', 'description'] as const;

export class DepartmentRepository {
  constructor(private db: D1Database) {}

  async create(id: string, institutionId: string, input: CreateDepartmentInput, userId?: string): Promise<void> {
    await this.db.prepare(`
      INSERT INTO departments (
        id, institution_id, name, code, description, created_by, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      institutionId,
      input.name,
      input.code,
      input.description || null,
      userId || null,
      userId || null
    ).run();
  }

  async findById(id: string): Promise<Department | null> {
    return await this.db.prepare('SELECT * FROM departments WHERE id = ? AND is_active = 1').bind(id).first<Department>();
  }

  async listByInstitution(institutionId: string): Promise<Department[]> {
    const { results } = await this.db.prepare('SELECT * FROM departments WHERE institution_id = ? AND is_active = 1 ORDER BY name ASC').bind(institutionId).all<Department>();
    return results || [];
  }

  async update(id: string, input: UpdateDepartmentInput, userId?: string): Promise<void> {
    const fields = getUpdateFields(input, UPDATE_FIELDS);
    if (fields.length === 0) return;

    const sets = fields.map(field => `${field} = ?`).join(', ');
    const values = [...fields.map(field => input[field]), userId || null, id];

    await this.db.prepare(`
      UPDATE departments 
      SET ${sets}, updated_at = datetime('now'), updated_by = ?
      WHERE id = ? AND is_active = 1
    `).bind(...values).run();
  }

  async softDelete(id: string, userId?: string): Promise<void> {
    await this.db.prepare(`
      UPDATE departments 
      SET is_active = 0, deleted_at = datetime('now'), updated_by = ? 
      WHERE id = ?
    `).bind(userId || null, id).run();
  }
}
