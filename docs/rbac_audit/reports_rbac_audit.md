# 🔐 Analytics & Reports — Complete RBAC Audit Report

> **Scanned Files:**
> - Frontend: `erp-frontend/src/pages/Reports.tsx`
> - Backend: `erp-backend/src/modules/teachers/teachers.routes.ts` (GET `/reports/workload`), `attendance/attendance.routes.ts` (GET `/reports/students`)
> - Routes: `App.tsx` line 174, `config/roleNav.ts` line 67
>
> Date: 2026-07-18

---

## 1. Route Guard Analysis (`App.tsx` + `roleNav.ts`)

### `/reports` — Analytics & Reports Workspace

| Property | Value |
|---|---|
| `allowedRoles` | `['admin', 'super_admin', 'Principal', 'HOD', 'Teacher']` |
| Route policy permissions | ❌ None |
| ProtectedRoute applied | ✅ |

> [!WARNING]
> **Route Guard & Tab Exposure:**
> - The route guard allows any user with the `Teacher` role to access `/reports`.
> - However, the UI does not implement tabs gating. A teacher can access the **Notice/Fee Collection Audit** tab, which will trigger API requests (`GET /fees/reports/*`) that fail with `403 Forbidden` because teachers lack accountant privileges.

---

## 2. Frontend — `Reports.tsx`

### UI Gaps

- **No granular UI permission/role checks.** There is no use of `hasAnyPermission` or `isAdmin` to hide tabs or buttons.
- Any user who is allowed through the route guard (including Teachers) sees all tabs:
  - **Notice Board / Fee Collection Audit** tab.
  - **Teacher Workloads** tab.
  - **Export PDF Report** button.
  - **Remind** button (to dispatch outstanding fee alerts via `POST /fees/reminder` which fails with 403 for teachers).

---

## 3. Backend — `teachers.routes.ts` (Faculty Workloads)

### Critical Security Gaps (Faculty Attendance & Workload Leaks)

1. **`GET /teachers/reports/workload` (Line 22)**
   - No role or permission checks.
   - **Vulnerability:** Any authenticated user (including students, parents, and general staff) can call this endpoint and retrieve a full workload analysis of all teachers. This includes designation details, department names, exact numbers of lectures conducted, and individual teacher attendance percentages.

---

## 4. Backend — `attendance.routes.ts` (Class Attendance Summary)

### Critical Security Gaps (Student Attendance Matrix Leak)

1. **`GET /attendance/reports/students` (Line 239)**
   - Checks `teacherHasSectionAccess(c.env.DB, user, sectionId)`.
   - `teacherHasSectionAccess` evaluates to `true` for non-teachers (like students and parents).
   - **Vulnerability:** Any student or parent can retrieve detailed attendance percentages, roll numbers, and present/absent counts for any student in any class section in the school.

---

## 5. Consolidated Findings

### 🔴 Critical

1. **`GET /teachers/reports/workload`** — Public exposure of all faculty member names, designations, employee IDs, and detailed daily attendance percentages.
2. **`GET /attendance/reports/students`** — Public exposure of the entire student body's roll lists and attendance rates.

### 🟠 High

3. **Frontend UI tabs in `Reports.tsx`** — Fee Collection Audit and workload tabs are visible to teachers, causing API errors and exposing dashboard KPI boxes.

---

## 6. Recommended Fixes

### Fix 1: Restrict Teacher Workload to Admin/Staff
Ensure only administrative staff can pull the global faculty workload table:
```ts
// teachers.routes.ts
teachers.get('/reports/workload', requireRole('admin', 'super_admin', 'Principal', 'HOD'), async (c) => { ... });
```

### Fix 2: Restrict Class Attendance Reports to Staff
Ensure students/parents cannot view the class attendance matrices:
```ts
// attendance.routes.ts
// GET /reports/students
const roles = user.roles || [];
const isStaff = roles.some(r => ['admin', 'super_admin', 'Principal', 'HOD', 'Teacher', 'teacher'].includes(r));
if (!isStaff) {
  return c.json({ error: 'Forbidden' }, 403);
}
```

### Fix 3: Hide Tabs in Frontend
Update `Reports.tsx` to conditionalize tabs by roles:
```tsx
const showFeeTab = roles.some(r => ['admin', 'super_admin', 'Principal', 'HOD', 'Accountant'].includes(r));
const showTeacherTab = roles.some(r => ['admin', 'super_admin', 'Principal', 'HOD'].includes(r));
```
Cwd:
