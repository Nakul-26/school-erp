-- Phase E item 3b: Medical/health records (new).
-- students.blood_group / emergency_contact / medical_notes stay as-is (quick-reference summary
-- fields shown at the top of the Health tab); these three tables add structured history underneath.

CREATE TABLE IF NOT EXISTS student_health_visits (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  visit_date TEXT NOT NULL DEFAULT (date('now')),
  reason TEXT NOT NULL,
  diagnosis TEXT,
  treatment TEXT,
  referred_to TEXT,
  follow_up_date TEXT,
  recorded_by TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT
);

CREATE TABLE IF NOT EXISTS student_immunizations (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  vaccine_name TEXT NOT NULL,
  dose_number INTEGER,
  administered_date TEXT,
  next_due_date TEXT,
  administered_by TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT
);

CREATE TABLE IF NOT EXISTS student_health_incidents (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  incident_date TEXT NOT NULL DEFAULT (date('now')),
  incident_type TEXT NOT NULL DEFAULT 'OTHER' CHECK(incident_type IN ('INJURY','ILLNESS','ALLERGY_REACTION','OTHER')),
  description TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'MINOR' CHECK(severity IN ('MINOR','MODERATE','SEVERE')),
  action_taken TEXT,
  parent_notified INTEGER NOT NULL DEFAULT 0,
  recorded_by TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_health_visits_student ON student_health_visits(student_id);
CREATE INDEX IF NOT EXISTS idx_immunizations_student ON student_immunizations(student_id);
CREATE INDEX IF NOT EXISTS idx_health_incidents_student ON student_health_incidents(student_id);
CREATE INDEX IF NOT EXISTS idx_health_visits_inst ON student_health_visits(institution_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_immunizations_inst ON student_immunizations(institution_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_health_incidents_inst ON student_health_incidents(institution_id, deleted_at);
