-- Phase D: promote "semester" from a bare int column to a managed entity.
-- Additive only: schools (courses.semester_enabled = 0) never create rows here
-- and are completely unaffected. subjects.semester / exams.semester /
-- student_enrollments.semester remain plain ordinal ints (curriculum-level
-- references), deliberately not migrated to a FK to keep this low-risk.

CREATE TABLE IF NOT EXISTS semesters (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  academic_year_id TEXT NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
  semester_number INTEGER NOT NULL,
  name TEXT NOT NULL,
  start_date TEXT,
  end_date TEXT,
  status TEXT NOT NULL DEFAULT 'Draft' CHECK(status IN ('Draft', 'Active', 'Locked', 'Archived')),
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  UNIQUE(course_id, academic_year_id, semester_number)
);

CREATE INDEX IF NOT EXISTS idx_semesters_inst_deleted ON semesters(institution_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_semesters_course_year ON semesters(course_id, academic_year_id);
