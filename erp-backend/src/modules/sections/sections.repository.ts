import { Section, SectionWithDetails, CreateSectionInput, UpdateSectionInput } from './sections.types';
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

  async listByInstitution(
    institutionId: string, 
    filters?: { academic_year_id?: string; course_id?: string; is_active?: string; search?: string }
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

    if (filters?.is_active !== undefined && filters.is_active !== '') {
      query += ' AND s.is_active = ?';
      params.push(filters.is_active === '0' ? 0 : 1);
    } else {
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
    if (filters?.search) {
      query += ' AND (s.name LIKE ? OR s.room LIKE ?)';
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    query += ' ORDER BY c.name ASC, s.name ASC';

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
}
