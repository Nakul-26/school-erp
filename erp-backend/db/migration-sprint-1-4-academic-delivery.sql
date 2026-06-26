-- Migration file: Create subject_lesson_plans and subject_assessments tables for Academic Delivery Workspace

-- 1. Create subject_lesson_plans table
CREATE TABLE IF NOT EXISTS subject_lesson_plans (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL REFERENCES subjects(id),
  unit_number TEXT NOT NULL,       -- E.g. 'Unit I', 'Chapter 3'
  topic_title TEXT NOT NULL,
  topic_description TEXT,
  planned_hours INTEGER NOT NULL DEFAULT 1,
  completed_hours INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',   -- 'pending', 'in_progress', 'completed'
  completed_at TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_lesson_plans_subject ON subject_lesson_plans(subject_id);

-- 2. Create subject_assessments table
CREATE TABLE IF NOT EXISTS subject_assessments (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL REFERENCES subjects(id),
  name TEXT NOT NULL,              -- E.g. 'Midterm Exam', 'Assignment 1', 'Quiz 3'
  assessment_type TEXT NOT NULL,   -- 'quiz', 'assignment', 'internal_test', 'lab_eval', 'project', 'final_exam'
  max_marks INTEGER NOT NULL DEFAULT 100,
  weightage_percent INTEGER NOT NULL DEFAULT 0,
  due_date TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_assessments_subject ON subject_assessments(subject_id);
