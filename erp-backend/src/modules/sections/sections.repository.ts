import { Section, SectionWithDetails, CreateSectionInput, UpdateSectionInput, SectionFilterOptions, SectionDependencyCounts } from './sections.types';
import { getUpdateFields } from '../../utils/repository';

const UPDATE_FIELDS = ['academic_year_id', 'course_id', 'name', 'year_number', 'capacity', 'room', 'class_teacher_id', 'is_active'] as const;

export class SectionRepository {
  constructor(private db: D1Database) {}

  async create(id: string, institutionId: string, input: CreateSectionInput, userId?: string): Promise<void> {
    await this.db.prepare(`
      INSERT INTO sections (
        id, institution_id, academic_year_id, course_id, name, year_number, capacity, room, class_teacher_id, created_by, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      institutionId,
      input.academic_year_id,
      input.course_id,
      input.name,
      input.year_number,
      input.capacity !== undefined ? input.capacity : null,
      input.room !== undefined ? input.room : null,
      input.class_teacher_id !== undefined ? input.class_teacher_id : null,
      userId || null,
      userId || null
    ).run();
  }

  async findById(id: string): Promise<SectionWithDetails | null> {
    return await this.db.prepare(`
      SELECT 
        s.*,
        (t.first_name || ' ' || t.last_name) AS class_teacher_name,
        c.name AS course_name,
        ay.name AS academic_year_name,
        (
          SELECT COUNT(*) 
          FROM student_enrollments se 
          JOIN students st ON se.student_id = st.id 
          WHERE se.section_id = s.id AND se.is_active = 1 AND st.is_active = 1
        ) AS student_count
      FROM sections s
      LEFT JOIN teachers t ON s.class_teacher_id = t.id
      LEFT JOIN courses c ON s.course_id = c.id
      LEFT JOIN academic_years ay ON s.academic_year_id = ay.id
      WHERE s.id = ?
    `).bind(id).first<SectionWithDetails>();
  }

  async findDuplicateSection(
    institutionId: string, 
    courseId: string, 
    academicYearId: string, 
    yearNumber: number, 
    name: string, 
    excludeId?: string
  ): Promise<Section | null> {
    let query = `
      SELECT * FROM sections 
      WHERE institution_id = ? 
        AND course_id = ? 
        AND academic_year_id = ? 
        AND year_number = ? 
        AND UPPER(TRIM(name)) = UPPER(TRIM(?)) 
        AND is_active = 1
    `;
    const params: any[] = [institutionId, courseId, academicYearId, yearNumber, name];
    if (excludeId) {
      query += ' AND id != ?';
      params.push(excludeId);
    }
    return await this.db.prepare(query).bind(...params).first<Section>();
  }

  async listByInstitution(
    institutionId: string, 
    filters?: SectionFilterOptions
  ): Promise<SectionWithDetails[]> {
    let query = `
      SELECT 
        s.*,
        (t.first_name || ' ' || t.last_name) AS class_teacher_name,
        c.name AS course_name,
        ay.name AS academic_year_name,
        (
          SELECT COUNT(*) 
          FROM student_enrollments se 
          JOIN students st ON se.student_id = st.id 
          WHERE se.section_id = s.id AND se.is_active = 1 AND st.is_active = 1
        ) AS student_count
      FROM sections s
      LEFT JOIN teachers t ON s.class_teacher_id = t.id
      LEFT JOIN courses c ON s.course_id = c.id
      LEFT JOIN academic_years ay ON s.academic_year_id = ay.id
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

    if (filters?.academic_year_id) {
      query += ' AND s.academic_year_id = ?';
      params.push(filters.academic_year_id);
    }
    if (filters?.course_id) {
      query += ' AND s.course_id = ?';
      params.push(filters.course_id);
    }
    if (filters?.year_number !== undefined && filters.year_number !== '') {
      query += ' AND s.year_number = ?';
      params.push(Number(filters.year_number));
    }
    if (filters?.search) {
      query += ' AND (s.name LIKE ? OR s.room LIKE ? OR c.name LIKE ? OR (t.first_name || " " || t.last_name) LIKE ?)';
      const term = `%${filters.search}%`;
      params.push(term, term, term, term);
    }

    query += ' ORDER BY s.is_active DESC, c.name ASC, s.year_number ASC, s.name ASC';

    const { results } = await this.db.prepare(query).bind(...params).all<SectionWithDetails>();
    return results || [];
  }

  async update(id: string, input: UpdateSectionInput, userId?: string): Promise<void> {
    const fields = getUpdateFields(input, UPDATE_FIELDS);
    if (fields.length === 0) return;

    const sets = fields.map(field => `${field} = ?`).join(', ');
    const values = [...fields.map(field => input[field] === undefined ? null : input[field]), userId || null, id];

    await this.db.prepare(`
      UPDATE sections 
      SET ${sets}, updated_at = datetime('now'), updated_by = ?
      WHERE id = ?
    `).bind(...values).run();
  }

  async softDelete(id: string, userId?: string): Promise<void> {
    await this.db.prepare(`
      UPDATE sections 
      SET is_active = 0, deleted_at = datetime('now'), updated_by = ? 
      WHERE id = ?
    `).bind(userId || null, id).run();
  }

  async hardDelete(id: string): Promise<void> {
    await this.db.prepare('DELETE FROM sections WHERE id = ?').bind(id).run();
  }

  async restore(id: string, userId?: string): Promise<void> {
    await this.db.prepare(`
      UPDATE sections 
      SET is_active = 1, deleted_at = NULL, updated_by = ? 
      WHERE id = ?
    `).bind(userId || null, id).run();
  }

  async getDependencyCounts(id: string): Promise<SectionDependencyCounts> {
    // 1. Students enrolled
    const stRow = await this.db.prepare(
      'SELECT COUNT(*) as count FROM student_enrollments WHERE section_id = ? AND is_active = 1'
    ).bind(id).first<{ count: number }>();
    const students = stRow?.count || 0;

    // 2. Timetables
    const ttRow = await this.db.prepare(
      'SELECT COUNT(*) as count FROM weekly_timetable WHERE section_id = ? AND is_active = 1'
    ).bind(id).first<{ count: number }>();
    const timetables = ttRow?.count || 0;

    // 3. Attendance sessions
    const attRow = await this.db.prepare(
      'SELECT COUNT(*) as count FROM attendance_sessions WHERE section_id = ? AND is_active = 1'
    ).bind(id).first<{ count: number }>();
    const attendance = attRow?.count || 0;

    // 4. Teacher assignments
    const taRow = await this.db.prepare(
      'SELECT COUNT(*) as count FROM teacher_subject_assignments WHERE section_id = ? AND is_active = 1'
    ).bind(id).first<{ count: number }>();
    const taCount = taRow?.count || 0;

    const allocRow = await this.db.prepare(
      'SELECT COUNT(*) as count FROM teaching_allocations WHERE section_id = ? AND LOWER(status) = "active"'
    ).bind(id).first<{ count: number }>();
    const allocCount = allocRow?.count || 0;

    const teacher_assignments = taCount + allocCount;
    const total = students + timetables + attendance + teacher_assignments;

    return {
      students,
      timetables,
      attendance,
      teacher_assignments,
      total
    };
  }
}
