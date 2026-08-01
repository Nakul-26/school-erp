export interface Student {
  id: string;
  institution_id: string;
  user_id: string | null;
  admission_number: string;
  roll_number: string | null;
  first_name: string;
  middle_name: string | null;
  last_name: string | null;
  gender: string | null;
  date_of_birth: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  photo: string | null;
  admission_date: string | null;
  status: 'ACTIVE' | 'GRADUATED' | 'TRANSFERRED' | 'WITHDRAWN' | 'SUSPENDED' | 'ALUMNI' | 'APPLIED' | 'ADMITTED';
  blood_group: string | null;
  emergency_contact: string | null;
  medical_notes: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;

  // joined in from the latest enrollment / related lookups on list & detail endpoints
  academic_year_id?: string | null;
  academic_year_name?: string | null;
  course_id?: string | null;
  course_name?: string | null;
  program_name?: string | null;
  program_code?: string | null;
  section_id?: string | null;
  section_name?: string | null;
  semester?: number | null;
  attendance_percentage?: number;
  total_sessions?: number;
  fee_due?: number;
  guardian_name?: string | null;
  guardian_relationship?: string | null;
  guardian_phone?: string | null;
  guardian_email?: string | null;
  guardians?: Guardian[];
}

export interface Guardian {
  id: string;
  name: string;
  relationship: string;
  phone: string | null;
  email: string | null;
  occupation?: string | null;
}

export interface StudentsListResponse {
  students: Student[];
  total: number;
}

export interface AcademicYear {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_current: number;
  status: 'Draft' | 'Active' | 'Locked' | 'Archived';
}

export interface Program {
  id: string;
  name: string;
  course_code: string;
  duration_years: number;
  duration_unit: string;
  degree_type: string;
  department_id: string | null;
  semester_enabled: number;
  credit_system_enabled: number;
  electives_enabled: number;
  description: string | null;
  is_active: number;
}

export interface Section {
  id: string;
  name: string;
  course_id: string;
  academic_year_id: string;
  year_number: number;
  capacity: number | null;
  room: string | null;
  class_teacher_id: string | null;
  is_active: number;
}

export interface Institution {
  id: string;
  name: string;
  institution_type: string;
  [key: string]: any;
}
