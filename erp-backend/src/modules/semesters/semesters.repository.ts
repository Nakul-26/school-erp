import { Semester, SemesterWithDetails, CreateSemesterInput, UpdateSemesterInput, SemesterFilterOptions, SemesterDependencyCounts } from './semesters.types';
import { getUpdateFields } from '../../utils/repository';

const UPDATE_FIELDS = ['name', 'start_date', 'end_date'] as const;

export class SemesterRepository {
  constructor(private db: D1Database) {}

  async create(id: string, institutionId: string, input: CreateSemesterInput & { name: string }, userId?: string): Promise<void> {
    await this.db.prepare(`
      INSERT INTO semesters (
        id, institution_id, course_id, academic_year_id, semester_number, name, start_date, end_date, created_by, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      institutionId,
      input.course_id,
      input.academic_year_id,
      input.semester_number,
      input.name,
      input.start_date || null,
      input.end_date || null,
      userId || null,
      userId || null
    ).run();
  }

  async findById(id: string): Promise<SemesterWithDetails | null> {
    return await this.db.prepare(`
      SELECT
        s.*,
        c.name AS course_name,
        c.course_code AS course_code,
        ay.name AS academic_year_name,
        (
          SELECT COUNT(*) FROM student_enrollments se
          WHERE se.course_id = s.course_id AND se.academic_year_id = s.academic_year_id
            AND se.semester = s.semester_number AND se.is_active = 1
        ) AS enrolled_count
      FROM semesters s
      LEFT JOIN courses c ON c.id = s.course_id
      LEFT JOIN academic_years ay ON ay.id = s.academic_year_id
      WHERE s.id = ?
    `).bind(id).first<SemesterWithDetails>();
  }

  async findDuplicate(courseId: string, academicYearId: string, semesterNumber: number, excludeId?: string): Promise<Semester | null> {
    let query = `
      SELECT * FROM semesters
      WHERE course_id = ? AND academic_year_id = ? AND semester_number = ? AND is_active = 1
    `;
    const params: any[] = [courseId, academicYearId, semesterNumber];
    if (excludeId) {
      query += ' AND id != ?';
      params.push(excludeId);
    }
    return await this.db.prepare(query).bind(...params).first<Semester>();
  }

  async listByInstitution(institutionId: string, filters?: SemesterFilterOptions): Promise<SemesterWithDetails[]> {
    let query = `
      SELECT
        s.*,
        c.name AS course_name,
        c.course_code AS course_code,
        ay.name AS academic_year_name,
        (
          SELECT COUNT(*) FROM student_enrollments se
          WHERE se.course_id = s.course_id AND se.academic_year_id = s.academic_year_id
            AND se.semester = s.semester_number AND se.is_active = 1
        ) AS enrolled_count
      FROM semesters s
      LEFT JOIN courses c ON c.id = s.course_id
      LEFT JOIN academic_years ay ON ay.id = s.academic_year_id
      WHERE s.institution_id = ?
    `;
    const params: any[] = [institutionId];

    if (filters?.status && filters.status !== 'ALL') {
      query += ' AND s.status = ?';
      params.push(filters.status);
    }
    if (filters?.is_active !== undefined && filters.is_active !== '') {
      query += ' AND s.is_active = ?';
      params.push(filters.is_active === '0' ? 0 : 1);
    } else {
      query += ' AND s.is_active = 1';
    }
    if (filters?.course_id) {
      query += ' AND s.course_id = ?';
      params.push(filters.course_id);
    }
    if (filters?.academic_year_id) {
      query += ' AND s.academic_year_id = ?';
      params.push(filters.academic_year_id);
    }

    query += ' ORDER BY s.semester_number ASC';

    const { results } = await this.db.prepare(query).bind(...params).all<SemesterWithDetails>();
    return results || [];
  }

  async update(id: string, input: UpdateSemesterInput, userId?: string): Promise<void> {
    const fields = getUpdateFields(input, UPDATE_FIELDS);
    if (fields.length === 0) return;

    const sets = fields.map(field => `${field} = ?`).join(', ');
    const values = [...fields.map(field => input[field] === undefined ? null : input[field]), userId || null, id];

    await this.db.prepare(`
      UPDATE semesters
      SET ${sets}, updated_at = datetime('now'), updated_by = ?
      WHERE id = ?
    `).bind(...values).run();
  }

  async updateStatus(id: string, status: Semester['status'], userId?: string): Promise<void> {
    await this.db.prepare(`
      UPDATE semesters SET status = ?, updated_at = datetime('now'), updated_by = ? WHERE id = ?
    `).bind(status, userId || null, id).run();
  }

  async softDelete(id: string, userId?: string): Promise<void> {
    await this.db.prepare(`
      UPDATE semesters SET is_active = 0, deleted_at = datetime('now'), updated_by = ? WHERE id = ?
    `).bind(userId || null, id).run();
  }

  async getDependencyCounts(courseId: string, academicYearId: string, semesterNumber: number): Promise<SemesterDependencyCounts> {
    const enrollRow = await this.db.prepare(
      'SELECT COUNT(*) as count FROM student_enrollments WHERE course_id = ? AND academic_year_id = ? AND semester = ? AND is_active = 1'
    ).bind(courseId, academicYearId, semesterNumber).first<{ count: number }>();
    const enrollments = enrollRow?.count || 0;

    const examRow = await this.db.prepare(
      'SELECT COUNT(*) as count FROM exams WHERE course_id = ? AND academic_year_id = ? AND semester = ? AND is_active = 1'
    ).bind(courseId, academicYearId, semesterNumber).first<{ count: number }>();
    const exams = examRow?.count || 0;

    return { enrollments, exams, total: enrollments + exams };
  }
}
