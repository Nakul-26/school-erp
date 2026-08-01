export interface ElectiveOffering {
  subject_id: string;
  subject_code: string;
  subject_name: string;
  credits: number | null;
  registered_count: number;
  is_registered: boolean;
  is_eligible: boolean;
}

export interface StudentElectiveChoice {
  id: string;
  subject_id: string;
  subject_code: string;
  subject_name: string;
  credits: number | null;
  academic_year_id: string;
  academic_year_name: string;
  semester: number;
  status: 'REGISTERED' | 'WITHDRAWN';
  registered_at: string;
}

export interface RegisterElectiveInput {
  course_id: string;
  academic_year_id: string;
  semester: number;
  subject_id: string;
}

export interface ElectiveRosterEntry {
  student_id: string;
  student_name: string;
  roll_number: string | null;
  admission_number: string;
  registered_at: string;
}
