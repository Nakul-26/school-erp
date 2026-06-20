export interface WeeklyTimetableEntry {
  id: string;
  institution_id: string;
  academic_year_id: string;
  teacher_id: string | null;
  subject_id: string;
  section_id: string;
  slot_id: string;
  day_of_week: string;
  is_active: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  created_by: string | null;
  updated_by: string | null;

  teacher_name?: string;
  subject_name?: string;
  subject_code?: string;
  section_name?: string;
  slot_name?: string;
  start_time?: string;
  end_time?: string;
}

export interface CreateWeeklyTimetableInput {
  academic_year_id: string;
  teacher_id?: string;
  subject_id: string;
  section_id: string;
  slot_id: string;
  day_of_week: string;
}

export interface UpdateWeeklyTimetableInput {
  academic_year_id?: string;
  teacher_id?: string;
  subject_id?: string;
  section_id?: string;
  slot_id?: string;
  day_of_week?: string;
}
