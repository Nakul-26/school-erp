export interface TeachingAllocation {
  id: string;
  institution_id: string;
  academic_year_id: string;
  department_id: string;
  program_id: string;
  semester: number;
  year_number: number;
  section_id: string;
  subject_id: string;
  teacher_id: string;
  classes_per_week: number;
  theory_hours: number;
  practical_hours: number;
  tutorial_hours: number;
  mentoring_hours: number;
  admin_hours: number;
  primary_teacher: number; // boolean (0 or 1)
  status: 'Draft' | 'Pending Approval' | 'Active' | 'Completed' | 'Archived';
  start_date: string | null;
  end_date: string | null;
  remarks: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
}

export type CreateAllocationInput = Omit<
  TeachingAllocation,
  'id' | 'institution_id' | 'is_active' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by'
>;

export type UpdateAllocationInput = Partial<CreateAllocationInput>;
