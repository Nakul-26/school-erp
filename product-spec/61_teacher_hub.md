# 61 - Teacher Hub Module Specification

The Teacher Hub enables administrators to manage teaching staff onboarding, subject assignments, timetables, and profile dossiers.

---

## 🎯 1. Business Goals
*   Automate teacher account provisioning to avoid orphaned profile entries.
*   Prevent department assignment to non-existent departments.
*   Track subjects and sections assigned to each teacher dynamically.

---

## 👥 2. Primary Users & Permissions
*   **Admin / HR**: Full control over staff onboarding, salary setup, profile editing, and system access.
*   **Academic Coordinators**: Read access to teacher lists, permission to manage subject and class timetable allocations.
*   **Teachers**: Read-only access to their own dashboard, schedule, and assigned class rosters.

---

## 📋 3. Key Workflows

### 1. View Profile Hub
Tabbed navigation for managing existing teacher profiles:
*   **Profile Tab**: Displays qualification transcripts, experience summaries, joining metrics, and personal records.
*   **Assignments Tab**: Table displaying Academic Year, Program/Class, Section, and Subject mapped. Includes "Assign Subject" modal triggers and "Remove Assignment" controls.
*   **Timetable Tab**: Displays the weekly schedule grid (Monday to Saturday) based on configured periods.
*   **Documents Tab**: File storage space for resumes, certificates, and ID verifications.
