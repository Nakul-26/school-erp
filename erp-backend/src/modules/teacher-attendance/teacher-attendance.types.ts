export interface TeacherAttendanceRecord {
  id: string;
  institution_id: string;
  teacher_id: string;
  date: string; // YYYY-MM-DD
  status: 'present' | 'absent' | 'half_day' | 'on_leave';
  remarks: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  created_by: string | null;
  updated_by: string | null;

  // Populated fields for list
  first_name?: string;
  last_name?: string;
  employee_id?: string;
  designation?: string;
  department?: string;
}

export interface MarkTeacherAttendanceInput {
  teacher_id: string;
  status: 'present' | 'absent' | 'half_day' | 'on_leave';
  remarks?: string;
}

export interface SaveTeacherAttendancePayload {
  date: string;
  records: MarkTeacherAttendanceInput[];
}
