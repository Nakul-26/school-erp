import { StudentLeaveApplication, CreateStudentLeaveInput } from './student-leaves.types';

export class StudentLeavesRepository {
  constructor(private db: D1Database) {}

  async createApplication(id: string, institutionId: string, input: CreateStudentLeaveInput, userId?: string): Promise<void> {
    await this.db.prepare(`
      INSERT INTO student_leave_applications (
        id, institution_id, student_id, from_date, to_date, days_count, reason, applied_by, status, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Pending', ?)
    `).bind(
      id, institutionId, input.student_id, input.from_date, input.to_date, input.days_count, input.reason, input.applied_by, userId || null
    ).run();
  }

  async getApplicationById(id: string): Promise<StudentLeaveApplication | null> {
    return await this.db.prepare('SELECT * FROM student_leave_applications WHERE id = ? AND is_active = 1')
      .bind(id).first<StudentLeaveApplication>();
  }

  async listApplicationsForTeacher(institutionId: string, teacherId: string): Promise<any[]> {
    // Shows leaves of students belonging to sections where this teacher is the class teacher or teaches
    const { results } = await this.db.prepare(`
      SELECT la.*, s.first_name, s.last_name, s.roll_number, s.admission_number, c.name AS course_name
      FROM student_leave_applications la
      JOIN students s ON la.student_id = s.id
      JOIN student_enrollments se ON s.id = se.student_id AND se.is_active = 1
      JOIN sections sec ON se.section_id = sec.id
      JOIN courses c ON se.course_id = c.id
      WHERE la.institution_id = ? AND la.is_active = 1
        AND (sec.class_teacher_id = ? OR EXISTS (
          SELECT 1 FROM weekly_timetable wt 
          WHERE wt.section_id = sec.id AND wt.teacher_id = ? AND wt.is_active = 1
        ))
      ORDER BY la.created_at DESC
    `).bind(institutionId, teacherId, teacherId).all<any>();
    return results || [];
  }

  async listApplicationsForAdmin(institutionId: string): Promise<any[]> {
    const { results } = await this.db.prepare(`
      SELECT la.*, s.first_name, s.last_name, s.roll_number, s.admission_number, c.name AS course_name
      FROM student_leave_applications la
      JOIN students s ON la.student_id = s.id
      JOIN student_enrollments se ON s.id = se.student_id AND se.is_active = 1
      JOIN courses c ON se.course_id = c.id
      WHERE la.institution_id = ? AND la.is_active = 1
      ORDER BY la.created_at DESC
    `).bind(institutionId).all<any>();
    return results || [];
  }

  async listMyApplications(studentId: string): Promise<StudentLeaveApplication[]> {
    const { results } = await this.db.prepare(`
      SELECT * FROM student_leave_applications
      WHERE student_id = ? AND is_active = 1
      ORDER BY created_at DESC
    `).bind(studentId).all<StudentLeaveApplication>();
    return results || [];
  }

  async reviewApplication(id: string, status: 'Approved' | 'Rejected', reviewerId: string, remarks?: string): Promise<void> {
    await this.db.prepare(`
      UPDATE student_leave_applications
      SET status = ?, reviewed_by = ?, reviewed_at = datetime('now'), remarks = ?, updated_at = datetime('now')
      WHERE id = ?
    `).bind(status, reviewerId, remarks || null, id).run();
  }
}
