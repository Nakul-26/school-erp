export interface GradeScale {
  id: string;
  institution_id: string;
  grade: string;
  min_percent: number;
  max_percent: number;
  grade_point: number;
  remarks: string | null;
  is_passing: number;
  sort_order: number;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface ReportCardSubject {
  subject_name: string;
  subject_code: string;
  max_marks: number;
  marks_obtained: number;
  percent: number;
  grade: string;
  grade_point: number;
  is_passing: boolean;
  remarks: string | null;
}

export interface ReportCard {
  student: {
    id: string;
    first_name: string;
    last_name: string;
    roll_number: string | null;
    admission_number: string;
  };
  exam: {
    id: string;
    name: string;
    academic_year: string;
    course: string;
  };
  subjects: ReportCardSubject[];
  total: {
    max_marks: number;
    marks_obtained: number;
    percent: number;
    grade: string;
    grade_point: number;
    rank: number | null;
  };
  attendance_percent: number | null;
  result: 'PASS' | 'FAIL';
}
