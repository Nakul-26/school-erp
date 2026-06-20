import { TimetableSlot, CreateTimetableSlotInput, UpdateTimetableSlotInput } from './timetable-slots.types';
import { getUpdateFields } from '../../utils/repository';

const UPDATE_FIELDS = ['name', 'start_time', 'end_time', 'slot_type'] as const;

export class TimetableSlotRepository {
  constructor(private db: D1Database) {}

  async create(id: string, institutionId: string, input: CreateTimetableSlotInput, userId?: string): Promise<void> {
    await this.db.prepare(`
      INSERT INTO timetable_slots (
        id, institution_id, name, start_time, end_time, slot_type, created_by, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, institutionId, input.name, input.start_time, input.end_time, input.slot_type, userId || null, userId || null
    ).run();
  }

  async findById(id: string): Promise<TimetableSlot | null> {
    return await this.db.prepare('SELECT * FROM timetable_slots WHERE id = ? AND is_active = 1').bind(id).first<TimetableSlot>();
  }

  async listByInstitution(institutionId: string): Promise<TimetableSlot[]> {
    const { results } = await this.db.prepare('SELECT * FROM timetable_slots WHERE institution_id = ? AND is_active = 1 ORDER BY start_time ASC').bind(institutionId).all<TimetableSlot>();
    return results || [];
  }

  async update(id: string, input: UpdateTimetableSlotInput, userId?: string): Promise<void> {
    const fields = getUpdateFields(input, UPDATE_FIELDS);
    if (fields.length === 0) return;

    const sets = fields.map(field => `${field} = ?`).join(', ');
    const values = [...fields.map(f => input[f as keyof UpdateTimetableSlotInput]), userId || null, id];

    await this.db.prepare(`
      UPDATE timetable_slots 
      SET ${sets}, updated_at = datetime('now'), updated_by = ?
      WHERE id = ? AND is_active = 1
    `).bind(...values).run();
  }

  async softDelete(id: string, userId?: string): Promise<void> {
    await this.db.prepare(`
      UPDATE timetable_slots 
      SET is_active = 0, deleted_at = datetime('now'), updated_by = ? 
      WHERE id = ?
    `).bind(userId || null, id).run();
  }
}
