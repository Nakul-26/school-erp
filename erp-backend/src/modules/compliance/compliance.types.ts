export interface EnrollmentSummary {
  total_students: number;
  by_gender: { gender: string; count: number }[];
  by_status: { status: string; count: number }[];
  by_course: { course_name: string; count: number }[];
  total_teachers: number;
  student_teacher_ratio: number | null;
}

export interface AttendanceSummary {
  from: string;
  to: string;
  total_marked: number;
  present_count: number;
  absent_count: number;
  attendance_rate: number | null;
}

export interface FeeComplianceSummary {
  total_billed: number;
  total_collected: number;
  total_outstanding: number;
  collection_rate: number | null;
  overdue_records: number;
}
