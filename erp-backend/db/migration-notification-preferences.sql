-- Create user notification preferences table
CREATE TABLE IF NOT EXISTS user_notification_preferences (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  preferences TEXT NOT NULL, -- JSON string of preferences: e.g. {"attendance": true, "fees": true, "exams": true, "timetable": true, "events": true, "transport": true}
  updated_at TEXT DEFAULT (datetime('now'))
);
