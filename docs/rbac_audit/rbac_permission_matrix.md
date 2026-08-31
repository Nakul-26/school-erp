# RBAC Permission Matrix

Date: 2026-07-18

This is the single source of truth for RBAC coverage. A module is complete only when every column is `Pass` and the module checklist has been executed.

Status values:

- `Pass`: every checklist item for that column was executed and behaved as expected.
- `Partial`: some coverage exists, but at least one action, endpoint, ownership rule, or detail route still needs review.
- `Gap`: known missing coverage.
- `Pending`: not manually verified yet.

Definition of `Pass`:

- Sidebar: hidden when the user lacks the view/access permission.
- Route: direct URL access is blocked when the user lacks the route permission.
- View Permission: page data does not render without the view/access permission.
- Hidden UI Actions: unauthorized actions are hidden, not merely disabled.
- Backend Endpoints: direct API requests are rejected without permission.
- Ownership / Scope: users can access only records in their allowed scope.
- Param URLs: detail/workspace routes cannot be opened by URL manipulation.
- Manual Test: role-based testing completed for the affected roles.

## Track A - Pilot-Critical Modules

These are the highest-priority modules for pilot readiness.

| Page / Module | Sidebar | Route | View Permission | Hidden UI Actions | Backend Endpoints | Ownership / Scope | Param URLs | Manual Test | Status |
|---|---:|---:|---|---|---:|---:|---:|---:|---|
| Dashboard | Pass | Pass | `dashboard.access` | Partial: quick actions gated, cards need final audit | Partial | N/A | N/A | Pending | Partial |
| Profile | Pass | Pass | `profile.access` | Partial: profile update controls need final audit | Partial | Pass: self profile | N/A | Pending | Partial |
| Admissions | Pass | Pass | `admissions.view` | Partial: create/update/convert actions need final audit | Partial | Partial | N/A | Pending | Partial |
| Students | Pass | Pass | `student.view` | Partial: create/edit/delete/archive/export gated; import/bulk/context actions need final audit | Pass | Pass | Pass: `/students/:id` | Pending | Partial |
| Teachers | Pass | Pass | `teacher.view` | Partial: create/edit/delete/export/status/document actions gated; bulk/context actions need final audit | Pass | Pass | Pass: `/teachers/:id` | Pending | Partial |
| Academic Setup | Pass | Pass | `academic.manage` | Pass: management workspace requires academic permission | Pass | N/A | N/A | Pending | Partial |
| Classes & Sections | Pass | Pass | `academic.manage` | Pass: class/section actions require academic permission | Pass | Pass | Pass: `/classes/:id` | Pending | Partial |
| Subjects | Pass | Pass | `academic.manage` | Pass: subject actions require academic permission | Pass | Pass | Pass: `/subjects/:id` | Pending | Partial |
| Attendance | Pass | Pass | `attendance.view` | Pass: mark/create/edit/delete/bulk flows gated by `attendance.mark` | Pass | Pass | N/A | Pending | Partial |
| Finance & Fees | Pass | Pass | `finance.access`, `fees.view` | Partial: collection/structure/payroll actions gated; exports and edge actions need final audit | Pass | Pass | N/A | Pending | Partial |
| Approvals Inbox | Pass | Pass | `approvals.view` | Partial: approve/reject controls need final audit | Partial | Partial | N/A | Pending | Partial |
| Institution Setup | Pass | Pass | `institution.manage` | Partial: setup actions need final audit | Partial | N/A | N/A | Pending | Partial |
| Settings | Pass | Pass | `institution.manage` | Partial: save/export/reset controls need final audit | Partial | N/A | N/A | Pending | Partial |
| Grade Settings | Pass | Pass | `institution.manage` | Partial: grade actions need final audit | Partial | N/A | N/A | Pending | Partial |
| Audit Logs | Pass | Pass | `audit.view` | Pass: read-only | Pass | N/A | N/A | Pending | Partial |
| Access Control | Pass | Pass | `user.manage` | Pass: user/role/permission actions require `user.manage` | Pass | N/A | N/A | Pending | Partial |

## Track B - Secondary / Expanded Modules

These modules are implemented and now visible in navigation when permissions allow them, but they should be hardened after Track A is green.

| Page / Module | Sidebar | Route | View Permission | Hidden UI Actions | Backend Endpoints | Ownership / Scope | Param URLs | Manual Test | Status |
|---|---:|---:|---|---|---:|---:|---:|---:|---|
| Communication | Pass | Pass | `communication.access` | Pass: tab actions are permission-gated | Pass | Pass | N/A | Pending | Partial |
| Announcements | Via Communication | Pass | `announcements.view` | Pass: create/update/delete gated by `announcements.manage` | Pass | Pass | N/A | Pending | Partial |
| Messaging | Via Communication | Pass | `messaging.access` | Pass: send/history/contact access scoped | Pass | Pass | N/A | Pending | Partial |
| Reports | Pass | Pass | `reports.access` | Partial: report tabs use specific permissions; export/download needs final audit | Pass | Pass | N/A | Pending | Partial |
| Exams & Results | Pass | Pass | `exams.view` | Pass: exam/result actions require `exams.manage` / `results.manage` | Pass | Pass | N/A | Pending | Partial |
| Homework | Pass | Pass | `homework.view` | Pass | Pass | Pass | N/A | Pending | Pass |
| Timetable | Pass | Pass | `timetable.view` | Partial: manage actions need final audit | Partial | Partial | N/A | Pending | Partial |
| Calendar | Pass | Pass | `calendar.view` | Partial: event manage actions need final audit | Partial | Partial | N/A | Pending | Partial |
| Teacher Attendance | Pass | Pass | `teacher_attendance.view` | Partial: mark/update/delete actions need final audit | Partial | Partial | N/A | Pending | Partial |
| Payroll | Via Finance | Pass | `payroll.view` | Pass: payroll run/manage actions require `payroll.manage` | Pass | Pass | Pass: `/payroll/runs/:id` | Pending | Partial |
| Leave - My Leave | Pass | Pass | `leave.apply` | Pass: apply/cancel scoped to own leave | Pass | Pass | N/A | Pending | Partial |
| Leave Types | Pass | Pass | `leave.manage` | Pass: create/update/delete/seed gated by `leave.manage` | Pass | N/A | N/A | Pending | Partial |
| Leave Approvals | Pass | Pass | `leave.review` | Pass: approve/reject gated by `leave.review` | Pass | Pass | N/A | Pending | Partial |
| Student Leave Approvals | Pass | Pass | `student_leave.review` | Pass: approve/reject gated by `student_leave.review` | Pass | Pass | N/A | Pending | Partial |
| Library | Pass | Pass | `library.access` | Partial: manage actions need final audit | Partial | Partial | N/A | Pending | Partial |
| Transport | Pass | Pass | `transport.view` | Partial: manage actions need final audit | Partial | Partial | N/A | Pending | Partial |
| Certificates | Pass | Pass | `certificates.view` | Partial: issue/download/manage actions need final audit | Partial | Partial | N/A | Pending | Partial |
| Data Tools | Pass | Pass | `data_tools.manage` | Partial: import/export/cleanup actions need final audit | Partial | N/A | N/A | Pending | Partial |
| School Setup | Pass | Pass | `setup.manage` | Partial: setup actions need final audit | Partial | N/A | N/A | Pending | Partial |
| Visitors | Pass | Pass | `visitors.manage` | Partial: visitor actions need final audit | Partial | Partial | N/A | Pending | Partial |
| Assets | Pass | Pass | `assets.manage` | Partial: asset actions need final audit | Partial | Partial | N/A | Pending | Partial |
| Alumni | Pass | Pass | `alumni.manage` | Partial: alumni actions need final audit | Partial | Partial | N/A | Pending | Partial |
| Notifications | Via Communication | Pass | `notifications.view` | Partial: read/clear actions need final audit | Partial | Pass | N/A | Pending | Partial |

## Permission Coverage Checklist

For each row, verify these seven checks before marking the module complete:

| Check | Required Evidence |
|---|---|
| Sidebar visibility | Sidebar and bottom navigation hide the module when the user lacks the view permission. |
| Route protection | Direct URL access is blocked by `ProtectedRoute` and central route policy. |
| View permission | The page cannot load without its view/access permission. |
| Hidden UI actions | Create, edit, delete, import, export, bulk, context menu, floating buttons, and dashboard quick actions are hidden, not merely disabled. |
| Backend endpoint protection | Every API endpoint checks the relevant permission or a stricter scoped rule. |
| Resource-level ownership | Students, parents, teachers, and scoped staff can only access records they own or are assigned to. |
| Manual verification | Principal, Teacher, Student, Accountant, and Parent sessions are tested for "can I do something I should not?" |

## Module Checklists

Use these executable checks to move a row from `Partial` to `Pass`.

In these checklist tables, the check text defines the expected behavior. The `Result` column starts as `Pending` and should become `Pass` only after the behavior is verified.

### Students

| Check | Result |
|---|---:|
| Sidebar hidden without `student.view` | Pending |
| `/students` blocked without `student.view` | Pending |
| `/students/:id` blocked without `student.view` | Pending |
| Student list/data hidden without `student.view` | Pending |
| View/details action hidden without `student.view` | Pending |
| Add Student hidden without `student.create` | Pending |
| Edit hidden without `student.edit` | Pending |
| Delete hidden without `student.delete` | Pending |
| Archive/reactivate hidden without `student.edit` or stricter permission | Pending |
| Import hidden unless permitted by policy | Pending |
| Export hidden unless permitted by policy | Pending |
| Bulk actions hidden unless every required permission is present | Pending |
| Context menu actions hidden unless permitted | Pending |
| Dashboard shortcut hidden without `student.create` | Pending |
| Backend rejects unauthorized student list/detail/create/update/delete/archive/export requests | Pending |
| Teacher sees only assigned students | Pending |
| Parent sees only own children | Pending |
| Student sees only self | Pending |

### Teachers

| Check | Result |
|---|---:|
| Sidebar hidden without `teacher.view` | Pending |
| `/teachers` blocked without `teacher.view` | Pending |
| `/teachers/:id` blocked without `teacher.view` or allowed self-scope | Pending |
| Teacher list/data hidden without `teacher.view` | Pending |
| Add Teacher hidden without `teacher.create` | Pending |
| Edit hidden without `teacher.edit` | Pending |
| Delete hidden without `teacher.delete` | Pending |
| Status/login/document actions hidden without required permissions | Pending |
| Export hidden unless permitted by policy | Pending |
| Bulk/context actions hidden unless permitted | Pending |
| Backend rejects unauthorized teacher list/detail/create/update/delete/export requests | Pending |
| Teacher can open own profile/workspace only unless elevated | Pending |

### Attendance

| Check | Result |
|---|---:|
| Sidebar hidden without `attendance.view` | Pending |
| `/attendance` blocked without `attendance.view` | Pending |
| Attendance table/data hidden without `attendance.view` | Pending |
| Create Session hidden without `attendance.mark` | Pending |
| Mark Attendance hidden without `attendance.mark` | Pending |
| Edit Attendance hidden without `attendance.mark` | Pending |
| Delete Session hidden without `attendance.mark` | Pending |
| Bulk Mark hidden without `attendance.mark` | Pending |
| Reports/tab access respects `attendance.view` or report-specific permission | Pending |
| Backend rejects unauthorized session/create/mark/update/delete requests | Pending |
| Teacher can mark attendance only for assigned class/section/subject | Pending |
| Student/parent can view only own attendance where exposed | Pending |

### Finance & Fees

| Check | Result |
|---|---:|
| Sidebar hidden without `finance.access` or `fees.view` | Pending |
| `/finance` blocked without finance/fees permission | Pending |
| Fee data hidden without `fees.view` | Pending |
| Fee collection hidden without `fees.collect` | Pending |
| Fee structure management hidden without finance management permission | Pending |
| Payroll tabs/actions hidden without `payroll.view` / `payroll.manage` | Pending |
| Export/download actions hidden unless permitted by policy | Pending |
| Backend rejects unauthorized fee list/detail/payment/receipt/concession/installment requests | Pending |
| Student sees only own fee records | Pending |
| Parent/guardian sees only own children's fee records | Pending |
| Accountant can access finance operations but not unrelated admin modules | Pending |

### Classes & Subjects

| Check | Result |
|---|---:|
| Sidebar hidden without `academic.manage` | Pending |
| `/classes`, `/classes/:id`, `/subjects`, `/subjects/:id` blocked without `academic.manage` | Pending |
| Class/subject data hidden without required permission | Pending |
| Create/edit/delete actions hidden without `academic.manage` | Pending |
| Allocation/workspace actions hidden unless permitted | Pending |
| Backend rejects unauthorized class/section/subject CRUD requests | Pending |
| Teacher workspace access is limited to assigned classes/subjects where supported | Pending |

### Access Control

| Check | Result |
|---|---:|
| Sidebar hidden without `user.manage` | Pending |
| `/access-control` blocked without `user.manage` | Pending |
| User list hidden without `user.manage` | Pending |
| Create/edit/deactivate user actions hidden without `user.manage` | Pending |
| Role permission editor hidden without `user.manage` | Pending |
| Backend rejects unauthorized user/role/permission mutation requests | Pending |
| Non-admin users cannot grant themselves or others elevated permissions | Pending |

### Administration Pages

Applies to Institution Setup, Settings, Grade Settings, Audit Logs, Academic Setup, and Approvals Inbox.

| Check | Result |
|---|---:|
| Sidebar hidden without the page permission | Pending |
| Route blocked without the page permission | Pending |
| Page data hidden without the page permission | Pending |
| Save/create/edit/delete/approve/reject actions hidden without action permission | Pending |
| Export/reset/danger actions hidden unless explicitly permitted | Pending |
| Backend rejects unauthorized direct requests | Pending |
| Audit Logs remain read-only for `audit.view` users | Pending |

### Homework

| Check | Result |
|---|---:|
| Sidebar hidden without `homework.view` | Pass |
| Route blocked without `homework.view` | Pass |
| Homework list filtered by class/section | Pass |
| Student sees only assigned homework | Pass |
| Parent sees only linked child's homework | Pass |
| Teacher sees only assigned classes/subjects | Pass |
| Create hidden without `homework.manage` | Pass |
| Edit hidden without `homework.manage` | Pass |
| Delete hidden without `homework.manage` | Pass |
| Publish hidden without `homework.manage` | Pass |
| Backend rejects unauthorized CRUD | Pass |
| Backend filters homework by scope | Pass |

## Route Parameter Checklist

Direct URL checks must include detail/workspace routes:

| Route | Required Permission |
|---|---|
| `/students/:id` | `student.view` plus ownership/scope rules |
| `/teachers/:id` | `teacher.view` plus self/staff scope rules |
| `/classes/:id` | `academic.manage` plus teacher assignment scope where applicable |
| `/subjects/:id` | `academic.manage` plus teacher assignment scope where applicable |
| `/payroll/runs/:id` | `payroll.manage` |

## Role-Based Manual Testing

Manual testing should be role-first. For each role, test sidebar, direct routes, hidden controls, URL manipulation, and direct API calls from the browser console or API client.

### Super Admin

| Check | Result |
|---|---:|
| Can access all modules intentionally assigned to Super Admin | Pending |
| Can manage users, roles, permissions, setup, academics, finance, reports | Pending |
| Cannot bypass institution/branch constraints except through approved branch switching | Pending |

### Admin

| Check | Result |
|---|---:|
| Can access administrative and operational modules assigned to Admin | Pending |
| Can manage users/roles only if `user.manage` is present | Pending |
| Cannot access Super Admin-only branch/global controls | Pending |

### Principal

| Check | Result |
|---|---:|
| Can access school-wide academic, student, teacher, attendance, reports, and approval modules | Pending |
| Can perform only actions granted by permissions | Pending |
| Cannot mutate access-control settings without `user.manage` | Pending |

### HOD

| Check | Result |
|---|---:|
| Can access assigned academic/department workflows | Pending |
| Cannot access finance, payroll, settings, or access-control unless explicitly granted | Pending |
| Cannot view or mutate out-of-scope department records where ownership applies | Pending |

### Teacher

| Check | Result |
|---|---:|
| Sidebar shows only teacher-allowed modules | Pending |
| Cannot access admin pages by direct URL | Pending |
| Can view only assigned students/classes/subjects where scoped | Pending |
| Can mark attendance only for assigned class/section/subject | Pending |
| Cannot create/edit/delete students or teachers unless explicitly granted | Pending |
| Direct API calls for out-of-scope records are rejected | Pending |

### Accountant

| Check | Result |
|---|---:|
| Can access finance/reports operations assigned to Accountant | Pending |
| Cannot access academic management, users, setup, or teacher/student mutations unless explicitly granted | Pending |
| Direct API calls outside finance scope are rejected | Pending |

### Student

| Check | Result |
|---|---:|
| Sidebar shows only student-safe modules | Pending |
| Cannot access staff/admin routes by direct URL | Pending |
| Can view only own attendance, homework, fees, timetable, messages where exposed | Pending |
| Cannot mutate records except allowed self-service actions | Pending |
| Direct API calls for another student are rejected | Pending |

### Parent / Guardian

| Check | Result |
|---|---:|
| Sidebar shows only parent-safe modules | Pending |
| Cannot access staff/admin routes by direct URL | Pending |
| Can view only linked children records | Pending |
| Cannot view unrelated students by changing IDs | Pending |
| Direct API calls for unlinked students are rejected | Pending |

### Receptionist / Librarian

| Check | Result |
|---|---:|
| Role exists only if the school plans to use it | Pending |
| Sidebar reflects only explicitly assigned permissions | Pending |
| Cannot access modules by legacy role assumptions | Pending |

## Milestone Gates

Use these gates to decide when to move from implementation to manual testing.

### Phase 1 - Permission Coverage

| Gate | Result |
|---|---:|
| Every route in `App.tsx` has a central policy in `roleNav.ts` or intentionally redirects | Partial |
| Every sidebar and bottom-nav item is filtered by central route policy | Pass |
| Every page has a view/access permission | Pass |
| Every actionable operation has an explicit permission or documented ownership/scope rule | Partial |
| Permission catalog is seeded for local and fresh databases | Pass |

### Phase 2 - UI Audit

| Gate | Result |
|---|---:|
| Unauthorized buttons are hidden, not disabled | Partial |
| Dashboard cards and shortcuts obey permissions | Partial |
| Tabs obey permissions | Partial |
| Context menus and bulk actions obey permissions | Partial |
| Import/export/download actions obey permissions | Partial |

### Phase 3 - Backend Audit

| Gate | Result |
|---|---:|
| Every endpoint checks permission or stricter role/scope rule | Partial |
| Resource ownership is enforced for students, parents, teachers, and scoped staff | Partial |
| Direct API calls reject unauthorized mutations | Partial |
| Direct API calls reject out-of-scope record reads | Partial |
| Detail routes and ID-based endpoints resist URL/ID manipulation | Partial |

### Phase 4 - Role Testing

| Gate | Result |
|---|---:|
| Super Admin tested | Pending |
| Admin tested | Pending |
| Principal tested | Pending |
| HOD tested | Pending |
| Teacher tested | Pending |
| Accountant tested | Pending |
| Student tested | Pending |
| Parent / Guardian tested | Pending |
| Optional Receptionist / Librarian roles tested or explicitly excluded | Pending |

## Notes

- `ProtectedRoute` merges explicit route props from `App.tsx` with central route permissions from `erp-frontend/src/config/roleNav.ts`.
- Sidebar and bottom navigation are permission-filtered through the central route policy.
- `Partial` does not mean broken. It means the module still needs at least one final audit pass before pilot sign-off.
- Manual testing should begin after Track A rows and Phase 1-3 milestone gates are green across all relevant columns.
- Findings discovered while executing this matrix should be logged in `rbac_audit/rbac_bug_log.md`.
