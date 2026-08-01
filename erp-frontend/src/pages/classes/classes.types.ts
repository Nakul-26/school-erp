export interface Section {
  id: string;
  institution_id: string;
  academic_year_id: string;
  course_id: string;
  name: string;
  year_number: number;
  capacity: number | null;
  room: string | null;
  class_teacher_id: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;

  // joined fields from the list/detail endpoints
  class_teacher_name?: string | null;
  course_name?: string;
  academic_year_name?: string;
  student_count?: number;
}

export interface Program {
  id: string;
  institution_id: string;
  department_id?: string | null;
  course_code: string;
  name: string;
  duration_years: number;
  duration_unit?: string;
  degree_type?: string;
  semester_enabled: number;
  credit_system_enabled: number;
  electives_enabled: number;
  description?: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  description: string | null;
  head_teacher_id: string | null;
  is_active: number;
}

export interface Teacher {
  id: string;
  first_name: string;
  last_name: string;
  employee_id: string;
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

export interface AcademicYear {
  id: string;
  name: string;
  is_current: number;
  status: 'Draft' | 'Active' | 'Locked' | 'Archived';
}

export interface Institution {
  id: string;
  name: string;
  institution_type: string;
  [key: string]: any;
}

export interface AuditLogEntry {
  id: string;
  user_name?: string;
  module: string;
  entity_id?: string;
  action: string;
  description?: string;
  status: string;
  timestamp: string;
}

export interface AuditLogsResponse {
  data: AuditLogEntry[];
  total?: number;
  page?: number;
  modules?: string[];
}

export interface BulkActionResponse {
  message?: string;
  [key: string]: any;
}
