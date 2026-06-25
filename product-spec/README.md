# School ERP - Product Specification Index

Welcome to the living Product Requirements Document (PRD) and specification system for the School ERP. This directory acts as the single source of truth for the codebase, detailing our target vision, visual guidelines, coding rules, core lifecycles, and acceptance criteria.

---

## 📂 Five-Layer Specification Tree

### 🌟 Layer 1: Vision & Design (00-09)
*   **[00 Product Vision](file:///D:/nakul/simple_erp/product-spec/00_vision.md)**: Product scope, multi-tenant database isolation, and architecture pillars.
*   **[01 Design Principles](file:///D:/nakul/simple_erp/product-spec/01_design_principles.md)**: 3-click goal targets, state preservation, and visual contrast hierarchies.
*   **[02 Design System](file:///D:/nakul/simple_erp/product-spec/02_design_system.md)**: Standard typography, colors palette tokens, shadows, and grid borders.

---

### 🎨 Layer 2: UX Standards (10-19)
*   **[10 UX Rules](file:///D:/nakul/simple_erp/product-spec/10_ux_rules.md)**: Viewport boundaries (no nested scrollbars), locked tab sizes (52px), dynamic card height fits, and empty states.
*   **[11 Workflow Standards](file:///D:/nakul/simple_erp/product-spec/11_workflow_standards.md)**: Skeletons for CRUD dashboard list headers, multi-stage onboarding wizards, and detail profile tabs.
*   **[12 User Personas](file:///D:/nakul/simple_erp/product-spec/12_personas.md)**: Principal, Teacher, Accountant, and Parent roles goals and context limits.

---

### ⚙️ Layer 3: Engineering Standards (20-39)
*   **[20 API Standards](file:///D:/nakul/simple_erp/product-spec/20_api_standards.md)**: REST paths, query lists formats (paginated JSON envelopes, sort/filters), and JWT institution bounds.
*   **[21 Database Standards](file:///D:/nakul/simple_erp/product-spec/21_database_standards.md)**: Required columns (audit logs attributes, soft deletes), cascades boundaries, and index mappings.
*   **[22 Backend Architecture](file:///D:/nakul/simple_erp/product-spec/22_backend_architecture.md)**: Boundaries separating Http Controllers (Routes), Business Logic (Services), and prepared SQL calls (Repositories).
*   **[23 Frontend Architecture](file:///D:/nakul/simple_erp/product-spec/23_frontend_architecture.md)**: Component directory layers, services encapsulation, and contexts rules.
*   **[24 Security Standards](file:///D:/nakul/simple_erp/product-spec/24_security.md)**: Safe parameter binding queries, JWT tokens verification checkpoints, and RBAC middlewares.
*   **[25 Performance Guidelines](file:///D:/nakul/simple_erp/product-spec/25_performance.md)**: JS asset chunk sizes, WebP compressions, DB query time parameters, and lazy fetching.
*   **[26 Testing Protocols](file:///D:/nakul/simple_erp/product-spec/26_testing.md)**: Vitest unit testing, mock DB seed fixtures scripts, compiler validations, and input forms testing.
*   **[27 Accessibility Standards](file:///D:/nakul/simple_erp/product-spec/27_accessibility.md)**: WCAG color contrast guidelines, keyboard tab navigations, focus outline rings, and semantic landmarks.
*   **[30 Common UI Patterns](file:///D:/nakul/simple_erp/product-spec/30_common_patterns.md)**: Visual layouts blueprints for listing matrices, hubs, timelines streams, and notes entries logs.

---

### 🔄 Layer 4: Business Processes (40-59)
*   **[40 Admissions Process](file:///D:/nakul/simple_erp/product-spec/40_admissions_process.md)**: Step-by-step student onboarding pipeline from verification to ledger billing creation.
*   **[41 Academic Year Rollover](file:///D:/nakul/simple_erp/product-spec/41_academic_year_rollover.md)**: Year rollover sequences (cloning syllabus, checking balances warnings, inactive promotions archives).
*   **[42 Teacher Lifecycle](file:///D:/nakul/simple_erp/product-spec/42_teacher_lifecycle.md)**: Recruitment, credentials setups, assignments mapping, timetables, and resignation archives.
*   **[43 Exam Lifecycle](file:///D:/nakul/simple_erp/product-spec/43_exam_lifecycle.md)**: Draft configs, published notifications, teacher spreadsheet entries, coordinators freezing blocks, and portal publish.
*   **[44 Fee Collection Process](file:///D:/nakul/simple_erp/product-spec/44_fee_collection_process.md)**: Bill invoicing cycles, sibling discount mappings, payment logs, and cash receipt creation.
*   **[51 Core Business Rules](file:///D:/nakul/simple_erp/product-spec/51_business_rules.md)**: Hard logical rules (singular active enrollments, unique IDs, immutable payment rows).
*   **[52 State Machines](file:///D:/nakul/simple_erp/product-spec/52_state_machines.md)**: Transitions definitions for student registers, teacher statuses, exams entries, and fee invoices.

---

### 📂 Layer 5: Module Specifications (60-79)
*   **[60 Student Hub](file:///D:/nakul/simple_erp/product-spec/60_student_hub.md)**: Roster tabs, guardians links, and profile fields definition.
*   **[61 Teacher Hub](file:///D:/nakul/simple_erp/product-spec/61_teacher_hub.md)**: Teacher details rosters, schedules mapping, and assignments.
*   **[62 Attendance Tracker](file:///D:/nakul/simple_erp/product-spec/62_attendance.md)**: Daily student markers, absentees warnings dashboard metrics, and session records.
*   **[63 Exams Manager](file:///D:/nakul/simple_erp/product-spec/63_exams.md)**: Terms configurations, grade boundaries, and reports.
*   **[64 Fees Manager](file:///D:/nakul/simple_erp/product-spec/64_fees.md)**: Billing categories, collections setups, and receipt layouts.
*   **[65 Reports & Logs](file:///D:/nakul/simple_erp/product-spec/65_reports.md)**: Auditing views, cashier collections curves, and workloads tracking.
*   **[66 Institution Settings](file:///D:/nakul/simple_erp/product-spec/66_institution_settings.md)**: School profile records, year setups, calendar cycles, and role lists.

---

### 🗺️ Future Roadmap & Done Checklists (90-99)
*   **[90 Future Roadmap](file:///D:/nakul/simple_erp/product-spec/90_future_roadmap.md)**: Visual timetabling grid builders and notifications alert SMS/Email integrations.
*   **[99 Definition of Done](file:///D:/nakul/simple_erp/product-spec/99_definition_of_done.md)**: Enforced final acceptance checklist (Functional, UX, Engineering, Product).
