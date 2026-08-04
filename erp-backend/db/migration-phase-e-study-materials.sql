-- Phase E item 5: LMS / structured study-materials repository (AUDIT_REPORT.md §4.1
-- "LMS / online classes / structured study-materials repository (homework exists but isn't this)")
-- Deliberately its own table (not a repurposed `homework` row, not the generic `documents` table) so
-- access-scoping mirrors homework's section/subject-based teacher/student/parent visibility exactly.

CREATE TABLE IF NOT EXISTS study_materials (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  section_id TEXT NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  teacher_id TEXT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  material_type TEXT NOT NULL DEFAULT 'DOCUMENT' CHECK(material_type IN ('DOCUMENT','VIDEO','LINK','PRESENTATION','OTHER')),
  file_key TEXT,
  external_url TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_study_materials_inst ON study_materials(institution_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_study_materials_section ON study_materials(section_id);
CREATE INDEX IF NOT EXISTS idx_study_materials_subject ON study_materials(subject_id);
