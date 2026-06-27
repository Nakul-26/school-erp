export interface LeaveType {
  id: string;
  institution_id: string;
  name: string;
  code: string;
  days_per_year: number;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface CreateLeaveTypeInput {
  name: string;
  code: string;
  days_per_year: number;
}

export interface UpdateLeaveTypeInput {
  name: string;
  days_per_year: number;
}

export interface LeaveBalance {
  id: string;
  institution_id: string;
  teacher_id: string;
  leave_type_id: string;
  academic_year_id: string;
  total_days: number;
  used_days: number;
  is_active: number;
  created_at: string;
  updated_at: string;

  // populated fields
  leave_type_name?: string;
  leave_type_code?: string;
  teacher_first_name?: string;
  teacher_last_name?: string;
  employee_id?: string;
}

export interface LeaveApplication {
  id: string;
  institution_id: string;
  teacher_id: string;
  leave_type_id: string;
  academic_year_id: string;
  from_date: string;
  to_date: string;
  days_count: number;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  approved_by: string | null;
  approved_at: string | null;
  remarks: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;

  // populated fields
  teacher_first_name?: string;
  teacher_last_name?: string;
  employee_id?: string;
  leave_type_name?: string;
  leave_type_code?: string;
}

export interface CreateLeaveApplicationInput {
  leave_type_id: string;
  academic_year_id: string;
  from_date: string;
  to_date: string;
  days_count: number;
  reason: string;
  teacher_id: string;
}
