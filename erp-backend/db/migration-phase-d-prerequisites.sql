-- Phase D: Course Prerequisites (college readiness)
-- Purely additive: one new mapping table, no changes to existing tables/columns.
-- Institutions that never define a link are completely unaffected — schools included.

CREATE TABLE IF NOT EXISTS subject_prerequisites (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  prerequisite_subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  created_by TEXT,
  CHECK(subject_id != prerequisite_subject_id),
  UNIQUE(subject_id, prerequisite_subject_id)
);

CREATE INDEX IF NOT EXISTS idx_subject_prerequisites_subject ON subject_prerequisites(subject_id);
CREATE INDEX IF NOT EXISTS idx_subject_prerequisites_prereq ON subject_prerequisites(prerequisite_subject_id);
