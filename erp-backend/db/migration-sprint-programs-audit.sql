-- Migration: Programs/Courses Database Audit Fixes
-- Add degree_type and duration_unit columns to courses table

ALTER TABLE courses ADD COLUMN degree_type TEXT DEFAULT 'UG';
ALTER TABLE courses ADD COLUMN duration_unit TEXT DEFAULT 'Years';
