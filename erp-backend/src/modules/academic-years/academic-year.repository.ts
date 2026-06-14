import { AcademicYear, CreateAcademicYearInput, UpdateAcademicYearInput } from './academic-year.types';
import { getUpdateFields } from '../../utils/repository';

const UPDATE_FIELDS = ['name', 'start_date', 'end_date', 'is_current'] as const;

export class AcademicYearRepository {
  constructor(private db: D1Database) {}

  async create(id: string, institutionId: string, input: CreateAcademicYearInput, userId?: string): Promise<void> {
    if (input.is_current) {
      await this.db.prepare('UPDATE academic_years SET is_current = 0 WHERE institution_id = ?').bind(institutionId).run();
    }

    await this.db.prepare(`
      INSERT INTO academic_years (
        id, institution_id, name, start_date, end_date, is_current, created_by, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      institutionId,
      input.name,
      input.start_date,
      input.end_date,
      input.is_current,
      userId || null,
      userId || null
    ).run();
  }

  async findById(id: string): Promise<AcademicYear | null> {
    return await this.db.prepare('SELECT * FROM academic_years WHERE id = ? AND is_active = 1').bind(id).first<AcademicYear>();
  }

  async listByInstitution(institutionId: string): Promise<AcademicYear[]> {
    const { results } = await this.db.prepare('SELECT * FROM academic_years WHERE institution_id = ? AND is_active = 1 ORDER BY start_date DESC').bind(institutionId).all<AcademicYear>();
    return results || [];
  }

  async update(id: string, institutionId: string, input: UpdateAcademicYearInput, userId?: string): Promise<void> {
    if (input.is_current) {
      await this.db.prepare('UPDATE academic_years SET is_current = 0 WHERE institution_id = ?').bind(institutionId).run();
    }

    const fields = getUpdateFields(input, UPDATE_FIELDS);
    if (fields.length === 0) return;

    const sets = fields.map(field => `${field} = ?`).join(', ');
    const values = [...fields.map(field => input[field]), userId || null, id];

    await this.db.prepare(`
      UPDATE academic_years 
      SET ${sets}, updated_at = datetime('now'), updated_by = ?
      WHERE id = ? AND is_active = 1
    `).bind(...values).run();
  }

  async softDelete(id: string, userId?: string): Promise<void> {
    await this.db.prepare(`
      UPDATE academic_years 
      SET is_active = 0, deleted_at = datetime('now'), updated_by = ? 
      WHERE id = ?
    `).bind(userId || null, id).run();
  }
}
