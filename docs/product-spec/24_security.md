# 24 - Security Standards

This document establishes the security guidelines for authentication, query preparation, and resource permission controls.

---

## 🔒 1. SQL Injection Protection
*   **Parameterized Queries**: Raw SQL strings concatenated with user input variables are strictly forbidden.
*   **Binding Rule**: All queries containing dynamic inputs must use SQLite prepared statement placeholders (`?`) and bind values explicitly:
    *   *Correct*: `prepare("SELECT * FROM users WHERE username = ?").bind(username)`
    *   *Incorrect*: `prepare("SELECT * FROM users WHERE username = '" + username + "'")`

---

## 🔑 2. Authentication & JWT Tokens
*   **Verification**: All private route endpoints must use `authMiddleware` to verify the incoming JSON Web Token (JWT) in the `Authorization: Bearer <token>` header.
*   **Payload Verification**: Tokens must contain expiration timestamps (`exp`), issuer metadata, verified user ID (`sub`), user roles array, and linked `institution_id` parameters.

---

## 🚦 3. Role-Based Access Control (RBAC)
*   **Middleware Enforcement**: Destructive or creation operations (e.g. `POST`, `PUT`, `DELETE`) on core entities like Teachers, Fees, and Exams must route through a role verification check:
    *   `teachers.post('/', requireRole('admin', 'super_admin'), ...)`
*   **Fail-Closed Principle**: If a request does not contain a verified role or token, it must fail-closed and return a `401 Unauthorized` or `403 Forbidden` response.
