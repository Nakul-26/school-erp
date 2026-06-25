# 43 - Exam Lifecycle Process

This document details the workflow stages and state rules governing exam creation, marks recording, and final report card validation.

---

## 🔄 Exam Lifecycle Transitions

```
Draft Exam Configuration
            │
            ▼
┌─────────────────────────┐
│     Publish Exam        │  (Announces schedule and alerts students)
└───────────┬─────────────┘
            │ Test Conducted
            ▼
┌─────────────────────────┐
│    Teacher Marks Entry  │  (Subject teacher records scores in spreadsheet UI)
└───────────┬─────────────┘
            │ Submission
            ▼
┌─────────────────────────┐
│   Freeze Scores         │  (Locks values, requires coordinator override to edit)
└───────────┬─────────────┘
            │ Tabulation
            ▼
┌─────────────────────────┐
│    Publish Results      │  (Publishes marks and grades to parent portals)
└───────────┬─────────────┘
            │ Completion
            ▼
┌─────────────────────────┐
│   Archive Assessments   │  (Saves data for next-year promotion tracking)
└─────────────────────────┘
```

---

## 🚦 Business Rules & Access Controls
*   **Access Scope**: Only the teacher assigned to the subject section (or administrators) can add, edit, or modify scores during the *Marks Entry* state.
*   **Freeze Boundary**: Once the status transitions to `FROZEN`, text inputs are disabled. Edit requests require an administrator to reset status to `MARKS_ENTRY` with audit logging tracking the override reason.
*   **Grade Calculation Invariants**: Scores entered must never exceed the configured total maximum marks of the subject definition.
