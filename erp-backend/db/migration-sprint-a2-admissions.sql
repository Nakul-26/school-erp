-- Sprint A2: Admission Management
CREATE TABLE IF NOT EXISTS admission_inquiries (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id),
  student_name TEXT NOT NULL,
  parent_name TEXT NOT NULL,
  parent_phone TEXT NOT NULL,
  parent_email TEXT,
  date_of_birth TEXT,
  applying_for_class TEXT NOT NULL,
  academic_year_id TEXT REFERENCES academic_years(id),
  source TEXT DEFAULT 'Walk-in',
  notes TEXT,
  status TEXT DEFAULT 'New',
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  created_by TEXT REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS admission_applications (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id),
  inquiry_id TEXT REFERENCES admission_inquiries(id),
  application_number TEXT NOT NULL,
  student_first_name TEXT NOT NULL,
  student_last_name TEXT NOT NULL,
  date_of_birth TEXT,
  gender TEXT,
  applying_for_course_id TEXT REFERENCES courses(id),
  academic_year_id TEXT NOT NULL REFERENCES academic_years(id),
  parent_name TEXT NOT NULL,
  parent_phone TEXT NOT NULL,
  parent_email TEXT,
  previous_school TEXT,
  previous_class TEXT,
  status TEXT DEFAULT 'Submitted',
  rejection_reason TEXT,
  approved_by TEXT REFERENCES users(id),
  approved_at TEXT,
  converted_student_id TEXT REFERENCES students(id),
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  created_by TEXT REFERENCES users(id),
  UNIQUE(institution_id, application_number)
);

CREATE INDEX IF NOT EXISTS idx_admission_inquiries_institution ON admission_inquiries(institution_id);
CREATE INDEX IF NOT EXISTS idx_admission_inquiries_status ON admission_inquiries(status);
CREATE INDEX IF NOT EXISTS idx_admission_applications_institution ON admission_applications(institution_id);
CREATE INDEX IF NOT EXISTS idx_admission_applications_status ON admission_applications(status);
