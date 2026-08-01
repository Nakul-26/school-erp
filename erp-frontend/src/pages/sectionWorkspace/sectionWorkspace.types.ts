export interface Student {
  id: string;
  first_name: string;
  last_name: string;
  roll_number: string | null;
  admission_number: string;
  email: string | null;
  semester?: number;
}

export interface TimetableItem {
  id: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  subject_name: string;
  teacher_name: string;
}

export interface SectionSettingsForm {
  name: string;
  room: string;
  capacity: number;
  class_teacher_id: string;
}
