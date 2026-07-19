# RBAC Bug Log

Date: 2026-07-18

Use this log while executing `rbac_permission_matrix.md`. The matrix tracks verification status; this file tracks what was found, fixed, and retested.

Severity values:

- `Critical`: unauthorized data access, unauthorized mutation, privilege escalation, or cross-student/cross-branch data leak.
- `High`: unauthorized page/module access, unsafe direct URL/API access, or missing backend protection for important operations.
- `Medium`: unauthorized UI action visible, missing hidden-control behavior, or inconsistent permission behavior.
- `Low`: wording, audit-documentation, or non-sensitive visibility issue.

Status values:

- `Open`
- `In Progress`
- `Fixed`
- `Retest Needed`
- `Verified`
- `Won't Fix`

| ID | Module | Role | Issue | Severity | Status | Fix / Notes |
|---|---|---|---|---|---|---|
| RBAC-001 | TBD | TBD | First finding goes here | TBD | Open | Replace this placeholder when testing starts |

## Execution Notes

- Log every failed checklist item before fixing it.
- Use one row per distinct issue, even if the same role exposes it in multiple places.
- After a fix, move status to `Retest Needed`, then `Verified` only after repeating the original failing action.
- Critical and High issues should block Track A sign-off.
