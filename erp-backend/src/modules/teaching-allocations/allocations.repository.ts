import { TeachingAllocation, CreateAllocationInput, UpdateAllocationInput } from './allocations.types';
import { getUpdateFields } from '../../utils/repository';

const UPDATE_FIELDS = [
  'classes_per_week', 'theory_hours', 'practical_hours', 'tutorial_hours',
  'mentoring_hours', 'admin_hours', 'primary_teacher', 'status',
  'start_date', 'end_date', 'remarks'
] as const;

export class TeachingAllocationRepository {
  constructor(private db: D1Database) {}

  async create(id: string, institutionId: string, input: CreateAllocationInput, userId?: string): Promise<void> {
    await this.db.prepare(`
      INSERT INTO teaching_allocations (
        id, institution_id, academic_year_id, department_id, program_id, semester, year_number,
        section_id, subject_id, teacher_id, classes_per_week, theory_hours, practical_hours,
        tutorial_hours, mentoring_hours, admin_hours, primary_teacher, status, start_date, end_date,
        remarks, created_by, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      institutionId,
      input.academic_year_id,
      input.department_id,
      input.program_id,
      input.semester,
      input.year_number,
      input.section_id,
      input.subject_id,
      input.teacher_id,
      input.classes_per_week ?? 4,
      input.theory_hours ?? 0.0,
      input.practical_hours ?? 0.0,
      input.tutorial_hours ?? 0.0,
      input.mentoring_hours ?? 0.0,
      input.admin_hours ?? 0.0,
      input.primary_teacher ?? 1,
      input.status || 'Active',
      input.start_date || null,
      input.end_date || null,
      input.remarks || null,
      userId || null,
      userId || null
    ).run();
  }

  async findById(id: string, institutionId: string): Promise<any | null> {
    return await this.db.prepare(`
      SELECT 
        a.*,
      (t.first_name || ' ' || t.last_name) as teacher_name,
        t.employee_id as teacher_employee_id,
        s.name as section_name,
        sub.subject_name,
        sub.subject_code,
        y.name as academic_year_name,
        d.name as department_name,
        c.name as program_name
      FROM teaching_allocations a
      JOIN teachers t ON t.id = a.teacher_id
      JOIN sections s ON s.id = a.section_id
      JOIN subjects sub ON sub.id = a.subject_id
      JOIN academic_years y ON y.id = a.academic_year_id
      JOIN departments d ON d.id = a.department_id
      JOIN courses c ON c.id = a.program_id
      WHERE a.id = ? AND a.institution_id = ? AND a.is_active = 1
    `).bind(id, institutionId).first();
  }

  async list(institutionId: string, filters: {
    academic_year_id?: string;
    department_id?: string;
    program_id?: string;
    teacher_id?: string;
    section_id?: string;
    subject_id?: string;
  }): Promise<any[]> {
    let query = `
      SELECT 
        a.*,
        (t.first_name || ' ' || t.last_name) as teacher_name,
        t.employee_id as teacher_employee_id,
        s.name as section_name,
        sub.subject_name,
        sub.subject_code,
        y.name as academic_year_name,
        d.name as department_name,
        c.name as program_name
      FROM teaching_allocations a
      JOIN teachers t ON t.id = a.teacher_id
      JOIN sections s ON s.id = a.section_id
      JOIN subjects sub ON sub.id = a.subject_id
      JOIN academic_years y ON y.id = a.academic_year_id
      JOIN departments d ON d.id = a.department_id
      JOIN courses c ON c.id = a.program_id
      WHERE a.institution_id = ? AND a.is_active = 1
    `;
    const params: any[] = [institutionId];

    if (filters.academic_year_id) {
      query += ' AND a.academic_year_id = ?';
      params.push(filters.academic_year_id);
    }
    if (filters.department_id) {
      query += ' AND a.department_id = ?';
      params.push(filters.department_id);
    }
    if (filters.program_id) {
      query += ' AND a.program_id = ?';
      params.push(filters.program_id);
    }
    if (filters.teacher_id) {
      query += ' AND a.teacher_id = ?';
      params.push(filters.teacher_id);
    }
    if (filters.section_id) {
      query += ' AND a.section_id = ?';
      params.push(filters.section_id);
    }
    if (filters.subject_id) {
      query += ' AND a.subject_id = ?';
      params.push(filters.subject_id);
    }

    query += ' ORDER BY a.created_at DESC';

    const { results } = await this.db.prepare(query).bind(...params).all<any>();
    return results || [];
  }

  async update(id: string, institutionId: string, input: UpdateAllocationInput, userId?: string): Promise<void> {
    const fields = getUpdateFields(input, UPDATE_FIELDS);
    if (fields.length === 0) return;

    const sets = fields.map(field => `${field} = ?`).join(', ');
    const values = [...fields.map(field => input[field]), userId || null, id, institutionId];

    await this.db.prepare(`
      UPDATE teaching_allocations 
      SET ${sets}, updated_at = datetime('now'), updated_by = ?
      WHERE id = ? AND institution_id = ? AND is_active = 1
    `).bind(...values).run();
  }

  async softDelete(id: string, institutionId: string, userId?: string): Promise<void> {
    await this.db.prepare(`
      UPDATE teaching_allocations 
      SET is_active = 0, updated_at = datetime('now'), updated_by = ? 
      WHERE id = ? AND institution_id = ?
    `).bind(userId || null, id, institutionId).run();
  }

  async checkDuplicateAllocation(
    teacherId: string,
    subjectId: string,
    sectionId: string,
    academicYearId: string,
    ignoreId?: string
  ): Promise<boolean> {
    let query = `
      SELECT 1 FROM teaching_allocations 
      WHERE teacher_id = ? AND subject_id = ? AND section_id = ? AND academic_year_id = ? AND is_active = 1
    `;
    const params = [teacherId, subjectId, sectionId, academicYearId];

    if (ignoreId) {
      query += ' AND id != ?';
      params.push(ignoreId);
    }

    const res = await this.db.prepare(query).bind(...params).first();
    return Boolean(res);
  }

  async calculateTeacherLoad(teacherId: string, academicYearId: string): Promise<{
    total_allocations: number;
    classes_per_week: number;
    theory_hours: number;
    practical_hours: number;
    tutorial_hours: number;
    mentoring_hours: number;
    admin_hours: number;
    total_hours: number;
  }> {
    const res = await this.db.prepare(`
      SELECT 
        COUNT(id) as total_allocations,
        SUM(classes_per_week) as classes_per_week,
        SUM(theory_hours) as theory_hours,
        SUM(practical_hours) as practical_hours,
        SUM(tutorial_hours) as tutorial_hours,
        SUM(mentoring_hours) as mentoring_hours,
        SUM(admin_hours) as admin_hours
      FROM teaching_allocations
      WHERE teacher_id = ? AND academic_year_id = ? AND is_active = 1 AND status = 'Active'
    `).bind(teacherId, academicYearId).first<any>();

    const total_allocations = res?.total_allocations || 0;
    const classes_per_week = res?.classes_per_week || 0;
    const theory_hours = res?.theory_hours || 0;
    const practical_hours = res?.practical_hours || 0;
    const tutorial_hours = res?.tutorial_hours || 0;
    const mentoring_hours = res?.mentoring_hours || 0;
    const admin_hours = res?.admin_hours || 0;

    const total_hours = theory_hours + practical_hours + tutorial_hours + mentoring_hours + admin_hours;

    return {
      total_allocations,
      classes_per_week,
      theory_hours,
      practical_hours,
      tutorial_hours,
      mentoring_hours,
      admin_hours,
      total_hours
    };
  }

  async validateTeacherStatus(teacherId: string, institutionId: string): Promise<boolean> {
    const res = await this.db.prepare(
      'SELECT 1 FROM teachers WHERE id = ? AND institution_id = ? AND is_active = 1 AND status = "Active"'
    ).bind(teacherId, institutionId).first();
    return Boolean(res);
  }
}
