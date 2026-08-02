-- Phase E item 3a: Hostel/Dormitory management (new — zero prior code existed for this)

CREATE TABLE IF NOT EXISTS hostel_blocks (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  block_type TEXT NOT NULL DEFAULT 'CO_ED' CHECK(block_type IN ('BOYS','GIRLS','CO_ED')),
  warden_name TEXT,
  warden_phone TEXT,
  address TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT
);

CREATE TABLE IF NOT EXISTS hostel_rooms (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  block_id TEXT NOT NULL REFERENCES hostel_blocks(id) ON DELETE CASCADE,
  room_number TEXT NOT NULL,
  floor TEXT,
  capacity INTEGER NOT NULL DEFAULT 1,
  room_type TEXT NOT NULL DEFAULT 'SHARED' CHECK(room_type IN ('SINGLE','SHARED','DORM')),
  monthly_charge REAL NOT NULL DEFAULT 0.0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  UNIQUE(block_id, room_number)
);

CREATE TABLE IF NOT EXISTS hostel_allocations (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  room_id TEXT NOT NULL REFERENCES hostel_rooms(id),
  bed_label TEXT,
  allocated_date TEXT NOT NULL DEFAULT (date('now')),
  vacated_date TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','VACATED')),
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT
);

-- Enforces "one active hostel allocation per student" at the DB level (transport_allocations only
-- enforces this via a plain UNIQUE(student_id), which can't distinguish active from vacated rows).
CREATE UNIQUE INDEX IF NOT EXISTS idx_hostel_alloc_active_student ON hostel_allocations(student_id) WHERE status = 'ACTIVE';
CREATE INDEX IF NOT EXISTS idx_hostel_rooms_block ON hostel_rooms(block_id);
CREATE INDEX IF NOT EXISTS idx_hostel_alloc_room ON hostel_allocations(room_id) WHERE status = 'ACTIVE';
CREATE INDEX IF NOT EXISTS idx_hostel_blocks_inst ON hostel_blocks(institution_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_hostel_rooms_inst ON hostel_rooms(institution_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_hostel_alloc_inst ON hostel_allocations(institution_id, deleted_at);
