import { Section, CreateSectionInput, UpdateSectionInput } from './sections.types';
import { getUpdateFields } from '../../utils/repository';

const UPDATE_FIELDS = ['academic_year_id', 'course_id', 'name', 'year_number'] as const;

export class SectionRepository {
  constructor(private db: D1Database) {}

  async create(id: string, institutionId: string, input: CreateSectionInput, userId?: string): Promise<void> {
    await this.db.prepare(`
      INSERT INTO sections (
        id, institution_id, academic_year_id, course_id, name, year_number, created_by, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      institutionId,
      input.academic_year_id,
      input.course_id,
      input.name,
      input.year_number,
      userId || null,
      userId || null
    ).run();
  }

  async findById(id: string): Promise<Section | null> {
    return await this.db.prepare('SELECT * FROM sections WHERE id = ? AND is_active = 1').bind(id).first<Section>();
  }

  async listByInstitution(institutionId: string, filters?: { academic_year_id?: string; course_id?: string }): Promise<Section[]> {
    let query = 'SELECT * FROM sections WHERE institution_id = ? AND is_active = 1';
    const params: any[] = [institutionId];

    if (filters?.academic_year_id) {
      query += ' AND academic_year_id = ?';
      params.push(filters.academic_year_id);
    }
    if (filters?.course_id) {
      query += ' AND course_id = ?';
      params.push(filters.course_id);
    }

    const { results } = await this.db.prepare(query).bind(...params).all<Section>();
    return results || [];
  }

  async update(id: string, input: UpdateSectionInput, userId?: string): Promise<void> {
    const fields = getUpdateFields(input, UPDATE_FIELDS);
    if (fields.length === 0) return;

    const sets = fields.map(field => `${field} = ?`).join(', ');
    const values = [...fields.map(field => input[field]), userId || null, id];

    await this.db.prepare(`
      UPDATE sections 
      SET ${sets}, updated_at = datetime('now'), updated_by = ?
      WHERE id = ? AND is_active = 1
    `).bind(...values).run();
  }

  async softDelete(id: string, userId?: string): Promise<void> {
    await this.db.prepare(`
      UPDATE sections 
      SET is_active = 0, deleted_at = datetime('now'), updated_by = ? 
      WHERE id = ?
    `).bind(userId || null, id).run();
  }
}
