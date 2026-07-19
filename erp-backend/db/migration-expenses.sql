-- Migration: Create expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id),
  date TEXT NOT NULL,
  category TEXT NOT NULL CHECK(category IN ('Utilities', 'Stationery', 'Salaries', 'Transport', 'Maintenance', 'Others')),
  description TEXT NOT NULL,
  amount REAL NOT NULL CHECK(amount > 0),
  payment_method TEXT NOT NULL CHECK(payment_method IN ('Cash', 'Bank Transfer', 'Cheque', 'UPI')),
  recorded_by TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('PAID', 'PENDING')) DEFAULT 'PAID',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  created_by TEXT,
  updated_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_expenses_institution ON expenses(institution_id, date);
