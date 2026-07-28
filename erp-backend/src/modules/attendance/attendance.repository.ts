import { AttendanceSession, StudentAttendanceRecord, CreateAttendanceSessionInput, MarkStudentAttendanceInput } from './attendance.types';

export class AttendanceRepository {
  constructor(private db: D1Database) {}

  async findActiveSession(sectionId: string, subjectId: string, date: string, slotId?: string | null): Promise<any> {
    let query = `
      SELECT id, date, created_at FROM attendance_sessions 
      WHERE section_id = ? AND subject_id = ? AND date = ? AND is_active = 1
    `;
    const params: any[] = [sectionId, subjectId, date];
    if (slotId) {
      query += ` AND slot_id = ?`;
      params.push(slotId);
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

  async checkTimetableSchedule(sectionId: string, subjectId: string, dayOfWeek: string): Promise<boolean> {
    const row = await this.db.prepare(`
      SELECT 1 FROM weekly_timetable 
      WHERE section_id = ? AND subject_id = ? AND LOWER(day_of_week) = LOWER(?) AND is_active = 1
      LIMIT 1
    `).bind(sectionId, subjectId, dayOfWeek).first();
    return !!row;
  }

  async isHolidayOrSunday(institutionId: string, dateStr: string): Promise<{ isHoliday: boolean; eventName?: string }> {
    const d = new Date(dateStr);
    const isSunday = d.getUTCDay() === 0;
    
    // Check holiday in academic_calendar
    const holiday = await this.db.prepare(`
      SELECT name FROM academic_calendar 
      WHERE institution_id = ? AND LOWER(type) = 'holiday' AND date(start_date) <= date(?) AND date(end_date) >= date(?) AND is_active = 1
      LIMIT 1
    `).bind(institutionId, dateStr, dateStr).first<{ name: string }>();

    if (holiday) {
      return { isHoliday: true, eventName: holiday.name };
    }
    if (isSunday) {
      return { isHoliday: true, eventName: 'Sunday' };
    }
    return { isHoliday: false };
  }

  async createSession(id: string, institutionId: string, input: CreateAttendanceSessionInput, userId?: string): Promise<void> {
    await this.db.prepare(`
      INSERT INTO attendance_sessions (
        id, institution_id, section_id, subject_id, teacher_id, slot_id, date, created_by, updated_by, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
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
        COALESCE(sa.status, 'present') AS status,
        sa.remarks
      FROM student_enrollments se
      JOIN students s ON se.student_id = s.id
      LEFT JOIN student_attendance sa ON sa.student_id = s.id AND sa.session_id = ? AND sa.is_active = 1
      WHERE se.section_id = ? AND se.is_active = 1 AND s.is_active = 1 AND s.status = 'ACTIVE'
      ORDER BY s.first_name ASC, s.last_name ASC
    `).bind(sessionId, sectionId).all<any>();
    return results || [];
  }

  async markAttendance(institutionId: string, sessionId: string, attendance: MarkStudentAttendanceInput[], userId?: string): Promise<void> {
    if (!attendance || attendance.length === 0) return;

    const stmts: D1PreparedStatement[] = [];
    for (const record of attendance) {
      const id = crypto.randomUUID();
      stmts.push(
        this.db.prepare(`
          INSERT INTO student_attendance (
            id, institution_id, session_id, student_id, status, remarks, created_by, updated_by, is_active
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
          ON CONFLICT(session_id, student_id) DO UPDATE SET
            status = excluded.status,
            remarks = excluded.remarks,
            updated_at = datetime('now'),
            updated_by = excluded.updated_by
        `).bind(
          id, institutionId, sessionId, record.student_id, record.status, record.remarks || null, userId || null, userId || null
        )
      );
    }

    await this.db.batch(stmts);
  }

  async deleteSession(id: string, userId?: string): Promise<void> {
    await this.db.batch([
      this.db.prepare(`UPDATE attendance_sessions SET is_active = 0, deleted_at = datetime('now'), updated_by = ? WHERE id = ?`).bind(userId || null, id),
      this.db.prepare(`UPDATE student_attendance SET is_active = 0, deleted_at = datetime('now'), updated_by = ? WHERE session_id = ?`).bind(userId || null, id),
    ]);
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
        SUM(CASE WHEN sa.status IN ('present', 'late') THEN 1 ELSE 0 END) AS present_count,
        SUM(CASE WHEN sa.status = 'absent' THEN 1 ELSE 0 END) AS absent_count,
        SUM(CASE WHEN sa.status = 'late' THEN 1 ELSE 0 END) AS late_count,
        SUM(CASE WHEN sa.status IN ('medical', 'on_duty', 'excused') THEN 1 ELSE 0 END) AS excused_count
      FROM student_enrollments se
      JOIN students s ON se.student_id = s.id
      LEFT JOIN attendance_sessions asess ON asess.section_id = se.section_id AND asess.is_active = 1 AND asess.institution_id = ?
      LEFT JOIN student_attendance sa ON sa.session_id = asess.id AND sa.student_id = s.id AND sa.is_active = 1 AND sa.institution_id = ?
      WHERE se.section_id = ? AND se.is_active = 1 AND s.is_active = 1 AND s.status = 'ACTIVE'
      GROUP BY s.id
      ORDER BY s.first_name ASC, s.last_name ASC
    `).bind(institutionId, institutionId, sectionId).all<any>();
    return results || [];
  }
}
