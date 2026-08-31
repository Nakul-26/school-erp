# 51 - ERP Core Business Rules

This document details the logical invariants and validation parameters enforced across the School ERP. These rules must be satisfied by both frontend inputs and backend database queries.

---

## 🏛️ 1. Academic & Enrollment Rules
*   **Active Enrollments Limitation**: A student can have only one active record in the `student_enrollments` table during a specific Academic Year.
*   **Active Year Constraint**: The system must enforce that exactly one academic year has the `is_current = 1` status flag active.
*   **Section Roll Number Uniqueness**: A student's roll number must be unique within a specific class section.

---

## 👥 2. Administrative & Staff Rules
*   **Global Employee ID**: The `employee_id` field must be globally unique across the database, preventing duplicate ID assignments.
*   **Active Staff Restrict**: If a staff member's status is updated to `RESIGNED`, `RETIRED`, or `SUSPENDED`, their portal user login access must be deactivated instantly.

---

## 💰 3. Financial Rules
*   **Immutability**: Once a fee collection transaction is submitted and written, it is immutable. Deleting or directly editing transaction rows is disabled; adjustments require posting credit or debit entries.
*   **Max Billing boundaries**: Fee payments received must never exceed the remaining invoice balance due on a student account.

---

## 📝 4. Academic Assessments & Grading Rules
*   **Marks Cap**: Registered student marks must never exceed the maximum scores defined for the subject assessment configuration.
*   **Freezing Boundaries**: Modifications to student scores are blocked once an exam transitions to `FROZEN` status, unless overridden with coordinator approvals.
*   **Daily Attendance Caps**: Daily attendance records cannot be logged or modified for future dates.
