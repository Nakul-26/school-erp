import {
  LeaveType,
  LeaveBalance,
  LeaveApplication,
  CreateLeaveTypeInput,
  CreateLeaveApplicationInput,
} from './leave.types';

export class LeaveRepository {
  constructor(private db: D1Database) {}

  // --- LEAVE TYPES ---

  async createLeaveType(id: string, institutionId: string, input: CreateLeaveTypeInput, userId?: string): Promise<void> {
    await this.db.prepare(`
      INSERT INTO leave_types (id, institution_id, name, code, days_per_year)
      VALUES (?, ?, ?, ?, ?)
    `).bind(id, institutionId, input.name, input.code.toUpperCase(), input.days_per_year).run();
  }

  async listLeaveTypes(institutionId: string): Promise<any[]> {
    const { results } = await this.db.prepare(`
      SELECT * FROM leave_types
      WHERE institution_id = ? AND is_active = 1
      ORDER BY name ASC
    `).bind(institutionId).all<any>();
    return results || [];
  }

  async getLeaveTypeById(id: string): Promise<LeaveType | null> {
    return await this.db.prepare(
      'SELECT * FROM leave_types WHERE id = ? AND is_active = 1'
    ).bind(id).first<LeaveType>();
  }

  async updateLeaveType(id: string, name: string, daysPerYear: number, userId?: string): Promise<void> {
    await this.db.prepare(`
      UPDATE leave_types
      SET name = ?, days_per_year = ?, updated_at = datetime('now')
      WHERE id = ?
    `).bind(name, daysPerYear, id).run();
  }

  async softDeleteLeaveType(id: string, userId?: string): Promise<void> {
    await this.db.prepare(`
      UPDATE leave_types
      SET is_active = 0, updated_at = datetime('now')
      WHERE id = ?
    `).bind(id).run();
  }

  // --- LEAVE BALANCES ---

  async seedBalancesForYear(institutionId: string, academicYearId: string, userId?: string): Promise<void> {
    // Fetch all active teachers for this institution
    const { results: teachers } = await this.db.prepare(`
      SELECT id FROM teachers WHERE institution_id = ? AND is_active = 1
    `).bind(institutionId).all<{ id: string }>();

    // Fetch all active leave types for this institution
    const { results: leaveTypes } = await this.db.prepare(`
      SELECT id, days_per_year FROM leave_types WHERE institution_id = ? AND is_active = 1
    `).bind(institutionId).all<{ id: string; days_per_year: number }>();

    if (!teachers || !leaveTypes) return;

    // For each teacher x leave type combination, INSERT OR IGNORE into leave_balances
    for (const teacher of teachers) {
      for (const lt of leaveTypes) {
        const id = crypto.randomUUID();
        await this.db.prepare(`
          INSERT OR IGNORE INTO leave_balances
            (id, institution_id, teacher_id, leave_type_id, academic_year_id, total_days, used_days)
          VALUES (?, ?, ?, ?, ?, ?, 0)
        `).bind(id, institutionId, teacher.id, lt.id, academicYearId, lt.days_per_year).run();
      }
    }
  }

  async getBalancesForTeacher(teacherId: string, academicYearId: string): Promise<any[]> {
    const { results } = await this.db.prepare(`
      SELECT lb.*, lt.name AS leave_type_name, lt.code AS leave_type_code
      FROM leave_balances lb
      JOIN leave_types lt ON lb.leave_type_id = lt.id
      WHERE lb.teacher_id = ? AND lb.academic_year_id = ? AND lb.is_active = 1
      ORDER BY lt.name ASC
    `).bind(teacherId, academicYearId).all<any>();
    return results || [];
  }

  async getAllBalancesForYear(institutionId: string, academicYearId: string): Promise<any[]> {
    const { results } = await this.db.prepare(`
      SELECT lb.*,
             t.first_name AS teacher_first_name, t.last_name AS teacher_last_name, t.employee_id,
             lt.name AS leave_type_name, lt.code AS leave_type_code
      FROM leave_balances lb
      JOIN teachers t ON lb.teacher_id = t.id
      JOIN leave_types lt ON lb.leave_type_id = lt.id
      WHERE lb.institution_id = ? AND lb.academic_year_id = ? AND lb.is_active = 1
      ORDER BY t.first_name ASC, t.last_name ASC, lt.name ASC
    `).bind(institutionId, academicYearId).all<any>();
    return results || [];
  }

  // --- LEAVE APPLICATIONS ---

  async createApplication(id: string, institutionId: string, input: CreateLeaveApplicationInput, userId?: string): Promise<void> {
    await this.db.prepare(`
      INSERT INTO leave_applications
        (id, institution_id, teacher_id, leave_type_id, academic_year_id, from_date, to_date, days_count, reason, status, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', ?)
    `).bind(
      id, institutionId, input.teacher_id, input.leave_type_id, input.academic_year_id,
      input.from_date, input.to_date, input.days_count, input.reason, userId || null
    ).run();
  }

  async getApplicationById(id: string): Promise<any | null> {
    return await this.db.prepare(`
      SELECT la.*,
             t.first_name AS teacher_first_name, t.last_name AS teacher_last_name, t.employee_id,
             lt.name AS leave_type_name, lt.code AS leave_type_code
      FROM leave_applications la
      JOIN teachers t ON la.teacher_id = t.id
      JOIN leave_types lt ON la.leave_type_id = lt.id
      WHERE la.id = ? AND la.is_active = 1
    `).bind(id).first<any>();
  }

  async listApplications(institutionId: string, status?: string, teacherId?: string): Promise<any[]> {
    let query = `
      SELECT la.*,
             t.first_name AS teacher_first_name, t.last_name AS teacher_last_name, t.employee_id,
             lt.name AS leave_type_name, lt.code AS leave_type_code
      FROM leave_applications la
      JOIN teachers t ON la.teacher_id = t.id
      JOIN leave_types lt ON la.leave_type_id = lt.id
      WHERE la.institution_id = ? AND la.is_active = 1
    `;
    const params: any[] = [institutionId];

    if (status) {
      query += ` AND la.status = ?`;
      params.push(status);
    }

    if (teacherId) {
      query += ` AND la.teacher_id = ?`;
      params.push(teacherId);
    }

    query += ` ORDER BY la.created_at DESC`;

    const { results } = await this.db.prepare(query).bind(...params).all<any>();
    return results || [];
  }

  async listMyApplications(teacherId: string): Promise<any[]> {
    const { results } = await this.db.prepare(`
      SELECT la.*, lt.name AS leave_type_name, lt.code AS leave_type_code
      FROM leave_applications la
      JOIN leave_types lt ON la.leave_type_id = lt.id
      WHERE la.teacher_id = ? AND la.is_active = 1
      ORDER BY la.created_at DESC
    `).bind(teacherId).all<any>();
    return results || [];
  }

  async approveApplication(id: string, approverId: string, remarks?: string): Promise<void> {
    await this.db.prepare(`
      UPDATE leave_applications
      SET status = 'Approved', approved_by = ?, approved_at = datetime('now'), remarks = ?, updated_at = datetime('now')
      WHERE id = ?
    `).bind(approverId, remarks || null, id).run();
  }

  async rejectApplication(id: string, approverId: string, remarks: string): Promise<void> {
    await this.db.prepare(`
      UPDATE leave_applications
      SET status = 'Rejected', approved_by = ?, approved_at = datetime('now'), remarks = ?, updated_at = datetime('now')
      WHERE id = ?
    `).bind(approverId, remarks, id).run();
  }

  async deductLeaveBalance(teacherId: string, leaveTypeId: string, academicYearId: string, days: number): Promise<void> {
    await this.db.prepare(`
      UPDATE leave_balances
      SET used_days = used_days + ?, updated_at = datetime('now')
      WHERE teacher_id = ? AND leave_type_id = ? AND academic_year_id = ?
    `).bind(days, teacherId, leaveTypeId, academicYearId).run();
  }
}
