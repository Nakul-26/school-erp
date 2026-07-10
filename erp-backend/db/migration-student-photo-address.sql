-- Migration: Add address and photo columns to students table
ALTER TABLE students ADD COLUMN address TEXT;
ALTER TABLE students ADD COLUMN photo TEXT;
