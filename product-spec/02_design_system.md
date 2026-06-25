# 02 - ERP Design System & UI Rules

This document specifies the exact CSS tokens and visual layout rules. All frontend components must adhere to these structural constraints to guarantee design consistency.

---

## 🎨 Theme Variables & Styling Tokens

Our system uses the following color palette and sizing tokens defined in `:root`:

```css
:root {
  --primary: #4f46e5;
  --primary-hover: #4338ca;
  --primary-gradient: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
  --success: #10b981;
  --warning: #f59e0b;
  --danger: #ef4444;
  --secondary: #64748b;

  --bg-main: #f8fafc;
  --bg-card: #ffffff;
  --text-main: #0f172a;
  --text-muted: #64748b;
  --border: #e2e8f0;

  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.05), 0 4px 6px -4px rgb(0 0 0 / 0.05);
}
```

---

## 📐 Layout & Spacing Rules

*   **Standard Spacing (Padding/Margins)**: Screen containers must use padding of exactly `1.5rem` to `2rem`. Row layout spaces default to `1.25rem` or `1.5rem` to prevent text running too close to border lines.
*   **Grid Boundaries**: Layout sections must have maximum width guidelines (e.g. modals capped at `640px` or `720px`, tables wrapping columns instead of forcing tiny font sizes).
*   **Aesthetic Uniformity**: Ensure visual indicators (badges, indicators, outlines) use predefined palette gradients, matching shadows, and rounded radius variables to maintain brand alignment.
