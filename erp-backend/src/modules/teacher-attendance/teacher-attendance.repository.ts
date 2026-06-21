import { TeacherAttendanceRecord, MarkTeacherAttendanceInput } from './teacher-attendance.types';

export class TeacherAttendanceRepository {
  constructor(private db: D1Database) {}

  async listAttendanceByDate(institutionId: string, date: string): Promise<any[]> {
    const { results } = await this.db.prepare(`
      SELECT 
        t.id AS teacher_id,
        t.first_name,
        t.last_name,
        t.employee_id,
        t.designation,
        t.department,
        ta.id AS attendance_id,
        ta.status,
        ta.remarks,
        ta.date
      FROM teachers t
      LEFT JOIN teacher_attendance ta ON ta.teacher_id = t.id AND ta.date = ? AND ta.is_active = 1
      WHERE t.institution_id = ? AND t.is_active = 1
      ORDER BY t.first_name ASC, t.last_name ASC
    `).bind(date, institutionId).all<any>();
    return results || [];
  }

  async markAttendance(institutionId: string, date: string, records: MarkTeacherAttendanceInput[], userId?: string): Promise<void> {
    for (const record of records) {
      const id = crypto.randomUUID();
      await this.db.prepare(`
        INSERT INTO teacher_attendance (
          id, institution_id, teacher_id, date, status, remarks, created_by, updated_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(teacher_id, date) DO UPDATE SET
          status = excluded.status,
          remarks = excluded.remarks,
          updated_at = datetime('now'),
          updated_by = excluded.updated_by
      `).bind(
        id, institutionId, record.teacher_id, date, record.status, record.remarks || null, userId || null, userId || null
      ).run();
    }
  }

  async getTeacherAttendanceHistory(teacherId: string): Promise<TeacherAttendanceRecord[]> {
    const { results } = await this.db.prepare(`
      SELECT * FROM teacher_attendance
      WHERE teacher_id = ? AND is_active = 1
      ORDER BY date DESC
    `).bind(teacherId).all<TeacherAttendanceRecord>();
    return results || [];
  }
}
