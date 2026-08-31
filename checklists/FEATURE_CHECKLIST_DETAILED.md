# TrackFlow — MVP Feature Checklist (Detailed)

**Purpose:** the operation-level breakdown behind `FEATURE_CHECKLIST_SIMPLE.md` — e.g. instead of one line for "manage students," this lists add / edit / delete / view / search / bulk-import as separate rows. Still client-facing: no bug reports, no dates, no code references, no "tested vs. not tested" distinction — just "does this specific action exist and work."

**As of:** 2026-08-31. **Legend:** ✅ Yes · 🟡 Partial/limited (see note) · ❌ Not available

---

## 1. Login & Access

| Action | Status | Note |
|---|:---:|---|
| Log in / log out | ✅ | |
| Forgot password (emailed reset link) | ✅ | |
| Reset password | ✅ | |
| A new school/college signs itself up | ✅ | |
| Platform admin switches between institutions | ✅ | |
| Edit own profile (name, email, password) | ✅ | |
| Blocked from pages your role can't access | ✅ | |

## 2. Dashboards

| Action | Status | Note |
|---|:---:|---|
| Admin/Principal dashboard | ✅ | |
| Teacher dashboard (own classes) | ✅ | |
| Student dashboard (own data) | ✅ | Shows attendance %, fee due/paid, and the 5 most recent exam results |
| Parent dashboard, switch between multiple children | ✅ | Same breakdown (attendance %, fee due/paid, recent results) per child |
| Accountant dashboard | ✅ | |
| Student/parent dashboard shows upcoming events/holidays | ❌ | Not included — the academic calendar exists as its own screen, not surfaced on the dashboard |

## 3. Institution & Academic Setup

| Action | Status | Note |
|---|:---:|---|
| Edit own school/college profile & logo | ✅ | |
| Platform admin: add / list / delete institutions | ✅ | |
| Add academic years, mark one active | ✅ | |
| Year-end rollover / promotion wizard | ✅ | |
| Add / edit / archive / restore departments | ✅ | |
| Add / edit academic calendar (holidays, events) | ✅ | |
| Set grading scale & institution-wide settings | ✅ | |

## 4. Admissions

| Action | Status | Note |
|---|:---:|---|
| Log a new inquiry | ✅ | |
| Convert an inquiry into a full application | ✅ | |
| Submit an application directly (no prior inquiry) | ✅ | |
| Approve an application (creates the student record) | ✅ | |
| Reject an application | ✅ | |
| Attach documents to an inquiry/application | ❌ | No upload option exists yet |
| View more than the first page of leads/applications | ✅ | "Show more" per column |
| Auto-generated admission numbers | ✅ | |

## 5. Students

| Action | Status | Note |
|---|:---:|---|
| Add a student | ✅ | |
| View / search / filter the student list | ✅ | |
| Page through a large student list | ✅ | |
| Edit a student's details | ✅ | |
| Archive / restore a student | ✅ | |
| Delete one student | ✅ | |
| Delete many students at once (bulk) | ✅ | |
| Bulk-import students from an Excel/CSV file | ✅ | |
| Add / edit / remove a student's guardians | ✅ | |
| Manage a student's class/section enrollment | ✅ | |
| Upload / manage a student's profile photo | ✅ | Captured on add/edit, used on the student card and ID card |
| Store emergency contact & blood group info | ✅ | Shown on the student's Health tab |
| Generate a printable Student ID card | ✅ | Dedicated ID card view with photo + QR code |
| Mark a student as transferred/withdrawn (formal workflow) | 🟡 | The status can be set to Transferred/Withdrawn, but it's just a status-field edit — no reason capture, destination-school field, or automatic linked Transfer Certificate generation |

## 6. Teachers / Staff

| Action | Status | Note |
|---|:---:|---|
| Add a teacher | ✅ | |
| Edit a teacher's details | ✅ | |
| Deactivate / reactivate a teacher | ✅ | |
| Search & filter teachers (department, designation, status) | ✅ | |
| Page through a large teacher list | ✅ | |
| Bulk import / export teachers | ✅ | |
| Store notes & documents for a teacher | ✅ | |
| Assign teachers to subjects | ✅ | |
| See teaching-workload & scheduling-conflict warnings | ✅ | |
| Assign a whole batch of teacher↔subject links at once | ❌ | Only one at a time today; the bulk-assign option isn't in the screen yet |

## 7. Classes, Sections, Subjects, Timetable

| Action | Status | Note |
|---|:---:|---|
| Add / edit / archive / restore / delete a section | ✅ | |
| Add / edit / archive / restore / delete a subject | ✅ | |
| Attach lesson plans / assessments to a subject | ✅ | |
| Upload/download documents on a section | ✅ | |
| Build a weekly timetable | ✅ | |
| Teachers view their own timetable | 🟡 | Present but not independently confirmed working |
| Students view their section's timetable | 🟡 | Present but not independently confirmed working |

## 8. Attendance

| Action | Status | Note |
|---|:---:|---|
| Create a daily attendance session | ✅ | |
| Mark students present/absent | ✅ | |
| View marked attendance | ✅ | |
| Edit an already-marked day | 🟡 | Not independently confirmed working |
| Block marking attendance for a future date | 🟡 | Not independently confirmed working |
| Attendance reports by student / date range | ✅ | |
| Teachers mark their own attendance | ✅ | |
| Students/parents submit a leave request | ✅ | |

## 9. Exams, Grading, Report Cards

| Action | Status | Note |
|---|:---:|---|
| Create / list / view an exam | ✅ | |
| Edit an exam | ✅ | |
| Delete an exam | ✅ | |
| Add subjects to an exam with max/min marks | ✅ | |
| Enter marks | ✅ | |
| Marks outside the valid range are rejected | ✅ | e.g. entering 150 out of 100 |
| Generate one student's report card | ✅ | |
| Generate report cards for a whole class/exam at once | ✅ | |
| Set custom grading scales | ✅ | |
| Report card as a real downloadable PDF | 🟡 | Browser print only |
| (College) Track semester GPA and overall CGPA | ✅ | |
| (College) Backlog / failed-subject tracking | ✅ | |
| (College) Course prerequisites (add/list/remove) | ✅ | |
| (College) Elective subject registration & withdrawal | ✅ | |

## 10. Homework & Study Materials

| Action | Status | Note |
|---|:---:|---|
| Post homework to a class | ✅ | |
| Edit / delete homework | ✅ | |
| Filter homework by class/subject | ✅ | |
| Upload / download study materials | ✅ | |

## 11. Fees & Finance

| Action | Status | Note |
|---|:---:|---|
| Create a fee structure | ✅ | |
| Version / delete a fee structure | ✅ | |
| Apply a fee structure to students (generate dues) | ✅ | |
| Record a fee payment | ✅ | |
| Track partial payments & running balance | ✅ | |
| Process a refund | ✅ | |
| Apply a late-payment fine | ✅ | |
| View / print a fee receipt for a payment | ✅ | Student/parent/staff can view; browser-print only, no downloadable PDF file |
| Accept fee payments online (card/UPI) | ❌ | Needs a payment gateway account first |
| Automatic fee-due reminder sent to student/parent | ❌ | A background job runs and counts unpaid dues, but the result only updates an internal number for staff dashboards — nothing is actually emailed/texted/pushed to the student or parent yet |

## 12. Accounting (GL)

| Action | Status | Note |
|---|:---:|---|
| Manage chart of accounts | ✅ | |
| Create a journal entry (double-entry) | ✅ | |
| Post / void a journal entry | ✅ | |
| Trial balance report | ✅ | |

## 13. Payroll

| Action | Status | Note |
|---|:---:|---|
| Generate a payroll run | ✅ | |
| View salary breakdown per staff member | ✅ | |
| View / print a payslip | 🟡 | Browser print only, no downloadable PDF |
| Set up salary structures | 🟡 | Present but not independently confirmed working |

## 14. Leave Management

| Action | Status | Note |
|---|:---:|---|
| Define leave types | ✅ | |
| Assign a leave quota to staff | ✅ | |
| Apply for leave | ✅ | |
| Approve / reject a leave application | ✅ | |
| Over-quota leave requests are blocked | ✅ | |
| Student leave requests | ✅ | |

## 15. Communication

| Action | Status | Note |
|---|:---:|---|
| Post announcements to a chosen audience | ✅ | |
| Direct messaging between users | ✅ | Updates every few seconds, not instantly |
| Send a broadcast to a targeted group | ✅ | |
| Broadcast delivery by email | ✅ | |
| Broadcast delivery by SMS/WhatsApp | ❌ | Doesn't actually send — needs a real provider account |
| Manage notification templates & preferences | ✅ | |
| Subscribe to / manage push notifications | ✅ | Includes a device list per user |
| Truly instant (real-time) delivery | ❌ | Not built — everything is on a refresh cycle |

## 16. Library

| Action | Status | Note |
|---|:---:|---|
| Add / edit / delete a book | ✅ | |
| Mark a book reference-only (non-lending) | ✅ | |
| Issue a book to a student | ✅ | |
| Return a book, auto-calculate overdue fine | ✅ | |
| Search the catalog | ✅ | |

## 17. Transport

| Action | Status | Note |
|---|:---:|---|
| Add / edit / delete a route or vehicle | ✅ | |
| Assign a student to a route | ✅ | |
| Generate monthly transport billing | ✅ | |

## 18. Hostel

| Action | Status | Note |
|---|:---:|---|
| Add / edit blocks and rooms | ✅ | |
| Allot a student to a room | ✅ | Enforces room capacity |
| Vacate / reallocate a student | ✅ | |
| Deleting an occupied room is blocked | ✅ | |

## 19. Canteen

| Action | Status | Note |
|---|:---:|---|
| Manage menu items | ✅ | |
| Subscribe a student to a meal plan | ✅ | |
| Generate monthly canteen billing | ✅ | |
| Per-item purchase with a student wallet (POS-style) | ❌ | Not built — subscription billing only |

## 20. Visitors

| Action | Status | Note |
|---|:---:|---|
| Log a visitor check-in | ✅ | |
| Log a visitor checkout | ✅ | |
| Search past visitor logs | ❌ | Not built |

## 21. Assets

| Action | Status | Note |
|---|:---:|---|
| Add an asset | ✅ | |
| Edit / retire an asset | ✅ | |

## 22. Placements (College)

| Action | Status | Note |
|---|:---:|---|
| Add / edit a recruiting company or drive | ✅ | |
| Auto-check a student's eligibility (CGPA/backlogs) | ✅ | |
| Student applies to a drive | ✅ | |
| Staff review applications & roster | ✅ | |
| Record an interview result / offer | ✅ | |
| Withdraw an application | ✅ | |

## 23. Alumni

| Action | Status | Note |
|---|:---:|---|
| View the alumni directory | ✅ | |
| Add / edit / remove an alumni record | ✅ | |
| Alumni auto-added when a student graduates | ✅ | |
| Create an alumni event | ✅ | |
| RSVP to an event | ✅ | |
| Track donations | ❌ | Not built |

## 24. Certificates

| Action | Status | Note |
|---|:---:|---|
| Manage certificate templates | ✅ | |
| Preview a certificate before issuing | ✅ | |
| Issue a certificate with real student data | ✅ | No fake/placeholder data |
| View issuance history & reprint | ✅ | |
| Download as a real PDF | 🟡 | Browser print only |
| Student/parent views their own issued certificate | ❌ | Only staff with certificate permissions can view/issue — no self-service access for the student/parent it belongs to |

## 25. Compliance

| Action | Status | Note |
|---|:---:|---|
| Enrollment summary report | ✅ | |
| Attendance summary (date range) | ✅ | |
| Fee compliance summary | ✅ | |
| File directly with a government/statutory system (e.g. UDISE+) | ❌ | Dashboards only, no filing integration |

## 26. Document Center

| Action | Status | Note |
|---|:---:|---|
| Upload a document | ✅ | |
| Search / filter documents | ✅ | |
| Keep version history | ✅ | |
| Download a document (direct or shareable link) | ✅ | |
| Archive / restore / delete a document | ✅ | |
| Verify a document hasn't been tampered with | ✅ | |
| Restrict a document to staff-only | ✅ | |

## 27. Reports & Analytics

| Action | Status | Note |
|---|:---:|---|
| KPI dashboard | ✅ | |
| Build a custom report (academic/finance/ops) | ✅ | |
| Export a report to Excel/CSV | ✅ | |
| Export a report as a real PDF | 🟡 | Button says PDF, actually opens the browser's print dialog |
| Per-module reports (attendance, teacher workload, fees) | ✅ | |
| Schedule a report to auto-email recipients | ✅ | |

## 28. Approvals Inbox

| Action | Status | Note |
|---|:---:|---|
| See a list of pending approvals | ✅ | |
| Approve / reject with remarks | ✅ | |
| Leave requests flow into this inbox | ✅ | |
| Admissions approvals flow into this inbox | ❌ | Admissions has its own separate approval screen instead |
| Fee-refund / attendance-correction approvals flow into this inbox | ❌ | Those workflows don't exist as separate request types yet |

## 29. Users, Roles & Permissions

| Action | Status | Note |
|---|:---:|---|
| Create a user & assign a role | ✅ | |
| Edit a user's details/roles | ✅ | |
| Deactivate / delete a user | ✅ | Deactivation actually blocks that user's login |
| Admin resets another user's password | ✅ | |
| Create / edit custom roles & permissions | ✅ | |

## 30. Audit Logs

| Action | Status | Note |
|---|:---:|---|
| View a log of who-did-what | ✅ | |
| Filter by user/module/action/date | ✅ | |
| Export the log (CSV/JSON) | ✅ | |
| Security-events view (stricter access) | ✅ | |

## 31. Background Jobs (admin-only)

| Action | Status | Note |
|---|:---:|---|
| Automatic nightly database backup | ✅ | |
| View job queue / retry / failure status | ✅ | |
| Report-card generation job does real work when run | ✅ | Not simulated — genuinely builds the report cards |
| Notification-delivery job does real work when run | ✅ | Not simulated — genuinely sends the queued notifications |
| Recurring/scheduled jobs on a custom cron pattern | 🟡 | Only a few common recurrence patterns are supported, not a full custom schedule |

## 32. Integrations (admin-only)

| Action | Status | Note |
|---|:---:|---|
| Connect an SMS provider (Fast2SMS/MSG91/Twilio) | ✅ | Requires the school's own provider account |
| Send a test SMS | ✅ | |
| Connect a payment gateway | ❌ | Not built |
| Configure outgoing webhooks to another system | ✅ | |

## 33. Data Import / Export

| Action | Status | Note |
|---|:---:|---|
| Export data to Excel | ✅ | |
| Export data to CSV | ✅ | |
| Import data from CSV | ✅ | |
| Import data from an Excel file (`.xlsx`/`.xls`) | ✅ | |
| Import errors are shown per-row (not just "failed") | ✅ | |

## 34. System Settings

| Action | Status | Note |
|---|:---:|---|
| Edit institution profile & logo | ✅ | |
| Edit school-wide configurable settings | ✅ | |
| Backup / restore from the settings screen | ✅ | |

---
**Companion to `FEATURE_CHECKLIST_SIMPLE.md`** (one line per capability, no operation-level detail). Both derive from the engineering findings in `docs/REQUIREMENTS_VERIFICATION.md` / `docs/DETAILED_FUNCTIONAL_CHECKLIST.md`, re-framed for feature completeness rather than bug/test status.
