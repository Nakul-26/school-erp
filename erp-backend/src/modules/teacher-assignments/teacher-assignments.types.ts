export interface TeacherSubjectAssignment {
  id: string;
  teacher_id: string;
  subject_id: string;
  course_id: string;
  section_id: string;
  academic_year_id: string;
  is_active: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  created_by?: string;
  updated_by?: string;
}

export type CreateAssignmentInput = Omit<TeacherSubjectAssignment, 'id' | 'is_active' | 'created_at' | 'updated_at' | 'deleted_at' | 'created_by' | 'updated_by'>;
