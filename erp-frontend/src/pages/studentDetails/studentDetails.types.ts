export interface Student {
  id: string;
  institution_id: string;
  user_id: string | null;
  admission_number: string;
  roll_number: string | null;
  first_name: string;
  middle_name: string | null;
  last_name: string | null;
  gender: string | null;
  date_of_birth: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  photo: string | null;
  admission_date: string | null;
  status: 'ACTIVE' | 'GRADUATED' | 'TRANSFERRED' | 'WITHDRAWN' | 'SUSPENDED' | 'ALUMNI' | 'APPLIED' | 'ADMITTED';
  blood_group: string | null;
  emergency_contact: string | null;
  medical_notes: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;

  academic_year_id?: string | null;
  academic_year_name?: string | null;
  course_id?: string | null;
  program_name?: string | null;
  program_code?: string | null;
  section_id?: string | null;
  section_name?: string | null;
  semester?: number | null;
  attendance_percentage?: number;
  fee_due?: number;
  guardian_name?: string | null;
  guardian_relationship?: string | null;
  guardian_phone?: string | null;
  guardian_email?: string | null;
  guardians?: Guardian[];
}

export interface Guardian {
  id: string;
  name: string;
  relationship: string;
  phone: string | null;
  email: string | null;
  occupation?: string | null;
}

export interface Enrollment {
  id: string;
  student_id: string;
  academic_year_id: string;
  course_id: string;
  section_id: string;
  semester: number | null;
  is_active: number;
  [key: string]: any;
}

export interface AcademicYear {
  id: string;
  name: string;
  is_current: number;
  status: 'Draft' | 'Active' | 'Locked' | 'Archived';
}

export interface Program {
  id: string;
  name: string;
  course_code: string;
  is_active: number;
  semester_enabled?: number;
  credit_system_enabled?: number;
  electives_enabled?: number;
}

export interface Section {
  id: string;
  name: string;
  course_id: string;
  academic_year_id: string;
  year_number: number;
  is_active: number;
}

export interface Institution {
  id: string;
  name: string;
  institution_type: string;
  [key: string]: any;
}

export interface AttendanceRecord {
  status: 'present' | 'absent' | 'late' | 'medical' | 'on_duty' | 'excused' | 'holiday';
  remarks: string | null;
  date: string;
  subject_name: string;
  teacher_name: string;
}

export interface AttendanceSummary {
  studentId: string;
  percentage: number;
  present: number;
  total: number;
  records: AttendanceRecord[];
}

export interface StudentFeeRecord {
  id: string;
  institution_id: string;
  student_id: string;
  academic_year_id: string;
  course_id: string;
  year_number: number;
  fee_structure_id: string | null;
  fee_type: string;
  total_amount: number;
  paid_amount: number;
  concession_amount: number;
  fine_amount: number;
  refund_amount: number;
  is_fine_exempt: number;
  due_date: string | null;
  status: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE';
  is_active: number;
  created_at: string;

  academic_year_name?: string;
  course_name?: string;
}

export interface FeePayment {
  id: string;
  institution_id: string;
  student_id: string;
  student_fee_record_id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  transaction_reference?: string | null;
  remarks?: string | null;
  status: string;
  receipt_number?: string | null;
  collected_by?: string | null;
  is_active: number;
  created_at: string;

  fee_type?: string;
}

export interface StudentDocument {
  id: string;
  entity_type: string;
  entity_id: string;
  name: string;
  folder: string;
  file_key: string;
  file_size: number;
  mime_type: string | null;
  uploaded_by: string | null;
  created_at: string;
  is_active: number;
  category?: string;
  original_filename?: string;
  status?: string;
}

export interface StudentNote {
  id: string;
  entity_type: string;
  entity_id: string;
  author_id: string | null;
  author_name: string;
  content: string;
  created_at: string;
  is_active: number;
}

export interface TransportRoute {
  id: string;
  route_name: string;
  start_location: string | null;
  end_location: string | null;
  vehicle_number: string | null;
  driver_name: string | null;
  driver_phone: string | null;
  monthly_charge: number;
  is_active: number;
}

export interface TransportAllocation {
  id: string;
  student_id: string;
  route_id: string;
  pickup_point: string | null;
  is_active: number;
  [key: string]: any;
}

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

  academic_year_name?: string;
  course_name?: string;
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

export interface ElectiveOffering {
  subject_id: string;
  subject_code: string;
  subject_name: string;
  credits: number | null;
  registered_count: number;
  is_registered: boolean;
  is_eligible: boolean;
}

export interface PlacementDriveInfo {
  id: string;
  company_name: string;
  title: string;
  drive_type: 'PLACEMENT' | 'INTERNSHIP';
  package_amount: number | null;
  drive_date: string | null;
  application_deadline: string | null;
  status: 'DRAFT' | 'OPEN' | 'CLOSED' | 'COMPLETED';
  min_cgpa: number | null;
  max_backlogs: number | null;
}

export interface PlacementEligibility {
  is_eligible: boolean;
  reasons: string[];
  cgpa: number | null;
  open_backlog_count: number;
}

export interface PlacementApplicationView {
  id: string;
  drive_id: string;
  title: string;
  drive_type: string;
  package_amount: number | null;
  drive_status: string;
  company_name: string;
  status: string;
  applied_at: string;
  offer_package: number | null;
  offer_date: string | null;
  remarks: string | null;
}

export interface HealthVisit {
  id: string;
  visit_date: string;
  reason: string;
  diagnosis: string | null;
  treatment: string | null;
  referred_to: string | null;
  follow_up_date: string | null;
}

export interface Immunization {
  id: string;
  vaccine_name: string;
  dose_number: number | null;
  administered_date: string | null;
  next_due_date: string | null;
}

export interface HealthIncident {
  id: string;
  incident_date: string;
  incident_type: 'INJURY' | 'ILLNESS' | 'ALLERGY_REACTION' | 'OTHER';
  description: string;
  severity: 'MINOR' | 'MODERATE' | 'SEVERE';
  action_taken: string | null;
  parent_notified: number;
}

export interface MedicalSummary {
  student_id: string;
  blood_group: string | null;
  emergency_contact: string | null;
  medical_notes: string | null;
  visits: HealthVisit[];
  immunizations: Immunization[];
  incidents: HealthIncident[];
}

export interface StudentElectiveChoice {
  id: string;
  subject_id: string;
  subject_code: string;
  subject_name: string;
  credits: number | null;
  academic_year_id: string;
  academic_year_name: string;
  semester: number;
  status: 'REGISTERED' | 'WITHDRAWN';
  registered_at: string;
}
