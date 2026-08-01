-- Atomic per-institution, per-year receipt sequence counter.
-- Replaces the previous "COUNT(*) then +1" approach in fees.service.ts,
-- which raced under concurrent payments and could issue duplicate receipt numbers.
CREATE TABLE IF NOT EXISTS fee_receipt_counters (
  institution_id TEXT NOT NULL,
  year TEXT NOT NULL,
  next_seq INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (institution_id, year)
);
