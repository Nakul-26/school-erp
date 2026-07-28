export interface Program {
  id: string;
  institution_id: string;
  department_id?: string | null;
  course_code: string;
  name: string;
  duration_years: number;
  duration_unit?: string;
  degree_type?: string;
  semester_enabled: number;
  credit_system_enabled: number;
  electives_enabled: number;
  description?: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  created_by?: string;
  updated_by?: string;
}

export type CreateProgramInput = Omit<Program, 'id' | 'institution_id' | 'is_active' | 'created_at' | 'updated_at' | 'deleted_at' | 'created_by' | 'updated_by'>;
export type UpdateProgramInput = Partial<CreateProgramInput> & {
  is_active?: number;
};

export interface ProgramFilterOptions {
  includeArchived?: boolean;
  search?: string;
  status?: 'ACTIVE' | 'ARCHIVED' | 'ALL';
  degree_type?: string;
  department_id?: string;
}

export interface ProgramDependencyCounts {
  students: number;
  classes: number;
  subjects: number;
  teacher_assignments: number;
  timetables: number;
  total: number;
}
