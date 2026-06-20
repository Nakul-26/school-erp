export interface AttendanceSession {
  id: string;
  institution_id: string;
  section_id: string;
  subject_id: string;
  teacher_id: string;
  slot_id: string | null;
  date: string; // YYYY-MM-DD
  is_active: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  created_by: string | null;
  updated_by: string | null;

  // populated fields for UI
  section_name?: string;
  subject_name?: string;
  subject_code?: string;
  teacher_name?: string;
  slot_name?: string;
}

export interface StudentAttendanceRecord {
  id: string;
  institution_id: string;
  session_id: string;
  student_id: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  remarks: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  created_by: string | null;
  updated_by: string | null;

  // populated student details for list view
  first_name?: string;
  last_name?: string;
  roll_number?: string;
  admission_number?: string;
}

export interface CreateAttendanceSessionInput {
  section_id: string;
  subject_id: string;
  teacher_id: string;
  slot_id?: string;
  date: string;
}

export interface MarkStudentAttendanceInput {
  student_id: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  remarks?: string;
}

export interface MarkAttendanceSessionPayload {
  session: CreateAttendanceSessionInput;
  attendance: MarkStudentAttendanceInput[];
}
