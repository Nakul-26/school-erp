import { Program, CreateProgramInput, UpdateProgramInput } from './programs.types';
import { getUpdateFields } from '../../utils/repository';

const UPDATE_FIELDS = [
  'course_code', 
  'name', 
  'duration_years', 
  'department_id', 
  'semester_enabled', 
  'credit_system_enabled', 
  'electives_enabled', 
  'description',
  'is_active'
] as const;

export class ProgramRepository {
  constructor(private db: D1Database) {}

  async create(id: string, institutionId: string, input: CreateProgramInput, userId?: string): Promise<void> {
    await this.db.prepare(`
      INSERT INTO courses (
        id, institution_id, department_id, course_code, name, duration_years, 
        semester_enabled, credit_system_enabled, electives_enabled, description,
        created_by, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      institutionId,
      input.department_id || null,
      input.course_code,
      input.name,
      input.duration_years,
      input.semester_enabled || 0,
      input.credit_system_enabled || 0,
      input.electives_enabled || 0,
      input.description || null,
      userId || null,
      userId || null
    ).run();
  }

  async findById(id: string): Promise<Program | null> {
    return await this.db.prepare('SELECT * FROM courses WHERE id = ?').bind(id).first<Program>();
  }

  async findByCode(institutionId: string, code: string): Promise<Program | null> {
    return await this.db.prepare('SELECT * FROM courses WHERE institution_id = ? AND course_code = ? AND is_active = 1').bind(institutionId, code).first<Program>();
  }

  async listByInstitution(institutionId: string, includeArchived = false): Promise<Program[]> {
    const activeFilter = includeArchived ? 1 : 0;
    const { results } = await this.db.prepare('SELECT * FROM courses WHERE institution_id = ? AND (is_active = 1 OR ? = 1) ORDER BY name ASC').bind(institutionId, activeFilter).all<Program>();
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
      WHERE id = ?
    `).bind(...values).run();
  }

  async softDelete(id: string, userId?: string): Promise<void> {
    await this.db.prepare(`
      UPDATE courses 
      SET is_active = 0, deleted_at = datetime('now'), updated_by = ? 
      WHERE id = ?
    `).bind(userId || null, id).run();
  }

  async restore(id: string, userId?: string): Promise<void> {
    await this.db.prepare(`
      UPDATE courses 
      SET is_active = 1, deleted_at = NULL, updated_by = ? 
      WHERE id = ?
    `).bind(userId || null, id).run();
  }

  async hasActiveSections(id: string): Promise<number> {
    const row = await this.db.prepare(`
      SELECT COUNT(*) as count FROM sections WHERE course_id = ? AND is_active = 1
    `).bind(id).first<{ count: number }>();
    return row?.count || 0;
  }
}
