export type AttendanceStatus = 'present' | 'absent' | 'late' | 'medical' | 'on_duty' | 'excused' | 'holiday';

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
  status: AttendanceStatus;
  remarks: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  created_by: string | null;
  updated_by: string | null;

  // populated student details
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
  allow_override?: boolean;
}

export interface MarkStudentAttendanceInput {
  student_id: string;
  status: AttendanceStatus;
  remarks?: string;
}

export interface MarkAttendanceSessionPayload {
  session: CreateAttendanceSessionInput;
  attendance: MarkStudentAttendanceInput[];
}
