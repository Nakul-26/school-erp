# 🔐 Student Section — Complete RBAC Audit Report

> Scanned: `Students.tsx`, `StudentDetails.tsx`, `students.routes.ts`, `ProtectedRoute.tsx`, `auth.ts`
> Date: 2026-07-18

---

## RBAC Infrastructure Summary

| Layer | Mechanism | Status |
|---|---|---|
| Route guard (frontend) | `ProtectedRoute` wrapping each route in `App.tsx` | ✅ In place |
| Role check helper | `canAccess()` + `hasAnyPermission()` in `accessControl.ts` | ✅ In place |
| Backend auth | `authMiddleware` (JWT verify) on `students.use('*', authMiddleware)` | ✅ On every route |
| Backend role gate | `requireRole('admin','super_admin')` middleware | ✅ On write routes |
| Backend permission gate | `requirePermission()` middleware | ⚠️ NOT used on any student route |
| Institution isolation | `institution_id` check on every DB query | ✅ In place |

---

## 1. `/students` — Students List Page

### Route Guard (`App.tsx` line 106)
```
allowedRoles: ['admin', 'super_admin', 'Principal', 'HOD', 'Teacher']
allowedPermissions: ['student.view']
```
✅ **Good.** Roles AND permission gate on the route entry.

### Frontend Button/Action RBAC (`Students.tsx`)

| Action | Frontend Guard | Status |
|---|---|---|
| "Admit Student" button | `canCreateStudent` (`student.create` perm) | ✅ |
| "Import Excel" button | `canCreateStudent` | ✅ |
| Bulk "Assign Section" btn | `canEditStudent` | ✅ |
| Bulk "Promote Semester" btn | `canEditStudent` | ✅ |
| Bulk "Deactivate" btn | `canEditStudent` | ✅ |
| Bulk "Reactivate" btn | `canEditStudent` | ✅ |
| Bulk "Delete" btn | `canDeleteStudent` | ✅ |
| "Export Excel/CSV" bulk | No permission check | ⚠️ **GAP** |
| "Edit" button per card | `canEditStudent` check inside handler | ✅ |
| "Archive" per card | `canEditStudent` check inside handler | ✅ |
| "Delete" per card | `canDeleteStudent` check inside handler | ✅ |
| Add form submit | `canCreateStudent` inside handler | ✅ |

### Backend API (`students.routes.ts`)

| Endpoint | Auth | Role/Permission Gate | Status |
|---|---|---|---|
| `GET /students/` | ✅ JWT | Inline role checks (student/parent/teacher scope) | ⚠️ **Weak** — no `requirePermission('student.view')` |
| `GET /students/:id` | ✅ JWT | Inline role checks (student self, parent child, teacher scope) | ⚠️ **Weak** — no `requirePermission('student.view')` |
| `POST /students/` | ✅ JWT | `requireRole('admin','super_admin')` | ✅ |
| `PUT /students/:id` | ✅ JWT | `requireRole('admin','super_admin')` | ✅ |
| `DELETE /students/:id` | ✅ JWT | `requireRole('admin','super_admin')` | ✅ |
| `POST /students/bulk-action` | ✅ JWT | `requireRole('admin','super_admin')` | ✅ |

> [!WARNING]
> `GET /students/` and `GET /students/:id` rely on inline role checks. Any authenticated user with a valid JWT whose role is not `student`, `parent`, or `teacher` falls through to the unrestricted `service.listStudents()` path (lines 276–298). A rogue user with any valid JWT role can list all students.

---

## 2. `/students/:id` — StudentDetails Page (10 Tabs)

### Route Guard (`App.tsx` line 107)
```
allowedRoles: ['admin', 'super_admin', 'Principal', 'HOD', 'Teacher']
allowedPermissions: ['student.view']
```
✅ **Good.** Same gate as the list page.

### RBAC Inside `StudentDetails.tsx` — CRITICAL GAP

The `StudentDetails.tsx` component **does NOT import or use `hasAnyPermission` / `canAccess`**. It only has:
```tsx
const { user } = useAuth();  // only user, NO permission checks derived
```
**No RBAC variables are derived.** All 10 tabs and their mutation actions are visible/usable by anyone who passes the route guard (even a Teacher with only `student.view`).

### Tab-by-Tab Breakdown

| Tab | Sensitive Data | Write Actions Present | Frontend RBAC | Backend RBAC |
|---|---|---|---|---|
| **Overview** | DOB, email, phone, address | None | ❌ No guard | ✅ GET guarded by JWT |
| **Academic** | Enrollment history, semester | Transfer, Promote, Change Section, Enroll | ❌ **NO guard on buttons** | `PUT /students/:id` ✅ requireRole admin |
| **Attendance** | Per-session records | None | ❌ No guard | Needs check |
| **Results** | Exam marks / grades | None | ❌ No guard | Needs check |
| **Fees** | Fee amounts, payment history | None (read-only tab) | ❌ No guard | Needs check |
| **Timeline** | Enrollment milestones | None | ❌ No guard | N/A |
| **Health Card** | Blood group, medical notes, emergency contact | **"Edit Health Card" button** | ❌ **NO guard** | `PUT /students/:id` ✅ requireRole admin |
| **Notes** | Internal staff notes | **Add Note, Delete Note** | ❌ **NO guard** | ✅ teacherCanAccessStudent |
| **Documents** | Student documents | **Upload Document, Delete Document** | ❌ **NO guard** | ✅ teacherCanAccessStudent (except DELETE) |
| **Guardians** | Parent names, phone, email | None (read-only) | ❌ No guard | Needs check |

### All 11 Mutation Actions — No Frontend RBAC

| Action | Handler Function | Permission Check? |
|---|---|---|
| Transfer Student | `handleTransferSubmit` | ❌ None |
| Promote Student | `handlePromoteSubmit` | ❌ None |
| Change Section | `handleChangeSectionSubmit` | ❌ None |
| Enroll Student (empty state) | `handleTransferSubmit` | ❌ None |
| Assign Bus Route | `handleTransportSubmit` | ❌ None |
| Remove Bus Route | `handleRemoveTransport` | ❌ None |
| Edit Health Card | `handleHealthSave` | ❌ None |
| Add Note | `handleAddNote` | ❌ None |
| Delete Note | `handleDeleteNote` | ❌ None |
| Upload Document | `handleDocUploadSubmit` | ❌ None |
| Delete Document | `handleDocDelete` | ❌ None |

### Backend Sub-Routes for StudentDetails

| Endpoint | Auth | Scope/Role Gate | Status |
|---|---|---|---|
| `GET /:id/notes` | ✅ JWT | `teacherCanAccessStudent()` | ✅ |
| `POST /:id/notes` | ✅ JWT | `teacherCanAccessStudent()` | ✅ |
| `DELETE /:id/notes/:noteId` | ✅ JWT | `teacherCanAccessStudent()` | ✅ |
| `GET /:id/documents` | ✅ JWT | `teacherCanAccessStudent()` | ✅ |
| `POST /:id/documents/upload` | ✅ JWT | `teacherCanAccessStudent()` | ✅ |
| `GET /:id/documents/:docId/download` | ✅ JWT | `teacherCanAccessStudent()` | ✅ |
| `DELETE /:id/documents/:docId` | ✅ JWT | Institution check ONLY — **no teacher scope** | ❌ **GAP** |
| `POST /:id/photo` | ✅ JWT | Institution check ONLY — **no role gate** | ❌ **MISSING** |

---

## 3. Consolidated Findings

### 🔴 Critical

1. **`StudentDetails.tsx` — 11 write actions have zero frontend permission checks.**  
   A Teacher with `student.view` sees all buttons (Transfer, Promote, Change Section, Enroll, Assign Bus, Edit Health Card, Add Note, Delete Note, Upload Doc, Delete Doc). Clicking them silently fails on the backend (since `PUT` requires admin role) — but users get no UX warning and can still try arbitrary actions.

2. **`POST /:id/photo` backend** — No `requireRole()` or `requirePermission()`. Any valid JWT holder in the institution can overwrite a student's photo.

3. **`DELETE /:id/documents/:docId` backend** — `teacherCanAccessStudent()` is applied on all other document endpoints but is **missing on DELETE**, allowing any authenticated user to delete documents of any student in their institution.

### 🟠 High

4. **`GET /students/` fallback path** — Users whose role is not `student`, `parent`, or `teacher` (e.g., a canteen worker with a valid JWT) fall through to `service.listStudents()` with no restrictions and get the full student roster.

5. **Bulk Export (CSV/XLSX)** — `handleBulkExport` has no permission check. Any user who selects students can export all their personal data.

### 🟡 Medium

6. **Fees tab** — Financial data visible to Teacher roles. Should require `fee.view` or `finance.access`.
7. **Health Card tab** — Sensitive medical data. "Edit Health Card" button should require `student.edit`.
8. **Documents tab** — Upload/Delete buttons should require `student.edit`.
9. **Notes tab** — Add/Delete Note should require `student.edit`.
10. **Academic tab action buttons** — Transfer/Promote/Change Section/Assign Bus Route buttons should require `student.edit`.

---

## 4. Recommended Fixes

### Frontend Fix 1: Add RBAC to `StudentDetails.tsx`

Add immediately after `const { user } = useAuth();` (around line 27):

```tsx
import { hasAnyPermission } from '../utils/accessControl';

const userPermissions = user?.permissions || [];
const canEditStudent   = hasAnyPermission(userPermissions, ['student.edit']);
const canViewFees      = hasAnyPermission(userPermissions, ['fee.view', 'finance.access']);
const canManageDocs    = hasAnyPermission(userPermissions, ['student.edit']);
const canWriteNotes    = hasAnyPermission(userPermissions, ['student.edit']);
```

Then gate all write buttons:

```tsx
// Academic tab — Transfer/Promote/Change Section buttons
{canEditStudent && (
  <button onClick={() => setShowTransferModal(true)}>Transfer Student</button>
)}

// Health Card tab — Edit button
{!showHealthEdit && canEditStudent && (
  <button onClick={() => setShowHealthEdit(true)}>Edit Health Card</button>
)}

// Notes tab — Add/Delete form
{canWriteNotes && (
  <form onSubmit={handleAddNote}>...</form>
)}
<button onClick={() => handleDeleteNote(note.id)} disabled={!canWriteNotes}>...</button>

// Documents tab — Upload button
{canManageDocs && (
  <button onClick={() => setShowUploadModal(true)}>Upload Document</button>
)}
<button onClick={() => handleDocDelete(doc.id)} disabled={!canManageDocs}>...</button>

// Transport — Assign/Remove buttons
{canEditStudent && (
  <button onClick={() => setShowTransportModal(true)}>Assign Bus Route</button>
)}
```

Filter sensitive tabs by permission:
```tsx
const tabs = [
  { id: 'overview',    label: 'Overview',    icon: User,         show: true },
  { id: 'academic',    label: 'Academic',    icon: GraduationCap,show: true },
  { id: 'attendance',  label: 'Attendance',  icon: Clock,        show: true },
  { id: 'results',     label: 'Results',     icon: TrendingUp,   show: true },
  { id: 'fees',        label: 'Fees',        icon: IndianRupee,  show: canViewFees },
  { id: 'timeline',    label: 'Timeline',    icon: Calendar,     show: true },
  { id: 'health',      label: 'Health Card', icon: Heart,        show: true },
  { id: 'notes',       label: 'Notes',       icon: MessageSquare,show: canWriteNotes },
  { id: 'documents',   label: 'Documents',   icon: FileText,     show: canManageDocs },
  { id: 'guardians',   label: 'Guardians',   icon: User,         show: true },
].filter(t => t.show);
```

### Backend Fix 2: Photo upload role gate

```ts
// students.routes.ts — POST /:id/photo
students.post('/:id/photo', requireRole('admin', 'super_admin'), async (c) => {
  // ... existing code
});
```

### Backend Fix 3: Document delete — add teacher scope

```ts
// students.routes.ts — DELETE /:id/documents/:docId
students.delete('/:id/documents/:docId', async (c) => {
  const user = c.get('user');
  const studentId = c.req.param('id')!;
  const docId = c.req.param('docId')!;

  const student = await c.env.DB.prepare(
    'SELECT 1 FROM students WHERE id = ? AND institution_id = ? AND is_active = 1'
  ).bind(studentId, user.institution_id).first();
  if (!student) return c.json({ error: 'Student not found' }, 404);

  // ADD THIS:
  if (!(await teacherCanAccessStudent(c.env.DB, user, studentId))) {
    return c.json({ error: 'Forbidden: student is outside your teaching assignment' }, 403);
  }
  // ... rest of existing code
});
```

### Backend Fix 4: Gate `GET /students/` for unknown roles

```ts
// students.routes.ts — GET /students/ — after isParent block, before service.listStudents()
const knownRole = isStudent || isParent || isTeacherOnly(user) ||
  userRoles.some(r => ['admin', 'super_admin', 'Principal', 'HOD', 'Teacher'].includes(r));

if (!knownRole) {
  return c.json({ error: 'Forbidden' }, 403);
}
```

### Frontend Fix 5: Bulk Export permission

```tsx
// Students.tsx — handleBulkExport()
const handleBulkExport = (format: 'csv' | 'xlsx') => {
  if (selectedStudentIds.length === 0) return;
  if (!canViewStudent) {
    showToast('You do not have permission to export student data.', 'error');
    return;
  }
  // ... existing code
};
```

---

## 5. What's Working Well ✅

- Route-level guards in `App.tsx` correctly gate page access for both `/students` and `/students/:id`
- `Students.tsx` list page has comprehensive CRUD permission checks on every button and handler
- Backend write routes (`POST`, `PUT`, `DELETE`, `bulk-action`) are consistently gated with `requireRole`
- Institution isolation (`institution_id` check) is enforced on every single DB query
- Teacher scope (`teacherCanAccessStudent`) is applied to notes and documents fetch/create/download routes
- Student self-access and parent-child scoping on `GET /students/` is implemented
- `requirePermission()` middleware exists and works — just needs to be applied to student GET routes
- The `accessControl.ts` utility is well-designed and ready to use in `StudentDetails.tsx`
