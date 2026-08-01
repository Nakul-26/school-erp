import { RawSemesterMarkRow, SemesterTuple } from './transcript.types';

export class TranscriptRepository {
  constructor(private db: D1Database) {}

  async getCourse(courseId: string): Promise<{ id: string; name: string; institution_id: string; credit_system_enabled: number } | null> {
    return await this.db.prepare(
      `SELECT id, name, institution_id, credit_system_enabled FROM courses WHERE id = ? AND is_active = 1`
    ).bind(courseId).first<any>();
  }

  async getSemesterMarks(
    studentId: string,
    institutionId: string,
    courseId: string,
    academicYearId: string,
    semester: number
  ): Promise<RawSemesterMarkRow[]> {
    const { results } = await this.db.prepare(`
      SELECT s.id as subject_id, s.subject_code, s.subject_name, s.credits,
             e.id as exam_id, e.name as exam_name, e.start_date,
             sm.marks_obtained, sm.max_marks
      FROM exams e
      JOIN exam_subjects es ON es.exam_id = e.id AND es.is_active = 1
      JOIN subjects s ON s.id = es.subject_id AND s.is_active = 1
      JOIN student_marks sm ON sm.exam_subject_id = es.id AND sm.student_id = ? AND sm.is_active = 1
      WHERE e.institution_id = ? AND e.course_id = ? AND e.academic_year_id = ? AND e.semester = ?
        AND e.status IN ('PUBLISHED', 'COMPLETED') AND e.is_active = 1
      ORDER BY s.id ASC, e.start_date DESC, e.created_at DESC
    `).bind(studentId, institutionId, courseId, academicYearId, semester).all<RawSemesterMarkRow>();
    return results || [];
  }

  async getSemesterTuples(studentId: string, institutionId: string, courseId: string): Promise<SemesterTuple[]> {
    const { results } = await this.db.prepare(`
      SELECT DISTINCT e.academic_year_id, ay.name as academic_year_name, e.semester
      FROM exams e
      JOIN academic_years ay ON ay.id = e.academic_year_id
      JOIN exam_subjects es ON es.exam_id = e.id AND es.is_active = 1
      JOIN student_marks sm ON sm.exam_subject_id = es.id AND sm.student_id = ? AND sm.is_active = 1
      WHERE e.institution_id = ? AND e.course_id = ?
        AND e.status IN ('PUBLISHED', 'COMPLETED') AND e.is_active = 1
      ORDER BY ay.start_date ASC, e.semester ASC
    `).bind(studentId, institutionId, courseId).all<SemesterTuple>();
    return results || [];
  }
}
