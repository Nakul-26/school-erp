-- Pre-flight data normalization: the new CHECK constraints below would
-- reject this one pre-existing row (case-mismatch against the canonical
-- value the other 66 rows already use - a real, harmless data-hygiene bug
-- this migration surfaced, not a new distinct status the app supports).
UPDATE students SET status = 'ACTIVE' WHERE status = 'Active';

-- Phase B (DB hardening) -- items 1-2: FK ON DELETE behavior on every
-- foreign key that was missing one (or missing the FK declaration entirely),
-- plus CHECK constraints on enum-like columns that have a strict TypeScript
-- union type. See db/PHASE_B_FK_CHECK_PLAN.md for the full rationale behind
-- each ON DELETE choice.
--
-- SQLite cannot ALTER a column's REFERENCES/CHECK clause in place, so every
-- affected table is rebuilt. D1 enforces `PRAGMA foreign_keys = ON`
-- unconditionally (it cannot be turned off, unlike a plain sqlite3 CLI
-- session), and DROP TABLE on a parent fails while any other existing table
-- still has a live FK constraint naming it - even a table that's about to be
-- deleted itself. So this uses a rename-based sequence per table instead of
-- the textbook drop-then-recreate order:
--   1. CREATE TABLE <t>_new (final schema, referencing real parent names)
--   2. INSERT INTO <t>_new SELECT * FROM <t>            (copy all rows)
--   3. ALTER TABLE <t> RENAME TO <t>_old                 (SQLite auto-updates
--      every OTHER not-yet-rebuilt table's FK text that said
--      "REFERENCES <t>(...)" to say "REFERENCES <t>_old(...)" instead, so
--      those tables stay valid without any manual edits)
--   4. ALTER TABLE <t>_new RENAME TO <t>                 (the real name is
--      now the fully rebuilt table; nothing pointed at "<t>_new" so this
--      rename is unconstrained)
-- After every table has been through that sequence, all 85 "<t>_old"
-- husks are dropped in a precomputed topological order (children's husks
-- before their parents' husks), since the same "no live references" rule
-- applies to dropping them too.

CREATE TABLE users_new (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  profile_photo TEXT,
  reset_token TEXT,
  reset_expires TEXT,
  
  
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  
  UNIQUE(institution_id, username),
  UNIQUE(institution_id, email)
);
INSERT INTO users_new SELECT * FROM users;
ALTER TABLE users RENAME TO users_old;
ALTER TABLE users_new RENAME TO users;

CREATE TABLE teachers_new (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  employee_id TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  middle_name TEXT,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  joining_date TEXT,
  designation TEXT,
  department TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'ON_LEAVE', 'RESIGNED', 'RETIRED')),
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT
, qualification TEXT, experience TEXT);
INSERT INTO teachers_new SELECT * FROM teachers;
ALTER TABLE teachers RENAME TO teachers_old;
ALTER TABLE teachers_new RENAME TO teachers;

CREATE TABLE departments_new (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  description TEXT,
  head_teacher_id TEXT REFERENCES teachers(id) ON DELETE SET NULL,
  
  
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  
  UNIQUE(institution_id, code)
);
INSERT INTO departments_new SELECT * FROM departments;
ALTER TABLE departments RENAME TO departments_old;
ALTER TABLE departments_new RENAME TO departments;

CREATE TABLE courses_new (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  department_id TEXT REFERENCES departments(id) ON DELETE SET NULL,
  course_code TEXT NOT NULL,
  name TEXT NOT NULL,
  duration_years INTEGER NOT NULL,
  semester_enabled INTEGER DEFAULT 0,
  credit_system_enabled INTEGER DEFAULT 0,
  electives_enabled INTEGER DEFAULT 0,
  description TEXT,
  
  
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT
, degree_type TEXT DEFAULT 'UG', duration_unit TEXT DEFAULT 'Years');
INSERT INTO courses_new SELECT * FROM courses;
ALTER TABLE courses RENAME TO courses_old;
ALTER TABLE courses_new RENAME TO courses;

CREATE TABLE academic_years_new (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  is_current INTEGER DEFAULT 0,
  status TEXT DEFAULT 'Draft' CHECK(status IN ('Draft', 'Active', 'Locked', 'Archived')),
  
  
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT
);
INSERT INTO academic_years_new SELECT * FROM academic_years;
ALTER TABLE academic_years RENAME TO academic_years_old;
ALTER TABLE academic_years_new RENAME TO academic_years;

CREATE TABLE fee_structures_new (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  academic_year_id TEXT NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
  year_number INTEGER NOT NULL,
  fee_type TEXT NOT NULL, 
  amount REAL NOT NULL,
  version INTEGER DEFAULT 1,
  status TEXT DEFAULT 'ACTIVE' CHECK(status IN ('DRAFT', 'ACTIVE', 'ARCHIVED')), 
  parent_version_id TEXT REFERENCES fee_structures(id) ON DELETE SET NULL,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  UNIQUE(institution_id, academic_year_id, course_id, year_number, fee_type, version)
);
INSERT INTO fee_structures_new SELECT * FROM fee_structures;
ALTER TABLE fee_structures RENAME TO fee_structures_old;
ALTER TABLE fee_structures_new RENAME TO fee_structures;

CREATE TABLE students_new (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  admission_number TEXT UNIQUE NOT NULL,
  roll_number TEXT,
  first_name TEXT NOT NULL,
  middle_name TEXT,
  last_name TEXT,
  gender TEXT,
  date_of_birth TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  photo TEXT,
  admission_date TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'GRADUATED', 'TRANSFERRED', 'WITHDRAWN', 'SUSPENDED', 'ALUMNI', 'APPLIED', 'ADMITTED')),
  blood_group TEXT,
  emergency_contact TEXT,
  medical_notes TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT
);
INSERT INTO students_new SELECT * FROM students;
ALTER TABLE students RENAME TO students_old;
ALTER TABLE students_new RENAME TO students;

CREATE TABLE integrations_new (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  provider TEXT NOT NULL, 
  type TEXT NOT NULL, 
  status TEXT DEFAULT 'ACTIVE', 
  base_url TEXT,
  auth_type TEXT DEFAULT 'NONE', 
  rate_limit_rpm INTEGER DEFAULT 60,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
INSERT INTO integrations_new SELECT * FROM integrations;
ALTER TABLE integrations RENAME TO integrations_old;
ALTER TABLE integrations_new RENAME TO integrations;

CREATE TABLE subjects_new (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
  subject_code TEXT NOT NULL,
  subject_name TEXT NOT NULL,
  credits INTEGER,
  semester INTEGER,
  is_elective INTEGER DEFAULT 0,
  status TEXT DEFAULT 'ACTIVE',
  description TEXT,
  theory_lab TEXT DEFAULT 'Theory',
  department TEXT,
  weekly_hours INTEGER,
  
  
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT
);
INSERT INTO subjects_new SELECT * FROM subjects;
ALTER TABLE subjects RENAME TO subjects_old;
ALTER TABLE subjects_new RENAME TO subjects;

CREATE TABLE exams_new (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  academic_year_id TEXT NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
  semester INTEGER NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT', 'PUBLISHED', 'COMPLETED')), 
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT
);
INSERT INTO exams_new SELECT * FROM exams;
ALTER TABLE exams RENAME TO exams_old;
ALTER TABLE exams_new RENAME TO exams;

CREATE TABLE timetable_slots_new (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  name TEXT NOT NULL, 
  start_time TEXT NOT NULL, 
  end_time TEXT NOT NULL, 
  slot_type TEXT NOT NULL DEFAULT 'period', 
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT
);
INSERT INTO timetable_slots_new SELECT * FROM timetable_slots;
ALTER TABLE timetable_slots RENAME TO timetable_slots_old;
ALTER TABLE timetable_slots_new RENAME TO timetable_slots;

CREATE TABLE sections_new (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  academic_year_id TEXT NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  year_number INTEGER NOT NULL,
  capacity INTEGER,
  room TEXT,
  class_teacher_id TEXT REFERENCES teachers(id) ON DELETE SET NULL,
  
  
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT
);
INSERT INTO sections_new SELECT * FROM sections;
ALTER TABLE sections RENAME TO sections_old;
ALTER TABLE sections_new RENAME TO sections;

CREATE TABLE notification_templates_new (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  event_type TEXT NOT NULL,
  channel TEXT DEFAULT 'all', 
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  variables_json TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
INSERT INTO notification_templates_new SELECT * FROM notification_templates;
ALTER TABLE notification_templates RENAME TO notification_templates_old;
ALTER TABLE notification_templates_new RENAME TO notification_templates;

CREATE TABLE student_fee_records_new (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  academic_year_id TEXT NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
  year_number INTEGER NOT NULL,
  fee_structure_id TEXT REFERENCES fee_structures(id) ON DELETE SET NULL,
  fee_type TEXT NOT NULL,
  total_amount REAL NOT NULL,
  paid_amount REAL DEFAULT 0.0,
  concession_amount REAL DEFAULT 0.0,
  fine_amount REAL DEFAULT 0.0,
  refund_amount REAL DEFAULT 0.0,
  is_fine_exempt INTEGER DEFAULT 0,
  due_date TEXT, 
  status TEXT NOT NULL DEFAULT 'UNPAID' CHECK(status IN ('UNPAID', 'PARTIALLY_PAID', 'PAID', 'OVERDUE')), 
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  UNIQUE(student_id, academic_year_id, course_id, year_number, fee_type)
);
INSERT INTO student_fee_records_new SELECT * FROM student_fee_records;
ALTER TABLE student_fee_records RENAME TO student_fee_records_old;
ALTER TABLE student_fee_records_new RENAME TO student_fee_records;

CREATE TABLE webhook_subscriptions_new (
  id TEXT PRIMARY KEY,
  integration_id TEXT REFERENCES integrations(id) ON DELETE CASCADE,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  event_type TEXT NOT NULL, 
  target_url TEXT NOT NULL,
  secret TEXT NOT NULL, 
  filter_rules_json TEXT, 
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
INSERT INTO webhook_subscriptions_new SELECT * FROM webhook_subscriptions;
ALTER TABLE webhook_subscriptions RENAME TO webhook_subscriptions_old;
ALTER TABLE webhook_subscriptions_new RENAME TO webhook_subscriptions;

CREATE TABLE transport_routes_new (
      id TEXT PRIMARY KEY,
      institution_id TEXT REFERENCES institutions(id) ON DELETE CASCADE NOT NULL,
      route_name TEXT NOT NULL,
      start_location TEXT,
      end_location TEXT,
      vehicle_number TEXT,
      driver_name TEXT,
      driver_phone TEXT,
      monthly_charge REAL NOT NULL DEFAULT 0.0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );
INSERT INTO transport_routes_new SELECT * FROM transport_routes;
ALTER TABLE transport_routes RENAME TO transport_routes_old;
ALTER TABLE transport_routes_new RENAME TO transport_routes;

CREATE TABLE exam_subjects_new (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  exam_id TEXT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
  exam_date TEXT,
  start_time TEXT,
  end_time TEXT,
  max_marks REAL NOT NULL DEFAULT 100.0,
  min_marks REAL NOT NULL DEFAULT 40.0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  UNIQUE(exam_id, subject_id)
);
INSERT INTO exam_subjects_new SELECT * FROM exam_subjects;
ALTER TABLE exam_subjects RENAME TO exam_subjects_old;
ALTER TABLE exam_subjects_new RENAME TO exam_subjects;

CREATE TABLE attendance_sessions_new (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  section_id TEXT NOT NULL REFERENCES sections(id) ON DELETE RESTRICT,
  subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
  teacher_id TEXT NOT NULL REFERENCES teachers(id) ON DELETE RESTRICT,
  slot_id TEXT REFERENCES timetable_slots(id) ON DELETE SET NULL,
  date TEXT NOT NULL, 
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT
);
INSERT INTO attendance_sessions_new SELECT * FROM attendance_sessions;
ALTER TABLE attendance_sessions RENAME TO attendance_sessions_old;
ALTER TABLE attendance_sessions_new RENAME TO attendance_sessions;

CREATE TABLE payroll_runs_new (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  status TEXT DEFAULT 'Draft' CHECK(status IN ('Draft', 'Finalized')),      
  total_gross REAL DEFAULT 0,
  total_net REAL DEFAULT 0,
  generated_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  finalized_at TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  UNIQUE(institution_id, month, year)
);
INSERT INTO payroll_runs_new SELECT * FROM payroll_runs;
ALTER TABLE payroll_runs RENAME TO payroll_runs_old;
ALTER TABLE payroll_runs_new RENAME TO payroll_runs;

CREATE TABLE notifications_new (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, 
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL, 
  is_read INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  read_at TEXT
, recipient_type TEXT DEFAULT 'USER', channel TEXT DEFAULT 'in_app', template_id TEXT REFERENCES notification_templates(id) ON DELETE SET NULL, status TEXT DEFAULT 'DELIVERED', priority TEXT DEFAULT 'NORMAL', payload_json TEXT, scheduled_at TEXT, sent_at TEXT, failed_at TEXT, failure_reason TEXT, retry_count INTEGER DEFAULT 0);
INSERT INTO notifications_new SELECT * FROM notifications;
ALTER TABLE notifications RENAME TO notifications_old;
ALTER TABLE notifications_new RENAME TO notifications;

CREATE TABLE library_books_new (
      id TEXT PRIMARY KEY,
      institution_id TEXT REFERENCES institutions(id) ON DELETE CASCADE NOT NULL,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      isbn TEXT,
      category TEXT,
      total_copies INTEGER NOT NULL DEFAULT 1,
      available_copies INTEGER NOT NULL DEFAULT 1,
      rack_location TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );
INSERT INTO library_books_new SELECT * FROM library_books;
ALTER TABLE library_books RENAME TO library_books_old;
ALTER TABLE library_books_new RENAME TO library_books;

CREATE TABLE leave_types_new (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  days_per_year INTEGER NOT NULL DEFAULT 10,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(institution_id, code)
);
INSERT INTO leave_types_new SELECT * FROM leave_types;
ALTER TABLE leave_types RENAME TO leave_types_old;
ALTER TABLE leave_types_new RENAME TO leave_types;

CREATE TABLE background_jobs_new (
  id TEXT PRIMARY KEY,
  job_type TEXT NOT NULL,
  queue_name TEXT NOT NULL DEFAULT 'default',
  payload_json TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING', 
  priority TEXT NOT NULL DEFAULT 'NORMAL', 
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  scheduled_at TEXT NOT NULL,
  started_at TEXT,
  completed_at TEXT,
  failed_at TEXT,
  next_retry_at TEXT,
  failure_reason TEXT,
  worker_id TEXT,
  created_by TEXT,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
INSERT INTO background_jobs_new SELECT * FROM background_jobs;
ALTER TABLE background_jobs RENAME TO background_jobs_old;
ALTER TABLE background_jobs_new RENAME TO background_jobs;

CREATE TABLE fee_payments_new (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  student_fee_record_id TEXT NOT NULL REFERENCES student_fee_records(id) ON DELETE CASCADE,
  amount REAL NOT NULL,
  payment_date TEXT NOT NULL, 
  payment_method TEXT NOT NULL, 
  transaction_reference TEXT,
  remarks TEXT,
  status TEXT DEFAULT 'COMPLETED', 
  receipt_number TEXT,
  collected_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT
);
INSERT INTO fee_payments_new SELECT * FROM fee_payments;
ALTER TABLE fee_payments RENAME TO fee_payments_old;
ALTER TABLE fee_payments_new RENAME TO fee_payments;

CREATE TABLE documents_new (
  id TEXT PRIMARY KEY,
  institution_id TEXT REFERENCES institutions(id) ON DELETE CASCADE NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  name TEXT NOT NULL,
  folder TEXT DEFAULT 'General',
  file_key TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT,
  uploaded_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT DEFAULT (datetime('now')),
  is_active INTEGER DEFAULT 1
, category TEXT DEFAULT 'General', original_filename TEXT DEFAULT '', stored_filename TEXT DEFAULT '', extension TEXT DEFAULT '', size_bytes INTEGER DEFAULT 0, checksum_sha256 TEXT DEFAULT '', storage_provider TEXT DEFAULT 'R2', storage_key TEXT DEFAULT '', version INTEGER DEFAULT 1, status TEXT DEFAULT 'AVAILABLE', updated_at TEXT DEFAULT (datetime('now')), deleted_at TEXT);
INSERT INTO documents_new SELECT * FROM documents;
ALTER TABLE documents RENAME TO documents_old;
ALTER TABLE documents_new RENAME TO documents;

CREATE TABLE broadcasts_new (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  priority TEXT DEFAULT 'normal',
  recipient_type TEXT NOT NULL,
  recipient_filter TEXT,
  channel TEXT DEFAULT 'erp',
  status TEXT DEFAULT 'draft',
  expires_at TEXT,
  sent_at TEXT,
  scheduled_at TEXT,
  total_recipients INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  read_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  is_active INTEGER DEFAULT 1
);
INSERT INTO broadcasts_new SELECT * FROM broadcasts;
ALTER TABLE broadcasts RENAME TO broadcasts_old;
ALTER TABLE broadcasts_new RENAME TO broadcasts;

CREATE TABLE admission_inquiries_new (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  parent_name TEXT NOT NULL,
  parent_phone TEXT NOT NULL,
  parent_email TEXT,
  date_of_birth TEXT,
  applying_for_class TEXT NOT NULL,
  academic_year_id TEXT REFERENCES academic_years(id) ON DELETE SET NULL,
  source TEXT DEFAULT 'Walk-in',
  notes TEXT,
  status TEXT DEFAULT 'New' CHECK(status IN ('New', 'Contacted', 'Applied', 'Admitted', 'Rejected')),
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL
);
INSERT INTO admission_inquiries_new SELECT * FROM admission_inquiries;
ALTER TABLE admission_inquiries RENAME TO admission_inquiries_old;
ALTER TABLE admission_inquiries_new RENAME TO admission_inquiries;

CREATE TABLE weekly_timetable_new (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  academic_year_id TEXT NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
  teacher_id TEXT REFERENCES teachers(id) ON DELETE SET NULL,
  subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
  section_id TEXT NOT NULL REFERENCES sections(id) ON DELETE RESTRICT,
  slot_id TEXT NOT NULL REFERENCES timetable_slots(id) ON DELETE RESTRICT,
  day_of_week TEXT NOT NULL, 
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT, room_number TEXT, status TEXT DEFAULT 'Published',
  UNIQUE(institution_id, academic_year_id, section_id, slot_id, day_of_week)
);
INSERT INTO weekly_timetable_new SELECT * FROM weekly_timetable;
ALTER TABLE weekly_timetable RENAME TO weekly_timetable_old;
ALTER TABLE weekly_timetable_new RENAME TO weekly_timetable;

CREATE TABLE webhook_deliveries_new (
  id TEXT PRIMARY KEY,
  subscription_id TEXT REFERENCES webhook_subscriptions(id) ON DELETE SET NULL,
  integration_id TEXT REFERENCES integrations(id) ON DELETE SET NULL,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  target_url TEXT NOT NULL,
  signature TEXT,
  request_headers_json TEXT,
  request_body_json TEXT,
  response_status INTEGER,
  response_body TEXT,
  duration_ms INTEGER DEFAULT 0,
  attempt INTEGER DEFAULT 1,
  max_attempts INTEGER DEFAULT 3,
  status TEXT DEFAULT 'PENDING', 
  next_retry_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
INSERT INTO webhook_deliveries_new SELECT * FROM webhook_deliveries;
ALTER TABLE webhook_deliveries RENAME TO webhook_deliveries_old;
ALTER TABLE webhook_deliveries_new RENAME TO webhook_deliveries;

CREATE TABLE visitors_new (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  purpose TEXT NOT NULL,
  host_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  in_time TEXT NOT NULL,
  out_time TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
INSERT INTO visitors_new SELECT * FROM visitors;
ALTER TABLE visitors RENAME TO visitors_old;
ALTER TABLE visitors_new RENAME TO visitors;

CREATE TABLE user_roles_new (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);
INSERT INTO user_roles_new SELECT * FROM user_roles;
ALTER TABLE user_roles RENAME TO user_roles_old;
ALTER TABLE user_roles_new RENAME TO user_roles;

CREATE TABLE user_notification_preferences_new (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  preferences TEXT NOT NULL, -- JSON string of preferences: e.g. {"attendance": true, "fees": true, "exams": true, "timetable": true, "events": true, "transport": true}
  updated_at TEXT DEFAULT (datetime('now'))
);
INSERT INTO user_notification_preferences_new SELECT * FROM user_notification_preferences;
ALTER TABLE user_notification_preferences RENAME TO user_notification_preferences_old;
ALTER TABLE user_notification_preferences_new RENAME TO user_notification_preferences;

CREATE TABLE transport_allocations_new (
      id TEXT PRIMARY KEY,
      institution_id TEXT REFERENCES institutions(id) ON DELETE CASCADE NOT NULL,
      student_id TEXT NOT NULL,
      route_id TEXT NOT NULL REFERENCES transport_routes(id) ON DELETE RESTRICT,
      pickup_point TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(student_id)
    );
INSERT INTO transport_allocations_new SELECT * FROM transport_allocations;
ALTER TABLE transport_allocations RENAME TO transport_allocations_old;
ALTER TABLE transport_allocations_new RENAME TO transport_allocations;

CREATE TABLE teaching_allocations_new (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  academic_year_id TEXT NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
  department_id TEXT NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
  program_id TEXT NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
  semester INTEGER NOT NULL,
  year_number INTEGER NOT NULL,
  section_id TEXT NOT NULL REFERENCES sections(id) ON DELETE RESTRICT,
  subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
  teacher_id TEXT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  classes_per_week INTEGER DEFAULT 4,
  theory_hours REAL DEFAULT 0.0,
  practical_hours REAL DEFAULT 0.0,
  tutorial_hours REAL DEFAULT 0.0,
  mentoring_hours REAL DEFAULT 0.0,
  admin_hours REAL DEFAULT 0.0,
  primary_teacher INTEGER DEFAULT 1,
  status TEXT DEFAULT 'Active' CHECK(status IN ('Draft', 'Pending Approval', 'Active', 'Completed', 'Archived')),
  start_date TEXT,
  end_date TEXT,
  remarks TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  created_by TEXT,
  updated_by TEXT,
  UNIQUE(teacher_id, subject_id, section_id, academic_year_id)
);
INSERT INTO teaching_allocations_new SELECT * FROM teaching_allocations;
ALTER TABLE teaching_allocations RENAME TO teaching_allocations_old;
ALTER TABLE teaching_allocations_new RENAME TO teaching_allocations;

CREATE TABLE teacher_subject_assignments_new (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
  section_id TEXT NOT NULL REFERENCES sections(id) ON DELETE RESTRICT,
  academic_year_id TEXT NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  UNIQUE(teacher_id, subject_id, course_id, section_id, academic_year_id)
);
INSERT INTO teacher_subject_assignments_new SELECT * FROM teacher_subject_assignments;
ALTER TABLE teacher_subject_assignments RENAME TO teacher_subject_assignments_old;
ALTER TABLE teacher_subject_assignments_new RENAME TO teacher_subject_assignments;

CREATE TABLE teacher_notes_new (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  author_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  is_active INTEGER DEFAULT 1
);
INSERT INTO teacher_notes_new SELECT * FROM teacher_notes;
ALTER TABLE teacher_notes RENAME TO teacher_notes_old;
ALTER TABLE teacher_notes_new RENAME TO teacher_notes;

CREATE TABLE teacher_documents_new (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  document_type TEXT NOT NULL,
  file_key TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  uploaded_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  uploaded_at TEXT DEFAULT (datetime('now')),
  is_active INTEGER DEFAULT 1
);
INSERT INTO teacher_documents_new SELECT * FROM teacher_documents;
ALTER TABLE teacher_documents RENAME TO teacher_documents_old;
ALTER TABLE teacher_documents_new RENAME TO teacher_documents;

CREATE TABLE teacher_attendance_new (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  teacher_id TEXT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  date TEXT NOT NULL, 
  status TEXT NOT NULL CHECK(status IN ('present', 'absent', 'half_day', 'on_leave')), 
  remarks TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  UNIQUE(teacher_id, date)
);
INSERT INTO teacher_attendance_new SELECT * FROM teacher_attendance;
ALTER TABLE teacher_attendance RENAME TO teacher_attendance_old;
ALTER TABLE teacher_attendance_new RENAME TO teacher_attendance;

CREATE TABLE system_settings_new (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  setting_key TEXT NOT NULL,
  setting_value TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  updated_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE(institution_id, category, setting_key)
);
INSERT INTO system_settings_new SELECT * FROM system_settings;
ALTER TABLE system_settings RENAME TO system_settings_old;
ALTER TABLE system_settings_new RENAME TO system_settings;

CREATE TABLE subject_lesson_plans_new (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  unit_number TEXT NOT NULL,       
  topic_title TEXT NOT NULL,
  topic_description TEXT,
  planned_hours INTEGER NOT NULL DEFAULT 1,
  completed_hours INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',   
  completed_at TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
INSERT INTO subject_lesson_plans_new SELECT * FROM subject_lesson_plans;
ALTER TABLE subject_lesson_plans RENAME TO subject_lesson_plans_old;
ALTER TABLE subject_lesson_plans_new RENAME TO subject_lesson_plans;

CREATE TABLE subject_assessments_new (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,              
  assessment_type TEXT NOT NULL,   
  max_marks INTEGER NOT NULL DEFAULT 100,
  weightage_percent INTEGER NOT NULL DEFAULT 0,
  due_date TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);
INSERT INTO subject_assessments_new SELECT * FROM subject_assessments;
ALTER TABLE subject_assessments RENAME TO subject_assessments_old;
ALTER TABLE subject_assessments_new RENAME TO subject_assessments;

CREATE TABLE student_marks_new (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  exam_subject_id TEXT NOT NULL REFERENCES exam_subjects(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  marks_obtained REAL NOT NULL,
  max_marks REAL NOT NULL,
  remarks TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  UNIQUE(exam_subject_id, student_id)
);
INSERT INTO student_marks_new SELECT * FROM student_marks;
ALTER TABLE student_marks RENAME TO student_marks_old;
ALTER TABLE student_marks_new RENAME TO student_marks;

CREATE TABLE student_leave_applications_new (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  from_date TEXT NOT NULL,
  to_date TEXT NOT NULL,
  days_count INTEGER NOT NULL,
  reason TEXT NOT NULL,
  applied_by TEXT NOT NULL,          
  status TEXT DEFAULT 'Pending' CHECK(status IN ('Pending', 'Approved', 'Rejected')),
  reviewed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TEXT,
  remarks TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  updated_by TEXT
);
INSERT INTO student_leave_applications_new SELECT * FROM student_leave_applications;
ALTER TABLE student_leave_applications RENAME TO student_leave_applications_old;
ALTER TABLE student_leave_applications_new RENAME TO student_leave_applications;

CREATE TABLE student_enrollments_new (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  academic_year_id TEXT NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
  section_id TEXT NOT NULL REFERENCES sections(id) ON DELETE RESTRICT,
  semester INTEGER,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  UNIQUE(student_id, academic_year_id, semester)
);
INSERT INTO student_enrollments_new SELECT * FROM student_enrollments;
ALTER TABLE student_enrollments RENAME TO student_enrollments_old;
ALTER TABLE student_enrollments_new RENAME TO student_enrollments;

CREATE TABLE student_attendance_new (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK(status IN ('present', 'absent', 'late', 'medical', 'on_duty', 'excused', 'holiday')), 
  remarks TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  UNIQUE(session_id, student_id)
);
INSERT INTO student_attendance_new SELECT * FROM student_attendance;
ALTER TABLE student_attendance RENAME TO student_attendance_old;
ALTER TABLE student_attendance_new RENAME TO student_attendance;

CREATE TABLE scheduled_reports_new (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  report_type TEXT NOT NULL, 
  schedule_cron TEXT NOT NULL, 
  recipients_json TEXT NOT NULL,
  filters_json TEXT,
  format TEXT DEFAULT 'CSV', 
  is_active INTEGER DEFAULT 1,
  last_sent_at TEXT,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
INSERT INTO scheduled_reports_new SELECT * FROM scheduled_reports;
ALTER TABLE scheduled_reports RENAME TO scheduled_reports_old;
ALTER TABLE scheduled_reports_new RENAME TO scheduled_reports;

CREATE TABLE salary_structures_new (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  teacher_id TEXT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  basic_salary REAL NOT NULL DEFAULT 0,
  da REAL DEFAULT 0,
  hra REAL DEFAULT 0,
  other_allowances REAL DEFAULT 0,
  pf_deduction REAL DEFAULT 0,
  tds_deduction REAL DEFAULT 0,
  other_deductions REAL DEFAULT 0,
  effective_from TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE(teacher_id)
);
INSERT INTO salary_structures_new SELECT * FROM salary_structures;
ALTER TABLE salary_structures RENAME TO salary_structures_old;
ALTER TABLE salary_structures_new RENAME TO salary_structures;

CREATE TABLE push_subscriptions_new (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  is_active INTEGER DEFAULT 1,
  UNIQUE(user_id, endpoint)
);
INSERT INTO push_subscriptions_new SELECT * FROM push_subscriptions;
ALTER TABLE push_subscriptions RENAME TO push_subscriptions_old;
ALTER TABLE push_subscriptions_new RENAME TO push_subscriptions;

CREATE TABLE payslips_new (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  payroll_run_id TEXT NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
  teacher_id TEXT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  working_days INTEGER NOT NULL,
  present_days INTEGER NOT NULL,
  leave_days REAL DEFAULT 0,
  lop_days REAL DEFAULT 0,
  basic_salary REAL NOT NULL,
  da REAL DEFAULT 0,
  hra REAL DEFAULT 0,
  other_allowances REAL DEFAULT 0,
  gross_salary REAL NOT NULL,
  pf_deduction REAL DEFAULT 0,
  tds_deduction REAL DEFAULT 0,
  lop_deduction REAL DEFAULT 0,
  other_deductions REAL DEFAULT 0,
  net_salary REAL NOT NULL,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  UNIQUE(payroll_run_id, teacher_id)
);
INSERT INTO payslips_new SELECT * FROM payslips;
ALTER TABLE payslips RENAME TO payslips_old;
ALTER TABLE payslips_new RENAME TO payslips;

CREATE TABLE notification_queue_new (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  notification_id TEXT REFERENCES notifications(id) ON DELETE SET NULL,
  recipient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  status TEXT DEFAULT 'PENDING', 
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  next_retry_at TEXT,
  error_message TEXT,
  scheduled_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
INSERT INTO notification_queue_new SELECT * FROM notification_queue;
ALTER TABLE notification_queue RENAME TO notification_queue_old;
ALTER TABLE notification_queue_new RENAME TO notification_queue;

CREATE TABLE notification_preferences_new (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  email_enabled INTEGER DEFAULT 1,
  sms_enabled INTEGER DEFAULT 1,
  whatsapp_enabled INTEGER DEFAULT 1,
  push_enabled INTEGER DEFAULT 1,
  in_app_enabled INTEGER DEFAULT 1,
  quiet_hours_start TEXT,
  quiet_hours_end TEXT,
  language TEXT DEFAULT 'en',
  timezone TEXT DEFAULT 'Asia/Kolkata',
  updated_at TEXT DEFAULT (datetime('now'))
);
INSERT INTO notification_preferences_new SELECT * FROM notification_preferences;
ALTER TABLE notification_preferences RENAME TO notification_preferences_old;
ALTER TABLE notification_preferences_new RENAME TO notification_preferences;

CREATE TABLE notification_logs_new (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  notification_id TEXT REFERENCES notifications(id) ON DELETE SET NULL,
  provider TEXT NOT NULL, 
  provider_message_id TEXT,
  channel TEXT NOT NULL,
  status TEXT NOT NULL,
  response_payload TEXT,
  latency_ms INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);
INSERT INTO notification_logs_new SELECT * FROM notification_logs;
ALTER TABLE notification_logs RENAME TO notification_logs_old;
ALTER TABLE notification_logs_new RENAME TO notification_logs;

CREATE TABLE notes_new (
  id TEXT PRIMARY KEY,
  institution_id TEXT REFERENCES institutions(id) ON DELETE CASCADE NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  author_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  is_active INTEGER DEFAULT 1
);
INSERT INTO notes_new SELECT * FROM notes;
ALTER TABLE notes RENAME TO notes_old;
ALTER TABLE notes_new RENAME TO notes;

CREATE TABLE message_templates_new (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
INSERT INTO message_templates_new SELECT * FROM message_templates;
ALTER TABLE message_templates RENAME TO message_templates_old;
ALTER TABLE message_templates_new RENAME TO message_templates;

CREATE TABLE library_transactions_new (
      id TEXT PRIMARY KEY,
      institution_id TEXT REFERENCES institutions(id) ON DELETE CASCADE NOT NULL,
      book_id TEXT NOT NULL REFERENCES library_books(id) ON DELETE RESTRICT,
      student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      issued_by TEXT,
      issue_date TEXT NOT NULL,
      due_date TEXT NOT NULL,
      return_date TEXT,
      fine_amount REAL DEFAULT 0.0,
      fine_status TEXT DEFAULT 'NONE',
      status TEXT DEFAULT 'ISSUED',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );
INSERT INTO library_transactions_new SELECT * FROM library_transactions;
ALTER TABLE library_transactions RENAME TO library_transactions_old;
ALTER TABLE library_transactions_new RENAME TO library_transactions;

CREATE TABLE leave_balances_new (
  id TEXT PRIMARY KEY,
  institution_id TEXT REFERENCES institutions(id) ON DELETE CASCADE NOT NULL,
  teacher_id TEXT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  leave_type_id TEXT NOT NULL REFERENCES leave_types(id) ON DELETE RESTRICT,
  academic_year_id TEXT NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
  total_days INTEGER NOT NULL,
  used_days REAL DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(teacher_id, leave_type_id, academic_year_id)
);
INSERT INTO leave_balances_new SELECT * FROM leave_balances;
ALTER TABLE leave_balances RENAME TO leave_balances_old;
ALTER TABLE leave_balances_new RENAME TO leave_balances;

CREATE TABLE leave_applications_new (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  teacher_id TEXT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  leave_type_id TEXT NOT NULL REFERENCES leave_types(id) ON DELETE RESTRICT,
  academic_year_id TEXT NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
  from_date TEXT NOT NULL,
  to_date TEXT NOT NULL,
  days_count REAL NOT NULL,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'Pending' CHECK(status IN ('Pending', 'Approved', 'Rejected')),
  approved_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  approved_at TEXT,
  remarks TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  deleted_at TEXT,
  updated_by TEXT
);
INSERT INTO leave_applications_new SELECT * FROM leave_applications;
ALTER TABLE leave_applications RENAME TO leave_applications_old;
ALTER TABLE leave_applications_new RENAME TO leave_applications;

CREATE TABLE job_workers_new (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'HEALTHY', 
  current_job_id TEXT,
  current_job_type TEXT,
  last_heartbeat_at TEXT DEFAULT (datetime('now')),
  cpu_usage_pct REAL DEFAULT 0.0,
  memory_usage_mb REAL DEFAULT 0.0,
  jobs_completed_count INTEGER DEFAULT 0,
  jobs_failed_count INTEGER DEFAULT 0,
  institution_id TEXT REFERENCES institutions(id) ON DELETE SET NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
INSERT INTO job_workers_new SELECT * FROM job_workers;
ALTER TABLE job_workers RENAME TO job_workers_old;
ALTER TABLE job_workers_new RENAME TO job_workers;

CREATE TABLE job_execution_history_new (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES background_jobs(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL,
  worker_id TEXT NOT NULL,
  attempt_number INTEGER NOT NULL,
  status TEXT NOT NULL, 
  started_at TEXT NOT NULL,
  completed_at TEXT NOT NULL,
  duration_ms INTEGER NOT NULL,
  execution_log TEXT,
  error_message TEXT,
  stack_trace TEXT,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  created_at TEXT DEFAULT (datetime('now'))
);
INSERT INTO job_execution_history_new SELECT * FROM job_execution_history;
ALTER TABLE job_execution_history RENAME TO job_execution_history_old;
ALTER TABLE job_execution_history_new RENAME TO job_execution_history;

CREATE TABLE job_cron_schedules_new (
  id TEXT PRIMARY KEY,
  job_type TEXT NOT NULL,
  name TEXT NOT NULL,
  cron_expression TEXT NOT NULL, 
  payload_json TEXT,
  queue_name TEXT DEFAULT 'cron',
  priority TEXT DEFAULT 'NORMAL',
  is_active INTEGER DEFAULT 1,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  last_run_at TEXT,
  next_run_at TEXT,
  created_by TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
INSERT INTO job_cron_schedules_new SELECT * FROM job_cron_schedules;
ALTER TABLE job_cron_schedules RENAME TO job_cron_schedules_old;
ALTER TABLE job_cron_schedules_new RENAME TO job_cron_schedules;

CREATE TABLE integration_credentials_new (
  id TEXT PRIMARY KEY,
  integration_id TEXT NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  credential_type TEXT NOT NULL, 
  encrypted_secret TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
INSERT INTO integration_credentials_new SELECT * FROM integration_credentials;
ALTER TABLE integration_credentials RENAME TO integration_credentials_old;
ALTER TABLE integration_credentials_new RENAME TO integration_credentials;

CREATE TABLE homework_new (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  section_id TEXT NOT NULL REFERENCES sections(id) ON DELETE RESTRICT,
  subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
  teacher_id TEXT NOT NULL REFERENCES teachers(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  description TEXT,
  due_date TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  deleted_at TEXT,
  updated_by TEXT
);
INSERT INTO homework_new SELECT * FROM homework;
ALTER TABLE homework RENAME TO homework_old;
ALTER TABLE homework_new RENAME TO homework;

CREATE TABLE guardians_new (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  relationship TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  occupation TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT
);
INSERT INTO guardians_new SELECT * FROM guardians;
ALTER TABLE guardians RENAME TO guardians_old;
ALTER TABLE guardians_new RENAME TO guardians;

CREATE TABLE grade_scales_new (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  grade TEXT NOT NULL,           
  min_percent REAL NOT NULL,
  max_percent REAL NOT NULL,
  grade_point REAL DEFAULT 0,
  remarks TEXT,                  
  is_passing INTEGER DEFAULT 1,  
  sort_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(institution_id, grade)
);
INSERT INTO grade_scales_new SELECT * FROM grade_scales;
ALTER TABLE grade_scales RENAME TO grade_scales_old;
ALTER TABLE grade_scales_new RENAME TO grade_scales;

CREATE TABLE financial_ledger_new (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  student_fee_record_id TEXT REFERENCES student_fee_records(id) ON DELETE SET NULL,
  entry_type TEXT NOT NULL CHECK(entry_type IN ('ALLOCATION', 'PAYMENT', 'DISCOUNT', 'SCHOLARSHIP', 'FINE', 'REFUND', 'ADJUSTMENT')), 
  amount REAL NOT NULL,
  balance_after REAL NOT NULL,
  description TEXT NOT NULL,
  reference_id TEXT,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
INSERT INTO financial_ledger_new SELECT * FROM financial_ledger;
ALTER TABLE financial_ledger RENAME TO financial_ledger_old;
ALTER TABLE financial_ledger_new RENAME TO financial_ledger;

CREATE TABLE fee_reminders_new (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  student_fee_record_id TEXT REFERENCES student_fee_records(id) ON DELETE SET NULL,
  reminder_type TEXT NOT NULL CHECK(reminder_type IN ('EMAIL', 'SMS', 'WHATSAPP')), 
  recipient TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'SENT',
  sent_at TEXT DEFAULT (datetime('now')),
  sent_by TEXT REFERENCES users(id) ON DELETE SET NULL
);
INSERT INTO fee_reminders_new SELECT * FROM fee_reminders;
ALTER TABLE fee_reminders RENAME TO fee_reminders_old;
ALTER TABLE fee_reminders_new RENAME TO fee_reminders;

CREATE TABLE fee_refunds_new (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  payment_id TEXT NOT NULL REFERENCES fee_payments(id) ON DELETE CASCADE,
  student_fee_record_id TEXT NOT NULL REFERENCES student_fee_records(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  refund_amount REAL NOT NULL,
  refund_reason TEXT NOT NULL,
  refund_date TEXT NOT NULL,
  refund_reference TEXT,
  approved_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
INSERT INTO fee_refunds_new SELECT * FROM fee_refunds;
ALTER TABLE fee_refunds RENAME TO fee_refunds_old;
ALTER TABLE fee_refunds_new RENAME TO fee_refunds;

CREATE TABLE fee_receipts_new (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  payment_id TEXT NOT NULL REFERENCES fee_payments(id) ON DELETE CASCADE,
  receipt_number TEXT NOT NULL, 
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  UNIQUE(institution_id, receipt_number)
);
INSERT INTO fee_receipts_new SELECT * FROM fee_receipts;
ALTER TABLE fee_receipts RENAME TO fee_receipts_old;
ALTER TABLE fee_receipts_new RENAME TO fee_receipts;

CREATE TABLE fee_receipt_counters_new (
  institution_id TEXT REFERENCES institutions(id) ON DELETE CASCADE NOT NULL,
  year TEXT NOT NULL,
  next_seq INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (institution_id, year)
);
INSERT INTO fee_receipt_counters_new SELECT * FROM fee_receipt_counters;
ALTER TABLE fee_receipt_counters RENAME TO fee_receipt_counters_old;
ALTER TABLE fee_receipt_counters_new RENAME TO fee_receipt_counters;

CREATE TABLE fee_installments_new (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  student_fee_record_id TEXT NOT NULL REFERENCES student_fee_records(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  installment_number INTEGER NOT NULL,
  due_date TEXT NOT NULL,
  amount REAL NOT NULL,
  paid_amount REAL DEFAULT 0,
  status TEXT DEFAULT 'Pending' CHECK(status IN ('Pending', 'Paid', 'Overdue')),   
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL
);
INSERT INTO fee_installments_new SELECT * FROM fee_installments;
ALTER TABLE fee_installments RENAME TO fee_installments_old;
ALTER TABLE fee_installments_new RENAME TO fee_installments;

CREATE TABLE fee_fine_rules_new (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  grace_period_days INTEGER DEFAULT 0,
  fine_type TEXT NOT NULL CHECK(fine_type IN ('flat', 'daily')), 
  fine_amount REAL NOT NULL,
  max_fine_amount REAL DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL
);
INSERT INTO fee_fine_rules_new SELECT * FROM fee_fine_rules;
ALTER TABLE fee_fine_rules RENAME TO fee_fine_rules_old;
ALTER TABLE fee_fine_rules_new RENAME TO fee_fine_rules;

CREATE TABLE fee_concessions_new (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  student_fee_record_id TEXT NOT NULL REFERENCES student_fee_records(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  concession_type TEXT NOT NULL,   
  discount_type TEXT NOT NULL CHECK(discount_type IN ('flat', 'percent')),     
  discount_value REAL NOT NULL,    
  discount_amount REAL NOT NULL,   
  reason TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL
);
INSERT INTO fee_concessions_new SELECT * FROM fee_concessions;
ALTER TABLE fee_concessions RENAME TO fee_concessions_old;
ALTER TABLE fee_concessions_new RENAME TO fee_concessions;

CREATE TABLE expenses_new (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  category TEXT NOT NULL CHECK(category IN ('Utilities', 'Stationery', 'Salaries', 'Transport', 'Maintenance', 'Others')),
  description TEXT NOT NULL,
  amount REAL NOT NULL CHECK(amount > 0),
  payment_method TEXT NOT NULL CHECK(payment_method IN ('Cash', 'Bank Transfer', 'Cheque', 'UPI')),
  recorded_by TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('PAID', 'PENDING')) DEFAULT 'PAID',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  created_by TEXT,
  updated_by TEXT
);
INSERT INTO expenses_new SELECT * FROM expenses;
ALTER TABLE expenses RENAME TO expenses_old;
ALTER TABLE expenses_new RENAME TO expenses;

CREATE TABLE document_versions_new (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  original_filename TEXT NOT NULL,
  stored_filename TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  checksum_sha256 TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  uploaded_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  change_summary TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
INSERT INTO document_versions_new SELECT * FROM document_versions;
ALTER TABLE document_versions RENAME TO document_versions_old;
ALTER TABLE document_versions_new RENAME TO document_versions;

CREATE TABLE direct_messages_new (
  id TEXT PRIMARY KEY,
  institution_id TEXT REFERENCES institutions(id) ON DELETE CASCADE NOT NULL,
  sender_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  receiver_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  is_read INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
, subject TEXT, attachment_url TEXT, message_type TEXT DEFAULT 'chat');
INSERT INTO direct_messages_new SELECT * FROM direct_messages;
ALTER TABLE direct_messages RENAME TO direct_messages_old;
ALTER TABLE direct_messages_new RENAME TO direct_messages;

CREATE TABLE broadcast_recipients_new (
  id TEXT PRIMARY KEY,
  broadcast_id TEXT NOT NULL REFERENCES broadcasts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_read INTEGER DEFAULT 0,
  read_at TEXT,
  delivered_at TEXT DEFAULT (datetime('now')),
  UNIQUE(broadcast_id, user_id)
);
INSERT INTO broadcast_recipients_new SELECT * FROM broadcast_recipients;
ALTER TABLE broadcast_recipients RENAME TO broadcast_recipients_old;
ALTER TABLE broadcast_recipients_new RENAME TO broadcast_recipients;

CREATE TABLE broadcast_attachments_new (
  id TEXT PRIMARY KEY,
  broadcast_id TEXT NOT NULL REFERENCES broadcasts(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  mime_type TEXT,
  size_bytes INTEGER,
  created_at TEXT DEFAULT (datetime('now'))
);
INSERT INTO broadcast_attachments_new SELECT * FROM broadcast_attachments;
ALTER TABLE broadcast_attachments RENAME TO broadcast_attachments_old;
ALTER TABLE broadcast_attachments_new RENAME TO broadcast_attachments;

CREATE TABLE audit_logs_new (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,       
  module TEXT NOT NULL,       
  record_id TEXT,             
  description TEXT,           
  timestamp TEXT DEFAULT (datetime('now'))
, institution_id TEXT REFERENCES institutions(id) ON DELETE SET NULL, user_name TEXT, user_role TEXT, entity_type TEXT, entity_id TEXT, event_name TEXT, before_json TEXT, after_json TEXT, ip_address TEXT, user_agent TEXT, request_id TEXT, status TEXT DEFAULT 'SUCCESS', reason TEXT);
INSERT INTO audit_logs_new SELECT * FROM audit_logs;
ALTER TABLE audit_logs RENAME TO audit_logs_old;
ALTER TABLE audit_logs_new RENAME TO audit_logs;

CREATE TABLE assets_new (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  assigned_to TEXT,
  room TEXT,
  condition TEXT NOT NULL DEFAULT 'Good',
  purchase_date TEXT,
  value REAL,
  created_at TEXT DEFAULT (datetime('now'))
);
INSERT INTO assets_new SELECT * FROM assets;
ALTER TABLE assets RENAME TO assets_old;
ALTER TABLE assets_new RENAME TO assets;

CREATE TABLE approvals_new (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  requester_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  approval_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  payload TEXT,
  status TEXT DEFAULT 'Pending' CHECK(status IN ('Pending', 'Approved', 'Rejected')),
  remarks TEXT,
  approver_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  approved_rejected_at TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  updated_by TEXT REFERENCES users(id) ON DELETE SET NULL
);
INSERT INTO approvals_new SELECT * FROM approvals;
ALTER TABLE approvals RENAME TO approvals_old;
ALTER TABLE approvals_new RENAME TO approvals;

CREATE TABLE announcements_new (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  visible_to_students INTEGER DEFAULT 0,
  visible_to_teachers INTEGER DEFAULT 0,
  visible_to_parents INTEGER DEFAULT 0,
  section_id TEXT REFERENCES sections(id) ON DELETE SET NULL,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  updated_by TEXT REFERENCES users(id) ON DELETE SET NULL
);
INSERT INTO announcements_new SELECT * FROM announcements;
ALTER TABLE announcements RENAME TO announcements_old;
ALTER TABLE announcements_new RENAME TO announcements;

CREATE TABLE analytics_monthly_new (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  year_month TEXT NOT NULL, 
  avg_attendance_pct REAL DEFAULT 0.0,
  total_revenue REAL DEFAULT 0.0,
  new_enrollments INTEGER DEFAULT 0,
  documents_uploaded_count INTEGER DEFAULT 0,
  jobs_executed_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(institution_id, year_month)
);
INSERT INTO analytics_monthly_new SELECT * FROM analytics_monthly;
ALTER TABLE analytics_monthly RENAME TO analytics_monthly_old;
ALTER TABLE analytics_monthly_new RENAME TO analytics_monthly;

CREATE TABLE analytics_kpis_new (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  category TEXT NOT NULL, 
  kpi_key TEXT NOT NULL,
  kpi_value REAL NOT NULL,
  previous_value REAL DEFAULT 0.0,
  change_pct REAL DEFAULT 0.0,
  trend TEXT DEFAULT 'STABLE', 
  unit TEXT DEFAULT '',
  last_updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(institution_id, category, kpi_key)
);
INSERT INTO analytics_kpis_new SELECT * FROM analytics_kpis;
ALTER TABLE analytics_kpis RENAME TO analytics_kpis_old;
ALTER TABLE analytics_kpis_new RENAME TO analytics_kpis;

CREATE TABLE analytics_events_new (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_count INTEGER DEFAULT 1,
  date TEXT NOT NULL, 
  created_at TEXT DEFAULT (datetime('now'))
);
INSERT INTO analytics_events_new SELECT * FROM analytics_events;
ALTER TABLE analytics_events RENAME TO analytics_events_old;
ALTER TABLE analytics_events_new RENAME TO analytics_events;

CREATE TABLE analytics_daily_new (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  date TEXT NOT NULL, 
  total_students INTEGER DEFAULT 0,
  total_teachers INTEGER DEFAULT 0,
  attendance_rate_pct REAL DEFAULT 0.0,
  absent_count INTEGER DEFAULT 0,
  fee_collection_amount REAL DEFAULT 0.0,
  pending_fees_amount REAL DEFAULT 0.0,
  pass_rate_pct REAL DEFAULT 0.0,
  notifications_sent INTEGER DEFAULT 0,
  storage_used_mb REAL DEFAULT 0.0,
  jobs_executed_count INTEGER DEFAULT 0,
  audit_events_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(institution_id, date)
);
INSERT INTO analytics_daily_new SELECT * FROM analytics_daily;
ALTER TABLE analytics_daily RENAME TO analytics_daily_old;
ALTER TABLE analytics_daily_new RENAME TO analytics_daily;

CREATE TABLE alumni_new (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  student_id TEXT REFERENCES students(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  graduation_year INTEGER NOT NULL,
  current_status TEXT,
  institution TEXT,
  contact TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
INSERT INTO alumni_new SELECT * FROM alumni;
ALTER TABLE alumni RENAME TO alumni_old;
ALTER TABLE alumni_new RENAME TO alumni;

CREATE TABLE admission_applications_new (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  inquiry_id TEXT REFERENCES admission_inquiries(id) ON DELETE SET NULL,
  application_number TEXT NOT NULL,
  student_first_name TEXT NOT NULL,
  student_last_name TEXT NOT NULL,
  date_of_birth TEXT,
  gender TEXT,
  applying_for_course_id TEXT REFERENCES courses(id) ON DELETE SET NULL,
  academic_year_id TEXT NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
  parent_name TEXT NOT NULL,
  parent_phone TEXT NOT NULL,
  parent_email TEXT,
  previous_school TEXT,
  previous_class TEXT,
  status TEXT DEFAULT 'Submitted' CHECK(status IN ('Submitted', 'Under Review', 'Approved', 'Rejected')),
  rejection_reason TEXT,
  approved_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  approved_at TEXT,
  converted_student_id TEXT REFERENCES students(id) ON DELETE SET NULL,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE(institution_id, application_number)
);
INSERT INTO admission_applications_new SELECT * FROM admission_applications;
ALTER TABLE admission_applications RENAME TO admission_applications_old;
ALTER TABLE admission_applications_new RENAME TO admission_applications;

CREATE TABLE academic_year_rollover_logs_new (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  source_year_id TEXT REFERENCES academic_years(id) ON DELETE SET NULL,
  target_year_id TEXT NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
  checklist TEXT NOT NULL,
  status TEXT NOT NULL,
  log_output TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL
);
INSERT INTO academic_year_rollover_logs_new SELECT * FROM academic_year_rollover_logs;
ALTER TABLE academic_year_rollover_logs RENAME TO academic_year_rollover_logs_old;
ALTER TABLE academic_year_rollover_logs_new RENAME TO academic_year_rollover_logs;

CREATE TABLE academic_calendar_new (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('holiday', 'event', 'exam', 'vacation')), 
  description TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT
);
INSERT INTO academic_calendar_new SELECT * FROM academic_calendar;
ALTER TABLE academic_calendar RENAME TO academic_calendar_old;
ALTER TABLE academic_calendar_new RENAME TO academic_calendar;

-- Drop the renamed-away originals, children before parents.
DROP TABLE academic_calendar_old;
DROP TABLE academic_year_rollover_logs_old;
DROP TABLE admission_applications_old;
DROP TABLE alumni_old;
DROP TABLE analytics_daily_old;
DROP TABLE analytics_events_old;
DROP TABLE analytics_kpis_old;
DROP TABLE analytics_monthly_old;
DROP TABLE announcements_old;
DROP TABLE approvals_old;
DROP TABLE assets_old;
DROP TABLE audit_logs_old;
DROP TABLE broadcast_attachments_old;
DROP TABLE broadcast_recipients_old;
DROP TABLE direct_messages_old;
DROP TABLE document_versions_old;
DROP TABLE expenses_old;
DROP TABLE fee_concessions_old;
DROP TABLE fee_fine_rules_old;
DROP TABLE fee_installments_old;
DROP TABLE fee_receipt_counters_old;
DROP TABLE fee_receipts_old;
DROP TABLE fee_refunds_old;
DROP TABLE fee_reminders_old;
DROP TABLE financial_ledger_old;
DROP TABLE grade_scales_old;
DROP TABLE guardians_old;
DROP TABLE homework_old;
DROP TABLE integration_credentials_old;
DROP TABLE job_cron_schedules_old;
DROP TABLE job_execution_history_old;
DROP TABLE job_workers_old;
DROP TABLE leave_applications_old;
DROP TABLE leave_balances_old;
DROP TABLE library_transactions_old;
DROP TABLE message_templates_old;
DROP TABLE notes_old;
DROP TABLE notification_logs_old;
DROP TABLE notification_preferences_old;
DROP TABLE notification_queue_old;
DROP TABLE payslips_old;
DROP TABLE push_subscriptions_old;
DROP TABLE salary_structures_old;
DROP TABLE scheduled_reports_old;
DROP TABLE student_attendance_old;
DROP TABLE student_enrollments_old;
DROP TABLE student_leave_applications_old;
DROP TABLE student_marks_old;
DROP TABLE subject_assessments_old;
DROP TABLE subject_lesson_plans_old;
DROP TABLE system_settings_old;
DROP TABLE teacher_attendance_old;
DROP TABLE teacher_documents_old;
DROP TABLE teacher_notes_old;
DROP TABLE teacher_subject_assignments_old;
DROP TABLE teaching_allocations_old;
DROP TABLE transport_allocations_old;
DROP TABLE user_notification_preferences_old;
DROP TABLE user_roles_old;
DROP TABLE visitors_old;
DROP TABLE webhook_deliveries_old;
DROP TABLE weekly_timetable_old;
DROP TABLE admission_inquiries_old;
DROP TABLE broadcasts_old;
DROP TABLE documents_old;
DROP TABLE fee_payments_old;
DROP TABLE background_jobs_old;
DROP TABLE leave_types_old;
DROP TABLE library_books_old;
DROP TABLE notifications_old;
DROP TABLE payroll_runs_old;
DROP TABLE attendance_sessions_old;
DROP TABLE exam_subjects_old;
DROP TABLE transport_routes_old;
DROP TABLE webhook_subscriptions_old;
DROP TABLE student_fee_records_old;
DROP TABLE notification_templates_old;
DROP TABLE sections_old;
DROP TABLE timetable_slots_old;
DROP TABLE exams_old;
DROP TABLE subjects_old;
DROP TABLE integrations_old;
DROP TABLE students_old;
DROP TABLE fee_structures_old;
DROP TABLE academic_years_old;
DROP TABLE courses_old;
DROP TABLE departments_old;
DROP TABLE teachers_old;
DROP TABLE users_old;

-- Recreate every index (all are CREATE INDEX IF NOT EXISTS, so this is a
-- harmless no-op for tables that weren't rebuilt above; renaming a table
-- does not carry its indexes along, so this is required, not optional).
-- Indexes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_academic_calendar_inst_deleted ON academic_calendar(institution_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_academic_years_inst_deleted ON academic_years(institution_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_admission_applications_institution ON admission_applications(institution_id);
CREATE INDEX IF NOT EXISTS idx_admission_applications_status ON admission_applications(status);
CREATE INDEX IF NOT EXISTS idx_admission_inquiries_institution ON admission_inquiries(institution_id);
CREATE INDEX IF NOT EXISTS idx_admission_inquiries_status ON admission_inquiries(status);
CREATE INDEX IF NOT EXISTS idx_allocations_section ON teaching_allocations(section_id);
CREATE INDEX IF NOT EXISTS idx_allocations_subject ON teaching_allocations(subject_id);
CREATE INDEX IF NOT EXISTS idx_allocations_teacher ON teaching_allocations(teacher_id);
CREATE INDEX IF NOT EXISTS idx_allocations_year ON teaching_allocations(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_alumni_institution ON alumni(institution_id);
CREATE INDEX IF NOT EXISTS idx_analytics_daily_date ON analytics_daily(institution_id, date);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(institution_id, event_type, date);
CREATE INDEX IF NOT EXISTS idx_analytics_kpis_cat ON analytics_kpis(institution_id, category);
CREATE INDEX IF NOT EXISTS idx_analytics_monthly_month ON analytics_monthly(institution_id, year_month);
CREATE INDEX IF NOT EXISTS idx_announcements_inst_deleted ON announcements(institution_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_approvals_entity ON approvals(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_approvals_institution ON approvals(institution_id);
CREATE INDEX IF NOT EXISTS idx_approvals_status ON approvals(status);
CREATE INDEX IF NOT EXISTS idx_assessments_subject ON subject_assessments(subject_id);
CREATE INDEX IF NOT EXISTS idx_assets_institution ON assets(institution_id);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_inst_deleted ON attendance_sessions(institution_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_section_date ON attendance_sessions(section_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_teacher ON attendance_sessions(teacher_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event ON audit_logs(event_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_inst ON audit_logs(institution_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_module ON audit_logs(module);
CREATE INDEX IF NOT EXISTS idx_audit_logs_req ON audit_logs(request_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_status ON audit_logs(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_bg_jobs_inst ON background_jobs(institution_id);
CREATE INDEX IF NOT EXISTS idx_bg_jobs_status ON background_jobs(status, scheduled_at, priority);
CREATE INDEX IF NOT EXISTS idx_bg_jobs_type ON background_jobs(job_type);
CREATE INDEX IF NOT EXISTS idx_broadcast_recipients_broadcast ON broadcast_recipients(broadcast_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_recipients_user ON broadcast_recipients(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_courses_department ON courses(department_id);
CREATE INDEX IF NOT EXISTS idx_courses_inst_deleted ON courses(institution_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_cron_schedules_active ON job_cron_schedules(is_active, next_run_at);
CREATE INDEX IF NOT EXISTS idx_cron_schedules_inst ON job_cron_schedules(institution_id);
CREATE INDEX IF NOT EXISTS idx_departments_inst_deleted ON departments(institution_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_document_versions_doc ON document_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category);
CREATE INDEX IF NOT EXISTS idx_documents_checksum ON documents(checksum_sha256);
CREATE INDEX IF NOT EXISTS idx_documents_entity ON documents(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_documents_inst_deleted ON documents(institution_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_enrollments_section ON student_enrollments(section_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON student_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_year ON student_enrollments(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_exam_subjects_exam ON exam_subjects(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_subjects_inst_deleted ON exam_subjects(institution_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_exams_course ON exams(course_id);
CREATE INDEX IF NOT EXISTS idx_exams_inst_deleted ON exams(institution_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_exams_year ON exams(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_expenses_institution ON expenses(institution_id, date);
CREATE INDEX IF NOT EXISTS idx_fee_concessions_record ON fee_concessions(student_fee_record_id);
CREATE INDEX IF NOT EXISTS idx_fee_concessions_student ON fee_concessions(student_id);
CREATE INDEX IF NOT EXISTS idx_fee_installments_record ON fee_installments(student_fee_record_id);
CREATE INDEX IF NOT EXISTS idx_fee_installments_student ON fee_installments(student_id);
CREATE INDEX IF NOT EXISTS idx_fee_payments_date ON fee_payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_fee_payments_inst_deleted ON fee_payments(institution_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_fee_payments_record ON fee_payments(student_fee_record_id);
CREATE INDEX IF NOT EXISTS idx_fee_payments_student ON fee_payments(student_id);
CREATE INDEX IF NOT EXISTS idx_fee_receipts_inst_deleted ON fee_receipts(institution_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_fee_receipts_payment ON fee_receipts(payment_id);
CREATE INDEX IF NOT EXISTS idx_fee_refunds_payment ON fee_refunds(payment_id);
CREATE INDEX IF NOT EXISTS idx_fee_refunds_student ON fee_refunds(student_id);
CREATE INDEX IF NOT EXISTS idx_fee_reminders_student ON fee_reminders(student_id);
CREATE INDEX IF NOT EXISTS idx_fee_structures_inst_deleted ON fee_structures(institution_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_financial_ledger_record ON financial_ledger(student_fee_record_id);
CREATE INDEX IF NOT EXISTS idx_financial_ledger_student ON financial_ledger(student_id);
CREATE INDEX IF NOT EXISTS idx_grade_scales_institution ON grade_scales(institution_id);
CREATE INDEX IF NOT EXISTS idx_guardians_student ON guardians(student_id);
CREATE INDEX IF NOT EXISTS idx_guardians_user ON guardians(user_id);
CREATE INDEX IF NOT EXISTS idx_homework_section ON homework(section_id);
CREATE INDEX IF NOT EXISTS idx_homework_inst_deleted ON homework(institution_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_integrations_inst ON integrations(institution_id);
CREATE INDEX IF NOT EXISTS idx_job_exec_history_inst ON job_execution_history(institution_id);
CREATE INDEX IF NOT EXISTS idx_job_exec_history_job ON job_execution_history(job_id);
CREATE INDEX IF NOT EXISTS idx_job_workers_heartbeat ON job_workers(last_heartbeat_at, status);
CREATE INDEX IF NOT EXISTS idx_leave_applications_inst_deleted ON leave_applications(institution_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_leave_applications_status ON leave_applications(status);
CREATE INDEX IF NOT EXISTS idx_leave_applications_teacher ON leave_applications(teacher_id);
CREATE INDEX IF NOT EXISTS idx_leave_balances_teacher ON leave_balances(teacher_id);
CREATE INDEX IF NOT EXISTS idx_leave_types_institution ON leave_types(institution_id);
CREATE INDEX IF NOT EXISTS idx_lesson_plans_subject ON subject_lesson_plans(subject_id);
CREATE INDEX IF NOT EXISTS idx_notes_entity ON notes(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_institution ON notification_logs(institution_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_notification ON notification_logs(notification_id);
CREATE INDEX IF NOT EXISTS idx_notification_queue_status ON notification_queue(status, next_retry_at);
CREATE INDEX IF NOT EXISTS idx_notification_templates_event ON notification_templates(institution_id, event_type);
CREATE INDEX IF NOT EXISTS idx_notifications_institution ON notifications(institution_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_payslips_payroll ON payslips(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_payslips_inst_deleted ON payslips(institution_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_inst_deleted ON payroll_runs(institution_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_push_subs_institution ON push_subscriptions(institution_id) WHERE is_active = 1;
CREATE INDEX IF NOT EXISTS idx_push_subs_user ON push_subscriptions(user_id) WHERE is_active = 1;
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_rollover_logs_institution ON academic_year_rollover_logs(institution_id);
CREATE INDEX IF NOT EXISTS idx_salary_structures_teacher ON salary_structures(teacher_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_inst ON scheduled_reports(institution_id);
CREATE INDEX IF NOT EXISTS idx_sections_inst_deleted ON sections(institution_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_settings_institution ON system_settings(institution_id);
CREATE INDEX IF NOT EXISTS idx_student_attendance_inst_deleted ON student_attendance(institution_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_student_attendance_session ON student_attendance(session_id);
CREATE INDEX IF NOT EXISTS idx_student_attendance_student ON student_attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_student_fee_records_inst_deleted ON student_fee_records(institution_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_student_fee_records_student ON student_fee_records(student_id);
CREATE INDEX IF NOT EXISTS idx_student_leaves_student ON student_leave_applications(student_id);
CREATE INDEX IF NOT EXISTS idx_student_leave_applications_inst_deleted ON student_leave_applications(institution_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_student_marks_exam_subject ON student_marks(exam_subject_id);
CREATE INDEX IF NOT EXISTS idx_student_marks_student ON student_marks(student_id);
CREATE INDEX IF NOT EXISTS idx_student_marks_inst_deleted ON student_marks(institution_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_students_inst_deleted ON students(institution_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_subjects_inst_deleted ON subjects(institution_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_section ON teacher_subject_assignments(section_id);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_teacher ON teacher_subject_assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_attendance_inst_deleted ON teacher_attendance(institution_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_teacher_attendance_teacher ON teacher_attendance(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teachers_inst_deleted ON teachers(institution_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_timetable_slots_inst_deleted ON timetable_slots(institution_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_users_inst_deleted ON users(institution_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_visitors_institution ON visitors(institution_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliv_inst ON webhook_deliveries(institution_id, created_at);
CREATE INDEX IF NOT EXISTS idx_webhook_deliv_sub ON webhook_deliveries(subscription_id, status);
CREATE INDEX IF NOT EXISTS idx_webhook_subs_inst ON webhook_subscriptions(institution_id, event_type);
CREATE INDEX IF NOT EXISTS idx_weekly_timetable_inst_deleted ON weekly_timetable(institution_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_weekly_timetable_section ON weekly_timetable(section_id);
CREATE INDEX IF NOT EXISTS idx_weekly_timetable_teacher ON weekly_timetable(teacher_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_academic_years_active_status_per_institution
  ON academic_years(institution_id)
  WHERE status = 'Active' AND is_active = 1;
CREATE UNIQUE INDEX IF NOT EXISTS uq_academic_years_current_per_institution
  ON academic_years(institution_id)
  WHERE is_current = 1 AND is_active = 1;

-- ============================================

PRAGMA foreign_key_check;
