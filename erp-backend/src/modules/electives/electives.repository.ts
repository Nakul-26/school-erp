import { ElectiveRosterEntry, StudentElectiveChoice } from './electives.types';

export class ElectivesRepository {
  constructor(private db: D1Database) {}

  async getSubject(institutionId: string, subjectId: string): Promise<{ id: string; course_id: string; subject_code: string; subject_name: string; credits: number | null; semester: number | null; is_elective: number } | null> {
    return await this.db.prepare(
      `SELECT id, course_id, subject_code, subject_name, credits, semester, is_elective FROM subjects WHERE id = ? AND institution_id = ? AND is_active = 1`
    ).bind(subjectId, institutionId).first<any>();
  }

  async isEnrolled(studentId: string, courseId: string, academicYearId: string, semester: number): Promise<boolean> {
    const row = await this.db.prepare(
      `SELECT 1 FROM student_enrollments WHERE student_id = ? AND course_id = ? AND academic_year_id = ? AND semester = ? AND is_active = 1`
    ).bind(studentId, courseId, academicYearId, semester).first();
    return !!row;
  }

  async findExisting(studentId: string, subjectId: string, academicYearId: string, semester: number): Promise<{ id: string; status: 'REGISTERED' | 'WITHDRAWN' } | null> {
    return await this.db.prepare(
      `SELECT id, status FROM student_electives WHERE student_id = ? AND subject_id = ? AND academic_year_id = ? AND semester = ?`
    ).bind(studentId, subjectId, academicYearId, semester).first<any>();
  }

  async findById(id: string): Promise<{ id: string; institution_id: string; student_id: string } | null> {
    return await this.db.prepare(`SELECT id, institution_id, student_id FROM student_electives WHERE id = ?`).bind(id).first<any>();
  }

  async create(id: string, institutionId: string, studentId: string, courseId: string, academicYearId: string, semester: number, subjectId: string, userId?: string): Promise<void> {
    await this.db.prepare(`
      INSERT INTO student_electives (id, institution_id, student_id, course_id, academic_year_id, semester, subject_id, status, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'REGISTERED', ?)
    `).bind(id, institutionId, studentId, courseId, academicYearId, semester, subjectId, userId || null).run();
  }

  async reactivate(id: string, userId?: string): Promise<void> {
    await this.db.prepare(
      `UPDATE student_electives SET status = 'REGISTERED', registered_at = datetime('now'), updated_at = datetime('now'), updated_by = ? WHERE id = ?`
    ).bind(userId || null, id).run();
  }

  async withdraw(id: string, userId?: string): Promise<void> {
    await this.db.prepare(
      `UPDATE student_electives SET status = 'WITHDRAWN', updated_at = datetime('now'), updated_by = ? WHERE id = ?`
    ).bind(userId || null, id).run();
  }

  async listOfferedSubjects(institutionId: string, courseId: string, semester: number): Promise<{ subject_id: string; subject_code: string; subject_name: string; credits: number | null }[]> {
    const { results } = await this.db.prepare(`
      SELECT id as subject_id, subject_code, subject_name, credits
      FROM subjects
      WHERE institution_id = ? AND course_id = ? AND semester = ? AND is_elective = 1 AND is_active = 1
      ORDER BY subject_code ASC
    `).bind(institutionId, courseId, semester).all<any>();
    return results || [];
  }

  async countRegistrations(courseId: string, academicYearId: string, semester: number, subjectId: string): Promise<number> {
    const row = await this.db.prepare(`
      SELECT COUNT(*) as cnt FROM student_electives
      WHERE course_id = ? AND academic_year_id = ? AND semester = ? AND subject_id = ? AND status = 'REGISTERED'
    `).bind(courseId, academicYearId, semester, subjectId).first<{ cnt: number }>();
    return row?.cnt || 0;
  }

  async listForStudent(institutionId: string, studentId: string, courseId?: string): Promise<StudentElectiveChoice[]> {
    const params: any[] = [institutionId, studentId];
    let courseFilter = '';
    if (courseId) {
      courseFilter = 'AND se.course_id = ?';
      params.push(courseId);
    }
    const { results } = await this.db.prepare(`
      SELECT se.id, se.subject_id, s.subject_code, s.subject_name, s.credits,
             se.academic_year_id, ay.name as academic_year_name, se.semester, se.status, se.registered_at
      FROM student_electives se
      JOIN subjects s ON s.id = se.subject_id
      JOIN academic_years ay ON ay.id = se.academic_year_id
      WHERE se.institution_id = ? AND se.student_id = ? ${courseFilter}
      ORDER BY ay.start_date ASC, se.semester ASC, s.subject_code ASC
    `).bind(...params).all<StudentElectiveChoice>();
    return results || [];
  }

  async listRoster(courseId: string, academicYearId: string, semester: number, subjectId: string): Promise<ElectiveRosterEntry[]> {
    const { results } = await this.db.prepare(`
      SELECT s.id as student_id, s.first_name, s.last_name, s.roll_number, s.admission_number, se.registered_at
      FROM student_electives se
      JOIN students s ON s.id = se.student_id AND s.is_active = 1
      WHERE se.course_id = ? AND se.academic_year_id = ? AND se.semester = ? AND se.subject_id = ? AND se.status = 'REGISTERED'
      ORDER BY s.roll_number ASC, s.first_name ASC
    `).bind(courseId, academicYearId, semester, subjectId).all<any>();
    return (results || []).map((r: any) => ({
      student_id: r.student_id,
      student_name: `${r.first_name} ${r.last_name || ''}`.trim(),
      roll_number: r.roll_number,
      admission_number: r.admission_number,
      registered_at: r.registered_at,
    }));
  }
}
