# 42 - Teacher Lifecycle Process

This document details the workflow and state transitions of a teacher from initial recruitment and onboarding, daily schedules, assignments, and reviews, up to retirement or exit.

---

## 🔄 Teacher Lifecycle Workflow

```
HR Recruitment / Profile Setup
            │
            ▼
┌─────────────────────────┐
│     Onboarding Wizard   │  (Personal, professional, available subjects)
└───────────┬─────────────┘
            │ Provisioning
            ▼
┌─────────────────────────┐
│    Login Provisioning   │  (Auto-creates User login, maps JWT variables)
└───────────┬─────────────┘
            │ Department
            ▼
┌─────────────────────────┐
│    Subject Allocation   │  (Maps course classes and sections to teacher)
└───────────┬─────────────┘
            │ Schedule
            ▼
┌─────────────────────────┐
│   Timetabling Mapping   │  (Defines active weekly periods schedule)
└───────────┬─────────────┘
            │ Active Service
            ▼
┌─────────────────────────┐
│   Audits & Reviews      │  (Workload statistics, notes logs tracking)
└───────────┬─────────────┘
            │ Status Transition
            ▼
┌─────────────────────────┐
│      Resign / Exit      │  (Deactivates user, archives assignments)
└─────────────────────────┘
```

---

## 🚦 Transaction & Security Rules
*   **Atomic Provisioning**: Teacher profile creation and User login generation must execute inside a single transaction wrapper (automatic rollback clean on fail).
*   **Assignments Lock**: Removing a teacher assignment does not delete the teacher file—it marks the assignment status as inactive, maintaining past historical scheduling integrity.
*   **Active Status Constraints**: A teacher set to status `RESIGNED` or `RETIRED` must immediately have their linked portal account login disabled to prevent unauthorized access.
