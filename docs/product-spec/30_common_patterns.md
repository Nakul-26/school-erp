# 30 - Common UI/UX Patterns

This document defines the layout skeletons for common screens. Every entity module (Students, Teachers, Classes, Departments, Library Books, Vehicles) must follow these identical visual structures to ensure a consistent user experience.

---

## 📋 1. Entity Listing Standard
*   **Purpose**: List view of multiple records.
*   **Skeleton Structure**:
    1.  **Header**: Title (e.g. "Library Books"), count badge (e.g. "124 Books"), and CTA button ("Add Book").
    2.  **Filters Bar**: A single card containing a search input (debounced) and 2-3 category filters.
    3.  **Table**: Uniform headings, status badges, and actions menu.

---

## 🏛️ 2. Entity Details Hub Standard
*   **Purpose**: Complete overview page of a single record.
*   **Skeleton Structure**:
    1.  **Hero Block**: Profile photo/emoji, name title, subtitle (e.g. Employee ID or Grade), status badge, and quick actions.
    2.  **Dashboard Grid**: Main details panel on the left (tabbed), smaller metadata cards on the right (Notes summary or quick stats).

---

## 🕒 3. Timeline Stream Pattern
*   **Purpose**: Chronological log of record lifecycle events.
*   **Skeleton Structure**:
    *   Vertical alignment bar representing the history line.
    *   Row entries containing an Event Icon, Description, Author stamp, and relative Timestamp.

---

## 📝 4. Notes Logging Pattern
*   **Purpose**: Internal administrative annotation log.
*   **Skeleton Structure**:
    *   Top: A simple form input box ("Add admin comment...") and "Save Note" button.
    *   Bottom: Chronological stack of post-it-style cards listing the content, author, and timestamp.
