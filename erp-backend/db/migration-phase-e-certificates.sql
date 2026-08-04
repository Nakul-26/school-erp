CREATE TABLE IF NOT EXISTS certificate_templates (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'CUSTOM' CHECK(type IN ('ID_CARD','BONAFIDE','TRANSFER_CERTIFICATE','CUSTOM')),
  body_html TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT
);

CREATE TABLE IF NOT EXISTS certificate_issuances (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  template_id TEXT NOT NULL REFERENCES certificate_templates(id),
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  reference_number TEXT NOT NULL,
  rendered_html TEXT NOT NULL,
  issued_by TEXT,
  issued_at TEXT DEFAULT (datetime('now')),
  is_active INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_cert_templates_inst ON certificate_templates(institution_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_cert_issuances_student ON certificate_issuances(student_id);
CREATE INDEX IF NOT EXISTS idx_cert_issuances_inst ON certificate_issuances(institution_id);
