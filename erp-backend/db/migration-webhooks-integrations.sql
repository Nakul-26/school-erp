-- Migration: Module 17 Webhooks & External Integrations Infrastructure

-- 1. Integrations Registry Table
CREATE TABLE IF NOT EXISTS integrations (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id),
  name TEXT NOT NULL,
  provider TEXT NOT NULL, -- CustomWebhook, Moodle, GoogleWorkspace, Microsoft365, Razorpay, Stripe, LDAP, SAML, GenericREST
  type TEXT NOT NULL, -- OUTBOUND_WEBHOOK, INBOUND_REST, OAUTH2
  status TEXT DEFAULT 'ACTIVE', -- ACTIVE, INACTIVE, DEGRADED
  base_url TEXT,
  auth_type TEXT DEFAULT 'NONE', -- NONE, BEARER_TOKEN, API_KEY, HMAC_SECRET, OAUTH2
  rate_limit_rpm INTEGER DEFAULT 60,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 2. Encrypted Integration Credentials Table
CREATE TABLE IF NOT EXISTS integration_credentials (
  id TEXT PRIMARY KEY,
  integration_id TEXT NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  institution_id TEXT NOT NULL REFERENCES institutions(id),
  credential_type TEXT NOT NULL, -- API_KEY, OAUTH_TOKEN, CLIENT_SECRET, SHARED_SECRET
  encrypted_secret TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 3. Webhook Subscriptions Table
CREATE TABLE IF NOT EXISTS webhook_subscriptions (
  id TEXT PRIMARY KEY,
  integration_id TEXT REFERENCES integrations(id) ON DELETE CASCADE,
  institution_id TEXT NOT NULL REFERENCES institutions(id),
  name TEXT NOT NULL,
  event_type TEXT NOT NULL, -- StudentCreated, AttendanceMarked, FeePaid, ExamPublished, DocumentUploaded, NotificationDelivered, *
  target_url TEXT NOT NULL,
  secret TEXT NOT NULL, -- Shared secret for HMAC SHA-256 signing
  filter_rules_json TEXT, -- JSON rules to filter payloads
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 4. Webhook Deliveries & DLQ Table
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id TEXT PRIMARY KEY,
  subscription_id TEXT REFERENCES webhook_subscriptions(id) ON DELETE SET NULL,
  integration_id TEXT REFERENCES integrations(id) ON DELETE SET NULL,
  institution_id TEXT NOT NULL REFERENCES institutions(id),
  event_type TEXT NOT NULL,
  target_url TEXT NOT NULL,
  signature TEXT,
  request_headers_json TEXT,
  request_body_json TEXT,
  response_status INTEGER,
  response_body TEXT,
  duration_ms INTEGER DEFAULT 0,
  attempt INTEGER DEFAULT 1,
  max_attempts INTEGER DEFAULT 3,
  status TEXT DEFAULT 'PENDING', -- PENDING, SUCCESS, FAILED, RETRYING, DLQ
  next_retry_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_integrations_inst ON integrations(institution_id);
CREATE INDEX IF NOT EXISTS idx_webhook_subs_inst ON webhook_subscriptions(institution_id, event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_deliv_sub ON webhook_deliveries(subscription_id, status);
CREATE INDEX IF NOT EXISTS idx_webhook_deliv_inst ON webhook_deliveries(institution_id, created_at);
