export interface Subject {
  id: string;
  institution_id: string;
  course_id: string;
  subject_code: string;
  subject_name: string;
  credits?: number;
  semester?: number;
  is_elective?: number;
  status?: string;
  description?: string;
  theory_lab?: string;
  department?: string;
  weekly_hours?: number;
  is_active: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  created_by?: string;
  updated_by?: string;
}

export type CreateSubjectInput = Omit<Subject, 'id' | 'institution_id' | 'is_active' | 'created_at' | 'updated_at' | 'deleted_at' | 'created_by' | 'updated_by'>;
export type UpdateSubjectInput = Partial<CreateSubjectInput>;
