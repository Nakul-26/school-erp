-- Sprint B1: Grade Scale
CREATE TABLE IF NOT EXISTS grade_scales (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id),
  grade TEXT NOT NULL,           -- 'A+', 'A', 'B+', 'B', 'C', 'D', 'F'
  min_percent REAL NOT NULL,
  max_percent REAL NOT NULL,
  grade_point REAL DEFAULT 0,
  remarks TEXT,                  -- 'Outstanding', 'Excellent', 'Pass', 'Fail'
  is_passing INTEGER DEFAULT 1,  -- 0 for F grade
  sort_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(institution_id, grade)
);

CREATE INDEX IF NOT EXISTS idx_grade_scales_institution ON grade_scales(institution_id);
