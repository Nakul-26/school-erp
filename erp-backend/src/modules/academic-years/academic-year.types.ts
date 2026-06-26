export interface AcademicYear {
  id: string;
  institution_id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_current: number;
  status: 'Draft' | 'Active' | 'Locked' | 'Archived';
  is_active: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  created_by?: string;
  updated_by?: string;
}

export type CreateAcademicYearInput = Omit<AcademicYear, 'id' | 'institution_id' | 'is_active' | 'created_at' | 'updated_at' | 'deleted_at' | 'created_by' | 'updated_by'>;
export type UpdateAcademicYearInput = Partial<CreateAcademicYearInput>;

export interface RolloverInput {
  source_year_id: string;
  target_year_id: string;
  checklist: string[]; // ['departments', 'courses', 'sections', 'subjects', 'allocations', 'timetable_slots', 'settings']
  preview?: boolean;
}

export interface PromotionInput {
  source_year_id: string;
  target_year_id: string;
  source_course_id: string;
  source_section_id: string;
  target_course_id: string;
  target_section_id: string;
  target_semester?: number;
  student_ids: string[];
  generate_fees?: boolean;
  preview?: boolean;
}

export interface YearClosingInput {
  academic_year_id: string;
  preview?: boolean;
}
