-- Sprint A1: Leave Management
CREATE TABLE IF NOT EXISTS leave_types (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id),
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  days_per_year INTEGER NOT NULL DEFAULT 10,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(institution_id, code)
);

CREATE TABLE IF NOT EXISTS leave_balances (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL,
  teacher_id TEXT NOT NULL REFERENCES teachers(id),
  leave_type_id TEXT NOT NULL REFERENCES leave_types(id),
  academic_year_id TEXT NOT NULL REFERENCES academic_years(id),
  total_days INTEGER NOT NULL,
  used_days REAL DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(teacher_id, leave_type_id, academic_year_id)
);

CREATE TABLE IF NOT EXISTS leave_applications (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id),
  teacher_id TEXT NOT NULL REFERENCES teachers(id),
  leave_type_id TEXT NOT NULL REFERENCES leave_types(id),
  academic_year_id TEXT NOT NULL REFERENCES academic_years(id),
  from_date TEXT NOT NULL,
  to_date TEXT NOT NULL,
  days_count REAL NOT NULL,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'Pending',
  approved_by TEXT REFERENCES users(id),
  approved_at TEXT,
  remarks TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  created_by TEXT REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_leave_types_institution ON leave_types(institution_id);
CREATE INDEX IF NOT EXISTS idx_leave_balances_teacher ON leave_balances(teacher_id);
CREATE INDEX IF NOT EXISTS idx_leave_applications_institution ON leave_applications(institution_id);
CREATE INDEX IF NOT EXISTS idx_leave_applications_teacher ON leave_applications(teacher_id);
CREATE INDEX IF NOT EXISTS idx_leave_applications_status ON leave_applications(status);
