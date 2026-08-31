# 🔐 Subjects & Curriculum — Complete RBAC Audit Report

> **Scanned Files:**
> - Frontend: `erp-frontend/src/pages/Subjects.tsx`, `SubjectWorkspace.tsx`
> - Backend: `erp-backend/src/modules/subjects/subjects.routes.ts`
> - Routes: `App.tsx` lines 132–133, `config/roleNav.ts` lines 37–38
>
> Date: 2026-07-18

---

## 1. Route Guard Analysis (`App.tsx` + `roleNav.ts`)

### `/subjects` — Subjects Directory

| Property | Value |
|---|---|
| `allowedRoles` | `['admin', 'super_admin', 'Principal', 'HOD']` |
| Route policy permissions | `['academic.manage']` |
| ProtectedRoute applied | ✅ |

✅ **Good.** Restricted to academic managers and admins.

### `/subjects/:id` — Subject Workspace

| Property | Value |
|---|---|
| `allowedRoles` | `['admin', 'super_admin', 'Principal', 'HOD', 'Teacher']` |
| Route policy permissions | `['academic.manage']` |
| ProtectedRoute applied | ✅ |

> [!WARNING]
> Mismatch between `allowedRoles` (which includes `Teacher`) and `routePolicy.permissions` (which is `['academic.manage']`).
> Because `accessControl.ts` resolves path authorization with `roleAllowed || permissionAllowed` (OR logic), Teachers bypass the permission guard and can open the subject workspace.

---

## 2. Frontend — `Subjects.tsx` (Directory Page)

### UI Gaps
- Gating uses `isAdminOrHOD` which checks `['admin', 'super_admin', 'Principal', 'HOD', 'Super Admin']`.
- While correct, it uses a raw role check instead of checking `academic.manage` permission.

---

## 3. Frontend — `SubjectWorkspace.tsx` (Subject Workspace Page)

This page is accessible to Teachers.

### UI Gaps
- **Absolutely no role or permission checks in the code.**
- A Teacher visiting the workspace sees all control buttons:
  - **"Subject Settings"** (modifies code, name, weekly hours, theory/lab, elective option).
  - **"Add Lesson Plan Topic"**
  - **"Upload Resource File"**
  - **"Create Exam / Test"**
- **Status:** Mismatch. If a Teacher clicks these buttons and submits, the backend returns a `403 Forbidden` because these operations require the `academic.manage` permission. Showing these buttons to Teachers is confusing.

---

## 4. Backend — `subjects.routes.ts`

### Critical Security Gaps (Privilege Escalation for Student/Parent)

Hono routes are protected globally by `authMiddleware` (valid JWT check), but they do not enforce roles on read endpoints:

1. **`GET /subjects/` (Line 14)**
   - Checks `isTeacherOnly(user)`. If true, filters subjects by teaching assignment.
   - For **Students** and **Parents/Guardians**, `isTeacherOnly` returns `false` (their roles are not Teacher).
   - **Vulnerability:** They fall through to the non-teacher list branch and receive the list of **all subjects** in the institution.

2. **`GET /subjects/:id` (Line 62)**
   - Checks `teacherHasSubjectAccess`.
   - `teacherHasSubjectAccess` returns `true` immediately for any non-teacher role (e.g., student, parent, accountant).
   - **Vulnerability:** Any student or parent can view the complete details of any subject.

3. **`GET /subjects/:id/teaching` (Line 140)**
   - Checks `teacherHasSubjectAccess` which returns `true` for students/parents.
   - **Vulnerability:** Any student or parent can fetch the faculty instructors mapped to any subject (including employee ID details).

4. **`GET /subjects/:id/students` (Line 174)**
   - Checks `teacherHasSubjectAccess` which returns `true` for students/parents.
   - **Vulnerability:** Any student or parent can fetch the complete list of students enrolled in any subject section along with their **attendance rate and grades**.

5. **`GET /subjects/:id/timeline` (Line 521)**
   - Does **NOT** check `teacherHasSubjectAccess`.
   - **Vulnerability:** Any user (including any student or parent) can fetch the complete audit logs of any subject.

6. **`POST /subjects/:id/documents/upload` (Line 409)**
   - Checks `teacherHasSubjectAccess` which returns `true` for students/parents.
   - Does **NOT** check for `academic.manage` or admin/teacher role.
   - **Vulnerability:** Any student or parent can upload files to any subject's resource folder.

7. **`DELETE /subjects/:id/documents/:docId` (Line 489)**
   - Checks `teacherHasSubjectAccess` which returns `true` for students/parents.
   - Does **NOT** check for `academic.manage` or admin/teacher role.
   - **Vulnerability:** Any student or parent can delete resources for any subject.

---

## 5. Backend — Business Logic Gaps (Teacher Lockout)

1. **Lesson Plan Management Gaps:**
   - `POST /:id/lesson-plan` (Line 270)
   - `PATCH /:id/lesson-plan/:topicId` (Line 296)
   - `DELETE /:id/lesson-plan/:topicId` (Line 320)
   - **Gap:** All three endpoints require `academic.manage` permission. Teachers do not have this permission. Therefore, **teachers cannot manage lesson plans** for the subjects they teach.
   - Additionally, `PATCH` and `DELETE` endpoints do **NOT** check `teacherHasSubjectAccess`. Any user with `academic.manage` can modify any lesson plan even if they don't teach that subject.

2. **Assessment Management Gaps:**
   - `POST /:id/assessments` (Line 354)
   - `DELETE /:id/assessments/:assessmentId` (Line 380)
   - **Gap:** Both endpoints require `academic.manage` permission. Therefore, **teachers cannot create or delete exams/assessments** for their own subjects.

---

## 6. Consolidated Findings

### 🔴 Critical

1. **`GET /subjects/:id/students`** — Any student or parent can fetch the student directory, attendance stats, and exam marks for any subject.
2. **`POST /subjects/:id/documents/upload`** and **`DELETE /subjects/:id/documents/:docId`** — Any student or parent can upload or delete curriculum files/study resources in any subject workspace.
3. **Teacher Lockout on Lesson Plans & Assessments** — Teachers get `403 Forbidden` on lesson plan updates and assessment creations because the backend requires `academic.manage` permission, which is only assigned to HODs and Admins.

### 🟠 High

4. **`GET /subjects`** — Student and parent users fall through `isTeacherOnly` checks and can fetch the list of all subjects in the school.
5. **`GET /subjects/:id`** and **`GET /subjects/:id/teaching`** — Student and parent users can retrieve subject profiles and faculty lists.
6. **`GET /subjects/:id/timeline`** — Any user can fetch the audit timeline of any subject.
7. **Frontend UI buttons in `SubjectWorkspace.tsx`** — Completely unguarded. Action buttons (Add Topic, Upload Resource, Create Exam) are visible to Teachers who do not have permissions, leading to silent API failures.

---

## 7. Recommended Fixes

### Fix 1: Add checks to read endpoints
Ensure Students and Parents/Guardians cannot read details, teaching staff, timeline, or student metrics of other subjects:
```ts
// Check roles
const roles = user.roles || [];
const isStaff = roles.some(r => ['admin', 'super_admin', 'Principal', 'HOD', 'Teacher', 'teacher'].includes(r));
if (!isStaff) {
  return c.json({ error: 'Forbidden' }, 403);
}
```

### Fix 2: Allow Teachers to manage lesson plans and assessments
Modify the backend middlewares on lesson-plan and assessment routes so that a user is allowed if they have `academic.manage` OR they are the assigned teacher for that subject:
```ts
// Example check function
async function canManageSubject(c: Context, subjectId: string): Promise<boolean> {
  const user = c.get('user');
  const userRoles = user.roles || [];
  if (userRoles.includes('super_admin') || userRoles.includes('admin') || userRoles.includes('Principal') || userRoles.includes('HOD')) {
    return true; // Privileged roles can manage
  }
  // Check if they are the teacher assigned to this subject
  return await teacherHasSubjectAccess(c.env.DB, user, subjectId);
}
```
Replace `requirePermission('academic.manage')` on these specific routes with a custom handler using the above logic.
