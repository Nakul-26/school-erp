export interface Teacher {
  id: string;
  institution_id: string;
  user_id?: string | null;
  employee_id: string;
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  email?: string | null;
  phone?: string | null;
  joining_date?: string | null;
  designation?: string | null;
  department?: string | null;
  status: 'ACTIVE' | 'ON_LEAVE' | 'RESIGNED' | 'RETIRED';
  is_active: number;
  created_at: string;
  updated_at: string;
  qualification?: string | null;
  experience?: string | null;
  students_count?: number;
  periods_count?: number;
}

export interface TeachingAssignment {
  id: string;
  institution_id: string;
  academic_year_id: string;
  department_id: string;
  program_id: string;
  semester: number;
  year_number: number;
  section_id: string;
  subject_id: string;
  teacher_id: string;
  classes_per_week: number;
  theory_hours: number;
  practical_hours: number;
  tutorial_hours: number;
  mentoring_hours: number;
  admin_hours: number;
  primary_teacher: number;
  is_active: number;
  [key: string]: any;
}

export interface AcademicYear {
  id: string;
  name: string;
  is_current: number;
  status: 'Draft' | 'Active' | 'Locked' | 'Archived';
}

export interface Program {
  id: string;
  name: string;
  course_code: string;
  is_active: number;
}

export interface Section {
  id: string;
  name: string;
  course_id: string;
  academic_year_id: string;
  year_number: number;
  is_active: number;
}

export interface Subject {
  id: string;
  course_id: string;
  subject_code: string;
  subject_name: string;
  credits: number | null;
  semester: number | null;
  is_active: number;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  is_active: number;
}

export interface Institution {
  id: string;
  name: string;
  institution_type: string;
  [key: string]: any;
}

export type TimetableStatus = 'Draft' | 'Published' | 'Archived';

export interface WeeklyTimetableEntry {
  id: string;
  academic_year_id: string;
  teacher_id: string | null;
  subject_id: string;
  section_id: string;
  slot_id: string;
  day_of_week: string;
  room_number?: string | null;
  status: TimetableStatus;
  is_active: number;

  teacher_name?: string;
  subject_name?: string;
  subject_code?: string;
  section_name?: string;
  slot_name?: string;
  start_time?: string;
  end_time?: string;
}

export interface TimetableSlot {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  slot_type: 'period' | 'break';
  is_active: number;
}

export interface LeaveType {
  id: string;
  name: string;
  code: string;
  days_per_year: number;
  is_active: number;
}

export interface LeaveBalance {
  id: string;
  teacher_id: string;
  leave_type_id: string;
  academic_year_id: string;
  total_days: number;
  used_days: number;
  is_active: number;
  leave_type_name?: string;
  leave_type_code?: string;
}

export interface LeaveApplication {
  id: string;
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

  teacher_first_name?: string;
  teacher_last_name?: string;
  employee_id?: string;
  leave_type_name?: string;
  leave_type_code?: string;
}

export interface SalaryStructure {
  id: string;
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
}

export interface Payslip {
  id: string;
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

  first_name?: string;
  last_name?: string;
  employee_id?: string;
  designation?: string;
}

export interface TeacherDocument {
  id: string;
  entity_type: string;
  entity_id: string;
  name: string;
  folder: string;
  file_key: string;
  file_size: number;
  mime_type: string | null;
  uploaded_by: string | null;
  created_at: string;
  is_active: number;
  category?: string;
  original_filename?: string;
  status?: string;
}

export interface TeacherNote {
  id: string;
  entity_type: string;
  entity_id: string;
  author_id: string | null;
  author_name: string;
  content: string;
  created_at: string;
  is_active: number;
}

export interface CreateUserResponse {
  id: string;
  [key: string]: any;
}
