import { AttendanceSession, StudentAttendanceRecord, CreateAttendanceSessionInput, MarkStudentAttendanceInput } from './attendance.types';

export class AttendanceRepository {
  constructor(private db: D1Database) {}

  async createSession(id: string, institutionId: string, input: CreateAttendanceSessionInput, userId?: string): Promise<void> {
    await this.db.prepare(`
      INSERT INTO attendance_sessions (
        id, institution_id, section_id, subject_id, teacher_id, slot_id, date, created_by, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, institutionId, input.section_id, input.subject_id, input.teacher_id, input.slot_id || null, input.date, userId || null, userId || null
    ).run();
  }

  async findSessionById(id: string): Promise<AttendanceSession | null> {
    return await this.db.prepare(`
      SELECT asess.*, 
             sec.name AS section_name,
             s.subject_name AS subject_name,
             s.subject_code AS subject_code,
             (t.first_name || ' ' || t.last_name) AS teacher_name,
             ts.name AS slot_name
      FROM attendance_sessions asess
      LEFT JOIN sections sec ON asess.section_id = sec.id
      LEFT JOIN subjects s ON asess.subject_id = s.id
      LEFT JOIN teachers t ON asess.teacher_id = t.id
      LEFT JOIN timetable_slots ts ON asess.slot_id = ts.id
      WHERE asess.id = ? AND asess.is_active = 1
    `).bind(id).first<AttendanceSession>();
  }

  async listSessions(institutionId: string, sectionId?: string, date?: string): Promise<AttendanceSession[]> {
    let query = `
      SELECT asess.*, 
             sec.name AS section_name,
             s.subject_name AS subject_name,
             s.subject_code AS subject_code,
             (t.first_name || ' ' || t.last_name) AS teacher_name,
             ts.name AS slot_name
      FROM attendance_sessions asess
      LEFT JOIN sections sec ON asess.section_id = sec.id
      LEFT JOIN subjects s ON asess.subject_id = s.id
      LEFT JOIN teachers t ON asess.teacher_id = t.id
      LEFT JOIN timetable_slots ts ON asess.slot_id = ts.id
      WHERE asess.institution_id = ? AND asess.is_active = 1
    `;
    const params: any[] = [institutionId];

    if (sectionId) {
      query += ` AND asess.section_id = ?`;
      params.push(sectionId);
    }
    if (date) {
      query += ` AND asess.date = ?`;
      params.push(date);
    }

    query += ` ORDER BY asess.date DESC, asess.created_at DESC`;

    const { results } = await this.db.prepare(query).bind(...params).all<AttendanceSession>();
    return results || [];
  }

  async getSessionAttendance(sessionId: string, sectionId: string): Promise<any[]> {
    const { results } = await this.db.prepare(`
      SELECT 
        s.id AS student_id,
        s.first_name,
        s.last_name,
        s.roll_number,
        s.admission_number,
        sa.id AS attendance_id,
        sa.status,
        sa.remarks
      FROM student_enrollments se
      JOIN students s ON se.student_id = s.id
      LEFT JOIN student_attendance sa ON sa.student_id = s.id AND sa.session_id = ? AND sa.is_active = 1
      WHERE se.section_id = ? AND se.is_active = 1 AND s.is_active = 1
      ORDER BY s.first_name ASC, s.last_name ASC
    `).bind(sessionId, sectionId).all<any>();
    return results || [];
  }

  async markAttendance(institutionId: string, sessionId: string, attendance: MarkStudentAttendanceInput[], userId?: string): Promise<void> {
    for (const record of attendance) {
      const id = crypto.randomUUID();
      await this.db.prepare(`
        INSERT INTO student_attendance (
          id, institution_id, session_id, student_id, status, remarks, created_by, updated_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(session_id, student_id) DO UPDATE SET
          status = excluded.status,
          remarks = excluded.remarks,
          updated_at = datetime('now'),
          updated_by = excluded.updated_by
      `).bind(
        id, institutionId, sessionId, record.student_id, record.status, record.remarks || null, userId || null, userId || null
      ).run();
    }
  }

  async deleteSession(id: string, userId?: string): Promise<void> {
    await this.db.prepare(`
      UPDATE attendance_sessions 
      SET is_active = 0, deleted_at = datetime('now'), updated_by = ? 
      WHERE id = ?
    `).bind(userId || null, id).run();
  }

  async getStudentAttendanceReport(institutionId: string, sectionId: string): Promise<any[]> {
    const { results } = await this.db.prepare(`
      SELECT 
        s.id AS student_id,
        s.first_name,
        s.last_name,
        s.roll_number,
        s.admission_number,
        COUNT(sa.id) AS total_sessions,
        SUM(CASE WHEN sa.status = 'present' THEN 1 ELSE 0 END) AS present_count,
        SUM(CASE WHEN sa.status = 'absent' THEN 1 ELSE 0 END) AS absent_count,
        SUM(CASE WHEN sa.status = 'late' THEN 1 ELSE 0 END) AS late_count,
        SUM(CASE WHEN sa.status = 'excused' THEN 1 ELSE 0 END) AS excused_count
      FROM student_enrollments se
      JOIN students s ON se.student_id = s.id
      LEFT JOIN attendance_sessions asess ON asess.section_id = se.section_id AND asess.is_active = 1 AND asess.institution_id = ?
      LEFT JOIN student_attendance sa ON sa.session_id = asess.id AND sa.student_id = s.id AND sa.is_active = 1 AND sa.institution_id = ?
      WHERE se.section_id = ? AND se.is_active = 1 AND s.is_active = 1
      GROUP BY s.id
      ORDER BY s.first_name ASC, s.last_name ASC
    `).bind(institutionId, institutionId, sectionId).all<any>();
    return results || [];
  }
}
