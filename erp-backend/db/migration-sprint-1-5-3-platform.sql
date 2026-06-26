-- Migration file: Create system_settings and approvals tables for Sprint 1.5.3 Platform Foundation

-- 1. Create system_settings Table
CREATE TABLE IF NOT EXISTS system_settings (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id),
  category TEXT NOT NULL,                         -- 'academic', 'attendance', 'fees', 'branding', 'security', 'notifications'
  setting_key TEXT NOT NULL,                      -- e.g., 'attendance_threshold', 'working_days'
  setting_value TEXT NOT NULL,                    -- JSON string or flat value
  
  -- Metadata
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  updated_by TEXT REFERENCES users(id),
  UNIQUE(institution_id, category, setting_key)
);

CREATE INDEX IF NOT EXISTS idx_settings_institution ON system_settings(institution_id);

-- 2. Create approvals Table (Unified Task Queue)
CREATE TABLE IF NOT EXISTS approvals (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id),
  requester_id TEXT NOT NULL REFERENCES users(id),
  approval_type TEXT NOT NULL,                   -- 'LEAVE_REQUEST', 'ATTENDANCE_CORRECTION', 'FEE_REFUND', 'STUDENT_WITHDRAWAL'
  entity_type TEXT NOT NULL,                     -- Target table name, e.g. 'teacher_leaves', 'attendance_records'
  entity_id TEXT NOT NULL,                       -- Target record ID inside the table
  payload TEXT,                                  -- JSON dump of variables / changes requested
  status TEXT DEFAULT 'Pending',                 -- 'Pending', 'Approved', 'Rejected'
  remarks TEXT,                                  -- Reason or review note
  
  -- Workflow Actor & Time
  approver_id TEXT REFERENCES users(id),
  approved_rejected_at TEXT,
  
  -- Metadata
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  created_by TEXT REFERENCES users(id),
  updated_by TEXT REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_approvals_institution ON approvals(institution_id);
CREATE INDEX IF NOT EXISTS idx_approvals_status ON approvals(status);
CREATE INDEX IF NOT EXISTS idx_approvals_entity ON approvals(entity_type, entity_id);

-- 3. Seed Default Preferences for all existing institutions
INSERT OR IGNORE INTO system_settings (id, institution_id, category, setting_key, setting_value)
SELECT 
  'settings-' || id || '-attendance-threshold', 
  id, 
  'attendance', 
  'attendance_threshold', 
  '75'
FROM institutions;

INSERT OR IGNORE INTO system_settings (id, institution_id, category, setting_key, setting_value)
SELECT 
  'settings-' || id || '-working-days', 
  id, 
  'academic', 
  'working_days', 
  '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]'
FROM institutions;

INSERT OR IGNORE INTO system_settings (id, institution_id, category, setting_key, setting_value)
SELECT 
  'settings-' || id || '-grading-system', 
  id, 
  'academic', 
  'grading_system', 
  '"Percentage"'
FROM institutions;

INSERT OR IGNORE INTO system_settings (id, institution_id, category, setting_key, setting_value)
SELECT 
  'settings-' || id || '-grace-period', 
  id, 
  'attendance', 
  'grace_period_minutes', 
  '15'
FROM institutions;

INSERT OR IGNORE INTO system_settings (id, institution_id, category, setting_key, setting_value)
SELECT 
  'settings-' || id || '-attendance-lock', 
  id, 
  'attendance', 
  'lock_after_hours', 
  '24'
FROM institutions;
