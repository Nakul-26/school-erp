# School ERP — MVP Security & Hardening Implementation Plan

> Generated from codebase analysis on 2026-07-18  
> Stack: Cloudflare Workers (Hono) + D1 + R2 · React/Vite frontend

---

## Current State Summary (from code analysis)

| Area | Current State | Risk |
|---|---|---|
| Auth middleware | ✅ JWT verify on all protected routes via `authMiddleware` | Low |
| CORS | ✅ Restricted dynamically via frontend origin config | Low |
| Rate limiting | ✅ 10 attempts / 15m on login; 3 attempts / 1h on forgot-password | Low |
| Institution registration | ✅ Secured via invite secret token code | Low |
| Student photo access | ✅ Protected behind JWT and same-institution validation | Low |
| Teacher photo/docs | ✅ Protected photos; documents checklist + logs migrated to D1/R2 | Low |
| Expenses ledger | ✅ Fully migrated to D1 database CRUD operations | Low |
| Payment verification | ✅ PENDING status + Accountant approval portal | Low |
| File upload validation | ✅ Checked on photos, docs, logo, and CSV imports | Low |
| Resource-level auth | ✅ Applied on students, grades, homework, exams, weekly-timetable | Low |
| Tenant isolation | ✅ Fully enforced on all database queries & routes | Low |
| JWT storage | ❌ Token in `localStorage` (XSS risk) | Low (pilot) |
| `alert()`/`confirm()` | ❌ Used in `Finance.tsx`, `HomeworkList.tsx`, etc. | Low (pilot) |

---

## 🚨 Phase 1 — True MVP Blockers

*Fix before any real school uses the system.*

---

### 1.1 — Student & Teacher Photo/Document Authorization

**Problem:** `GET /students/photo/:id` is completely unauthenticated, returning photos of minors by ID.

**Files:**
- `erp-backend/src/modules/students/students.routes.ts` — lines 11–46
- `erp-backend/src/modules/teachers/teachers.routes.ts` (similar pattern expected)

**Fix:**
1. Move photo route *after* `authMiddleware`, OR implement a signed-URL / pre-authenticated token pattern for `<img src>` tags.
2. The cleanest approach for image tags: generate a short-lived `?token=<signed>` query param on the backend; validate it in the photo route.

```typescript
// Option A: Require auth (breaks <img src> direct use)
students.use('*', authMiddleware); // Move BEFORE photo route

// Option B: Signed token (recommended for <img> compatibility)
students.get('/photo/:id', async (c) => {
  const token = c.req.query('token');
  if (!token) return c.json({ error: 'Unauthorized' }, 401);

  try {
    const payload = await verify(token, c.env.JWT_SECRET, 'HS256') as any;
    // Verify student belongs to requester's institution
    const student = await c.env.DB.prepare(
      'SELECT photo, institution_id FROM students WHERE id = ? AND is_active = 1'
    ).bind(c.req.param('id')).first<{ photo: string; institution_id: string }>();

    if (!student || student.institution_id !== payload.institution_id) {
      return c.json({ error: 'Not found' }, 404);
    }
    // ... serve photo
  } catch {
    return c.json({ error: 'Unauthorized' }, 401);
  }
});
```

3. In the frontend, update all `<img src="/students/photo/:id">` to append `?token=<jwt>` or fetch via blob URL with the Authorization header.

---

### 1.2 — File Upload Validation (Apply Existing Utility)

**Problem:** `validateUploadedFile()` is defined in `utils/file-upload.ts` but **not imported or called from any route** (confirmed via grep).

**Files to update:**
- All routes accepting `multipart/form-data` — student photos, teacher documents, homework attachments, library uploads, admissions docs.

**Fix:** Import and call `validateUploadedFile` at the top of every file-accepting handler.

```typescript
import { validateUploadedFile, sanitizeFileName } from '../../utils/file-upload';

// In any file upload handler:
const formData = await c.req.formData();
const file = formData.get('photo') as File;

const validationError = validateUploadedFile(file, { photoOnly: true, maxBytes: 2 * 1024 * 1024 });
if (validationError) {
  return c.json({ error: validationError }, 400);
}
const safeName = sanitizeFileName(file.name);
// Proceed with upload using safeName
```

**Audit all routes for file uploads:**
```bash
grep -rn "formData\|multipart\|FILES.put" src/modules/
```

---

### 1.3 — Finance Expenses: localStorage → Backend API

**Problem:** The entire Expenses Ledger in `Finance.tsx` is backed by `localStorage` with hardcoded mock data. Expenses are per-browser, lost on clear, and not audited.

**Files:**
- `erp-frontend/src/pages/Finance.tsx` — lines 32–184

**Backend tasks:**

1. Add `expenses` table to D1 schema (new migration file):

```sql
CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id),
  date TEXT NOT NULL,
  category TEXT NOT NULL CHECK(category IN ('Utilities','Stationery','Salaries','Transport','Maintenance','Others')),
  description TEXT NOT NULL,
  amount REAL NOT NULL CHECK(amount > 0),
  payment_method TEXT NOT NULL,
  recorded_by TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PAID',
  created_by TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_expenses_institution ON expenses(institution_id, date);
```

2. Add CRUD routes to `fees.routes.ts` (or new `expenses.routes.ts`):

```typescript
fees.get('/expenses', requireRole('admin', 'super_admin', 'Principal', 'HOD', 'Accountant'), async (c) => { ... });
fees.post('/expenses', requireRole('admin', 'super_admin', 'Principal', 'HOD', 'Accountant'), async (c) => { ... });
fees.delete('/expenses/:id', requireRole('admin', 'super_admin', 'Principal', 'Accountant'), async (c) => { ... });
```

**Frontend tasks:**

3. Replace all `localStorage.getItem/setItem('erp_expenses', ...)` calls with `api.get('/fees/expenses')`, `api.post('/fees/expenses', {...})`, `api.delete(...)`.
4. Remove `DEFAULT_EXPENSES` mock array entirely.
5. Remove the fallback: `setTodayCollections(todayPayments > 0 ? todayPayments : 68000)` — always use real data.

---

### 1.4 — Teacher Documents: localStorage → Backend

**Problem:** Teacher documents and timeline are stored in `localStorage` keyed by teacher ID. This means data is lost on browser clear and is not shared between staff members.

**Files:**
- `erp-frontend/src/pages/TeacherDetails.tsx` — lines 58–88, 323, 1086, 1102

**Fix:**
1. Verify if the backend already has document/attachment support for teachers. If not, add a `teacher_documents` table and CRUD endpoints.
2. Migrate localStorage reads/writes to API calls.

---

### 1.5 — Payment Verification (Online Payments)

**Problem:** `POST /fees/records/:id/pay-online` trusts the client-provided `transaction_reference` without any verification. A student could submit any fake reference and get marked as paid immediately.

**File:** `erp-backend/src/modules/fees/fees.routes.ts` — lines 441–519

**Current flow (unsafe):**
```
Client → POST { amount, payment_method, transaction_reference } → immediately recorded as paid
```

**Fix — Option A: Mark as "Pending Verification" (minimum viable fix for pilot):**

```typescript
// 1. Add verification_status column to fee_payments:
-- ALTER TABLE fee_payments ADD COLUMN verification_status TEXT DEFAULT 'VERIFIED';

// 2. For online self-payments, insert as PENDING:
await db.prepare(`
  INSERT INTO fee_payments (..., verification_status)
  VALUES (?, ..., 'PENDING')
`).run();

// 3. Do NOT update student_fee_records.paid_amount until an accountant verifies

// 4. Add an accountant-only verification endpoint:
fees.patch('/payments/:id/verify', requireRole('admin', 'super_admin', 'Principal', 'Accountant'), async (c) => {
  // Update verification_status = 'VERIFIED', then update paid_amount on fee record
});
```

**Fix — Option B: Razorpay/PayU webhook (for real payment gateway integration):**

```typescript
fees.post('/webhooks/payment', async (c) => {
  const signature = c.req.header('x-razorpay-signature');
  const body = await c.req.text();

  const expectedSig = await hmacSHA256(body, c.env.RAZORPAY_WEBHOOK_SECRET);
  if (signature !== expectedSig) {
    return c.json({ error: 'Invalid signature' }, 400);
  }

  const event = JSON.parse(body);
  if (event.event === 'payment.captured') {
    // Safely update student payment records here
  }
});
```

> **Recommendation for pilot:** Implement Option A now. Plan Option B when integrating a payment gateway.

---

### 1.6 — Backend Authorization Audit

**Problem:** Several write routes are missing role/permission guards. Key culprits identified:

- `POST /auth/register-institution` — **PUBLIC** (anyone can create a school)
- `GET /fees/payments` — no role check (any authenticated user can see all payments for the institution)

**Fix — Admin-gate institution registration:**

```typescript
// Option 1: Require super_admin token
auth.post('/register-institution', authMiddleware, requireRole('super_admin'), async (c) => { ... });

// Option 2: Require an invite code/secret (simpler for onboarding flow)
auth.post('/register-institution', async (c) => {
  const { invite_code, ...data } = await c.req.json();
  if (invite_code !== c.env.INSTITUTION_INVITE_SECRET) {
    return c.json({ error: 'Invalid invite code' }, 403);
  }
  // ... proceed with registration
});
```

Add `INSTITUTION_INVITE_SECRET` to `.dev.vars` and Cloudflare Worker secrets.

**Fix — `GET /fees/payments` role check:**

```typescript
fees.get('/payments', async (c) => {
  const user = c.get('user');
  const userRoles = user.roles || [];
  const isAdminOrStaff = userRoles.some(r =>
    ['super_admin', 'Super Admin', 'admin', 'Principal', 'HOD', 'Accountant'].includes(r)
  );
  const studentId = c.req.query('student_id');

  if (!isAdminOrStaff) {
    if (!studentId) return c.json({ error: 'Forbidden' }, 403);
    // Verify studentId belongs to this user (student/parent check)
  }
  // ...
});
```

**Full audit — run this to find unprotected write routes:**

```bash
grep -n "\.post\|\.put\|\.patch\|\.delete" src/modules/*/*.routes.ts \
  | grep -v "requireRole\|requirePermission\|authMiddleware"
```

---

### 1.7 — Resource-Level Authorization (Teacher Scope Gaps)

**Problem:** `teacher-scope.ts` utilities are well-designed but inconsistently applied across modules.

**Audit each module:**

| Module | Teacher Scope Applied? | Action Needed |
|---|---|---|
| `students.routes.ts` | ✅ Yes | Done |
| `attendance.routes.ts` | ⚠️ Check | Add `teacherHasSectionAccess` |
| `grades.routes.ts` | ⚠️ Check | Add `teacherCanAccessExam` |
| `homework.routes.ts` | ⚠️ Check | Verify section-scoped |
| `exams.routes.ts` | ⚠️ Check | Add `teacherCanAccessExam` |
| `weekly-timetable.routes.ts` | ⚠️ Check | Teachers see only their own |
| `fees.routes.ts` | N/A | Teachers shouldn't access fee data |
| Reports endpoints | ⚠️ Check | Should be scoped to teacher's sections |

**Standard pattern to add where missing:**

```typescript
import { isTeacherOnly, teacherHasSectionAccess } from '../../utils/teacher-scope';

// In any route that teachers can access:
if (isTeacherOnly(user)) {
  const allowed = await teacherHasSectionAccess(c.env.DB, user, sectionId);
  if (!allowed) {
    return c.json({ error: 'Forbidden: Section not in your assignment' }, 403);
  }
}
```

---

## 🟡 Phase 2 — Important Before Multi-School Onboarding

*Address after pilot launch but before onboarding more schools.*

---

### 2.1 — Login & Forgot-Password Rate Limiting

**Problem:** `POST /auth/login` and `POST /auth/forgot-password` have no rate limiting. Vulnerable to brute force and email spam.

**File:** `erp-backend/src/modules/auth/auth.routes.ts` — lines 17–48

**Fix — Add `middleware/rate-limit.ts`:**

```typescript
// erp-backend/src/middleware/rate-limit.ts
import { Context, Next } from 'hono';

const attempts = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(maxAttempts: number, windowMs: number) {
  return async (c: Context, next: Next) => {
    const ip = c.req.header('cf-connecting-ip')
      || c.req.header('x-forwarded-for')
      || 'unknown';
    const key = `${c.req.path}:${ip}`;
    const now = Date.now();

    const entry = attempts.get(key);
    if (entry && now < entry.resetAt) {
      if (entry.count >= maxAttempts) {
        return c.json({ error: 'Too many attempts. Please try again later.' }, 429);
      }
      entry.count++;
    } else {
      attempts.set(key, { count: 1, resetAt: now + windowMs });
    }

    await next();
  };
}
```

```typescript
// In auth.routes.ts:
import { rateLimit } from '../../middleware/rate-limit';

auth.post('/login', rateLimit(10, 15 * 60 * 1000), async (c) => { ... });
auth.post('/forgot-password', rateLimit(3, 60 * 60 * 1000), async (c) => { ... });
```

> **Note:** In-memory rate limits reset on Worker restart. For persistent limiting, use **Cloudflare KV** with a TTL key per IP.

---

### 2.2 — Restrict CORS to Frontend Domain

**Problem:** `app.use('*', cors())` allows any origin.

**File:** `erp-backend/src/index.ts` — line 49

**Fix:**

```typescript
// Add FRONTEND_ORIGIN to .dev.vars and Cloudflare secrets
// e.g. FRONTEND_ORIGIN=https://your-school-erp.pages.dev

app.use('*', cors({
  origin: (origin, c) => {
    const allowed = [
      c.env.FRONTEND_ORIGIN,
      'http://localhost:5173', // dev only
    ].filter(Boolean);
    return allowed.includes(origin) ? origin : '';
  },
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
  maxAge: 86400,
}));
```

---

### 2.3 — Admin-Gate Institution Registration

Already covered in 1.6 above. This also belongs in Phase 2 if a public self-signup flow is intentional for now.

---

### 2.4 — Tenant Isolation Testing

**Critical if supporting multiple schools.** Verify no cross-institution data leakage.

**Testing checklist:**
1. Create two institutions: School A (`inst_id_A`) and School B (`inst_id_B`)
2. Login as School A admin, obtain JWT (`institution_id = inst_id_A`)
3. Attempt to access School B resources by guessing IDs:
   - `GET /students/{school_b_student_id}` → Should return 404
   - `GET /fees/ledger/{school_b_student_id}` → Should return 404
   - `GET /institutions/{inst_id_B}` → Should return 404
4. Attempt cross-institution writes:
   - `POST /attendance` with a section from School B → Should fail

**Patterns to audit:**

```typescript
// ✅ CORRECT — always filters by institution_id from JWT:
WHERE student_id = ? AND institution_id = ?

// ❌ WRONG — trusts the ID alone:
WHERE student_id = ?  // institution_id missing
```

**Grep for potentially missing institution filters:**

```bash
grep -n "WHERE id = ?" src/modules/*/*.repository.ts | grep -v "institution_id"
```

---

### 2.5 — RBAC Regression Tests

Add automated tests for authorization boundaries. Create `test-rbac.js`:

```javascript
// Test scenarios to cover:
// - Teacher cannot access another teacher's section
// - Student cannot access other student's fee records
// - Parent cannot access non-child student data
// - Accountant cannot delete teachers
// - Anonymous user cannot access any protected route
// - School A admin cannot read School B's data
```

---

## 🟢 Phase 3 — Production Hardening (Post-Pilot)

*These improve robustness but shouldn't block a controlled pilot.*

---

### 3.1 — Replace alert()/confirm() with Modals/Toasts

**Files with native dialogs:**
- `Finance.tsx` — lines 149, 170, 173
- `HomeworkList.tsx` and others

Replace with a toast notification system (e.g., `react-hot-toast`) or a custom modal component already used elsewhere in the app.

---

### 3.2 — JWT Token Storage (localStorage → HttpOnly Cookies)

Currently `erp_token` is stored in `localStorage` (XSS-accessible).

**Files:** `erp-frontend/src/contexts/AuthContext.tsx`, `erp-frontend/src/services/api.ts`

**Migration steps:**
1. Backend: Set `HttpOnly; Secure; SameSite=Strict` cookie on login response instead of returning token in body.
2. Frontend: Remove manual `Authorization: Bearer` header injection; browser sends cookie automatically.
3. Add CORS `credentials: true` backend + `withCredentials: true` on all fetch calls.

> **Pilot acceptable:** localStorage is fine for a controlled pilot with known users. Prioritize for public-facing production.

---

### 3.3 — Fix Encoding Artifacts

Search for `â‚¹` and similar UTF-8 mis-encoded characters across source files and normalize.

```bash
grep -rn "â‚¹\|â€\|Ã" src/
```

---

### 3.4 — JWT Revocation / Session Invalidation

Currently, JWTs are valid until expiry (~24h). Add forced-logout capability:

```typescript
// Option A: KV-based blocklist
await c.env.KV.put(`revoked:${jti}`, '1', { expirationTtl: 86400 });

// In authMiddleware, check:
const revoked = await c.env.KV.get(`revoked:${payload.jti}`);
if (revoked) return c.json({ error: 'Session invalidated. Please log in again.' }, 401);
```

---

## Implementation Order (Recommended Sprint Plan)

### Sprint 1 — Days 1–3 (Critical Security Fixes)
- [x] Photo route authorization — move `authMiddleware` before photo route (1.1)
- [x] Apply `validateUploadedFile` to all upload handlers (1.2)
- [x] Admin-gate institution registration with invite code (1.6 + 2.3)
- [x] Add role check to `GET /fees/payments` (1.6)

### Sprint 2 — Days 4–6 (Finance Backend Migration)
- [x] D1 migration: add `expenses` table
- [x] Backend CRUD routes for expenses (`GET`, `POST`, `DELETE`)
- [x] Frontend: replace all `localStorage` expense calls with API
- [x] Remove `DEFAULT_EXPENSES` mock data and `68000` fallback

### Sprint 3 — Days 7–8 (Payment & Teacher Docs)
- [x] Online payment → `PENDING_VERIFICATION` status (1.5)
- [x] Add accountant payment verification route + UI button
- [x] Teacher documents: migrate `localStorage` to backend API (1.4)

### Sprint 4 — Days 9–10 (Teacher Scope Audit)
- [x] Audit `attendance`, `grades`, `homework`, `exams`, `timetable` routes
- [x] Add missing `teacherHasSectionAccess` / `teacherCanAccessStudent` checks (1.7)

### Sprint 5 — Before Multi-School (Hardening)
- [x] Rate limiting middleware on login/forgot-password (2.1)
- [x] CORS restriction to frontend domain (2.2)
- [x] Tenant isolation test suite (2.4)
- [x] RBAC regression test suite (2.5)

---

## Quick Reference: Key Files

| File | Issue |
|---|---|
| `erp-backend/src/index.ts` L49 | Wildcard CORS — needs origin restriction |
| `erp-backend/src/middleware/auth.ts` | JWT + RBAC middleware (solid, reference this) |
| `erp-backend/src/utils/file-upload.ts` | File validation utility — exists but **never called** |
| `erp-backend/src/utils/teacher-scope.ts` | Teacher scoping utils — well-built, needs broader use |
| `erp-backend/src/modules/auth/auth.routes.ts` L28 | `register-institution` is fully public |
| `erp-backend/src/modules/fees/fees.routes.ts` L441 | Online payment trusts client reference |
| `erp-backend/src/modules/students/students.routes.ts` L11 | Student photo route is fully public |
| `erp-frontend/src/pages/Finance.tsx` L32–184 | Expenses backed by localStorage + mock data |
| `erp-frontend/src/pages/TeacherDetails.tsx` L58–88 | Teacher docs/timeline in localStorage |
