export interface AcademicYear {
  id: string;
  name: string;
  is_current?: number;
}

export interface Program {
  id: string;
  name: string;
}

export interface Inquiry {
  id: string;
  student_name: string;
  parent_name: string;
  parent_phone: string;
  parent_email: string | null;
  date_of_birth: string | null;
  applying_for_class: string;
  academic_year_id: string | null;
  academic_year_name: string | null;
  source: string;
  notes: string | null;
  status: 'New' | 'Contacted' | 'Applied' | 'Admitted' | 'Rejected';
  created_at: string;
}

export interface Application {
  id: string;
  institution_id: string;
  inquiry_id: string | null;
  application_number: string;
  student_first_name: string;
  student_last_name: string;
  date_of_birth: string | null;
  gender: string | null;
  applying_for_course_id: string | null;
  course_name: string | null;
  academic_year_id: string;
  academic_year_name: string;
  parent_name: string;
  parent_phone: string;
  parent_email: string | null;
  previous_school: string | null;
  previous_class: string | null;
  status: 'Submitted' | 'Under Review' | 'Approved' | 'Rejected';
  rejection_reason: string | null;
  approved_by: string | null;
  approved_at: string | null;
  converted_student_id: string | null;
  created_at: string;
}

export type BoardStage = 'lead' | 'applied' | 'outcome';

export interface BoardCard {
  id: string;
  type: 'inquiry' | 'application';
  title: string;
  subtitle: string; // Parent name
  phone: string;
  email: string;
  classLabel: string;
  classValue: string; // for filtering
  yearId: string;
  status: string;
  createdDate: string;
  rawItem: any;
}

export interface ApproveApplicationResult {
  success: boolean;
  studentId: string;
  admissionNumber: string;
}

export interface InquiryAddForm {
  student_name: string;
  parent_name: string;
  parent_phone: string;
  parent_email: string;
  date_of_birth: string;
  applying_for_class: string;
  source: string;
  notes: string;
  academic_year_id: string;
}

export interface ApplicationAddForm {
  student_first_name: string;
  student_last_name: string;
  date_of_birth: string;
  gender: string;
  applying_for_course_id: string;
  academic_year_id: string;
  parent_name: string;
  parent_phone: string;
  parent_email: string;
  previous_school: string;
  previous_class: string;
}
