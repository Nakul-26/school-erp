-- Phase D: Elective Registration (college readiness)
-- Purely additive: one new table recording a student's chosen elective subjects per
-- semester. Nothing here alters subjects.is_elective, courses.electives_enabled, exams,
-- or enrollments — schools that never enable electives are completely unaffected.

CREATE TABLE IF NOT EXISTS student_electives (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  academic_year_id TEXT NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
  semester INTEGER NOT NULL,
  subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'REGISTERED' CHECK(status IN ('REGISTERED', 'WITHDRAWN')),
  registered_at TEXT DEFAULT (datetime('now')),
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  created_by TEXT,
  updated_by TEXT,
  UNIQUE(student_id, academic_year_id, semester, subject_id)
);

CREATE INDEX IF NOT EXISTS idx_student_electives_student ON student_electives(student_id, academic_year_id, semester);
CREATE INDEX IF NOT EXISTS idx_student_electives_offering ON student_electives(course_id, academic_year_id, semester, subject_id);
