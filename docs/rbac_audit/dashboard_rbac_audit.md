# 🔐 Dashboard Page — Complete RBAC Audit Report

> Scanned: `Dashboard.tsx`, `dashboards/AdminDashboard.tsx`, `dashboards/TeacherDashboard.tsx`, `dashboards/StudentDashboard.tsx`, `dashboards/ParentDashboard.tsx`, `dashboards/AccountantDashboard.tsx`, `index.ts` (`/dashboard/stats`)
> Date: 2026-07-18

---

## Architecture Overview

The Dashboard is fundamentally a **role-dispatch page**: it reads the `role` field from the backend `/dashboard/stats` response and renders a completely different sub-dashboard for each role. RBAC here is about ensuring:
1. The page is accessible only to authenticated users ✅
2. Each role sees only their own data ✅ (done server-side)
3. Action buttons in each role view are permission-checked ⚠️ (partial)
4. Backend endpoints called by the dashboard are scoped to the requesting user ⚠️ (mostly OK, one gap)

---

## 1. Route Guard (`App.tsx` line 103)

```tsx
<Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
```

| Check | Status |
|---|---|
| Authentication (JWT) required | ✅ ProtectedRoute redirects to /login |
| Role restriction | ❌ **None — any authenticated role can access** |
| Permission restriction | ❌ None |

> [!NOTE]
> This is intentional. Dashboard is designed to be accessible by ALL roles (admin, teacher, student, parent, accountant). The route intentionally has no `allowedRoles` or `allowedPermissions` — the role-specific view is resolved after login. This is correct design.

---

## 2. Backend — `GET /dashboard/stats` (`index.ts` line 86)

### Security

| Check | Status |
|---|---|
| `authMiddleware` applied | ✅ Yes |
| Role detection | ✅ Checks `user.roles` array with known role names |
| Institution isolation | ✅ All DB queries use `user.institution_id` |
| Student self-scoping | ✅ Uses `user.sub` (user ID) to find student profile |
| Parent child-scoping | ✅ Uses `user.sub` → guardians table → children |
| Teacher self-scoping | ✅ Uses `user.sub` to find teacher profile |
| Accountant scoping | ✅ Scoped to `user.institution_id` |

### Role Fallthrough — GAP

```ts
// index.ts line 355
return c.json({ role: 'unknown', stats: {} });
```

If a user's role doesn't match any of the 5 known branches (`isAdmin`, `isTeacher`, `isStudent`, `isParent`, `isAccountant`), the endpoint returns `{ role: 'unknown', stats: {} }` with HTTP **200 OK** instead of a **403 Forbidden**.

- **Impact**: Low. The frontend renders a blank dashboard for `role: 'unknown'`. No sensitive data is leaked.
- **Fix**: Return `403` for unrecognized roles.

---

## 3. Frontend — `Dashboard.tsx` Role Detection

```tsx
// Correct: uses stats.role returned from backend (not client-side role guess)
{stats?.role === 'admin' && <AdminDashboard stats={stats} />}
{stats?.role === 'teacher' && <TeacherDashboard stats={stats} />}
{stats?.role === 'student' && <StudentDashboard ... />}
{stats?.role === 'parent' && <ParentDashboard ... />}
{stats?.role === 'accountant' && <AccountantDashboard stats={stats} />}
```

✅ **Good.** Role routing uses server-confirmed `stats.role`, not client-side assumptions.

---

## 4. Quick Actions Panel (`renderQuickActions`)

### Admin Quick Actions

| Button | Permission Check | Status |
|---|---|---|
| "Admit Student" | `canCreateStudent` (`student.create`) | ✅ |
| "Add Teacher" | `canCreateTeacher` (`teacher.create`) | ✅ |
| "Subject Allocations" | **None** | ⚠️ **GAP** |
| "Collect School Fee" | **None** | ⚠️ **GAP** |
| "Broadcast Circular" | **None** | ⚠️ **GAP** |

### Teacher Quick Actions

| Button | Permission Check | Status |
|---|---|---|
| "Mark Daily Attendance" | None | ⚠️ (navigation link, low risk) |
| "Submit Exam Marks" | None | ⚠️ (navigation link, low risk) |
| "Apply Leave Request" | None | ⚠️ (navigation link, low risk) |
| "Syllabus Lesson Plans" | None | ⚠️ (navigation link, low risk) |

### Student/Parent Quick Actions

| Button | Permission Check | Status |
|---|---|---|
| "Make Fee Payment" | None | ⚠️ (navigation link, low risk) |
| "View Time Table" | None | ⚠️ (navigation link, low risk) |
| "Check Homework Task" | None | ⚠️ (navigation link, low risk) |
| "Apply Leaves" | None | ⚠️ (navigation link, low risk) |

> [!NOTE]
> Teacher/Student/Parent action buttons are just navigation links — they redirect to other pages that have their own guards. Low security risk. The missing checks on admin-role navigation to `/academic-setup`, `/finance`, `/communication` are also low risk because the destination routes enforce their own RBAC.

---

## 5. AdminDashboard Sub-Component (`AdminDashboard.tsx`)

### Actions & Data

| Element | RBAC Check | Status |
|---|---|---|
| Setup checklist links (to `/teachers`, `/students`, etc.) | None (navigation only) | ✅ Low risk |
| Stats cards (student count, teacher count, fee collection) | Scoped to institution by backend | ✅ |
| `GET /notifications/push/adoption` | No role/permission guard | ⚠️ **GAP** |

**Gap:** `AdminDashboard` calls `GET /notifications/push/adoption` from the frontend. If this component were ever rendered for a non-admin role (currently impossible due to `stats.role === 'admin'` gate), it would expose adoption statistics. More importantly, the **backend endpoint itself** needs checking.

---

## 6. StudentDashboard — Online Payment (`triggerSimulateScan`, `handleCardPaymentSubmit`)

Both call:
```ts
api.post(`/fees/records/${selectedFeeRecord.id}/pay-online`, {...})
```

### Backend Check Needed
The fee record ID comes from the student's own ledger fetched by `GET /fees/ledger/{studentId}`, which is scoped to that student. However, the `POST /fees/records/:id/pay-online` endpoint needs to verify the fee record belongs to the requesting student (not just any valid fee record ID).

| Check | Frontend | Backend |
|---|---|---|
| selectedFeeRecord from student's own ledger | ✅ Fetched by student ID | — |
| pay-online endpoint verifies record ownership | — | ⚠️ **Needs backend verification** |

> [!WARNING]
> A student with a valid JWT could craft a request to `/fees/records/<any_record_id>/pay-online` with an arbitrary record ID. If the backend doesn't verify ownership, this could allow students to "pay" other students' fee records.

---

## 7. Parent Dashboard — Child Switching

```tsx
const [selectedChildIndex, setSelectedChildIndex] = useState(0);
// Child data fetched from stats.children (pre-scoped by backend to guardian's own children)
```

✅ **Good.** Children data is fetched server-side via `guardians` table → `user.sub`, so parents can only see their own children. The child switch is just an index into an already-scoped array.

---

## 8. Report Card Modal (`handleOpenReportCard`)

```ts
api.get(`/grades/report-card/${examId}/${studentId}`)
```

- `examId` and `studentId` come from the student's own exam list (pre-fetched and scoped to student).
- But the **backend** `/grades/report-card/:examId/:studentId` endpoint needs to verify the requesting user can access this student's report card.
- A student could potentially manipulate `studentId` to view another student's report card.

| Check | Status |
|---|---|
| Front-end: studentId comes from own stats | ✅ |
| Backend: verifies student ownership | ⚠️ **Needs verification** |

---

## 9. Announcements & Notifications (Bottom Section)

```ts
api.get('/announcements')
api.get('/notifications')
```

Both are fetched for all roles. The backend should scope announcements and notifications by institution and role. This needs checking in the respective route files.

| Endpoint | Backend Scoping | Status |
|---|---|---|
| `GET /announcements` | Should filter by institution + target_roles | Needs check |
| `GET /notifications` | Should filter by user.sub (personal notifications) | Needs check |

---

## 10. Consolidated Findings

### 🔴 Critical

1. **`POST /fees/records/:id/pay-online`** — No evidence that the backend verifies the fee record belongs to the student making the payment. A student with a valid JWT could pay (or attempt to pay) another student's fee record.

### 🟠 High

2. **`GET /dashboard/stats` role fallthrough** — Unknown roles receive HTTP 200 with `{ role: 'unknown' }` instead of HTTP 403. No data leaks, but it's a security hygiene issue.

3. **`GET /notifications/push/adoption`** — No role guard confirmed on backend. This endpoint returns institution-wide push notification adoption stats (student + parent counts). Should be restricted to `admin`/`super_admin`/`Principal` roles.

### 🟡 Medium

4. **Admin Quick Actions panel** — "Subject Allocations", "Collect School Fee", "Broadcast Circular" buttons have no permission check. They redirect to pages that have their own guards, so exploitability is low, but it's inconsistent with the "Admit Student" and "Add Teacher" buttons which *do* have permission checks.

5. **`GET /grades/report-card/:examId/:studentId`** — Backend needs to confirm the requesting student's `user.sub` matches the `studentId` parameter. Otherwise, students could enumerate report cards of other students.

6. **`GET /announcements` and `GET /notifications`** — Need verification that backend properly scopes to institution + user role/ID.

### ✅ What's Working Well

- Route guard has no role restriction — correct, Dashboard is intentionally universal
- Role-dispatched views use server-confirmed `stats.role`, not client-side role
- All DB queries in `/dashboard/stats` are institution-scoped
- Student/teacher/parent data is correctly self-scoped using `user.sub`
- `canCreateStudent` and `canCreateTeacher` guards are applied to the two admin action buttons
- Parent child-switching is correctly scoped to guardian's own children

---

## 11. Recommended Fixes

### Backend Fix 1: Unknown role → 403

```ts
// index.ts — after all role checks
// Replace line 355:
return c.json({ role: 'unknown', stats: {} });
// With:
return c.json({ error: 'Forbidden: unrecognized role' }, 403);
```

### Backend Fix 2: Pay-online ownership check

```ts
// fees routes — POST /records/:id/pay-online
const record = await db.prepare(
  'SELECT * FROM student_fee_records WHERE id = ? AND institution_id = ? AND is_active = 1'
).bind(recordId, user.institution_id).first();

if (!record) return c.json({ error: 'Fee record not found' }, 404);

// ADD: Verify the student owns this record (if caller is a student)
const isStudent = userRoles.some(r => ['Student', 'student'].includes(r));
if (isStudent) {
  const student = await db.prepare(
    'SELECT id FROM students WHERE user_id = ? AND institution_id = ? AND is_active = 1'
  ).bind(user.sub, user.institution_id).first<{ id: string }>();
  if (!student || record.student_id !== student.id) {
    return c.json({ error: 'Forbidden: cannot pay another student\'s fee record' }, 403);
  }
}
```

### Backend Fix 3: Restrict push adoption endpoint

```ts
// notifications routes — GET /push/adoption
notifications.get('/push/adoption', requireRole('admin', 'super_admin', 'Principal'), async (c) => {
  // existing code
});
```

### Frontend Fix 4: Add missing permission checks to admin quick actions

```tsx
// Dashboard.tsx — renderQuickActions() for admin role
const canManageAcademic = hasAnyPermission(userPermissions, ['academic.manage']);
const canAccessFinance = hasAnyPermission(userPermissions, ['finance.access']);
const canBroadcast = hasAnyPermission(userPermissions, ['announcement.create']);

{canManageAcademic && (
  <button onClick={() => navigate('/academic-setup?tab=assignments')}>
    <Settings size={13} /> Subject Allocations
  </button>
)}
{canAccessFinance && (
  <button onClick={() => navigate('/finance?tab=collection')}>
    <IndianRupee size={13} /> Collect School Fee
  </button>
)}
{canBroadcast && (
  <button onClick={() => navigate('/communication?tab=announcements')}>
    <Megaphone size={13} /> Broadcast Circular
  </button>
)}
```
