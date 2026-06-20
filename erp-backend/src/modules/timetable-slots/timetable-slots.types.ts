export interface TimetableSlot {
  id: string;
  institution_id: string;
  name: string;
  start_time: string;
  end_time: string;
  slot_type: 'period' | 'break';
  is_active: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  created_by: string | null;
  updated_by: string | null;
}

export interface CreateTimetableSlotInput {
  name: string;
  start_time: string;
  end_time: string;
  slot_type: 'period' | 'break';
}

export interface UpdateTimetableSlotInput {
  name?: string;
  start_time?: string;
  end_time?: string;
  slot_type?: 'period' | 'break';
}
