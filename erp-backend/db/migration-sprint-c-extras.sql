-- Sprint C1: Basic Payroll
CREATE TABLE IF NOT EXISTS salary_structures (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id),
  teacher_id TEXT NOT NULL REFERENCES teachers(id),
  basic_salary REAL NOT NULL DEFAULT 0,
  da REAL DEFAULT 0,
  hra REAL DEFAULT 0,
  other_allowances REAL DEFAULT 0,
  pf_deduction REAL DEFAULT 0,
  tds_deduction REAL DEFAULT 0,
  other_deductions REAL DEFAULT 0,
  effective_from TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  created_by TEXT REFERENCES users(id),
  UNIQUE(teacher_id)
);

CREATE TABLE IF NOT EXISTS payroll_runs (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id),
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  status TEXT DEFAULT 'Draft',      -- 'Draft', 'Finalized'
  total_gross REAL DEFAULT 0,
  total_net REAL DEFAULT 0,
  generated_by TEXT REFERENCES users(id),
  finalized_at TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(institution_id, month, year)
);

CREATE TABLE IF NOT EXISTS payslips (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id),
  payroll_run_id TEXT NOT NULL REFERENCES payroll_runs(id),
  teacher_id TEXT NOT NULL REFERENCES teachers(id),
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  working_days INTEGER NOT NULL,
  present_days INTEGER NOT NULL,
  leave_days REAL DEFAULT 0,
  lop_days REAL DEFAULT 0,
  basic_salary REAL NOT NULL,
  da REAL DEFAULT 0,
  hra REAL DEFAULT 0,
  other_allowances REAL DEFAULT 0,
  gross_salary REAL NOT NULL,
  pf_deduction REAL DEFAULT 0,
  tds_deduction REAL DEFAULT 0,
  lop_deduction REAL DEFAULT 0,
  other_deductions REAL DEFAULT 0,
  net_salary REAL NOT NULL,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(payroll_run_id, teacher_id)
);

-- Sprint C3: Student Leave Applications
CREATE TABLE IF NOT EXISTS student_leave_applications (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id),
  student_id TEXT NOT NULL REFERENCES students(id),
  from_date TEXT NOT NULL,
  to_date TEXT NOT NULL,
  days_count INTEGER NOT NULL,
  reason TEXT NOT NULL,
  applied_by TEXT NOT NULL,          -- 'student' or 'parent'
  status TEXT DEFAULT 'Pending',     -- 'Pending', 'Approved', 'Rejected'
  reviewed_by TEXT REFERENCES users(id),
  reviewed_at TEXT,
  remarks TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  created_by TEXT REFERENCES users(id)
);

-- Sprint C4: Homework
CREATE TABLE IF NOT EXISTS homework (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id),
  section_id TEXT NOT NULL REFERENCES sections(id),
  subject_id TEXT NOT NULL REFERENCES subjects(id),
  teacher_id TEXT NOT NULL REFERENCES teachers(id),
  title TEXT NOT NULL,
  description TEXT,
  due_date TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  created_by TEXT REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_salary_structures_teacher ON salary_structures(teacher_id);
CREATE INDEX IF NOT EXISTS idx_payslips_payroll ON payslips(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_student_leaves_student ON student_leave_applications(student_id);
CREATE INDEX IF NOT EXISTS idx_homework_section ON homework(section_id);
