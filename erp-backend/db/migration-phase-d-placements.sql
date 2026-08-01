-- Phase D: Placement & Internship Module (college readiness)
-- Purely additive: three new tables, no changes to existing tables/columns.
-- Institutions that never open a drive are completely unaffected — distinct from
-- the staff-hiring JobCenter module, which is unrelated (internal recruitment, not
-- student placement).

CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  industry TEXT,
  website TEXT,
  contact_person TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  description TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT
);

CREATE TABLE IF NOT EXISTS placement_drives (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  drive_type TEXT NOT NULL DEFAULT 'PLACEMENT' CHECK(drive_type IN ('PLACEMENT', 'INTERNSHIP')),
  description TEXT,
  package_amount REAL,
  drive_date TEXT,
  application_deadline TEXT,
  min_cgpa REAL,
  max_backlogs INTEGER,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT', 'OPEN', 'CLOSED', 'COMPLETED')),
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT
);

CREATE TABLE IF NOT EXISTS placement_applications (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  drive_id TEXT NOT NULL REFERENCES placement_drives(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'APPLIED' CHECK(status IN ('APPLIED', 'SHORTLISTED', 'INTERVIEWED', 'OFFERED', 'REJECTED', 'WITHDRAWN')),
  applied_at TEXT DEFAULT (datetime('now')),
  offer_package REAL,
  offer_date TEXT,
  remarks TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  created_by TEXT,
  updated_by TEXT,
  UNIQUE(drive_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_companies_inst ON companies(institution_id);
CREATE INDEX IF NOT EXISTS idx_placement_drives_inst ON placement_drives(institution_id);
CREATE INDEX IF NOT EXISTS idx_placement_drives_course ON placement_drives(course_id);
CREATE INDEX IF NOT EXISTS idx_placement_applications_drive ON placement_applications(drive_id);
CREATE INDEX IF NOT EXISTS idx_placement_applications_student ON placement_applications(student_id);
