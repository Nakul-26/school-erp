-- ============================================
-- TrackFlow School/College ERP - D1 Schema (multi-tenant foundation)
-- ============================================
-- This file is the consolidated, authoritative schema: it was regenerated on
-- 2026-07-31 by introspecting a database that had schema.sql plus all
-- db/migration-*.sql files applied in sequence (sqlite_master dump), because
-- schema.sql had drifted ~35 tables behind what the migrations actually
-- produced. Historical migration-*.sql files remain in this folder for
-- reference but should NOT be re-run against a database created from this
-- file - see db/MIGRATIONS.md for the tracking convention going forward.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS _migrations (
  filename TEXT PRIMARY KEY,
  applied_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS academic_calendar (
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

CREATE TABLE IF NOT EXISTS academic_year_rollover_logs (
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

CREATE TABLE IF NOT EXISTS academic_years (
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

CREATE TABLE IF NOT EXISTS admission_applications (
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

CREATE TABLE IF NOT EXISTS admission_inquiries (
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

CREATE TABLE IF NOT EXISTS alumni (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  student_id TEXT REFERENCES students(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  graduation_year INTEGER NOT NULL,
  current_status TEXT,
  institution TEXT,
  contact TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT
);

CREATE TABLE IF NOT EXISTS alumni_events (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'reunion' CHECK(event_type IN ('reunion','webinar','fundraiser','mentorship','other')),
  start_date TEXT NOT NULL,
  end_date TEXT,
  location TEXT,
  description TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT
);

CREATE TABLE IF NOT EXISTS alumni_event_rsvps (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES alumni_events(id) ON DELETE CASCADE,
  alumni_id TEXT NOT NULL REFERENCES alumni(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'INTERESTED' CHECK(status IN ('INTERESTED','GOING','DECLINED')),
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(event_id, alumni_id)
);

CREATE INDEX IF NOT EXISTS idx_alumni_events_inst ON alumni_events(institution_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_alumni_event_rsvps_event ON alumni_event_rsvps(event_id);

CREATE TABLE IF NOT EXISTS analytics_daily (
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

CREATE TABLE IF NOT EXISTS analytics_events (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_count INTEGER DEFAULT 1,
  date TEXT NOT NULL, 
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS analytics_kpis (
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

CREATE TABLE IF NOT EXISTS analytics_monthly (
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

CREATE TABLE IF NOT EXISTS announcements (
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

CREATE TABLE IF NOT EXISTS approvals (
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

CREATE TABLE IF NOT EXISTS assets (
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

CREATE TABLE IF NOT EXISTS attendance_sessions (
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

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,       
  module TEXT NOT NULL,       
  record_id TEXT,             
  description TEXT,           
  timestamp TEXT DEFAULT (datetime('now'))
, institution_id TEXT REFERENCES institutions(id) ON DELETE SET NULL, user_name TEXT, user_role TEXT, entity_type TEXT, entity_id TEXT, event_name TEXT, before_json TEXT, after_json TEXT, ip_address TEXT, user_agent TEXT, request_id TEXT, status TEXT DEFAULT 'SUCCESS', reason TEXT);

CREATE TABLE IF NOT EXISTS background_jobs (
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

CREATE TABLE IF NOT EXISTS broadcast_attachments (
  id TEXT PRIMARY KEY,
  broadcast_id TEXT NOT NULL REFERENCES broadcasts(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  mime_type TEXT,
  size_bytes INTEGER,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS broadcast_recipients (
  id TEXT PRIMARY KEY,
  broadcast_id TEXT NOT NULL REFERENCES broadcasts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_read INTEGER DEFAULT 0,
  read_at TEXT,
  delivered_at TEXT DEFAULT (datetime('now')),
  UNIQUE(broadcast_id, user_id)
);

CREATE TABLE IF NOT EXISTS broadcasts (
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

CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  industry TEXT,
  website TEXT,
  contact_person TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  description TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT
);

CREATE TABLE IF NOT EXISTS courses (
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

CREATE TABLE IF NOT EXISTS departments (
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

CREATE TABLE IF NOT EXISTS direct_messages (
  id TEXT PRIMARY KEY,
  institution_id TEXT REFERENCES institutions(id) ON DELETE CASCADE NOT NULL,
  sender_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  receiver_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  is_read INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
, subject TEXT, attachment_url TEXT, message_type TEXT DEFAULT 'chat');

CREATE TABLE IF NOT EXISTS document_versions (
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

CREATE TABLE IF NOT EXISTS documents (
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

CREATE TABLE IF NOT EXISTS exam_subjects (
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

CREATE TABLE IF NOT EXISTS exams (
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

CREATE TABLE IF NOT EXISTS expenses (
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

CREATE TABLE IF NOT EXISTS fee_concessions (
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

CREATE TABLE IF NOT EXISTS fee_fine_rules (
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

CREATE TABLE IF NOT EXISTS fee_installments (
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

CREATE TABLE IF NOT EXISTS fee_payments (
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

CREATE TABLE IF NOT EXISTS fee_receipt_counters (
  institution_id TEXT REFERENCES institutions(id) ON DELETE CASCADE NOT NULL,
  year TEXT NOT NULL,
  next_seq INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (institution_id, year)
);

CREATE TABLE IF NOT EXISTS fee_receipts (
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

CREATE TABLE IF NOT EXISTS fee_refunds (
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

CREATE TABLE IF NOT EXISTS fee_reminders (
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

CREATE TABLE IF NOT EXISTS fee_structures (
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

CREATE TABLE IF NOT EXISTS financial_ledger (
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

CREATE TABLE IF NOT EXISTS grade_scales (
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

CREATE TABLE IF NOT EXISTS guardians (
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

CREATE TABLE IF NOT EXISTS homework (
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

CREATE TABLE IF NOT EXISTS institutions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  logo TEXT,
  institution_type TEXT DEFAULT 'college',
  current_academic_year_id TEXT,
  attendance_threshold REAL DEFAULT 75.0,
  passing_marks REAL DEFAULT 40.0,
  
  
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT
);

CREATE TABLE IF NOT EXISTS certificate_templates (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'CUSTOM' CHECK(type IN ('ID_CARD','BONAFIDE','TRANSFER_CERTIFICATE','CUSTOM')),
  body_html TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT
);

CREATE TABLE IF NOT EXISTS certificate_issuances (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  template_id TEXT NOT NULL REFERENCES certificate_templates(id),
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  reference_number TEXT NOT NULL,
  rendered_html TEXT NOT NULL,
  issued_by TEXT,
  issued_at TEXT DEFAULT (datetime('now')),
  is_active INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_cert_templates_inst ON certificate_templates(institution_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_cert_issuances_student ON certificate_issuances(student_id);
CREATE INDEX IF NOT EXISTS idx_cert_issuances_inst ON certificate_issuances(institution_id);

CREATE TABLE IF NOT EXISTS integration_credentials (
  id TEXT PRIMARY KEY,
  integration_id TEXT NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  credential_type TEXT NOT NULL, 
  encrypted_secret TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS integrations (
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

CREATE TABLE IF NOT EXISTS job_cron_schedules (
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

CREATE TABLE IF NOT EXISTS job_execution_history (
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

CREATE TABLE IF NOT EXISTS job_workers (
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

CREATE TABLE IF NOT EXISTS leave_applications (
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

CREATE TABLE IF NOT EXISTS leave_balances (
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

CREATE TABLE IF NOT EXISTS leave_types (
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

CREATE TABLE IF NOT EXISTS library_books (
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
      created_at TEXT DEFAULT (datetime('now')),
      is_reference INTEGER NOT NULL DEFAULT 0
    );

CREATE TABLE IF NOT EXISTS library_transactions (
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

CREATE TABLE IF NOT EXISTS message_templates (
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

CREATE TABLE IF NOT EXISTS notes (
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

CREATE TABLE IF NOT EXISTS notification_logs (
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

CREATE TABLE IF NOT EXISTS notification_preferences (
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

CREATE TABLE IF NOT EXISTS notification_queue (
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

CREATE TABLE IF NOT EXISTS notification_templates (
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

CREATE TABLE IF NOT EXISTS notifications (
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

CREATE TABLE IF NOT EXISTS payroll_runs (
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

CREATE TABLE IF NOT EXISTS payslips (
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

CREATE TABLE IF NOT EXISTS permissions (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE, 
  description TEXT
);

CREATE TABLE IF NOT EXISTS placement_applications (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  drive_id TEXT NOT NULL REFERENCES placement_drives(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'APPLIED' CHECK(status IN ('APPLIED', 'SHORTLISTED', 'INTERVIEWED', 'OFFERED', 'REJECTED', 'WITHDRAWN')),
  applied_at TEXT DEFAULT (datetime('now')),
  offer_package REAL,
  offer_date TEXT,
  remarks TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  created_by TEXT,
  updated_by TEXT,
  UNIQUE(drive_id, student_id)
);

CREATE TABLE IF NOT EXISTS placement_drives (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  drive_type TEXT NOT NULL DEFAULT 'PLACEMENT' CHECK(drive_type IN ('PLACEMENT', 'INTERNSHIP')),
  description TEXT,
  package_amount REAL,
  drive_date TEXT,
  application_deadline TEXT,
  min_cgpa REAL,
  max_backlogs INTEGER,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT', 'OPEN', 'CLOSED', 'COMPLETED')),
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
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

CREATE TABLE IF NOT EXISTS rate_limits (
            key TEXT PRIMARY KEY,
            count INTEGER NOT NULL DEFAULT 1,
            reset_at INTEGER NOT NULL
          );

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id TEXT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT
);

CREATE TABLE IF NOT EXISTS salary_structures (
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

CREATE TABLE IF NOT EXISTS scheduled_reports (
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

CREATE TABLE IF NOT EXISTS sections (
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

CREATE TABLE IF NOT EXISTS semesters (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  academic_year_id TEXT NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
  semester_number INTEGER NOT NULL,
  name TEXT NOT NULL,
  start_date TEXT,
  end_date TEXT,
  status TEXT NOT NULL DEFAULT 'Draft' CHECK(status IN ('Draft', 'Active', 'Locked', 'Archived')),
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  UNIQUE(course_id, academic_year_id, semester_number)
);

CREATE TABLE IF NOT EXISTS student_attendance (
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

CREATE TABLE IF NOT EXISTS student_electives (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  academic_year_id TEXT NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
  semester INTEGER NOT NULL,
  subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'REGISTERED' CHECK(status IN ('REGISTERED', 'WITHDRAWN')),
  registered_at TEXT DEFAULT (datetime('now')),
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  created_by TEXT,
  updated_by TEXT,
  UNIQUE(student_id, academic_year_id, semester, subject_id)
);

CREATE TABLE IF NOT EXISTS student_enrollments (
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

CREATE TABLE IF NOT EXISTS student_fee_records (
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

CREATE TABLE IF NOT EXISTS student_leave_applications (
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

CREATE TABLE IF NOT EXISTS student_marks (
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

CREATE TABLE IF NOT EXISTS students (
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

CREATE TABLE IF NOT EXISTS student_health_visits (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  visit_date TEXT NOT NULL DEFAULT (date('now')),
  reason TEXT NOT NULL,
  diagnosis TEXT,
  treatment TEXT,
  referred_to TEXT,
  follow_up_date TEXT,
  recorded_by TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT
);

CREATE TABLE IF NOT EXISTS student_immunizations (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  vaccine_name TEXT NOT NULL,
  dose_number INTEGER,
  administered_date TEXT,
  next_due_date TEXT,
  administered_by TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT
);

CREATE TABLE IF NOT EXISTS student_health_incidents (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  incident_date TEXT NOT NULL DEFAULT (date('now')),
  incident_type TEXT NOT NULL DEFAULT 'OTHER' CHECK(incident_type IN ('INJURY','ILLNESS','ALLERGY_REACTION','OTHER')),
  description TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'MINOR' CHECK(severity IN ('MINOR','MODERATE','SEVERE')),
  action_taken TEXT,
  parent_notified INTEGER NOT NULL DEFAULT 0,
  recorded_by TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_health_visits_student ON student_health_visits(student_id);
CREATE INDEX IF NOT EXISTS idx_immunizations_student ON student_immunizations(student_id);
CREATE INDEX IF NOT EXISTS idx_health_incidents_student ON student_health_incidents(student_id);
CREATE INDEX IF NOT EXISTS idx_health_visits_inst ON student_health_visits(institution_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_immunizations_inst ON student_immunizations(institution_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_health_incidents_inst ON student_health_incidents(institution_id, deleted_at);

CREATE TABLE IF NOT EXISTS subject_assessments (
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

CREATE TABLE IF NOT EXISTS subject_lesson_plans (
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

CREATE TABLE IF NOT EXISTS subject_prerequisites (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  prerequisite_subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  created_by TEXT,
  CHECK(subject_id != prerequisite_subject_id),
  UNIQUE(subject_id, prerequisite_subject_id)
);

CREATE TABLE IF NOT EXISTS subjects (
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

CREATE TABLE IF NOT EXISTS system_settings (
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

CREATE TABLE IF NOT EXISTS teacher_attendance (
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

CREATE TABLE IF NOT EXISTS teacher_documents (
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

CREATE TABLE IF NOT EXISTS teacher_notes (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  author_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  is_active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS teacher_subject_assignments (
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

CREATE TABLE IF NOT EXISTS teachers (
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

CREATE TABLE IF NOT EXISTS teaching_allocations (
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

CREATE TABLE IF NOT EXISTS timetable_slots (
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

CREATE TABLE IF NOT EXISTS transport_allocations (
      id TEXT PRIMARY KEY,
      institution_id TEXT REFERENCES institutions(id) ON DELETE CASCADE NOT NULL,
      student_id TEXT NOT NULL,
      route_id TEXT NOT NULL REFERENCES transport_routes(id) ON DELETE RESTRICT,
      pickup_point TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(student_id)
    );

CREATE TABLE IF NOT EXISTS transport_routes (
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

CREATE TABLE IF NOT EXISTS hostel_blocks (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  block_type TEXT NOT NULL DEFAULT 'CO_ED' CHECK(block_type IN ('BOYS','GIRLS','CO_ED')),
  warden_name TEXT,
  warden_phone TEXT,
  address TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT
);

CREATE TABLE IF NOT EXISTS hostel_rooms (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  block_id TEXT NOT NULL REFERENCES hostel_blocks(id) ON DELETE CASCADE,
  room_number TEXT NOT NULL,
  floor TEXT,
  capacity INTEGER NOT NULL DEFAULT 1,
  room_type TEXT NOT NULL DEFAULT 'SHARED' CHECK(room_type IN ('SINGLE','SHARED','DORM')),
  monthly_charge REAL NOT NULL DEFAULT 0.0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  UNIQUE(block_id, room_number)
);

CREATE TABLE IF NOT EXISTS hostel_allocations (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  room_id TEXT NOT NULL REFERENCES hostel_rooms(id),
  bed_label TEXT,
  allocated_date TEXT NOT NULL DEFAULT (date('now')),
  vacated_date TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','VACATED')),
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_hostel_alloc_active_student ON hostel_allocations(student_id) WHERE status = 'ACTIVE';
CREATE INDEX IF NOT EXISTS idx_hostel_rooms_block ON hostel_rooms(block_id);
CREATE INDEX IF NOT EXISTS idx_hostel_alloc_room ON hostel_allocations(room_id) WHERE status = 'ACTIVE';
CREATE INDEX IF NOT EXISTS idx_hostel_blocks_inst ON hostel_blocks(institution_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_hostel_rooms_inst ON hostel_rooms(institution_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_hostel_alloc_inst ON hostel_allocations(institution_id, deleted_at);

CREATE TABLE IF NOT EXISTS user_notification_preferences (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  preferences TEXT NOT NULL, -- JSON string of preferences: e.g. {"attendance": true, "fees": true, "exams": true, "timetable": true, "events": true, "transport": true}
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS users (
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

CREATE TABLE IF NOT EXISTS visitors (
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

CREATE TABLE IF NOT EXISTS webhook_deliveries (
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

CREATE TABLE IF NOT EXISTS webhook_subscriptions (
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

CREATE TABLE IF NOT EXISTS weekly_timetable (
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

-- ============================================
-- Indexes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_academic_calendar_inst_deleted ON academic_calendar(institution_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_academic_years_inst_deleted ON academic_years(institution_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_admission_applications_institution ON admission_applications(institution_id);
CREATE INDEX IF NOT EXISTS idx_admission_applications_status ON admission_applications(status);
CREATE INDEX IF NOT EXISTS idx_admission_inquiries_institution ON admission_inquiries(institution_id);
CREATE INDEX IF NOT EXISTS idx_admission_inquiries_status ON admission_inquiries(status);
CREATE INDEX IF NOT EXISTS idx_companies_inst ON companies(institution_id);
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
CREATE INDEX IF NOT EXISTS idx_placement_drives_inst ON placement_drives(institution_id);
CREATE INDEX IF NOT EXISTS idx_placement_drives_course ON placement_drives(course_id);
CREATE INDEX IF NOT EXISTS idx_placement_applications_drive ON placement_applications(drive_id);
CREATE INDEX IF NOT EXISTS idx_placement_applications_student ON placement_applications(student_id);
CREATE INDEX IF NOT EXISTS idx_push_subs_institution ON push_subscriptions(institution_id) WHERE is_active = 1;
CREATE INDEX IF NOT EXISTS idx_push_subs_user ON push_subscriptions(user_id) WHERE is_active = 1;
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_rollover_logs_institution ON academic_year_rollover_logs(institution_id);
CREATE INDEX IF NOT EXISTS idx_salary_structures_teacher ON salary_structures(teacher_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_inst ON scheduled_reports(institution_id);
CREATE INDEX IF NOT EXISTS idx_semesters_inst_deleted ON semesters(institution_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_semesters_course_year ON semesters(course_id, academic_year_id);
CREATE INDEX IF NOT EXISTS idx_sections_inst_deleted ON sections(institution_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_settings_institution ON system_settings(institution_id);
CREATE INDEX IF NOT EXISTS idx_student_attendance_inst_deleted ON student_attendance(institution_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_student_attendance_session ON student_attendance(session_id);
CREATE INDEX IF NOT EXISTS idx_student_attendance_student ON student_attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_student_fee_records_inst_deleted ON student_fee_records(institution_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_student_fee_records_student ON student_fee_records(student_id);
CREATE INDEX IF NOT EXISTS idx_student_leaves_student ON student_leave_applications(student_id);
CREATE INDEX IF NOT EXISTS idx_student_leave_applications_inst_deleted ON student_leave_applications(institution_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_student_electives_student ON student_electives(student_id, academic_year_id, semester);
CREATE INDEX IF NOT EXISTS idx_student_electives_offering ON student_electives(course_id, academic_year_id, semester, subject_id);
CREATE INDEX IF NOT EXISTS idx_subject_prerequisites_subject ON subject_prerequisites(subject_id);
CREATE INDEX IF NOT EXISTS idx_subject_prerequisites_prereq ON subject_prerequisites(prerequisite_subject_id);
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

CREATE TABLE IF NOT EXISTS canteen_menu_items (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General' CHECK(category IN ('Breakfast','Lunch','Snacks','Dinner','Beverages','General')),
  price REAL NOT NULL DEFAULT 0.0,
  is_available INTEGER NOT NULL DEFAULT 1,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_canteen_menu_inst ON canteen_menu_items(institution_id, deleted_at);

CREATE TABLE IF NOT EXISTS canteen_meal_plans (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  monthly_price REAL NOT NULL DEFAULT 0.0,
  meal_types TEXT NOT NULL DEFAULT 'Lunch',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_canteen_plans_inst ON canteen_meal_plans(institution_id, deleted_at);

CREATE TABLE IF NOT EXISTS canteen_subscriptions (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  meal_plan_id TEXT NOT NULL REFERENCES canteen_meal_plans(id) ON DELETE RESTRICT,
  start_date TEXT NOT NULL DEFAULT (date('now')),
  end_date TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','CANCELLED','EXPIRED')),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_canteen_subs_inst ON canteen_subscriptions(institution_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_canteen_subs_student ON canteen_subscriptions(student_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_canteen_subs_active_per_student
  ON canteen_subscriptions(student_id)
  WHERE status = 'ACTIVE';

CREATE TABLE IF NOT EXISTS study_materials (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  section_id TEXT NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  teacher_id TEXT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  material_type TEXT NOT NULL DEFAULT 'DOCUMENT' CHECK(material_type IN ('DOCUMENT','VIDEO','LINK','PRESENTATION','OTHER')),
  file_key TEXT,
  external_url TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_study_materials_inst ON study_materials(institution_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_study_materials_section ON study_materials(section_id);
CREATE INDEX IF NOT EXISTS idx_study_materials_subject ON study_materials(subject_id);

CREATE TABLE IF NOT EXISTS faculty_publications (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  teacher_id TEXT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  publication_type TEXT NOT NULL DEFAULT 'JOURNAL' CHECK(publication_type IN ('JOURNAL','CONFERENCE','BOOK','BOOK_CHAPTER','PATENT','OTHER')),
  venue_name TEXT,
  publication_date TEXT,
  co_authors TEXT,
  doi_or_url TEXT,
  description TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_faculty_pubs_inst ON faculty_publications(institution_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_faculty_pubs_teacher ON faculty_publications(teacher_id);

CREATE TABLE IF NOT EXISTS gl_accounts (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK(account_type IN ('ASSET','LIABILITY','EQUITY','INCOME','EXPENSE')),
  parent_account_id TEXT REFERENCES gl_accounts(id) ON DELETE SET NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  UNIQUE(institution_id, code)
);
CREATE INDEX IF NOT EXISTS idx_gl_accounts_inst ON gl_accounts(institution_id, deleted_at);

CREATE TABLE IF NOT EXISTS gl_journal_entries (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  entry_number TEXT NOT NULL,
  entry_date TEXT NOT NULL DEFAULT (date('now')),
  reference TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','POSTED','VOID')),
  posted_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_gl_journal_inst ON gl_journal_entries(institution_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_gl_journal_date ON gl_journal_entries(institution_id, entry_date);

CREATE TABLE IF NOT EXISTS gl_journal_lines (
  id TEXT PRIMARY KEY,
  journal_entry_id TEXT NOT NULL REFERENCES gl_journal_entries(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL REFERENCES gl_accounts(id) ON DELETE RESTRICT,
  debit_amount REAL NOT NULL DEFAULT 0.0,
  credit_amount REAL NOT NULL DEFAULT 0.0,
  memo TEXT,
  line_order INTEGER NOT NULL DEFAULT 0,
  CHECK (debit_amount >= 0 AND credit_amount >= 0),
  CHECK (NOT (debit_amount > 0 AND credit_amount > 0))
);
CREATE INDEX IF NOT EXISTS idx_gl_lines_entry ON gl_journal_lines(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_gl_lines_account ON gl_journal_lines(account_id);

-- ============================================
-- Historical migration baseline
-- ============================================
-- Every db/migration-*.sql file that predates this consolidated schema is
-- already reflected above. Recording them here means a fresh database (which
-- only ever runs this file) starts with the same _migrations ledger as an
-- existing one that was actually upgraded through each file in sequence, so
-- db/run-migrations.js never tries to re-apply a historical file against a
-- schema that already has its columns/tables. See db/MIGRATIONS.md.
INSERT OR IGNORE INTO _migrations (filename) VALUES
  ('migration-academic-year-integrity.sql'),
  ('migration-phase-b-tenant-indexes.sql'),
  ('migration-phase-b-audit-columns.sql'),
  ('migration-phase-b-fk-check-constraints.sql'),
  ('migration-background-jobs.sql'),
  ('migration-central-audit-framework.sql'),
  ('migration-central-documents.sql'),
  ('migration-communication-upgrade.sql'),
  ('migration-expenses.sql'),
  ('migration-fee-audit.sql'),
  ('migration-fee-receipt-counters.sql'),
  ('migration-finance-access.sql'),
  ('migration-next-features.sql'),
  ('migration-notification-center-audit.sql'),
  ('migration-notification-preferences.sql'),
  ('migration-payment-verification.sql'),
  ('migration-platform-analytics.sql'),
  ('migration-push-notifications.sql'),
  ('migration-rbac-permissions-expanded.sql'),
  ('migration-sprint-1-1-departments.sql'),
  ('migration-sprint-1-2-programs.sql'),
  ('migration-sprint-1-3-1-section-workspace.sql'),
  ('migration-sprint-1-3-sections.sql'),
  ('migration-sprint-1-4-academic-delivery.sql'),
  ('migration-sprint-1-4-generic-infrastructure.sql'),
  ('migration-sprint-1-5-1-allocations.sql'),
  ('migration-sprint-1-5-3-platform.sql'),
  ('migration-sprint-1-6-academic-year.sql'),
  ('migration-sprint-a1-leaves.sql'),
  ('migration-sprint-a2-admissions.sql'),
  ('migration-sprint-b1-grades.sql'),
  ('migration-sprint-b2-fee-extras.sql'),
  ('migration-sprint-c-extras.sql'),
  ('migration-sprint-programs-audit.sql'),
  ('migration-student-photo-address.sql'),
  ('migration-teachers.sql'),
  ('migration-teachers-notes-docs.sql'),
  ('migration-webhooks-integrations.sql');
