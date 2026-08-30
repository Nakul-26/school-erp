# TrackFlow ERP — Requirements Verification Report

**Method:** Every claim below is backed by an actual file read (route file, service file, repository file, frontend `.tsx` file, or a test file) — not inferred from folder/file names existing. Evidence cites `file:line`. Where something could not be confirmed, it is marked ❓ Unknown rather than assumed. This report supersedes `AUDIT_REPORT.md` (2026-07-31) wherever the two disagree — that report is now 3+ weeks stale and several of its findings (nightly backup, Alumni events/auto-population) have since been fixed; this report says so explicitly where relevant.

**Companion file:** `DETAILED_FUNCTIONAL_CHECKLIST.md` has the full per-operation breakdown behind every row below.

---

## 1. Executive Summary

- **34 capabilities assessed** (recounted directly from the §2 table below as of 2026-08-28)
- **✅ Complete (implemented + tested + confirmed working):** 0
- **🟡 Implemented — Needs Testing:** 30
- **⚠️ Partial (real gap or bug found):** 4 (#3 Institution setup, #4 Admissions, #15 Communication/SMS, #32 Integration center/payment)
- **🔴 Not implemented / effectively non-functional:** 0

*(Updated 2026-08-28: all 3 🔴 Critical findings and all 6 🟠 High findings (except the SMS/WhatsApp provider stub, blocked on credentials) have been fixed and live-verified — Document Center access control, the fee-structure-application button, student bulk-delete, permission gating on 6 modules, the leave quota check, Students/Teachers audit logging, the Approvals Inbox wiring, and admin password reset. See §1 and §3 changelogs below. Also fixed incidentally: `POST /users` and `POST /teachers` D1_TYPE_ERROR crashes on missing fields.)*

*(Updated again 2026-08-28, second pass through the 🟡 Medium list: `passRatePct` is now a real computed KPI, bulk report-card generation and institution self-registration both got real frontend pages, Alumni gained an Edit UI and working RSVP, the `GenerateReportCardJob`/`NotificationJob` background jobs do real work instead of returning fake fixed numbers, and Data Tools import now genuinely accepts Excel files (converted client-side to CSV) rather than silently only accepting CSV under an "Excel" label. A real bug was also found and fixed along the way: `POST /auth/register-institution` never established the session cookie, so a self-registered admin's browser session would never actually authenticate. The dead, unrouted `Leaves.tsx`/`Leaves.css` page was deleted. See §3 changelog below for verification detail on each.)*

*(Updated a third time 2026-08-30, sweeping the remaining ⚠️ Partial rows for real bugs (not just missing test coverage): found and fixed a genuine data-integrity bug in Admissions — rejecting an already-Approved application (which has a real linked student record) was completely unguarded, unlike approval which is carefully guarded against double-processing; added the same guard to reject. Also found and fixed that scheduled analytics report delivery built real report data but never actually emailed it to the configured `recipients_json` — it only published an internal event nothing downstream consumed; now genuinely emails each recipient an HTML summary. Hardened three under-validated dedicated CRUD modules (Guardians, Enrollments, deprecated Teacher-Assignments) and Academic Calendar creation against the same "missing required field → raw D1_TYPE_ERROR" pattern found earlier in Users/Teachers — all four now return clean 400s and live-verified a real UNIQUE-constraint DB error was caught cleanly instead of crashing. Added a real zod schema (`UpdateProfileSchema`) to the profile-update endpoint, replacing manual ad-hoc checks, with email format and password length now enforced. See §3 changelog below for verification detail on each.)*

*(Updated a fourth time 2026-08-30, working through the "backend exists → frontend missing" gap list from §4: added an Edit Exam UI to `Exams.tsx` (backend `PUT /exams/:id` already supported it fully); added a Certificate Issuance History panel to `Certificates.tsx` calling the previously-unconsumed `GET /certificates/issuances/:studentId`, with a reprint action — building it surfaced and fixed a real, separate pre-existing bug: the certificate preview/print flow had no `#printable-*` id in the global print stylesheet's allowlist, so `window.print()` on that page would have printed a blank page (everything under `body *` is hidden by default and only allowlisted ids are shown); added `#printable-certificate` to both the page and the global CSS. Added a live Workload & Conflict Report panel to the existing Teacher↔Subject Assignments UI in `AcademicSetup.tsx`, wiring up `GET /teaching-allocations/dashboard` and `GET /teaching-allocations/conflicts`, which previously had zero frontend consumer despite being fully built and permission-gated on the backend (the bulk-allocation `POST /bulk` engine still has no dedicated frontend — the existing UI only ever creates allocations one at a time). Built a new super-admin-only `SuperAdminInstitutions.tsx` page (list/search/create/delete institutions) wired to the existing `/institutions` CRUD, which previously had a fully-built, permission-checked backend with zero frontend caller — `InstitutionSetup.tsx` only ever edited the caller's own institution. Also fixed two more raw-crash bugs found while touching Exams: entering marks with a record missing `student_id` crashed with a raw D1 bind error instead of a clean 400; entering marks while omitting `max_marks` failed a `NOT NULL` DB constraint instead of defaulting to the exam subject's configured max (the documented `saveMarks` bug). All fixes live-verified against the real dev server + local D1; see §3, §4, §6, §9, §24, §27 changelogs below.)*

**The honest headline: nothing in this codebase has actually been proven end-to-end.** Two service-level automated tests exist (`admissions-approval.test.ts`, `fees-payment.test.ts`) and cover narrow, real scenarios well (including genuine concurrency races). Beyond those two files, and beyond the live manual API verification done earlier this session for the Students → Teachers → Classes → Attendance → Exams happy path, **nothing in the application has been tested — not by an automated suite, not by a human clicking through it.** `MANUAL_TEST_TRACKER.md` still has every box unchecked.

**Biggest gaps found (in order of severity):**

1. ~~**Document Center has no role-based access control at all**~~ — **Fixed 2026-08-28.** Added a `visibility` column (`'all'` | `'staff'`, migration `migration-documents-visibility.sql`), `requireRole()` gating on every write endpoint, per-document visibility enforcement on list/get/download/signed-url/verify, and a cross-tenant ownership check on the mutating endpoints (a staff member could previously archive/version/restore/delete another institution's document by guessing an ID). Frontend upload form now has a "Staff only" toggle. Verified live: a crafted student-role token was correctly blocked (403) from viewing/downloading a staff-only doc and from uploading/deleting anything, while an admin token could do both, and a `visibility: 'all'` doc remained visible to the student token. §26.
2. ~~**Approvals Inbox is an orphaned feature**~~ — **Fixed 2026-08-28 (Leave wired; user chose "wire it up" over removing it).** Submitting a leave application now auto-creates a `LEAVE_REQUEST` entry in the Inbox; approving/rejecting through the Inbox now dispatches to the real `LeaveService` (same quota-checked logic as the dedicated Leave Approvals page — the old code just blind-`UPDATE`d a `status` column on an arbitrary table by name, which would have silently bypassed the quota check entirely) instead of a no-op status flip; approving/rejecting via the dedicated Leave Approvals page now syncs the matching Inbox entry so it doesn't go stale. Verified live: an application applied as a teacher appeared in the Inbox automatically; approving it there deducted the real leave balance and blocked a second approval attempt on the same application; an over-quota application was correctly blocked with the same "Insufficient leave balance" error whether approved via the Inbox or the dedicated page, leaving both records consistently `Pending` until resolved. Admissions and other approval types (Fee Refund, Attendance Correction) were deliberately left unwired — the frontend's own hardcoded stat categories only ever anticipated Leave/Fee Refund/Attendance Correction, not Admissions, and Admissions already has its own tested, concurrency-guarded approve flow; wiring those in is future work if wanted. §28.
3. ~~**Students and Teachers generate zero audit log entries**~~ — **Fixed 2026-08-28.** Added `createAuditLog()` calls to create/update/archive/restore/delete and all bulk-action branches in both `students.routes.ts` and `teachers.routes.ts`. Verified live: creating, updating, and deleting a test teacher produced `CREATE_TEACHER`/`UPDATE_TEACHER`/`DELETE_TEACHER` rows in `audit_logs`; archiving/restoring a real student produced `ARCHIVE_STUDENT`/`RESTORE_STUDENT` rows. §30.
4. ~~**Fee structure application is broken in production**~~ — **Fixed 2026-08-28.** `StudentFees.tsx` was calling `POST /fees/generate-ledger`, which doesn't exist; corrected to the real `POST /fees/records/generate`. Verified live: the old path 404s, the fixed path returns a clean validation response. §11.
5. ~~**Student bulk-delete is broken**~~ — **Fixed 2026-08-28.** The bulk-delete branch in `students.routes.ts` was passing `user.sub` into the `institutionId` parameter slot of `deleteStudent(id, institutionId, userId, force)`. Corrected to pass `user.institution_id`. Verified live: a freshly-created test student was correctly soft-deleted (`is_active` flipped to 0, `status` to `WITHDRAWN`) via the bulk-delete endpoint. §5.
6. ~~**Leave approval never checks quota before deducting**~~ — **Fixed 2026-08-28.** `LeaveService.approveApplication()` now fetches the teacher's balance for that leave type/year and rejects the approval with a clear message if it would exceed `total_days` (an unseeded/missing balance row is treated as zero quota, not unlimited). Verified live across a full sequence: a 10-day request against a 5-day quota was blocked, a 3-day request was approved and correctly deducted, a second 3-day request was blocked once only 2 days remained. §14.
7. ~~**`passRatePct` on the Analytics/Reports dashboards is a hardcoded fake number (92.4)**, never computed from real exam data~~ — **Fixed 2026-08-28.** `calculateRawInstitutionalMetrics()` now computes it from real `student_marks`/`exam_subjects` rows (percentage of subject-marks meeting `min_marks`), same fallback pattern as `attendanceRatePct` when there's genuinely no data yet. Verified live: seeded 3 test marks (2 pass, 1 fail) and confirmed `POST /analytics/refresh` returned `66.7%`, `previous_value: 92.4` (the old hardcoded default), instead of always returning the fixed number. §27.
8. **SMS/WhatsApp broadcast channels are `console.log` stubs**, not real providers, despite the UI presenting them as working delivery channels — this is separate from the Integration Center's SMS gateway, which *is* real (Fast2SMS/MSG91/Twilio with real outbound HTTP calls). §15, §32.
9. ~~**Six modules (Library, Transport, Visitors, Weekly Timetable, Academic Calendar, Background Jobs, Analytics) have no role/permission gating**~~ — **Fixed 2026-08-28.** Wired `requirePermission()`/`requireRole()` onto every route in all six modules, reusing permission codes that were already seeded in `migration-rbac-permissions-expanded.sql` but never enforced at the route layer (`library.access`/`library.manage`, `transport.view`/`transport.manage`, `calendar.view`/`calendar.manage`, `timetable.view`/`timetable.manage`, `visitors.manage`, `reports.access`; Background Jobs gated `requireRole('admin')` as an admin-only internal tool). Verified live with a real student-role token: reads still work where the seed grants them (library/transport/calendar/timetable), writes are 403'd everywhere, and student tokens are fully blocked from Analytics/Background Jobs/Visitors. Re-verified admin token retains full read+write access on all six. Full `vitest` suite (9/9) still passes.
10. ~~**Admin cannot reset another user's password**~~ — **Fixed 2026-08-28.** Added `POST /users/:id/reset-password` (gated by `user.manage`, same-institution check), which generates a new temp password, updates the hash, best-effort emails it to the user, and returns it in the response so the admin can hand it out even if email delivery fails (matches the existing convention from teacher-login creation). Added a "Reset Password" button to `ManageUsers.tsx`. Verified live: admin token got back a working temp password and an `ADMIN_RESET_PASSWORD` audit log row; a student token was correctly blocked with 403.
11. ~~**Institution self-registration has a backend but no frontend page**~~ — **Fixed 2026-08-28.** Built `RegisterInstitution.tsx` at `/register-institution`, linked from the Login page. While wiring it up, found and fixed a real bug: `POST /auth/register-institution` computed a login token but never called `establishSession()` to set the `erp_token`/`erp_csrf` cookies (unlike `/auth/login`, which does) — so a self-registered admin's response body contained a working token that was never actually placed anywhere the browser would use it, meaning the new admin could not actually get logged in. Verified live: registration now returns `Set-Cookie` headers for both cookies, and a follow-up `GET /auth/me` using only the cookie jar correctly authenticates as the new admin. §1, §4.

**Genuinely solid, worth crediting:** Hostel (real capacity/occupancy math, proper permission gates), Placements (most mature module — layered errors, explicit access-control helpers), Fee payment collection specifically (real transactional batching, race-condition-tested receipt numbering), Certificates (real data substitution, no leaking placeholders), the nightly backup job (now a genuine SQL dump to R2 — this was previously simulated and has been fixed since the July audit), and the Integration Center's SMS/webhook engines (real outbound calls, HMAC signing, retry/DLQ).

---

## 2. High-Level Capability Checklist

| # | Capability | Implemented | Tested | Status | Evidence / Notes |
|---|---|:---:|:---:|---|---|
| 1 | Authentication & access control | ✅ | 🟡 | 🟡 Needs Testing | Core login/logout/forgot/reset work; self-registration now has a real frontend page and correctly establishes a session (both fixed & live-verified 2026-08-28); profile update now has a real zod schema instead of ad-hoc manual checks (fixed & live-verified 2026-08-30) |
| 2 | Dashboard (role-aware) | ✅ | ❌ | 🟡 Needs Testing | Clean role-branched read-only endpoint, no gaps found |
| 3 | Institution & academic setup | ✅ | 🟡 | 🟡 Needs Testing | Academic Calendar permission gating (2026-08-28) and required-field validation (2026-08-30) both fixed & live-verified; super-admin institution list/create/delete frontend built & live-verified 2026-08-30 (`SuperAdminInstitutions.tsx`) |
| 4 | Admissions | ✅ | 🟡 | ⚠️ Partial | Approval flow genuinely tested incl. concurrency; found and fixed a real bug 2026-08-30 — rejecting an already-Approved application (with a real linked student record) was completely unguarded, now blocked with a clean 409 exactly like double-approval already was; document upload and broader input validation still untested |
| 5 | Student management | ✅ | 🟡 | 🟡 Needs Testing | Live-tested create/list this session (works); bulk-delete fixed & verified 2026-08-28; audit logging on create/update/archive/restore/delete/bulk-actions added & verified 2026-08-28 |
| 6 | Teacher / staff management | ✅ | 🟡 | 🟡 Needs Testing | Live-tested create this session (works via UI); raw-API `D1_TYPE_ERROR` on missing `status`/required fields fixed 2026-08-28; audit logging on create/update/delete/bulk-actions added & verified 2026-08-28 |
| 7 | Classes, sections, subjects, timetable | ✅ | 🟡 | 🟡 Needs Testing | Sections/Subjects have real CRUD+permission gating; Weekly Timetable permission gating fixed & live-verified 2026-08-28 |
| 8 | Attendance | ✅ | 🟡 | 🟡 Needs Testing | Live-tested session-create/mark/fetch this session (works); future-date blocking and edit-after-mark not verified |
| 9 | Exams, grading, report cards | ✅ | 🟡 | 🟡 Needs Testing | Live-tested full flow this session incl. out-of-range rejection (works); bulk report-card generation UI added & live-verified 2026-08-28 (report cards still browser-print, not real PDFs); Edit Exam UI added 2026-08-30 (backend already supported it); two raw-crash bugs in mark entry (missing `student_id`, missing `max_marks`) fixed & live-verified 2026-08-30 |
| 10 | Homework & study materials | ✅ | ❌ | 🟡 Needs Testing | Full CRUD confirmed both sides with a real custom permission-scope check |
| 11 | Fees & finance | ✅ | 🟡 | 🟡 Needs Testing | Payment collection genuinely tested incl. races; "apply fee structure" button endpoint fixed & verified 2026-08-28 |
| 12 | GL accounting | ✅ | ❌ | 🟡 Needs Testing | Real double-entry balance validation, no gaps found |
| 13 | Payroll | ✅ | ❌ | 🟡 Needs Testing | Real calculation logic (basic+allowances−deductions incl. attendance-based LOP); payslip is print-only, not a real PDF |
| 14 | Leave management | ✅ | 🟡 | 🟡 Needs Testing | Quota check added & live-verified 2026-08-28 (multi-step sequence: block over-quota, approve within-quota, block once balance exhausted); now also feeds and syncs with the Approvals Inbox |
| 15 | Communication (announcements/messaging/broadcasts/notifications) | ✅ | ❌ | ⚠️ Partial | Email and audience-targeting are real; **SMS/WhatsApp channels are console.log stubs** presented as functional — deferred, needs real provider credentials |
| 16 | Library | ✅ | 🟡 | 🟡 Needs Testing | Real issue/return/fine logic; permission gating (`library.access`/`library.manage`) added & live-verified 2026-08-28 |
| 17 | Transport | ✅ | 🟡 | 🟡 Needs Testing | Real route/billing logic; permission gating (`transport.view`/`transport.manage`) added & live-verified 2026-08-28 |
| 18 | Hostel | ✅ | ❌ | 🟡 Needs Testing | Most robust module of the six residential/facility modules — real occupancy math, proper permission gates |
| 19 | Canteen | ✅ | ❌ | 🟡 Needs Testing | Built as subscription+monthly-billing, **not** a wallet/per-order POS system — confirm this matches expectations |
| 20 | Visitors | ✅ | 🟡 | 🟡 Needs Testing | Works; permission gating (`visitors.manage`) added & live-verified 2026-08-28 |
| 21 | Assets | ✅ | ❌ | 🟡 Needs Testing | Full CRUD, proper permission gating, no gaps found |
| 22 | Placements | ✅ | ❌ | 🟡 Needs Testing | Most mature module in the codebase — no gaps found |
| 23 | Alumni | ✅ | 🟡 | 🟡 Needs Testing | Events + RSVP + auto-population from graduating students all real; Edit UI added and RSVP wired to a frontend caller (fixed & live-verified 2026-08-28) |
| 24 | Certificates | ✅ | 🟡 | 🟡 Needs Testing | Real data substitution confirmed; output is browser-print HTML, not a generated PDF file; Issuance History panel + reprint added 2026-08-30 consuming the previously-unused `GET /certificates/issuances/:studentId`; fixed a real pre-existing print bug found in the process — the preview/print flow had no id in the global print CSS allowlist, so printing would have produced a blank page |
| 25 | Compliance | ✅ | ❌ | 🟡 Needs Testing | Genuinely a live-data dashboard, not fake — but intentionally scoped short of real regulatory filing (self-documented in code) |
| 26 | Document Center | ✅ | ✅ | 🟡 Needs broader testing | Role/permission gating + per-document visibility added and live-verified 2026-08-28 (see §1) |
| 27 | Reports & analytics | ✅ | 🟡 | 🟡 Needs Testing | All KPIs including pass-rate % are now real computed values (fixed & live-verified 2026-08-28); permission gating (`reports.access`) added & live-verified 2026-08-28; scheduled report delivery now genuinely emails configured recipients instead of only publishing an internal event nothing consumed (fixed & live-verified 2026-08-30); teaching-allocations Workload & Conflict dashboard now surfaced in `AcademicSetup.tsx` (2026-08-30), previously backend-only |
| 28 | Approvals inbox | ✅ | 🟡 | 🟡 Needs Testing | Leave now feeds it and its approve/reject dispatches to the real, quota-checked `LeaveService` (fixed & live-verified 2026-08-28); Admissions/Fee Refund/Attendance Correction remain unwired by deliberate scope decision — see §3 |
| 29 | Access control / user & role management | ✅ | 🟡 | 🟡 Needs Testing | Create/edit/deactivate all work, deactivation correctly blocks login; admin password reset added & live-verified 2026-08-28; `POST /users` `D1_TYPE_ERROR` on missing fields fixed 2026-08-28 |
| 30 | Audit logs | ✅ | 🟡 | 🟡 Needs Testing | Real dual-capture mechanism; Students and Teachers CRUD now publish audit events (fixed & live-verified 2026-08-28) |
| 31 | Job center / background jobs | ✅ | 🟡 | 🟡 Needs Testing | Real queue engine; nightly backup genuinely real (fixed since July audit); `GenerateReportCardJob`/`NotificationJob` now do real work instead of returning fake fixed numbers (fixed & live-verified 2026-08-28); permission gating (`requireRole('admin')`) added & live-verified 2026-08-28 |
| 32 | Integration center (SMS/webhooks/payment) | ⚠️ | ❌ | ⚠️ Partial | SMS gateway and webhook engine are real; **payment gateway confirmed not built** |
| 33 | Data tools (import/export) | ✅ | 🟡 | 🟡 Needs Testing | Real Excel export; import now genuinely accepts `.xlsx`/`.xls` too (converted client-side to CSV via the already-bundled SheetJS lib before upload — fixed & live-verified 2026-08-28) in addition to CSV |
| 34 | System settings | ✅ | ❌ | 🟡 Needs Testing | Genuinely DB-backed, not client-only; confirmed the two settings endpoints are an intentional split (institution profile vs. a generic key-value `system_settings` store used by real business logic) — see §3 Low, one field (`attendance_threshold` on the Institution Details tab) writes to a DB column nothing reads, harmless but worth cleaning up |

Legend: ✅ Yes · ⚠️ Partial · ❌ No/Not found · 🟡 code exists, not exercised · 🔴 broken or effectively absent

---

## 3. Missing / Partial Functionality — Prioritized

### 🔴 Critical
- ~~Document Center has no access control~~ — **Fixed 2026-08-28**, see §1 above.
- ~~Fee structure application button 404s~~ — **Fixed 2026-08-28**, see §1 above.
- ~~Student bulk-delete silently fails~~ — **Fixed 2026-08-28**, see §1 above.

### 🟠 High
- ~~Approvals Inbox doesn't actually receive approvals from anywhere~~ — **Fixed 2026-08-28** (Leave wired; see §1 above). (§28)
- ~~Leave approval has no quota check~~ — **Fixed 2026-08-28**, see §1 above. (§14)
- ~~Students/Teachers modules produce no audit trail for normal CRUD~~ — **Fixed 2026-08-28**, see §1 above. (§30)
- ~~No permission gating at all on Library, Transport, Visitors, Weekly Timetable, Academic Calendar, Background Jobs, and Analytics write endpoints~~ — **Fixed 2026-08-28**, see §1 above.
- SMS/WhatsApp broadcast channels are fake (console.log only) while presented in the UI as functioning. *(Deferred — needs real Twilio/WhatsApp Business API credentials the user hasn't provisioned yet, same blocker as the payment gateway item.)*
- ~~Admin cannot reset another staff member's password~~ — **Fixed 2026-08-28**, see §1 above.

**All 🟠 High items are now resolved except the SMS/WhatsApp stub, which is blocked on the user provisioning real API credentials.**

**Also found and fixed while verifying the above (not in the original report):**
- `POST /users` threw a raw, unfriendly `D1_TYPE_ERROR` instead of a clean validation error when required fields (username/email/name) were missing from the request body. Added validation in `UserService.createUser()`. Verified live: a request missing `username` now returns a clean `400 {"error":"Username is required"}` instead of a raw D1 error.
- `POST /teachers` had the same problem — creating a teacher without an explicit `status` field threw `D1_TYPE_ERROR`, and there was no validation for missing `employee_id`/`first_name`/`last_name` either. Added a JS-level default (`status || 'ACTIVE'`) in `teachers.repository.ts` and clean 400 validation for the three required fields in the route. Verified live.
- The Approvals Inbox's old generic approve/reject side effect (`processApproval`) did a blind `UPDATE <entity_type table> SET status = ...` using the table name straight out of the database row with no dedicated-service dispatch — for Leave specifically, this would have completely bypassed the quota check being added in the same session. Replaced with real dispatch to `LeaveService` for `leave_applications` and a plain status update for the Inbox row itself.

### 🟡 Medium
- ~~`passRatePct` hardcoded fake KPI value on Analytics/Reports~~ — **Fixed 2026-08-28**, see §1 above. (§27)
- ~~No bulk report-card generation UI despite backend support~~ — **Fixed 2026-08-28**, see §1 above. (§9)
- ~~No frontend page for institution self-registration despite full backend support~~ — **Fixed 2026-08-28**, see §1 above. (§1, §4)
- Payslip and report cards are browser-print, not real generated PDFs. *(Deliberately deferred — asked the user 2026-08-28 whether to build real server-side PDF generation; answer was "not now." `window.print()` stays as-is; revisit if/when this is prioritized.)*
- ~~Alumni has no Edit UI; RSVP endpoint unused by frontend~~ — **Fixed 2026-08-28**, see §1 above. (§23)
- ~~GenerateReportCardJob and NotificationJob background jobs are still simulated stubs~~ — **Fixed 2026-08-28.** Both now call the real underlying services (`GradesService.buildAllReportCards()`, `NotificationsService.processNotificationQueue()`) instead of returning made-up fixed numbers. Verified live: enqueued and processed both jobs — `GenerateReportCardJob` correctly returned 0 report cards against an exam with no marks, then 2 after seeding 2 students' marks; `NotificationJob` drained 4 real queued notifications on its first run, then 0 on the next (queue genuinely empty). (§31)
- ~~"Excel import" in Data Tools is actually CSV-only~~ — **Fixed 2026-08-28.** Import now accepts `.xlsx`/`.xls`, converted client-side to CSV via the SheetJS library already bundled for exports, before hitting the same backend CSV import endpoint. Verified live end-to-end: built a real `.xlsx` file, uploaded it, confirmed both rows landed in the `students` table. (§33)
- ~~Two overlapping Leave frontend page sets (`Leaves.tsx` vs. `LeaveTypes.tsx`/`MyLeaveApplications.tsx`/`LeaveApprovals.tsx`)~~ — **Resolved 2026-08-28.** Confirmed `Leaves.tsx` was never imported or routed anywhere (grepped the whole frontend for references) — genuine dead code. Deleted `Leaves.tsx` and `Leaves.css`.

### 🟢 Low
- Certificates/payslips/report cards rely on `window.print()` rather than real PDF generation — works, but no downloadable file artifact. *(Same deferred-by-user-choice item as above.)*
- ~~System Settings page calls two different settings endpoints — confirm this is intentional~~ — **Investigated 2026-08-28.** It's a real, intentional split: `/system/settings` is the institution profile table, `/system-settings` is a generic key-value store that real business logic actually reads (e.g. `academic-year.repository.ts:706` reads `attendance_threshold` from there for real attendance calculations). One genuine (harmless) redundancy found: the Institution Details tab's `attendance_threshold` field writes to a column on the `institutions` table that nothing reads — the Academic Rules tab's key-value entry is what's actually authoritative, and both tabs share one React state variable so they never visibly disagree. Not fixed — cosmetic/dead-column only, no incorrect behavior reaches a user; worth a follow-up cleanup (drop the field from the Institution Details form, or the column) whenever someone touches that page next.
- Canteen has no wallet/POS concept — confirm this matches what was actually expected of the module. *(Not investigated further — product-scope question, not a code defect.)*

---

## 4. Requirement → Implementation Gaps

**Backend exists → frontend missing:**
- ~~Institution self-registration (`POST /auth/register-institution`) — no signup page anywhere in the frontend~~ — **Fixed 2026-08-28**, see §1.
- ~~Super-admin institution list/create/delete — `InstitutionSetup.tsx` only edits the caller's own institution~~ — **Fixed 2026-08-30.** New `SuperAdminInstitutions.tsx` page at `/super-admin/institutions`, gated `roles: ['super_admin']` in both `ProtectedRoute` and `roleNav.ts` (so it's neither reachable nor listed in the sidebar for anyone else). Live-verified against real data: list/search work, create returns a real new institution, delete correctly enforces the backend's existing safeguards (blocked deleting the only/last institution or one with active users/students/teachers, with the reason surfaced as a toast), and a genuinely-empty test institution was created and deleted cleanly end-to-end.
- ~~Bulk/whole-exam report card generation (`GET /grades/report-card/:examId`) — frontend only ever calls the single-student variant~~ — **Fixed 2026-08-28**, see §1.
- ~~Alumni event RSVP (`POST /alumni/events/:id/rsvp`) — no button/handler in `Alumni.tsx`~~ — **Fixed 2026-08-28**, see §1.
- ~~Alumni record editing (`PUT /alumni/:id`) — only Add/Delete exist in the UI~~ — **Fixed 2026-08-28**, see §1.
- ~~Certificate issuance history (`GET /certificates/issuances/:studentId`) — not surfaced anywhere~~ — **Fixed 2026-08-30.** Added an "Issuance History" panel to `Certificates.tsx` per selected student, with a reprint action. Live-verified: issued a real certificate, confirmed it appears in the history endpoint's response with the correct `template_name`/`reference_number`/`rendered_html`, matching what the new UI renders.
- ~~Teaching-allocations bulk-allocation/dashboard/conflicts endpoints — no dedicated frontend page consumes them~~ — **Partially fixed 2026-08-30.** Added a live Workload & Conflict Report panel (`GET /teaching-allocations/dashboard` + `/conflicts`) to the existing Teacher↔Subject Assignments UI in `AcademicSetup.tsx`, refreshing after every allocation change. Live-verified against real seed data (returned real unallocated-subject warnings). The bulk-allocation engine (`POST /bulk`, preview/commit a whole batch at once) still has no frontend — the existing UI only creates/edits allocations one at a time, which was judged the higher-value gap to close first.
- ~~Exam edit UI (`PUT /exams/:id` had no caller in `Exams.tsx`)~~ — **Fixed 2026-08-30.** Added an Edit button to the exams list reusing the existing Add-Exam modal in edit mode.

**Frontend exists → backend functionality is missing or wrong:**
- ~~`StudentFees.tsx` "Apply fee structure" button targets a route that was never built~~ — **Fixed 2026-08-28.**

**Functionality exists → no server-side enforcement despite implied requirement:**
- ~~Document visibility ("staff-only" documents) — no such concept exists in the schema or code~~ — **Fixed 2026-08-28**, see §1.
- ~~Role/permission checks on Library, Transport, Visitors, Weekly Timetable, Academic Calendar, Background Jobs, Analytics — UI hides buttons, API does not check~~ — **Fixed 2026-08-28**, see §1.

**Functionality exists → tests are missing (everywhere except two files):**
- Every capability area in §2 except the two service-level test files has zero automated coverage. See §6.

---

## 5. Testing Gaps

Confirmed: `erp-backend/test/` contains exactly two files — `admissions-approval.test.ts` and `fees-payment.test.ts` — plus a `helpers/` fixture folder. **No frontend test files exist anywhere in the repository** (`erp-frontend/src` has zero `*.test.*`/`*.spec.*` files).

What the two real test files actually cover (confirmed by reading them, not assumed):
- `admissions-approval.test.ts`: approve creates a student atomically; a second sequential approval is rejected without duplicating the student; two *concurrent* approval calls race correctly (exactly one wins). **Updated 2026-08-30**, now also covers reject: a pending application rejects cleanly; rejecting an already-Approved application is refused with its student link intact; a concurrent approve-then-reject race leaves the application correctly `Approved`. Inquiry flow is still **not** covered.
- `fees-payment.test.ts`: payment+receipt+ledger created atomically; record marked PAID at full balance; overpayment rejected; duplicate transaction-reference rejected; concurrent payment race correctly loses the stale write; 10 concurrent receipt-number reservations are all unique. Refunds, concessions, fine engine, and the HTTP route/permission layer are **not** covered.

Everything else below has **zero** test coverage of any kind (automated or manual/documented) as of this report:

- [ ] Authentication (login/logout/forgot/reset/self-registration)
- [ ] Dashboard (all 5 role variants)
- [ ] Institution & academic setup (years, departments, calendar, grade settings)
- [ ] Admissions — inquiry flow, reject flow, validation
- [ ] Students — edit, search/filter/pagination, bulk import, bulk delete (which is broken — see §3), archive/restore
- [ ] Teachers — edit, deactivate/reactivate, assignments, teaching allocations
- [ ] Classes/Sections/Subjects/Timetable — CRUD, archive/restore, timetable conflict detection
- [ ] Attendance — edit-after-mark, future-date blocking, teacher attendance, student leave
- [ ] Exams/Grading — report card correctness, bulk generation, backlogs, transcript, electives, prerequisites
- [ ] Homework & study materials
- [ ] GL accounting — journal entries, trial balance
- [ ] Payroll — run calculation correctness, payslip
- [ ] Leave management — quota logic (which is broken — see §3)
- [ ] Communication — announcements, messaging, broadcasts, notifications, templates
- [ ] Library, Transport, Hostel, Canteen
- [ ] Visitors, Assets, Placements, Alumni, Certificates, Compliance
- [ ] Document Center (including the missing access control — see §3)
- [ ] Reports & Analytics (including the fake pass-rate — see §3)
- [ ] Approvals Inbox
- [ ] Access control / user & role management
- [ ] Audit logs (including the missing Students/Teachers coverage — see §3)
- [ ] Job Center / background jobs
- [ ] Integration Center — SMS, webhooks
- [ ] Data Tools — import/export
- [ ] System Settings
- [ ] All 33 sections of `MANUAL_TEST_TRACKER.md` — every checkbox is still unchecked

---

## 6. Recommended Order of Work

1. **Fix the three 🔴 critical items first** — Document Center access control, the broken fee-structure-application button, and the broken student bulk-delete. These are real, confirmed defects, not hypothetical risk.
2. **Close the permission gaps** on Library, Transport, Visitors, Weekly Timetable, Academic Calendar, Background Jobs, Analytics — these are one-line `requirePermission()` additions per route file, low effort, real exposure.
3. **Decide the fate of the Approvals Inbox** — either wire leave/admissions/fee-waivers into it, or remove it so it doesn't mislead whoever maintains this next.
4. **Fix the leave quota check** and **add Students/Teachers audit logging** — both are data-integrity/accountability issues, not cosmetic.
5. **Be honest with the school about SMS/WhatsApp broadcast channels** (fake) and the payment gateway (not built) before go-live — don't let a customer discover this from a support ticket.
6. **Then start manual click-through testing** using `MANUAL_TEST_TRACKER.md`, section by section — this report tells you *where the known landmines already are*, so test those areas first (Fees §11, Leave §14, Document Center §26, Students bulk-actions §5).
7. **Backfill automated tests** around whatever you fix above, following the pattern already set by `admissions-approval.test.ts` and `fees-payment.test.ts` (both are genuinely good models — real D1 binding, real concurrency tests, not mocks).
8. **Lower-priority polish**: real PDF generation for certificates/payslips/report cards, bulk report-card UI, Alumni edit UI, CSV→Excel import parity.

---
*Generated 2026-08-25 from direct code inspection (5 parallel research passes across ~59 backend modules and ~62 frontend pages, plus targeted follow-up verification) — not from `AUDIT_REPORT.md`, which is stale as of this report on several points (noted inline where it disagreed with current code). Companion: `DETAILED_FUNCTIONAL_CHECKLIST.md`.*
