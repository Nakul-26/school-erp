import { AcademicCalendarEntry, CreateCalendarEntryInput, UpdateCalendarEntryInput } from './academic-calendar.types';
import { getUpdateFields } from '../../utils/repository';

const UPDATE_FIELDS = ['name', 'start_date', 'end_date', 'type', 'description'] as const;

export class AcademicCalendarRepository {
  constructor(private db: D1Database) {}

  async create(id: string, institutionId: string, input: CreateCalendarEntryInput, userId?: string): Promise<void> {
    await this.db.prepare(`
      INSERT INTO academic_calendar (
        id, institution_id, name, start_date, end_date, type, description, created_by, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, institutionId, input.name, input.start_date, input.end_date, input.type, input.description || null, userId || null, userId || null
    ).run();
  }

  async findById(id: string): Promise<AcademicCalendarEntry | null> {
    return await this.db.prepare('SELECT * FROM academic_calendar WHERE id = ? AND is_active = 1').bind(id).first<AcademicCalendarEntry>();
  }

  async listByInstitution(institutionId: string): Promise<AcademicCalendarEntry[]> {
    const { results } = await this.db.prepare('SELECT * FROM academic_calendar WHERE institution_id = ? AND is_active = 1 ORDER BY start_date ASC').bind(institutionId).all<AcademicCalendarEntry>();
    return results || [];
  }

  async update(id: string, input: UpdateCalendarEntryInput, userId?: string): Promise<void> {
    const fields = getUpdateFields(input, UPDATE_FIELDS);
    if (fields.length === 0) return;

    const sets = fields.map(field => `${field} = ?`).join(', ');
    const values = [...fields.map(f => input[f as keyof UpdateCalendarEntryInput]), userId || null, id];

    await this.db.prepare(`
      UPDATE academic_calendar 
      SET ${sets}, updated_at = datetime('now'), updated_by = ?
      WHERE id = ? AND is_active = 1
    `).bind(...values).run();
  }

  async softDelete(id: string, userId?: string): Promise<void> {
    await this.db.prepare(`
      UPDATE academic_calendar 
      SET is_active = 0, deleted_at = datetime('now'), updated_by = ? 
      WHERE id = ?
    `).bind(userId || null, id).run();
  }
}
