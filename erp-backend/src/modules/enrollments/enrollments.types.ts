export interface StudentEnrollment {
  id: string;
  student_id: string;
  academic_year_id: string;
  course_id: string;
  section_id: string;
  semester?: number;
  is_active: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  created_by?: string;
  updated_by?: string;
}

export type CreateEnrollmentInput = Omit<StudentEnrollment, 'id' | 'is_active' | 'created_at' | 'updated_at' | 'deleted_at' | 'created_by' | 'updated_by'>;
export type UpdateEnrollmentInput = Partial<CreateEnrollmentInput>;
