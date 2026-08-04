-- Phase E item 5: Canteen / meal plan management (AUDIT_REPORT.md §4.1 "Canteen / meal plans (zero code exists)")
-- Additive, zero impact on schools that don't use it: menu items -> subscription-based meal plans ->
-- per-student subscriptions -> monthly billing into student_fee_records (mirrors the transport/hostel pattern).

CREATE TABLE IF NOT EXISTS canteen_menu_items (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General' CHECK(category IN ('Breakfast','Lunch','Snacks','Dinner','Beverages','General')),
  price REAL NOT NULL DEFAULT 0.0,
  is_available INTEGER NOT NULL DEFAULT 1,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_canteen_menu_inst ON canteen_menu_items(institution_id, deleted_at);

CREATE TABLE IF NOT EXISTS canteen_meal_plans (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  monthly_price REAL NOT NULL DEFAULT 0.0,
  meal_types TEXT NOT NULL DEFAULT 'Lunch',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_canteen_plans_inst ON canteen_meal_plans(institution_id, deleted_at);

-- Partial unique index (same technique as hostel_allocations): a student can only have one ACTIVE
-- subscription at a time, but can resubscribe (new row) after cancelling a previous one.
CREATE TABLE IF NOT EXISTS canteen_subscriptions (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  meal_plan_id TEXT NOT NULL REFERENCES canteen_meal_plans(id) ON DELETE RESTRICT,
  start_date TEXT NOT NULL DEFAULT (date('now')),
  end_date TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','CANCELLED','EXPIRED')),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_canteen_subs_inst ON canteen_subscriptions(institution_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_canteen_subs_student ON canteen_subscriptions(student_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_canteen_subs_active_per_student
  ON canteen_subscriptions(student_id)
  WHERE status = 'ACTIVE';
