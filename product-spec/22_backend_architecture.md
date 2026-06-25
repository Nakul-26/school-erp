# 22 - Backend Architecture Standards

To keep codebase files focused and maintainable, all backend modules must separate logical tasks into three distinct architecture layers.

---

## 🏗️ The Three-Tier Architecture

```
Client HTTP Request
      │
      ▼
┌───────────┐
│  Routes   │  Hono HTTP Controllers (Input extraction, Route Auth, Serialization)
└─────┬─────┘
      │ Service Call
      ▼
┌───────────┐
│  Service  │  Business Logic (Orchestration, Validation, Multi-Repo transactions)
└─────┬─────┘
      │ Query Execution
      ▼
┌───────────┐
│Repository │  Database Queries (Raw SQL preparation, low-level rows fetching)
└───────────┘
```

---

## 🚦 Layer 1: HTTP Routes
*   **Purpose**: Handle incoming HTTP requests, parse query parameters, validate payload shapes, extract the auth token variable, and return HTTP JSON responses.
*   **Rules**:
    *   *No direct database queries or SQL prepare statements.*
    *   *No deep business rules evaluation (e.g. check duplicate usernames).*
    *   Delegate all business coordination to the Service class.

---

## ⚙️ Layer 2: Business Services
*   **Purpose**: Implement the domain-specific business rules, coordinate operations across multiple repositories, trigger notifications, and manage transactional rollbacks.
*   **Rules**:
    *   *No dependency on HTTP context objects (like Hono context `c`).*
    *   *No raw SQL query strings.*
    *   Execute database modifications via Repository methods.

---

## 💾 Layer 3: Repositories
*   **Purpose**: The data access layer. Build, bind, and execute SQL statements against the SQLite database instance.
*   **Rules**:
    *   *No business validations.*
    *   *No knowledge of authentication context or roles.*
    *   Keep methods scoped to singular database table CRUD tasks.
