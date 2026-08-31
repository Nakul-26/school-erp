# 🔐 Exams, Marks & Results — Complete RBAC Audit Report

> **Scanned Files:**
> - Frontend: `erp-frontend/src/pages/Exams.tsx`
> - Backend: `erp-backend/src/modules/exams/exams.routes.ts`, `grades/grades.routes.ts`
> - Routes: `App.tsx` line 148, `config/roleNav.ts` line 45
>
> Date: 2026-07-18

---

## 1. Route Guard Analysis (`App.tsx` + `roleNav.ts`)

### `/exams` — Exams Configuration & Grading Workspace

| Property | Value |
|---|---|
| `allowedRoles` | `['admin', 'super_admin', 'Principal', 'HOD', 'Teacher']` |
| Route policy permissions | ❌ None |
| ProtectedRoute applied | ✅ |

> [!WARNING]
> Since the route guard allows `Teacher` role, any teacher can access `/exams`. However, there are no inline role or permission checks in the page itself, allowing teachers to see administrative features.

---

## 2. Frontend — `Exams.tsx`

### UI Gaps

- **No granular UI permission checks.** There is no use of `hasAnyPermission` or `isAdmin` to hide action buttons.
- Any user who is allowed through the route guard (including HODs and Teachers) sees all controls:
  - **"Add Exam Event"** button.
  - **"Status"** selector (Draft, Published, Completed) next to every exam, allowing them to attempt status updates.
  - **"Delete" (trash) icon button** to delete exam events.
  - **"Add Subject to Exam"** button (in subjects sub-view).
  - **"Remove Subject" (trash) icon** next to exam subjects.
  - **"Save Marks"** button (in marksheet editor).
- **Status:** Mismatch. Teachers get `403 Forbidden` on backend operations they aren't assigned to, but they can still see and interact with these controls on the UI.

---

## 3. Backend — `exams.routes.ts`

### Critical Security Gaps (Privilege Escalation for Student/Parent)

Hono routes are protected globally by `authMiddleware` (valid JWT check), but they do not enforce roles on read/write endpoints:

1. **`GET /exams` (Line 25)**
   - Checks `isTeacherOnly(user)`. If true, filters by teaching assignments.
   - For **Students** and **Parents/Guardians**, `isTeacherOnly` returns `false` (their roles are not Teacher).
   - **Vulnerability:** They fall through to the general list branch and receive all scheduled exams in the institution (including draft/unpublished events).

2. **`GET /exams/:id/results` (Line 398)**
   - Checks `teacherCanAccessExam`.
   - `teacherCanAccessExam` returns `true` immediately for any non-teacher role (e.g., student, parent, accountant).
   - **Vulnerability:** Any student or parent can retrieve the complete results sheet of all students in the cohort (including marks obtained in each subject, pass/fail status, average percentages, and teacher remarks).

3. **`GET /exams/subjects/:id/marks` (Line 296)**
   - Checks `teacherCanAccessExamSubject` which returns `true` for non-teachers.
   - **Vulnerability:** Any student or parent can view the mark entries for all students in that subject paper.

4. **`POST /exams/subjects/:id/marks` (Line 326)**
   - Checks `teacherCanAccessExamSubject` and `teacherCanAccessStudent` which return `true` for non-teachers.
   - **Vulnerability:** Any student or parent can upload/mark exam scores for any class subject paper.

5. **`POST /exams/:id/subjects` (Line 240)** and **`DELETE /exams/subjects/:id` (Line 270)**
   - Checks `teacherHasSubjectAccess` which returns `true` for non-teachers.
   - **Vulnerability:** Any student or parent can add subjects to or remove subjects from exam events.

---

## 4. Backend — `grades.routes.ts`

### Critical Security Gaps (Student PII Leakage)

1. **`GET /grades/report-card/:examId/:studentId` (Line 50)**
   - Checks `teacherCanAccessExam` and `teacherCanAccessStudent` which return `true` for non-teachers.
   - **Vulnerability:** Any authenticated student or parent can retrieve the completed report card (including all subjects, marks, rank, GPA, and grades) of any student in the school.

2. **`GET /grades/report-card/:examId` (Line 118)**
   - Checks `teacherCanAccessExam` which returns `true` for non-teachers.
   - **Vulnerability:** Any authenticated student or parent can download report cards of all students in the exam cohort.

---

## 5. Consolidated Findings

### 🔴 Critical

1. **`POST /exams/subjects/:id/marks`** — Any student or parent can submit and save exam marks for any subject paper.
2. **`GET /exams/:id/results`** — Any student or parent can download classmate marks and percentages.
3. **`GET /grades/report-card/:examId/:studentId`** — Any student or parent can retrieve report cards of other students.
4. **`POST /exams/:id/subjects`** and **`DELETE /exams/subjects/:id`** — Any student or parent can add or delete subjects configured under exam events.

### 🟠 High

5. **`GET /exams`** — Low-privileged users (students/parents) fall through teacher constraints and can view the directory of all scheduled exams (including draft/unpublished events).
6. **Frontend UI buttons in `Exams.tsx`** — Action buttons are shown to users even if they lack authorization for specific classes or subjects, leading to 403 API errors.

---

## 6. Recommended Fixes

### Fix 1: Restrict Exams & Grades routes to Staff
Update `exams.routes.ts` and `grades.routes.ts` endpoints to ensure students and parents are blocked:
```ts
// Add a middleware check or inline check:
const roles = user.roles || [];
const isStaff = roles.some(r => ['admin', 'super_admin', 'Principal', 'HOD', 'Teacher', 'teacher'].includes(r));
if (!isStaff) {
  return c.json({ error: 'Forbidden' }, 403);
}
```

### Fix 2: Self-scoping for Student/Parent Results
Allow students and parents to only read results that match their own `studentId` or their registered children's `studentId` (already implemented in `GET /students/:studentId/results` and `GET /students/:studentId/exams/:examId/result`, but the `/report-card` endpoints need similar guards).
```ts
// grades.routes.ts
const isStudent = userRoles.includes('student') || userRoles.includes('Student');
const isParent = userRoles.includes('parent') || userRoles.includes('Parent');

if (isStudent && studentId !== user.sub) {
  // Option: map user.sub to student.id and verify they match
  return c.json({ error: 'Forbidden' }, 403);
}
```
Cwd:
