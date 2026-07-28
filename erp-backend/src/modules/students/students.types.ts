export interface Student {
  id: string;
  institution_id: string;
  user_id?: string | null;
  admission_number: string;
  roll_number?: string | null;
  registration_number?: string | null;
  first_name: string;
  middle_name?: string | null;
  last_name?: string | null;
  gender?: string | null;
  date_of_birth?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  photo?: string | null;
  admission_date?: string | null;
  status: 'ACTIVE' | 'GRADUATED' | 'TRANSFERRED' | 'WITHDRAWN' | 'SUSPENDED' | 'ALUMNI' | 'APPLIED' | 'ADMITTED';
  blood_group?: string | null;
  emergency_contact?: string | null;
  medical_notes?: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
}

export type CreateStudentInput = Omit<Student, 'id' | 'is_active' | 'created_at' | 'updated_at' | 'deleted_at' | 'created_by' | 'updated_by'> & {
  academic_year_id?: string;
  course_id?: string;
  section_id?: string;
  semester?: number;
  guardians?: any[];
  guardian_name?: string;
  guardian_relationship?: string;
  guardian_phone?: string;
  guardian_email?: string;
};

export type UpdateStudentInput = Partial<CreateStudentInput>;

export interface StudentFilterOptions {
  search?: string;
  program_id?: string;
  course_id?: string;
  section_id?: string;
  academic_year_id?: string;
  status?: string;
  is_active?: string;
  limit?: number;
  offset?: number;
}

export interface StudentDependencyCounts {
  attendance: number;
  marks: number;
  fee_records: number;
  total: number;
}
