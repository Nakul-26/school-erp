# TrackFlow ERP — Full Codebase Audit & Complete-ERP Improvement Plan

**Date**: 2026-07-31
**Scope**: `erp-backend/` (~30,000 lines, 43 modules), `erp-frontend/` (~45,000 lines, 117 files), `erp-backend/db/` (schema.sql + 34 migrations), plus existing `product-spec/`, `rbac_audit/`, `ROADMAP.md` docs.
**Method**: Four parallel deep-dive audits (backend/security, database/migrations, frontend, ERP-scope gap analysis) cross-checked against the project's own stated standards in `product-spec/`. RBAC-specific findings are **not** repeated here — see the existing `rbac_audit/` directory, which already covers that ground per-module.

This is a mature, genuinely substantial system — not a prototype. Password hashing, SQL parameterization, and the module/RBAC architecture are solid. The issues below are the gap between "works" and "production-grade, complete ERP for schools and colleges."

---

## 1. Critical Issues (fix before anything else)

| # | Area | Issue | Where |
|---|------|-------|-------|
| C1 | Security | **CORS reflects any origin when `FRONTEND_ORIGIN` is unset**, combined with `credentials: true`. If that env var is missing in any deployed environment, the API echoes back whatever `Origin` header a malicious site sends and still allows cookies — a CSRF/session-theft vector on top of an auth cookie that's already being set. | `erp-backend/src/index.ts:56-103`, fallback at line 95 |
| C2 | Security | **Auth model is split and contradicts itself.** Backend sets an `httpOnly` session cookie on login, but the frontend never uses it — it stores the JWT in `localStorage` and sends it as `Authorization: Bearer`, plus embeds it in URL query strings for file/image links. This defeats the entire purpose of the httpOnly cookie (XSS-proof storage) that ROADMAP.md claims is "done." Any future XSS = full token theft; tokens also leak into browser history/server logs via URLs. | `erp-frontend/src/services/api.ts:8-9,21,67,80-88`, `erp-frontend/src/contexts/AuthContext.tsx:33-80`, `erp-backend/src/modules/auth/auth.routes.ts:27-33` |
| C3 | Data integrity | **Fee payment recording is not transactional.** Payment → ledger update → receipt creation → totals update are 4 separate unbatched writes. A mid-sequence failure leaves the ledger out of sync with real money collected. Receipt numbering is also a read-then-write race (`count + 1`) — concurrent payments can generate duplicate receipt numbers. | `erp-backend/src/modules/fees/fees.service.ts:227-249` |
| C4 | Data integrity | **Admission approval is non-atomic and bypasses the repository layer** (raw `db.prepare()` inline in the service). A crash mid-approval, or two concurrent approve clicks, can create duplicate student records from one application (TOCTOU on the status check). | `erp-backend/src/modules/admissions/admissions.service.ts:95-132` |
| C5 | Database | **`schema.sql` has drifted ~35 tables behind reality.** Bootstrapping a fresh environment from `schema.sql` alone produces a database missing leave management, admissions, payroll, messaging/broadcasts, homework, fee concessions/installments, analytics, integrations, and more — entire feature areas silently absent. There is also no migrations-tracking table and no migration runner script; the 34 `migration-*.sql` files must be applied manually, in the right order, with no record of what's already run. Some migrations (`migration-notification-center-audit.sql`) will outright fail with "duplicate column" if replayed against a schema.sql-provisioned DB, because schema.sql already contains what the migration tries to add. | `erp-backend/db/schema.sql`, all `migration-*.sql`, `erp-backend/package.json` |

**Why these are Critical**: C1/C2 are exploitable security gaps in an app that stores student PII and payment data. C3/C4 create silent financial and enrollment data corruption under normal concurrent use, not just edge cases. C5 means the project cannot reliably reproduce its own database from source — a serious operational risk (disaster recovery, staging environments, onboarding a new institution).

---

## 2. High-Priority Issues

**Backend / Security**
- JWT has no revocation or refresh mechanism — a stolen token is valid up to 7 days; logout only clears the client cookie. Auth middleware also accepts a token via `?token=` query param (leaks via logs/history). (`middleware/auth.ts:14`, `auth.service.ts:9`)
- File upload validation trusts the client-supplied `Content-Type` only — no magic-byte checking, so a relabeled executable passes the allow-list. (`erp-backend/src/utils/file-upload.ts:28`)
- `/auth/register-institution` has no rate limiting, unlike `/login` and `/forgot-password`. (`auth.routes.ts:46`)

**Database**
- Project's own standard (`product-spec/21_database_standards.md`) mandates a composite `(institution_id, deleted_at)` index on every tenant table — **zero exist** anywhere in the schema. Tenant list queries scan.
- Only 13 of 134 foreign keys declare `ON DELETE` behavior; the rest default to `NO ACTION`, so institution/student deletion either orphans rows or fails outright instead of cascading as documented (e.g. deleting a student doesn't clean up `guardians`).
- Newer tables (`payroll_runs`, `payslips`, `student_leave_applications`, `homework`) skip the required audit-column set (`deleted_at`, `updated_at`/`updated_by`) — soft-delete is broken for money-adjacent tables.

**Frontend**
- No route-level code splitting — all ~55 pages are eagerly imported in `App.tsx`, so a user who only ever opens Attendance still downloads `Classes.tsx` (96KB), `StudentDetails.tsx` (76KB), `TeacherDetails.tsx` (88KB), etc.
- Several pages are 1,000–2,000+ line "god components" mixing data-fetching, form state, validation, and rendering with no sub-component decomposition: `Classes.tsx`, `TeacherDetails.tsx`, `StudentDetails.tsx`, `Admissions.tsx`, `SectionWorkspace.tsx`, `Attendance.tsx`. Notably, `Students.tsx`/`Teachers.tsx` **already show the right pattern** (split into `src/pages/students/` sub-components + dedicated service/validation files) — it just hasn't been applied to the rest.
- No shared `Table`/`Modal`/`ConfirmDialog`/CSV-export components — 10+ pages reimplement export logic independently, and destructive actions use raw `window.confirm`/`prompt("type DELETE")` instead of a real confirm dialog.

**ERP Completeness**
- **No real payment gateway.** `fees.types.ts` treats "Online Gateway" as a free-text label for manually recorded payments; the `integrations` module has Razorpay/Stripe listed as provider types and a solid outbound webhook engine, but there is no actual checkout flow or payment-confirmation webhook receiver. Parents cannot pay fees online today despite this being claimed done in `PHASE_ROADMAP.md`.
- **SMS gateway not wired** (confirmed by the project's own `erp-feature-list.txt`).
- **No CGPA/SGPA, backlog/re-exam, or elective-registration workflow** — blocking for any college/university use. See §4.

---

## 3. Medium & Low Findings (condensed)

- Backend: rate-limiter does a `CREATE TABLE IF NOT EXISTS` on every single request (wasteful); in-memory rate-limit fallback is per-isolate and silently degrades on D1 errors; password reset tokens stored in plaintext; no automated test framework — the ~20 `test-*.js` files are manual smoke scripts requiring a live server, not a real CI-wired regression suite.
- Database: zero `CHECK` constraints anywhere — all enum-like columns (`status`, `gender`, `payment_method`, etc.) are unconstrained `TEXT`; money stored as `REAL` throughout (26+ columns) instead of integer paisa, risking rounding drift in cumulative ledgers/payroll; bare `ALTER TABLE ADD COLUMN` migrations have no idempotency guard.
- Frontend: 355 occurrences of `any`/`as any` undermine an otherwise strict `tsconfig.json`; only 3 files in `src/services/` with no per-domain typed service classes, and 6 pages bypass even that thin wrapper with raw `fetch()`; "responsive UI" claim only holds at the app-shell level — ~80% of page-specific CSS files have no media queries of their own, so large data tables likely overflow on mobile.
- Positive notes worth preserving: parameterized SQL everywhere (no injection risk found), solid PBKDF2 password hashing with constant-time compare, no dead TODO/FIXME comments, `.dev.vars` correctly gitignored, and the existing `students/`/`teachers/` frontend folder pattern is a good template to replicate.

---

## 4. Gap Analysis — What "Complete ERP for Schools *and* Colleges" Requires

The system today reads as a strong **K-12 school ERP** with the data model already anticipating (but not exposing) college/university needs.

### 4.1 Missing modules (build from scratch)
- Hostel/Dormitory management (zero code exists)
- Canteen / meal plans (zero code exists)
- **Placement & Internship management** — not even in the deferred "Phase 6" list; a core requirement for any engineering college/university and currently unscoped
- Medical/health records (today: a single `blood_group` field — no visit log, immunizations, incidents)
- LMS / online classes / structured study-materials repository (homework exists but isn't this)
- General ledger / double-entry accounting (current Finance page is income/expense logging, not a chart-of-accounts)
- Faculty research/publication tracking
- Government compliance reporting (UDISE+ etc., if targeting Indian institutions)
- RFID/biometric attendance device ingestion

### 4.2 College-specific structural gaps
- **CGPA/SGPA**: only a simple per-term GPA average exists; no cumulative/credit-weighted GPA across semesters, and a single failed subject currently zeroes the whole term GPA rather than tracking per-subject status.
- **Backlog / supplementary exam handling**: does not exist at all — a fail is final, no re-attempt/carry-forward workflow.
- **Elective registration**: the schema already has `is_elective` / `electives_enabled` flags, but there's no student-facing flow to actually register for electives each semester — the data model is ahead of the UI here.
- **Course prerequisites**: no field or validation exists.
- **Encouraging finding**: `programs.types.ts` already carries `degree_type`, `semester_enabled`, `credit_system_enabled`, `duration_unit` — the schema is a partial hybrid, not locked into K-12. What's missing is a dedicated Programs/Semester admin UI (today's `Classes.tsx`/`SectionWorkspace.tsx` are grade/section-first) and the workflows built on top of the existing flags.
- Library has no reference-vs-lending distinction (every book is implicitly loanable — colleges need non-circulating reserve shelves).

### 4.3 Partially-built modules needing completion
- Certificates: only ID card / Bonafide / Transfer Certificate, generated as frontend print-HTML — no configurable template system or dedicated backend module.
- Alumni: real working CRUD, but shallow — no events/donations/mentorship, no auto-population from graduating students as originally planned.
- Backup & Restore: manual export/import genuinely works; the *automated nightly backup job* is explicitly simulated (fake IDs/sizes) — not actually implemented.

### 4.4 Integration gaps
- No real payment gateway (biggest revenue-blocking gap)
- SMS gateway not wired
- No accounting export (Tally/QuickBooks/GL-format)
- No statutory compliance reporting
- The existing generic webhook framework (`integrations` module) is solid infrastructure and is the fastest path to wiring in a real payment gateway or SMS provider — reuse it rather than building parallel plumbing.

---

## 5. Proposed Improvement Plan

Ordered so each phase is safe to ship before the next begins — stabilize the foundation before adding scope, since new modules built on the current data-integrity gaps would just inherit them.

### Phase A — Stabilize (do first, before any new features)
1. Fix CORS fallback (C1); require `FRONTEND_ORIGIN` to be set, fail closed otherwise.
2. Pick one auth model and commit to it: migrate fully to httpOnly-cookie sessions, remove localStorage token storage and URL-embedded tokens from the frontend, add CSRF protection (double-submit token or `SameSite=strict` + origin check) since cookie auth needs it. (C2)
3. Wrap fee payment recording and admission approval in D1 batched transactions; fix the receipt-numbering race with an atomic counter or unique constraint + retry. (C3, C4)
4. Regenerate `schema.sql` from the true migrated end-state (or introduce a `_migrations` tracking table + a small runner script), so a fresh environment reliably matches production. (C5)
5. Add magic-byte file validation on uploads; rate-limit `/auth/register-institution`; move password-reset tokens to hashed storage; replace query-param JWT acceptance with header-only.

### Phase B — Data integrity & scale hardening
1. Add the missing composite `(institution_id, deleted_at)` indexes; add `ON DELETE` behavior to FKs per `21_database_standards.md`; backfill missing audit columns on payroll/leave/homework tables.
2. Add `CHECK` constraints on enum-like columns.
3. Plan (don't rush) a money-column migration from `REAL` to integer paisa for new tables going forward; existing tables can be migrated in a dedicated, carefully-tested pass given how much financial code touches them.
4. Stand up a real automated backend test framework (vitest) around the fee, admissions, and payroll transaction fixes above, so the transactional rework in Phase A is actually regression-tested.

### Phase C — Frontend refactor (parallel-safe with B)
1. Convert `App.tsx` route imports to `React.lazy` + `Suspense` — cheap, high ROI.
2. Extract shared `DataTable`, `Modal`, and `ConfirmDialog` components; replace `window.confirm`/`prompt` usages.
3. Decompose the worst god-components (`Classes.tsx`, `StudentDetails.tsx`, `TeacherDetails.tsx`, `SectionWorkspace.tsx`, `Admissions.tsx`) following the existing `students/`/`teachers/` folder pattern.
4. Introduce typed per-domain API service classes to replace the untyped generic wrapper and the 6 pages doing raw `fetch()`.

### Phase D — College readiness (unlocks the "and colleges" half of the goal)
1. Build a real Programs/Semester admin UI exposing the already-existing `degree_type`/`credit_system_enabled`/`semester_enabled` schema fields.
2. Elective registration workflow (schema flags already exist).
3. Credit-weighted SGPA/CGPA computation with correct per-subject fail handling.
4. Backlog/supplementary exam workflow.
5. Course prerequisites.
6. Placement & Internship module (new).

### Phase E — Complete the "62-module" ERP scope
1. Real payment gateway integration (Razorpay/Stripe) built on top of the existing webhook/integrations infrastructure — highest business value of anything in this list.
2. Wire an actual SMS provider.
3. Hostel management, Medical records, Library reference/reserve distinction.
4. Finish Certificates (template system), Alumni (events/auto-population), real automated nightly backups.
5. Canteen, LMS/study materials, faculty research tracking, GL accounting, compliance reporting — roughly in that priority order, lowest-urgency last.

---

## Appendix — Source Agents
This report consolidates four independent audits: backend architecture/security, database schema/migrations, frontend architecture/code quality, and an ERP-scope gap analysis. Full per-agent findings (with exact file/line references) are reflected in the sections above; nothing here is fabricated or inferred beyond what those audits verified by reading the actual code.
