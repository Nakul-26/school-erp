# Sprint 1.3: Sections Review

This document defines the review checklist, business specifications, validation rules, and UI hubs needed to turn the simple Sections (Classes) list into a workflow-first Class/Section Administration engine.

---

## 🔍 1. Current UX & Gaps
*   **Missing Fields**: Currently, a section record has only `name` and `year_number`. It lacks max `capacity`, classroom `room` mapping, and `class_teacher_id` allocation.
*   **Terminology Confusion**: In school settings, we have a Class (Grade 10) and Sections (10-A, 10-B). In college/university environments, we have a Program (B.E. CSE), and within that, Classes/Sections (Year 3 - Section A). The frontend pages and texts should adapt clearly.
*   **Simple Deletion**: Soft deletes immediately set `is_active = 0` without verifying if active students are enrolled in this section or if timetables/assignments depend on it.
*   **Archival Navigation**: Archived/inactive sections are completely hidden, with no path for restoration.
*   **No Detail Hub**: Users cannot click a section to see its details, such as active student rosters, allocated subject teachers, or the weekly schedule.

---

## 🔄 2. Administrator User Journey
1.  **View Hub Dashboard**: Admin lands on the page and sees KPI cards (Total Sections, Avg Section Capacity, Sections without Class Teacher, Active Student Enrollments) and a filters bar (Academic Year, Program/Class, Status: Active/Archived, and Search input).
2.  **Add/Edit Class/Section**: Admin opens the modal and fills in:
    *   Name (e.g. "Section A" or "Section B")
    *   Academic Program/Class mapping (dropdown)
    *   Year/Semester mapping (if semester or year configuration is enabled)
    *   Classroom / Room (e.g., "Room 302" or "Block B - Lab 1")
    *   Max Student Capacity (INTEGER, e.g. 40)
    *   Class Teacher (Dropdown selecting from active teachers)
3.  **View Detail Hub (Mini ERP inside the ERP)**: Clicking "View" opens a tabbed details modal containing:
    *   **Info Tab**: Section specifications (Capacity, Room, Class Teacher, Program/Class, Academic Year).
    *   **Roster Tab**: Lists all students currently enrolled in this section (Name, Student ID, Email, Roll Number) with total active student counter (e.g., "34 / 40 enrolled").
    *   **Timetable Tab**: Displays the timetable slots or subject teacher allocations assigned to this section.
    *   **Timeline Tab**: Audit logs (Created, Teacher assigned, capacity updated, active status toggled).
4.  **Archive / Restore**: Admin toggles status. The system prevents deactivation if there are active students enrolled in this section.

---

## 🚦 3. Business & Validation Rules
*   **Section Uniqueness**: Within the same Academic Year and Program/Class, the Section Name must be unique (e.g., cannot create two "Section A" for "Grade 10" in 2026).
*   **Capacity Warning**: If active student enrollment count exceeds `capacity` during student section mapping, throw a validation warning or block enrollment.
*   **Active Class Teacher**: The class teacher must be an active teacher in the institution.
*   **Archive Protection**: Cannot deactivate or archive a section if active students (`is_active = 1` and not deleted) are enrolled in it.

---

## 🏁 4. Acceptance Criteria Checklist
- [ ] Database columns added to `sections` table: `capacity` (INTEGER), `room` (TEXT), `class_teacher_id` (TEXT, REFERENCES teachers(id)).
- [ ] Create a migration file `migration-sprint-1-3-sections.sql` and update the master `schema.sql` file.
- [ ] Extend backend `Section` type, `SectionRepository`, `SectionService`, and `SectionRepository` joins to fetch HOD/Class Teacher name.
- [ ] Prevent section deactivation if active student enrollments exist.
- [ ] Page-header KPI count cards implemented in `Classes.tsx`:
  *   Total Sections
  *   Average Section Capacity
  *   Sections without Class Teacher
  *   Active Students
- [ ] Filters bar (Academic Year, Program/Class, Status, Search) added to listing page.
- [ ] Create/Edit modal expanded to support Room, Capacity, and Class Teacher dropdown selection.
- [ ] Tabbed Details Hub Modal built:
  *   **Info**: Configurations, room, capacity status.
  *   **Roster**: List of enrolled students with roll numbers.
  *   **Timetable**: Schedule or subject teacher mapping.
  *   **Timeline**: Audit logs for the section.
- [ ] Audit logs recorded for all operations (`CREATE_SECTION`, `UPDATE_SECTION`, `ARCHIVE_SECTION`, `RESTORE_SECTION`).
- [ ] Type checks and compiler builds pass cleanly without warnings.
