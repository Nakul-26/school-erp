-- Migration: Academic Year Integrity Constraints
-- Adds a DB-level partial unique index to enforce:
--   1. Only one is_current=1 academic year per institution at any time.
--   2. Only one Active status academic year per institution at any time.
--
-- SQLite supports partial (WHERE-clause) unique indexes which give us this
-- constraint without breaking soft-deleted or draft/archived rows.
--
-- NOTE: Run this migration AFTER cleaning up any existing data violations.
--   To check for violations run:
--     SELECT institution_id, COUNT(*) FROM academic_years
--     WHERE is_current = 1 AND is_active = 1
--     GROUP BY institution_id HAVING COUNT(*) > 1;

-- 1. Enforce: at most one current academic year per institution
CREATE UNIQUE INDEX IF NOT EXISTS uq_academic_years_current_per_institution
  ON academic_years(institution_id)
  WHERE is_current = 1 AND is_active = 1;

-- 2. Enforce: at most one Active academic year per institution
CREATE UNIQUE INDEX IF NOT EXISTS uq_academic_years_active_status_per_institution
  ON academic_years(institution_id)
  WHERE status = 'Active' AND is_active = 1;
