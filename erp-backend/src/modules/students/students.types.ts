export interface Student {
  id: string;
  institution_id: string;
  user_id?: string;
  admission_number: string;
  roll_number?: string;
  first_name: string;
  middle_name?: string;
  last_name?: string;
  gender?: string;
  date_of_birth?: string;
  email?: string;
  phone?: string;
  address?: string;
  photo?: string;
  admission_date?: string;
  status: 'APPLIED' | 'ADMITTED' | 'ACTIVE' | 'TRANSFERRED' | 'GRADUATED' | 'DROPPED' | 'ALUMNI';
  blood_group?: string;
  emergency_contact?: string;
  medical_notes?: string;
  is_active: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  created_by?: string;
  updated_by?: string;
}

export type CreateStudentInput = Omit<Student, 'id' | 'is_active' | 'created_at' | 'updated_at' | 'deleted_at' | 'created_by' | 'updated_by'>;
export type UpdateStudentInput = Partial<CreateStudentInput>;
