-- Migration file: Create generic documents and notes tables, migrate existing data, and drop old tables

-- 1. Create generic documents table
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,      -- 'student', 'teacher', 'section', 'subject', 'department', 'exam'
  entity_id TEXT NOT NULL,        -- Pointer to target entity ID
  name TEXT NOT NULL,             -- File name
  folder TEXT DEFAULT 'General',  -- Categorization folder
  file_key TEXT NOT NULL,         -- R2 key
  file_size INTEGER NOT NULL,     -- File size in bytes
  mime_type TEXT,                 -- File type header
  uploaded_by TEXT NOT NULL,      -- User ID of uploader
  created_at TEXT DEFAULT (datetime('now')),
  is_active INTEGER DEFAULT 1,
  FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_documents_entity ON documents(entity_type, entity_id);

-- 2. Create generic notes table
CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,      -- 'student', 'teacher', 'section', 'subject'
  entity_id TEXT NOT NULL,
  author_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  is_active INTEGER DEFAULT 1,
  FOREIGN KEY (author_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_notes_entity ON notes(entity_type, entity_id);

-- 3. Migrate student_notes -> notes (Joining students table to get institution_id)
INSERT INTO notes (id, institution_id, entity_type, entity_id, author_id, author_name, content, created_at, is_active)
SELECT n.id, s.institution_id, 'student', n.student_id, n.author_id, n.author_name, n.content, n.created_at, n.is_active
FROM student_notes n
JOIN students s ON s.id = n.student_id;

-- 4. Migrate teacher_notes -> notes (Joining teachers table to get institution_id)
INSERT INTO notes (id, institution_id, entity_type, entity_id, author_id, author_name, content, created_at, is_active)
SELECT n.id, t.institution_id, 'teacher', n.teacher_id, n.author_id, n.author_name, n.content, n.created_at, n.is_active
FROM teacher_notes n
JOIN teachers t ON t.id = n.teacher_id;

-- 5. Migrate student_documents -> documents (document_type mapped to folder)
INSERT INTO documents (id, institution_id, entity_type, entity_id, name, folder, file_key, file_size, mime_type, uploaded_by, created_at, is_active)
SELECT d.id, s.institution_id, 'student', d.student_id, d.name, d.document_type, d.file_key, d.file_size, 'application/octet-stream', d.uploaded_by, d.uploaded_at, d.is_active
FROM student_documents d
JOIN students s ON s.id = d.student_id;

-- 6. Migrate teacher_documents -> documents
INSERT INTO documents (id, institution_id, entity_type, entity_id, name, folder, file_key, file_size, mime_type, uploaded_by, created_at, is_active)
SELECT d.id, t.institution_id, 'teacher', d.teacher_id, d.name, d.document_type, d.file_key, d.file_size, 'application/octet-stream', d.uploaded_by, d.uploaded_at, d.is_active
FROM teacher_documents d
JOIN teachers t ON t.id = d.teacher_id;

-- 7. Migrate section_documents -> documents
INSERT INTO documents (id, institution_id, entity_type, entity_id, name, folder, file_key, file_size, mime_type, uploaded_by, created_at, is_active)
SELECT d.id, s.institution_id, 'section', d.section_id, d.name, d.folder, d.file_key, d.file_size, 'application/octet-stream', d.uploaded_by, d.uploaded_at, d.is_active
FROM section_documents d
JOIN sections s ON s.id = d.section_id;

-- 8. Clean up legacy tables
DROP TABLE IF EXISTS student_notes;
DROP TABLE IF EXISTS student_documents;
DROP TABLE IF EXISTS teacher_notes;
DROP TABLE IF EXISTS teacher_documents;
DROP TABLE IF EXISTS section_documents;
