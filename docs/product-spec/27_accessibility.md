# 27 - Accessibility Standards

Our ERP is used by a diverse set of operators, teachers, and parents. We must ensure the application remains fully navigable and accessible to everyone.

---

## ♿ 1. Keyboard Navigability
*   **Logical Tab Order**: Tab controls must follow the logical visual layout sequence of pages.
*   **Focus Ring Indicators**: Interactive elements (inputs, dropdowns, buttons) must display a clear, high-contrast focus outline ring when focused via keyboard:
    *   *Example CSS*: `:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }`
*   **Actionable Keys**: Custom modal dialogs must listen to keyboard keys (`Escape` to dismiss modals, `Enter` to confirm primary actions).

---

## 📑 2. Semantic markup & Attributes
*   **Semantic Roles**: Use HTML5 elements (`<header>`, `<nav>`, `<main>`, `<footer>`, `<aside>`) instead of nested default `<div>` lists.
*   **Aria Labels**: Set descriptive `aria-label` tags for buttons containing only vector icons (e.g. `<button aria-label="Edit Profile"><EditIcon /></button>`).
*   **Color Contrast**: All text must maintain a minimum contrast ratio of `4.5:1` against its background to satisfy WCAG AA guidelines.
