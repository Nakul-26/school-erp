# 🔐 Leave Management — Complete RBAC Audit Report

> **Scanned Files:**
> - Frontend: `erp-frontend/src/pages/LeaveTypes.tsx`, `MyLeaveApplications.tsx`, `LeaveApprovals.tsx`, `StudentLeaveApprovals.tsx`
> - Backend: `erp-backend/src/modules/leave/leave.routes.ts`, `student-leaves/student-leaves.routes.ts`
> - Routes: `App.tsx` lines 168–171, `config/roleNav.ts` lines 50–53
>
> Date: 2026-07-18

---

## 1. Route Guard Analysis (`App.tsx` + `roleNav.ts`)

The leave module is split across multiple pages:

| Path | Purpose | Allowed Roles | ProtectedRoute applied | Status |
|---|---|---|---|---|
| `/leave/types` | Configure leave templates | `['admin', 'super_admin', 'Principal', 'HOD']` | ✅ | ✅ Secured |
| `/leave/my` | View balances and submit leave | ❌ None (auth only) | ✅ | ✅ Self-service |
| `/leave/approvals` | Review/approve staff leaves | `['admin', 'super_admin', 'Principal', 'HOD']` | ✅ | ✅ Secured |
| `/student-leaves/approvals` | Review student leaves | `['admin', 'super_admin', 'Principal', 'HOD', 'Teacher']` | ✅ | ✅ Secured |

---

## 2. Frontend Gaps

- **Lack of inline button constraints:** `LeaveTypes.tsx` does not hide mutative buttons. However, since the page route `/leave/types` is protected, this is less risky.
- No role-based filtering on page tabs.

---

## 3. Backend — `leave.routes.ts` (Staff Leaves)

### Security Check Summary

All endpoints are protected by role checks or teacher-scoping filters:

| Method | Endpoint | Guard | Status |
|---|---|---|---|
| GET | `/types` | ❌ None (auth only) | ✅ Low risk (public types) |
| POST | `/types` | `requireRole('admin', 'super_admin', 'Principal', 'HOD')` | ✅ Secured |
| PUT | `/types/:id` | `requireRole('admin', 'super_admin', 'Principal', 'HOD')` | ✅ Secured |
| DELETE | `/types/:id` | `requireRole('admin', 'super_admin', 'Principal', 'HOD')` | ✅ Secured |
| POST | `/balances/seed` | `requireRole('admin', 'super_admin', 'Principal')` | ✅ Secured |
| GET | `/balances` | `requireRole('admin', 'super_admin', 'Principal', 'HOD')` | ✅ Secured |
| GET | `/balances/my` | Teacher self-scope (404 for students/parents) | ✅ Secured |
| POST | `/applications` | Teacher self-scope (404 for students/parents) | ✅ Secured |
| GET | `/applications/my` | Teacher self-scope (404 for students/parents) | ✅ Secured |
| GET | `/applications` | `requireRole('admin', 'super_admin', 'Principal', 'HOD')` | ✅ Secured |
| PATCH | `/applications/:id/approve` | `requireRole('admin', 'super_admin', 'Principal', 'HOD')` | ✅ Secured |
| PATCH | `/applications/:id/reject` | `requireRole('admin', 'super_admin', 'Principal', 'HOD')` | ✅ Secured |

✅ **Good.** Staff leave requests, balances, and configuration modifications are well-protected.

---

## 4. Backend — `student-leaves.routes.ts` (Student Leaves)

### Critical Security Gaps (Self-Approval & Information Leak)

The student leaves module has severe access control gaps:

1. **`PATCH /student-leaves/:id/approve` (Line 47)** and **`PATCH /student-leaves/:id/reject` (Line 63)**
   - No role or permission checks.
   - **Vulnerability:** Any logged-in student or parent can call these patch routes directly if they know or guess a leave ID, allowing them to approve their own or other students' leave requests without staff authorization.

2. **`GET /student-leaves/my/:studentId` (Line 27)**
   - Includes a comment note about security checks: `// Security check: only student or linked parent or teacher/admin can see`.
   - **Vulnerability (Comment but no code):** No actual code validation exists to check user roles or ownership. Any student or parent can retrieve the complete leave application logs of any student in the institution.

3. **`POST /student-leaves` (Line 12)**
   - No role or linkage checks.
   - **Vulnerability:** An authenticated user can submit a student leave request for any student ID in the database.

---

## 5. Consolidated Findings

### 🔴 Critical

1. **`PATCH /student-leaves/:id/approve`** and **`/:id/reject`** — Any student or parent can approve/reject student leave requests.
2. **`GET /student-leaves/my/:studentId`** — Missing ownership and role validation. Any student or parent can view another student's leave logs.

---

## 6. Recommended Fixes

### Fix 1: Restrict student leave approvals to Teachers & Admins
Add a role guard to approval and rejection patch endpoints:
```ts
// student-leaves.routes.ts
studentLeaves.patch('/:id/approve', requireRole('admin', 'super_admin', 'Principal', 'HOD', 'Teacher'), async (c) => { ... });
studentLeaves.patch('/:id/reject', requireRole('admin', 'super_admin', 'Principal', 'HOD', 'Teacher'), async (c) => { ... });
```

### Fix 2: Implement self-scoping validation on student leave list
Verify the student ownership or parent linkage before returning data:
```ts
// student-leaves.routes.ts
studentLeaves.get('/my/:studentId', async (c) => {
  const user = c.get('user');
  const studentId = c.req.param('studentId')!;
  
  const userRoles = user.roles || [];
  const isStudent = userRoles.includes('student');
  const isParent = userRoles.includes('parent');
  const isStaff = userRoles.some(r => ['admin', 'super_admin', 'Principal', 'HOD', 'Teacher'].includes(r));

  if (!isStaff) {
    if (isStudent) {
      const student = await db.prepare('SELECT user_id FROM students WHERE id = ?').bind(studentId).first();
      if (student.user_id !== user.sub) return c.json({ error: 'Forbidden' }, 403);
    }
    if (isParent) {
      const linkage = await db.prepare('SELECT 1 FROM guardians WHERE user_id = ? AND student_id = ? AND is_active = 1').bind(user.sub, studentId).first();
      if (!linkage) return c.json({ error: 'Forbidden' }, 403);
    }
  }
  // ...
});
```
Cwd:
