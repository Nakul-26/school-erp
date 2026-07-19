# 🔐 Academic Setup — Complete RBAC Audit Report

> **Scanned Files:**
> - Frontend: `erp-frontend/src/pages/AcademicSetup.tsx`, `routes/ProtectedRoute.tsx`
> - Backend: `erp-backend/src/modules/academic-years/academic-year.routes.ts`, `teaching-allocations/allocations.routes.ts`
> - Routes: `App.tsx` line 118, `config/roleNav.ts` line 32
>
> Date: 2026-07-18

---

## 1. Route Guard Analysis (`App.tsx` + `roleNav.ts`)

### `/academic-setup` — Academic Setup Flow

| Property | Value |
|---|---|
| `allowedRoles` | `['admin', 'super_admin', 'Principal', 'HOD']` |
| Route policy permissions | `['academic.manage']` |
| ProtectedRoute applied | ✅ |

> [!WARNING]
> **ProtectedRoute Architecture Gap:**
> `ProtectedRoute.tsx` implements authorization using `roleAllowed || permissionAllowed` (OR logic). Because of this:
> - Any HOD, Principal, or Admin user will pass the route guard and gain access to the Academic Setup flow, even if their specific profile lacks the `academic.manage` permission.

---

## 2. Frontend — `AcademicSetup.tsx`

### UI Gaps

- **No granular UI permission checks.** There is no use of `hasAnyPermission` or `isAdmin` to hide action buttons.
- Any user who is allowed through the route guard (HOD, Principal, Admin) sees all setup controls:
  - **"Add Subject"** buttons (Curriculum tab).
  - **Subject modification buttons** (increase/decrease weekly periods `+`/`-`).
  - **Subject deletion (trash) and edit (pencil) icons**.
  - **Dropdown selects** to update or create teacher allocations for any subject.
  - **"Go to Scheduler"** button (Timetable tab) which navigates to `/timetable`.
- **Status:** If a user lacks the `academic.manage` permission, clicking these actions will send backend requests that fail with `403 Forbidden`. The UI misleadingly shows them.

---

## 3. Backend — `academic-year.routes.ts`

### Security Check Summary

| Method | Endpoint | Role Guard | Institution Check | Status |
|---|---|---|---|---|
| GET | `/` | ❌ None (auth only) | `institution_id` check ✅ | ✅ Low risk |
| GET | `/:id` | ❌ None (auth only) | `institution_id` check ✅ | ✅ Low risk |
| POST | `/` | `requirePermission('academic.manage')` ✅ | ✅ | ✅ |
| PUT | `/:id` | `requirePermission('academic.manage')` ✅ | ✅ | ✅ |
| DELETE | `/:id` | `requirePermission('academic.manage')` ✅ | ✅ | ✅ |
| POST | `/rollover` | `requirePermission('academic.manage')` ✅ | ✅ | ✅ |
| POST | `/promote` | `requirePermission('academic.manage')` ✅ | ✅ | ✅ |
| POST | `/close` | `requirePermission('academic.manage')` ✅ | ✅ | ✅ |

✅ **Good.** Academic year setup mutations are well-guarded by `academic.manage`.

---

## 4. Backend — `allocations.routes.ts`

### Critical Security Gaps (Information Leakage to Students/Parents)

The teaching allocations endpoints lack backend role restrictions on all read routes:

1. **`GET /teaching-allocations` (Line 15)**
   - Checks `isTeacherOnly(user)`. If true, restricts the output to the teacher's own allocations.
   - For **Students** and **Parents/Guardians**, `isTeacherOnly` returns `false` (their roles are not Teacher).
   - **Vulnerability:** They fall through to the general list branch and receive the entire teaching assignment layout of the institution.

2. **`GET /teaching-allocations/load/:teacherId` (Line 49)**
   - No role check (only checks that the teacher exists and belongs to the same institution).
   - **Vulnerability:** Any student or parent can view the workload analysis metrics of any teacher.

3. **`GET /teaching-allocations/dashboard` (Line 71)**
   - No role check.
   - **Vulnerability:** Any student or parent can fetch the allocation dashboard metrics (healthy/overloaded teacher counts, unallocated subjects count, conflict counts).

4. **`GET /teaching-allocations/conflicts` (Line 149)**
   - No role check.
   - **Vulnerability:** Any student or parent can retrieve a list of all current conflicts in the institution (including details like teacher names, section names, and subject names).

5. **`GET /teaching-allocations/:id` (Line 257)**
   - No role check.
   - **Vulnerability:** Any student or parent can retrieve the details of any single teaching allocation record.

---

## 5. Consolidated Findings

### 🔴 Critical

1. **`GET /teaching-allocations/conflicts`** — Any student, parent, or low-privileged user can view institutional workload allocation conflicts and warning logs.
2. **`GET /teaching-allocations/dashboard`** — Any student or parent can fetch teaching allocation dashboard data.

### 🟠 High

3. **ProtectedRoute Bypass** — HOD or Principal users bypass permission checking entirely due to OR logic in `ProtectedRoute.tsx`.
4. **`GET /teaching-allocations`** and **`GET /teaching-allocations/load/:teacherId`** — Missing role restriction. Low-privileged users can pull the entire teaching assignment table and workload details of the school.
5. **Frontend UI buttons in `AcademicSetup.tsx`** — Action buttons are shown to users even if they lack write permissions, causing misleading UI states and silent 403 API errors.

---

## 6. Recommended Fixes

### Fix 1: Tighten ProtectedRoute checking logic
Modify the routing checks in `ProtectedRoute.tsx` or `accessControl.ts` to implement AND logic when both roles and permissions are defined, ensuring that users must satisfy both guards to enter setup flows:
```ts
// accessControl.ts canAccess logic change:
const roleAllowed = policy.roles?.length ? hasAnyRole(roles, policy.roles) : true; // default to true if not defined
const permissionAllowed = policy.permissions?.length
  ? policy.permissionMode === 'all'
    ? hasAllPermissions(permissions, policy.permissions)
    : hasAnyPermission(permissions, policy.permissions)
  : true;

return roleAllowed && permissionAllowed; // use AND instead of OR
```

### Fix 2: Add role guards to allocations GET endpoints
Restrict allocations list, load details, and dashboard queries to staff roles:
```ts
// allocations.routes.ts
// Add requirePermission('academic.manage') or requireRole('admin', 'super_admin', 'Principal', 'HOD', 'Teacher')
allocations.get('/conflicts', requirePermission('academic.manage'), async (c) => { ... });
allocations.get('/dashboard', requirePermission('academic.manage'), async (c) => { ... });
```
