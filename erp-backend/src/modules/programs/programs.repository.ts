import { Program, CreateProgramInput, UpdateProgramInput } from './programs.types';
import { getUpdateFields } from '../../utils/repository';

const UPDATE_FIELDS = ['course_code', 'name', 'duration_years', 'department_id'] as const;

export class ProgramRepository {
  constructor(private db: D1Database) {}

  async create(id: string, institutionId: string, input: CreateProgramInput, userId?: string): Promise<void> {
    await this.db.prepare(`
      INSERT INTO courses (
        id, institution_id, department_id, course_code, name, duration_years, created_by, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      institutionId,
      input.department_id || null,
      input.course_code,
      input.name,
      input.duration_years,
      userId || null,
      userId || null
    ).run();
  }

  async findById(id: string): Promise<Program | null> {
    return await this.db.prepare('SELECT * FROM courses WHERE id = ? AND is_active = 1').bind(id).first<Program>();
  }

  async listByInstitution(institutionId: string): Promise<Program[]> {
    const { results } = await this.db.prepare('SELECT * FROM courses WHERE institution_id = ? AND is_active = 1').bind(institutionId).all<Program>();
    return results || [];
  }

  async update(id: string, input: UpdateProgramInput, userId?: string): Promise<void> {
    const fields = getUpdateFields(input, UPDATE_FIELDS);
    if (fields.length === 0) return;

    const sets = fields.map(field => `${field} = ?`).join(', ');
    const values = [...fields.map(field => input[field]), userId || null, id];

    await this.db.prepare(`
      UPDATE courses 
      SET ${sets}, updated_at = datetime('now'), updated_by = ?
      WHERE id = ? AND is_active = 1
    `).bind(...values).run();
  }

  async softDelete(id: string, userId?: string): Promise<void> {
    await this.db.prepare(`
      UPDATE courses 
      SET is_active = 0, deleted_at = datetime('now'), updated_by = ? 
      WHERE id = ?
    `).bind(userId || null, id).run();
  }
}
