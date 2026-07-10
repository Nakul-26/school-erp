-- ============================================
-- College ERP - D1 Schema (multi-tenant foundation)
-- ============================================

-- 1. Institutions
CREATE TABLE IF NOT EXISTS institutions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  logo TEXT,
  institution_type TEXT DEFAULT 'college',
  current_academic_year_id TEXT,
  attendance_threshold REAL DEFAULT 75.0,
  passing_marks REAL DEFAULT 40.0,
  
  -- Audit fields
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT
);

-- 2. Users (Without direct role field, mapped via user_roles)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id),
  username TEXT NOT NULL,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  profile_photo TEXT,
  reset_token TEXT,
  reset_expires TEXT,
  
  -- Audit fields
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  
  UNIQUE(institution_id, username),
  UNIQUE(institution_id, email)
);

-- 3. Roles
CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT
);

-- 4. User Roles Mapping (Many-to-Many)
CREATE TABLE IF NOT EXISTS user_roles (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

-- 5. Permissions
CREATE TABLE IF NOT EXISTS permissions (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE, -- e.g., 'student.view', 'user.manage'
  description TEXT
);

-- 6. Role Permissions Mapping (Many-to-Many)
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id TEXT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- 7. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,       -- e.g., 'CREATE', 'UPDATE', 'DELETE', 'LOGIN'
  module TEXT NOT NULL,       -- e.g., 'auth', 'student', 'class'
  record_id TEXT,             -- ID of the affected record
  description TEXT,           -- Human readable summary: e.g., "Admin deleted student John Doe"
  timestamp TEXT DEFAULT (datetime('now'))
);

-- 8. Academic Years
CREATE TABLE IF NOT EXISTS academic_years (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id),
  name TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  is_current INTEGER DEFAULT 0,
  status TEXT DEFAULT 'Draft',
  
  -- Audit fields
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT
);

-- 9. Departments
CREATE TABLE IF NOT EXISTS departments (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id),
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  description TEXT,
  head_teacher_id TEXT REFERENCES teachers(id) ON DELETE SET NULL,
  
  -- Audit fields
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  
  UNIQUE(institution_id, code)
);

-- 10. Courses / Programs
CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id),
  department_id TEXT REFERENCES departments(id),
  course_code TEXT NOT NULL,
  name TEXT NOT NULL,
  duration_years INTEGER NOT NULL,
  semester_enabled INTEGER DEFAULT 0,
  credit_system_enabled INTEGER DEFAULT 0,
  electives_enabled INTEGER DEFAULT 0,
  description TEXT,
  
  -- Audit fields
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT
);


-- 10. Sections / Classes
CREATE TABLE IF NOT EXISTS sections (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id),
  academic_year_id TEXT NOT NULL REFERENCES academic_years(id),
  course_id TEXT NOT NULL REFERENCES courses(id),
  name TEXT NOT NULL,
  year_number INTEGER NOT NULL,
  capacity INTEGER,
  room TEXT,
  class_teacher_id TEXT REFERENCES teachers(id),
  
  -- Audit fields
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT
);

-- 11. Subjects
CREATE TABLE IF NOT EXISTS subjects (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id),
  course_id TEXT NOT NULL REFERENCES courses(id),
  subject_code TEXT NOT NULL,
  subject_name TEXT NOT NULL,
  credits INTEGER,
  semester INTEGER,
  
  -- Audit fields
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_institution ON users(institution_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_courses_institution ON courses(institution_id);
CREATE INDEX IF NOT EXISTS idx_courses_department ON courses(department_id);
CREATE INDEX IF NOT EXISTS idx_departments_institution ON departments(institution_id);
CREATE INDEX IF NOT EXISTS idx_sections_institution ON sections(institution_id);
CREATE INDEX IF NOT EXISTS idx_subjects_institution ON subjects(institution_id);
CREATE INDEX IF NOT EXISTS idx_academic_years_institution ON academic_years(institution_id);

-- 12. Teachers
CREATE TABLE IF NOT EXISTS teachers (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id),
  user_id TEXT REFERENCES users(id),
  employee_id TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  middle_name TEXT,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  joining_date TEXT,
  designation TEXT,
  department TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT
);

-- 13. Students
CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id),
  user_id TEXT REFERENCES users(id),
  admission_number TEXT UNIQUE NOT NULL,
  roll_number TEXT,
  first_name TEXT NOT NULL,
  middle_name TEXT,
  last_name TEXT,
  gender TEXT,
  date_of_birth TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  photo TEXT,
  admission_date TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT
);

-- 13b. Guardians
CREATE TABLE IF NOT EXISTS guardians (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id),
  user_id TEXT REFERENCES users(id),
  name TEXT NOT NULL,
  relationship TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  occupation TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT
);

-- 14. Academic Calendar
CREATE TABLE IF NOT EXISTS academic_calendar (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id),
  name TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  type TEXT NOT NULL, -- 'holiday', 'event', 'exam', 'vacation'
  description TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT
);

-- 15. Timetable Slots
CREATE TABLE IF NOT EXISTS timetable_slots (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id),
  name TEXT NOT NULL, -- e.g., 'Period 1', 'Lunch'
  start_time TEXT NOT NULL, -- e.g., '09:00'
  end_time TEXT NOT NULL, -- e.g., '10:00'
  slot_type TEXT NOT NULL DEFAULT 'period', -- 'period', 'break'
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT
);

-- 16. Weekly Timetable
CREATE TABLE IF NOT EXISTS weekly_timetable (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id),
  academic_year_id TEXT NOT NULL REFERENCES academic_years(id),
  teacher_id TEXT REFERENCES teachers(id),
  subject_id TEXT NOT NULL REFERENCES subjects(id),
  section_id TEXT NOT NULL REFERENCES sections(id),
  slot_id TEXT NOT NULL REFERENCES timetable_slots(id),
  day_of_week TEXT NOT NULL, -- 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  UNIQUE(institution_id, academic_year_id, section_id, slot_id, day_of_week)
);

-- 17. Attendance Sessions
CREATE TABLE IF NOT EXISTS attendance_sessions (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id),
  section_id TEXT NOT NULL REFERENCES sections(id),
  subject_id TEXT NOT NULL REFERENCES subjects(id),
  teacher_id TEXT NOT NULL REFERENCES teachers(id),
  slot_id TEXT REFERENCES timetable_slots(id),
  date TEXT NOT NULL, -- 'YYYY-MM-DD'
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT
);

-- 18. Student Attendance
CREATE TABLE IF NOT EXISTS student_attendance (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id),
  session_id TEXT NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES students(id),
  status TEXT NOT NULL, -- 'present', 'absent', 'late', 'excused'
  remarks TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  UNIQUE(session_id, student_id)
);

-- 19. Student Enrollments
CREATE TABLE IF NOT EXISTS student_enrollments (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id),
  academic_year_id TEXT NOT NULL REFERENCES academic_years(id),
  course_id TEXT NOT NULL REFERENCES courses(id),
  section_id TEXT NOT NULL REFERENCES sections(id),
  semester INTEGER,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  UNIQUE(student_id, academic_year_id, semester)
);

-- 20. Exams
CREATE TABLE IF NOT EXISTS exams (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id),
  name TEXT NOT NULL,
  academic_year_id TEXT NOT NULL REFERENCES academic_years(id),
  course_id TEXT NOT NULL REFERENCES courses(id),
  semester INTEGER NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT', -- 'DRAFT', 'PUBLISHED', 'COMPLETED'
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT
);

-- 21. Exam Subjects
CREATE TABLE IF NOT EXISTS exam_subjects (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id),
  exam_id TEXT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  subject_id TEXT NOT NULL REFERENCES subjects(id),
  exam_date TEXT,
  start_time TEXT,
  end_time TEXT,
  max_marks REAL NOT NULL DEFAULT 100.0,
  min_marks REAL NOT NULL DEFAULT 40.0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  UNIQUE(exam_id, subject_id)
);

-- 22. Student Marks
CREATE TABLE IF NOT EXISTS student_marks (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id),
  exam_subject_id TEXT NOT NULL REFERENCES exam_subjects(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES students(id),
  marks_obtained REAL NOT NULL,
  max_marks REAL NOT NULL,
  remarks TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  UNIQUE(exam_subject_id, student_id)
);

-- 23. Teacher Attendance
CREATE TABLE IF NOT EXISTS teacher_attendance (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id),
  teacher_id TEXT NOT NULL REFERENCES teachers(id),
  date TEXT NOT NULL, -- 'YYYY-MM-DD'
  status TEXT NOT NULL, -- 'present', 'absent', 'half_day', 'on_leave'
  remarks TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  UNIQUE(teacher_id, date)
);

-- 24. Announcements
CREATE TABLE IF NOT EXISTS announcements (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  visible_to_students INTEGER DEFAULT 0,
  visible_to_teachers INTEGER DEFAULT 0,
  visible_to_parents INTEGER DEFAULT 0,
  section_id TEXT REFERENCES sections(id),
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT REFERENCES users(id),
  updated_by TEXT REFERENCES users(id)
);

-- 25. Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id),
  user_id TEXT NOT NULL REFERENCES users(id), -- recipient user ID
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL, -- 'exam', 'attendance', 'result', 'announcement', 'general'
  is_read INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  read_at TEXT
);

-- 26. Fee Structures
CREATE TABLE IF NOT EXISTS fee_structures (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id),
  academic_year_id TEXT NOT NULL REFERENCES academic_years(id),
  course_id TEXT NOT NULL REFERENCES courses(id),
  year_number INTEGER NOT NULL,
  fee_type TEXT NOT NULL, -- 'Tuition Fee', 'Exam Fee', 'Library Fee', 'Other'
  amount REAL NOT NULL,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  UNIQUE(institution_id, academic_year_id, course_id, year_number, fee_type)
);

-- 27. Student Fee Records (Student Ledger)
CREATE TABLE IF NOT EXISTS student_fee_records (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id),
  student_id TEXT NOT NULL REFERENCES students(id),
  academic_year_id TEXT NOT NULL REFERENCES academic_years(id),
  course_id TEXT NOT NULL REFERENCES courses(id),
  year_number INTEGER NOT NULL,
  fee_structure_id TEXT REFERENCES fee_structures(id),
  fee_type TEXT NOT NULL,
  total_amount REAL NOT NULL,
  paid_amount REAL DEFAULT 0.0,
  due_date TEXT, -- YYYY-MM-DD
  status TEXT NOT NULL DEFAULT 'UNPAID', -- 'UNPAID', 'PARTIALLY_PAID', 'PAID', 'OVERDUE'
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  UNIQUE(student_id, academic_year_id, course_id, year_number, fee_type)
);

-- 28. Fee Payments
CREATE TABLE IF NOT EXISTS fee_payments (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id),
  student_id TEXT NOT NULL REFERENCES students(id),
  student_fee_record_id TEXT NOT NULL REFERENCES student_fee_records(id) ON DELETE CASCADE,
  amount REAL NOT NULL,
  payment_date TEXT NOT NULL, -- 'YYYY-MM-DD'
  payment_method TEXT NOT NULL, -- 'UPI', 'Cash', 'Bank Transfer', 'Cheque'
  transaction_reference TEXT,
  remarks TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT
);

-- 29. Fee Receipts
CREATE TABLE IF NOT EXISTS fee_receipts (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id),
  payment_id TEXT NOT NULL REFERENCES fee_payments(id) ON DELETE CASCADE,
  receipt_number TEXT NOT NULL, -- e.g. "REC-2026-00001"
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  UNIQUE(institution_id, receipt_number)
);

-- Additional Indexes
CREATE INDEX IF NOT EXISTS idx_teachers_institution ON teachers(institution_id);
CREATE INDEX IF NOT EXISTS idx_students_institution ON students(institution_id);
CREATE INDEX IF NOT EXISTS idx_academic_calendar_institution ON academic_calendar(institution_id);
CREATE INDEX IF NOT EXISTS idx_timetable_slots_institution ON timetable_slots(institution_id);
CREATE INDEX IF NOT EXISTS idx_weekly_timetable_institution ON weekly_timetable(institution_id);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_institution ON attendance_sessions(institution_id);
CREATE INDEX IF NOT EXISTS idx_student_attendance_institution ON student_attendance(institution_id);
CREATE INDEX IF NOT EXISTS idx_exams_institution ON exams(institution_id);
CREATE INDEX IF NOT EXISTS idx_exam_subjects_exam ON exam_subjects(exam_id);
CREATE INDEX IF NOT EXISTS idx_student_marks_student ON student_marks(student_id);
CREATE INDEX IF NOT EXISTS idx_teacher_attendance_institution ON teacher_attendance(institution_id);
CREATE INDEX IF NOT EXISTS idx_teacher_attendance_teacher ON teacher_attendance(teacher_id);
CREATE INDEX IF NOT EXISTS idx_announcements_institution ON announcements(institution_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_fee_structures_institution ON fee_structures(institution_id);
CREATE INDEX IF NOT EXISTS idx_student_fee_records_institution ON student_fee_records(institution_id);
CREATE INDEX IF NOT EXISTS idx_student_fee_records_student ON student_fee_records(student_id);
CREATE INDEX IF NOT EXISTS idx_fee_payments_institution ON fee_payments(institution_id);
CREATE INDEX IF NOT EXISTS idx_fee_payments_student ON fee_payments(student_id);
CREATE INDEX IF NOT EXISTS idx_fee_receipts_institution ON fee_receipts(institution_id);
CREATE INDEX IF NOT EXISTS idx_fee_receipts_payment ON fee_receipts(payment_id);

-- =====================================================
-- HARDENING SPRINT: Additional Performance Indexes
-- =====================================================

-- Attendance: most common query pattern - student + date range
CREATE INDEX IF NOT EXISTS idx_student_attendance_student ON student_attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_student_attendance_session ON student_attendance(session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_section_date ON attendance_sessions(section_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_teacher ON attendance_sessions(teacher_id);

-- Marks: fast lookup by exam_subject
CREATE INDEX IF NOT EXISTS idx_student_marks_exam_subject ON student_marks(exam_subject_id);

-- Notifications: user inbox query (unread first)
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_institution ON notifications(institution_id);

-- Audit logs: timestamp-based pagination
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_module ON audit_logs(module);

-- Weekly timetable: teacher schedule lookup
CREATE INDEX IF NOT EXISTS idx_weekly_timetable_teacher ON weekly_timetable(teacher_id);
CREATE INDEX IF NOT EXISTS idx_weekly_timetable_section ON weekly_timetable(section_id);

-- Fee payments: chronological + student lookup
CREATE INDEX IF NOT EXISTS idx_fee_payments_date ON fee_payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_fee_payments_record ON fee_payments(student_fee_record_id);

-- Enrollments: section-based queries
CREATE INDEX IF NOT EXISTS idx_enrollments_section ON student_enrollments(section_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON student_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_year ON student_enrollments(academic_year_id);

-- Guardians: parent portal lookup
CREATE INDEX IF NOT EXISTS idx_guardians_student ON guardians(student_id);
CREATE INDEX IF NOT EXISTS idx_guardians_user ON guardians(user_id);

-- Exams: course + year filtering
CREATE INDEX IF NOT EXISTS idx_exams_course ON exams(course_id);
CREATE INDEX IF NOT EXISTS idx_exams_year ON exams(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_exam_subjects_institution ON exam_subjects(institution_id);

-- 30. Teacher Subject Assignments
CREATE TABLE IF NOT EXISTS teacher_subject_assignments (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL REFERENCES teachers(id),
  subject_id TEXT NOT NULL REFERENCES subjects(id),
  course_id TEXT NOT NULL REFERENCES courses(id),
  section_id TEXT NOT NULL REFERENCES sections(id),
  academic_year_id TEXT NOT NULL REFERENCES academic_years(id),
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  UNIQUE(teacher_id, subject_id, course_id, section_id, academic_year_id)
);

CREATE INDEX IF NOT EXISTS idx_teacher_assignments_teacher ON teacher_subject_assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_section ON teacher_subject_assignments(section_id);

-- 31. Unified Documents
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  name TEXT NOT NULL,
  folder TEXT DEFAULT 'General',
  file_key TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT,
  uploaded_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT DEFAULT (datetime('now')),
  is_active INTEGER DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_documents_entity ON documents(entity_type, entity_id);

-- 32. Unified Notes
CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  author_id TEXT NOT NULL REFERENCES users(id),
  author_name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  is_active INTEGER DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_notes_entity ON notes(entity_type, entity_id);

-- 33. Subject Lesson Plans
CREATE TABLE IF NOT EXISTS subject_lesson_plans (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL REFERENCES subjects(id),
  unit_number TEXT NOT NULL,       -- E.g. 'Unit I', 'Chapter 3'
  topic_title TEXT NOT NULL,
  topic_description TEXT,
  planned_hours INTEGER NOT NULL DEFAULT 1,
  completed_hours INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',   -- 'pending', 'in_progress', 'completed'
  completed_at TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_lesson_plans_subject ON subject_lesson_plans(subject_id);

-- 34. Subject Assessments
CREATE TABLE IF NOT EXISTS subject_assessments (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL REFERENCES subjects(id),
  name TEXT NOT NULL,              -- E.g. 'Midterm Exam', 'Assignment 1', 'Quiz 3'
  assessment_type TEXT NOT NULL,   -- 'quiz', 'assignment', 'internal_test', 'lab_eval', 'project', 'final_exam'
  max_marks INTEGER NOT NULL DEFAULT 100,
  weightage_percent INTEGER NOT NULL DEFAULT 0,
  due_date TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_assessments_subject ON subject_assessments(subject_id);

-- 35. Teaching Allocations
CREATE TABLE IF NOT EXISTS teaching_allocations (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id),
  academic_year_id TEXT NOT NULL REFERENCES academic_years(id),
  department_id TEXT NOT NULL REFERENCES departments(id),
  program_id TEXT NOT NULL REFERENCES courses(id),
  semester INTEGER NOT NULL,
  year_number INTEGER NOT NULL,
  section_id TEXT NOT NULL REFERENCES sections(id),
  subject_id TEXT NOT NULL REFERENCES subjects(id),
  teacher_id TEXT NOT NULL REFERENCES teachers(id),
  classes_per_week INTEGER DEFAULT 4,
  theory_hours REAL DEFAULT 0.0,
  practical_hours REAL DEFAULT 0.0,
  tutorial_hours REAL DEFAULT 0.0,
  mentoring_hours REAL DEFAULT 0.0,
  admin_hours REAL DEFAULT 0.0,
  primary_teacher INTEGER DEFAULT 1,
  status TEXT DEFAULT 'Active',
  start_date TEXT,
  end_date TEXT,
  remarks TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  created_by TEXT,
  updated_by TEXT,
  UNIQUE(teacher_id, subject_id, section_id, academic_year_id)
);

CREATE INDEX IF NOT EXISTS idx_allocations_teacher ON teaching_allocations(teacher_id);
CREATE INDEX IF NOT EXISTS idx_allocations_section ON teaching_allocations(section_id);
CREATE INDEX IF NOT EXISTS idx_allocations_subject ON teaching_allocations(subject_id);
CREATE INDEX IF NOT EXISTS idx_allocations_year ON teaching_allocations(academic_year_id);

-- 36. System Settings
CREATE TABLE IF NOT EXISTS system_settings (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id),
  category TEXT NOT NULL,
  setting_key TEXT NOT NULL,
  setting_value TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  updated_by TEXT REFERENCES users(id),
  UNIQUE(institution_id, category, setting_key)
);

CREATE INDEX IF NOT EXISTS idx_settings_institution ON system_settings(institution_id);

-- 37. Unified Approvals Queue
CREATE TABLE IF NOT EXISTS approvals (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id),
  requester_id TEXT NOT NULL REFERENCES users(id),
  approval_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  payload TEXT,
  status TEXT DEFAULT 'Pending',
  remarks TEXT,
  approver_id TEXT REFERENCES users(id),
  approved_rejected_at TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  created_by TEXT REFERENCES users(id),
  updated_by TEXT REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_approvals_institution ON approvals(institution_id);
CREATE INDEX IF NOT EXISTS idx_approvals_status ON approvals(status);
CREATE INDEX IF NOT EXISTS idx_approvals_entity ON approvals(entity_type, entity_id);

-- 38. Academic Year Rollover Logs
CREATE TABLE IF NOT EXISTS academic_year_rollover_logs (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id),
  source_year_id TEXT REFERENCES academic_years(id),
  target_year_id TEXT NOT NULL REFERENCES academic_years(id),
  checklist TEXT NOT NULL,
  status TEXT NOT NULL,
  log_output TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  created_by TEXT REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_rollover_logs_institution ON academic_year_rollover_logs(institution_id);

-- 39. Visitor Register
CREATE TABLE IF NOT EXISTS visitors (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id),
  name TEXT NOT NULL,
  purpose TEXT NOT NULL,
  host_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  in_time TEXT NOT NULL,
  out_time TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_visitors_institution ON visitors(institution_id);

-- 40. Assets & Inventory
CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  assigned_to TEXT,
  room TEXT,
  condition TEXT NOT NULL DEFAULT 'Good',
  purchase_date TEXT,
  value REAL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_assets_institution ON assets(institution_id);

-- 41. Alumni Database
CREATE TABLE IF NOT EXISTS alumni (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id),
  student_id TEXT REFERENCES students(id),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  graduation_year INTEGER NOT NULL,
  current_status TEXT,
  institution TEXT,
  contact TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_alumni_institution ON alumni(institution_id);









