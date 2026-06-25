export interface Section {
  id: string;
  institution_id: string;
  academic_year_id: string;
  course_id: string;
  name: string;
  year_number: number;
  capacity: number | null;
  room: string | null;
  class_teacher_id: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  created_by?: string;
  updated_by?: string;
}

export interface SectionWithDetails extends Section {
  class_teacher_name?: string | null;
  course_name?: string;
  academic_year_name?: string;
  student_count?: number;
}

export type CreateSectionInput = Omit<Section, 'id' | 'institution_id' | 'is_active' | 'created_at' | 'updated_at' | 'deleted_at' | 'created_by' | 'updated_by'>;
export type UpdateSectionInput = Partial<CreateSectionInput> & { is_active?: number };
