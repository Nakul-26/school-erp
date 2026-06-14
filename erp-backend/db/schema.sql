-- ============================================
-- College ERP - D1 Schema (multi-tenant)
-- ============================================

-- Step 1: Institutions (formerly colleges)
CREATE TABLE IF NOT EXISTS institutions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  institution_type TEXT NOT NULL, -- 'school', 'pu_college', 'degree_college', 'engineering_college'
  
  -- Audit fields
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT
);

-- Step 2: Academic Years
CREATE TABLE IF NOT EXISTS academic_years (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id),
  name TEXT NOT NULL, -- e.g., '2025-26'
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

-- Step 3: Users
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id),
  username TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('super_admin','admin','teacher','student','parent')),
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

-- Step 4: Programs (stored as courses table)
CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id),
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

-- Step 5: Sections
CREATE TABLE IF NOT EXISTS sections (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id),
  academic_year_id TEXT NOT NULL REFERENCES academic_years(id),
  course_id TEXT NOT NULL REFERENCES courses(id),
  name TEXT NOT NULL, -- section name like 'A', 'B'
  year_number INTEGER NOT NULL, -- year like 1, 2, 3
  
  -- Audit fields
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT
);

-- Step 6: Subjects
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

-- Step 7: Students
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
  status TEXT NOT NULL DEFAULT 'ACTIVE', -- APPLIED, ADMITTED, ACTIVE, TRANSFERRED, GRADUATED, DROPPED, ALUMNI
  
  -- Audit fields
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT
);

-- Step 8: Guardians
CREATE TABLE IF NOT EXISTS guardians (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id),
  name TEXT NOT NULL,
  relationship TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  occupation TEXT,
  
  -- Audit fields
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT
);

-- Step 9: Student Documents
CREATE TABLE IF NOT EXISTS student_documents (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id),
  document_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  
  -- Audit fields
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT
);

-- Step 10: Student Enrollments
CREATE TABLE IF NOT EXISTS student_enrollments (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id),
  academic_year_id TEXT NOT NULL REFERENCES academic_years(id),
  course_id TEXT NOT NULL REFERENCES courses(id),
  section_id TEXT NOT NULL REFERENCES sections(id),
  semester INTEGER,
  
  -- Audit fields
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  
  UNIQUE(student_id, academic_year_id, semester)
);

-- Step 11: Teachers
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
  status TEXT NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, ON_LEAVE, RESIGNED, RETIRED
  
  -- Audit fields
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT
);

-- Step 12: Teacher Subject Mapping
CREATE TABLE IF NOT EXISTS teacher_subject_assignments (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL REFERENCES teachers(id),
  subject_id TEXT NOT NULL REFERENCES subjects(id),
  course_id TEXT NOT NULL REFERENCES courses(id),
  section_id TEXT NOT NULL REFERENCES sections(id),
  academic_year_id TEXT NOT NULL REFERENCES academic_years(id),
  
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
CREATE INDEX IF NOT EXISTS idx_courses_institution ON courses(institution_id);
CREATE INDEX IF NOT EXISTS idx_sections_institution ON sections(institution_id);
CREATE INDEX IF NOT EXISTS idx_subjects_institution ON subjects(institution_id);
CREATE INDEX IF NOT EXISTS idx_academic_years_institution ON academic_years(institution_id);

CREATE INDEX IF NOT EXISTS idx_students_institution ON students(institution_id);
CREATE INDEX IF NOT EXISTS idx_students_user ON students(user_id);
CREATE INDEX IF NOT EXISTS idx_guardians_student ON guardians(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON student_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_section ON student_enrollments(section_id);

CREATE INDEX IF NOT EXISTS idx_teachers_institution ON teachers(institution_id);
CREATE INDEX IF NOT EXISTS idx_teachers_user ON teachers(user_id);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_teacher ON teacher_subject_assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_section ON teacher_subject_assignments(section_id);
