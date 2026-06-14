export interface AcademicYear {
  id: string;
  institution_id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_current: number;
  is_active: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  created_by?: string;
  updated_by?: string;
}

export type CreateAcademicYearInput = Omit<AcademicYear, 'id' | 'institution_id' | 'is_active' | 'created_at' | 'updated_at' | 'deleted_at' | 'created_by' | 'updated_by'>;
export type UpdateAcademicYearInput = Partial<CreateAcademicYearInput>;
