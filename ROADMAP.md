# TrackFlow ERP — Implementation Roadmap

> **Last Updated**: July 2026
> **Target**: Small to Medium K-12 Schools (100–1500 students)
> **Philosophy**: *"What experience do I improve next?"* — not *"What module do I build next?"*

---

## ✅ Current State (Done)

The following modules are complete and working in `D:\nakul\simple_erp`:

### Core Infrastructure
| Module | Status | Notes |
|--------|--------|-------|
| Authentication (Login / Logout / Forgot Password) | ✅ Done | JWT, Hono backend, D1 storage |
| RBAC — Roles + Permissions schema | ✅ Done | `roles`, `user_roles`, `role_permissions` tables — many-to-many, already better than plan's simpler proposal |
| Auth middleware with role enforcement | ✅ Done | `requireRole()` factory exists in `auth.ts` |
| Route-level guards | ✅ Done | `ProtectedRoute` with `allowedRoles` prop in `App.tsx` |
| Multi-branch / institution switching | ✅ Done | Super Admin can toggle institutions |
| Dark sidebar navigation (collapsible groups) | ✅ Done | `Sidebar.tsx` with collapse state |

### People & Academics
| Module | Status | Notes |
|--------|--------|-------|
| Students list + Student 360° profile | ✅ Done | `Students.tsx` (65KB) + `StudentDetails.tsx` (93KB) — very comprehensive |
| Teachers list + Teacher profile | ✅ Done | `Teachers.tsx` (57KB) + `TeacherDetails.tsx` (76KB) |
| Classes & Sections workspace | ✅ Done | `Classes.tsx` + `SectionWorkspace.tsx` (95KB each) |
| Subjects workspace | ✅ Done | `Subjects.tsx` + `SubjectWorkspace.tsx` |
| Departments | ✅ Done | `Departments.tsx` |
| Academic Years | ✅ Done | `AcademicYears.tsx` |
| Academic Calendar | ✅ Done | `AcademicCalendar.tsx` |
| Timetable | ✅ Done | `TimetablePage.tsx` |
| Attendance (student) | ✅ Done | `Attendance.tsx` |
| Teacher Attendance | ✅ Done | `TeacherAttendance.tsx` |
| Exams & Results | ✅ Done | `Exams.tsx` |
| Homework | ✅ Done | `HomeworkList.tsx` |
| Admissions pipeline | ✅ Done | `Admissions.tsx` (45KB, merged inquiries + applications) |

### Finance & HR
| Module | Status | Notes |
|--------|--------|-------|
| Fee Structures | ✅ Done | `FeeStructures.tsx` |
| Student Fees | ✅ Done | `StudentFees.tsx` (48KB) |
| Payroll — Salary Structures | ✅ Done | `SalaryStructures.tsx` |
| Payroll Runs | ✅ Done | `PayrollRuns.tsx` + `PayrollRunDetail.tsx` |
| Leave Management (staff) | ✅ Done | `Leaves.tsx`, `LeaveTypes.tsx`, `LeaveApprovals.tsx`, `MyLeaveApplications.tsx` |
| Student Leave Approvals | ✅ Done | `StudentLeaveApprovals.tsx` |

### Communication & Utilities
| Module | Status | Notes |
|--------|--------|-------|
| Announcements | ✅ Done | `Announcements.tsx` |
| Notifications | ✅ Done | `Notifications.tsx` |
| Direct Messaging | ✅ Done | `Messaging.tsx` |
| Library | ✅ Done | `Library.tsx` |
| Transport | ✅ Done | `Transport.tsx` |
| Certificates | ✅ Done | `Certificates.tsx` |
| Reports | ✅ Done | `Reports.tsx` (merged: attendance, fee, teacher) |
| Data Tools (CSV import/export) | ✅ Done | `DataTools.tsx` |
| Approvals Inbox | ✅ Done | `ApprovalsInbox.tsx` |
| School Setup | ✅ Done | `SchoolSetup.tsx` |
| System Settings | ✅ Done | `SystemSettings.tsx` |
| Audit Logs | ✅ Done | `AuditLogs.tsx` |

**Tech Stack**: React (Vite) + TypeScript + Vanilla CSS · Hono on Cloudflare Workers · D1 (SQLite)

---

## 🗺️ Roadmap Overview

```
✅ Phase 0 — Core ERP Modules (DONE)
        ↓
✅ Phase 1 — Role-Based Experience         ⭐⭐⭐⭐⭐  (Complete)
        ↓
✅ Phase 2 — Responsive UI                ⭐⭐⭐⭐⭐  (Complete)
        ↓
✅ Phase 3 — Complete Workspaces          ⭐⭐⭐⭐⭐  (Complete)
        ↓
✅ Phase 4 — UX Polish                    ⭐⭐⭐⭐  (Complete)
        ↓
✅ Phase 5 — Remaining Modules            ⭐⭐⭐  (Complete)
        ↓
⚪ Phase 6 — Version 2 / Premium          (Future)
```

---

# Phase 1 — Role-Based Experience ⭐⭐⭐⭐⭐

> **Priority**: Highest — Complete before anything else.
> **Goal**: Every role feels like they are using a *different application*, even though it's the same ERP.

## Why This Comes First

The system currently shows everything to everyone (controlled by blunt `canAdmin` / `canStaff` booleans in `Sidebar.tsx`). This causes:
- Cognitive overload for teachers and parents
- Security risk (parents seeing payroll, students seeing fee reports)
- Lack of focus (accountants should not see timetables)

## 1.1 Define the Roles

These roles already exist in the DB via `seed-school.sql`. No schema changes needed.

| Role (DB name) | Who They Are | Primary Job |
|----------------|-------------|-------------|
| `Principal` | School head / admin | View KPIs, approve decisions, configure school |
| `HOD` | Head of Department | Academic coordination, class management |
| `Teacher` | Class / subject teacher | Attendance, homework, marks |
| `Accountant` | Fee collection staff | Fees, receipts, dues |
| `Student` | Enrolled student | View own data only |
| `super_admin` | IT / system owner | Multi-institution management |

> ⚠️ **DB schema note**: This repo already uses a proper many-to-many RBAC schema
> (`roles` + `user_roles` + `role_permissions` tables). The original plan proposed an
> `ALTER TABLE users ADD COLUMN role TEXT` migration — **this does NOT apply here and
> should NOT be run**. The DB is already ahead of that simpler approach. Skip to 1.3.

## 1.2 ~~Database Changes~~ — Already Done ✅

No migration needed. The backend auth middleware reads roles from the `user_roles` join table
and populates the JWT payload. The `/api/auth/me` endpoint already returns the user's roles array.

**This step is complete. Move directly to 1.3.**

## 1.3 Frontend: Role Navigation Config

### New File: `frontend/src/config/roleNav.ts`

Define exactly which routes each role can access. Keys match the `to` paths used in `Sidebar.tsx`
and `App.tsx`:

```ts
export type NavKey =
  | 'dashboard' | 'announcements' | 'notifications' | 'messaging'
  | 'admissions' | 'students' | 'teachers'
  | 'classes' | 'subjects' | 'timetable' | 'attendance' | 'teacher-attendance'
  | 'homework' | 'exams' | 'calendar' | 'library' | 'transport' | 'certificates'
  | 'fee-structures' | 'student-fees'
  | 'payroll/salary-structures' | 'payroll/runs'
  | 'leave/my' | 'leave/approvals' | 'leave/types' | 'student-leaves/approvals'
  | 'reports' | 'data-tools' | 'approvals'
  | 'setup' | 'settings' | 'users' | 'audit-logs' | 'institution-setup' | 'profile';

export const ROLE_NAV: Record<string, NavKey[]> = {
  Principal: [
    'dashboard', 'announcements', 'notifications', 'messaging',
    'admissions', 'students', 'teachers',
    'classes', 'subjects', 'timetable', 'attendance', 'teacher-attendance',
    'homework', 'exams', 'calendar', 'library', 'transport', 'certificates',
    'fee-structures', 'student-fees',
    'payroll/salary-structures', 'payroll/runs',
    'leave/approvals', 'leave/types', 'student-leaves/approvals', 'leave/my',
    'reports', 'data-tools', 'approvals',
    'setup', 'settings', 'users', 'audit-logs', 'institution-setup', 'profile',
  ],

  HOD: [
    'dashboard', 'announcements', 'notifications', 'messaging',
    'admissions', 'students', 'teachers',
    'classes', 'subjects', 'timetable', 'attendance', 'teacher-attendance',
    'homework', 'exams', 'calendar', 'library',
    'fee-structures', 'student-fees',
    'leave/approvals', 'student-leaves/approvals', 'leave/my',
    'reports', 'approvals', 'setup', 'profile',
  ],

  Teacher: [
    'dashboard', 'announcements', 'notifications', 'messaging',
    'students',
    'timetable', 'attendance', 'homework', 'exams', 'calendar', 'library',
    'student-fees',
    'leave/my', 'student-leaves/approvals',
    'profile',
  ],

  Accountant: [
    'dashboard', 'announcements', 'notifications', 'messaging',
    'students',
    'fee-structures', 'student-fees',
    'reports',
    'leave/my',
    'profile',
  ],

  Student: [
    'dashboard', 'announcements', 'notifications', 'messaging',
    'homework', 'timetable', 'library',
    'student-fees',
    'leave/my',
    'profile',
  ],
};
```

## 1.4 Frontend: Wire roleNav into Sidebar

**File**: `frontend/src/components/Sidebar.tsx`

Replace the current `canAdmin` / `canStaff` boolean logic with a `ROLE_NAV` lookup:

```ts
import { ROLE_NAV } from '../config/roleNav';

const primaryRole = roles[0] || 'Teacher';
const allowedNav = ROLE_NAV[primaryRole] ?? ROLE_NAV['Teacher'];
const can = (key: string) => allowedNav.includes(key as any);
```

Each group's `links` array is filtered through `can()` before rendering. The sidebar then
automatically shows only the right items per role — no more manual boolean checks.

## 1.5 Frontend: Role-Specific Dashboard Components

**Current state**: `Dashboard.tsx` is a single 1,625-line file with inline render functions
(`renderTeacherDashboard`, `renderStudentDashboard`, etc.) mixed into a monolithic component.

**Goal**: Extract each into a clean standalone component so they can be developed, tested, and
styled independently.

| New File | Role | First Question Answered |
|----------|------|------------------------|
| `src/pages/dashboards/AdminDashboard.tsx` | Principal / HOD | "How is the school doing today?" |
| `src/pages/dashboards/TeacherDashboard.tsx` | Teacher | "What do I need to do right now?" |
| `src/pages/dashboards/AccountantDashboard.tsx` | Accountant | "How much was collected today?" |
| `src/pages/dashboards/StudentDashboard.tsx` | Student | "Am I on track this semester?" |

Each dashboard answers a different first question:

**Teacher Dashboard**
```
Good morning, Mr. Sharma!

📅 Today's Classes          → 5 periods
✓  Attendance Pending       → Class 9-B (not yet marked)
📝 Homework Due Today       → 2 submissions
📊 Exam Duties              → Tomorrow: Math Paper 1
💬 Unread Messages          → 3
🏖️  Leave Balance           → 8 days remaining
```

**Accountant Dashboard**
```
Today's Collections         → ₹12,400
Pending Dues                → ₹1,82,000 (47 students)
Receipts Issued Today       → 12
Online Payments (pending)   → 3 to verify
```

**Student Dashboard**
```
John Doe — Class 9-A

📅 Attendance               → 92% (Present today ✓)
📝 Homework Due             → 2 assignments pending
💰 Fee Due                  → ₹4,500 (by 10th July)
📊 Last Result              → Math: 87/100
```

## 1.6 Guard All Routes

Update `ProtectedRoute` to use `ROLE_NAV` for consistent enforcement:

```ts
// ProtectedRoute.tsx
const primaryRole = user.roles?.[0];
const allowed = ROLE_NAV[primaryRole] ?? [];
if (!allowed.includes(routeKey)) return <AccessDenied />;
```

## 1.7 Testing Checklist (Manual)

After implementation, log in as each role and verify:

- [ ] `Principal` sees all pages, can configure school
- [ ] `HOD` sees academic management, no payroll
- [ ] `Teacher` sees only their tools — no fee management, no admin setup
- [ ] `Accountant` sees only fee-related pages, no timetable, no exams
- [ ] `Student` sees only their own timetable, homework, and fees
- [ ] No role can navigate to a page outside their `ROLE_NAV` list

---

# Phase 2 — Responsive UI ⭐⭐⭐⭐⭐

> **Priority**: Very High — Teachers and parents are on phones.
> **Goal**: Every role-specific page must work comfortably on mobile.

## 2.1 Breakpoints

Add to `frontend/src/index.css`:

```css
/* Mobile first */
/* xs: < 480px    — compact phones */
/* sm: 480–767px  — large phones  */
/* md: 768–1023px — tablets       */
/* lg: >= 1024px   — desktops      */
```

## 2.2 Layout Changes

**File**: Refactor `App.tsx` layout shell into `src/components/AppShell.tsx`

| Viewport | Sidebar Behaviour |
|----------|------------------|
| `>= 1024px` | Current sidebar (left, 240px fixed) |
| `768–1023px` | Collapsed icon-only sidebar (60px) — hover to expand |
| `< 768px` | Sidebar hidden — replaced by `<BottomNav>` |

### New Component: `src/components/BottomNav.tsx`

Fixed bottom bar on mobile showing 5 role-filtered icons from `ROLE_NAV`.

## 2.3 Page-Level Responsive Priorities

| Page | Desktop | Mobile |
|------|---------|--------|
| Teacher Dashboard | Cards in grid | Stacked cards, full width |
| Attendance | Data table | Card per student, tap to toggle |
| Homework | Table + filters | Card list |
| Timetable | Full weekly grid | Day-by-day horizontal scroll |
| Student Dashboard | Standard | Bottom nav + hero card |
| Accountant Dashboard | Table heavy | Summary cards + search-first |
| Student Fees | Form + table | Full-screen form flow |

## 2.4 Mobile Attendance Pattern

```
┌─────────────────────────────┐
│  Class 9-B  ·  Wed 2 July   │
│  28 students                │
├─────────────────────────────┤
│  [✓] Aryan Kumar     ●      │
│  [✗] Priya Singh     ●      │
│  [✓] Ravi Patel      ●      │
│  ...                        │
├─────────────────────────────┤
│   [P] Present  [A] Absent   │
│       [Save Attendance]     │
└─────────────────────────────┘
```

## 2.5 Mobile Timetable Pattern

```
← Mon  [Tue]  Wed  Thu  Fri →
┌─────────────────────────────┐
│  08:00  Mathematics         │
│         Room 101            │
├─────────────────────────────┤
│  09:00  English             │
│         Room 102            │
└─────────────────────────────┘
```

## 2.6 Implementation Steps

1. Add breakpoint variables to `index.css`
2. Refactor `App.tsx` layout wrapper into `<AppShell>` component
3. Create `<BottomNav>` component for mobile (role-filtered nav items from `ROLE_NAV`)
4. Audit existing views for horizontal scroll issues at 375px
5. Build mobile-first layouts for: `Attendance.tsx`, `TimetablePage.tsx`, Teacher & Student dashboards
6. Test at 375px, 768px, 1280px in Chrome DevTools

---

# Phase 3 — Complete the Core Workspaces ⭐⭐⭐⭐⭐

> **Goal**: Make the Teacher, Student, and Accountant experiences so comprehensive that users rarely need to navigate away.

## 3.1 Dashboard Intelligence

Transform the current numbers-only dashboard into an intelligent morning briefing.

### New Backend Endpoints

```
GET /api/dashboard/intelligence   → Role-filtered briefing data
GET /api/dashboard/today          → Today's attendance, events, dues
GET /api/dashboard/alerts         → Unread alerts by priority
```

### Frontend Components

- `<MorningBriefing>` — Greeting + date + summary block
- `<AlertBanner>` — Priority warnings (absent teachers, overdue fees)
- `<QuickActions>` — Role-specific shortcut buttons
- `<ActivityTimeline>` — Live event feed

**Example output for Principal:**
```
Good Morning, Principal! 👋
Wednesday, 2 July 2026

TODAY'S SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅  754 / 786 students present     (96.1%)
⚠️   32 absent today
⚠️    4 teachers on leave
⚠️  ₹1,82,000 fees pending (47 students)
📚   7 library books overdue

QUICK ACTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[View Absent List]  [Collect Fee]  [Mark Circular Read]
```

## 3.2 Student 360° Profile — Gap Fill

`StudentDetails.tsx` is already very comprehensive. These sections are still missing:

```
Student Profile Tabs (current vs. target)
├── ✅ Basic Info (name, class, DOB, photo)
├── ✅ Attendance history
├── ✅ Exam results
├── ✅ Homework submissions
├── ❌ Fee history + payment status      ← Add tab
├── ❌ Parent/Guardian info              ← Add tab
├── ❌ Transport route                   ← Add tab
├── ❌ Certificates issued               ← Add tab
└── ❌ Timeline (key events)             ← Add tab
```

**File**: `src/pages/StudentDetails.tsx` — add new tabs, each lazy-loading data only on click.

### New Backend Endpoints

```
GET /api/students/:id/fees          → Fee history for this student
GET /api/students/:id/transport     → Assigned transport route
GET /api/students/:id/certificates  → Certificates issued
```

## 3.3 Teacher Workspace

A single page for everything a teacher needs daily. No clicking around.

**File**: `src/pages/dashboards/TeacherDashboard.tsx` (extracted from Dashboard.tsx in Phase 1,
then extended into a full workspace in Phase 3)

```
Teacher Workspace — Mr. Sharma

OVERVIEW
├── Today's Classes      [5 periods]  → click to view details
├── Attendance Pending   [1 class]    → click to mark
├── Homework Due         [2 tasks]    → click to view
├── Exam Duties          [1 exam]     → click to view
├── Leave Balance        [8 days]     → click to apply

QUICK ACCESS
├── Mark Attendance      [button]
├── Add Homework         [button]
├── Enter Marks          [button]
├── Apply Leave          [button]

MESSAGES
└── Unread: 3            [open inbox]
```

### New Backend Endpoints

```
GET  /api/teacher/workspace   → Aggregated workspace data for logged-in teacher
GET  /api/teacher/today       → Today's schedule and attendance status
GET  /api/teacher/pending     → Pending tasks (attendance, homework, marks)
POST /api/teacher/leave       → Submit leave application
```

## 3.4 Accountant Workspace

Everything the accountant needs on one screen.

**File**: `src/pages/dashboards/AccountantDashboard.tsx` (extracted from Dashboard.tsx in Phase 1,
then extended into a full workspace in Phase 3)

```
Fee Collection — Today: ₹12,400

COLLECT FEE
├── Search student by name / roll no
├── View outstanding fees
├── Select fee heads
├── Collect + print receipt

PENDING DUES
├── Filterable list (class, date)
├── Bulk reminder (SMS/email)
└── Export as PDF / CSV

TODAY'S RECEIPTS
└── List of today's collections with print buttons
```

### New Backend Endpoints

```
GET  /api/fees/pending          → Students with due fees (filterable by class)
GET  /api/fees/today            → Today's collections summary
GET  /api/fees/receipt/:id      → Receipt data for printing
GET  /api/fees/report           → Fee report (date range, class)
```

---

# Phase 4 — UX Polish ⭐⭐⭐⭐

> **Goal**: Make the system feel premium and professional.

## 4.1 Global Search

Search across everything from a single bar in the header.

```
Search...   [Ctrl+K]

Results for "aryan"
────────────────────────────────
🎓 Student    Aryan Kumar — Class 8-A
👤 Teacher    Aryan Mehta — Mathematics
💰 Receipt    #RCP-2847 — Aryan Kumar ₹4,500
```

### Implementation

- **Frontend**: `src/components/GlobalSearch.tsx` — triggered by click or `Ctrl+K`
- **Backend**: `GET /api/search?q=aryan&types=students,teachers,receipts`
- Search covers: students, teachers, receipts, library books, transport routes
- Results grouped by type with icons
- Keyboard navigable (arrow keys + Enter)

## 4.2 Ctrl+K Command Palette

**File**: `src/components/CommandPalette.tsx`

```
Ctrl + K

> _

Recent
  ├── Add Student
  ├── Collect Fee
  └── Mark Attendance

All Commands (role-filtered)
  ├── Add Student           →  opens student form
  ├── Collect Fee           →  opens fee collection
  ├── Mark Attendance       →  opens attendance
  ├── Print TC              →  opens certificate generator
  └── Generate Timetable    →  opens timetable generator
```

- Fuzzy search over registered commands
- Commands defined per role — teacher only sees teacher commands
- `localStorage` tracks recently used commands
- Global `keydown` listener for `Ctrl+K` / `Cmd+K`

## 4.3 Unified Calendar

Merge all calendar-type data into the existing `AcademicCalendar.tsx`:

```
Calendar — July 2026

[Month] [Week] [Day]

● Holiday         — 4 Jul: Independence Day
● Exam            — 5–10 Jul: Quarterly Exams
● Fee Due         — 10 Jul: Term 2 Fee Deadline
● Event           — 15 Jul: Annual Sports Day
● Teacher Leave   — 20 Jul: Mrs. Patel (approved)
```

Overlays to add: Fee deadlines | Teacher leave events | Birthday highlights | Admission deadlines

## 4.4 Bulk Operations Hub

**File**: `src/components/BulkOperationsHub.tsx`

```
Bulk Operations

STUDENT OPERATIONS
  ├── Import Students (CSV)   ← already in DataTools.tsx, surface here too
  ├── Promote Students (Year End)
  ├── Bulk Generate ID Cards
  └── Bulk Transfer Certificates

COMMUNICATION
  ├── Bulk SMS (by class / all)
  └── Bulk Notices

FEE OPERATIONS
  ├── Bulk Fee Generation
  └── Bulk Due Reminders
```

## 4.5 Smart Empty States

**File**: `src/components/common/EmptyState.tsx`

Every empty list/table shows a helpful empty state instead of a blank screen:

```
No students in Class 9-B yet.

[+ Add First Student]  [Import from CSV]

Need help? View Guide →
```

Props: `icon`, `title`, `description`, `primaryAction`, `secondaryAction`

Audit every list page and replace blank/null states with this component.

## 4.6 School Setup Wizard (Onboarding)

Runs once, on first login as Principal. Separate from the existing `SchoolSetup.tsx` (which is a
settings page, not a guided wizard).

**File**: `src/components/onboarding/SetupWizard.tsx`

```
Step 1 of 5 — School Details
  School Name, Logo, Address, Phone

Step 2 of 5 — Academic Year
  Start Date, End Date, Term Structure

Step 3 of 5 — Add Classes
  Grade 1–12, Sections per Grade

Step 4 of 5 — Fee Structure
  Fee heads, Amounts per class, Due dates

Step 5 of 5 — Add Your First Teacher
  Name, Email, Subject, Class

[Done! → Take me to Dashboard]
```

---

# Phase 5 — Remaining Modules ⭐⭐⭐

> Build only after Phases 1–4 are complete and tested.

## 5.1 Visitor Register

**Users**: Reception staff
**Feature**: Log visitor entries (name, purpose, host, in/out time)

```
New Visitor
  Name       : ________________
  Purpose    : [Parent Visit ▾]
  Meeting    : ________________
  Phone      : ________________
  In Time    : 10:34 AM
  [Check In]
```

**DB Table**: `visitors (id, institution_id, name, purpose, host_name, phone, in_time, out_time, created_at)`
**Route**: `/visitors`

## 5.2 Assets & Inventory

**Users**: Admin, Principal
**Feature**: School property tracking (furniture, electronics, lab equipment)

- Add / Edit / Remove items
- Assign to room/department
- Mark as damaged or disposed
- Annual audit report

**DB Table**: `assets (id, institution_id, name, category, quantity, assigned_to, room, condition, purchase_date, value)`
**Route**: `/assets`

> 💡 Note: This is school *asset* tracking (chairs, projectors, lab equipment), completely separate
> from the product inventory system in `D:\nakul\inventory_managemet_eclipse_claude`.

## 5.3 Alumni

**Users**: Admin
**Feature**: Track graduated students

- Auto-populate from promoted/graduated students
- Add current occupation, institution
- Generate statistics (% in higher education, etc.)

**DB Table**: `alumni (id, institution_id, student_id, graduation_year, current_status, institution, contact)`
**Route**: `/alumni`

## 5.4 Backup & Restore

**Users**: Admin
**Feature**: One-click database backup

```
Database Backup

Last Backup: 1 July 2026, 11:45 PM

[Create Backup Now]
[Download Last Backup]
[Restore from File]
```

**Implementation**:
- `GET /api/admin/backup` — Exports all tables as JSON dump
- `POST /api/admin/restore` — Accepts upload, validates, restores
- Schedule nightly automatic backup to R2 (Cloudflare Object Storage)

---

# Phase 6 — Version 2 / Premium Features

> **Do not build these now.**

- 🏠 Hostel Management
- 🍱 Canteen / Meal Plans
- 📡 RFID Attendance
- 🤖 AI Insights (predicted dropouts, fee defaulters)
- 📖 LMS / Online Classes
- 📈 Advanced Analytics & Forecasting
- 📱 Native Mobile App (React Native)
- 👨‍👩‍👧 Parent Portal (separate web app)

---

# Implementation Rules

These rules apply to every feature built from now on:

## Rule 1 — Experience Over Module

> **Before building anything, ask**: *"Which existing page becomes more powerful because of this?"*

If the answer is "none — this is a new standalone page," put it in Phase 5 or later.

## Rule 2 — Role First

Every new page or component must answer: *"Which role uses this, and what is the first thing they need to see?"*

## Rule 3 — Mobile Check

Before marking any feature as done, test it at 375px width on Chrome DevTools.

## Rule 4 — Trial Before Next Phase

Before starting the next phase, run a complete end-to-end trial as if you're a fresh school:

1. Set up school (wizard)
2. Add teachers + classes + students
3. Generate timetable
4. Mark attendance
5. Collect a fee
6. Conduct an exam
7. Print a report card
8. Send a notice
9. Promote students to next year

Write down every moment of hesitation. Fix those first.

---

# Effort Estimates

| Phase | Estimated Effort | Priority |
|-------|-----------------|----------|
| Phase 1 — Role-Based Experience | 2–3 days | 🔴 Critical |
| Phase 2 — Responsive UI | 3–4 days | 🔴 Critical |
| Phase 3 — Complete Workspaces | 4–6 days | 🔴 Critical |
| Phase 4 — UX Polish | 3–5 days | 🟠 High |
| Phase 5 — Remaining Modules | 4–6 days | 🟡 Medium |
| **Total (Phases 1–5)** | **~16–24 days** | |

> Phase 1 is shorter than originally estimated (was 3–5 days) because the DB schema is already done.

---

# Quick Reference — What to Build Next

```
TODAY — Phase 1
└── Step 1: Create src/config/roleNav.ts with ROLE_NAV per-role nav arrays
└── Step 2: Refactor Sidebar.tsx to use ROLE_NAV instead of canAdmin/canStaff booleans
└── Step 3: Extract renderTeacherDashboard() → src/pages/dashboards/TeacherDashboard.tsx
└── Step 4: Extract renderStudentDashboard() → src/pages/dashboards/StudentDashboard.tsx
└── Step 5: Build AccountantDashboard.tsx (currently missing from Dashboard.tsx)
└── Step 6: Update Dashboard.tsx to import and render these standalone components
└── Step 7: Manual test — log in as Teacher, Principal, Accountant, Student

NEXT — Phase 2
└── Add breakpoint CSS variables to index.css
└── Refactor App.tsx layout wrapper into <AppShell> component
└── Create <BottomNav> component for mobile
└── Make Attendance.tsx mobile-friendly (card-per-student layout at <768px)
└── Make TimetablePage.tsx mobile-friendly (day-view horizontal scroll)

AFTER THAT — Phase 3
└── Build MorningBriefing + AlertBanner + QuickActions components
└── Add new backend endpoints: /api/dashboard/intelligence, /api/dashboard/today
└── Add missing tabs to StudentDetails.tsx (Fees, Transport, Certificates)
└── Build Teacher Workspace aggregated view
└── Build Accountant Workspace with receipt printing
```

---

*This roadmap supersedes the original `PLAN.md` for feature planning purposes.
`PLAN.md` remains accurate for the completed Phase 0 technical architecture.*
