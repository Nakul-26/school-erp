# TrackFlow ERP — Detailed Functional Checklist

Companion to `REQUIREMENTS_VERIFICATION.md` (read that first for the executive summary and priority list). This file is the per-operation breakdown behind every row in that report's high-level table. Every status is backed by a file read; evidence is cited as `file:line`. "Tested" means an automated test or a real live manual verification actually exercised the behavior — not that a file with a plausible name exists.

Columns: **Impl.** = Implemented · **Test** = Tested · **Work** = Confirmed Working · **Status**

---

## 1. Authentication & Access

| Requirement | Impl. | Test | Work | Status | Evidence |
|---|:---:|:---:|:---:|---|---|
| Login (correct credentials) | ✅ | 🟡 | ✅ | Complete-ish | `auth.routes.ts:40-52`; used implicitly throughout this session's live testing |
| Login rejects bad credentials cleanly | ✅ | ❌ | — | Needs testing | Rate-limited 10/15min, `schemas.ts:3-6` |
| Logout | ✅ | ❌ | — | Needs testing | `auth.routes.ts:54-58` |
| Forgot password (email link) | ✅ | ❌ | — | Needs testing — requires `RESEND_API_KEY` | `auth.routes.ts:99-104`, anti-enumeration generic message |
| Reset password | ✅ | ❌ | — | Needs testing | `auth.routes.ts:106-115`, min-6-char validation |
| Self-service institution registration | ✅ | ✅ | ✅ | **Fixed 2026-08-28** | Backend: `auth.routes.ts:60-76`, zod-validated, rate-limited 5/hr, invite-code gated via `INSTITUTION_INVITE_SECRET`. Added `RegisterInstitution.tsx` at `/register-institution`, linked from Login. Real bug found & fixed along the way: the route never called `establishSession()` to set the login cookies (unlike `/auth/login`), so a self-registered admin's browser could never actually authenticate even though the response body had a valid token. Live-verified: registration now returns `Set-Cookie` for `erp_token`/`erp_csrf`, and a follow-up `GET /auth/me` using only the cookie jar correctly authenticates as the new admin |
| Switch branch (multi-institution super-admin) | ✅ | ❌ | — | Needs testing | `auth.routes.ts:117-160`; `Sidebar.tsx:73-79` |
| Update own profile | ✅ | ✅ | ✅ | **Fixed 2026-08-30** | Added `UpdateProfileSchema` (zod) via `validateBody()`: email format, `new_password` min-6-chars, and a `.refine()` requiring `current_password` whenever `new_password` is set. Also fixed a latent null-deref: `fullUser` from `findByEmail()` was used without a null check. Live-verified: invalid email, weak password, and password-without-current-password all now return clean `Validation error: ...` 400s; a valid name-only update still succeeds |
| Access-denied handling (wrong role hits protected route) | ✅ | ❌ | — | Needs testing | `AccessDenied.tsx` |
| Permission/role middleware | ✅ | 🟡 | ✅ | Working | `middleware/auth.ts:50-85` — `requireRole`, `requirePermission`, CSRF double-submit for cookie auth; exercised implicitly all session |

**Validation & error handling:** Login/register/forgot/reset all use zod schemas with rate limits — solid. Profile update does not.
**Permissions:** `hasAnyRole()` in `utils/roles.ts:13-37` treats super_admin/admin/principal as always-authorized regardless of target role list — a broad implicit-bypass pattern, correct by design but worth knowing.

---

## 2. Dashboard

| Requirement | Impl. | Test | Work | Status | Evidence |
|---|:---:|:---:|:---:|---|---|
| Admin/Principal dashboard stats | ✅ | ❌ | — | Needs testing | `dashboard.routes.ts:10-278`, tenant-scoped SQL |
| Teacher dashboard (own classes only) | ✅ | ❌ | — | Needs testing | Internal role branch, `dashboard.routes.ts` |
| Student dashboard (own data only) | ✅ | ❌ | — | Needs testing | same |
| Parent dashboard (own children, multi-child switch) | ✅ | ❌ | — | Needs testing | same |
| Accountant dashboard | ✅ | ❌ | — | Needs testing | same |
| Not-found / wrong-role handling | ✅ | ❌ | — | Needs testing | 404 if profile record missing, 403 for unrecognized role — `dashboard.routes.ts:96,142,277` |

No gaps found. Single endpoint, internally role-branched, self-scoped by design — appropriate that it has no `requireRole` beyond `authMiddleware`.

---

## 3. Institution & Academic Setup

| Requirement | Impl. | Test | Work | Status | Evidence |
|---|:---:|:---:|:---:|---|---|
| Edit own institution profile / logo | ✅ | ❌ | — | Needs testing | `institutions.routes.ts:85-152`; `InstitutionSetup.tsx:348-393` |
| Super-admin: list/create/delete institutions | ✅ | ✅ | ✅ | **Fixed 2026-08-30** | `institutions.routes.ts:25-41,60-82,175-195` has safeguarded delete. Built `SuperAdminInstitutions.tsx` at `/super-admin/institutions`, gated `roles: ['super_admin']` in `App.tsx`'s `ProtectedRoute` and in `roleNav.ts`/`Sidebar.tsx` so the link and route are both invisible/unreachable to non-super-admins. Live-verified with a real super_admin token: list + search return real data, create adds a real new institution, delete correctly surfaces the backend's existing safeguards (blocked on the last remaining institution and on one with active users/students/teachers, both errors shown as a toast) and successfully removes an empty test institution |
| Academic year CRUD, set active | ✅ | ❌ | — | Needs testing | Single-active-year enforced, 409 on downstream refs |
| Rollover / promotion / closing wizards | ✅ | ❌ | — | Needs testing | `AcademicYears.tsx` wizard tabs w/ confirm guards |
| Departments CRUD, archive/restore | ✅ | ❌ | — | Needs testing | Duplicate-code check, dependency guard on archive |
| Academic Calendar CRUD | ✅ | ✅ | ✅ | **Fixed 2026-08-28 & 2026-08-30** | `requirePermission('calendar.view')`/`'calendar.manage'` added and live-verified (2026-08-28). Required-field validation (`name`/`start_date`/`end_date`/`type`) added 2026-08-30 — live-verified: missing fields now return a clean 400 instead of relying on the DB's raw `D1_TYPE_ERROR`/`CHECK` constraint message bubbling through the existing try/catch |
| Grade / system settings | ✅ | ❌ | — | Needs testing | `settings.routes.ts:44-76`, `requirePermission('institution.manage')` |

**Validation strategy is inconsistent** across this area: zod for institutions, manual field checks for years/departments, none at all for calendar.

---

## 4. Admissions

| Requirement | Impl. | Test | Work | Status | Evidence |
|---|:---:|:---:|:---:|---|---|
| Create inquiry | ✅ | ✅ | ✅ | **Fixed 2026-08-31** | Added `CreateInquirySchema` (zod) via `validateBody()` — `student_name`/`parent_name`/`parent_phone`/`applying_for_class` now required, `parent_email` format-checked. Live-verified: missing fields return a clean `Validation error: ...` 400, a valid payload still creates the inquiry |
| Convert inquiry → application | ✅ | ✅ | ✅ | **Hardened 2026-08-31** | Kanban drag-to-convert UI. The assembled application input mixes inquiry data with optional overrides — added a check in `convertInquiryToApplication()` that a few fields required downstream (notably `academic_year_id`) actually ended up populated, throwing a clean error instead of letting a raw D1 bind failure surface if the inquiry itself never captured one |
| Create application | ✅ | ✅ | ✅ | **Fixed 2026-08-31** | Added `CreateApplicationSchema` (zod) via `validateBody()` — `student_first_name`/`student_last_name`/`academic_year_id`/`parent_name`/`parent_phone` now required, `parent_email` format-checked; previously relied on client-side HTML `required` only, bypassable via direct API. Live-verified: missing fields return a clean 400, a valid payload still creates the application |
| **Approve application → creates student** | ✅ | ✅ | ✅ | **Complete** | Atomic guarded UPDATE + batch student creation; **genuinely tested**, including a real concurrency race (see §Tests below) |
| Reject application | ✅ | ✅ | ✅ | **Fixed 2026-08-30 — real data-integrity bug** | Was a blind `UPDATE ... WHERE id = ?` with no status guard, unlike `approveApplication` which is carefully guarded against double-processing. Added `rejectApplicationIfNotApproved()` (same guarded-update pattern) plus a service-level check that throws a clean 409 if the application is already Approved. Live-verified end-to-end: approved a test application (creating a real student), then attempted to reject it — got `409 Cannot reject an application that has already been approved...`, confirmed the application's `status` stayed `Approved` in the DB (not corrupted to `Rejected` while a live student record still pointed at it); a normal reject-while-pending still works |
| Document upload | 🔴 | — | — | Not implemented (product-scope question, not a bug) | No endpoint, no DB columns — only a decorative icon in the UI. Not built this pass — building it is a real feature addition, not a fix, and wasn't in the explicitly-approved scope |
| Pagination (Kanban board) | ✅ | ✅ | ✅ | **Fixed 2026-08-31** | The board's 3 columns rendered every matching card unbounded. Rather than force numbered pages onto a drag-and-drop board, each column now renders only its first 20 cards with a "Show more" button (resets to 20 whenever a filter changes) — caps DOM size on a large dataset while keeping full drag-and-drop over the visible subset intact |
| Admission number generation | ✅ | 🟡 | ✅ | Working | Auto-generated, format verified in this session's live testing |

**Test coverage (`admissions-approval.test.ts`):** (1) approve creates student atomically and links it; (2) a second sequential approval is rejected, no duplicate student created; (3) two **concurrent** approval calls — exactly one wins (`changes:1`), the other loses cleanly (`changes:0`). **Added 2026-08-30**, matching the reject-guard fix: (4) a pending application rejects cleanly; (5) rejecting an already-Approved application is refused, student link intact; (6) a concurrent approve-then-reject race leaves the application `Approved`. Inquiry flow is still untested.

---

## 5. Students

| Requirement | Impl. | Test | Work | Status | Evidence |
|---|:---:|:---:|:---:|---|---|
| Add student (manual) | ✅ | ✅ | ✅ | **Working** | Live-verified this session: clean validation errors for missing required fields, successful creation |
| List / search / filter / paginate | ✅ | ❌ | — | Needs testing | Role-scoped, search+filters+limit/offset+total count — `routes.ts:57-320` |
| Edit student | ✅ | ❌ | — | Needs testing | `routes.ts:377-411` |
| Archive / restore | ✅ | ❌ | — | Needs testing | Dependency checks block if attendance/marks/fees exist, 409 on conflict |
| Bulk actions (general) | ✅ | ❌ | — | Needs testing | `routes.ts:466-535` |
| **Bulk delete** | ✅ | ✅ | ✅ | **Fixed 2026-08-28** | Was: `routes.ts:541` called `service.deleteStudent(sId, user.sub)` but the real signature is `(id, institutionId, userId, force)` — the user ID landed in the institution-ID slot, so the ownership check mismatched and delete silently no-opped per row while the route still reported `success:true`. Fixed to pass `user.institution_id`; verified live — a test student was correctly soft-deleted (`is_active`→0, `status`→`WITHDRAWN`) |
| Bulk import (Excel) | ✅ | ❌ | — | Needs testing | Client-side loop over `POST /students`, template download, drag-drop |
| Guardian dedicated CRUD (`/guardians`) | ✅ | ✅ | ✅ | **Fixed 2026-08-30, audit logging added 2026-08-31** | Added required-field validation (`student_id`/`name`/`relationship`) and try/catch around create/update/delete, matching the pattern used elsewhere for D1_TYPE_ERROR hardening. `GuardiansTab.tsx` remains read-only; real guardian data still flows through the student create/update payload — these mutating routes exist for API/future-UI use, not currently wired to the frontend. `CREATE_GUARDIAN`/`UPDATE_GUARDIAN`/`DELETE_GUARDIAN` audit events added and live-verified |
| Enrollment dedicated CRUD | ✅ | ✅ | ✅ | **Fixed 2026-08-30, audit logging added 2026-08-31** | Same fix — required-field validation plus try/catch. Live-verified: missing fields return a clean 400, a valid create/delete cycle still works. `CREATE_ENROLLMENT`/`UPDATE_ENROLLMENT`/`DELETE_ENROLLMENT` audit events added |
| **Audit logging (create/update/archive/restore/delete/bulk)** | ✅ | ✅ | ✅ | **Fixed 2026-08-28** | Was zero audit events for any Students CRUD. Added `createAuditLog()` calls across all mutating routes and bulk-action branches; live-verified `ARCHIVE_STUDENT`/`RESTORE_STUDENT` rows land in `audit_logs` |

**Note:** This session's earlier live API testing exercised the students → teachers → classes → attendance → exams happy path end-to-end and it worked; the bulk-delete bug above was found separately by direct code inspection, not by that earlier test run (bulk actions weren't part of that smoke test).

---

## 6. Teachers / Staff

| Requirement | Impl. | Test | Work | Status | Evidence |
|---|:---:|:---:|:---:|---|---|
| Add teacher | ✅ | ✅ | ✅ | **Working (via UI)** | Live-verified this session |
| Edit teacher | ✅ | ❌ | — | Needs testing | `teachers.routes.ts:101-210` |
| Deactivate / reactivate | ✅ | ❌ | — | Needs testing | UI buttons confirmed present |
| Search / filter (dept, designation, status) | ✅ | ❌ | — | Needs testing | `Teachers.tsx` |
| Pagination | ✅ | ✅ | ✅ | **Fixed 2026-08-31** | Filtering was (and remains) client-side over the full fetched list, so server-side pagination would have broken filtering across pages; added client-side pagination instead — 20 rows/page, numbered controls matching `Students.tsx`'s existing pattern, resets to page 1 on any filter change. Applies to both grid and table view modes |
| Bulk import/export (Excel) | ✅ | ❌ | — | Needs testing | Confirmed present |
| Teacher notes / documents | ✅ | ❌ | — | Needs testing | File-type validated, role-gated |
| **Known bug — teacher create via raw API** | ✅ | ✅ | ✅ | **Fixed 2026-08-28** | Was: `teachers.repository.ts` `create()` bound `input.status` with no fallback — a request missing it crashed with `D1_TYPE_ERROR`. Fixed with `input.status \|\| 'ACTIVE'` plus clean 400 validation for missing `employee_id`/`first_name`/`last_name` in the route. Live-verified: create without `status` now succeeds (201), missing `employee_id` returns a clean 400 |
| Teacher assignments (deprecated module) | ✅ | ✅ | ✅ | **Fixed 2026-08-30, audit logging added 2026-08-31** | Added required-field validation and try/catch around the reference check in `teacher-assignments.routes.ts`. Live-verified: missing fields return a clean 400; a real UNIQUE-constraint violation (duplicate assignment) that would previously have been an unhandled 500 now returns a clean `400` with the DB's own message. `CREATE_TEACHER_ASSIGNMENT`/`DELETE_TEACHER_ASSIGNMENT` audit events added |
| Teacher-assignment GET routes | ✅ | ✅ | — | **Investigated 2026-08-30 — intentional, not fixed** | No role restriction beyond `authMiddleware` (any authenticated user, including students, can query them) — but confirmed the active successor module (`teaching-allocations`) has the *identical* behavior on its GET routes (`allocations.routes.ts` — only mutations are `requirePermission`-gated, reads are open to any authenticated institution member). This is a codebase-wide convention, not a one-off bug in the deprecated module; "fixing" only the deprecated module would be inconsistent with its replacement and wouldn't close any real gap. Left as-is |
| Teaching allocations (workload/conflict engine) | ✅ | ❌ | — | Needs testing | Thorough validation: duplicate/overload/45hr-cap checks, `requirePermission('academic.manage')` |
| Teaching-allocations dashboard/conflicts endpoints | ✅ | ✅ | ✅ | **Fixed 2026-08-30** | Added a Workload & Conflict Report panel to the existing Teacher↔Subject Assignments UI in `AcademicSetup.tsx`, consuming `GET /teaching-allocations/dashboard` + `/conflicts` and refreshing after every allocation add/edit/remove. Live-verified against real seed data (returned real unallocated-subject warnings for the active academic year) |
| Teaching-allocations bulk-allocation endpoint (`POST /bulk`) | ⚠️ | — | — | Backend-only | Still no dedicated frontend — the existing UI only creates/edits allocations one at a time. Judged lower priority than the dashboard/conflicts gap above; left open |
| **Audit logging (create/update/delete/bulk)** | ✅ | ✅ | ✅ | **Fixed 2026-08-28** | Was zero audit events for any Teachers CRUD. Added `createAuditLog()` calls across create/update/delete/bulk-action branches; live-verified `CREATE_TEACHER`/`UPDATE_TEACHER`/`DELETE_TEACHER` rows land in `audit_logs` |

---

## 7. Classes, Sections, Subjects, Timetable

| Requirement | Impl. | Test | Work | Status | Evidence |
|---|:---:|:---:|:---:|---|---|
| Section CRUD (create/edit/archive/restore/delete) | ✅ | ❌ | — | Needs testing | Full CRUD, `requirePermission('academic.manage')` on every write — `sections.routes.ts` |
| Section documents (upload/download/delete) | ✅ | ❌ | — | Needs testing | Same file, permission-gated |
| Subject CRUD (create/edit/archive/restore/delete) | ✅ | ❌ | — | Needs testing | Full CRUD, same permission pattern — `subjects.routes.ts` |
| Subject lesson plans / assessments / documents | ✅ | ❌ | — | Needs testing | Present, but **these sub-endpoints have no explicit `requirePermission`** (only the top-level bulk-action does) — worth a closer look |
| Add class + sections (UI) | ✅ | ❌ | — | Needs testing | `SectionFormModal.tsx:35` — confirmed real Add/Edit modal |
| **Weekly timetable CRUD** | ✅ | ✅ | ✅ | **Fixed 2026-08-28** | `requirePermission('timetable.view')`/`'timetable.manage'` added on every route. Live-verified with a real student token: reads succeed (`timetable.view` is in the student permission set), writes still blocked by the pre-existing `isTeacherOnly` check plus the new permission gate |
| Timetable slots | ✅ | ❌ | — | Needs testing | Not deeply inspected beyond route presence |
| Teacher-view timetable (own periods only) | ❓ | ❌ | — | Unknown | Not directly verified this pass |
| Student-view timetable (section-wide) | ❓ | ❌ | — | Unknown | Not directly verified this pass |

---

## 8. Attendance

| Requirement | Impl. | Test | Work | Status | Evidence |
|---|:---:|:---:|:---:|---|---|
| Create attendance session | ✅ | ✅ | ✅ | **Working** | Live-verified this session against real dev server + DB |
| Mark attendance (raw array body) | ✅ | ✅ | ✅ | **Working** | Live-verified; body must be a raw JSON array, not `{records:[...]}` |
| Fetch marked attendance back | ✅ | ✅ | ✅ | **Working** | Live-verified |
| Edit already-marked day | ❓ | ❌ | — | Unknown | Not exercised this session |
| Block/warn on future-date marking | ❓ | ❌ | — | Unknown | Not exercised this session |
| Attendance reports (by student, date range) | ✅ | ❌ | — | Needs testing | `attendance.routes.ts:292-315` |
| Teacher self-attendance | ✅ | ❌ | — | Needs testing | Separate `teacher-attendance` module, not deep-inspected this pass |
| Student leave requests → attendance reflection | ✅ | ❌ | — | Needs testing | `student-leaves.routes.ts:87-171`, role/relationship-scoped access |
| Attendance module publishes audit events | ✅ | — | — | Confirmed | 3 `createAuditLog`/`eventBus` call sites found, unlike Students/Teachers which have none |

---

## 9. Exams, Grading, Report Cards

| Requirement | Impl. | Test | Work | Status | Evidence |
|---|:---:|:---:|:---:|---|---|
| Create / list / get exam | ✅ | ✅ | ✅ | **Working** | Live-verified this session; `exams.routes.ts:47-174` |
| Update exam | ✅ | ✅ | ✅ | **Fixed 2026-08-30** | Backend supports it (`PUT /:id`, lock + override check); added an Edit Exam UI to `Exams.tsx` reusing the existing Add-Exam modal in edit mode (name/year/program/semester/dates + status, only editable in edit mode). Live-verified via direct API call against a real exam: name update took effect immediately and was reverted |
| Delete exam | ✅ | ❌ | — | Needs testing | Role-restricted, lock check |
| Add/remove exam subject (max/min marks) | ✅ | ✅ | ✅ | **Working** | Live-verified |
| Enter marks | ✅ | ✅ | ✅ | **Working** | Live-verified, including array validation and per-record teacher-scope check |
| Reject out-of-range marks (e.g. 150/100) | ✅ | ✅ | ✅ | **Working** | Live-verified this session |
| **Known bug — `saveMarks` max_marks bind** | ✅ | ✅ | ✅ | **Fixed 2026-08-30** | Was: `exams.repository.ts` bound `record.max_marks` directly with no fallback; raw API omitting it crashed with a raw D1 error, and even after adding a `?? null` fallback it still failed a `NOT NULL` DB constraint. Real fix: `ExamsService.saveMarks()` now defaults a missing `max_marks` per-record to the exam subject's configured max before validation/save (mirroring the logic it already used for the marks-range check). Live-verified: a raw request omitting `max_marks` now succeeds and the saved row correctly picked up the exam subject's max (100) |
| **Known bug — mark entry missing `student_id`** | ✅ | ✅ | ✅ | **Fixed 2026-08-30** | `exams.routes.ts`'s `POST /subjects/:id/marks` looked up enrollment by `record.student_id` with no presence check first — a raw API record missing `student_id` crashed with a raw D1 bind error. Added an upfront validation loop returning a clean 400. Live-verified |
| Single-student report card | ✅ | ❌ | — | Needs testing | Layered permission checks (self/parent/teacher-scope); output is `window.print()`, not a real PDF file |
| Bulk/whole-exam report cards | ✅ | ✅ | ✅ | **Working — fixed 2026-08-28** | Added "Print All Report Cards" button to `Exams.tsx` calling `grades.routes.ts:183-230` (`GET /grades/report-card/:examId`); extracted shared `ReportCardBody` component reused by both single and bulk views, print CSS paginates one card per page. Also fixed: `GenerateReportCardJob` background job was a hardcoded-fake-count stub — now calls `GradesService.buildAllReportCards()` for real; live-verified it returns `0` for an exam with no marks and `2` after seeding 2 students' marks |
| Grade scales (set boundaries) | ✅ | ❌ | — | Needs testing | `GradeSettings.tsx` — load defaults, add/edit/delete custom rows |
| Backlogs (course-wide + per-student) | ✅ | ❌ | — | Needs testing — real UI, not backend-only | `BacklogsPanel.tsx`, `TranscriptTab.tsx` |
| Transcript (SGPA/CGPA) | ✅ | ❌ | — | Needs testing | `TranscriptTab.tsx` — real CGPA/SGPA table, pass/fail badges |
| Prerequisites (add/list/delete) | ✅ | ❌ | — | Needs testing | `PrerequisitesPanel.tsx` — real Add/Delete UI |
| Electives (register/withdraw/roster) | ✅ | ❌ | — | Needs testing | `ElectivesTab.tsx` — real eligibility-badge + register/withdraw buttons; `REGISTER_ELECTIVE`/`WITHDRAW_ELECTIVE` audit logging added 2026-08-31 |

---

## 10. Homework & Study Materials

| Requirement | Impl. | Test | Work | Status | Evidence |
|---|:---:|:---:|:---:|---|---|
| Post homework to a section | ✅ | ❌ | — | Needs testing | `homework.routes.ts` POST, custom `checkHomeworkManageAccess()` scope check (permission + ownership + section/subject access) |
| Edit / delete homework | ✅ | ❌ | — | Needs testing | Confirmed via `HomeworkList.tsx:144-148` `handleDelete` w/ `confirm()` |
| Filter by class / subject | ✅ | ❌ | — | Needs testing | `HomeworkList.tsx:35-36,189-197` |
| Study material upload/download | ✅ | ❌ | — | Needs testing | `study-materials.routes.ts` full CRUD (GET/POST upload/GET download/DELETE) |

Homework's custom access-check function is a genuinely good pattern — checks permission, ownership, and section/subject scope together, unlike several other modules that only check `authMiddleware`.

---

## 11. Fees, Finance

| Requirement | Impl. | Test | Work | Status | Evidence |
|---|:---:|:---:|:---:|---|---|
| Fee structure create | ✅ | ❌ | — | Needs testing | Amount validation + academic-year-lock check |
| Fee structure versioning / delete | ✅ | ❌ | — | Needs testing | Blocks delete if allocations exist (409) |
| **Apply fee structure to student (generate ledger)** | ✅ | ✅ | ✅ | **Fixed 2026-08-28** | Backend real: `POST /fees/records/generate` (`fees.routes.ts:162-186`). Was: frontend called the wrong path — `StudentFees.tsx:211` hit `POST /fees/generate-ledger`, which doesn't exist (404). Fixed to call the real path; verified live — old path confirmed 404, new path returns a clean validation response |
| **Payment collection** | ✅ | ✅ | ✅ | **Complete** | Real transactional batching (payment+receipt+ledger), race-safe atomic receipt numbering, genuinely tested incl. concurrency |
| Partial payment / balance tracking | ✅ | ✅ | ✅ | Working | Status auto-set PAID/PARTIALLY_PAID/UNPAID, verified by test |
| Refunds | ✅ | ❌ | — | Needs testing | Validated against cumulative refunded amount |
| Fine engine (flat/daily, capped) | ✅ | ❌ | — | Needs testing | Not verified in UI |

**Test coverage (`fees-payment.test.ts`, read in full, 163 lines, 6 `it()` blocks):** atomic payment+receipt+ledger creation; full-balance → PAID; overpayment rejected; duplicate transaction-reference rejected; concurrent stale-write correctly loses; 10 concurrent receipt-sequence reservations all unique. This is genuinely good, real concurrency testing — but it's service/repository-level only, no HTTP route or permission-middleware test exists.

---

## 12. GL Accounting

| Requirement | Impl. | Test | Work | Status | Evidence |
|---|:---:|:---:|:---:|---|---|
| Account CRUD | ✅ | ❌ | — | Needs testing | `requirePermission('gl.manage'/'gl.view')`, duplicate-code 409, blocks delete if journal lines/children exist |
| Journal entry create | ✅ | ❌ | — | Needs testing | Requires ≥2 lines, each single debit XOR credit, **checks total debit == total credit within 0.005 tolerance** |
| Post / void journal entry | ✅ | ❌ | — | Needs testing | Re-validates balance before posting; only DRAFT→post, only POSTED→void |
| Trial balance | ✅ | ❌ | — | Needs testing | Computed server-side with correct natural-side logic |

No gaps found — this is a well-built double-entry engine, just entirely untested.

---

## 13. Payroll

| Requirement | Impl. | Test | Work | Status | Evidence |
|---|:---:|:---:|:---:|---|---|
| Payroll run generation | ✅ | ❌ | — | Needs testing | basic+DA+HRA+allowances = gross; PF+TDS+other+attendance-based LOP = deductions; net = max(0, gross−deductions); blocks re-running a Finalized run |
| Run detail / breakdown view | ✅ | ❌ | — | Needs testing | Full basic/DA/HRA/PF/TDS/LOP/net breakdown shown |
| Payslip view/print | ⚠️ | ❌ | — | Partial | Ownership-checked (teacher sees own only); **print-only via `window.print()`, no real PDF/file download** |
| Salary structure CRUD | ❓ | ❌ | — | Unknown | Routes confirmed role-gated; UI controls not deeply inspected |

---

## 14. Leave Management

| Requirement | Impl. | Test | Work | Status | Evidence |
|---|:---:|:---:|:---:|---|---|
| Leave type CRUD | ✅ | ❌ | — | Needs testing | Role-gated, 404 on missing, validates required fields |
| Assign leave quota | ✅ | ❌ | — | Needs testing | `INSERT OR IGNORE` per teacher×type |
| Apply for leave | ✅ | ❌ | — | Needs testing | Restricted to teacher role, validates fields |
| Approve / reject | ✅ | ❌ | — | Needs testing | Checks status is Pending, requires remarks on reject |
| **Over-quota rejection** | ✅ | ✅ | ✅ | **Fixed 2026-08-28** | `leave.service.ts` `approveApplication()` now fetches the balance and blocks approval if `days_count > remaining`. Live-verified: 10-day request against 5-day quota blocked; 3-day approved and deducted correctly; second 3-day request blocked with 2 remaining |
| Student leave (separate module) | ✅ | ❌ | — | Needs testing | Role/relationship-scoped access control |
| Duplicate leave pages | ✅ | ✅ | ✅ | **Fixed 2026-08-28 (stale row corrected 2026-08-31)** | `Leaves.tsx`/`Leaves.css` were the dead, unrouted duplicate and have been deleted; `LeaveTypes.tsx`/`MyLeaveApplications.tsx`/`LeaveApprovals.tsx` are the real routed pages |

---

## 15. Communication

| Requirement | Impl. | Test | Work | Status | Evidence |
|---|:---:|:---:|:---:|---|---|
| Announcements CRUD + audience targeting | ✅ | ❌ | — | Needs testing | Real audience filtering in SQL (`visible_to_students/teachers/parents`), plus section-scoping — `announcements.service.ts:17-46` |
| Direct messaging | ✅ | ❌ | — | Needs testing | Real contacts/send/history/unread-count; polling every 4s, **not real-time** (`Messaging.tsx:48-50`); message-send audit logging added 2026-08-31 (`SEND_MESSAGE`, logs sender→receiver only, not content) |
| Broadcasts — audience targeting | ✅ | ❌ | — | Needs testing | Real SQL-resolved recipients by class/section/department/role/custom |
| Broadcast — email delivery | ✅ | ❌ | — | Needs testing (real) | Resend API, falls back to console-log mock only if key unset |
| **Broadcast — SMS/WhatsApp delivery** | 🔴 | — | — | **Fake** | `broadcasts/notification.service.ts:57-75` — pure `console.log` stubs, no real provider, despite UI presenting these as working channels |
| Notification templates/queue/preferences/analytics | ✅ | ❌ | — | Needs testing | Full 5-tab UI |
| Push subscriptions | ✅ | ✅ | ✅ | **Stale row corrected 2026-08-31 — already fully built** | This row's "no dedicated device-registration UI confirmed" claim was wrong/stale: `services/pushNotification.ts` has a complete, correct subscribe/unsubscribe flow (VAPID key fetch, `PushManager.subscribe`, posts to `/notifications/push/subscribe`); `public/sw.js` has real `push`/`notificationclick` handlers; `main.tsx` registers the service worker in production and auto-resubscribes; `Layout.tsx` has a topbar bell toggle plus an opt-in banner; `Profile.tsx` has a full "Notifications" tab (permission state, enable/disable, category preferences via `/push/preferences`) and a "Devices" tab (list registered devices via `/push/devices`, unregister via `DELETE /push/devices/:id`). Nothing to fix — this was a documentation error, not a code gap |
| Real-time delivery (WebSocket/SSE) | 🔴 | — | — | Not implemented | Zero WebSocket/EventSource usage found anywhere in frontend — everything is polling-based despite push-subscription plumbing existing |

---

## 16. Library

| Requirement | Impl. | Test | Work | Status | Evidence |
|---|:---:|:---:|:---:|---|---|
| Catalog add/edit/delete, reference-vs-lending distinction | ✅ | ❌ | — | Needs testing | `library.routes.ts:65-149` |
| Issue book | ✅ | ❌ | — | Needs testing | Checks reference-only and available-copies before allowing issue |
| Return + fine | ✅ | ❌ | — | Needs testing | ₹5/day overdue calculated server-side |
| Search catalog | ✅ | ❌ | — | Needs testing | `Library.tsx:52-54` |
| **Permission gating** | ✅ | ✅ | ✅ | **Fixed 2026-08-28** | `requirePermission('library.access')` on reads, `requirePermission('library.manage')` on writes. Live-verified with a real student token: reads succeed, writes 403 |
| **Audit logging** | ✅ | ✅ | ✅ | **Fixed 2026-08-31** | Was zero audit events for any Library mutation. Added `createAuditLog()` to add/edit/delete book, issue, return, and pay-fine (6 sites); live-verified `CREATE_LIBRARY_BOOK`/`ISSUE_LIBRARY_BOOK` rows land in `audit_logs` |

---

## 17. Transport

| Requirement | Impl. | Test | Work | Status | Evidence |
|---|:---:|:---:|:---:|---|---|
| Route/vehicle CRUD | ✅ | ❌ | — | Needs testing | Validates route_name + monthly_charge |
| Assign student to route | ✅ | ❌ | — | Needs testing | Upserts allocation |
| Route billing generation | ✅ | ❌ | — | Needs testing | Idempotent, skips already-billed |
| **Permission gating** | ✅ | ✅ | ✅ | **Fixed 2026-08-28** | `requirePermission('transport.view')` on reads, `requirePermission('transport.manage')` on writes (routes, allocations, notify, billing). Live-verified with a real student token |
| **Audit logging** | ✅ | ✅ | ✅ | **Fixed 2026-08-31** | Was zero audit events for any Transport mutation. Added `createAuditLog()` to route create/edit/delete, route alert notify, allocation assign/reassign/remove, and monthly billing generation (7 sites); live-verified `CREATE_TRANSPORT_ROUTE` lands in `audit_logs` |

---

## 18. Hostel

| Requirement | Impl. | Test | Work | Status | Evidence |
|---|:---:|:---:|:---:|---|---|
| Block/room/bed CRUD | ✅ | ❌ | — | Needs testing | `requirePermission('hostel.manage')`, validates capacity ≥1, unique room number (409 on conflict) |
| Student allotment | ✅ | ❌ | — | Needs testing | Checks room exists, checks no existing active allocation, **checks real capacity via `countActiveOccupants`** (409 if full) |
| Vacate / reallocation | ✅ | ❌ | — | Needs testing | Vacated beds are genuinely freed for reallocation (capacity computed dynamically, not a dead status flag) |
| Room deletion guard | ✅ | ❌ | — | Needs testing | Blocks deletion if occupied |

No gaps found — this is the most robustly implemented facility module in the codebase.

---

## 19. Canteen

| Requirement | Impl. | Test | Work | Status | Evidence |
|---|:---:|:---:|:---:|---|---|
| Menu item CRUD | ✅ | ❌ | — | Needs testing | `requirePermission('canteen.manage')`, validates non-negative price |
| Meal-plan subscriptions | ✅ | ❌ | — | Needs testing | One active subscription per student enforced (409 on duplicate) |
| Billing | ✅ | ❌ | — | Needs testing | Idempotent per month |
| Per-order transaction / wallet balance | 🔴 | — | — | **Does not exist** | No orders table, no wallet concept anywhere — canteen is subscription+monthly-billing only, not a per-purchase POS system. Confirm this matches what was actually expected |

---

## 20. Visitors

| Requirement | Impl. | Test | Work | Status | Evidence |
|---|:---:|:---:|:---:|---|---|
| Check-in (create) | ✅ | ❌ | — | Needs testing | Validates name/purpose/host/phone/in_time |
| Checkout | ✅ | ❌ | — | Needs testing | Validates out_time, 404 if not found |
| Search past logs | ❌ | — | — | Not implemented | No search/filter/pagination UI (small dataset assumed) |
| **Permission gating** | ✅ | ✅ | ✅ | **Fixed 2026-08-28** | `requirePermission('visitors.manage')` on the whole router. Live-verified with a real student token (403) and admin token (200) |

---

## 21. Assets

| Requirement | Impl. | Test | Work | Status | Evidence |
|---|:---:|:---:|:---:|---|---|
| Add asset | ✅ | ❌ | — | Needs testing | `requireRole('admin','super_admin','Principal')`, validates name/category |
| Edit / retire (delete) asset | ✅ | ❌ | — | Needs testing | Same role gate, 404 if not found |

Full CRUD confirmed both sides, proper permission gating, clean error responses. No gaps found.

---

## 22. Placements

| Requirement | Impl. | Test | Work | Status | Evidence |
|---|:---:|:---:|:---:|---|---|
| Company/drive CRUD | ✅ | ❌ | — | Needs testing | `requirePermission('academic.manage')`, typed `PlacementsServiceError` |
| Eligibility check (CGPA/backlogs) | ✅ | ❌ | — | Needs testing | Role-scoped, real cross-module calls to Transcript/Backlogs services |
| Student apply to drive | ✅ | ❌ | — | Needs testing | Self-service or staff-on-behalf |
| Staff roster/applications view | ✅ | ❌ | — | Needs testing | Role-gated |
| Mark result / offer | ✅ | ❌ | — | Needs testing | `requirePermission('academic.manage')` |
| Withdraw application | ✅ | ❌ | — | Needs testing | Ownership-checked, self-withdraw UI not directly confirmed |

The most mature module found in the codebase — layered service/repo, typed errors, explicit reusable access-control helpers. No gaps found.

---

## 23. Alumni

| Requirement | Impl. | Test | Work | Status | Evidence |
|---|:---:|:---:|:---:|---|---|
| List/view alumni directory | ✅ | ❌ | — | Needs testing | `Alumni.tsx` Directory tab |
| Create alumni record | ✅ | ❌ | — | Needs testing | `requireRole` gated |
| Edit alumni record | ✅ | ✅ | ✅ | **Working — fixed 2026-08-28** | Added Edit button + reused Add modal in edit mode, calling `PUT /alumni/:id`. Live-verified: created a test alumnus, edited name/year/status via the endpoint, confirmed the change persisted |
| Delete alumni (soft) | ✅ | ❌ | — | Needs testing | `is_active=0` |
| Alumni events CRUD | ✅ | ❌ | — | Needs testing | Confirmed real UI, not a stub |
| Event RSVP | ✅ | ✅ | ✅ | **Working — fixed 2026-08-28** | Added an RSVP modal (staff pick an alumnus + response) calling `POST /alumni/events/:id/rsvp`. Live-verified: RSVP'd a test alumnus as GOING, confirmed `going_count` incremented on the event |
| Auto-population from graduating students | ✅ | ❌ | ✅ | Confirmed real | `students.service.ts:137-170` fires on GRADUATED/ALUMNI status transition, dedupes on student_id. **This contradicts the July 2026 audit's "no auto-population" claim — it has since been built** |
| Donations tracking | 🔴 | — | — | Not implemented | No donation-related code found anywhere — this part of the old audit's "shallow" claim still holds |

---

## 24. Certificates

| Requirement | Impl. | Test | Work | Status | Evidence |
|---|:---:|:---:|:---:|---|---|
| Manage templates | ✅ | ❌ | — | Needs testing | `requirePermission('certificates.manage')` for writes |
| Preview certificate | ✅ | ❌ | — | Needs testing | Validates templateId+studentId |
| Issue certificate | ✅ | ❌ | — | Needs testing | Generates reference number, persists issuance record |
| **Real data substitution (no leaking placeholders)** | ✅ | ❌ | — | Confirmed by code read | `certificates.service.ts:130-178` pulls real student/guardian/institution/attendance data, defaults missing fields to `'-'` — no `{{placeholder}}` leakage |
| Issuance history | ✅ | ✅ | ✅ | **Fixed 2026-08-30** | Added an "Issuance History" panel to `Certificates.tsx` (per selected student) consuming `GET /issuances/:studentId`, with a "View / Reprint" action per row. Live-verified: issued a real certificate, confirmed it appears in the history response with the correct `template_name`/`reference_number`/`rendered_html` |
| **Known bug — print flow had no allowlisted print-CSS id** | ✅ | ✅ | ✅ | **Fixed 2026-08-30** | Found while building the history panel: `Certificates.tsx`'s preview/print area (and the codebase's global `@media print` rule, which hides `body *` and only shows an allowlist of `#printable-*` ids) never had a matching id — so the existing "Print & Issue" button's `window.print()` would have produced a blank page. Added `id="printable-certificate"` to the preview/reprint containers and to the global allowlist in `index.css`, reusing the same pattern already used correctly for report cards |
| Output format | ⚠️ | — | — | Note | Backend renders HTML; the "PDF" is achieved via browser `window.print()`, not a server-generated PDF file |

---

## 25. Compliance

| Requirement | Impl. | Test | Work | Status | Evidence |
|---|:---:|:---:|:---:|---|---|
| Enrollment summary | ✅ | ❌ | — | Needs testing | `requirePermission('compliance.view')` on whole router |
| Attendance summary (date range) | ✅ | ❌ | — | Needs testing | |
| Fee compliance summary | ✅ | ❌ | — | Needs testing | |

Genuinely a live-data reporting dashboard (not fabricated), but intentionally scoped short of real statutory/regulatory filing (e.g. UDISE+) — the frontend itself documents this (`Compliance.tsx:71,206-212` explicitly states statutory infra fields are "intentionally omitted rather than fabricated"). Only `window.print()` for output, no real export.

---

## 26. Document Center

| Requirement | Impl. | Test | Work | Status | Evidence |
|---|:---:|:---:|:---:|---|---|
| Upload (institution-level) | ✅ | ❌ | — | Needs testing | 25MB max, extension blocklist, SHA-256 checksum, virus-scan hook (EICAR-string-only) |
| List/search/filter | ✅ | ❌ | — | Needs testing | category/entity_type/entity_id/status/search/limit/offset |
| Versioning | ✅ | ❌ | — | Needs testing | `POST /:id/version` |
| Download (direct + signed URL) | ✅ | ❌ | — | Needs testing | Two separate download paths both present |
| Archive/restore/soft-delete | ✅ | ❌ | — | Needs testing | Clean 400 on not-found via service errors |
| Checksum verify | ✅ | ❌ | — | Needs testing | `GET /:id/verify` |
| **Role-based visibility ("staff-only" docs)** | ✅ | ✅ | ✅ | **Fixed 2026-08-28** | Was: zero `requireRole`/`requirePermission` anywhere in the module, no visibility concept in the schema at all — any authenticated user of any role could list/download/upload/version/archive/delete any document. Fixed: added a `visibility` column (`migration-documents-visibility.sql`, `'all'` default / `'staff'`), `requireRole()` on every write endpoint, per-document visibility enforcement on list/get/download/signed-url/verify, and a same-institution ownership check on the mutating endpoints (closes a related cross-tenant gap — a staff member could previously archive/version/restore/delete another institution's document by ID). Frontend upload form has a new "Staff only" checkbox. Verified live with a crafted student-role JWT: list excludes the staff-only doc (total 0 when it's the only doc), detail/download both 403, delete/upload both 403 (role check); an admin token could see/download it; a `visibility:'all'` doc remained visible/downloadable by the student token |

This was the single most significant finding in this report and has been resolved — see `REQUIREMENTS_VERIFICATION.md` §1 changelog.

---

## 27. Reports & Analytics Center

| Requirement | Impl. | Test | Work | Status | Evidence |
|---|:---:|:---:|:---:|---|---|
| KPI dashboard | ✅ | ❌ | — | Needs testing (mostly real) | Real COUNT/SUM aggregation on students/teachers/attendance/fees/notifications/documents/jobs/audit-logs |
| Report builder (Academic/Finance/Ops/Security) | ✅ | ❌ | — | Needs testing | Real data + documented fallback rows |
| CSV export | ✅ | ❌ | — | Needs testing | Real file, valid CSV |
| **"Export PDF Report"** | ⚠️ | — | — | Misleading label | `Reports.tsx:247-249,309-310` — button says PDF, calls `window.print()` |
| Scheduled report delivery | ✅ | ✅ | ✅ | **Fixed 2026-08-30 — real gap, not just untested** | `triggerScheduledReportDelivery()` built real report data and published an internal `GeneralBroadcast` event, but never read `recipients_json` at all — nothing ever actually emailed anyone. Added `renderReportEmailHtml()` (inline HTML table, capped at 50 rows) and a real `sendEmail()` call per recipient, best-effort per address. Live-verified: created a schedule with 2 recipient addresses, triggered delivery, confirmed both got a real (mock, since `RESEND_API_KEY` is a placeholder locally) email dispatch call containing an HTML table of real analytics data |
| Per-module reports (attendance/teacher workload/fees) | ✅ | ❌ | — | Needs testing (real) | `Reports.tsx:151-245` — genuinely queries live per-module endpoints |
| `passRatePct` KPI/report field | ✅ | ✅ | ✅ | **Fixed 2026-08-28** | `analytics.repository.ts` — now computed from real `student_marks`/`exam_subjects` (% meeting `min_marks`), same no-data fallback pattern as `attendanceRatePct`. Live-verified: seeded 2 pass/1 fail test marks, `POST /analytics/refresh` returned `66.7%` with `previous_value: 92.4` (the old hardcoded default) |
| **Permission gating on analytics routes** | ✅ | ✅ | ✅ | **Fixed 2026-08-28** | `requirePermission('reports.access')` added on the whole router. Live-verified: student token 403 on `/kpis`, admin token 200 |

---

## 28. Approvals Inbox

| Requirement | Impl. | Test | Work | Status | Evidence |
|---|:---:|:---:|:---:|---|---|
| List/filter pending & completed | ✅ | ❌ | — | Needs testing | Real query, tabs, search, type filter |
| Approve/reject with remarks | ✅ | ❌ | — | Needs testing | Real, updates source row via `db.batch` |
| **Anything actually creates entries here** | ✅ | ✅ | ✅ | **Fixed 2026-08-28 (Leave wired; user's explicit decision)** | `POST /leave/applications` now also raises a `LEAVE_REQUEST` entry via `ApprovalsRepository.create()`. Live-verified: applying as a teacher produced a `Pending` entry visible via `GET /approvals`. Admissions/Fee Refund/Attendance Correction deliberately left unwired — see rationale below |
| **Approve/reject actually performs the real action** | ✅ | ✅ | ✅ | **Fixed 2026-08-28** | Was: `processApproval()` did a blind `UPDATE <entity_type> SET status=...` on whatever table name was stored in the row — for leave this would have bypassed the quota check entirely and never touched `leave_balances`. Replaced with real dispatch: `entity_type === 'leave_applications'` now calls `LeaveService.approveApplication/rejectApplication` (the same quota-checked path as the dedicated page) before marking the Inbox row processed. Live-verified: approving via the Inbox deducted the real `leave_balances.used_days`, blocked a duplicate approval attempt via the dedicated page ("Application is already Approved"), and an over-quota application was blocked via the Inbox with the same error message as the dedicated page, leaving both rows consistently `Pending` |
| **Dedicated Leave Approvals page stays in sync with the Inbox** | ✅ | ✅ | ✅ | **Fixed 2026-08-28** | Approving/rejecting via `/leave/applications/:id/approve` or `/reject` now also calls `ApprovalsRepository.syncStatusForEntity()` so a matching Inbox entry doesn't go stale. Live-verified: approving via the dedicated page flipped the matching Inbox row to `Approved` automatically |
| Permission check on approve/reject action | ✅ | — | — | Present, unchanged | `approvals.routes.ts` gates create/list via `authMiddleware`; the action route relies on the dispatched domain service's own authorization where one exists (Leave) — this was not part of the scope decided for this session |

**Scope note (2026-08-28):** the user was asked whether to wire up the Inbox, remove it, or leave it — chose **wire it up**. Leave was wired because the frontend's own hardcoded stat categories (`ApprovalsInbox.tsx`) only ever anticipated `LEAVE_REQUEST`/`FEE_REFUND`/`ATTENDANCE_CORRECTION`, never Admissions, and Admissions already has its own dedicated, tested, concurrency-guarded approve flow (`admissions-approval.test.ts`) that a generic dispatcher risked disturbing. Fee Refund and Attendance Correction have no creation entrypoint anywhere in the codebase (not just here — those workflows don't exist yet at all), so there was nothing to wire for them. Extending this to Admissions/Fee Refund/Attendance Correction is future work if wanted.

---

## 29. Access Control / User & Role Management

| Requirement | Impl. | Test | Work | Status | Evidence |
|---|:---:|:---:|:---:|---|---|
| Create user + assign role | ✅ | ❌ | — | Needs testing | `requirePermission('user.manage')`, dup email/username check |
| Edit user/roles | ✅ | ❌ | — | Needs testing | Self-or-permission check |
| Deactivate/delete user | ✅ | ❌ | — | Needs testing | Soft delete |
| **Deactivation actually blocks login** | ✅ | — | ✅ | Confirmed by code | `auth.service.ts:40` — `if (!user || !user.is_active) throw` |
| **Admin resets another user's password** | ✅ | ✅ | ✅ | **Fixed 2026-08-28** | Added `POST /users/:id/reset-password` (`requirePermission('user.manage')`, same-institution check): generates a temp password, updates the hash, best-effort emails it, returns it in the response, and audit-logs `ADMIN_RESET_PASSWORD`. Added a "Reset Password" button to `ManageUsers.tsx`. Live-verified: admin got back a working temp password + audit row; a student token was blocked with 403 |
| **`POST /users` D1_TYPE_ERROR on missing fields** | ✅ | ✅ | ✅ | **Fixed 2026-08-28** | Found incidentally while verifying the above — a request missing `username`/`email`/`name` crashed with a raw `D1_TYPE_ERROR` instead of a clean validation error. Added validation in `UserService.createUser()`. Live-verified: missing `username` now returns a clean `400` |
| Role/permission CRUD | ✅ | ❌ | — | Needs testing | Create/edit/duplicate/assign/delete, system roles protected from deletion |
| Permission enforcement mechanism | ✅ | 🟡 | ✅ | Working | DB-driven `requirePermission()`, JWT-claim-based `requireRole()`, super_admin bypass — exercised implicitly throughout this session |

---

## 30. Audit Logs

| Requirement | Impl. | Test | Work | Status | Evidence |
|---|:---:|:---:|:---:|---|---|
| Log storage/query API | ✅ | ❌ | — | Needs testing | Role-gated (`admin`/`super_admin`/`Principal`/`HOD`/`Accountant`) |
| Filters (search/module/action/status/date/request-id) | ✅ | ❌ | — | Needs testing | `AuditLogs.tsx:47-54,260-288` |
| Pagination, CSV/JSON export | ✅ | ❌ | — | Needs testing | Confirmed present |
| Security-events tab | ✅ | ❌ | — | Needs testing | Stricter role gate |
| **Actual audit coverage across modules** | ✅ | ✅ | ✅ | **Gap closed 2026-08-31** | Real coverage confirmed for `fees` (15 sites), `attendance` (3), `exams` (6), `users`, `background-jobs`, `integrations`, `system-settings`, `approvals`, `students`/`teachers` (2026-08-28). This pass added `createAuditLog()` calls to every real mutation in `enrollments`, `guardians`, `library` (6 mutation sites), `transport` (7 sites incl. route-alert notify and monthly billing), `messaging` (message send, sender→receiver only — not message content), and `electives` (register/withdraw) — live-verified a representative sample (library create/issue, transport route create, guardian create) landed correctly in `audit_logs`. `transcript`, `backlogs`, `compliance`, and `dashboard` were investigated and found to have **zero mutation endpoints at all** (pure read-only reporting views over data already audited at its source) — there is genuinely nothing to log there, so they're not a gap. |

---

## 31. Job Center / Background Jobs

| Requirement | Impl. | Test | Work | Status | Evidence |
|---|:---:|:---:|:---:|---|---|
| Queue engine (fetch/lock/execute/retry/backoff/DLQ) | ✅ | ❌ | — | Needs testing | Exponential backoff (5/15/60min), dead-letter status |
| Cron scheduling UI | ⚠️ | ❌ | — | Partial | `calculateNextCronRun` only handles a few hardcoded patterns, not a full cron parser |
| Worker heartbeat | ⚠️ | — | — | Partial | Real DB upsert, but CPU/memory values are randomized mock data |
| **Nightly automated backup** | ✅ | ❌ | — | **Now real — fixed since the July audit** | `job-registry.ts:99-124`, real `SELECT *` per table → real SQL dump → uploaded to R2, institution-scoped. The old `AUDIT_REPORT.md` claim of "simulated (fake IDs/sizes)" is stale and no longer accurate |
| Generate-report-card job | ✅ | ✅ | ✅ | **Fixed 2026-08-28** | Now calls `GradesService.buildAllReportCards(examId, institutionId)` for real instead of returning a hardcoded fake count. Requires `payload.examId`. Live-verified: returned `0` for an exam with no marks, `2` after seeding 2 students' marks |
| Notification job | ✅ | ✅ | ✅ | **Fixed 2026-08-28** | Now calls `NotificationsService.processNotificationQueue(env)` for real — drains the actual pending-notification queue with the same retry/backoff/dead-letter logic the queue worker already had. Live-verified: processed 4 real queued notifications on first run, 0 on the next (queue genuinely empty) |
| Webhook delivery job | ✅ | ❌ | — | Needs testing (real) | Delegates to the genuinely-real `IntegrationsService` |
| **Permission gating** | ✅ | ✅ | ✅ | **Fixed 2026-08-28** | `requireRole('admin')` added on the whole router (admin/super_admin/principal only, via `hasAnyRole`'s built-in bypass). Live-verified: student token 403, admin token 200 |

---

## 32. Integration Center

| Requirement | Impl. | Test | Work | Status | Evidence |
|---|:---:|:---:|:---:|---|---|
| SMS gateway (Fast2SMS/MSG91/Twilio) | ✅ | ❌ | — | Needs testing (real) | Real outbound HTTP calls with decrypted per-integration credentials |
| Webhook engine | ✅ | ❌ | — | Needs testing (real) | HMAC-SHA256 signing, real `fetch()`, exponential backoff retry, DLQ, replay console |
| Credential storage | ✅ | ❌ | — | Needs testing (real) | Encrypted at rest, masked on read |
| **Payment gateway (Razorpay/Stripe)** | 🔴 | — | — | **Not implemented** | Confirmed — only a type reference exists, no service/route/credential flow. Known and deliberately deferred pending API keys per project memory |
| Route protection | ✅ | — | ✅ | Confirmed good | `requirePermission('institution.manage')` properly applied to all routes — unlike Analytics/Jobs |

---

## 33. Data Tools

| Requirement | Impl. | Test | Work | Status | Evidence |
|---|:---:|:---:|:---:|---|---|
| Excel export (students/teachers/attendance/results/fees) | ✅ | ❌ | — | Needs testing (real) | Uses real `xlsx` package, not a stub |
| CSV export | ✅ | ❌ | — | Needs testing (real) | Parallel path |
| Import with per-row validation | ✅ | ❌ | — | Needs testing (real) | `system.routes.ts:251-379` — role-gated, missing-field detection, duplicate admission_number detection, institution-scoped |
| Excel (`.xlsx`/`.xls`) import | ✅ | ✅ | ✅ | **Working — fixed 2026-08-28** | `DataTools.tsx` now converts a selected `.xlsx`/`.xls` file to CSV client-side (via the already-bundled SheetJS `xlsx` package) before uploading, so the label matches real behavior instead of silently only accepting CSV. Live-verified end-to-end: built a real `.xlsx` file with 2 student rows, uploaded it, confirmed both landed correctly in the `students` table |
| Audit trail for bulk import | ✅ | — | ✅ | Confirmed | `createAuditLog(..., 'BULK_IMPORT_STUDENTS', ...)` — `system.routes.ts:376` |

---

## 34. System Settings

| Requirement | Impl. | Test | Work | Status | Evidence |
|---|:---:|:---:|:---:|---|---|
| Settings persist server-side (not client-only) | ✅ | ❌ | — | Needs testing (real) | DB-backed via `SystemSettingsRepository`, confirmed not client-state-only |
| Per-setting audit logging | ✅ | — | ✅ | Confirmed | Each save calls `createAuditLog` per key |
| Institution profile / logo | ✅ | ❌ | — | Needs testing | |
| Backup/restore UI | ✅ | ❌ | — | Needs testing (real) | R2-backed upload/history |
| Two settings stores in play | ✅ | ✅ | ✅ | **Investigated 2026-08-28 — intentional** | Confirmed real split: `/system/settings` is the institution profile table, `/system-settings` is a generic key-value store that real business logic reads (`academic-year.repository.ts:706` reads `attendance_threshold` from there). Both tabs share one React state var so they never visibly disagree. One harmless redundancy found: the Institution Details tab's `attendance_threshold` field writes to an `institutions` column nothing reads — not fixed (cosmetic, no incorrect behavior reaches a user), flagged for later cleanup |

---
*Companion to `REQUIREMENTS_VERIFICATION.md`. Generated 2026-08-25 from direct code inspection across ~59 backend modules and ~62 frontend pages. Updated 2026-08-28 with two rounds of fixes — see `REQUIREMENTS_VERIFICATION.md` §1 for the full changelog.*
