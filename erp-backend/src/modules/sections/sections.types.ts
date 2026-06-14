export interface Section {
  id: string;
  institution_id: string;
  academic_year_id: string;
  course_id: string;
  name: string;
  year_number: number;
  is_active: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  created_by?: string;
  updated_by?: string;
}

export type CreateSectionInput = Omit<Section, 'id' | 'institution_id' | 'is_active' | 'created_at' | 'updated_at' | 'deleted_at' | 'created_by' | 'updated_by'>;
export type UpdateSectionInput = Partial<CreateSectionInput>;
