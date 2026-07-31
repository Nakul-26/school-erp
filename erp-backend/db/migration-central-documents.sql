-- Migration: Module 15 Central Document & File Management Infrastructure

-- 1. Upgrade existing documents table with central document platform columns
ALTER TABLE documents ADD COLUMN category TEXT DEFAULT 'General';
ALTER TABLE documents ADD COLUMN original_filename TEXT DEFAULT '';
ALTER TABLE documents ADD COLUMN stored_filename TEXT DEFAULT '';
ALTER TABLE documents ADD COLUMN extension TEXT DEFAULT '';
ALTER TABLE documents ADD COLUMN size_bytes INTEGER DEFAULT 0;
ALTER TABLE documents ADD COLUMN checksum_sha256 TEXT DEFAULT '';
ALTER TABLE documents ADD COLUMN storage_provider TEXT DEFAULT 'R2';
ALTER TABLE documents ADD COLUMN storage_key TEXT DEFAULT '';
ALTER TABLE documents ADD COLUMN version INTEGER DEFAULT 1;
ALTER TABLE documents ADD COLUMN status TEXT DEFAULT 'AVAILABLE';
ALTER TABLE documents ADD COLUMN updated_at TEXT DEFAULT (datetime('now'));
ALTER TABLE documents ADD COLUMN deleted_at TEXT;

-- Backfill legacy records if any
UPDATE documents SET original_filename = COALESCE(NULLIF(original_filename, ''), name, 'document') WHERE original_filename = '' OR original_filename IS NULL;
UPDATE documents SET stored_filename = COALESCE(NULLIF(stored_filename, ''), file_key, id) WHERE stored_filename = '' OR stored_filename IS NULL;
UPDATE documents SET storage_key = COALESCE(NULLIF(storage_key, ''), file_key, id) WHERE storage_key = '' OR storage_key IS NULL;
UPDATE documents SET size_bytes = COALESCE(file_size, size_bytes, 0) WHERE size_bytes = 0 OR size_bytes IS NULL;
UPDATE documents SET category = COALESCE(folder, 'General') WHERE category = 'General' OR category IS NULL;

-- 2. Document Version History Table
CREATE TABLE IF NOT EXISTS document_versions (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  original_filename TEXT NOT NULL,
  stored_filename TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  checksum_sha256 TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  uploaded_by TEXT NOT NULL REFERENCES users(id),
  change_summary TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_documents_inst ON documents(institution_id);
CREATE INDEX IF NOT EXISTS idx_documents_entity ON documents(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_checksum ON documents(checksum_sha256);
CREATE INDEX IF NOT EXISTS idx_document_versions_doc ON document_versions(document_id);
