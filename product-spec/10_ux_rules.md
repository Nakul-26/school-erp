# 10 - UX Standards

This document establishes constraints for frontend page layouts, tab navigation, card sizing, empty states, and viewport handling.

---

## 🚫 Rule 1: No Nested Scrollbars
*   **Single Page Scroll**: The main body viewport handles vertical scrolling if necessary. Avoid rendering scrollable content blocks inside another scrollable wrapper.
*   **Viewport Constraints**: Sidebars, details screens, and menus must lock their height to the screen viewport (`100vh`). Do not let them expand or overlay scrolls dynamically.

---

## 🃏 Rule 2: Cards Never Scroll
*   **Fit Content**: Dashboard and summary cards must be set to `height: auto` or `min-height` fit-content. They must never contain internal vertical scrolls.
*   **Layout Reflow**: If a card contains a list of items (e.g. recent audit logs), set a strict threshold (e.g. limit to 5 records) and provide a "View All" redirection button instead of a scroll bar.
*   **Minimum Card Height**: Summary dashboard KPI cards must be set to a minimum height of `160px` to guarantee spacing and prevent typography clipping.

---

## 📑 Rule 3: Tab Layout Standard
*   **Height Constraint**: Tabs navigation headers must have a height of exactly `52px`.
*   **No Wrapping**: Tabs must reside on a single horizontal line. If they exceed the viewport, they must support smooth horizontal scrolling (`overflow-x: auto` with scrollbar hidden).
*   **Visual Cues**: The active tab must have a clean highlight border (`2px solid var(--primary)`) and a bold font weight.

---

## 🔍 Rule 4: Empty States Standard
Whenever a search yields no results or a data list is empty, display a clean placeholder section containing:
1.  **Icon**: A stylized vector or feather icon (dimmed/grayed).
2.  **Explanation Title & Subtext**: Informing the user what is missing (e.g. "No Classes Created Yet").
3.  **Primary CTA Button**: Direct access to add/resolve the issue (e.g. "Create New Class").
