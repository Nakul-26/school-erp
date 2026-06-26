-- Migration file: Academic Year Status and Rollover logging for Sprint 1.6

-- 1. Add status column to academic_years table
ALTER TABLE academic_years ADD COLUMN status TEXT DEFAULT 'Draft';

-- 2. Update status of existing academic years
UPDATE academic_years SET status = 'Active' WHERE is_current = 1;
UPDATE academic_years SET status = 'Archived' WHERE is_current = 0;

-- 3. Create academic_year_rollover_logs table
CREATE TABLE IF NOT EXISTS academic_year_rollover_logs (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id),
  source_year_id TEXT REFERENCES academic_years(id),
  target_year_id TEXT NOT NULL REFERENCES academic_years(id),
  checklist TEXT NOT NULL,                         -- JSON array of configurations copied, e.g. ["departments", "courses", "sections"]
  status TEXT NOT NULL,                            -- 'SUCCESS', 'SIMULATION', 'FAILED'
  log_output TEXT,                                 -- Text descriptions of actions taken
  created_at TEXT DEFAULT (datetime('now')),
  created_by TEXT REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_rollover_logs_institution ON academic_year_rollover_logs(institution_id);
