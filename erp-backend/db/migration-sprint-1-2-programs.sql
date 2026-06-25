-- Migration: Sprint 1.2 Programs Configuration Toggles
ALTER TABLE courses ADD COLUMN semester_enabled INTEGER DEFAULT 0;
ALTER TABLE courses ADD COLUMN credit_system_enabled INTEGER DEFAULT 0;
ALTER TABLE courses ADD COLUMN electives_enabled INTEGER DEFAULT 0;
ALTER TABLE courses ADD COLUMN description TEXT;
