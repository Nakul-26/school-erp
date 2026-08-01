-- Phase B (DB hardening) — item 1 (continued): backfill the required
-- audit-column set (product-spec/21_database_standards.md §1) on tables that
-- were missing deleted_at/updated_at/updated_by, called out explicitly in
-- AUDIT_REPORT.md as broken soft-delete on money/HR-adjacent tables.
-- SQLite's ALTER TABLE ADD COLUMN cannot be made conditional, but this file
-- only ever runs once per database (tracked in _migrations), and its
-- filename is pre-recorded in schema.sql's baseline ledger for fresh
-- databases that already have these columns from the CREATE TABLE
-- statements — see db/MIGRATIONS.md.

ALTER TABLE homework ADD COLUMN deleted_at TEXT;
ALTER TABLE homework ADD COLUMN updated_by TEXT;

ALTER TABLE leave_applications ADD COLUMN deleted_at TEXT;
ALTER TABLE leave_applications ADD COLUMN updated_by TEXT;

ALTER TABLE payroll_runs ADD COLUMN updated_at TEXT DEFAULT (datetime('now'));
ALTER TABLE payroll_runs ADD COLUMN deleted_at TEXT;
ALTER TABLE payroll_runs ADD COLUMN created_by TEXT;
ALTER TABLE payroll_runs ADD COLUMN updated_by TEXT;

ALTER TABLE payslips ADD COLUMN updated_at TEXT DEFAULT (datetime('now'));
ALTER TABLE payslips ADD COLUMN deleted_at TEXT;
ALTER TABLE payslips ADD COLUMN created_by TEXT;
ALTER TABLE payslips ADD COLUMN updated_by TEXT;

ALTER TABLE student_leave_applications ADD COLUMN updated_at TEXT DEFAULT (datetime('now'));
ALTER TABLE student_leave_applications ADD COLUMN deleted_at TEXT;
ALTER TABLE student_leave_applications ADD COLUMN updated_by TEXT;

CREATE INDEX IF NOT EXISTS idx_homework_inst_deleted ON homework(institution_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_leave_applications_inst_deleted ON leave_applications(institution_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_inst_deleted ON payroll_runs(institution_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_payslips_inst_deleted ON payslips(institution_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_student_leave_applications_inst_deleted ON student_leave_applications(institution_id, deleted_at);
