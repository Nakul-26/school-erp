# 26 - Testing Standards

This document establishes rules for unit testing, integration verification, and mock seeding.

---

## 🧪 1. Backend Testing
*   **Unit Tests**: Core validation scripts, utility formatters, and math processors (such as grade averages and fee collections balance math) must run inside Vitest test blocks.
*   **Integration Tests**: Mock database endpoints should simulate REST operations to confirm that transactions roll back correctly if errors occur during query executions.
*   **Database Fixtures**: Standardize database seeding scripts to populate test databases with fake tenant entries, student files, and subject classes before verification passes.

---

## 🖥️ 2. Frontend Verification
*   **Type Safety**: TypeScript compiler checks (`tsc --noEmit`) must compile without errors before merging changes.
*   **Visual Validations**: Check that input forms show error badges when boundaries are exceeded, preventing broken payloads from executing.
