export class ComplianceRepository {
  constructor(private db: any) {}

  async getStudentCount(institutionId: string): Promise<number> {
    const row: any = await this.db.prepare(
      `SELECT COUNT(*) as cnt FROM students WHERE institution_id = ? AND is_active = 1`
    ).bind(institutionId).first();
    return row?.cnt || 0;
  }

  async getTeacherCount(institutionId: string): Promise<number> {
    const row: any = await this.db.prepare(
      `SELECT COUNT(*) as cnt FROM teachers WHERE institution_id = ? AND is_active = 1`
    ).bind(institutionId).first();
    return row?.cnt || 0;
  }

  async getStudentsByGender(institutionId: string): Promise<{ gender: string; count: number }[]> {
    const res = await this.db.prepare(`
      SELECT COALESCE(NULLIF(TRIM(gender), ''), 'Not Recorded') as gender, COUNT(*) as count
      FROM students WHERE institution_id = ? AND is_active = 1
      GROUP BY gender ORDER BY count DESC
    `).bind(institutionId).all();
    return (res.results || []) as any[];
  }

  async getStudentsByStatus(institutionId: string): Promise<{ status: string; count: number }[]> {
    const res = await this.db.prepare(`
      SELECT status, COUNT(*) as count FROM students WHERE institution_id = ?
      GROUP BY status ORDER BY count DESC
    `).bind(institutionId).all();
    return (res.results || []) as any[];
  }

  async getStudentsByCourse(institutionId: string): Promise<{ course_name: string; count: number }[]> {
    const res = await this.db.prepare(`
      SELECT c.name as course_name, COUNT(DISTINCT se.student_id) as count
      FROM student_enrollments se
      JOIN students s ON s.id = se.student_id
      JOIN courses c ON c.id = se.course_id
      WHERE s.institution_id = ? AND se.is_active = 1 AND s.is_active = 1
      GROUP BY c.id ORDER BY count DESC
    `).bind(institutionId).all();
    return (res.results || []) as any[];
  }

  async getAttendanceSummary(institutionId: string, from: string, to: string): Promise<{ total_marked: number; present_count: number }> {
    const row: any = await this.db.prepare(`
      SELECT COUNT(*) as total_marked,
        SUM(CASE WHEN sa.status IN ('present', 'late', 'on_duty') THEN 1 ELSE 0 END) as present_count
      FROM student_attendance sa
      JOIN attendance_sessions ases ON ases.id = sa.session_id
      WHERE sa.institution_id = ? AND sa.is_active = 1 AND ases.date >= ? AND ases.date <= ?
    `).bind(institutionId, from, to).first();
    return { total_marked: row?.total_marked || 0, present_count: row?.present_count || 0 };
  }

  async getFeeCompliance(institutionId: string): Promise<{ total_billed: number; total_collected: number; overdue_records: number }> {
    const row: any = await this.db.prepare(`
      SELECT
        COALESCE(SUM(total_amount + fine_amount - concession_amount - refund_amount), 0) as total_billed,
        COALESCE(SUM(paid_amount), 0) as total_collected,
        SUM(CASE WHEN status != 'PAID' AND due_date IS NOT NULL AND due_date < date('now') THEN 1 ELSE 0 END) as overdue_records
      FROM student_fee_records
      WHERE institution_id = ? AND is_active = 1
    `).bind(institutionId).first();
    return {
      total_billed: row?.total_billed || 0,
      total_collected: row?.total_collected || 0,
      overdue_records: row?.overdue_records || 0,
    };
  }
}
