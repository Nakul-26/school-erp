export interface AdmissionInquiry {
  id: string;
  institution_id: string;
  student_name: string;
  parent_name: string;
  parent_phone: string;
  parent_email: string | null;
  date_of_birth: string | null;
  applying_for_class: string;
  academic_year_id: string | null;
  source: string;
  notes: string | null;
  status: 'New' | 'Contacted' | 'Applied' | 'Admitted' | 'Rejected';
  is_active: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;

  // Populated via JOIN
  academic_year_name?: string;
}

export interface CreateInquiryInput {
  student_name: string;
  parent_name: string;
  parent_phone: string;
  parent_email?: string;
  date_of_birth?: string;
  applying_for_class: string;
  academic_year_id?: string;
  source?: string;
  notes?: string;
}

export type UpdateInquiryInput = Partial<CreateInquiryInput> & {
  status?: 'New' | 'Contacted' | 'Applied' | 'Admitted' | 'Rejected';
};

export interface AdmissionApplication {
  id: string;
  institution_id: string;
  inquiry_id: string | null;
  application_number: string;
  student_first_name: string;
  student_last_name: string;
  date_of_birth: string | null;
  gender: string | null;
  applying_for_course_id: string | null;
  academic_year_id: string;
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
  is_active: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;

  // Populated via JOINs
  course_name?: string;
  academic_year_name?: string;
}

export interface CreateApplicationInput {
  inquiry_id?: string;
  student_first_name: string;
  student_last_name: string;
  date_of_birth?: string;
  gender?: string;
  applying_for_course_id?: string;
  academic_year_id: string;
  parent_name: string;
  parent_phone: string;
  parent_email?: string;
  previous_school?: string;
  previous_class?: string;
}
