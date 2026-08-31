# 23 - Frontend Architecture Standards

This document establishes clean architecture rules for React components, routing layouts, and data services in our frontend application.

---

## 🎨 Layout Hierarchy

Every screen view must implement a structured layout reflow:

```
┌──────────────────────────────────────────────┐
│  Layout (Sidebar Navigation & Sticky Header)  │
│  ┌────────────────────────────────────────┐  │
│  │ Page Page-Header & KPIs                │  │
│  ├────────────────────────────────────────┤  │
│  │ Filter Bar / Controls Toolbar          │  │
│  ├────────────────────────────────────────┤  │
│  │ Content Area (Scrollable body view)     │  │
│  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

---

## 🛠️ Folder & Layer Responsibilities

### 1. Page Views (`src/pages/*`)
*   **Role**: Top-level page targets linked directly by routes. Assemble layout structures and coordinate page-wide state.
*   **Rules**:
    *   *No inline `fetch()` or direct `axios`/HTTP calls.* All requests must go through the centralized service classes.
    *   Manage dialog/modal visibilities and pass down structured data to generic sub-components.

### 2. Services (`src/services/*`)
*   **Role**: Define network communication boundaries. Use a centralized API client instance (e.g. `api.ts`) containing common error handlers, headers, and token injections.
*   **Rules**:
    *   Every service file must declare strict TypeScript typing schemas representing expected payload structures.

### 3. Contexts (`src/context/*`)
*   **Role**: Manage cross-cutting global applications state (e.g., authenticated user profiles, tenant settings, active academic years, and toast alerts).
*   **Rules**:
    *   Avoid storing local page-specific values (like table loading states) in global contexts.
