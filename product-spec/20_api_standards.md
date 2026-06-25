# 20 - API Standards

All backend routes and controllers must follow these API design standards to maintain predictable client-server communications.

---

## 🛣️ 1. RESTful Paths
*   **Plural Nouns**: Resources must be pluralized (e.g. `/teachers`, `/students`, `/academic-years`).
*   **Path Nesting**: Sub-resources should represent direct hierarchical relationships:
    *   `GET /teachers/:id/assignments` (Get subject assignments for a specific teacher)
    *   `POST /students/:id/notes` (Create a note on a student's file)

---

## 🔍 2. Listing Endpoints (Search, Filter, Sort, Paginate)
Every endpoint that lists records (e.g., `GET /students`, `GET /teachers`) must support:
*   **Pagination parameters**: `page` (default: 1), `limit` (default: 20, max: 100).
*   **Search**: `q` string parameter (automatically searches first_name, last_name, email, or IDs).
*   **Sorting**: `sort_by` (column name) and `order` (`ASC` or `DESC`).
*   **Filters**: Key-value query parameters mapping direct table columns (e.g., `department=Science`, `status=ACTIVE`).

### 📦 Response Structure
List endpoints must return a unified envelope structure:

```json
{
  "data": [
    { "id": "uuid-1", "name": "John Doe" },
    { "id": "uuid-2", "name": "Jane Smith" }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total_records": 142,
    "total_pages": 8
  },
  "meta": {
    "institution_id": "inst-uuid-xyz",
    "timestamp": "2026-06-25T13:30:00Z"
  }
}
```

---

## 🛡️ 3. Tenant isolation (Strict Rule)
*   **Institution Scope**: Every backend database query must be filtered by the caller's verified `institution_id` retrieved directly from the validated authentication token JWT.
*   **No Cross-Tenant Queries**: The client must *never* pass `institution_id` in request payloads for read/update operations. The backend derives it from variables bound in the auth middleware context.
