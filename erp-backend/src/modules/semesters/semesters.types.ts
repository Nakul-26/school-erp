export interface Semester {
  id: string;
  institution_id: string;
  course_id: string;
  academic_year_id: string;
  semester_number: number;
  name: string;
  start_date: string | null;
  end_date: string | null;
  status: 'Draft' | 'Active' | 'Locked' | 'Archived';
  is_active: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  created_by?: string;
  updated_by?: string;
}

export interface SemesterWithDetails extends Semester {
  course_name?: string;
  course_code?: string;
  academic_year_name?: string;
  enrolled_count?: number;
}

export type CreateSemesterInput = {
  course_id: string;
  academic_year_id: string;
  semester_number: number;
  name?: string;
  start_date?: string | null;
  end_date?: string | null;
};

export type UpdateSemesterInput = Partial<Pick<Semester, 'name' | 'start_date' | 'end_date'>>;

export interface SemesterFilterOptions {
  course_id?: string;
  academic_year_id?: string;
  status?: Semester['status'] | 'ALL';
  is_active?: string;
}

export interface SemesterDependencyCounts {
  enrollments: number;
  exams: number;
  total: number;
}
