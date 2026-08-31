# Sprint 1.2: Programs / Classes Review

This document defines the review checklist, configuration rules, and UI hubs needed to turn the Programs/Classes list into a highly flexible Academic Administration engine (supporting Schools, Colleges, and Universities).

---

## 🔍 1. Current UX & Gaps
*   **Terminology Adaptability**: School mode calls it "Class", College/University calls it "Program". The terms must change dynamically in UI texts, buttons, and titles based on `institution_type`.
*   **Missing Features**: Lacks switches for credit systems, electives eligibility, and semester structures. No description fields.
*   **No Detail Hub**: Currently just lists rows. Users cannot click to see mapped subjects grouped by semesters, or active sections with teacher mappings.
*   **Hard Deletes**: Direct deletes cause orphan references if subjects or student enrollments remain linked.

---

## 🔄 2. Administrator User Journey
1.  **View Hub Dashboard**: Admin lands on the page and sees total counts, active programs, and configuration statistics (Semester-based vs Year-based count).
2.  **Add Class/Program**: Admin opens the modal and fills in:
    *   Name (e.g. "B.E. Computer Science & Engineering" or "Grade 10")
    *   Code (e.g. `BE-CSE` or `CLASS-10`)
    *   Department mapping (optional dropdown)
    *   Duration in years (defaults to 1 for school, customizable for college)
    *   Toggles for Credit-based system, Semesters enabled, and Electives allowed.
3.  **View Program Detail Hub (Mini ERP inside the ERP)**: Clicking "View" opens a tabbed dossier modal containing:
    *   **Info Tab**: Displays structural parameters (Semesters, Credits, Electives).
    *   **Syllabus Tab**: Shows mapped subjects grouped by Academic Year / Semester (e.g. Year 1 - Semester 1, Year 1 - Semester 2), with student credit details.
    *   **Sections Tab**: Lists class sections mapped to this Program (e.g. "Section A", "Section B") with teacher allocations and student tallies.
    *   **Timeline Tab**: Audit logs (Provisioned, toggled status, syllabi modified).
4.  **Deactivate / Archive**: Soft-deactivates the program, blocking if active enrollments depend on it.

---

## 🚦 3. Business & Validation Rules
*   **Program Code Uniqueness**: Code must be unique within the institution.
*   **Archive Restriction**: Cannot archive a Program if active sections contain enrolled students.

---

## 🏁 4. Acceptance Criteria Checklist
- [ ] Database columns added to the `courses` table: `semester_enabled`, `credit_system_enabled`, `electives_enabled`, and `description`.
- [ ] Dynamic terminology (`Class/Classes` vs `Program/Programs`) applied based on `institution_type`.
- [ ] List page displays KPI count cards in the page header.
- [ ] HOD/Department filtering and status dropdown (Active vs Archived) filters.
- [ ] Add/Edit modals containing the toggle switches for Semesters, Credits, and Electives.
- [ ] Detail Hub Modal containing the Tabbed view:
  *   **Info**: Configurations and descriptions.
  *   **Syllabus**: Mapped subjects list grouped by year/semester.
  *   **Sections**: Active sections roster with student tallies and class teachers.
- [ ] Prevent program deactivation if active student enrollments depend on it.
- [ ] REST API endpoints updated to return paginated envelopes.
- [ ] Audit logs recorded on creation, updates, and status toggles.
- [ ] Responsive UI formatting with no nested scrollbars.
