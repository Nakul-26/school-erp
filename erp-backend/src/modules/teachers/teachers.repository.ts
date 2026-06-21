import { Teacher, CreateTeacherInput, UpdateTeacherInput } from './teachers.types';
import { getUpdateFields } from '../../utils/repository';

const UPDATE_FIELDS = [
  'user_id', 'employee_id', 'first_name', 'last_name', 'email', 'phone',
  'joining_date', 'designation', 'department', 'status',
] as const;

export class TeacherRepository {
  constructor(private db: D1Database) {}

  async create(id: string, institutionId: string, input: CreateTeacherInput, userId?: string): Promise<void> {
    await this.db.prepare(`
      INSERT INTO teachers (
        id, institution_id, user_id, employee_id, first_name, last_name, 
        email, phone, joining_date, designation, department, status, 
        created_by, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, institutionId, input.user_id || null, input.employee_id, input.first_name, input.last_name,
      input.email || null, input.phone || null, input.joining_date || null, input.designation || null, 
      input.department || null, input.status, userId || null, userId || null
    ).run();
  }

  async findById(id: string): Promise<Teacher | null> {
    return await this.db.prepare('SELECT * FROM teachers WHERE id = ? AND is_active = 1').bind(id).first<Teacher>();
  }

  async listByInstitution(institutionId: string): Promise<Teacher[]> {
    const { results } = await this.db.prepare('SELECT * FROM teachers WHERE institution_id = ? AND is_active = 1').bind(institutionId).all<Teacher>();
    return results || [];
  }

  async update(id: string, input: UpdateTeacherInput, userId?: string): Promise<void> {
    const fields = getUpdateFields(input, UPDATE_FIELDS);
    if (fields.length === 0) return;

    const sets = fields.map(field => `${field} = ?`).join(', ');
    const values = [...fields.map(f => input[f as keyof UpdateTeacherInput]), userId || null, id];

    await this.db.prepare(`
      UPDATE teachers 
      SET ${sets}, updated_at = datetime('now'), updated_by = ?
      WHERE id = ? AND is_active = 1
    `).bind(...values).run();
  }

  async softDelete(id: string, userId?: string): Promise<void> {
    await this.db.prepare(`
      UPDATE teachers 
      SET is_active = 0, deleted_at = datetime('now'), updated_by = ? 
      WHERE id = ?
    `).bind(userId || null, id).run();
  }

  async getTeacherWorkloadReport(institutionId: string): Promise<any[]> {
    const { results } = await this.db.prepare(`
      SELECT 
        t.id AS teacher_id,
        t.first_name,
        t.last_name,
        t.employee_id,
        t.designation,
        t.department,
        (
          SELECT COUNT(DISTINCT a.subject_id) 
          FROM teacher_subject_assignments a 
          WHERE a.teacher_id = t.id AND a.is_active = 1
        ) AS subjects_count,
        (
          SELECT COUNT(DISTINCT a.section_id) 
          FROM teacher_subject_assignments a 
          WHERE a.teacher_id = t.id AND a.is_active = 1
        ) AS sections_count,
        (
          SELECT COUNT(*) 
          FROM attendance_sessions s 
          WHERE s.teacher_id = t.id AND s.is_active = 1
        ) AS classes_conducted,
        (
          SELECT COUNT(*) 
          FROM teacher_attendance ta 
          WHERE ta.teacher_id = t.id AND ta.is_active = 1
        ) AS total_attendance_days,
        (
          SELECT COUNT(*) 
          FROM teacher_attendance ta 
          WHERE ta.teacher_id = t.id AND ta.status = 'present' AND ta.is_active = 1
        ) AS present_days,
        (
          SELECT COUNT(*) 
          FROM teacher_attendance ta 
          WHERE ta.teacher_id = t.id AND ta.status = 'half_day' AND ta.is_active = 1
        ) AS half_day_days,
        (
          SELECT COUNT(*) 
          FROM teacher_attendance ta 
          WHERE ta.teacher_id = t.id AND ta.status = 'on_leave' AND ta.is_active = 1
        ) AS on_leave_days,
        (
          SELECT COUNT(*) 
          FROM teacher_attendance ta 
          WHERE ta.teacher_id = t.id AND ta.status = 'absent' AND ta.is_active = 1
        ) AS absent_days
      FROM teachers t
      WHERE t.institution_id = ? AND t.is_active = 1
      ORDER BY t.first_name ASC, t.last_name ASC
    `).bind(institutionId).all<any>();
    return results || [];
  }
}
