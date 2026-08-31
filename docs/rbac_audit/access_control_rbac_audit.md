# 🔐 Access Control & User Roles — Complete RBAC Audit Report

> **Scanned Files:**
> - Frontend: `erp-frontend/src/pages/ManageUsers.tsx`
> - Backend: `erp-backend/src/modules/roles/roles.routes.ts`, `users/users.routes.ts`
> - Routes: `App.tsx` line 184, `config/roleNav.ts` line 48
>
> Date: 2026-07-18

---

## 1. Route Guard Analysis (`App.tsx` + `roleNav.ts`)

### `/access-control` — Access Control / Manage Users Route

| Property | Value |
|---|---|
| `allowedRoles` | `['admin', 'super_admin', 'Principal']` |
| Route policy permissions | ❌ None |
| ProtectedRoute applied | ✅ |

✅ **Good.** Access is strictly restricted to administrative roles on the frontend.

---

## 2. Frontend — `ManageUsers.tsx`

### UI Gaps
- **Administrative actions visibility:** The workspace contains controls for:
  - Creating new roles.
  - Deleting roles.
  - Adding/modifying users.
  - Re-linking user roles.
  - Modifying role permissions templates.
- **Status:** The UI relies entirely on the `/access-control` route guard to restrict entry. If a user bypasses the route guard, they get full access to these buttons. However, mutate API requests are guarded on the backend by permission checks.

---

## 3. Backend — `roles.routes.ts` (Roles & Permissions Matrix)

### Security Check Summary

All endpoints in `roles.routes.ts` require the `user.manage` permission:

| Method | Endpoint | Role/Permission Guard | Status |
|---|---|---|---|
| GET | `/` | `requirePermission('user.manage')` | ✅ Secured |
| GET | `/permissions` | `requirePermission('user.manage')` | ✅ Secured |
| GET | `/matrix` | `requirePermission('user.manage')` | ✅ Secured |
| POST | `/` | `requirePermission('user.manage')` | ✅ Secured |
| PUT | `/:id` | `requirePermission('user.manage')` | ✅ Secured |
| PUT | `/:id/permissions` | `requirePermission('user.manage')` | ✅ Secured |
| POST | `/:id/duplicate` | `requirePermission('user.manage')` | ✅ Secured |
| DELETE | `/:id` | `requirePermission('user.manage')` | ✅ Secured |

✅ **Good.** The roles module is properly protected.

---

## 4. Backend — `users.routes.ts` (Users Module)

### 🚨 Critical Vulnerability (Self-Privilege Escalation via `PUT /users/:id`)

 Hono routes under `users.routes.ts` have a critical permission checking logic flaw:

1. **`PUT /users/:id` (Line 90)**
   - Allows users to update user profiles if the requesting user has the `user.manage` permission OR if the requested user ID matches their own user ID (`isSelf = true`):
     ```ts
     const isSelf = targetUser.id === user.sub;
     if (!isSelf && !(hasUserManage && isSameInst)) {
       return c.json({ error: 'Unauthorized' }, 403);
     }
     ```
   - Passes the payload directly to the user service:
     ```ts
     await service.updateUser(id, input, user.sub);
     ```
   - Inside `UserRepository.update` (line 106), it calls:
     ```ts
     await this.updateUserRoles(id, input.roles);
     ```
   - **Vulnerability:** Any authenticated student, parent, teacher, or other low-privileged user can issue a `PUT /users/MY_USER_ID` request with `roles: ['super_admin']` or `roles: ['admin']` in the body payload. The backend will process this update and grant them administrative roles.

---

## 5. Consolidated Findings

### 🔴 Critical

1. **Self-Privilege Escalation (`PUT /users/:id`)** — Any logged-in user can elevate their own privileges to `super_admin` or `admin` by updating their own account payload.

---

## 6. Recommended Fixes

### Fix 1: Filter roles updates in `PUT /users/:id`
Enforce that only administrators with `user.manage` permission can modify roles:
```ts
// users.routes.ts
// PUT /:id
const isSelf = targetUser.id === user.sub;
const userPermissions = await repo.getUserPermissions(user.sub);
const hasUserManage = userPermissions.includes('user.manage');
const isSameInst = targetUser.institution_id === user.institution_id;

if (!isSelf && !(hasUserManage && isSameInst)) {
  return c.json({ error: 'Unauthorized' }, 403);
}

// CRITICAL FIX: If self-updating, strip out roles modification
const payload = { ...input };
if (isSelf && !hasUserManage) {
  delete payload.roles;
}

await service.updateUser(id, payload, user.sub);
```
Cwd:
