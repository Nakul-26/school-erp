# 🔐 Attendance & Registers — Complete RBAC Audit Report

> **Scanned Files:**
> - Frontend: `erp-frontend/src/pages/Attendance.tsx`, `TeacherAttendance.tsx`
> - Backend: `erp-backend/src/modules/attendance/attendance.routes.ts`, `teacher-attendance/teacher-attendance.routes.ts`
> - Routes: `App.tsx` lines 144–145, `config/roleNav.ts` lines 43–44, 66
>
> Date: 2026-07-18

---

## 1. Route Guard Analysis (`App.tsx` + `roleNav.ts`)

### `/attendance` — Student & Staff Attendance Workspace

| Property | Value |
|---|---|
| `allowedRoles` | `['admin', 'super_admin', 'Principal', 'HOD', 'Teacher']` |
| Route policy permissions | `['attendance.view', 'attendance.mark']` |
| ProtectedRoute applied | ✅ |

> [!WARNING]
> **ProtectedRoute Architecture Mismatch:**
> Due to OR logic inside `ProtectedRoute.tsx` (`roleAllowed || permissionAllowed`), any user holding any of the allowed roles (e.g. `Teacher`) will bypass the permission guard and enter the workspace, even if their user profile lacks the `attendance.view` or `attendance.mark` permissions.

### `/teacher-attendance` — Staff Attendance Workspace

| Property | Value |
|---|---|
| `allowedRoles` | `['admin', 'super_admin', 'Principal', 'HOD']` |
| Route policy permissions | ❌ None |
| ProtectedRoute applied | ✅ |

✅ **Good.** Restricted to administrative and academic manager roles.

---

## 2. Frontend — `Attendance.tsx`

### UI Gaps
- **Tab Access:** The tab switch header relies on a custom flag:
  `const canManageTeachers = roles.some(r => ['super_admin', 'Admin', 'admin', 'Principal', 'HOD', 'hod'].includes(r));`
  This uses a hardcoded list of roles instead of the `attendance.view` / `attendance.mark` or a specific staff management permission, which is inconsistent.
- **Button Visibility:** No permission-based gating exists in the student attendance list view (`stdView === 'list'`). Any teacher or administrative staff can see and click:
  - "Start Class Session"
  - "Open Register"
  - "Delete" (trash) icon button next to sessions.
- **Status:** If a teacher does not teach a section, clicking "Open Register" will fail with a `403 Forbidden` from the backend, but the button remains clickable.

---

## 3. Frontend — `TeacherAttendance.tsx`

### UI Gaps
- No inline role or permission checks. The page relies entirely on the route guard.

---

## 4. Backend — `attendance.routes.ts` (Student Attendance)

### Critical Security Gaps (Privilege Escalation for Student/Parent)

Hono routes are protected globally by `authMiddleware` (valid JWT check), but they do not enforce roles on read/write endpoints:

1. **`GET /attendance/sessions` (Line 22)**
   - Checks `isTeacherOnly(user)`. If true, filters sessions by teaching assignment.
   - For **Students** and **Parents/Guardians**, `isTeacherOnly` returns `false` (their roles are not Teacher).
   - **Vulnerability:** They fall through to the general list branch and receive all attendance sessions in the institution.

2. **`GET /attendance/sessions/:id/attendance` (Line 156)**
   - Checks `teacherHasSubjectAccess`.
   - `teacherHasSubjectAccess` returns `true` immediately for any non-teacher role (e.g., student, parent, accountant).
   - **Vulnerability:** Any student or parent can retrieve student names, roll numbers, and attendance records (present/absent status and teacher remarks) for any session.

3. **`POST /attendance/sessions/:id/attendance` (Line 174)**
   - Checks `teacherHasSubjectAccess` which returns `true` for non-teachers.
   - **Vulnerability:** Any student or parent can mark attendance (send a POST payload to save attendance registers for any active session). A student can mark themselves or classmates present.

4. **`GET /attendance/reports/students` (Line 239)**
   - Checks `teacherHasSectionAccess` which returns `true` for non-teachers.
   - **Vulnerability:** Any student or parent can fetch student attendance reports for any class section in the institution.

---

## 5. Backend — `teacher-attendance.routes.ts` (Staff Attendance)

### Critical Security Gaps (Information Disclosure & Cross-Teacher Leak)

1. **`GET /teacher-attendance/history/:teacherId` (Line 49)**
   - Gaurded by `requireRole('admin', 'super_admin', 'Principal', 'HOD', 'Teacher')`.
   - **Vulnerability:** There is no check that the requested `teacherId` matches the logged-in teacher's profile ID. Any teacher can query the detailed attendance history of any other teacher in the school.

---

## 6. Consolidated Findings

### 🔴 Critical

1. **`POST /attendance/sessions/:id/attendance`** — Any student or parent can mark attendance (modify register statuses) for any active class session.
2. **`GET /attendance/sessions/:id/attendance`** — Any student or parent can query student attendance records, exposing student PII, attendance flags, and teacher remarks.
3. **`GET /teacher-attendance/history/:teacherId`** — Any teacher can fetch the full attendance logs of any other teacher.

### 🟠 High

4. **`GET /attendance/sessions`** and **`GET /attendance/reports/students`** — Low-privileged users (students/parents) fall through teacher constraints and can view all active session directories and class reports.
5. **Frontend UI buttons in `Attendance.tsx`** — Action buttons are shown to users even if they lack authorization for specific classes or subjects, leading to 403 API errors.

---

## 7. Recommended Fixes

### Fix 1: Restrict student attendance endpoints to Staff
Update `attendance.routes.ts` endpoints to ensure students and parents are rejected:
```ts
// attendance.routes.ts
// Add a middleware check or inline check:
const roles = user.roles || [];
const isStaff = roles.some(r => ['admin', 'super_admin', 'Principal', 'HOD', 'Teacher', 'teacher'].includes(r));
if (!isStaff) {
  return c.json({ error: 'Forbidden' }, 403);
}
```

### Fix 2: Self-scoping for Teacher Attendance History
Update `GET /history/:teacherId` to ensure teachers can only see their own attendance:
```ts
// teacher-attendance.routes.ts
const isTeacher = userRoles.includes('Teacher') || userRoles.includes('teacher');
if (isTeacher) {
  const currentTeacherId = await getTeacherIdForUser(c.env.DB, user);
  if (currentTeacherId !== teacherId) {
    return c.json({ error: 'Forbidden: You cannot access other teacher attendance logs' }, 403);
  }
}
```
Cwd:
