import { Exam, ExamSubject, StudentMark, CreateExamInput, UpdateExamInput, CreateExamSubjectInput, EnterMarkInput } from './exams.types';
import { getUpdateFields } from '../../utils/repository';

const UPDATE_FIELDS = ['name', 'academic_year_id', 'course_id', 'semester', 'start_date', 'end_date', 'status'] as const;

export class ExamsRepository {
  constructor(private db: D1Database) {}

  async create(id: string, institutionId: string, input: CreateExamInput, userId?: string): Promise<void> {
    await this.db.prepare(`
      INSERT INTO exams (
        id, institution_id, name, academic_year_id, course_id, semester, start_date, end_date, status, created_by, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, institutionId, input.name, input.academic_year_id, input.course_id, input.semester,
      input.start_date, input.end_date, input.status || 'DRAFT', userId || null, userId || null
    ).run();
  }

  async findById(id: string): Promise<Exam | null> {
    return await this.db.prepare(`
      SELECT e.*, 
             ay.name AS academic_year_name,
             c.name AS course_name,
             c.course_code AS course_code
      FROM exams e
      LEFT JOIN academic_years ay ON e.academic_year_id = ay.id
      LEFT JOIN courses c ON e.course_id = c.id
      WHERE e.id = ? AND e.is_active = 1
    `).bind(id).first<Exam>();
  }

  async listByInstitution(institutionId: string): Promise<Exam[]> {
    const { results } = await this.db.prepare(`
      SELECT e.*, 
             ay.name AS academic_year_name,
             c.name AS course_name,
             c.course_code AS course_code
      FROM exams e
      LEFT JOIN academic_years ay ON e.academic_year_id = ay.id
      LEFT JOIN courses c ON e.course_id = c.id
      WHERE e.institution_id = ? AND e.is_active = 1
      ORDER BY e.start_date DESC
    `).bind(institutionId).all<Exam>();
    return results || [];
  }

  async update(id: string, input: UpdateExamInput, userId?: string): Promise<void> {
    const fields = getUpdateFields(input, UPDATE_FIELDS);
    if (fields.length === 0) return;

    const sets = fields.map(field => `${field} = ?`).join(', ');
    const values = [...fields.map(f => input[f as keyof UpdateExamInput]), userId || null, id];

    await this.db.prepare(`
      UPDATE exams 
      SET ${sets}, updated_at = datetime('now'), updated_by = ?
      WHERE id = ? AND is_active = 1
    `).bind(...values).run();
  }

  async softDelete(id: string, userId?: string): Promise<void> {
    await this.db.prepare(`
      UPDATE exams 
      SET is_active = 0, deleted_at = datetime('now'), updated_by = ? 
      WHERE id = ?
    `).bind(userId || null, id).run();
  }

  // --- EXAM SUBJECTS ---
  async addSubject(id: string, institutionId: string, examId: string, input: CreateExamSubjectInput, userId?: string): Promise<void> {
    await this.db.prepare(`
      INSERT INTO exam_subjects (
        id, institution_id, exam_id, subject_id, exam_date, start_time, end_time, max_marks, min_marks, created_by, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, institutionId, examId, input.subject_id, input.exam_date || null,
      input.start_time || null, input.end_time || null, input.max_marks, input.min_marks, userId || null, userId || null
    ).run();
  }

  async listSubjects(examId: string): Promise<ExamSubject[]> {
    const { results } = await this.db.prepare(`
      SELECT es.*, 
             s.subject_name AS subject_name,
             s.subject_code AS subject_code
      FROM exam_subjects es
      JOIN subjects s ON es.subject_id = s.id
      WHERE es.exam_id = ? AND es.is_active = 1
      ORDER BY es.exam_date ASC, es.start_time ASC
    `).bind(examId).all<ExamSubject>();
    return results || [];
  }

  async findSubjectById(id: string): Promise<ExamSubject | null> {
    return await this.db.prepare(`
      SELECT es.*, 
             s.subject_name AS subject_name,
             s.subject_code AS subject_code
      FROM exam_subjects es
      JOIN subjects s ON es.subject_id = s.id
      WHERE es.id = ? AND es.is_active = 1
    `).bind(id).first<ExamSubject>();
  }

  async removeSubject(id: string, userId?: string): Promise<void> {
    await this.db.prepare(`
      UPDATE exam_subjects 
      SET is_active = 0, deleted_at = datetime('now'), updated_by = ? 
      WHERE id = ?
    `).bind(userId || null, id).run();
  }

  // --- MARKS ---
  async getMarksheet(examSubjectId: string, academicYearId: string, courseId: string, semester: number): Promise<any[]> {
    const { results } = await this.db.prepare(`
      SELECT 
        s.id AS student_id,
        (s.first_name || ' ' || s.last_name) AS student_name,
        s.roll_number,
        s.admission_number,
        se.section_id,
        sec.name AS section_name,
        sm.id AS mark_id,
        sm.marks_obtained,
        sm.max_marks,
        sm.remarks
      FROM student_enrollments se
      JOIN students s ON se.student_id = s.id
      LEFT JOIN sections sec ON sec.id = se.section_id
      LEFT JOIN student_marks sm ON sm.student_id = s.id AND sm.exam_subject_id = ? AND sm.is_active = 1
      WHERE se.academic_year_id = ? AND se.course_id = ? AND se.semester = ? AND se.is_active = 1 AND s.is_active = 1
      ORDER BY s.first_name ASC, s.last_name ASC
    `).bind(examSubjectId, academicYearId, courseId, semester).all<any>();
    return results || [];
  }

  async saveMarks(institutionId: string, examSubjectId: string, marks: EnterMarkInput[], userId?: string): Promise<void> {
    for (const record of marks) {
      const id = crypto.randomUUID();
      await this.db.prepare(`
        INSERT INTO student_marks (
          id, institution_id, exam_subject_id, student_id, marks_obtained, max_marks, remarks, created_by, updated_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(exam_subject_id, student_id) DO UPDATE SET
          marks_obtained = excluded.marks_obtained,
          max_marks = excluded.max_marks,
          remarks = excluded.remarks,
          updated_at = datetime('now'),
          updated_by = excluded.updated_by
      `).bind(
        id, institutionId, examSubjectId, record.student_id, record.marks_obtained, record.max_marks, record.remarks || null, userId || null, userId || null
      ).run();
    }
  }

  // --- RESULTS ---
  async getStudentExamMarks(studentId: string, examId: string): Promise<any[]> {
    const { results } = await this.db.prepare(`
      SELECT 
        es.id AS exam_subject_id,
        es.subject_id,
        sub.subject_name,
        sub.subject_code,
        es.max_marks AS es_max_marks,
        es.min_marks AS es_min_marks,
        sm.marks_obtained,
        sm.max_marks AS sm_max_marks,
        sm.remarks
      FROM exam_subjects es
      JOIN subjects sub ON es.subject_id = sub.id
      LEFT JOIN student_marks sm ON sm.exam_subject_id = es.id AND sm.student_id = ? AND sm.is_active = 1
      WHERE es.exam_id = ? AND es.is_active = 1
    `).bind(studentId, examId).all<any>();
    return results || [];
  }

  async getAllStudentsExamMarks(examId: string, academicYearId: string, courseId: string, semester: number): Promise<any[]> {
    const { results } = await this.db.prepare(`
      SELECT 
        s.id AS student_id,
        (s.first_name || ' ' || s.last_name) AS student_name,
        s.roll_number,
        s.admission_number,
        es.id AS exam_subject_id,
        es.subject_id,
        sub.subject_name,
        sub.subject_code,
        es.max_marks AS es_max_marks,
        es.min_marks AS es_min_marks,
        sm.marks_obtained,
        sm.max_marks AS sm_max_marks,
        sm.remarks
      FROM student_enrollments se
      JOIN students s ON se.student_id = s.id
      JOIN exam_subjects es ON es.exam_id = ? AND es.is_active = 1
      JOIN subjects sub ON es.subject_id = sub.id
      LEFT JOIN student_marks sm ON sm.exam_subject_id = es.id AND sm.student_id = s.id AND sm.is_active = 1
      WHERE se.academic_year_id = ? AND se.course_id = ? AND se.semester = ? AND se.is_active = 1 AND s.is_active = 1
      ORDER BY s.first_name ASC, s.last_name ASC
    `).bind(examId, academicYearId, courseId, semester).all<any>();
    return results || [];
  }

  async listExamsForStudent(studentId: string): Promise<any[]> {
    const { results } = await this.db.prepare(`
      SELECT DISTINCT e.*, ay.name AS academic_year_name, c.name AS course_name
      FROM student_enrollments se
      JOIN exams e ON se.academic_year_id = e.academic_year_id 
                   AND se.course_id = e.course_id 
                   AND se.semester = e.semester
      JOIN academic_years ay ON e.academic_year_id = ay.id
      JOIN courses c ON e.course_id = c.id
      WHERE se.student_id = ? AND se.is_active = 1 AND e.is_active = 1
      ORDER BY e.start_date DESC
    `).bind(studentId).all<any>();
    return results || [];
  }
}
