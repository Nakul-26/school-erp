export interface Student {
  id: string;
  first_name: string;
  last_name: string;
  roll_number: string | null;
  admission_number: string;
  email: string | null;
  semester?: number;
}

export interface TimetableItem {
  id: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  subject_name: string;
  teacher_name: string;
}

export interface SectionSettingsForm {
  name: string;
  room: string;
  capacity: number;
  class_teacher_id: string;
}

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
  [key: string]: any;
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

export interface TeachingAllocation {
  id: string;
  section_id: string;
  subject_id: string;
  teacher_id: string;
  classes_per_week: number;
  primary_teacher: number;
  is_active: number;
}

export interface AttendanceSession {
  id: string;
  section_id: string;
  subject_id: string;
  teacher_id: string;
  date: string;
  is_active: number;
}

export interface FeeRecord {
  id: string;
  student_id: string;
  academic_year_id: string;
  fee_type: string;
  total_amount: number;
  paid_amount: number;
  concession_amount: number;
  fine_amount: number;
  status: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE';
}

export interface Exam {
  id: string;
  name: string;
  academic_year_id: string;
  exam_type?: string;
  [key: string]: any;
}

export interface Institution {
  id: string;
  name: string;
  institution_type: string;
  [key: string]: any;
}
