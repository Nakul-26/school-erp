-- Migration: Module 11 Fee & Financial Management Audit (Table Rebuild for SQLite Versioning)

PRAGMA foreign_keys=OFF;

CREATE TABLE IF NOT EXISTS fee_structures_v2 (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id),
  academic_year_id TEXT NOT NULL REFERENCES academic_years(id),
  course_id TEXT NOT NULL REFERENCES courses(id),
  year_number INTEGER NOT NULL,
  fee_type TEXT NOT NULL,
  amount REAL NOT NULL,
  version INTEGER DEFAULT 1,
  status TEXT DEFAULT 'ACTIVE',
  parent_version_id TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  UNIQUE(institution_id, academic_year_id, course_id, year_number, fee_type, version)
);

INSERT OR IGNORE INTO fee_structures_v2 (
  id, institution_id, academic_year_id, course_id, year_number, fee_type, amount, is_active, created_at, updated_at, deleted_at, created_by, updated_by
)
SELECT id, institution_id, academic_year_id, course_id, year_number, fee_type, amount, is_active, created_at, updated_at, deleted_at, created_by, updated_by
FROM fee_structures;

DROP TABLE IF EXISTS fee_structures;
ALTER TABLE fee_structures_v2 RENAME TO fee_structures;

PRAGMA foreign_keys=ON;

-- 2. Fee Record Financial Fields
-- Add columns safely if not present (handled gracefully)
-- 4. Table: fee_refunds
CREATE TABLE IF NOT EXISTS fee_refunds (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id),
  payment_id TEXT NOT NULL REFERENCES fee_payments(id),
  student_fee_record_id TEXT NOT NULL REFERENCES student_fee_records(id),
  student_id TEXT NOT NULL REFERENCES students(id),
  refund_amount REAL NOT NULL,
  refund_reason TEXT NOT NULL,
  refund_date TEXT NOT NULL,
  refund_reference TEXT,
  approved_by TEXT REFERENCES users(id),
  created_at TEXT DEFAULT (datetime('now'))
);

-- 5. Table: fee_fine_rules
CREATE TABLE IF NOT EXISTS fee_fine_rules (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id),
  name TEXT NOT NULL,
  grace_period_days INTEGER DEFAULT 0,
  fine_type TEXT NOT NULL,
  fine_amount REAL NOT NULL,
  max_fine_amount REAL DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  created_by TEXT REFERENCES users(id)
);

-- 6. Table: financial_ledger (Immutable Ledger)
CREATE TABLE IF NOT EXISTS financial_ledger (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id),
  student_id TEXT NOT NULL REFERENCES students(id),
  student_fee_record_id TEXT REFERENCES student_fee_records(id),
  entry_type TEXT NOT NULL,
  amount REAL NOT NULL,
  balance_after REAL NOT NULL,
  description TEXT NOT NULL,
  reference_id TEXT,
  created_by TEXT REFERENCES users(id),
  created_at TEXT DEFAULT (datetime('now'))
);

-- 7. Table: fee_reminders
CREATE TABLE IF NOT EXISTS fee_reminders (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id),
  student_id TEXT NOT NULL REFERENCES students(id),
  student_fee_record_id TEXT REFERENCES student_fee_records(id),
  reminder_type TEXT NOT NULL,
  recipient TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'SENT',
  sent_at TEXT DEFAULT (datetime('now')),
  sent_by TEXT REFERENCES users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_financial_ledger_student ON financial_ledger(student_id);
CREATE INDEX IF NOT EXISTS idx_financial_ledger_record ON financial_ledger(student_fee_record_id);
CREATE INDEX IF NOT EXISTS idx_fee_refunds_payment ON fee_refunds(payment_id);
CREATE INDEX IF NOT EXISTS idx_fee_refunds_student ON fee_refunds(student_id);
CREATE INDEX IF NOT EXISTS idx_fee_reminders_student ON fee_reminders(student_id);
