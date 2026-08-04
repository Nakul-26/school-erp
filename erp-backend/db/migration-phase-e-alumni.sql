-- Phase E item 4b: Alumni events + soft-delete/audit columns + auto-population support.
ALTER TABLE alumni ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1;
ALTER TABLE alumni ADD COLUMN updated_at TEXT DEFAULT (datetime('now'));
ALTER TABLE alumni ADD COLUMN deleted_at TEXT;
ALTER TABLE alumni ADD COLUMN created_by TEXT;
ALTER TABLE alumni ADD COLUMN updated_by TEXT;

CREATE TABLE IF NOT EXISTS alumni_events (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'reunion' CHECK(event_type IN ('reunion','webinar','fundraiser','mentorship','other')),
  start_date TEXT NOT NULL,
  end_date TEXT,
  location TEXT,
  description TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT
);

CREATE TABLE IF NOT EXISTS alumni_event_rsvps (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES alumni_events(id) ON DELETE CASCADE,
  alumni_id TEXT NOT NULL REFERENCES alumni(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'INTERESTED' CHECK(status IN ('INTERESTED','GOING','DECLINED')),
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(event_id, alumni_id)
);

CREATE INDEX IF NOT EXISTS idx_alumni_events_inst ON alumni_events(institution_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_alumni_event_rsvps_event ON alumni_event_rsvps(event_id);
