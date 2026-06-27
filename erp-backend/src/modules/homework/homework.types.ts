export interface Homework {
  id: string;
  institution_id: string;
  section_id: string;
  subject_id: string;
  teacher_id: string;
  title: string;
  description: string | null;
  due_date: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export type CreateHomeworkInput = Omit<Homework, 'id' | 'institution_id' | 'is_active' | 'created_at' | 'updated_at'>;
