export interface Program {
  id: string;
  institution_id: string;
  course_code: string;
  name: string;
  duration_years: number;
  is_active: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  created_by?: string;
  updated_by?: string;
}

export type CreateProgramInput = Omit<Program, 'id' | 'institution_id' | 'is_active' | 'created_at' | 'updated_at' | 'deleted_at' | 'created_by' | 'updated_by'>;
export type UpdateProgramInput = Partial<CreateProgramInput>;
