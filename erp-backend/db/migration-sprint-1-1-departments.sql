-- Migration: Sprint 1.1 Departments HOD support
ALTER TABLE departments ADD COLUMN head_teacher_id TEXT REFERENCES teachers(id) ON DELETE SET NULL;
