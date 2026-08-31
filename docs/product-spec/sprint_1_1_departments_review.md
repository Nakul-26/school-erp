# Sprint 1.1: Departments Review

This document defines the review checklist, business specifications, and UI layouts to turn the simple Departments CRUD module into a production-ready system capability.

---

## 🔍 1. Current UX & Gaps
*   **Missing Fields**: Currently, the department record lacks Head of Department (HOD) selection, active teacher count statistics, and subject listings.
*   **Simple Deletion**: Deleting a department immediately sets `is_active = 0`. However, the system does not check if active teachers or program classes are linked to it, leading to broken referencing.
*   **Archival Navigation**: Archived departments (`is_active = 0`) are completely hidden. The administrator cannot view archives, nor can they restore a previously archived department.
*   **Edit Capabilities**: The page is list-only with no editing interface.

---

## 🔄 2. Administrator User Journey
1.  **View List / Stats**: Admin lands on the page and sees KPI cards (Total Departments, Total Active Teachers, Mapped Subjects) and a filters bar (Status: Active / Archived, Search input).
2.  **Create Department**: Admin clicks "Add Department", fills in Code (e.g. `CSE`), Name, Description, and selects an optional Head of Department from a dropdown of active teachers.
3.  **View Details Hub**: Clicking "View" on a department row opens a slide-over or detail view containing:
    *   **Info Tab**: Code, Name, Description, and current HOD details.
    *   **Teachers Tab**: Roster list showing names, designations, and employee IDs of teachers mapped to this department.
    *   **Subjects Tab**: Roster list of subjects mapped to this department.
    *   **Timeline Tab**: Chronological audit list of updates (e.g. Created, HOD assigned, department status toggled).
4.  **Edit details**: Admin can change name, description, or HOD.
5.  **Archive / Restore**: Admin toggles status. The system prevents deactivation if courses or active enrollments remain mapped to it.

---

## 🚦 3. Business & Validation Rules
*   **Code Uniqueness**: The department `code` (e.g. `CSE`) must be unique across the institution.
*   **HOD Constraints**: HOD can only be selected from the list of active teachers within the same institution.
*   **Archival Prevention**: If a department has active courses/programs or teachers linked to it, deactivation is blocked, prompting: *"Cannot archive department. Active course/program references exist."*

---

## 🏁 4. Acceptance Criteria Checklist
- [ ] Add `head_teacher_id` column to the `departments` table.
- [ ] Update frontend `Departments.tsx` to query and show active/archived departments with a status filter dropdown.
- [ ] Implement HOD selection from a listing of active teachers.
- [ ] Prevent department deactivation if active courses/programs reference it.
- [ ] Render KPI cards in the page header:
  *   Total Departments
  *   Total Active Teachers
  *   Total Mapped Subjects
- [ ] Add "Edit Department" action modal.
- [ ] Build the Department Details Hub modal (Info, Teachers list, Subjects list, Timeline logs).
- [ ] Audit logs recorded for all operations (`CREATE_DEPARTMENT`, `UPDATE_DEPARTMENT`, `ARCHIVE_DEPARTMENT`, `RESTORE_DEPARTMENT`).
- [ ] Responsive CSS layout with no nested scrollbars.
- [ ] Type check and compiler build checks pass without warnings.
