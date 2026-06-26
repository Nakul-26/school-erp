-- Migration file: Create teaching_allocations table and migrate legacy teacher_subject_assignments data

-- 1. Create teaching_allocations table
CREATE TABLE IF NOT EXISTS teaching_allocations (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id),
  academic_year_id TEXT NOT NULL REFERENCES academic_years(id),
  
  -- Denormalized Structural Helpers
  department_id TEXT NOT NULL REFERENCES departments(id),
  program_id TEXT NOT NULL REFERENCES courses(id),
  semester INTEGER NOT NULL,
  year_number INTEGER NOT NULL,
  
  -- Target Entities
  section_id TEXT NOT NULL REFERENCES sections(id),
  subject_id TEXT NOT NULL REFERENCES subjects(id),
  teacher_id TEXT NOT NULL REFERENCES teachers(id),
  
  -- Load & Allocation Parameters
  classes_per_week INTEGER DEFAULT 4,
  theory_hours REAL DEFAULT 0.0,
  practical_hours REAL DEFAULT 0.0,
  tutorial_hours REAL DEFAULT 0.0,
  mentoring_hours REAL DEFAULT 0.0,
  admin_hours REAL DEFAULT 0.0,
  
  primary_teacher INTEGER DEFAULT 1,              -- 1 = Yes, 0 = Assistant
  status TEXT DEFAULT 'Active',                     -- 'Draft', 'Pending Approval', 'Active', 'Completed', 'Archived'
  start_date TEXT,
  end_date TEXT,
  remarks TEXT,
  
  -- Metadata
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  created_by TEXT,
  updated_by TEXT,
  UNIQUE(teacher_id, subject_id, section_id, academic_year_id)
);

CREATE INDEX IF NOT EXISTS idx_allocations_teacher ON teaching_allocations(teacher_id);
CREATE INDEX IF NOT EXISTS idx_allocations_section ON teaching_allocations(section_id);
CREATE INDEX IF NOT EXISTS idx_allocations_subject ON teaching_allocations(subject_id);
CREATE INDEX IF NOT EXISTS idx_allocations_year ON teaching_allocations(academic_year_id);

-- 2. Port existing teacher_subject_assignments mappings to teaching_allocations
-- Join subjects, courses, and sections to populate denormalized semester, year_number, and department_id
INSERT OR IGNORE INTO teaching_allocations (
  id, institution_id, academic_year_id, department_id, program_id, semester, year_number,
  section_id, subject_id, teacher_id, classes_per_week, theory_hours, practical_hours,
  tutorial_hours, mentoring_hours, admin_hours, primary_teacher, status, is_active,
  created_at, updated_at
)
SELECT 
  tsa.id,
  t.institution_id,
  tsa.academic_year_id,
  c.department_id,
  tsa.course_id,
  COALESCE(sub.semester, 1),
  COALESCE(sec.year_number, 1),
  tsa.section_id,
  tsa.subject_id,
  tsa.teacher_id,
  4, -- default classes_per_week
  3.0, -- default theory_hours
  0.0, -- default practical_hours
  0.0, -- default tutorial_hours
  0.0, -- default mentoring_hours
  0.0, -- default admin_hours
  1, -- primary_teacher = true
  'Active',
  tsa.is_active,
  tsa.created_at,
  tsa.updated_at
FROM teacher_subject_assignments tsa
JOIN teachers t ON t.id = tsa.teacher_id
JOIN courses c ON c.id = tsa.course_id
LEFT JOIN subjects sub ON sub.id = tsa.subject_id
LEFT JOIN sections sec ON sec.id = tsa.section_id;
