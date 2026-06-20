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
  username TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  reset_token TEXT,
  reset_expires TEXT,
  
  -- Audit fields
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  
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
  last_name TEXT NOT NULL,
  gender TEXT,
  date_of_birth TEXT,
  email TEXT,
  phone TEXT,
  admission_date TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
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


