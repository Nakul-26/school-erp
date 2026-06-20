export interface AcademicCalendarEntry {
  id: string;
  institution_id: string;
  name: string;
  start_date: string;
  end_date: string;
  type: 'holiday' | 'event' | 'exam' | 'vacation';
  description: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  created_by: string | null;
  updated_by: string | null;
}

export interface CreateCalendarEntryInput {
  name: string;
  start_date: string;
  end_date: string;
  type: 'holiday' | 'event' | 'exam' | 'vacation';
  description?: string;
}

export interface UpdateCalendarEntryInput {
  name?: string;
  start_date?: string;
  end_date?: string;
  type?: 'holiday' | 'event' | 'exam' | 'vacation';
  description?: string;
}
