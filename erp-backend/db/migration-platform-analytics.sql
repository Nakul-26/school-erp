-- Migration: Module 16 Platform Analytics & Reporting Engine Infrastructure

-- 1. Daily Analytics Warehouse Table
CREATE TABLE IF NOT EXISTS analytics_daily (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id),
  date TEXT NOT NULL, -- YYYY-MM-DD
  total_students INTEGER DEFAULT 0,
  total_teachers INTEGER DEFAULT 0,
  attendance_rate_pct REAL DEFAULT 0.0,
  absent_count INTEGER DEFAULT 0,
  fee_collection_amount REAL DEFAULT 0.0,
  pending_fees_amount REAL DEFAULT 0.0,
  pass_rate_pct REAL DEFAULT 0.0,
  notifications_sent INTEGER DEFAULT 0,
  storage_used_mb REAL DEFAULT 0.0,
  jobs_executed_count INTEGER DEFAULT 0,
  audit_events_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(institution_id, date)
);

-- 2. Monthly Analytics Warehouse Table
CREATE TABLE IF NOT EXISTS analytics_monthly (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id),
  year_month TEXT NOT NULL, -- YYYY-MM
  avg_attendance_pct REAL DEFAULT 0.0,
  total_revenue REAL DEFAULT 0.0,
  new_enrollments INTEGER DEFAULT 0,
  documents_uploaded_count INTEGER DEFAULT 0,
  jobs_executed_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(institution_id, year_month)
);

-- 3. Cached KPI Snapshots Table
CREATE TABLE IF NOT EXISTS analytics_kpis (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id),
  category TEXT NOT NULL, -- Academic, Finance, Platform, Security
  kpi_key TEXT NOT NULL,
  kpi_value REAL NOT NULL,
  previous_value REAL DEFAULT 0.0,
  change_pct REAL DEFAULT 0.0,
  trend TEXT DEFAULT 'STABLE', -- UP, DOWN, STABLE
  unit TEXT DEFAULT '',
  last_updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(institution_id, category, kpi_key)
);

-- 4. Ingested Event Counter Log Table
CREATE TABLE IF NOT EXISTS analytics_events (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id),
  event_type TEXT NOT NULL,
  event_count INTEGER DEFAULT 1,
  date TEXT NOT NULL, -- YYYY-MM-DD
  created_at TEXT DEFAULT (datetime('now'))
);

-- 5. Scheduled Reports Config Table
CREATE TABLE IF NOT EXISTS scheduled_reports (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id),
  name TEXT NOT NULL,
  report_type TEXT NOT NULL, -- AcademicSummary, ExecutiveFinance, SystemOperations, SecurityAudit
  schedule_cron TEXT NOT NULL, -- e.g. '0 8 * * *'
  recipients_json TEXT NOT NULL,
  filters_json TEXT,
  format TEXT DEFAULT 'CSV', -- CSV, JSON
  is_active INTEGER DEFAULT 1,
  last_sent_at TEXT,
  created_by TEXT REFERENCES users(id),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Indexes for fast analytics reads
CREATE INDEX IF NOT EXISTS idx_analytics_daily_date ON analytics_daily(institution_id, date);
CREATE INDEX IF NOT EXISTS idx_analytics_monthly_month ON analytics_monthly(institution_id, year_month);
CREATE INDEX IF NOT EXISTS idx_analytics_kpis_cat ON analytics_kpis(institution_id, category);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(institution_id, event_type, date);
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_inst ON scheduled_reports(institution_id);
