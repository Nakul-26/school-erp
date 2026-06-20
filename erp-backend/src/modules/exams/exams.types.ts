export interface Exam {
  id: string;
  institution_id: string;
  name: string;
  academic_year_id: string;
  course_id: string;
  semester: number;
  start_date: string;
  end_date: string;
  status: 'DRAFT' | 'PUBLISHED' | 'COMPLETED';
  is_active: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  created_by: string | null;
  updated_by: string | null;

  // Populated fields
  academic_year_name?: string;
  course_name?: string;
  course_code?: string;
}

export interface ExamSubject {
  id: string;
  institution_id: string;
  exam_id: string;
  subject_id: string;
  exam_date: string | null;
  start_time: string | null;
  end_time: string | null;
  max_marks: number;
  min_marks: number;
  is_active: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  created_by: string | null;
  updated_by: string | null;

  // Populated fields
  subject_name?: string;
  subject_code?: string;
}

export interface StudentMark {
  id: string;
  institution_id: string;
  exam_subject_id: string;
  student_id: string;
  marks_obtained: number;
  max_marks: number;
  remarks: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  created_by: string | null;
  updated_by: string | null;

  // Populated fields
  student_name?: string;
  roll_number?: string;
  subject_name?: string;
  subject_code?: string;
}

export interface CreateExamInput {
  name: string;
  academic_year_id: string;
  course_id: string;
  semester: number;
  start_date: string;
  end_date: string;
  status?: 'DRAFT' | 'PUBLISHED' | 'COMPLETED';
}

export interface UpdateExamInput {
  name?: string;
  academic_year_id?: string;
  course_id?: string;
  semester?: number;
  start_date?: string;
  end_date?: string;
  status?: 'DRAFT' | 'PUBLISHED' | 'COMPLETED';
}

export interface CreateExamSubjectInput {
  subject_id: string;
  exam_date?: string;
  start_time?: string;
  end_time?: string;
  max_marks: number;
  min_marks: number;
}

export interface EnterMarkInput {
  student_id: string;
  marks_obtained: number;
  max_marks: number;
  remarks?: string;
}

export interface StudentSubjectResult {
  subject_id: string;
  subject_name: string;
  subject_code: string;
  marks_obtained: number;
  max_marks: number;
  min_marks: number;
  remarks: string | null;
  status: 'PASS' | 'FAIL';
}

export interface StudentExamResult {
  exam_id: string;
  exam_name: string;
  student_id: string;
  student_name: string;
  roll_number: string | null;
  admission_number: string;
  subjects: StudentSubjectResult[];
  total_obtained: number;
  total_max: number;
  percentage: number;
  grade: string;
  result: 'PASS' | 'FAIL';
}
