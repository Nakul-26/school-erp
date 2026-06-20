import { WeeklyTimetableEntry, CreateWeeklyTimetableInput, UpdateWeeklyTimetableInput } from './weekly-timetable.types';
import { getUpdateFields } from '../../utils/repository';

const UPDATE_FIELDS = ['academic_year_id', 'teacher_id', 'subject_id', 'section_id', 'slot_id', 'day_of_week'] as const;

export class WeeklyTimetableRepository {
  constructor(private db: D1Database) {}

  async create(id: string, institutionId: string, input: CreateWeeklyTimetableInput, userId?: string): Promise<void> {
    await this.db.prepare(`
      INSERT INTO weekly_timetable (
        id, institution_id, academic_year_id, teacher_id, subject_id, section_id, slot_id, day_of_week, created_by, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, institutionId, input.academic_year_id, input.teacher_id || null, input.subject_id, input.section_id, input.slot_id, input.day_of_week, userId || null, userId || null
    ).run();
  }

  async findById(id: string): Promise<WeeklyTimetableEntry | null> {
    return await this.db.prepare(`
      SELECT wt.*, 
             (t.first_name || ' ' || t.last_name) AS teacher_name,
             s.subject_name AS subject_name,
             s.subject_code AS subject_code,
             sec.name AS section_name,
             ts.name AS slot_name,
             ts.start_time AS start_time,
             ts.end_time AS end_time
      FROM weekly_timetable wt
      LEFT JOIN teachers t ON wt.teacher_id = t.id
      LEFT JOIN subjects s ON wt.subject_id = s.id
      LEFT JOIN sections sec ON wt.section_id = sec.id
      LEFT JOIN timetable_slots ts ON wt.slot_id = ts.id
      WHERE wt.id = ? AND wt.is_active = 1
    `).bind(id).first<WeeklyTimetableEntry>();
  }

  async listByInstitution(institutionId: string): Promise<WeeklyTimetableEntry[]> {
    const { results } = await this.db.prepare(`
      SELECT wt.*, 
             (t.first_name || ' ' || t.last_name) AS teacher_name,
             s.subject_name AS subject_name,
             s.subject_code AS subject_code,
             sec.name AS section_name,
             ts.name AS slot_name,
             ts.start_time AS start_time,
             ts.end_time AS end_time
      FROM weekly_timetable wt
      LEFT JOIN teachers t ON wt.teacher_id = t.id
      LEFT JOIN subjects s ON wt.subject_id = s.id
      LEFT JOIN sections sec ON wt.section_id = sec.id
      LEFT JOIN timetable_slots ts ON wt.slot_id = ts.id
      WHERE wt.institution_id = ? AND wt.is_active = 1
      ORDER BY ts.start_time ASC
    `).bind(institutionId).all<WeeklyTimetableEntry>();
    return results || [];
  }

  async listBySection(institutionId: string, sectionId: string): Promise<WeeklyTimetableEntry[]> {
    const { results } = await this.db.prepare(`
      SELECT wt.*, 
             (t.first_name || ' ' || t.last_name) AS teacher_name,
             s.subject_name AS subject_name,
             s.subject_code AS subject_code,
             sec.name AS section_name,
             ts.name AS slot_name,
             ts.start_time AS start_time,
             ts.end_time AS end_time
      FROM weekly_timetable wt
      LEFT JOIN teachers t ON wt.teacher_id = t.id
      LEFT JOIN subjects s ON wt.subject_id = s.id
      LEFT JOIN sections sec ON wt.section_id = sec.id
      LEFT JOIN timetable_slots ts ON wt.slot_id = ts.id
      WHERE wt.institution_id = ? AND wt.section_id = ? AND wt.is_active = 1
      ORDER BY ts.start_time ASC
    `).bind(institutionId, sectionId).all<WeeklyTimetableEntry>();
    return results || [];
  }

  async listByTeacher(institutionId: string, teacherId: string): Promise<WeeklyTimetableEntry[]> {
    const { results } = await this.db.prepare(`
      SELECT wt.*, 
             (t.first_name || ' ' || t.last_name) AS teacher_name,
             s.subject_name AS subject_name,
             s.subject_code AS subject_code,
             sec.name AS section_name,
             ts.name AS slot_name,
             ts.start_time AS start_time,
             ts.end_time AS end_time
      FROM weekly_timetable wt
      LEFT JOIN teachers t ON wt.teacher_id = t.id
      LEFT JOIN subjects s ON wt.subject_id = s.id
      LEFT JOIN sections sec ON wt.section_id = sec.id
      LEFT JOIN timetable_slots ts ON wt.slot_id = ts.id
      WHERE wt.institution_id = ? AND wt.teacher_id = ? AND wt.is_active = 1
      ORDER BY ts.start_time ASC
    `).bind(institutionId, teacherId).all<WeeklyTimetableEntry>();
    return results || [];
  }

  async update(id: string, input: UpdateWeeklyTimetableInput, userId?: string): Promise<void> {
    const fields = getUpdateFields(input, UPDATE_FIELDS);
    if (fields.length === 0) return;

    const sets = fields.map(field => `${field} = ?`).join(', ');
    const values = [...fields.map(f => input[f as keyof UpdateWeeklyTimetableInput]), userId || null, id];

    await this.db.prepare(`
      UPDATE weekly_timetable 
      SET ${sets}, updated_at = datetime('now'), updated_by = ?
      WHERE id = ? AND is_active = 1
    `).bind(...values).run();
  }

  async softDelete(id: string, userId?: string): Promise<void> {
    await this.db.prepare(`
      UPDATE weekly_timetable 
      SET is_active = 0, deleted_at = datetime('now'), updated_by = ? 
      WHERE id = ?
    `).bind(userId || null, id).run();
  }
}
