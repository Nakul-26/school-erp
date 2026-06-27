import { PayrollRepository } from './payroll.repository';
import { CreateSalaryStructureInput, Payslip } from './payroll.types';

export class PayrollService {
  constructor(private repo: PayrollRepository) {}

  async listSalaryStructures(institutionId: string): Promise<any[]> {
    return await this.repo.listSalaryStructures(institutionId);
  }

  async saveSalaryStructure(institutionId: string, input: CreateSalaryStructureInput, userId?: string): Promise<string> {
    const existing = await this.repo.getSalaryStructure(input.teacher_id);
    const id = existing ? existing.id : crypto.randomUUID();
    await this.repo.createOrUpdateSalaryStructure(id, institutionId, input, userId);
    return id;
  }

  async getSalaryStructure(teacherId: string): Promise<any> {
    return await this.repo.getSalaryStructure(teacherId);
  }

  async listRuns(institutionId: string): Promise<any[]> {
    return await this.repo.listPayrollRuns(institutionId);
  }

  async getRunDetail(runId: string): Promise<any> {
    const run = await this.repo.getPayrollRunById(runId);
    if (!run) throw new Error('Payroll run not found');
    const payslips = await this.repo.listPayslipsForRun(runId);
    return { run, payslips };
  }

  async finalizeRun(runId: string, userId?: string): Promise<void> {
    await this.repo.finalizePayrollRun(runId, userId);
  }

  async getTeacherPayslips(teacherId: string): Promise<Payslip[]> {
    return await this.repo.getPayslipsForTeacher(teacherId);
  }

  async getPayslip(id: string): Promise<Payslip | null> {
    return await this.repo.getPayslipById(id);
  }

  // --- MAIN PAYROLL GENERATOR ENGINE ---
  async generatePayrollForMonth(institutionId: string, month: number, year: number, userId?: string): Promise<string> {
    const existingRun = await this.repo.getPayrollRun(institutionId, month, year);
    if (existingRun && existingRun.status === 'Finalized') {
      throw new Error('Payroll for this month has already been finalized');
    }

    const runId = existingRun ? existingRun.id : crypto.randomUUID();
    if (!existingRun) {
      await this.repo.createPayrollRun(runId, institutionId, month, year, userId);
    } else {
      // Clear previous payslips if re-generating draft
      await this.repo.deletePayslipsForRun(runId);
    }

    // Fetch teachers who have salary structures defined
    const teachers = await this.repo.getTeachersWithStructures(institutionId);
    
    // Default working days for the month (simple helper)
    const workingDays = new Date(year, month, 0).getDate(); 

    let totalGross = 0;
    let totalNet = 0;

    for (const teacher of teachers) {
      const struct = await this.repo.getSalaryStructure(teacher.id);
      if (!struct) continue;

      // Calculate attendance statistics
      const att = await this.repo.getTeacherAttendanceStats(teacher.id, month, year);
      
      // Calculate leave days & LOP days
      const presentDays = att.present + (att.half_day * 0.5);
      const leaveDays = att.leave;
      
      // MVP logic: LOP counts any days not marked present or approved leave
      const lopDays = Math.max(0, workingDays - presentDays - leaveDays);

      // Calculations
      const monthlyGrossSalary = struct.basic_salary + struct.da + struct.hra + struct.other_allowances;
      const oneDaySalary = monthlyGrossSalary / workingDays;
      const lopDeduction = Math.round((oneDaySalary * lopDays) * 100) / 100;

      const totalDeductions = struct.pf_deduction + struct.tds_deduction + struct.other_deductions + lopDeduction;
      const netSalary = Math.max(0, monthlyGrossSalary - totalDeductions);

      const payslipId = crypto.randomUUID();
      await this.repo.createPayslip(payslipId, institutionId, {
        payroll_run_id: runId,
        teacher_id: teacher.id,
        month,
        year,
        working_days: workingDays,
        present_days: Math.round(presentDays * 10) / 10,
        leave_days: leaveDays,
        lop_days: lopDays,
        basic_salary: struct.basic_salary,
        da: struct.da,
        hra: struct.hra,
        other_allowances: struct.other_allowances,
        gross_salary: monthlyGrossSalary,
        pf_deduction: struct.pf_deduction,
        tds_deduction: struct.tds_deduction,
        lop_deduction: lopDeduction,
        other_deductions: struct.other_deductions,
        net_salary: netSalary
      });

      totalGross += monthlyGrossSalary;
      totalNet += netSalary;
    }

    await this.repo.updatePayrollRunTotals(runId, totalGross, totalNet);
    return runId;
  }
}
