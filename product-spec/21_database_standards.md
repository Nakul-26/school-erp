# 21 - Database Standards

Every table and query within our SQLite/D1 database must adhere to these structural schemas and design practices.

---

## 🗃️ 1. Required Columns (Audit & Tenancy)

Every table representing user data, profiles, or financial transactions must contain these standard columns:

| Column Name | Type | Key | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(36)` | PRIMARY KEY | Unique UUID v4 string identifier. |
| `institution_id` | `VARCHAR(36)` | FOREIGN KEY | Identifies the tenant institution owner of the row. |
| `is_active` | `INTEGER` | - | Flag indicating state (`1` for active, `0` for inactive). |
| `created_at` | `DATETIME` | - | Set to current database timestamp on creation. |
| `updated_at` | `DATETIME` | - | Updated to current database timestamp on change. |
| `created_by` | `VARCHAR(36)` | FOREIGN KEY | UUID of the user who inserted the row. |
| `updated_by` | `VARCHAR(36)` | FOREIGN KEY | UUID of the user who modified the row. |
| `deleted_at` | `DATETIME` | - | Soft-delete timestamp indicator. Default is `NULL`. |

---

## 🔑 2. Relationship Integrity (Foreign Keys)
*   **Cascades**: Ensure appropriate delete cascading rules:
    *   If an institution is deleted: All user records must cascade delete (`ON DELETE CASCADE`).
    *   If a department is deleted: Linked teacher records must restrict delete (`ON DELETE RESTRICT`) or set null, avoiding orphan listings.
*   **Constraints**: Enforce structural constraints (e.g. unique combinations of class, section, and roll number).

---

## ⚡ 3. Index Placement Guidelines
Indexes must be declared explicitly for columns that are queried frequently to prevent slow table scans:
1.  **Composite Tenant Index**: Every table must have an index on `(institution_id, deleted_at)` to optimize tenant list queries.
2.  **Unique Natural Keys**: Indexes on fields like `employee_id` or `admission_number`.
3.  **Search Fields**: Indexes on commonly searched strings (e.g., `last_name`, `username`).
