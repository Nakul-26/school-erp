export interface SalaryStructure {
  id: string;
  institution_id: string;
  teacher_id: string;
  basic_salary: number;
  da: number;
  hra: number;
  other_allowances: number;
  pf_deduction: number;
  tds_deduction: number;
  other_deductions: number;
  effective_from: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export type CreateSalaryStructureInput = Omit<SalaryStructure, 'id' | 'institution_id' | 'is_active' | 'created_at' | 'updated_at'>;

export interface PayrollRun {
  id: string;
  institution_id: string;
  month: number;
  year: number;
  status: 'Draft' | 'Finalized';
  total_gross: number;
  total_net: number;
  generated_by: string;
  finalized_at: string | null;
  is_active: number;
  created_at: string;
}

export interface Payslip {
  id: string;
  institution_id: string;
  payroll_run_id: string;
  teacher_id: string;
  month: number;
  year: number;
  working_days: number;
  present_days: number;
  leave_days: number;
  lop_days: number;
  basic_salary: number;
  da: number;
  hra: number;
  other_allowances: number;
  gross_salary: number;
  pf_deduction: number;
  tds_deduction: number;
  lop_deduction: number;
  other_deductions: number;
  net_salary: number;
  is_active: number;
  created_at: string;
  
  // Populated fields
  first_name?: string;
  last_name?: string;
  employee_id?: string;
  designation?: string;
}
