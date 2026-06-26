-- Migration: Sprint 1.3.1 Section Workspace Polish
ALTER TABLE announcements ADD COLUMN section_id TEXT REFERENCES sections(id);

CREATE TABLE IF NOT EXISTS section_documents (
  id TEXT PRIMARY KEY,
  section_id TEXT NOT NULL REFERENCES sections(id),
  name TEXT NOT NULL,
  folder TEXT NOT NULL, -- 'Timetable', 'Exam Schedule', 'Projects', 'Circulars', 'Photos', 'Assignments'
  file_key TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  uploaded_by TEXT NOT NULL REFERENCES users(id),
  uploaded_at TEXT DEFAULT (datetime('now')),
  is_active INTEGER DEFAULT 1
);
