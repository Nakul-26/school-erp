-- Migration: Add qualification and experience columns to teachers table
ALTER TABLE teachers ADD COLUMN qualification TEXT;
ALTER TABLE teachers ADD COLUMN experience TEXT;
