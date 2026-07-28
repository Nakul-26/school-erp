import { Subject, SubjectWithDetails, CreateSubjectInput, UpdateSubjectInput, SubjectFilterOptions, SubjectDependencyCounts } from './subjects.types';
import { getUpdateFields } from '../../utils/repository';

const UPDATE_FIELDS = [
  'course_id', 
  'subject_code', 
  'subject_name', 
  'credits', 
  'semester',
  'is_elective',
  'status',
  'description',
  'theory_lab',
  'department',
  'weekly_hours',
  'is_active'
] as const;

export class SubjectRepository {
  constructor(private db: D1Database) {}

  async create(id: string, institutionId: string, input: CreateSubjectInput, userId?: string): Promise<void> {
    await this.db.prepare(`
      INSERT INTO subjects (
        id, institution_id, course_id, subject_code, subject_name, credits, semester,
        is_elective, status, description, theory_lab, department, weekly_hours, created_by, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      institutionId,
      input.course_id,
      input.subject_code,
      input.subject_name,
      input.credits ?? null,
      input.semester ?? null,
      input.is_elective ?? 0,
      input.status ?? 'ACTIVE',
      input.description ?? null,
      input.theory_lab ?? 'Theory',
      input.department ?? null,
      input.weekly_hours ?? null,
      userId || null,
      userId || null
    ).run();
  }

  async findById(id: string): Promise<SubjectWithDetails | null> {
    return await this.db.prepare(`
      SELECT s.*, c.name as course_name
      FROM subjects s
      LEFT JOIN courses c ON s.course_id = c.id
      WHERE s.id = ?
    `).bind(id).first<SubjectWithDetails>();
  }

  async findDuplicateByCode(institutionId: string, courseId: string, code: string, excludeId?: string): Promise<Subject | null> {
    let query = 'SELECT * FROM subjects WHERE institution_id = ? AND course_id = ? AND UPPER(TRIM(subject_code)) = UPPER(TRIM(?)) AND is_active = 1';
    const params: any[] = [institutionId, courseId, code];
    if (excludeId) {
      query += ' AND id != ?';
      params.push(excludeId);
    }
    return await this.db.prepare(query).bind(...params).first<Subject>();
  }

  async findDuplicateByName(institutionId: string, courseId: string, name: string, excludeId?: string): Promise<Subject | null> {
    let query = 'SELECT * FROM subjects WHERE institution_id = ? AND course_id = ? AND UPPER(TRIM(subject_name)) = UPPER(TRIM(?)) AND is_active = 1';
    const params: any[] = [institutionId, courseId, name];
    if (excludeId) {
      query += ' AND id != ?';
      params.push(excludeId);
    }
    return await this.db.prepare(query).bind(...params).first<Subject>();
  }

  async listByInstitution(institutionId: string, filters?: SubjectFilterOptions): Promise<SubjectWithDetails[]> {
    let query = `
      SELECT s.*, c.name as course_name
      FROM subjects s
      LEFT JOIN courses c ON s.course_id = c.id
      WHERE s.institution_id = ?
    `;
    const params: any[] = [institutionId];

    // Status filter
    if (filters?.status === 'ACTIVE') {
      query += ' AND s.is_active = 1';
    } else if (filters?.status === 'ARCHIVED') {
      query += ' AND s.is_active = 0';
    } else if (filters?.is_active !== undefined && filters.is_active !== '') {
      query += ' AND s.is_active = ?';
      params.push(filters.is_active === '0' ? 0 : 1);
    } else if (filters?.status !== 'ALL') {
      query += ' AND s.is_active = 1';
    }

    if (filters?.course_id && filters.course_id !== 'ALL') {
      query += ' AND s.course_id = ?';
      params.push(filters.course_id);
    }
    if (filters?.semester !== undefined && filters.semester !== '' && filters.semester !== 'ALL') {
      query += ' AND s.semester = ?';
      params.push(Number(filters.semester));
    }
    if (filters?.is_elective !== undefined && filters.is_elective !== '' && filters.is_elective !== 'ALL') {
      query += ' AND s.is_elective = ?';
      params.push(Number(filters.is_elective));
    }
    if (filters?.theory_lab && filters.theory_lab !== 'ALL') {
      query += ' AND s.theory_lab = ?';
      params.push(filters.theory_lab);
    }
    if (filters?.search && filters.search.trim()) {
      query += ' AND (s.subject_code LIKE ? OR s.subject_name LIKE ? OR c.name LIKE ?)';
      const term = `%${filters.search.trim()}%`;
      params.push(term, term, term);
    }

    // Default Order: 1. Active first, 2. Semester ASC, 3. Subject Code ASC, 4. Subject Name ASC
    query += ' ORDER BY s.is_active DESC, s.semester ASC, s.subject_code ASC, s.subject_name ASC';

    const { results } = await this.db.prepare(query).bind(...params).all<SubjectWithDetails>();
    return results || [];
  }

  async update(id: string, input: UpdateSubjectInput, userId?: string): Promise<void> {
    const fields = getUpdateFields(input, UPDATE_FIELDS);
    if (fields.length === 0) return;

    const sets = fields.map(field => `${field} = ?`).join(', ');
    const values = [...fields.map(field => input[field] === undefined ? null : input[field]), userId || null, id];

    await this.db.prepare(`
      UPDATE subjects 
      SET ${sets}, updated_at = datetime('now'), updated_by = ?
      WHERE id = ?
    `).bind(...values).run();
  }

  async softDelete(id: string, userId?: string): Promise<void> {
    await this.db.prepare(`
      UPDATE subjects 
      SET is_active = 0, deleted_at = datetime('now'), updated_by = ? 
      WHERE id = ?
    `).bind(userId || null, id).run();
  }

  async hardDelete(id: string): Promise<void> {
    await this.db.prepare('DELETE FROM subjects WHERE id = ?').bind(id).run();
  }

  async restore(id: string, userId?: string): Promise<void> {
    await this.db.prepare(`
      UPDATE subjects 
      SET is_active = 1, deleted_at = NULL, updated_by = ? 
      WHERE id = ?
    `).bind(userId || null, id).run();
  }

  async getDependencyCounts(id: string): Promise<SubjectDependencyCounts> {
    // 1. Teacher assignments / Allocations
    const tsaRow = await this.db.prepare(
      'SELECT COUNT(*) as count FROM teacher_subject_assignments WHERE subject_id = ? AND is_active = 1'
    ).bind(id).first<{ count: number }>();
    const tsa = tsaRow?.count || 0;

    const allocRow = await this.db.prepare(
      'SELECT COUNT(*) as count FROM teaching_allocations WHERE subject_id = ? AND LOWER(status) = "active"'
    ).bind(id).first<{ count: number }>();
    const alloc = allocRow?.count || 0;
    const teacher_assignments = tsa + alloc;

    // 2. Timetables
    const ttRow = await this.db.prepare(
      'SELECT COUNT(*) as count FROM weekly_timetable WHERE subject_id = ? AND is_active = 1'
    ).bind(id).first<{ count: number }>();
    const timetables = ttRow?.count || 0;

    // 3. Attendance sessions
    const attRow = await this.db.prepare(
      'SELECT COUNT(*) as count FROM attendance_sessions WHERE subject_id = ? AND is_active = 1'
    ).bind(id).first<{ count: number }>();
    const attendance = attRow?.count || 0;

    // 4. Exams
    const examRow = await this.db.prepare(
      'SELECT COUNT(*) as count FROM exam_subjects WHERE subject_id = ?'
    ).bind(id).first<{ count: number }>();
    const exams = examRow?.count || 0;

    // 5. Grades / Marks
    const markRow = await this.db.prepare(`
      SELECT COUNT(*) as count 
      FROM student_marks sm 
      JOIN exam_subjects es ON sm.exam_subject_id = es.id 
      WHERE es.subject_id = ?
    `).bind(id).first<{ count: number }>();
    const grades = markRow?.count || 0;

    const total = teacher_assignments + timetables + attendance + exams + grades;

    return {
      teacher_assignments,
      timetables,
      attendance,
      exams,
      grades,
      total
    };
  }
}
