import { Program, CreateProgramInput, UpdateProgramInput, ProgramFilterOptions, ProgramDependencyCounts } from './programs.types';
import { getUpdateFields } from '../../utils/repository';

const UPDATE_FIELDS = [
  'course_code', 
  'name', 
  'duration_years',
  'duration_unit',
  'degree_type',
  'department_id', 
  'semester_enabled', 
  'credit_system_enabled', 
  'electives_enabled', 
  'description',
  'is_active'
] as const;

export class ProgramRepository {
  constructor(private db: D1Database) {}

  async create(id: string, institutionId: string, input: CreateProgramInput, userId?: string): Promise<void> {
    await this.db.prepare(`
      INSERT INTO courses (
        id, institution_id, department_id, course_code, name, duration_years, 
        duration_unit, degree_type, semester_enabled, credit_system_enabled, 
        electives_enabled, description, created_by, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      institutionId,
      input.department_id || null,
      input.course_code,
      input.name,
      input.duration_years,
      input.duration_unit || 'Years',
      input.degree_type || 'UG',
      input.semester_enabled || 0,
      input.credit_system_enabled || 0,
      input.electives_enabled || 0,
      input.description || null,
      userId || null,
      userId || null
    ).run();
  }

  async findById(id: string): Promise<Program | null> {
    return await this.db.prepare('SELECT * FROM courses WHERE id = ?').bind(id).first<Program>();
  }

  async findByCode(institutionId: string, code: string, excludeId?: string): Promise<Program | null> {
    let query = 'SELECT * FROM courses WHERE institution_id = ? AND UPPER(course_code) = UPPER(?) AND is_active = 1';
    const params: any[] = [institutionId, code];
    if (excludeId) {
      query += ' AND id != ?';
      params.push(excludeId);
    }
    return await this.db.prepare(query).bind(...params).first<Program>();
  }

  async findByName(institutionId: string, name: string, excludeId?: string): Promise<Program | null> {
    let query = 'SELECT * FROM courses WHERE institution_id = ? AND UPPER(TRIM(name)) = UPPER(TRIM(?)) AND is_active = 1';
    const params: any[] = [institutionId, name];
    if (excludeId) {
      query += ' AND id != ?';
      params.push(excludeId);
    }
    return await this.db.prepare(query).bind(...params).first<Program>();
  }

  async listByInstitution(institutionId: string, options: ProgramFilterOptions | boolean = false): Promise<Program[]> {
    const opts: ProgramFilterOptions = typeof options === 'boolean' 
      ? { includeArchived: options } 
      : options;

    let query = 'SELECT * FROM courses WHERE institution_id = ?';
    const params: any[] = [institutionId];

    // Status filter
    if (opts.status === 'ACTIVE') {
      query += ' AND is_active = 1';
    } else if (opts.status === 'ARCHIVED') {
      query += ' AND is_active = 0';
    } else if (!opts.includeArchived && opts.status !== 'ALL') {
      query += ' AND is_active = 1';
    }

    // Search filter (name or course_code)
    if (opts.search && opts.search.trim()) {
      query += ' AND (UPPER(name) LIKE ? OR UPPER(course_code) LIKE ?)';
      const term = `%${opts.search.trim().toUpperCase()}%`;
      params.push(term, term);
    }

    // Degree type filter
    if (opts.degree_type && opts.degree_type !== 'ALL') {
      query += ' AND degree_type = ?';
      params.push(opts.degree_type);
    }

    // Department filter
    if (opts.department_id && opts.department_id !== 'ALL') {
      query += ' AND department_id = ?';
      params.push(opts.department_id);
    }

    // Default sorting: Active first (is_active DESC), then Name A-Z (name ASC)
    query += ' ORDER BY is_active DESC, name ASC';

    const { results } = await this.db.prepare(query).bind(...params).all<Program>();
    return results || [];
  }

  async update(id: string, input: UpdateProgramInput, userId?: string): Promise<void> {
    const fields = getUpdateFields(input, UPDATE_FIELDS);
    if (fields.length === 0) return;

    const sets = fields.map(field => `${field} = ?`).join(', ');
    const values = [...fields.map(field => input[field]), userId || null, id];

    await this.db.prepare(`
      UPDATE courses 
      SET ${sets}, updated_at = datetime('now'), updated_by = ?
      WHERE id = ?
    `).bind(...values).run();
  }

  async softDelete(id: string, userId?: string): Promise<void> {
    await this.db.prepare(`
      UPDATE courses 
      SET is_active = 0, deleted_at = datetime('now'), updated_by = ? 
      WHERE id = ?
    `).bind(userId || null, id).run();
  }

  async hardDelete(id: string): Promise<void> {
    await this.db.prepare('DELETE FROM courses WHERE id = ?').bind(id).run();
  }

  async restore(id: string, userId?: string): Promise<void> {
    await this.db.prepare(`
      UPDATE courses 
      SET is_active = 1, deleted_at = NULL, updated_by = ? 
      WHERE id = ?
    `).bind(userId || null, id).run();
  }

  async getDependencyCounts(id: string): Promise<ProgramDependencyCounts> {
    // 1. Classes / Sections
    const secRow = await this.db.prepare(
      'SELECT COUNT(*) as count FROM sections WHERE course_id = ? AND is_active = 1'
    ).bind(id).first<{ count: number }>();
    const classes = secRow?.count || 0;

    // 2. Subjects
    const subRow = await this.db.prepare(
      'SELECT COUNT(*) as count FROM subjects WHERE course_id = ? AND is_active = 1'
    ).bind(id).first<{ count: number }>();
    const subjects = subRow?.count || 0;

    // 3. Students (enrollments or direct link)
    const enrollRow = await this.db.prepare(
      'SELECT COUNT(*) as count FROM student_enrollments WHERE course_id = ? AND is_active = 1'
    ).bind(id).first<{ count: number }>();
    const students = enrollRow?.count || 0;

    // 4. Teacher assignments
    const taRow = await this.db.prepare(
      'SELECT COUNT(*) as count FROM teacher_subject_assignments WHERE course_id = ? AND is_active = 1'
    ).bind(id).first<{ count: number }>();
    const teacher_assignments = taRow?.count || 0;

    // 5. Timetables
    const ttRow = await this.db.prepare(`
      SELECT COUNT(*) as count 
      FROM weekly_timetable wt 
      JOIN sections s ON wt.section_id = s.id 
      WHERE s.course_id = ? AND wt.is_active = 1
    `).bind(id).first<{ count: number }>();
    const timetables = ttRow?.count || 0;

    const total = classes + subjects + students + teacher_assignments + timetables;

    return {
      students,
      classes,
      subjects,
      teacher_assignments,
      timetables,
      total
    };
  }

  async hasActiveSections(id: string): Promise<number> {
    const counts = await this.getDependencyCounts(id);
    return counts.total;
  }
}
