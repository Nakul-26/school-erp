export interface TranscriptSubjectResult {
  subject_id: string;
  subject_code: string;
  subject_name: string;
  credits: number | null;
  exam_id: string;
  exam_name: string;
  marks_obtained: number;
  max_marks: number;
  percent: number;
  grade: string;
  grade_point: number;
  is_passing: boolean;
}

export interface SemesterGpaResult {
  course_id: string;
  academic_year_id: string;
  academic_year_name: string;
  semester: number;
  subjects: TranscriptSubjectResult[];
  total_credits: number;
  sgpa: number | null;
  result: 'PASS' | 'FAIL';
}

export interface TranscriptResult {
  student_id: string;
  course_id: string;
  course_name: string;
  semesters: SemesterGpaResult[];
  cgpa: number | null;
  total_credits: number;
}

export interface RawSemesterMarkRow {
  subject_id: string;
  subject_code: string;
  subject_name: string;
  credits: number | null;
  exam_id: string;
  exam_name: string;
  start_date: string;
  marks_obtained: number;
  max_marks: number;
}

export interface SemesterTuple {
  academic_year_id: string;
  academic_year_name: string;
  semester: number;
}
