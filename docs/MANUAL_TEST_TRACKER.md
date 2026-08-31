# Manual Test Tracker — TrackFlow

Working checklist for hands-on browser testing. This supersedes the short list in
`PRE_LAUNCH_CHECKLIST.md` §1 with a full module-by-module breakdown (every page in the app).
Nothing here has been clicked through by a human yet — everything was previously verified only
by type-checking and automated tests.

**How to use this file:** work top to bottom, check items off as `[x]` as you verify them. If
something is broken, don't fix it yourself — leave it unchecked and add a one-line note under it
(what you did, what you expected, what happened), e.g.:
```
- [ ] Create a fee structure
      NOTE: Save button does nothing, no error shown, console has a 400.
```
Then tell me and I'll fix it. Re-test and check it off once confirmed.

Suggested login setup before starting: one Admin account, one Teacher account, one Student
account, one Parent account, and (if payroll/accounting matter to you) one Accountant account —
all in the same test institution.

---

## 0. Environment sanity

- [ ] `wrangler dev` (or deployed URL) loads the login page with no console errors
- [ ] Login as Admin succeeds and lands on `/dashboard`
- [ ] Browser back/forward buttons behave sanely across a few page changes
- [ ] Resize to a phone-width window — sidebar/nav still usable (schools will have staff on phones)

## 1. Auth & access

- [ ] Log in with correct credentials
- [ ] Log in with wrong password — get a clear error, not a blank/broken screen
- [ ] Log out — actually lands back on `/login`, and browser-back doesn't reveal protected pages
- [ ] Visit a protected URL directly while logged out — redirected to `/login`, not an error page
- [ ] Visit a page your role isn't allowed (e.g. Teacher hitting `/access-control`) — lands on
      `/access-denied`, not a crash
- [ ] Forgot password: request reset (needs `RESEND_API_KEY` set) — email arrives, link works,
      new password logs in
- [ ] Reset-password link after it's already been used once — fails gracefully, not a crash
- [ ] Profile page: view own profile, change own password, changes persist after refresh

## 2. Dashboard

- [ ] Admin/Principal dashboard: stats (student count, staff count, fee collection, etc.) look
      plausible for the data actually entered
- [ ] Teacher dashboard: shows only their own classes/sections, not the whole school
- [ ] Student dashboard: shows their own attendance/fees/homework, nothing else
- [ ] Parent dashboard: shows their child's data (test with a parent linked to 2+ children if you
      have one, to confirm the child-switcher works)
- [ ] All dashboard widget links actually navigate somewhere real (no dead links)

## 3. Institution & academic setup

- [ ] Institution Setup: edit school name/address/logo, confirm it saves and shows elsewhere
      (e.g. report card header, login page branding if applicable)
- [ ] School Setup wizard (if first-run): complete it end to end
- [ ] Academic Setup: create/edit an academic year, term/semester structure
- [ ] Academic Years page: set a year as "current", confirm the rest of the app respects it
- [ ] Departments: create, edit, delete a department
- [ ] Academic Calendar: add a holiday and a term date, confirm they show correctly
- [ ] Grade Settings (Settings → Grades tab): set grade boundaries (A+/A/B+...), confirm they
      match what a real report card later shows

## 4. Admissions

- [ ] Create an inquiry
- [ ] Convert inquiry → application
- [ ] Approve application → confirm a real student record is created with correct class/section
- [ ] Reject an application — confirm it doesn't silently create a student anyway
- [ ] Check the generated admission number looks right (format, no collisions)

## 5. Students

- [ ] Add a student manually (single-entry form/wizard)
- [ ] Bulk import students via Excel (Students → Import) — check a deliberately bad row (missing
      required field) gets rejected with a useful error, not a silent partial import
- [ ] Edit a student's details, confirm changes save
- [ ] Open Student Details: all tabs load (profile, attendance, fees, health/medical, documents,
      academic history) without errors
- [ ] Upload a document to a student record, confirm it's retrievable after
- [ ] Health/Medical tab: add a record, confirm it saves
- [ ] Search/filter the student list (by class, section, name) — results are correct
- [ ] Deactivate/transfer-out a student — confirm they disappear from active rosters but history
      is preserved

## 6. Teachers / staff

- [ ] Add a teacher, assign to a department
- [ ] Edit teacher details, confirm changes save
- [ ] Open Teacher Details: all tabs load (profile, classes assigned, attendance, leave history,
      documents, research/publications if applicable)
- [ ] Assign a teacher as class/section in-charge

## 7. Classes, sections, subjects, timetable

- [ ] Create a class, add sections to it
- [ ] Open a Section Workspace — students list, timetable, subjects all show correctly
- [ ] Create a subject, assign it to a class
- [ ] Open Subject Workspace for one subject
- [ ] Assign a teacher to a subject/section (Academic Setup → assignments)
- [ ] Build a timetable: add periods across the week, confirm no double-booking of a teacher is
      silently allowed (or that it warns you)
- [ ] View the timetable as a Teacher — see only their own periods
- [ ] View the timetable as a Student — see their section's full timetable

## 8. Attendance

- [ ] Mark attendance as Teacher for a real section, a real day
- [ ] Edit an already-marked day's attendance — confirm the change sticks
- [ ] Mark attendance for a future date — confirm it's blocked or at least warns
- [ ] View attendance report for a student (Student Details → attendance tab) — percentage matches
      manual math
- [ ] Teacher attendance (staff self/marked-by-admin) — mark and verify
- [ ] Student Leave Approvals: student/parent submits a leave request, teacher/admin approves or
      rejects it, attendance reflects it correctly

## 9. Exams, grading, report cards

- [ ] Create an exam (name, term, classes included)
- [ ] Enter marks for a section/subject
- [ ] Enter an out-of-range mark (e.g. 150/100) — confirm it's rejected, not silently accepted
- [ ] Generate a report card for one student — grade boundaries match Grade Settings, GPA/SGPA
      math looks right if applicable
- [ ] Print/export the report card (PDF) — layout isn't broken, school name/logo shows
- [ ] Generate report cards in bulk for a whole section
- [ ] Backlogs: mark a student with a backlog subject, confirm it shows on their transcript record
- [ ] Transcript generation (if used at your school level) — spot check the output

## 10. Homework & study materials

- [ ] Teacher posts homework to a section — students in that section see it, other sections don't
- [ ] Student marks homework as done / submits (if that flow exists) — teacher sees submission
- [ ] Teacher uploads study material (file) — students can view/download it
- [ ] Delete a homework/material post — confirm it disappears for students too

## 11. Fees, finance, accounting, payroll

- [ ] Create a fee structure for a class (tuition + any extra heads)
- [ ] Assign/apply the fee structure to a student
- [ ] Collect a payment (cash/manual entry) against a student's fees
- [ ] Print/download the payment receipt — amounts and school details are correct
- [ ] Partial payment — confirm remaining balance is tracked correctly, not marked fully paid
- [ ] View a student's fee history from both Admin side and Parent/Student login
- [ ] Finance overview page: totals reconcile with the individual payments entered
- [ ] GL Accounting: post an entry, confirm it appears in the ledger correctly balanced
- [ ] Salary Structures: create one, assign to a staff member
- [ ] Payroll Runs: run payroll for a period, open the run detail, confirm calculated amounts look
      right (basic + allowances - deductions)
- [ ] Download a payslip from a payroll run

## 12. Leave management

- [ ] Leave Types: create a type (e.g. Casual Leave) with an allowed quota
- [ ] Staff: apply for leave (My Leave Applications)
- [ ] Admin/HOD: approve or reject a pending leave (Leave Approvals) — quota decrements correctly
- [ ] Apply for more leave than remaining quota — confirm it's flagged, not silently approved

## 13. Communication

- [ ] Post an announcement targeted at a specific class — only that class's students/parents see
      it, others don't
- [ ] Post a school-wide announcement — everyone sees it
- [ ] Send a broadcast (SMS/email/push, whichever configured) — confirm delivery if credentials
      are set, or a sane "not configured" message if not
- [ ] Direct message between two users (Messaging/Communication inbox) — send, receive, confirm
      real-time or refresh-based delivery works
- [ ] Message Templates: create a template, use it when sending a broadcast
- [ ] Notifications: trigger something that generates a notification (e.g. new announcement),
      confirm it shows up in the bell/notifications panel for the right users

## 14. Library

- [ ] Add a book to the catalog
- [ ] Issue a book to a student
- [ ] Return a book — confirm due-date/fine logic (if any) works
- [ ] Search the catalog

## 15. Transport

- [ ] Add a route/vehicle
- [ ] Assign a student to a route
- [ ] Confirm the assignment shows on the student's record

## 16. Hostel

- [ ] Add a hostel/room/bed
- [ ] Allot a student to a room
- [ ] Vacate/transfer a student out of a room, confirm the bed frees up for reallocation

## 17. Canteen

- [ ] Add a menu item
- [ ] Record a transaction/order against a student (if wallet-based, confirm balance deducts
      correctly)

## 18. Visitors

- [ ] Log a visitor entry
- [ ] Log their exit/checkout time
- [ ] Search past visitor logs by date/name

## 19. Assets

- [ ] Add an asset (e.g. a lab equipment item) with a category
- [ ] Edit/retire an asset, confirm it's reflected in the asset list

## 20. Placements

- [ ] Add a company/drive
- [ ] Register eligible students for a drive
- [ ] Mark placement results (placed/not placed), confirm it shows on the student's record

## 21. Alumni

- [ ] Convert or add a graduated student to Alumni
- [ ] Edit alumni contact/employment info
- [ ] Search/filter the alumni directory

## 22. Certificates

- [ ] Generate a certificate (e.g. Bonafide/Transfer Certificate) for a student
- [ ] Confirm the PDF output has correct student data, school letterhead, and no placeholder text
      left in (like "{{name}}" leaking through)

## 23. Compliance

- [ ] Open the Compliance page, confirm whatever reports/checklists it tracks reflect real data
- [ ] If it generates a regulatory report/export, open the export and sanity-check it

## 24. Document Center

- [ ] Upload a document at the institution level
- [ ] Confirm role-based visibility (a doc marked staff-only doesn't show to students/parents)
- [ ] Download a previously uploaded document

## 25. Reports & Analytics Center

- [ ] Reports page: run an attendance report for a date range, numbers match manual spot-check
- [ ] Run a fee-collection report, totals reconcile with Finance module
- [ ] Analytics Center: charts/stats load without errors and look plausible (not all zeros/NaN)
- [ ] Export a report to Excel/PDF — file opens correctly, data matches on-screen

## 26. Approvals Inbox

- [ ] Trigger something that needs approval (e.g. a leave request, an admission, a fee waiver —
      whatever routes through this module) and confirm it appears here
- [ ] Approve and reject one each, confirm downstream state updates correctly

## 27. Access control / user management

- [ ] Manage Users: create a new staff login, assign a role
- [ ] Confirm that role's permissions actually apply (log in as that user, check they can/can't do
      the right things — cross-reference the `allowedRoles` restrictions in the routes)
- [ ] Deactivate a user — confirm they can no longer log in
- [ ] Reset another user's password as Admin

## 28. Audit Logs

- [ ] Perform a few actions (edit a student, approve a leave), confirm they show up in Audit Logs
      with correct actor, timestamp, and action description

## 29. Job Center

- [ ] Open Job Center, confirm background jobs (e.g. bulk import, report generation) show status
      correctly and don't get stuck in "pending" forever
- [ ] If it lists the nightly backup cron job, confirm a run shows up after the Cron Trigger fires
      (only testable after real deployment — see `PRE_LAUNCH_CHECKLIST.md` §5)

## 30. Integration Center

- [ ] Configure an SMS provider (once you have credentials) and send a test message
- [ ] Configure any webhook integration in use, confirm it fires on the right event

## 31. Data Tools

- [ ] Export students to Excel, confirm columns/data are correct
- [ ] Import a small test batch, confirm validation errors are clear on a deliberately bad file
- [ ] Confirm imported records are correctly scoped to your institution (not visible to other
      test institutions if you have more than one)

## 32. System Settings

- [ ] Walk every tab in Settings, confirm each saves independently without resetting the others
- [ ] Change a setting, refresh the page, confirm it persisted (not just client-side state)

## 33. Cross-role spot checks (do this last, after individual modules pass)

- [ ] As Teacher: confirm you cannot see/edit students outside your assigned classes
- [ ] As Student: confirm you cannot see other students' grades, fees, or attendance
- [ ] As Parent: confirm you only see your own child(ren), and only read access where appropriate
      (e.g. can view but not edit attendance)
- [ ] As Accountant (if used): confirm access to Finance/Payroll but not academic modules like
      Exams or Attendance marking
- [ ] Try navigating directly by URL to a page above your role's permission — confirm you're
      blocked, not just hidden from the nav menu

---

## Notes / bugs found during testing

*(Add dated entries here as you go — makes it easy for me to pick them up.)*

---
*Created 2026-08-14. Companion to `PRE_LAUNCH_CHECKLIST.md` (which stays high-level) and
`CREDENTIALS_CHECKLIST.md` (external keys). This file is the granular per-feature tracker —
work through it at your own pace, mark items as you verify them, and flag anything broken.*
