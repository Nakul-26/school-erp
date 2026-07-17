-- Migration: Communication Module Upgrade

-- 1. Ensure direct_messages exists and alter it
CREATE TABLE IF NOT EXISTS direct_messages (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL,
  sender_id TEXT NOT NULL REFERENCES users(id),
  receiver_id TEXT NOT NULL REFERENCES users(id),
  message TEXT NOT NULL,
  is_read INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Add new columns to direct_messages
ALTER TABLE direct_messages ADD COLUMN subject TEXT;
ALTER TABLE direct_messages ADD COLUMN attachment_url TEXT;
ALTER TABLE direct_messages ADD COLUMN message_type TEXT DEFAULT 'chat';

-- 2. Create broadcasts table
CREATE TABLE IF NOT EXISTS broadcasts (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id),
  created_by TEXT NOT NULL REFERENCES users(id),
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  priority TEXT DEFAULT 'normal',
  recipient_type TEXT NOT NULL,
  recipient_filter TEXT,
  channel TEXT DEFAULT 'erp',
  status TEXT DEFAULT 'draft',
  expires_at TEXT,
  sent_at TEXT,
  scheduled_at TEXT,
  total_recipients INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  read_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  is_active INTEGER DEFAULT 1
);

-- 3. Create broadcast_recipients table
CREATE TABLE IF NOT EXISTS broadcast_recipients (
  id TEXT PRIMARY KEY,
  broadcast_id TEXT NOT NULL REFERENCES broadcasts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  is_read INTEGER DEFAULT 0,
  read_at TEXT,
  delivered_at TEXT DEFAULT (datetime('now')),
  UNIQUE(broadcast_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_broadcast_recipients_user ON broadcast_recipients(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_broadcast_recipients_broadcast ON broadcast_recipients(broadcast_id);

-- 4. Create broadcast_attachments table
CREATE TABLE IF NOT EXISTS broadcast_attachments (
  id TEXT PRIMARY KEY,
  broadcast_id TEXT NOT NULL REFERENCES broadcasts(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  mime_type TEXT,
  size_bytes INTEGER,
  created_at TEXT DEFAULT (datetime('now'))
);

-- 5. Create message_templates table
CREATE TABLE IF NOT EXISTS message_templates (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id),
  name TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
  created_by TEXT REFERENCES users(id),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
