-- Phase B (DB hardening) — item 1: composite (institution_id, deleted_at)
-- indexes on every tenant table that has both columns, per
-- product-spec/21_database_standards.md §3.1. A composite index with
-- institution_id as the leading column also serves any query that filters
-- on institution_id alone, so the old single-column indexes below are
-- dropped in favor of the composite one rather than kept alongside it.

DROP INDEX IF EXISTS idx_academic_calendar_institution;
CREATE INDEX IF NOT EXISTS idx_academic_calendar_inst_deleted ON academic_calendar(institution_id, deleted_at);

DROP INDEX IF EXISTS idx_academic_years_institution;
CREATE INDEX IF NOT EXISTS idx_academic_years_inst_deleted ON academic_years(institution_id, deleted_at);

DROP INDEX IF EXISTS idx_announcements_institution;
CREATE INDEX IF NOT EXISTS idx_announcements_inst_deleted ON announcements(institution_id, deleted_at);

DROP INDEX IF EXISTS idx_attendance_sessions_institution;
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_inst_deleted ON attendance_sessions(institution_id, deleted_at);

DROP INDEX IF EXISTS idx_courses_institution;
CREATE INDEX IF NOT EXISTS idx_courses_inst_deleted ON courses(institution_id, deleted_at);

DROP INDEX IF EXISTS idx_departments_institution;
CREATE INDEX IF NOT EXISTS idx_departments_inst_deleted ON departments(institution_id, deleted_at);

DROP INDEX IF EXISTS idx_documents_inst;
CREATE INDEX IF NOT EXISTS idx_documents_inst_deleted ON documents(institution_id, deleted_at);

DROP INDEX IF EXISTS idx_exam_subjects_institution;
CREATE INDEX IF NOT EXISTS idx_exam_subjects_inst_deleted ON exam_subjects(institution_id, deleted_at);

DROP INDEX IF EXISTS idx_exams_institution;
CREATE INDEX IF NOT EXISTS idx_exams_inst_deleted ON exams(institution_id, deleted_at);

DROP INDEX IF EXISTS idx_fee_payments_institution;
CREATE INDEX IF NOT EXISTS idx_fee_payments_inst_deleted ON fee_payments(institution_id, deleted_at);

DROP INDEX IF EXISTS idx_fee_receipts_institution;
CREATE INDEX IF NOT EXISTS idx_fee_receipts_inst_deleted ON fee_receipts(institution_id, deleted_at);

DROP INDEX IF EXISTS idx_fee_structures_institution;
CREATE INDEX IF NOT EXISTS idx_fee_structures_inst_deleted ON fee_structures(institution_id, deleted_at);

DROP INDEX IF EXISTS idx_sections_institution;
CREATE INDEX IF NOT EXISTS idx_sections_inst_deleted ON sections(institution_id, deleted_at);

DROP INDEX IF EXISTS idx_student_attendance_institution;
CREATE INDEX IF NOT EXISTS idx_student_attendance_inst_deleted ON student_attendance(institution_id, deleted_at);

DROP INDEX IF EXISTS idx_student_fee_records_institution;
CREATE INDEX IF NOT EXISTS idx_student_fee_records_inst_deleted ON student_fee_records(institution_id, deleted_at);

DROP INDEX IF EXISTS idx_students_institution;
CREATE INDEX IF NOT EXISTS idx_students_inst_deleted ON students(institution_id, deleted_at);

DROP INDEX IF EXISTS idx_subjects_institution;
CREATE INDEX IF NOT EXISTS idx_subjects_inst_deleted ON subjects(institution_id, deleted_at);

DROP INDEX IF EXISTS idx_teachers_institution;
CREATE INDEX IF NOT EXISTS idx_teachers_inst_deleted ON teachers(institution_id, deleted_at);

DROP INDEX IF EXISTS idx_teacher_attendance_institution;
CREATE INDEX IF NOT EXISTS idx_teacher_attendance_inst_deleted ON teacher_attendance(institution_id, deleted_at);

DROP INDEX IF EXISTS idx_timetable_slots_institution;
CREATE INDEX IF NOT EXISTS idx_timetable_slots_inst_deleted ON timetable_slots(institution_id, deleted_at);

DROP INDEX IF EXISTS idx_users_institution;
CREATE INDEX IF NOT EXISTS idx_users_inst_deleted ON users(institution_id, deleted_at);

DROP INDEX IF EXISTS idx_weekly_timetable_institution;
CREATE INDEX IF NOT EXISTS idx_weekly_timetable_inst_deleted ON weekly_timetable(institution_id, deleted_at);

-- student_marks had institution_id + deleted_at but no institution index at all yet
CREATE INDEX IF NOT EXISTS idx_student_marks_inst_deleted ON student_marks(institution_id, deleted_at);

-- student_enrollments and teacher_subject_assignments have deleted_at but no
-- institution_id column at all (tenancy is inherited transitively via
-- student_id/section_id) — out of scope here since adding the column would
-- require an application-code migration, not just a schema change. Left as a
-- known gap; see AUDIT_REPORT.md.
