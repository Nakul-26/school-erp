-- Sprint B2: Fee Concessions and Installments
CREATE TABLE IF NOT EXISTS fee_concessions (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id),
  student_fee_record_id TEXT NOT NULL REFERENCES student_fee_records(id),
  student_id TEXT NOT NULL REFERENCES students(id),
  concession_type TEXT NOT NULL,   -- 'Scholarship', 'Sibling', 'Staff Ward', 'Merit', 'Other'
  discount_type TEXT NOT NULL,     -- 'flat', 'percent'
  discount_value REAL NOT NULL,    -- the number entered (e.g. 500 flat or 20 percent)
  discount_amount REAL NOT NULL,   -- computed flat rupee amount
  reason TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  created_by TEXT REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS fee_installments (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id),
  student_fee_record_id TEXT NOT NULL REFERENCES student_fee_records(id),
  student_id TEXT NOT NULL REFERENCES students(id),
  installment_number INTEGER NOT NULL,
  due_date TEXT NOT NULL,
  amount REAL NOT NULL,
  paid_amount REAL DEFAULT 0,
  status TEXT DEFAULT 'Pending',   -- 'Pending', 'Paid', 'Overdue'
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  created_by TEXT REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_fee_concessions_record ON fee_concessions(student_fee_record_id);
CREATE INDEX IF NOT EXISTS idx_fee_concessions_student ON fee_concessions(student_id);
CREATE INDEX IF NOT EXISTS idx_fee_installments_record ON fee_installments(student_fee_record_id);
CREATE INDEX IF NOT EXISTS idx_fee_installments_student ON fee_installments(student_id);
