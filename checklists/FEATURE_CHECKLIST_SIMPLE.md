# TrackFlow — MVP Feature Checklist (Simple)

**Purpose:** a plain, non-technical answer to "can our school/college actually do X in TrackFlow?" — one line per capability. No bug reports, no dates, no code references. For the operation-level version of this same list (add/edit/delete/view, per module), see `FEATURE_CHECKLIST_DETAILED.md` in this folder.

**As of:** 2026-08-31, based on the engineering review in `docs/REQUIREMENTS_VERIFICATION.md` / `docs/DETAILED_FUNCTIONAL_CHECKLIST.md`, re-read and re-framed purely around "does the feature exist," not "has it been tested." Updated later the same day after a pass that verified every 🟡 "not independently confirmed" item and implemented the no-external-blocker ❌ gaps (see the bottom-line note).

**Legend:** ✅ Yes, available · 🟡 Available with a real limitation (noted) · ❌ Not available yet

---

## Setup & Access

| Capability | Status | Note |
|---|:---:|---|
| One platform, many schools/colleges (multi-institution) | ✅ | A platform admin can add, view, and remove institutions |
| Staff log in with role-based permissions | ✅ | Different roles (admin, principal, teacher, accountant, student, parent...) see different things |
| A new school/college can sign itself up | ✅ | Self-service registration page |
| Academic year & calendar setup | ✅ | Years, holidays/events, year-end rollover / promotion wizard |
| Parent/student self-service dashboard | ✅ | Own (or per-child) attendance %, fee due/paid, and recent exam results — doesn't yet show upcoming events/holidays |
| Student/parent views their own class timetable | ✅ | Dedicated "My Timetable" page; a parent with multiple children switches between them |

## Admissions

| Capability | Status | Note |
|---|:---:|---|
| Track inquiries and applications | ✅ | Kanban-style board |
| Approve an application into a real student record | ✅ | |
| Reject an application | ✅ | |
| Attach documents to an inquiry/application | ✅ | Staff can upload/download files (birth certificate, photo, etc.) directly on an inquiry or application |

## People Management

| Capability | Status | Note |
|---|:---:|---|
| Manage students (add, edit, search, archive, bulk import) | ✅ | Includes profile photo and emergency contact / blood group info |
| Manage teachers & staff (add, edit, search, archive, bulk import) | ✅ | |
| Manage guardians / parent contacts | ✅ | |
| Generate a printable student ID card | ✅ | |
| Formal student transfer/withdrawal workflow | 🟡 | Status can be flipped to Transferred/Withdrawn, but there's no guided workflow (reason, destination school, auto-generated Transfer Certificate) |

## Academics

| Capability | Status | Note |
|---|:---:|---|
| Manage classes, sections, subjects | ✅ | |
| Build a weekly timetable | ✅ | |
| Take & track daily attendance | ✅ | |
| Conduct exams and enter marks | ✅ | |
| Generate report cards (single or whole-class) | ✅ | |
| Report cards as a real downloadable PDF | 🟡 | Currently print-from-browser only, not a saved PDF file |
| Post homework and share study materials | ✅ | |

## College-Specific

| Capability | Status | Note |
|---|:---:|---|
| Semesters, credits, SGPA/CGPA | ✅ | |
| Backlog / re-exam tracking | ✅ | |
| Elective subject registration | ✅ | |
| Course prerequisites | ✅ | |
| Placement drives & student applications | ✅ | |

## Finance

| Capability | Status | Note |
|---|:---:|---|
| Set up fee structures and track dues | ✅ | |
| Record fee payments (cash/manual/offline) | ✅ | |
| View / print a payment receipt | ✅ | Browser-print only, not a downloadable PDF file |
| Accept fee payments online (card/UPI) | ❌ | Needs a payment gateway account (Razorpay/Stripe) before this can be built |
| Automatic fee-due reminder to parents/students | ✅ | Daily job now sends a real in-app + email + push notification to the student and their guardians for each overdue fee (throttled to once per 24h per fee) |
| Run payroll for staff | ✅ | |
| Full double-entry accounting ledger | ✅ | |

## Communication

| Capability | Status | Note |
|---|:---:|---|
| Announcements to students/staff/parents | ✅ | |
| Direct messaging between users | ✅ | |
| Broadcast email to a group | ✅ | |
| Broadcast SMS / WhatsApp | ❌ | Doesn't actually send yet — needs a real SMS/WhatsApp provider account |
| Push notifications to phone/browser | ✅ | |
| Instant (real-time) delivery of messages/alerts | 🟡 | Everything updates every few seconds, not instantly |

## Campus Operations

| Capability | Status | Note |
|---|:---:|---|
| Library (catalog, issue/return, fines) | ✅ | |
| Transport (routes, student allocation, billing) | ✅ | |
| Hostel (rooms, allotment, capacity limits) | ✅ | |
| Canteen (meal-plan subscriptions & billing) | 🟡 | No per-item purchase or student wallet — subscription billing only |
| Visitor log (check-in/checkout) | ✅ | Search by name/phone/host/purpose plus a date-range filter |
| Asset tracking | ✅ | |

## Student Life & Records

| Capability | Status | Note |
|---|:---:|---|
| Alumni directory & events | ✅ | Alumni are also added automatically when a student graduates |
| Track alumni donations | ❌ | Not built |
| Certificates & ID cards with real student data | ✅ | |
| Certificates as a real downloadable PDF | 🟡 | Currently print-from-browser only |
| Student/parent views their own issued certificates | ✅ | Dedicated "My Certificates" self-service page; staff-only issuing is unchanged |

## Compliance & Reporting

| Capability | Status | Note |
|---|:---:|---|
| Compliance dashboards (enrollment/attendance/fees) | ✅ | |
| Direct government/statutory filing (e.g. UDISE+) | ❌ | Dashboards only — no direct filing integration |
| Custom reports & KPI dashboards | ✅ | |
| Reports auto-emailed on a schedule | ✅ | |
| Document storage with access control | ✅ | Can restrict a document to staff-only |

## Administration

| Capability | Status | Note |
|---|:---:|---|
| Central inbox for pending approvals | 🟡 | Only leave requests flow through it today — admissions/fee-refunds still use their own screens |
| User & role management | ✅ | |
| Admin resets another user's password | ✅ | Generates a temp password and hands it to the admin (best-effort emails it too) |
| Audit trail of who-did-what | ✅ | |
| Automatic nightly backups | ✅ | |
| Background jobs actually do real work (report-card generation, notification delivery) | ✅ | Not simulated — genuinely builds report cards / sends queued notifications when run |
| Connect an SMS provider / external webhooks | ✅ | Once the school has its own provider account |
| Connect a payment gateway | ❌ | Same gateway-account blocker as online fee payment above |
| Import/export data (Excel/CSV) | ✅ | |

---

**Bottom line for an MVP launch:** every core school/college workflow (admissions → students → academics → attendance → exams → fees → communication → facilities) is present and usable. As of 2026-08-31, the remaining gaps are all things that need something *external* to build (a payment gateway account, an SMS/WhatsApp provider account, a government filing integration) or were knowingly left out as bigger, separate features (real-time delivery, donations tracking, canteen wallet/POS, downloadable PDFs instead of browser-print, a formal transfer/withdrawal workflow, routing admissions/fee-refund approvals through the central Approvals Inbox). The genuine no-external-blocker oversights found in the previous pass — fee-due reminders not actually notifying anyone, students/parents unable to view their own certificates, no visitor-log search, no bulk teacher↔subject assignment, no admission document uploads, and no student/parent timetable view — have all been fixed and tested.
