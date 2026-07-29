-- Migration: Module 13 Central Audit Logging Framework

ALTER TABLE audit_logs ADD COLUMN institution_id TEXT REFERENCES institutions(id);
ALTER TABLE audit_logs ADD COLUMN user_name TEXT;
ALTER TABLE audit_logs ADD COLUMN user_role TEXT;
ALTER TABLE audit_logs ADD COLUMN entity_type TEXT;
ALTER TABLE audit_logs ADD COLUMN entity_id TEXT;
ALTER TABLE audit_logs ADD COLUMN event_name TEXT;
ALTER TABLE audit_logs ADD COLUMN before_json TEXT;
ALTER TABLE audit_logs ADD COLUMN after_json TEXT;
ALTER TABLE audit_logs ADD COLUMN ip_address TEXT;
ALTER TABLE audit_logs ADD COLUMN user_agent TEXT;
ALTER TABLE audit_logs ADD COLUMN request_id TEXT;
ALTER TABLE audit_logs ADD COLUMN status TEXT DEFAULT 'SUCCESS';
ALTER TABLE audit_logs ADD COLUMN reason TEXT;

-- Indexes for audit query performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_inst ON audit_logs(institution_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_module ON audit_logs(module);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event ON audit_logs(event_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_req ON audit_logs(request_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_status ON audit_logs(status);
