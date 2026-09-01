-- Migration: idempotency-key support for financial/state-transition mutations.
--
-- A client sends an `Idempotency-Key` header on a mutating request (e.g.
-- POST /fees/payments). A retried request that reuses the same key returns
-- the original response instead of re-running the write - protects against
-- double-submission (double-click, a client-side network-timeout retry)
-- creating a duplicate payment/refund/approval. See
-- src/middleware/idempotency.ts for the guard that reads/writes this table.
CREATE TABLE IF NOT EXISTS idempotency_keys (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL,
  scope TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  request_hash TEXT,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed')),
  response_status INTEGER,
  response_body TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  UNIQUE(institution_id, scope, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_idempotency_keys_lookup ON idempotency_keys(institution_id, scope, idempotency_key);
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_created_at ON idempotency_keys(created_at);
