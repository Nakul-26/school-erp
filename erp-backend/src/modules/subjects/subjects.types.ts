export interface Subject {
  id: string;
  institution_id: string;
  course_id: string;
  subject_code: string;
  subject_name: string;
  credits?: number | null;
  semester?: number | null;
  is_elective?: number;
  status?: string;
  description?: string | null;
  theory_lab?: string;
  department?: string | null;
  weekly_hours?: number | null;
  is_active: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
}

export interface SubjectWithDetails extends Subject {
  course_name?: string;
}

export type CreateSubjectInput = Omit<Subject, 'id' | 'institution_id' | 'is_active' | 'created_at' | 'updated_at' | 'deleted_at' | 'created_by' | 'updated_by'>;
export type UpdateSubjectInput = Partial<CreateSubjectInput> & { is_active?: number };

export interface SubjectFilterOptions {
  course_id?: string;
  semester?: number | string;
  is_elective?: number | string;
  theory_lab?: string;
  status?: 'ACTIVE' | 'ARCHIVED' | 'ALL' | string;
  is_active?: string;
  search?: string;
}

export interface SubjectDependencyCounts {
  teacher_assignments: number;
  timetables: number;
  attendance: number;
  exams: number;
  grades: number;
  total: number;
}
