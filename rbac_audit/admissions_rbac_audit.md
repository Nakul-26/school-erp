# 🔐 Admissions & Inquiries — Complete RBAC Audit Report

> **Scanned Files:**
> - Frontend: `erp-frontend/src/pages/Admissions.tsx`
> - Backend: `erp-backend/src/modules/admissions/admissions.routes.ts`
> - Routes: `App.tsx` line 112, `config/roleNav.ts` line 34
>
> Date: 2026-07-18

---

## 1. Route Guard Analysis (`App.tsx` + `roleNav.ts`)

### `/admissions` — Admissions & Pipeline Workspace

| Property | Value |
|---|---|
| `allowedRoles` | `['admin', 'super_admin', 'Principal', 'HOD']` |
| Route policy permissions | ❌ None |
| ProtectedRoute applied | ✅ |

✅ **Good.** Entry to `/admissions` is restricted strictly to administrative and academic setup roles.

---

## 2. Frontend — `Admissions.tsx`

### UI Gaps
- **Actions Visibility:** Since only authorized roles can access `/admissions` under the routing policy, all in-page actions (Add Inquiry, New Application, Convert, Approve, Reject, Kanban Drag-and-Drop) are correctly visible and usable by the entering user.
- **Status:** Clean. No UI mismatches or button leakage because the entire view is restricted.

---

## 3. Backend — `admissions.routes.ts`

### Security Check Summary

All endpoints in the admissions module are guarded by role checks:

| Method | Endpoint | Role Guard | Status |
|---|---|---|---|
| GET | `/inquiries` | `requireRole('admin', 'super_admin', 'Principal', 'HOD')` | ✅ Secured |
| POST | `/inquiries` | `requireRole('admin', 'super_admin', 'Principal', 'HOD')` | ✅ Secured |
| GET | `/inquiries/:id` | `requireRole('admin', 'super_admin', 'Principal', 'HOD')` | ✅ Secured |
| PATCH | `/inquiries/:id` | `requireRole('admin', 'super_admin', 'Principal', 'HOD')` | ✅ Secured |
| POST | `/inquiries/:id/convert` | `requireRole('admin', 'super_admin', 'Principal')` | ✅ Secured |
| GET | `/applications` | `requireRole('admin', 'super_admin', 'Principal', 'HOD')` | ✅ Secured |
| POST | `/applications` | `requireRole('admin', 'super_admin', 'Principal', 'HOD')` | ✅ Secured |
| GET | `/applications/:id` | `requireRole('admin', 'super_admin', 'Principal', 'HOD')` | ✅ Secured |
| PATCH | `/applications/:id/approve` | `requireRole('admin', 'super_admin', 'Principal')` | ✅ Secured |
| PATCH | `/applications/:id/reject` | `requireRole('admin', 'super_admin', 'Principal')` | ✅ Secured |

✅ **Good.** The backend routes verify that only authorized roles can query or mutate inquiry and application records.

---

## 4. Consolidated Findings

### 🟢 Status: SECURE
The admissions workspace has robust RBAC coverage:
- The route guard blocks students, parents, teachers, and other staff members.
- The Hono router consistently applies `requireRole` check guards to all read/write endpoints.
- Converting and final outcome mutations (approving/rejecting applications) are restricted specifically to top admins (`admin`, `super_admin`, `Principal`), preventing lower managers like HODs from enrolling students unilaterally.
Cwd:
