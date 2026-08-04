-- Phase E item 5: General ledger / double-entry accounting (AUDIT_REPORT.md §4.1 "General ledger /
-- double-entry accounting (current Finance page is income/expense logging, not a chart-of-accounts)").
-- Fully additive alongside the existing Finance/expenses pages - a real chart of accounts + journal
-- entries where every entry must balance (sum(debit) == sum(credit)) before it can be posted.

CREATE TABLE IF NOT EXISTS gl_accounts (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK(account_type IN ('ASSET','LIABILITY','EQUITY','INCOME','EXPENSE')),
  parent_account_id TEXT REFERENCES gl_accounts(id) ON DELETE SET NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  UNIQUE(institution_id, code)
);
CREATE INDEX IF NOT EXISTS idx_gl_accounts_inst ON gl_accounts(institution_id, deleted_at);

CREATE TABLE IF NOT EXISTS gl_journal_entries (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  entry_number TEXT NOT NULL,
  entry_date TEXT NOT NULL DEFAULT (date('now')),
  reference TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','POSTED','VOID')),
  posted_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_gl_journal_inst ON gl_journal_entries(institution_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_gl_journal_date ON gl_journal_entries(institution_id, entry_date);

CREATE TABLE IF NOT EXISTS gl_journal_lines (
  id TEXT PRIMARY KEY,
  journal_entry_id TEXT NOT NULL REFERENCES gl_journal_entries(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL REFERENCES gl_accounts(id) ON DELETE RESTRICT,
  debit_amount REAL NOT NULL DEFAULT 0.0,
  credit_amount REAL NOT NULL DEFAULT 0.0,
  memo TEXT,
  line_order INTEGER NOT NULL DEFAULT 0,
  CHECK (debit_amount >= 0 AND credit_amount >= 0),
  CHECK (NOT (debit_amount > 0 AND credit_amount > 0))
);
CREATE INDEX IF NOT EXISTS idx_gl_lines_entry ON gl_journal_lines(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_gl_lines_account ON gl_journal_lines(account_id);
