-- ============================================
-- College ERP - D1 Schema (multi-tenant)
-- ============================================

CREATE TABLE IF NOT EXISTS colleges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  address TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  college_id INTEGER NOT NULL REFERENCES colleges(id),
  role TEXT NOT NULL CHECK (role IN ('super_admin','admin','teacher','student','parent')),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  password_hash TEXT NOT NULL,
  reset_token TEXT,
  reset_expires TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(college_id, email)
);

CREATE TABLE IF NOT EXISTS courses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  college_id INTEGER NOT NULL REFERENCES colleges(id),
  name TEXT NOT NULL,
  duration_years INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  college_id INTEGER NOT NULL REFERENCES colleges(id),
  course_id INTEGER NOT NULL REFERENCES courses(id),
  name TEXT NOT NULL,
  year INTEGER NOT NULL,
  academic_year TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  college_id INTEGER NOT NULL REFERENCES colleges(id),
  section_id INTEGER REFERENCES sections(id),
  roll_number TEXT NOT NULL,
  admission_number TEXT,
  date_of_birth TEXT,
  gender TEXT,
  address TEXT,
  guardian_name TEXT,
  guardian_phone TEXT,
  parent_user_id INTEGER REFERENCES users(id),
  admission_date TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','inactive','graduated')),
  UNIQUE(college_id, roll_number)
);

CREATE TABLE IF NOT EXISTS teachers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  college_id INTEGER NOT NULL REFERENCES colleges(id),
  employee_code TEXT,
  department TEXT,
  designation TEXT
);

CREATE TABLE IF NOT EXISTS subjects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  college_id INTEGER NOT NULL REFERENCES colleges(id),
  course_id INTEGER NOT NULL REFERENCES courses(id),
  name TEXT NOT NULL,
  code TEXT,
  semester INTEGER
);

CREATE TABLE IF NOT EXISTS timetable_slots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  college_id INTEGER NOT NULL REFERENCES colleges(id),
  section_id INTEGER NOT NULL REFERENCES sections(id),
  subject_id INTEGER NOT NULL REFERENCES subjects(id),
  teacher_id INTEGER REFERENCES teachers(id),
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  room TEXT
);

CREATE TABLE IF NOT EXISTS attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  college_id INTEGER NOT NULL REFERENCES colleges(id),
  student_id INTEGER NOT NULL REFERENCES students(id),
  section_id INTEGER NOT NULL REFERENCES sections(id),
  subject_id INTEGER REFERENCES subjects(id),
  date TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present','absent','late','excused')),
  marked_by INTEGER REFERENCES users(id),
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(student_id, subject_id, date)
);

CREATE TABLE IF NOT EXISTS fee_structures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  college_id INTEGER NOT NULL REFERENCES colleges(id),
  course_id INTEGER NOT NULL REFERENCES courses(id),
  academic_year TEXT NOT NULL,
  fee_type TEXT NOT NULL,
  amount REAL NOT NULL,
  due_date TEXT
);

CREATE TABLE IF NOT EXISTS fee_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  college_id INTEGER NOT NULL REFERENCES colleges(id),
  student_id INTEGER NOT NULL REFERENCES students(id),
  fee_structure_id INTEGER NOT NULL REFERENCES fee_structures(id),
  amount_due REAL NOT NULL,
  amount_paid REAL DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','partial','paid','overdue')),
  due_date TEXT
);

CREATE TABLE IF NOT EXISTS fee_payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  college_id INTEGER NOT NULL REFERENCES colleges(id),
  fee_record_id INTEGER NOT NULL REFERENCES fee_records(id),
  amount REAL NOT NULL,
  payment_date TEXT NOT NULL,
  payment_mode TEXT,
  reference_number TEXT,
  recorded_by INTEGER REFERENCES users(id),
  receipt_number TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS exams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  college_id INTEGER NOT NULL REFERENCES colleges(id),
  course_id INTEGER NOT NULL REFERENCES courses(id),
  name TEXT NOT NULL,
  academic_year TEXT NOT NULL,
  semester INTEGER
);

CREATE TABLE IF NOT EXISTS exam_marks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  college_id INTEGER NOT NULL REFERENCES colleges(id),
  exam_id INTEGER NOT NULL REFERENCES exams(id),
  student_id INTEGER NOT NULL REFERENCES students(id),
  subject_id INTEGER NOT NULL REFERENCES subjects(id),
  marks_obtained REAL,
  max_marks REAL NOT NULL,
  grade TEXT,
  entered_by INTEGER REFERENCES users(id),
  UNIQUE(exam_id, student_id, subject_id)
);

CREATE TABLE IF NOT EXISTS announcements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  college_id INTEGER NOT NULL REFERENCES colleges(id),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  target_role TEXT DEFAULT 'all' CHECK (target_role IN ('all','student','teacher','parent')),
  target_section_id INTEGER REFERENCES sections(id),
  created_by INTEGER REFERENCES users(id),
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  college_id INTEGER NOT NULL REFERENCES colleges(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  is_read INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_college ON users(college_id);
CREATE INDEX IF NOT EXISTS idx_students_college ON students(college_id);
CREATE INDEX IF NOT EXISTS idx_students_section ON students(section_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON attendance(student_id, date);
CREATE INDEX IF NOT EXISTS idx_fee_records_student ON fee_records(student_id);
CREATE INDEX IF NOT EXISTS idx_exam_marks_student ON exam_marks(exam_id, student_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_timetable_section ON timetable_slots(section_id, day_of_week);
