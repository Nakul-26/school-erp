# 🔐 Communication & Messaging — Complete RBAC Audit Report

> **Scanned Files:**
> - Frontend: `erp-frontend/src/pages/Communication.tsx`, `Announcements.tsx`, `Messaging.tsx`, `Broadcasts.tsx`
> - Backend: `erp-backend/src/modules/announcements/announcements.routes.ts`, `broadcasts/broadcasts.routes.ts`, `messaging/messaging.routes.ts`, `notifications/notifications.routes.ts`
> - Routes: `App.tsx` lines 124, 152–153, 157
>
> Date: 2026-07-18

---

## 1. Route Guard Analysis (`App.tsx` + `roleNav.ts`)

### `/communication` — Communication Workspace Route

| Property | Value |
|---|---|
| `allowedRoles` | ❌ None (only auth verified) |
| Route policy permissions | ❌ None |
| ProtectedRoute applied | ✅ |

> [!WARNING]
> **Open Route Vulnerability:**
> - Because `/communication` is not configured with any specific role or permission checks, any logged-in user (including student and parent accounts) can access the Communication Workspace directly.

---

## 2. Frontend — `Communication.tsx`

### UI Gaps

- **Lack of granular tabs visibility gating:** All tabs (Notice Board, Inbox, Broadcasts, Alerts) are rendered and accessible to all roles.
- **Notice Board Controls:** Under `Announcements.tsx`, action items to publish notices are visible to students and parents, even though calling the backend endpoints will yield a 403 error.
- **Quick Actions:** The quick action buttons ("Broadcast Notice", "Send Direct Message", "Clear Notifications") are visible to all users, causing confusion and misleading UI states.

---

## 3. Backend — `announcements.routes.ts` (Notice Board)

### Security Gaps (Section-Targeted Announcement Leak)

1. **`GET /announcements` (Line 12)**
   - Expects a `section_id` query parameter to filter announcements.
   - **Vulnerability:** There is no check verifying that the requesting student is actually enrolled in the requested section. A student in Grade 7 can query announcements directed strictly at Grade 12 by passing the Grade 12 `section_id`.

---

## 4. Backend — `broadcasts.routes.ts` (Staff Broadcasts)

### Critical Security Gaps (Broad Draft & Content Leak)

1. **`GET /broadcasts/:id` (Line 52)**
   - No recipient check or role check. The code only checks `result.institution_id === user.institution_id`.
   - **Vulnerability:** Any student or parent can retrieve details of any broadcast message. Since this includes draft messages (`status = 'draft'`), students can see upcoming announcements or confidential staff communications before they are officially sent.

---

## 5. Backend — `messaging.routes.ts` (Direct Messaging)

### Critical Security Gaps (Guardian Directory Leak to Students)

1. **`GET /messaging/contacts` (Line 23)**
   - Defines `isParent`, `isTeacher`, and `isAdmin` flags.
   - If the user is a Parent, they can message teachers and admins.
   - **Vulnerability (Fall-through bug):** The routing code defaults Student users to the `else` block (used for staff/teachers). This grants students a directory containing every parent/guardian in the institution, and enables them to initiate direct chats with any parent/guardian.

---

## 6. Consolidated Findings

### 🔴 Critical

1. **`GET /messaging/contacts`** — Any student account can fetch the database list of all parents/guardians, exposing PII and enabling spam/cross-user chats.
2. **`GET /broadcasts/:id`** — Any student or parent can view any broadcast (including private draft broadcasts) sent within the school.

### 🟠 High

3. **`GET /announcements`** — Missing section validation check. A student/parent can leak announcements targeted at other cohorts by passing arbitrary section query parameters.
4. **Open `/communication` Route Guard** — Lack of restriction allows students and parents to enter setup configurations, templates, and full messaging dashboards.

---

## 7. Recommended Fixes

### Fix 1: Map Student contacts correctly in Hono Route
Modify the `GET /messaging/contacts` route to explicitly filter student messaging capabilities (e.g. students should only message their section teachers or administrators, and under no circumstances should they receive the guardians directory):
```ts
// messaging.routes.ts
const isStudent = userRoles.some(r => ['student', 'Student'].includes(r));
if (isStudent) {
  // Restrict contacts list to administrators and their class section teachers:
  query = `
    SELECT user_id as id, first_name || ' ' || last_name as name, 'Teacher' as role
    FROM teachers
    WHERE institution_id = ? AND is_active = 1
  `;
  // ...
}
```

### Fix 2: Check recipient lists on Broadcast detail fetching
Ensure only the creator, administrators, or explicitly assigned recipients can view a broadcast:
```ts
// broadcasts.routes.ts
// GET /:id
const isRecipient = await db.prepare('SELECT 1 FROM broadcast_recipients WHERE broadcast_id = ? AND user_id = ?').bind(id, user.sub).first();
const isStaff = user.roles.some(r => ['admin', 'super_admin', 'Principal', 'HOD', 'Teacher'].includes(r));

if (!isRecipient && !isStaff) {
  return c.json({ error: 'Forbidden' }, 403);
}
```
Cwd:
