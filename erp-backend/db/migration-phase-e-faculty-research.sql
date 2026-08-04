-- Phase E item 5: Faculty research/publication tracking (AUDIT_REPORT.md §4.1
-- "Faculty research/publication tracking" - zero prior code). Simple self-contained CRUD:
-- teachers manage their own publication records, HOD/Admin get a read-only roster across all staff.

CREATE TABLE IF NOT EXISTS faculty_publications (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  teacher_id TEXT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  publication_type TEXT NOT NULL DEFAULT 'JOURNAL' CHECK(publication_type IN ('JOURNAL','CONFERENCE','BOOK','BOOK_CHAPTER','PATENT','OTHER')),
  venue_name TEXT,
  publication_date TEXT,
  co_authors TEXT,
  doi_or_url TEXT,
  description TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_faculty_pubs_inst ON faculty_publications(institution_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_faculty_pubs_teacher ON faculty_publications(teacher_id);
