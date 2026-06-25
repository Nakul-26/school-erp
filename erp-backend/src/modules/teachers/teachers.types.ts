export interface Teacher {
  id: string;
  institution_id: string;
  user_id?: string;
  employee_id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  email?: string;
  phone?: string;
  joining_date?: string;
  designation?: string;
  department?: string;
  status: 'ACTIVE' | 'ON_LEAVE' | 'RESIGNED' | 'RETIRED';
  is_active: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  created_by?: string;
  updated_by?: string;
  qualification?: string;
  experience?: string;
}

export type CreateTeacherInput = Omit<Teacher, 'id' | 'is_active' | 'created_at' | 'updated_at' | 'deleted_at' | 'created_by' | 'updated_by'>;
export type UpdateTeacherInput = Partial<CreateTeacherInput>;
