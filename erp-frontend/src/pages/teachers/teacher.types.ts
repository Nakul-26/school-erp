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

  // joined in on the single-teacher detail endpoint
  students_count?: number;
  periods_count?: number;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  description: string | null;
  head_teacher_id: string | null;
  is_active: number;
}

export interface Program {
  id: string;
  name: string;
  course_code: string;
  duration_years: number;
  department_id: string | null;
  is_active: number;
}

export interface Subject {
  id: string;
  course_id: string;
  subject_code: string;
  subject_name: string;
  credits: number | null;
  semester: number | null;
  is_elective: number;
  status: string;
  is_active: number;
}

export interface Section {
  id: string;
  name: string;
  course_id: string;
  academic_year_id: string;
  year_number: number;
  class_teacher_id: string | null;
  is_active: number;
}

export interface AcademicYear {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_current: number;
  status: 'Draft' | 'Active' | 'Locked' | 'Archived';
}

export interface CreateTeacherResponse {
  id: string;
  login_created: boolean;
  username: string;
  password: string;
}

export interface TeacherAssignment {
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
}
