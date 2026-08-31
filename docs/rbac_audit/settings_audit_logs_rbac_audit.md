# 🔐 Settings & Audit Logs — Complete RBAC Audit Report

> **Scanned Files:**
> - Frontend: `erp-frontend/src/pages/SystemSettings.tsx`, `GradeSettings.tsx`, `AuditLogs.tsx`, `InstitutionSetup.tsx`, `SchoolSetup.tsx`
> - Backend: `erp-backend/src/modules/audit-logs/audit-logs.routes.ts`, `system/system.routes.ts`, `system-settings/settings.routes.ts`, `institutions/institutions.routes.ts`, `grades/grades.routes.ts`
> - Routes: `App.tsx` lines 185–189, `config/roleNav.ts` lines 58–62
>
> Date: 2026-07-18

---

## 1. Route Guard Analysis (`App.tsx` + `roleNav.ts`)

| Path | Purpose | Allowed Roles / Permissions | ProtectedRoute applied | Status |
|---|---|---|---|---|
| `/settings` | System settings configuration | `allowedRoles=['admin','super_admin','Principal']` + `allowedPermissions=['institution.manage']` | ✅ | ✅ Secured |
| `/settings/grades` | Grade scales configuration | `allowedRoles=['admin','super_admin','Principal']` + `allowedPermissions=['institution.manage']` | ✅ | ✅ Secured |
| `/audit-logs` | Security history & audit trails | `allowedRoles=['admin','super_admin','Principal']` + `allowedPermissions=['audit.view']` | ✅ | ✅ Secured |
| `/institution-setup` | Core school contact/type profile | `allowedRoles=['admin','super_admin','Principal']` | ✅ | ✅ Secured |
| `/setup` | Setup Hub dashboard | `allowedRoles=['admin','super_admin','Principal','HOD']` | ✅ | ✅ Secured |

---

## 2. Frontend Gaps

- **`SchoolSetup.tsx`** correctly hides the links `/users`, `/institution-setup`, `/settings`, and `/audit-logs` for non-admins (e.g. HODs).
- **`SystemSettings.tsx`** hides database backup/restore sections under tabs and shows permission checks.

---

## 3. Backend Audit

### 3.1. Audit Logs Module (`audit-logs.routes.ts`)
All endpoints are restricted:
- **`GET /`** is protected with:
  ```ts
  auditLogs.get('/', requireRole('admin', 'super_admin', 'Principal'), async (c) => { ... });
  ```
✅ **Good.** Audit history cannot be read by students, parents, teachers, or general staff.

### 3.2. Institution Module (`institutions.routes.ts`)
- **`GET /`** (list all tenants) is restricted to `super_admin`.
- **`POST /`** (create a new school tenant) is restricted to `super_admin`.
- **`PUT /:id`** (update tenant profile) checks `isSuperAdmin || (hasInstManage && id === user.institution_id)`.
- **`GET /:id`** (read tenant profile) checks:
  ```ts
  if (!isSuperAdmin && id !== user.institution_id) {
    return c.json({ error: 'Institution not found' }, 404);
  }
  ```
  *Note:* There is no role restriction on reading own institution profile details, which allows teachers/students/parents to fetch basic metadata (like name/logo) for branding. This is low risk.

### 3.3. System Configurations (`system.routes.ts` + `settings.routes.ts`)
- **`GET /system/settings`** and **`GET /system-settings`** are open to all authenticated users. This is necessary for students, parents, and teachers to load institution configurations (such as passing percentages, attendance thresholds, and school name/logo).
- **`POST /system/settings`** and **`POST /system/settings/logo`** require `requireRole('admin', 'super_admin', 'Principal')`.
- **`POST /system-settings`** requires `requirePermission('institution.manage')`.
- **`GET /backup/export`** and **`POST /backup/restore`** (database backup and restore commands) require `requireRole('admin', 'super_admin', 'Principal')`.
- **`POST /imports/students`** requires `requireRole('admin', 'super_admin', 'Principal')`.

✅ **Good.** Configurations, backups, and restores are well-protected.

---

## 4. Consolidated Findings

### 🟢 Status: SECURE
The settings, institution configuration, grading matrices, and audit logs are fully protected on both the frontend route guards and backend controllers. Role restrictions (`requireRole`) and permission checks (`requirePermission`) are consistently applied to all write/mutation endpoints.
Cwd:
