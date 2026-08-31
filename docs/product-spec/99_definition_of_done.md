# 99 - Definition of Done

This document establishes the acceptance checklist that every feature must fully satisfy before being marked as "Done". No task is complete until all categories verify successfully.

---

## ⚙️ 1. Functional Verification
*   **CRUD Operations**: Basic create, read, update, and delete actions function correctly without console warnings or runtime failures.
*   **Data Validation**: Dynamic field boundaries (lengths, email schemas, duplicate checks) enforce properly on both client forms and server endpoints.
*   **Role Permission Blocks**: Access rules restrict actions to permitted roles only, returning clean `403 Forbidden` messages when unauthenticated actions occur.
*   **Tenant Isolation**: All read/write database actions verify parameters by extracting `institution_id` from the secure JWT, ensuring total data segregation.

---

## 🎨 2. UX & Aesthetics
*   **Aesthetic Branding**: UI layout uses brand-specific colors, hover states, rounded corners, shadows, and Google Fonts.
*   **No Nested Scrollbars**: Scrolling boundaries lock to the screen viewport (`100vh`). Content lists wrap or paginate, and cards fit content dynamically.
*   **Empty and Loading States**: Displays custom placeholders when empty (with action CTAs) and uses loading skeletons or spinners on state transitions.
*   **Responsive Fluidity**: Column structures collapse, menus toggle, and forms stack cleanly on tablets and mobile screens.

---

## 🛠️ 3. Engineering & Clean Code
*   **TypeScript Checks**: Source files must pass compiler typecheck blocks (`tsc --noEmit`) with zero errors.
*   **Testing Coverage**: All assertions and integration test runs pass successfully.
*   **Audit Logging**: Database adjustments write descriptive event rows in the system audit logs.
*   **Documentation Alignment**: Related PRDs and table structures are updated to match the changes.

---

## 📋 4. Product Quality
*   **User Stories Alignment**: The implementation behaves exactly as described in user lifecycle specifications.
*   **Common Patterns**: Skeletons match standard lists, detail profiles, tabs, notes, and timelines layouts.
*   **Acceptance Checklists**: Specific ticket acceptance goals verify successfully.
