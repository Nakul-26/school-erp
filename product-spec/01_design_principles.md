# 01 - ERP Design Principles

This document defines the high-level philosophy behind the School ERP product. Every page, interaction, and database query must conform to these principles.

---

## 1. User-First Workflows (Efficiency Over Clicking)
*   **The 3-Click Rule**: A user should be able to perform any frequent operational action (e.g. mark attendance, view student results, or check outstanding fee) in 3 clicks or fewer from the main dashboard.
*   **Data Preservation**: Never throw away user inputs. If a validation fails, keep all fields populated, highlight the offending input with descriptive red alerts, and preserve the viewport position.
*   **Context Persistence**: When navigating from a search list to a details view and back, the scroll position, filters, and active tab state on the list page must be preserved.

---

## 2. Rich & Premium Aesthetics (First Impressions Matter)
*   **Curated Palette**: Avoid default primary colors (pure red, pure green, pure blue). Use HSL-curated colors (like Indigo, Slate, and Jade) that look polished and professional.
*   **Modern Typography**: Utilize Google Fonts (`Plus Jakarta Sans` or `Inter`) for maximum readability, with clean letter-spacing and contrast hierarchies.
*   **Visual Depth**: Implement gradients, subtle micro-shadows, and glassmorphism elements to define distinct structural planes in the UI.

---

## 3. Clear Hierarchy & Consistency
*   **Visual Cues**: Keep actions predictable. Primary buttons must always have the primary theme background, danger buttons must be red/crimson, and secondary buttons must be slate/gray.
*   **Standard Spacing**: Maintain standard layout padding (e.g. `2rem` container padding, `1.25rem` grid spacing, and `0.75rem` form field gaps) to avoid visual clutter.
*   **Grid Alignments**: Align all elements horizontally and vertically using structured grid systems (CSS Flexbox and Grid).

---

## 4. Mobile & Desktop Fluidity
*   **Responsiveness**: Pages must reflow fluidly. Columns should stack, modals must shrink or take full screen height on smaller devices with finger-friendly touch targets.
*   **Grid Boundaries**: Layout sections must have maximum width guidelines (e.g., modals capped at `640px` or `720px`, tables wrapping columns instead of forcing tiny font sizes).
