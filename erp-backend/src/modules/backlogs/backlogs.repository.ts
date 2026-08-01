import { EnrolledStudentRow } from './backlogs.types';

export class BacklogsRepository {
  constructor(private db: D1Database) {}

  async getEnrolledStudents(institutionId: string, courseId: string): Promise<EnrolledStudentRow[]> {
    const { results } = await this.db.prepare(`
      SELECT DISTINCT s.id, s.first_name, s.last_name, s.roll_number, s.admission_number
      FROM student_enrollments se
      JOIN students s ON s.id = se.student_id AND s.is_active = 1 AND s.institution_id = ?
      WHERE se.course_id = ? AND se.is_active = 1
      ORDER BY s.roll_number ASC, s.first_name ASC
    `).bind(institutionId, courseId).all<EnrolledStudentRow>();
    return results || [];
  }
}
