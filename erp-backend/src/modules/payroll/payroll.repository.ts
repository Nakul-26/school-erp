import { SalaryStructure, CreateSalaryStructureInput, PayrollRun, Payslip } from './payroll.types';

export class PayrollRepository {
  constructor(private db: D1Database) {}

  // --- SALARY STRUCTURES ---
  async getSalaryStructure(teacherId: string): Promise<SalaryStructure | null> {
    return await this.db.prepare('SELECT * FROM salary_structures WHERE teacher_id = ? AND is_active = 1').bind(teacherId).first<SalaryStructure>();
  }

  async listSalaryStructures(institutionId: string): Promise<any[]> {
    const { results } = await this.db.prepare(`
      SELECT ss.*, t.first_name, t.last_name, t.employee_id, t.designation
      FROM salary_structures ss
      JOIN teachers t ON ss.teacher_id = t.id
      WHERE ss.institution_id = ? AND ss.is_active = 1
    `).bind(institutionId).all<any>();
    return results || [];
  }

  async createOrUpdateSalaryStructure(id: string, institutionId: string, input: CreateSalaryStructureInput, userId?: string): Promise<void> {
    await this.db.prepare(`
      INSERT INTO salary_structures (
        id, institution_id, teacher_id, basic_salary, da, hra, other_allowances,
        pf_deduction, tds_deduction, other_deductions, effective_from, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(teacher_id) DO UPDATE SET
        basic_salary = excluded.basic_salary,
        da = excluded.da,
        hra = excluded.hra,
        other_allowances = excluded.other_allowances,
        pf_deduction = excluded.pf_deduction,
        tds_deduction = excluded.tds_deduction,
        other_deductions = excluded.other_deductions,
        effective_from = excluded.effective_from
    `).bind(
      id, institutionId, input.teacher_id, input.basic_salary, input.da, input.hra, input.other_allowances,
      input.pf_deduction, input.tds_deduction, input.other_deductions, input.effective_from, userId || null
    ).run();
  }
  async deleteSalaryStructure(teacherId: string): Promise<void> {
    await this.db.prepare('UPDATE salary_structures SET is_active = 0 WHERE teacher_id = ?').bind(teacherId).run();
  }

  // --- PAYROLL RUNS ---
  async getPayrollRun(institutionId: string, month: number, year: number): Promise<PayrollRun | null> {
    return await this.db.prepare('SELECT * FROM payroll_runs WHERE institution_id = ? AND month = ? AND year = ?')
      .bind(institutionId, month, year).first<PayrollRun>();
  }

  async getPayrollRunById(id: string): Promise<PayrollRun | null> {
    return await this.db.prepare('SELECT * FROM payroll_runs WHERE id = ? AND is_active = 1').bind(id).first<PayrollRun>();
  }

  async createPayrollRun(id: string, institutionId: string, month: number, year: number, userId?: string): Promise<void> {
    await this.db.prepare(`
      INSERT INTO payroll_runs (id, institution_id, month, year, status, generated_by)
      VALUES (?, ?, ?, ?, 'Draft', ?)
    `).bind(id, institutionId, month, year, userId || null).run();
  }

  async updatePayrollRunTotals(id: string, gross: number, net: number): Promise<void> {
    await this.db.prepare(`
      UPDATE payroll_runs
      SET total_gross = ?, total_net = ?
      WHERE id = ?
    `).bind(gross, net, id).run();
  }

  async listPayrollRuns(institutionId: string): Promise<PayrollRun[]> {
    const { results } = await this.db.prepare('SELECT * FROM payroll_runs WHERE institution_id = ? AND is_active = 1 ORDER BY year DESC, month DESC')
      .bind(institutionId).all<PayrollRun>();
    return results || [];
  }

  async finalizePayrollRun(id: string, userId?: string): Promise<void> {
    await this.db.prepare(`
      UPDATE payroll_runs
      SET status = 'Finalized', finalized_at = datetime('now')
      WHERE id = ?
    `).bind(id).run();
  }

  async deletePayrollRun(id: string): Promise<void> {
    // Soft-delete the run and all its payslips
    await this.db.prepare('UPDATE payslips SET is_active = 0 WHERE payroll_run_id = ?').bind(id).run();
    await this.db.prepare('UPDATE payroll_runs SET is_active = 0 WHERE id = ?').bind(id).run();
  }

  async reactivatePayrollRun(id: string, userId?: string): Promise<void> {
    await this.db.prepare(`
      UPDATE payroll_runs
      SET is_active = 1, status = 'Draft', total_gross = 0, total_net = 0, generated_by = ?
      WHERE id = ?
    `).bind(userId || null, id).run();
  }

  // --- PAYSLIPS ---
  async deletePayslipsForRun(runId: string): Promise<void> {
    await this.db.prepare('DELETE FROM payslips WHERE payroll_run_id = ?').bind(runId).run();
  }

  async createPayslip(id: string, institutionId: string, p: Omit<Payslip, 'id' | 'institution_id' | 'is_active' | 'created_at'>): Promise<void> {
    await this.db.prepare(`
      INSERT INTO payslips (
        id, institution_id, payroll_run_id, teacher_id, month, year, working_days, present_days, leave_days, lop_days,
        basic_salary, da, hra, other_allowances, gross_salary, pf_deduction, tds_deduction, lop_deduction, other_deductions, net_salary
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, institutionId, p.payroll_run_id, p.teacher_id, p.month, p.year, p.working_days, p.present_days, p.leave_days, p.lop_days,
      p.basic_salary, p.da, p.hra, p.other_allowances, p.gross_salary, p.pf_deduction, p.tds_deduction, p.lop_deduction, p.other_deductions, p.net_salary
    ).run();
  }

  async getPayslipById(id: string): Promise<Payslip | null> {
    return await this.db.prepare(`
      SELECT p.*, t.first_name, t.last_name, t.employee_id, t.designation
      FROM payslips p
      JOIN teachers t ON p.teacher_id = t.id
      WHERE p.id = ? AND p.is_active = 1
    `).bind(id).first<Payslip>();
  }

  async listPayslipsForRun(runId: string): Promise<Payslip[]> {
    const { results } = await this.db.prepare(`
      SELECT p.*, t.first_name, t.last_name, t.employee_id, t.designation
      FROM payslips p
      JOIN teachers t ON p.teacher_id = t.id
      WHERE p.payroll_run_id = ? AND p.is_active = 1
      ORDER BY t.first_name ASC
    `).bind(runId).all<Payslip>();
    return results || [];
  }

  async getPayslipsForTeacher(teacherId: string): Promise<Payslip[]> {
    const { results } = await this.db.prepare(`
      SELECT p.*, t.first_name, t.last_name, t.employee_id, t.designation
      FROM payslips p
      JOIN teachers t ON p.teacher_id = t.id
      WHERE p.teacher_id = ? AND p.is_active = 1
      ORDER BY p.year DESC, p.month DESC
    `).bind(teacherId).all<Payslip>();
    return results || [];
  }

  // --- ATTENDANCE & LEAVE DATA FOR CALCULATION ---
  async getTeacherAttendanceStats(teacherId: string, month: number, year: number): Promise<{ present: number; absent: number; leave: number; half_day: number }> {
    const monthStr = month.toString().padStart(2, '0');
    const datePattern = `${year}-${monthStr}-%`;
    const { results } = await this.db.prepare(`
      SELECT status, COUNT(*) as count
      FROM teacher_attendance
      WHERE teacher_id = ? AND date LIKE ? AND is_active = 1
      GROUP BY status
    `).bind(teacherId, datePattern).all<any>();

    const stats = { present: 0, absent: 0, leave: 0, half_day: 0 };
    results.forEach((row: any) => {
      if (row.status === 'present') stats.present = row.count;
      else if (row.status === 'absent') stats.absent = row.count;
      else if (row.status === 'on_leave') stats.leave = row.count;
      else if (row.status === 'half_day') stats.half_day = row.count;
    });

    return stats;
  }

  async getTeachersWithStructures(institutionId: string): Promise<any[]> {
    const { results } = await this.db.prepare(`
      SELECT t.id, t.first_name, t.last_name, t.employee_id, ss.id as structure_id
      FROM teachers t
      JOIN salary_structures ss ON t.id = ss.teacher_id
      WHERE t.institution_id = ? AND t.is_active = 1 AND ss.is_active = 1
    `).bind(institutionId).all<any>();
    return results || [];
  }
}
