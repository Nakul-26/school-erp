# School ERP — UX Redesign Plan (V2)

> **Scope**: Frontend only. Zero backend or database changes needed.
> **Goal**: Make a powerful system feel simple.

---

## The Problem in Numbers

| What you have today | Count |
|---|---|
| Sidebar nav items (Admin view) | ~35 |
| Routes in App.tsx | 48 |
| Pages in /pages | 48 files |
| Backend modules | 34 |

A new user opens the ERP and is presented with **35 sidebar links**. That's the problem.

---

## Root Cause

The sidebar was built **table-by-table** as features were added, not **task-by-task** as a user thinks.

A school admin doesn't think:
> "I need to go to Programs → Sections → Teaching Allocations → Timetable Slots → Weekly Timetable"

They think:
> "I need to set up this year's timetable."

---

## The Fix: 3 Changes, Maximum Impact

### Change 1 — New Navigation Architecture

After (8 top-level items):
```
🏠  Dashboard
👨‍🎓  Students
👨‍🏫  Teachers
🏫  Academics         ← Classes, Subjects, Timetable
📅  Attendance
📝  Exams & Results
💰  Finance
⚙️  Settings & Setup  ← Everything internal
```

### Change 2 — Task-Based Pages

Replace "table viewer" pages with "job to be done" pages.
Pages to merge: Admissions (2→1), DataTools (2→1), Reports (3→1), Timetable (2→1), Finance (3→1), Attendance (2→1), Leave (3→1).

### Change 3 — Setup Checklist on Dashboard (replaces Workflows)

When a new school logs in, show a guided setup checklist on the Dashboard instead of an empty screen.

---

## Implementation Phases

### Phase 1 — Quick Wins (DONE)
- [x] Write this plan file
- [x] Refresh visual design (CSS)
- [x] Restructure sidebar (8 top-level groups, better labels)
- [x] Add Setup Checklist widget to Dashboard
- [x] Merge AdmissionInquiries + AdmissionApplications → Admissions.tsx
- [x] Merge DataExport + BulkImport → DataTools.tsx
- [x] Merge AttendanceReports + TeacherReports → Reports.tsx
- [x] Merge TimetableSlots + WeeklyTimetable → Timetable.tsx (tabs)

### Phase 2 — Core Simplification (DONE)
- [x] Merge Finance pages into Finance.tsx (3 tabs: Fee Plans, Student Fees, Fee Reports)
- [x] Merge Leave pages into Leaves.tsx (3 tabs: Leave Quotas, Leave Approvals, Student Leave)
- [x] Merge Attendance pages into Attendance.tsx (2 tabs: Student Attendance, Teacher Attendance)
- [x] Redesign Students page → hero "Add Student" with multi-step inline walkthrough form
- [x] Redesign Teachers page → hero "Add Teacher" with onboarding wizard walkthrough

### Phase 3 — Deep Simplification (IN PROGRESS)
- [x] Merge Programs + Classes + SectionWorkspace → Classes.tsx (Class Sections / Courses setup)
- [x] Merge Subjects + SubjectWorkspace + TeachingAllocationHub → Subjects.tsx (Subjects & Assignments)
- [ ] Add smart empty states / guided prompts to Timetable, Exams
- [x] Rename all internal terminology to plain English in navigation labels
- [x] Final sidebar restructure to 8 top-level items

### Phase 4 — Polish
- [ ] Onboarding wizard for new schools
- [ ] Contextual help tooltips on complex pages
- [ ] Mobile sidebar improvements

---

## Language Changes

| Old Term | New Label |
|---|---|
| Academic Year | School Year |
| Program | Course |
| Section | Class Section |
| Teaching Allocation | Subject Assignments |
| Enrollment | Class Assignment |
| HOD | Department Head |
| super_admin | Owner |
| Timetable Slots | Class Periods |

---

## What Does NOT Change

- ✅ All backend APIs — zero changes
- ✅ All database schemas — zero changes
- ✅ All business logic — zero changes
- ✅ All authentication & permissions — zero changes

---

## Success Metric

> "A school office staff member can admit a new student, take attendance, and collect a fee — without any training — in under 10 minutes."
