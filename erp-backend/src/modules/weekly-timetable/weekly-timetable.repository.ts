import { WeeklyTimetableEntry, CreateWeeklyTimetableInput, UpdateWeeklyTimetableInput, TimetableSubstituteInput } from './weekly-timetable.types';
import { getUpdateFields } from '../../utils/repository';

const UPDATE_FIELDS = ['academic_year_id', 'teacher_id', 'subject_id', 'section_id', 'slot_id', 'day_of_week', 'room_number', 'status'] as const;

export class WeeklyTimetableRepository {
  private schemaChecked = false;

  constructor(private db: D1Database) {}

  async ensureSchema(): Promise<void> {
    if (this.schemaChecked) return;
    try {
      await this.db.prepare("ALTER TABLE weekly_timetable ADD COLUMN room_number TEXT").run();
    } catch (_) {}
    try {
      await this.db.prepare("ALTER TABLE weekly_timetable ADD COLUMN status TEXT DEFAULT 'Published'").run();
    } catch (_) {}
    this.schemaChecked = true;
  }

  async findSectionConflict(sectionId: string, slotId: string, dayOfWeek: string, academicYearId: string, excludeId?: string): Promise<any | null> {
    await this.ensureSchema();
    let query = `
      SELECT wt.*, s.name as section_name, sub.subject_name
      FROM weekly_timetable wt
      JOIN sections s ON wt.section_id = s.id
      JOIN subjects sub ON wt.subject_id = sub.id
      WHERE wt.section_id = ? AND wt.slot_id = ? AND LOWER(wt.day_of_week) = LOWER(?) AND wt.academic_year_id = ? AND wt.is_active = 1
    `;
    const params: any[] = [sectionId, slotId, dayOfWeek, academicYearId];
    if (excludeId) {
      query += ' AND wt.id != ?';
      params.push(excludeId);
    }
    return await this.db.prepare(query).bind(...params).first<any>();
  }

  async findTeacherConflict(teacherId: string, slotId: string, dayOfWeek: string, academicYearId: string, excludeId?: string): Promise<any | null> {
    await this.ensureSchema();
    let query = `
      SELECT s.name as section_name, sub.subject_name, (t.first_name || ' ' || t.last_name) as teacher_name
      FROM weekly_timetable wt
      JOIN sections s ON wt.section_id = s.id
      JOIN subjects sub ON wt.subject_id = sub.id
      JOIN teachers t ON wt.teacher_id = t.id
      WHERE wt.teacher_id = ? AND wt.slot_id = ? AND LOWER(wt.day_of_week) = LOWER(?) AND wt.is_active = 1
    `;
    const params: any[] = [teacherId, slotId, dayOfWeek];
    if (excludeId) {
      query += ' AND wt.id != ?';
      params.push(excludeId);
    }
    return await this.db.prepare(query).bind(...params).first<any>();
  }

  async findRoomConflict(roomNumber: string, slotId: string, dayOfWeek: string, academicYearId: string, excludeId?: string): Promise<any | null> {
    if (!roomNumber || !roomNumber.trim()) return null;
    await this.ensureSchema();
    let query = `
      SELECT s.name as section_name, sub.subject_name
      FROM weekly_timetable wt
      JOIN sections s ON wt.section_id = s.id
      JOIN subjects sub ON wt.subject_id = sub.id
      WHERE LOWER(TRIM(wt.room_number)) = LOWER(TRIM(?)) AND wt.slot_id = ? AND LOWER(wt.day_of_week) = LOWER(?) AND wt.is_active = 1
    `;
    const params: any[] = [roomNumber.trim(), slotId, dayOfWeek];
    if (excludeId) {
      query += ' AND wt.id != ?';
      params.push(excludeId);
    }
    return await this.db.prepare(query).bind(...params).first<any>();
  }

  async checkTeacherAllocation(teacherId: string, subjectId: string, sectionId: string, institutionId: string): Promise<boolean> {
    const row = await this.db.prepare(`
      SELECT 1 FROM teaching_allocations 
      WHERE teacher_id = ? AND subject_id = ? AND section_id = ? AND institution_id = ? AND is_active = 1 AND LOWER(status) = 'active'
      UNION
      SELECT 1 FROM teacher_subject_assignments 
      WHERE teacher_id = ? AND subject_id = ? AND section_id = ? AND is_active = 1
      LIMIT 1
    `).bind(teacherId, subjectId, sectionId, institutionId, teacherId, subjectId, sectionId).first();
    return !!row;
  }

  async create(id: string, institutionId: string, input: CreateWeeklyTimetableInput, userId?: string): Promise<string> {
    await this.ensureSchema();
    const existing = await this.db.prepare(`
      SELECT id FROM weekly_timetable 
      WHERE institution_id = ? AND academic_year_id = ? AND section_id = ? AND slot_id = ? AND LOWER(day_of_week) = LOWER(?)
    `).bind(institutionId, input.academic_year_id, input.section_id, input.slot_id, input.day_of_week).first<{ id: string }>();

    if (existing) {
      await this.db.prepare(`
        UPDATE weekly_timetable 
        SET is_active = 1, deleted_at = NULL, teacher_id = ?, subject_id = ?, room_number = ?, status = ?, updated_by = ?, updated_at = datetime('now')
        WHERE id = ?
      `).bind(input.teacher_id || null, input.subject_id, input.room_number || null, input.status || 'Published', userId || null, existing.id).run();
      return existing.id;
    } else {
      await this.db.prepare(`
        INSERT INTO weekly_timetable (
          id, institution_id, academic_year_id, teacher_id, subject_id, section_id, slot_id, day_of_week, room_number, status, created_by, updated_by, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
      `).bind(
        id, institutionId, input.academic_year_id, input.teacher_id || null, input.subject_id, input.section_id, input.slot_id, input.day_of_week, input.room_number || null, input.status || 'Published', userId || null, userId || null
      ).run();
      return id;
    }
  }

  async findById(id: string): Promise<WeeklyTimetableEntry | null> {
    await this.ensureSchema();
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
    await this.ensureSchema();
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
