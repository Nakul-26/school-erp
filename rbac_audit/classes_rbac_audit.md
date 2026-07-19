# 🔐 Classes, Sections & Programs — Complete RBAC Audit Report

> **Scanned Files:**
> - Frontend: `erp-frontend/src/pages/Classes.tsx`, `SectionWorkspace.tsx`
> - Backend: `erp-backend/src/modules/sections/sections.routes.ts`, `programs/programs.routes.ts`, `teaching-allocations/allocations.routes.ts`
> - Routes: `App.tsx` lines 129–131, `config/roleNav.ts` lines 35–36
>
> Date: 2026-07-18

---

## 1. Route Guard Analysis (`App.tsx` + `roleNav.ts`)

### `/classes` — Classes & Sections Directory

| Property | Value |
|---|---|
| `allowedRoles` | `['admin', 'super_admin', 'Principal', 'HOD']` |
| Route policy permissions | `['academic.manage']` |
| ProtectedRoute applied | ✅ |

✅ **Good.** Restricted to academic managers and admin roles.

### `/classes/:id` — Class Section Workspace

| Property | Value |
|---|---|
| `allowedRoles` | `['admin', 'super_admin', 'Principal', 'HOD', 'Teacher']` |
| Route policy permissions | `['academic.manage']` |
| ProtectedRoute applied | ✅ |

> [!WARNING]
> Mismatch between `allowedRoles` (which includes `Teacher`) and `routePolicy.permissions` (which is `['academic.manage']`).
> In `accessControl.ts`, the page allows access if `roleAllowed || permissionAllowed`. Since `Teacher` is in `allowedRoles`, Teachers are allowed in even though they do not have `academic.manage` permission.

---

## 2. Frontend — `Classes.tsx` (Directory Page)

### UI Gaps

- **No granular UI permission checks.** There is no use of `hasAnyPermission` or `isAdmin` to hide action buttons.
- Any user who reaches this page (e.g. an HOD without permission, if that's possible, or any Principal/Admin) sees all action buttons:
  - "Add Section" / "Add Class/Section"
  - "Add Course / Program"
  - "Edit" icon buttons next to each section
  - "Archive" icon buttons next to each section
  - "Delete" (trash) icon buttons next to each section
  - "Edit" program buttons
  - "Archive" / "Restore" program buttons
- **Status:** Mismatch. The backend will block these operations via `academic.manage` check, but the UI misleadingly displays them.

---

## 3. Frontend — `SectionWorkspace.tsx` (Class Workspace)

This page is accessible to Teachers.

### UI Gaps

- **Absolutely no role or permission checks in the code.**
- A Teacher visiting the section workspace sees all control and management buttons:
  - **"Class Settings"** button (triggers modal to modify room, name, capacity, class teacher).
  - **"Enroll Student"** button (redirects to `/students?showAdd=true&section_id=...`).
  - **"Mark Attendance"** button.
  - **"Assign Homework"** button.
- **Status:** Clicking "Class Settings" and saving will send a `PUT /sections/:id` request which fails with `403 Forbidden` on the backend. Showing the buttons is confusing.

---

## 4. Backend — `sections.routes.ts`

### Critical Security Gaps (Privilege Escalation for Student/Parent)

Hono routes are protected globally by `authMiddleware` (valid JWT check), but they do not enforce roles on read endpoints:

1. **`GET /sections` (Line 14)**
   - Checks `isTeacherOnly(user)`. If true, filters sections by teaching assignment.
   - For **Students** and **Parents/Guardians**, `isTeacherOnly` returns `false` (their roles are not Teacher).
   - **Vulnerability:** They fall through to the non-teacher list branch and receive the list of **all sections** in the institution.

2. **`GET /sections/:id` (Line 76)**
   - Checks `teacherHasSectionAccess(db, user, id)`.
   - `teacherHasSectionAccess` returns `true` immediately for any non-teacher role (e.g., student, parent, accountant).
   - **Vulnerability:** Any student or parent can view the complete details of any class section.

3. **`GET /sections/:id/timeline` (Line 149)**
   - Checks `teacherHasSectionAccess` which returns `true` for students/parents.
   - **Vulnerability:** Any student or parent can view the activity history log (audit timeline) of any section.

4. **`POST /sections/:id/documents/upload` (Line 202)**
   - Checks `teacherHasSectionAccess` which returns `true` for students/parents.
   - Does **NOT** check for `academic.manage` or admin/teacher role.
   - **Vulnerability:** Any authenticated student or parent can upload files to any section's document folder.

5. **`DELETE /sections/:id/documents/:docId` (Line 284)**
   - Checks `teacherHasSectionAccess` which returns `true` for students/parents.
   - Does **NOT** check for `academic.manage` or admin/teacher role.
   - **Vulnerability:** Any authenticated student or parent can delete documents in any section workspace.

---

## 5. Backend — `programs.routes.ts`

### Security Gaps

1. **`GET /programs` (Line 12)** and **`GET /programs/:id` (Line 21)**
   - No role or permission checks.
   - **Vulnerability:** Any logged-in student or parent can view all courses/programs in the institution. (Low severity as curriculum structures are usually public, but still worth noting).

---

## 6. Backend — `allocations.routes.ts` (Teaching Allocations)

### Security Gaps

1. **`GET /teaching-allocations/load/:teacherId` (Line 49)**
   - No role checks.
   - **Vulnerability:** Any authenticated user can view the workload hours calculation for any teacher.

2. **`GET /teaching-allocations/dashboard` (Line 71)**
   - No role checks.
   - **Vulnerability:** Any student or parent can query the teaching allocations dashboard (conflict counts, overloaded teacher count, unallocated subjects count).

3. **`GET /teaching-allocations/conflicts` (Line 149)**
   - No role checks.
   - **Vulnerability:** Any student or parent can query the list of teaching conflicts (including teacher names, subject names, section names, and detail warnings).

---

## 7. Consolidated Findings

### 🔴 Critical

1. **`POST /sections/:id/documents/upload`** — Any student or parent can upload files to any class section workspace due to `teacherHasSectionAccess` returning `true` for non-teachers.
2. **`DELETE /sections/:id/documents/:docId`** — Any student or parent can delete files from any class section workspace.
3. **`GET /teaching-allocations/conflicts`** — Any student or parent can fetch institutional conflicts and teacher workload analysis logs.

### 🟠 High

4. **`GET /sections`** — Student and parent users fall through `isTeacherOnly` checks and can fetch the directory of all sections in the school.
5. **`GET /sections/:id`** and **`GET /sections/:id/timeline`** — Student and parent users can retrieve detailed rosters, timetables, and audit timelines of any section.
6. **Frontend UI buttons in `Classes.tsx` and `SectionWorkspace.tsx`** — Completely unguarded. Action buttons (Add, Edit, Archive, Settings) are visible to HODs and Teachers who do not have permissions, leading to silent API failures (403).

---

## 8. Recommended Fixes

### Fix 1: Restrict document uploads/deletions on sections
Ensure only Admins, Principals, or assigned Class Teachers can upload/delete documents:
```ts
// sections.routes.ts
sections.post('/:id/documents/upload', requirePermission('academic.manage'), async (c) => { ... });
sections.delete('/:id/documents/:docId', requirePermission('academic.manage'), async (c) => { ... });
```
*(Or add a specific check that verifies the user is either an Admin or the class teacher of that section).*

### Fix 2: Restrict GET sections endpoints from students/parents
Restructure read endpoints to block students/parents or limit them to their own enrolled section:
```ts
// Check roles
const roles = user.roles || [];
const isStaff = roles.some(r => ['admin', 'super_admin', 'Principal', 'HOD', 'Teacher', 'teacher'].includes(r));
if (!isStaff) {
  // Option: fetch student record matching user.sub, and only return their enrolled section
  return c.json({ error: 'Forbidden' }, 403);
}
```

### Fix 3: Gating conflict & load endpoints in allocations routes
```ts
allocations.get('/conflicts', requirePermission('academic.manage'), async (c) => { ... });
allocations.get('/dashboard', requirePermission('academic.manage'), async (c) => { ... });
```
