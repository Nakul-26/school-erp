# 🔐 Teachers Module — Complete RBAC Audit Report

> **Scanned Files:**
> - Frontend: `erp-frontend/src/pages/Teachers.tsx`, `TeacherDetails.tsx`, `teachers/components/TeacherCard.tsx`, `teachers/components/TeachersTable.tsx`
> - Backend: `erp-backend/src/modules/teachers/teachers.routes.ts`, `payroll/payroll.routes.ts`, `leave/leave.routes.ts`
> - Routes: `App.tsx` lines 108–109, `config/roleNav.ts` lines 28–29
>
> Date: 2026-07-18

---

## 1. Route Guard Analysis (`App.tsx` + `roleNav.ts`)

### `/teachers` — Teachers List

| Property | Value |
|---|---|
| `allowedRoles` | `['admin', 'super_admin', 'Principal', 'HOD']` |
| `allowedPermissions` | `['teacher.view']` |
| ProtectedRoute applied | ✅ |

✅ **Good.** Teacher list is correctly restricted to admin-tier and HOD roles only. Students and parents cannot access it.

### `/teachers/:id` — Teacher Detail Workspace

| Property | Value |
|---|---|
| `allowedRoles` | `['admin', 'super_admin', 'Principal', 'HOD', 'Teacher', 'teacher']` |
| `allowedPermissions` | `['teacher.view']` |
| ProtectedRoute applied | ✅ |
| Teacher self-access guard | ✅ (TeacherDetails.tsx line 454) |

✅ **Good.** A teacher user accessing `/teachers/:id` for another teacher's ID is blocked by in-component check:
```tsx
if (isTeacherRole && teacher.user_id !== user?.id) {
  return <Unauthorized />;
}
```

> **NOTE:** This check is frontend-only. The backend does NOT enforce this restriction — see gap #6.

---

## 2. `Teachers.tsx` (List Page) — Frontend RBAC

### Permission Declarations

```tsx
const canViewTeacher   = hasAnyPermission(userPermissions, ['teacher.view']);
const canCreateTeacher = hasAnyPermission(userPermissions, ['teacher.create']);
const canEditTeacher   = hasAnyPermission(userPermissions, ['teacher.edit']);
const canDeleteTeacher = hasAnyPermission(userPermissions, ['teacher.delete']);
```

### Action Handlers

| Action | Handler Guard | UI Guard | Status |
|---|---|---|---|
| Add Teacher | `canCreateTeacher` ✅ | Button hidden ✅ | ✅ |
| Import Excel | No handler guard | Button behind `canCreateTeacher` ✅ | ✅ |
| Edit Teacher | `canEditTeacher` ✅ | Passed as prop ✅ | ✅ |
| Delete Teacher | `canDeleteTeacher` ✅ | Passed as prop ✅ | ✅ |
| Deactivate Teacher | `canEditTeacher` ✅ | `canEditTeacher && showDeactivateBtn` ✅ | ✅ |
| Reactivate Teacher | `canEditTeacher` ✅ | `canEditTeacher && showReactivateBtn` ✅ | ✅ |
| Bulk Assign Dept | `canEditTeacher` ✅ | `canEditTeacher` ✅ | ✅ |
| Bulk Deactivate | `canEditTeacher` ✅ | `canEditTeacher && showDeactivateBtn` ✅ | ✅ |
| Bulk Delete | `canDeleteTeacher` ✅ | `canDeleteTeacher` ✅ | ✅ |
| **Bulk Export (CSV/Excel)** | **None** | **None** | ⚠️ GAP |
| Add Assignment (EditModal) | `canEditTeacher` ✅ | — | ✅ |
| Remove Assignment (EditModal) | `canEditTeacher` ✅ | — | ✅ |

---

## 3. `TeacherDetails.tsx` (Workspace) — Frontend RBAC

### Permission Setup

```tsx
const isAdmin = roles.some(r => ['admin', 'super_admin', 'Principal', 'Super Admin'].includes(r));
// No canEditTeacher / canDeleteTeacher — only raw role check
```

> **WARNING:** `TeacherDetails.tsx` uses only a raw role check (`isAdmin`) instead of `hasAnyPermission()`. This is inconsistent with `Teachers.tsx` which uses granular permission checks.

### Header Action Buttons (Line 578–590)

| Button | Permission Check | Status |
|---|---|---|
| **Change Status** | **None** | 🔴 CRITICAL |
| **Link User Login** | **None** | 🔴 CRITICAL |
| **Edit Profile** | **None** | 🔴 CRITICAL |

All three are visible to ALL users who can reach the page — including Teacher role users on their own profile.

### Tab Contents — RBAC Analysis

| Tab | Action Buttons | Permission Check | Status |
|---|---|---|---|
| `overview` | Edit Profile (modal), Provision Login | None | 🔴 CRITICAL |
| `subjects` | Navigate to academic-setup | Low risk | ✅ |
| `classes` | Navigate to academic-setup | Low risk | ✅ |
| `timetable` | None | — | ✅ |
| `workload` | None | — | ✅ |
| `leave` | Apply Leave button | None | ⚠️ GAP |
| `payroll` | Configure (isAdmin gated) | Partial ⚠️ | Salary data visible to all |
| `documents` | Upload, Delete, Download | None | 🔴 HIGH |
| `timeline` | Add Event Log | None | ⚠️ GAP |

---

## 4. Backend — `teachers.routes.ts`

| Method | Endpoint | Role Guard | Institution Check | Status |
|---|---|---|---|---|
| GET | `/` | ❌ None | `institution_id` ✅ | 🟠 HIGH |
| GET | `/reports/workload` | ❌ None | `institution_id` ✅ | 🟠 HIGH |
| GET | `/:id` | ❌ None | `institution_id` check ✅ | 🟡 Medium |
| POST | `/` | `requireRole('admin', 'super_admin')` ✅ | ✅ | ✅ |
| PUT | `/:id` | `requireRole('admin', 'super_admin')` — **missing Principal** | ✅ | 🟠 HIGH |
| DELETE | `/:id` | `requireRole('admin', 'super_admin')` ✅ | ✅ | ✅ |
| POST | `/bulk-action` | `requireRole('admin', 'super_admin')` ✅ | ✅ | ✅ |
| GET | `/:id/notes` | ❌ None | `institution_id` ✅ | 🟡 Medium |
| POST | `/:id/notes` | ❌ None | `institution_id` ✅ | 🟠 HIGH |
| DELETE | `/:id/notes/:noteId` | ❌ None | `institution_id` ✅ | 🟠 HIGH |
| GET | `/:id/documents` | ❌ None | `institution_id` ✅ | 🟡 Medium |
| POST | `/:id/documents/upload` | ❌ None | `institution_id` ✅ | 🔴 CRITICAL |
| GET | `/:id/documents/:docId/download` | ❌ None | `institution_id` ✅ | 🟡 Medium |
| DELETE | `/:id/documents/:docId` | ❌ None | `institution_id` ✅ | 🔴 CRITICAL |

---

## 5. Backend — `payroll.routes.ts`

| Method | Endpoint | Role Guard | Institution Check | Status |
|---|---|---|---|---|
| GET | `/salary-structures` | `requireRole(admin, super_admin, Principal)` ✅ | ✅ | ✅ |
| POST | `/salary-structures` | `requireRole(admin, super_admin, Principal)` ✅ | ✅ | ✅ |
| **GET** | **`/salary-structures/:teacherId`** | **None** | **None** | 🔴 CRITICAL |
| DELETE | `/salary-structures/:teacherId` | `requireRole(admin, super_admin, Principal)` ✅ | ✅ | ✅ |
| **GET** | **`/teacher/:teacherId/payslips`** | **None** | **None** | 🔴 CRITICAL |
| GET | `/runs` | `requireRole(admin, super_admin, Principal)` ✅ | ✅ | ✅ |
| POST | `/runs` | `requireRole(admin, super_admin, Principal)` ✅ | ✅ | ✅ |
| GET | `/runs/:id` | `requireRole(admin, super_admin, Principal)` ✅ | ✅ | ✅ |
| PATCH | `/runs/:id/finalize` | `requireRole(admin, super_admin, Principal)` ✅ | ✅ | ✅ |
| DELETE | `/runs/:id` | `requireRole(admin, super_admin, Principal)` ✅ | ✅ | ✅ |

---

## 6. Backend — `leave.routes.ts`

| Method | Endpoint | Role Guard | Status |
|---|---|---|---|
| GET | `/types` | None (auth only) | ✅ read-only low risk |
| POST | `/types` | `requireRole(admin, super_admin, Principal, HOD)` ✅ | ✅ |
| POST | `/balances/seed` | `requireRole(admin, super_admin, Principal)` ✅ | ✅ |
| GET | `/balances` | `requireRole(admin, super_admin, Principal, HOD)` ✅ | ✅ |
| GET | `/balances/my` | Auth + self-scoped via `user.sub` ✅ | ✅ |
| **POST** | **`/applications`** | **Auth only — no teacher role check** | ⚠️ GAP |
| GET | `/applications` | `requireRole(admin, super_admin, Principal, HOD)` ✅ | ✅ |
| PATCH | `/applications/:id/approve` | `requireRole(admin, super_admin, Principal, HOD)` ✅ | ✅ |
| PATCH | `/applications/:id/reject` | `requireRole(admin, super_admin, Principal, HOD)` ✅ | ✅ |

> **Leave POST Note:** `POST /applications` resolves `teacher_id` from `user.sub` — so self-scoped correctly. However, an admin can call this and it creates leave for the admin's own teacher profile (if any), not the teacher being viewed on the frontend. This is a UI/logic bug, not a privilege escalation.

---

## 7. Consolidated Findings

### 🔴 Critical

1. **`GET /payroll/salary-structures/:teacherId`** — No role guard, no institution check. Any user (student, parent) can read any teacher's full salary breakdown.

2. **`GET /payroll/teacher/:teacherId/payslips`** — No role guard, no institution check. Payslip history is accessible to any authenticated user.

3. **`POST /teachers/:id/documents/upload`** — No role guard. Any user can upload files to teacher HR document store.

4. **`DELETE /teachers/:id/documents/:docId`** — No role guard. Any user can delete teacher HR documents.

5. **`TeacherDetails.tsx` Header Buttons** — "Change Status", "Edit Profile", "Link User Login" lack all permission checks. Teacher role users can edit their own profiles and change their own status.

### 🟠 High

6. **`GET /teachers/`** — No backend role restriction. Any authenticated user (student, parent) can call the API to list all teachers with PII.

7. **`GET /teachers/reports/workload`** — No role restriction. Workload report accessible to all.

8. **`PUT /teachers/:id` missing `Principal` role** — Backend blocks Principals who are allowed by the frontend route guard.

9. **`POST /:id/notes`** — No role restriction. Any user can write notes on teacher profiles.

10. **`DELETE /:id/notes/:noteId`** — No role restriction. Any user can delete notes.

### 🟡 Medium

11. **Documents Tab** — Upload/Delete buttons have no permission check in frontend.

12. **`GET /teachers/:id`** — No role restriction on backend (though institution check exists). Teachers should be viewable by admin-tier + self only.

13. **Payroll tab salary data** — HODs (who can access `/teachers/:id`) see salary structure data with no payroll permission check.

14. **Leave tab "Apply Leave"** — Shows to all roles with no permission guard on the button.

15. **Bulk Export (CSV/Excel)** — No permission check; any user who can select teachers can export PII.

### ✅ What's Working Well

- `/teachers` route guard correctly blocks students and parents at the frontend routing level
- Teacher self-profile cross-access correctly blocked in TeacherDetails.tsx (line 454)
- `POST /teachers`, `PUT /teachers/:id`, `DELETE /teachers/:id` correctly have `requireRole` guards
- `POST /teachers/bulk-action` is admin-restricted
- Leave management endpoints (approve/reject) correctly require admin/HOD roles
- All DB queries properly use `institution_id` scoping

---

## 8. Recommended Fixes

### Fix 1 — Payroll salary/payslip GET endpoints

```ts
// Add requireRole + teacher self-ownership check
payroll.get('/salary-structures/:teacherId', requireRole('admin', 'super_admin', 'Principal', 'Teacher'), async (c) => {
  const user = c.get('user');
  const teacherId = c.req.param('teacherId')!;
  const isTeacher = (user.roles || []).some(r => ['Teacher', 'teacher'].includes(r));
  if (isTeacher) {
    const mine = await c.env.DB.prepare(
      'SELECT id FROM teachers WHERE user_id = ? AND institution_id = ? AND is_active = 1'
    ).bind(user.sub, user.institution_id).first<{ id: string }>();
    if (!mine || mine.id !== teacherId) return c.json({ error: 'Forbidden' }, 403);
  }
  // Also add institution check for admin paths
  // ...
});
// Same pattern for /teacher/:teacherId/payslips
```

### Fix 2 — Teachers list GET

```ts
teachers.get('/', requireRole('admin', 'super_admin', 'Principal', 'HOD'), async (c) => { ... });
```

### Fix 3 — Documents upload/delete

```ts
teachers.post('/:id/documents/upload', requireRole('admin', 'super_admin', 'Principal'), async (c) => { ... });
teachers.delete('/:id/documents/:docId', requireRole('admin', 'super_admin', 'Principal'), async (c) => { ... });
```

### Fix 4 — PUT teacher missing Principal role

```ts
teachers.put('/:id', requireRole('admin', 'super_admin', 'Principal'), async (c) => { ... });
```

### Fix 5 — TeacherDetails header buttons

```tsx
const userPermissions = user?.permissions || [];
const canEdit = hasAnyPermission(userPermissions, ['teacher.edit']) || isAdmin;
const canManageLogin = hasAnyPermission(userPermissions, ['teacher.create']) || isAdmin;

{canEdit && <button onClick={handleToggleStatus}>Change Status</button>}
{canManageLogin && !teacher.user_id && <button onClick={() => setShowLoginModal(true)}>Link User Login</button>}
{canEdit && <button onClick={() => setShowEditModal(true)}>Edit Profile</button>}
```
