# 41 - Academic Year Rollover Process

The end-of-year academic rollover is a critical workflow. It moves the entire institution to a new calendar cycle while preserving all historical enrollment and transaction records.

---

## 🔄 Rollover Workflow Sequence

```
Create Target Academic Year (e.g. 2026-2027)
            │
            ▼
┌─────────────────────────┐
│     Copy Programs       │  (Clones course syllabi mappings to the new year)
└───────────┬─────────────┘
            │ Linkage
            ▼
┌─────────────────────────┐
│  Copy Subjects / Sect.  │  (Sets up next year's section classes)
└───────────┬─────────────┘
            │ Rollover
            ▼
┌─────────────────────────┐
│    Promote Students     │  (Promotes eligible students to target grades)
└───────────┬─────────────┘
            │ Archive
            ▼
┌─────────────────────────┐
│  Archive Past Enrolls   │  (Marks past year's student enrollments as inactive)
└───────────┬─────────────┘
            │ Invoicing
            ▼
┌─────────────────────────┐
│   Generate Next Fees    │  (Populates initial fee balances for the new year)
└───────────┬─────────────┘
            │ Completion
            ▼
┌─────────────────────────┐
│     Publish System      │  (Sets new year as 'is_current', archives old year)
└─────────────────────────┘
```

---

## 🚦 Rollover Rules & Invariants
*   **Active Enforcements**: Only one academic year can hold `is_current = 1` status. Setting a new year to active automatically sets the old active year to `is_current = 0`.
*   **Non-Destructive Cloning**: Cloning syllabus settings copies course programs and subjects into new entries for the next year—it must never modify past years' records.
*   **Students Promotion Checks**: Before students can rollover, the system checks for unpaid balances. A warning is presented for students with outstanding balances, allowing the admin to hold them back.
