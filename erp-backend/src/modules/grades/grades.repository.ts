import { GradeScale } from './grades.types';

export class GradesRepository {
  constructor(private db: D1Database) {}

  async listScales(institutionId: string): Promise<GradeScale[]> {
    const { results } = await this.db.prepare(
      'SELECT * FROM grade_scales WHERE institution_id = ? AND is_active = 1 ORDER BY sort_order ASC, min_percent DESC'
    ).bind(institutionId).all<GradeScale>();
    return results || [];
  }

  async replaceScales(
    institutionId: string, 
    scales: Omit<GradeScale, 'id' | 'institution_id' | 'is_active' | 'created_at' | 'updated_at'>[], 
    userId: string
  ): Promise<void> {
    // Soft-delete all existing
    await this.db.prepare(
      `UPDATE grade_scales SET is_active = 0, updated_at = datetime('now') WHERE institution_id = ?`
    ).bind(institutionId).run();
    
    // Insert/UPSERT new
    for (const s of scales) {
      const id = crypto.randomUUID();
      await this.db.prepare(
        `INSERT INTO grade_scales (
          id, institution_id, grade, min_percent, max_percent, grade_point, remarks, is_passing, sort_order, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
         ON CONFLICT(institution_id, grade) DO UPDATE SET
           is_active = 1,
           min_percent = excluded.min_percent,
           max_percent = excluded.max_percent,
           grade_point = excluded.grade_point,
           remarks = excluded.remarks,
           is_passing = excluded.is_passing,
           sort_order = excluded.sort_order,
           updated_at = datetime('now')`
      ).bind(
        id, 
        institutionId, 
        s.grade, 
        s.min_percent, 
        s.max_percent, 
        s.grade_point, 
        s.remarks || null, 
        s.is_passing, 
        s.sort_order
      ).run();
    }
  }

  async getExamWithSubjects(examId: string): Promise<any | null> {
    return await this.db.prepare(`
      SELECT e.*, ay.name AS academic_year_name, c.name AS course_name, c.course_code
      FROM exams e
      JOIN academic_years ay ON e.academic_year_id = ay.id
      JOIN courses c ON e.course_id = c.id
      WHERE e.id = ? AND e.is_active = 1
    `).bind(examId).first<any>();
  }

  async getExamSubjects(examId: string): Promise<any[]> {
    const { results } = await this.db.prepare(`
      SELECT es.*, s.subject_name, s.subject_code
      FROM exam_subjects es
      JOIN subjects s ON es.subject_id = s.id
      WHERE es.exam_id = ? AND es.is_active = 1
      ORDER BY s.subject_name ASC
    `).bind(examId).all<any>();
    return results || [];
  }

  async getStudentsForExam(examId: string): Promise<any[]> {
    const { results } = await this.db.prepare(`
      SELECT DISTINCT s.id, s.first_name, s.last_name, s.roll_number, s.admission_number
      FROM student_marks sm
      JOIN exam_subjects es ON sm.exam_subject_id = es.id
      JOIN students s ON sm.student_id = s.id
      WHERE es.exam_id = ? AND sm.is_active = 1 AND s.is_active = 1
      ORDER BY s.roll_number ASC, s.first_name ASC
    `).bind(examId).all<any>();
    return results || [];
  }

  async getMarksForStudentExam(studentId: string, examId: string): Promise<any[]> {
    const { results } = await this.db.prepare(`
      SELECT sm.marks_obtained, sm.max_marks, sm.remarks,
             es.subject_id, s.subject_name, s.subject_code
      FROM student_marks sm
      JOIN exam_subjects es ON sm.exam_subject_id = es.id
      JOIN subjects s ON es.subject_id = s.id
      WHERE sm.student_id = ? AND es.exam_id = ? AND sm.is_active = 1
      ORDER BY s.subject_name ASC
    `).bind(studentId, examId).all<any>();
    return results || [];
  }

  async getAttendancePercent(studentId: string): Promise<number | null> {
    const result = await this.db.prepare(`
      SELECT
        COUNT(CASE WHEN status IN ('present', 'late') THEN 1 END) as present,
        COUNT(*) as total
      FROM student_attendance
      WHERE student_id = ? AND is_active = 1
    `).bind(studentId).first<{ present: number; total: number }>();
    if (!result || result.total === 0) return null;
    return Math.round((result.present / result.total) * 100 * 10) / 10;
  }

  async getAllMarksForExam(examId: string): Promise<any[]> {
    const { results } = await this.db.prepare(`
      SELECT sm.student_id, SUM(sm.marks_obtained) as total_obtained
      FROM student_marks sm
      JOIN exam_subjects es ON sm.exam_subject_id = es.id
      WHERE es.exam_id = ? AND sm.is_active = 1
      GROUP BY sm.student_id
      ORDER BY total_obtained DESC
    `).bind(examId).all<any>();
    return results || [];
  }
}
