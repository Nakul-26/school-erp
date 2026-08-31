# 25 - Performance Standards

To ensure the School ERP runs efficiently on low-bandwidth school computers and mobile networks, all features must meet these performance parameters.

---

## ⚡ 1. Frontend Asset Budgets
*   **Initial Bundle Size**: Keep JS chunks under `500kB` minified. Use React lazy loading and dynamic code-splitting for separate route bundles.
*   **Image Assets**: Compress user-uploaded avatars and logo attachments dynamically to formats like `webp` before storing, keeping sizes under `150kB`.

---

## 💾 2. Query Performance (Database)
*   **Response Threshold**: Simple read queries (`GET /students/:id`, `GET /teachers`) must complete in under `50ms` at database level.
*   **Index Enforcement**: Every query matching filter conditions must run along indexed fields to avoid full table scans.
*   **Eager vs. Lazy Loading**: Avoid deep relational nested queries. Only fetch child rows (e.g. detailed exam assessments history) when the user navigates directly to that tab.
