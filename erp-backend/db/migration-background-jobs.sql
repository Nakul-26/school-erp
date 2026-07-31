-- Migration: Module 14 Background Jobs & Scheduler Infrastructure

-- 1. Central Background Jobs Table
CREATE TABLE IF NOT EXISTS background_jobs (
  id TEXT PRIMARY KEY,
  job_type TEXT NOT NULL,
  queue_name TEXT NOT NULL DEFAULT 'default',
  payload_json TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, QUEUED, RUNNING, COMPLETED, FAILED, RETRYING, DEAD_LETTER, CANCELLED, PAUSED
  priority TEXT NOT NULL DEFAULT 'NORMAL', -- LOW, NORMAL, HIGH, URGENT
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  scheduled_at TEXT NOT NULL,
  started_at TEXT,
  completed_at TEXT,
  failed_at TEXT,
  next_retry_at TEXT,
  failure_reason TEXT,
  worker_id TEXT,
  created_by TEXT,
  institution_id TEXT NOT NULL REFERENCES institutions(id),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 2. Cron Schedules Table
CREATE TABLE IF NOT EXISTS job_cron_schedules (
  id TEXT PRIMARY KEY,
  job_type TEXT NOT NULL,
  name TEXT NOT NULL,
  cron_expression TEXT NOT NULL, -- e.g. '0 8 * * *', '0 0 * * 1', '0 0 1 * *', '*/5 * * * *', custom
  payload_json TEXT,
  queue_name TEXT DEFAULT 'cron',
  priority TEXT DEFAULT 'NORMAL',
  is_active INTEGER DEFAULT 1,
  institution_id TEXT NOT NULL REFERENCES institutions(id),
  last_run_at TEXT,
  next_run_at TEXT,
  created_by TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 3. Worker Health & Monitoring Table
CREATE TABLE IF NOT EXISTS job_workers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'HEALTHY', -- HEALTHY, BUSY, UNHEALTHY, OFFLINE
  current_job_id TEXT,
  current_job_type TEXT,
  last_heartbeat_at TEXT DEFAULT (datetime('now')),
  cpu_usage_pct REAL DEFAULT 0.0,
  memory_usage_mb REAL DEFAULT 0.0,
  jobs_completed_count INTEGER DEFAULT 0,
  jobs_failed_count INTEGER DEFAULT 0,
  institution_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 4. Job Execution History & Metrics Log Table
CREATE TABLE IF NOT EXISTS job_execution_history (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES background_jobs(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL,
  worker_id TEXT NOT NULL,
  attempt_number INTEGER NOT NULL,
  status TEXT NOT NULL, -- SUCCESS, FAILED
  started_at TEXT NOT NULL,
  completed_at TEXT NOT NULL,
  duration_ms INTEGER NOT NULL,
  execution_log TEXT,
  error_message TEXT,
  stack_trace TEXT,
  institution_id TEXT NOT NULL REFERENCES institutions(id),
  created_at TEXT DEFAULT (datetime('now'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_bg_jobs_status ON background_jobs(status, scheduled_at, priority);
CREATE INDEX IF NOT EXISTS idx_bg_jobs_type ON background_jobs(job_type);
CREATE INDEX IF NOT EXISTS idx_bg_jobs_inst ON background_jobs(institution_id);
CREATE INDEX IF NOT EXISTS idx_cron_schedules_inst ON job_cron_schedules(institution_id);
CREATE INDEX IF NOT EXISTS idx_cron_schedules_active ON job_cron_schedules(is_active, next_run_at);
CREATE INDEX IF NOT EXISTS idx_job_workers_heartbeat ON job_workers(last_heartbeat_at, status);
CREATE INDEX IF NOT EXISTS idx_job_exec_history_job ON job_execution_history(job_id);
CREATE INDEX IF NOT EXISTS idx_job_exec_history_inst ON job_execution_history(institution_id);
