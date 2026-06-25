import { Department, CreateDepartmentInput, UpdateDepartmentInput } from './departments.types';
import { getUpdateFields } from '../../utils/repository';

const UPDATE_FIELDS = ['name', 'code', 'description', 'head_teacher_id', 'is_active'] as const;

export class DepartmentRepository {
  constructor(private db: D1Database) {}

  async create(id: string, institutionId: string, input: CreateDepartmentInput, userId?: string): Promise<void> {
    await this.db.prepare(`
      INSERT INTO departments (
        id, institution_id, name, code, description, head_teacher_id, created_by, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      institutionId,
      input.name,
      input.code,
      input.description || null,
      input.head_teacher_id || null,
      userId || null,
      userId || null
    ).run();
  }

  async findById(id: string): Promise<Department | null> {
    return await this.db.prepare(`
      SELECT d.*, 
        (t.first_name || ' ' || COALESCE(t.middle_name || ' ', '') || t.last_name) AS head_teacher_name,
        (SELECT COUNT(*) FROM teachers t2 WHERE t2.department = d.name AND t2.is_active = 1) AS teachers_count,
        (SELECT COUNT(*) FROM subjects s JOIN courses c ON s.course_id = c.id WHERE c.department_id = d.id AND s.is_active = 1) AS subjects_count
      FROM departments d
      LEFT JOIN teachers t ON d.head_teacher_id = t.id
      WHERE d.id = ?
    `).bind(id).first<Department>();
  }

  async findByCode(institutionId: string, code: string): Promise<Department | null> {
    return await this.db.prepare('SELECT * FROM departments WHERE institution_id = ? AND code = ? AND is_active = 1').bind(institutionId, code).first<Department>();
  }

  async listByInstitution(institutionId: string, includeArchived = false): Promise<Department[]> {
    const activeFilter = includeArchived ? 1 : 0;
    const { results } = await this.db.prepare(`
      SELECT d.*, 
        (t.first_name || ' ' || COALESCE(t.middle_name || ' ', '') || t.last_name) AS head_teacher_name,
        (SELECT COUNT(*) FROM teachers t2 WHERE t2.department = d.name AND t2.is_active = 1) AS teachers_count,
        (SELECT COUNT(*) FROM subjects s JOIN courses c ON s.course_id = c.id WHERE c.department_id = d.id AND s.is_active = 1) AS subjects_count
      FROM departments d
      LEFT JOIN teachers t ON d.head_teacher_id = t.id
      WHERE d.institution_id = ? AND (d.is_active = 1 OR ? = 1)
      ORDER BY d.name ASC
    `).bind(institutionId, activeFilter).all<Department>();
    return results || [];
  }

  async update(id: string, input: UpdateDepartmentInput, userId?: string): Promise<void> {
    const fields = getUpdateFields(input, UPDATE_FIELDS);
    if (fields.length === 0) return;

    const sets = fields.map(field => `${field} = ?`).join(', ');
    const values = [...fields.map(field => input[field]), userId || null, id];

    await this.db.prepare(`
      UPDATE departments 
      SET ${sets}, updated_at = datetime('now'), updated_by = ?
      WHERE id = ?
    `).bind(...values).run();
  }

  async softDelete(id: string, userId?: string): Promise<void> {
    await this.db.prepare(`
      UPDATE departments 
      SET is_active = 0, deleted_at = datetime('now'), updated_by = ? 
      WHERE id = ?
    `).bind(userId || null, id).run();
  }

  async restore(id: string, userId?: string): Promise<void> {
    await this.db.prepare(`
      UPDATE departments 
      SET is_active = 1, deleted_at = NULL, updated_by = ? 
      WHERE id = ?
    `).bind(userId || null, id).run();
  }

  async hasLinkedActiveEntities(id: string): Promise<{ courses: number; teachers: number }> {
    const dept = await this.findById(id);
    if (!dept) return { courses: 0, teachers: 0 };
    
    const coursesRow = await this.db.prepare(`
      SELECT COUNT(*) as count FROM courses WHERE department_id = ? AND is_active = 1
    `).bind(id).first<{ count: number }>();

    const teachersRow = await this.db.prepare(`
      SELECT COUNT(*) as count FROM teachers WHERE department = ? AND is_active = 1
    `).bind(dept.name).first<{ count: number }>();

    return {
      courses: coursesRow?.count || 0,
      teachers: teachersRow?.count || 0
    };
  }
}
