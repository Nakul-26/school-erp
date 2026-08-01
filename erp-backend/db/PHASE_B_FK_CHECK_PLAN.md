# Phase B — FK `ON DELETE` behavior & `CHECK` constraints

Applied 2026-08-01 via `db/migration-phase-b-fk-check-constraints.sql`. This
document records the reasoning behind every decision, so future changes to
these relationships have context instead of just a bare `ON DELETE X` clause
to reverse-engineer.

## Why this needed a full table rebuild

SQLite cannot `ALTER` a column's `REFERENCES`/`CHECK` clause in place — the
only way to change one is to build a new table with the desired definition,
copy the rows across, and swap it in for the old one.

Cloudflare D1 enforces `PRAGMA foreign_keys = ON` unconditionally — it cannot
be turned off for the duration of a rebuild, unlike a plain `sqlite3` CLI
session. That has two consequences that shaped the migration:

1. **`DROP TABLE` fails if any other existing table still has a live FK
   naming it** — even a disposable copy that's about to be dropped anyway.
   The textbook "create new → copy → drop old → rename" sequence doesn't
   work here because the `DROP TABLE old` step is exactly what's blocked.
2. **`ALTER TABLE ... RENAME` is *not* blocked**, and SQLite auto-rewrites
   every other table's stored FK text to follow the rename. The migration
   exploits this: rename the original out of the way (`t` → `t_old`, which
   silently repoints every unrelated table's FK text at `t_old`), create the
   real replacement as `t`, then only drop `t_old` once nothing references
   it anymore.

This means the **build phase must run parent-before-child**: if a child
table were rebuilt (and renamed into its final form) before its parent's own
rename-away step, the parent's rename would retroactively rewrite the
already-correct child right back to pointing at `<parent>_old`. The **drop
phase must run child-before-parent** (dropping a parent's leftover while a
child's leftover still references it fails the same way `DROP TABLE` always
does). Both orders were computed via a topological sort of the FK graph
restricted to the 89 rebuilt tables.

Three tables that already referenced a rebuilt table via a *correctly
declared* `ON DELETE CASCADE` (`user_roles`, `broadcast_attachments`,
`notification_preferences`) plus `user_notification_preferences` were pulled
into the rebuild set too, purely so their existing FK gets re-pointed at the
final table name — otherwise they'd stay bound to a disposable `_old` copy,
and dropping that copy would silently cascade-delete their rows (confirmed
by testing: this is exactly what happened on the first pass against a real
data copy, wiping all 3 tables, before the fix).

## `ON DELETE` decision rules

- **`institution_id → institutions(id)`**: `CASCADE` everywhere, with one
  exception — `audit_logs.institution_id` is `SET NULL`, since a compliance/
  audit trail should be able to outlive the tenant row it describes.
- **Attribution columns to `users(id)`** (`created_by`, `updated_by`,
  `approved_by`, `collected_by`, `sent_by`, `reviewed_by`, `uploaded_by`,
  `author_id`, etc.): `SET NULL`. A few were `NOT NULL` in the original
  schema (`approvals.requester_id`, `broadcasts.created_by`,
  `direct_messages.sender_id`/`receiver_id`, `notes.author_id`,
  `document_versions.uploaded_by`, `documents.uploaded_by`,
  `teacher_documents.uploaded_by`, `teacher_notes.author_id`) and were made
  nullable so the record survives even if the referenced user account is
  removed — the row shouldn't vanish just because we can no longer say who
  did it.
- **Columns that ARE the user's own record** (`user_roles.user_id`,
  `push_subscriptions.user_id`, `notification_preferences.user_id`,
  `user_notification_preferences.user_id`, `notifications.user_id`,
  `notification_queue.recipient_id`, `broadcast_recipients.user_id`):
  `CASCADE` — the row is meaningless without that specific user.
- **`teacher_id → teachers(id)`**: `CASCADE` where the row is the teacher's
  own record (attendance, documents, notes, leave, salary structure,
  payslips, subject/teaching assignments — mirroring how
  `students.repository.ts` already cascades a student's own related rows on
  soft-delete). `SET NULL` for optional assignment slots
  (`sections.class_teacher_id`, `weekly_timetable.teacher_id`,
  `departments.head_teacher_id`, already set). `RESTRICT` where the teacher
  is incidental to a record that has its own independent life
  (`attendance_sessions.teacher_id`, `homework.teacher_id` — both `NOT
  NULL`, so a teacher can't be removed while they have session/homework
  history; reassign or archive first).
- **`student_id → students(id)`**: `CASCADE` by default (records about a
  specific student — attendance, fee records, marks, enrollments, guardians,
  leave applications, library transactions — go away with the student,
  extending the same "cascade on institution delete" philosophy the DB
  standards doc already establishes). `alumni.student_id` is `SET NULL`
  (nullable) since an alumni record documents history that should survive
  even if the originating student row is later removed.
- **Curriculum/structural references** (`academic_year_id`, `course_id`,
  `section_id`, `subject_id`, `department_id`, `leave_type_id` when `NOT
  NULL`): `RESTRICT`. These are shared reference data — cascading a course
  deletion would silently wipe every enrollment, fee record, and exam tied
  to it for potentially hundreds of students. Force an explicit decision
  (reassign or archive dependents first) instead. Nullable/optional
  references to the same kind of table (e.g.
  `admission_applications.applying_for_course_id`,
  `admission_inquiries.academic_year_id`,
  `announcements.section_id`) are `SET NULL` instead, since they're
  historical/optional pointers, not active dependencies.
- **Pure detail-of-parent rows** (`fee_receipts.payment_id`,
  `exam_subjects.exam_id`, `student_marks.exam_subject_id`,
  `subject_assessments.subject_id`, `subject_lesson_plans.subject_id`,
  `payslips.payroll_run_id`, `fee_refunds.payment_id`,
  `fee_concessions`/`fee_installments`/`fee_refunds.student_fee_record_id`):
  `CASCADE` — these rows have no independent meaning without their parent.
- **Money-adjacent detail rows** (`fee_concessions`, `fee_installments`,
  `fee_refunds` by `student_id`; `financial_ledger.student_id`): `CASCADE`,
  consistent with treating student deletion as a full, deliberate erasure
  (see above) rather than special-casing financial history to `RESTRICT` —
  a real hard-delete of a student (e.g. a GDPR erasure request) should take
  their financial trail with them. `financial_ledger.student_fee_record_id`
  is `SET NULL` (nullable) since the ledger description text already
  captures what happened even if the specific fee record link is lost.
- **`library_transactions.book_id`**, **`transport_allocations.route_id`**:
  `RESTRICT` — preserves lending/allocation history integrity; don't let a
  catalog/route entry vanish out from under active or historical records.

## New FK declarations (not just missing `ON DELETE`)

Ten tables had an `institution_id` column with **no `REFERENCES` clause at
all** (`direct_messages`, `documents`, `fee_receipt_counters`, `job_workers`,
`leave_balances`, `library_books`, `library_transactions`, `notes`,
`transport_allocations`, `transport_routes`) — these got a proper
`REFERENCES institutions(id) ON DELETE CASCADE` (or `SET NULL` for
`job_workers`, whose `institution_id` is nullable) alongside everything else,
since the rebuild touched these tables anyway.

**Known residual gap, deliberately not fixed here**: `transport_allocations.
student_id` has no FK to `students(id)` at all (just a bare `NOT NULL`
column). A few other tables (`student_enrollments`, `teacher_subject_
assignments`, `subject_assessments`, `subject_lesson_plans`, `teacher_
documents`, `teacher_notes`) have no `institution_id` column whatsoever, so
tenancy is only enforced transitively through a join. Adding these is a
different, larger category of fix (a genuinely missing relationship or
column, not a missing `ON DELETE` on an existing one) and was left out of
this pass to keep scope bounded — see `AUDIT_REPORT.md`.

## `CHECK` constraints

Added only to columns backed by a **strict TypeScript union type** in the
corresponding `*.types.ts` file (verified by grep, not guessed) — any column
whose type includes an open-ended `| string` fallback (e.g.
`fee_payments.status`, `notifications.status`, `payment_method`,
`degree_type`, `gender`) was deliberately left unconstrained, since the app
intentionally allows arbitrary values there.

Final list (table.column → allowed values): `academic_calendar.type`,
`academic_years.status`, `admission_inquiries.status`, `admission_
applications.status`, `approvals.status`, `exams.status`, `fee_structures.
status`, `student_fee_records.status`, `fee_installments.status`, `fee_
concessions.discount_type`, `fee_fine_rules.fine_type`, `financial_ledger.
entry_type`, `fee_reminders.reminder_type`, `leave_applications.status`,
`student_leave_applications.status`, `payroll_runs.status`, `students.
status`, `student_attendance.status`, `teacher_attendance.status`,
`teachers.status`, `teaching_allocations.status`.

One pre-existing data row failed the new `students.status` constraint before
this migration ran: a single student had `status = 'Active'` instead of the
canonical `'ACTIVE'` used by every other row (a case-mismatch bug, not a
distinct status the app supports) — normalized via `UPDATE students SET
status = 'ACTIVE' WHERE status = 'Active'` as the first statement in the
migration, before the CHECK constraint could reject it.

## Verification performed

- Applied the full migration to a scratch copy of the real local dev
  database (not just an empty fresh one) and confirmed: zero errors, `PRAGMA
  foreign_key_check` returns no violations, and row counts match exactly
  (94 tables, 1250 rows) before vs. after.
- Applied the same migration to the actual local dev database with the same
  verification, before recording it as applied in `_migrations`.
- Confirmed a brand-new database built purely from the regenerated
  `schema.sql` produces an identical set of FK/CHECK-bearing table
  definitions to the migrated one.
