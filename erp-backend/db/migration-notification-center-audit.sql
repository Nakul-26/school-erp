-- Migration: Module 12 Notification Center Audit

-- 1. Enhance Notifications Table
ALTER TABLE notifications ADD COLUMN recipient_type TEXT DEFAULT 'USER';
ALTER TABLE notifications ADD COLUMN channel TEXT DEFAULT 'in_app';
ALTER TABLE notifications ADD COLUMN template_id TEXT REFERENCES notification_templates(id);
ALTER TABLE notifications ADD COLUMN status TEXT DEFAULT 'DELIVERED'; -- PENDING, QUEUED, SENDING, DELIVERED, FAILED, READ, ARCHIVED, DEAD_LETTER
ALTER TABLE notifications ADD COLUMN priority TEXT DEFAULT 'NORMAL'; -- LOW, NORMAL, HIGH, URGENT
ALTER TABLE notifications ADD COLUMN payload_json TEXT;
ALTER TABLE notifications ADD COLUMN scheduled_at TEXT;
ALTER TABLE notifications ADD COLUMN sent_at TEXT;
ALTER TABLE notifications ADD COLUMN failed_at TEXT;
ALTER TABLE notifications ADD COLUMN failure_reason TEXT;
ALTER TABLE notifications ADD COLUMN retry_count INTEGER DEFAULT 0;

-- 2. Notification Templates Table
CREATE TABLE IF NOT EXISTS notification_templates (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id),
  name TEXT NOT NULL,
  event_type TEXT NOT NULL,
  channel TEXT DEFAULT 'all', -- email, sms, whatsapp, push, in_app, all
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  variables_json TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 3. Notification Queue Table
CREATE TABLE IF NOT EXISTS notification_queue (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id),
  notification_id TEXT REFERENCES notifications(id),
  recipient_id TEXT NOT NULL REFERENCES users(id),
  channel TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  status TEXT DEFAULT 'PENDING', -- PENDING, QUEUED, PROCESSING, DELIVERED, FAILED, DEAD_LETTER
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  next_retry_at TEXT,
  error_message TEXT,
  scheduled_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 4. Notification Preferences Table
CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  email_enabled INTEGER DEFAULT 1,
  sms_enabled INTEGER DEFAULT 1,
  whatsapp_enabled INTEGER DEFAULT 1,
  push_enabled INTEGER DEFAULT 1,
  in_app_enabled INTEGER DEFAULT 1,
  quiet_hours_start TEXT,
  quiet_hours_end TEXT,
  language TEXT DEFAULT 'en',
  timezone TEXT DEFAULT 'Asia/Kolkata',
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 5. Immutable Notification Audit Logs
CREATE TABLE IF NOT EXISTS notification_logs (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id),
  notification_id TEXT REFERENCES notifications(id),
  provider TEXT NOT NULL, -- RESEND, FAST2SMS, TWILIO, META_WHATSAPP, FCM_PUSH, IN_APP
  provider_message_id TEXT,
  channel TEXT NOT NULL,
  status TEXT NOT NULL,
  response_payload TEXT,
  latency_ms INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notification_queue_status ON notification_queue(status, next_retry_at);
CREATE INDEX IF NOT EXISTS idx_notification_templates_event ON notification_templates(institution_id, event_type);
CREATE INDEX IF NOT EXISTS idx_notification_logs_notification ON notification_logs(notification_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_institution ON notification_logs(institution_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
