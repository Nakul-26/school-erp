# 52 - State Machines & Status Transitions

To prevent data corruption and unexpected bugs, core ERP entities must transit through these defined states.

---

## 🎓 1. Student State Machine

```
  [ Applicant ]
        │  Admission Approval
        ▼
  [ Admitted ]
        │  Active Enrollment Map
        ▼
  [ Active ] ◄───► [ Transferred ] (Suspended temporarily)
        │
        ├───► [ Graduated ]
        │
        └───► [ Archived ] (Dossier locked)
```

---

## 👩‍🏫 2. Teacher State Machine

```
  [ Draft ] (Profile prepared, assignments pending)
     │
     ▼
  [ Active ] ◄───► [ On Leave ]
     │
     ├───► [ Suspended ] (Access disabled immediately)
     │
     └───► [ Retired / Resigned ] ───► [ Archived ]
```

---

## 📝 3. Exam State Machine

```
  [ Draft ] (Configuration and weightage setup)
     │  Publish Details
     ▼
  [ Published ] (Schedule announced)
     │  Conduct Test
     ▼
  [ Marks Entry ] (Subject teacher entering scores)
     │  Freeze Trigger
     ▼
  [ Frozen ] (Locked text inputs, coordinator review)
     │  Publish Results
     ▼
  [ Results Published ] ───► [ Archived ]
```

---

## 💰 4. Fees Invoice State Machine

```
  [ Unpaid ] ───► [ Overdue ] (Past payment schedule date)
     │                 │
     ├───► [ Partially Paid ] ◄───┘ (Partial collect)
     │                 │
     ▼                 ▼
  [ Paid ] ◄───────────┘ (Final collection)
     │
     └───► [ Cancelled / Adjusted ] (Waiver applied)
```
