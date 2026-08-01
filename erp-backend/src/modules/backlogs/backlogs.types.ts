export interface BacklogSubject {
  subject_id: string;
  subject_code: string;
  subject_name: string;
  credits: number | null;
  semester: number;
  academic_year_id: string;
  academic_year_name: string;
  exam_id: string;
  exam_name: string;
  marks_obtained: number;
  max_marks: number;
  percent: number;
  grade: string;
  grade_point: number;
}

export interface StudentBacklogs {
  student_id: string;
  student_name: string;
  roll_number: string | null;
  admission_number: string;
  open_backlogs: BacklogSubject[];
  open_backlog_count: number;
}

export interface EnrolledStudentRow {
  id: string;
  first_name: string;
  last_name: string | null;
  roll_number: string | null;
  admission_number: string;
}
