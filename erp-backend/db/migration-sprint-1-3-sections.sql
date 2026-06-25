-- Migration: Sprint 1.3 Sections
ALTER TABLE sections ADD COLUMN capacity INTEGER;
ALTER TABLE sections ADD COLUMN room TEXT;
ALTER TABLE sections ADD COLUMN class_teacher_id TEXT REFERENCES teachers(id);
