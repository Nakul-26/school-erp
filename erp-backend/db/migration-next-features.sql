-- Migration file: Add Health Card columns, Student Notes and Student Documents tables

-- 1. Add health card columns to students table (ignoring duplicates if already exist)
-- In SQLite, we can add them one by one.
ALTER TABLE students ADD COLUMN blood_group TEXT;
ALTER TABLE students ADD COLUMN emergency_contact TEXT;
ALTER TABLE students ADD COLUMN medical_conditions TEXT;
ALTER TABLE students ADD COLUMN allergies TEXT;

-- 2. Create student notes table
CREATE TABLE IF NOT EXISTS student_notes (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id),
  author_id TEXT NOT NULL REFERENCES users(id),
  author_name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  is_active INTEGER DEFAULT 1
);

-- 3. Create student documents table
CREATE TABLE IF NOT EXISTS student_documents (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id),
  name TEXT NOT NULL,
  document_type TEXT NOT NULL,
  file_key TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  uploaded_by TEXT NOT NULL REFERENCES users(id),
  uploaded_at TEXT DEFAULT (datetime('now')),
  is_active INTEGER DEFAULT 1
);
