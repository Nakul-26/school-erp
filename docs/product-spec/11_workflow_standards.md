# 11 - Workflow Standards

This document establishes the architecture for core workflows. Regardless of the business entity (Students, Teachers, Class Sections, or Fees), the workflow mechanics must follow these patterns.

---

## 🗃️ 1. Entity Management View Standard (CRUD Standard)
Every primary entity dashboard must implement this three-part layout structure:
*   **Page Header**: Screen title (`<h2>` or `<h1>`) with a descriptive, small subtitle beneath, small KPI metrics cards, and a primary CTA (e.g. "Add New Student").
*   **Search & Filters Toolbar**: Search input debounced at `300ms`, category filter dropdowns (e.g. Department, Status).
*   **Main Table / Grid View**: Lists rows with name, primary ID, status badge, and actions menu (View, Edit).
*   **Bulk Actions**: Multi-select checkboxes in the table header allowing bulk updates (e.g., Bulk Deactivate, Bulk Assign Class).

---

## 🎓 2. Onboarding Workflow Standard (Wizards)
When creating complex entities (like adding a Student or onboarding a Teacher), use a multi-step stepper wizard following this four-stage structure:
```
Personal Details ➔ Professional / Academic ➔ Account Setup ➔ Review & Confirm
```
*   **Step 1: Personal Details**: Captures name, optional middle name, email, phone, and biological details.
*   **Step 2: Professional / Academic**: Employee ID, Department, Subjects, Join Date (for Teachers) or Enrollment Class, Academic Year (for Students).
*   **Step 3: Account Setup**: An optional checkbox: **Create Login Account**. If checked: username/password inputs (pre-filled with auto-derived values, fully editable). If unchecked: "Login account will be created later" indicator.
*   **Step 4: Review & Confirm**: Displays a complete, readable read-only summary of all data entered before submission.

### Success Flow (The Success Dialog)
Upon successful API creation, do not redirect immediately. Show a success dialog containing:
*   A green confirmation checkmark.
*   The newly created entity name.
*   **Username** and **Temporary Password** (with individual "Copy" button indicators).
*   Actions: **Copy Credentials** (copies combined login text), **Print**, and **Send Later** (for SMS/Email delivery schedule).

---

## 🏛️ 3. Entity Details Hub Standard (Tabbed View)
The detail view for any major record (e.g., student profile, teacher file) must look like a dashboard hub:
*   **Hero Header**: Display name in large typography, status badge (e.g. `ACTIVE`, `ON_LEAVE`), profile emoji/avatar, and core metadata block (e.g. Department, Joined Date).
*   **Profile KPIs**: Small cards containing summary numbers (e.g. Attendance %, Class assignments count, Total paid fees).
*   **Tabs Navigation**: Height 52px navigation bar separating Profile Info, Academics/Assignments, Timeline Logs, Documents/Attachments, and Notes.
