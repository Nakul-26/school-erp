# School ERP — MVP Trial Run Build Plan
> Scope: Minimum viable features for trial with small-to-medium schools
> Stack: Hono + D1 (backend) · Vite + React + TypeScript (frontend)

---

## 🗺️ Overview — 3 Sprints

| Sprint | Focus | Duration |
|--------|-------|----------|
| **Sprint A** | Staff/HR Leave + Admission Workflow | ~2 weeks |
| **Sprint B** | Grades + Report Card + Fee Concessions | ~1.5 weeks |
| **Sprint C** | Payroll (basic) + Parent Portal + Student Leave + Homework | ~2 weeks |

---

## ⚡ Sprint A — The Two Completely Missing Modules

---

### A1. 🗓️ Leave Management (Staff / HR)

> MVP goal: Teachers can apply for leave. HOD/Principal approves/rejects. Dashboard shows leave balance.

#### New DB Tables
- `leave_types` — CL / SL / EL with days_per_year quota
- `leave_balances` — per teacher per leave_type per academic_year
- `leave_applications` — the actual leave requests with status Pending/Approved/Rejected

#### New Backend Endpoints (`/leave/...`)
| Method | Path | Who |
|--------|------|-----|
| GET | `/leave/types` | All |
| POST | `/leave/types` | Admin/Principal |
| PUT | `/leave/types/:id` | Admin/Principal |
| DELETE | `/leave/types/:id` | Admin/Principal |
| POST | `/leave/balances/seed` | Admin/Principal — seeds balances for all teachers for a year |
| GET | `/leave/balances` | Admin/HOD — all teacher balances |
| GET | `/leave/balances/my` | Teacher — own balances |
| POST | `/leave/applications` | Teacher — apply for leave |
| GET | `/leave/applications/my` | Teacher — own history |
| GET | `/leave/applications` | Admin/HOD — all applications |
| PATCH | `/leave/applications/:id/approve` | Admin/HOD/Principal |
| PATCH | `/leave/applications/:id/reject` | Admin/HOD/Principal |

#### New Frontend Pages
| Page | Route | Who Sees It |
|------|-------|-------------|
| `LeaveTypes.tsx` | `/leave/types` | Admin — manage leave type quota |
| `MyLeaveApplications.tsx` | `/leave/my` | Teacher — apply + view own history |
| `LeaveApprovals.tsx` | `/leave/approvals` | HOD/Admin — approve/reject inbox |

---

### A2. 🏫 Admission Management (MVP Pipeline)

> MVP goal: Log inquiries → convert to applications → admin approves → auto-creates student record

#### New DB Tables
- `admission_inquiries` — initial inquiry log (New → Contacted → Applied → Admitted/Rejected)
- `admission_applications` — formal application with full student + parent info

#### New Backend Endpoints (`/admissions/...`)
| Method | Path | Who |
|--------|------|-----|
| GET | `/admissions/inquiries` | Admin/HOD |
| POST | `/admissions/inquiries` | Admin/HOD — log new inquiry |
| PATCH | `/admissions/inquiries/:id` | Admin/HOD — update notes/status |
| POST | `/admissions/inquiries/:id/convert` | Admin/Principal — convert to application |
| GET | `/admissions/applications` | Admin/HOD |
| POST | `/admissions/applications` | Admin/HOD — direct application |
| GET | `/admissions/applications/:id` | Admin/HOD |
| PATCH | `/admissions/applications/:id/approve` | Principal — auto-creates student record |
| PATCH | `/admissions/applications/:id/reject` | Principal |

#### New Frontend Pages
| Page | Route | Description |
|------|-------|-------------|
| `AdmissionInquiries.tsx` | `/admissions/inquiries` | Status-filtered inquiry pipeline |
| `AdmissionApplications.tsx` | `/admissions/applications` | Full application management |

---

## ⚡ Sprint B — Exam Grades + Fee Extras

---

### B1. 📊 Grade System + Report Card

> MVP goal: Admin sets grade scale → marks auto-get a grade → printable report card per student

#### New DB Table
- `grade_scales` — A+/A/B+/B/C/D/F with min_percent, max_percent, grade_point, is_passing

#### New Backend Endpoints
| Method | Path | Who |
|--------|------|-----|
| GET | `/grades/scales` | All |
| POST | `/grades/scales/seed` | Admin — seed default A+/A/B+/B/C/D/F |
| PUT | `/grades/scales` | Admin — replace full scale |
| GET | `/exams/:id/report-card/:student_id` | Admin/Teacher |
| GET | `/exams/:id/report-card` | Admin — all students |

Report card is **computed** from existing marks — no extra table needed.

**Report card includes:** per-subject marks + grade + grade_point, total marks, overall %, overall grade, rank in class, attendance %, PASS/FAIL result.

#### New Frontend
| What | Where |
|------|-------|
| Grade Scale settings page | New page `/settings/grades` |
| "View Report Cards" button | On COMPLETED exams in `Exams.tsx` |
| Printable report card modal | Print-friendly layout per student |

---

### B2. 💰 Fee Concessions + Installments

> MVP goal: Apply discount to a fee record. Split fee into installment terms.

#### New DB Tables
- `fee_concessions` — discount per student fee record (flat or % discount)
- `fee_installments` — split a fee into N due dates

#### New Backend Endpoints (added to `/fees/...`)
| Method | Path | Who |
|--------|------|-----|
| POST | `/fees/records/:id/concession` | Admin/Accountant |
| GET | `/fees/records/:id/concessions` | Admin/Accountant |
| DELETE | `/fees/concessions/:id` | Admin |
| POST | `/fees/records/:id/installments` | Admin/Accountant |
| GET | `/fees/records/:id/installments` | Admin |
| PATCH | `/fees/installments/:id/pay` | Admin/Accountant |

#### Frontend Changes (in `StudentFees.tsx`)
- "Add Concession" button → modal (type, flat/%, value, reason)
- "Split into Installments" → modal (N parts + due dates)
- Installment timeline view
- Concession badge on fee cards

---

## ⚡ Sprint C — Payroll, Parent Portal, Student Leave, Homework

---

### C1. 💵 Basic Payroll

> MVP goal: Set salary per teacher → generate monthly payroll → view/print payslip

#### New DB Tables
- `salary_structures` — basic + DA + HRA + allowances + deductions per teacher
- `payroll_runs` — monthly payroll run (Draft → Finalized)
- `payslips` — individual teacher payslip per run (auto-calculated from attendance)

#### New Backend Endpoints (`/payroll/...`)
| Method | Path | Who |
|--------|------|-----|
| GET/POST | `/payroll/salary-structures` | Admin |
| PUT | `/payroll/salary-structures/:id` | Admin |
| POST | `/payroll/runs` | Admin — generate month's payroll |
| GET | `/payroll/runs` | Admin |
| GET | `/payroll/runs/:id` | Admin — run detail + all payslips |
| PATCH | `/payroll/runs/:id/finalize` | Admin — lock run |
| GET | `/payroll/payslips/my` | Teacher — own payslips |
| GET | `/payroll/payslips/:id` | Admin/Teacher |

**Key logic:** Auto-reads `teacher_attendance` for the month, calculates LOP (Loss of Pay) days = working_days - present_days - approved_leave_days, deducts proportionally.

#### New Frontend Pages
| Page | Route |
|------|-------|
| `SalaryStructures.tsx` | `/payroll/salary-structures` |
| `PayrollRuns.tsx` | `/payroll/runs` |
| `PayrollRunDetail.tsx` | `/payroll/runs/:id` |
| Payslip tab | Added to `TeacherDetails.tsx` |

---

### C2. 👨‍👩‍👧 Parent Portal (Dedicated UX)

> MVP goal: Parents see a clean child-focused view — not the admin UI

**No new DB tables.** All data already exists.

#### New Frontend Pages (role-redirected)
| Page | Route | Description |
|------|-------|-------------|
| `ParentDashboard.tsx` | `/parent/dashboard` | Child cards: attendance %, fee dues, recent results |
| `ParentChildProfile.tsx` | `/parent/child/:id` | Full child detail for parent |
| `ParentFeeSummary.tsx` | `/parent/fees` | Fee records + installments |

**Routing change:** Parents auto-redirect to `/parent/dashboard` on login.

---

### C3. 📅 Student Leave Applications

> MVP goal: Student/Parent applies → Class Teacher approves/rejects

#### New DB Table
- `student_leave_applications` — with student_id, date range, status

#### New Backend Endpoints (`/student-leaves/...`)
| Method | Path | Who |
|--------|------|-----|
| POST | `/student-leaves` | Student/Parent |
| GET | `/student-leaves/my` | Student/Parent |
| GET | `/student-leaves` | Teacher/Admin |
| PATCH | `/student-leaves/:id/approve` | Teacher/Admin |
| PATCH | `/student-leaves/:id/reject` | Teacher/Admin |

#### Frontend Changes
- "Apply Leave" tab on `StudentDetails.tsx`
- Leave requests tab on `SectionWorkspace.tsx`
- Apply button on parent portal

---

### C4. 📚 Homework (Simple)

> MVP goal: Teacher posts homework → students/parents see it

#### New DB Table
- `homework` — title, description, due_date, section_id, subject_id, teacher_id

#### New Backend Endpoints (`/homework/...`)
| Method | Path | Who |
|--------|------|-----|
| GET | `/homework` | All (filter by section/subject) |
| POST | `/homework` | Teacher |
| PATCH | `/homework/:id` | Teacher |
| DELETE | `/homework/:id` | Teacher |

#### Frontend Changes
- Homework tab on `SectionWorkspace.tsx`
- Homework widget on parent portal and student dashboard

---

## 🔧 Quick Fixes (1–2 days total, do alongside any sprint)

| Fix | Where | Effort |
|-----|-------|--------|
| Daily consolidated attendance view | `Attendance.tsx` — "Day View" tab | 1 day |
| Print fee receipt (PDF/print CSS) | `StudentFees.tsx` | 1 day |
| Attendance shortage badge | `StudentDetails.tsx` — red badge if < threshold | 0.5 day |
| Fee defaulter tab | `FeeReports.tsx` — filter OVERDUE/UNPAID | 0.5 day |
| Result publish button | `Exams.tsx` — notifies enrolled students | 1 day |
| Teacher qualifications field | `teachers` schema + `TeacherDetails.tsx` | 0.5 day |

---

## 📦 Total Scope Summary

```
13 new DB tables
42 new API endpoints
12 new frontend pages
~6 quick fixes to existing pages
```

### New Tables by Sprint

| Table | Sprint |
|-------|--------|
| `leave_types` | A1 |
| `leave_balances` | A1 |
| `leave_applications` | A1 |
| `admission_inquiries` | A2 |
| `admission_applications` | A2 |
| `grade_scales` | B1 |
| `fee_concessions` | B2 |
| `fee_installments` | B2 |
| `salary_structures` | C1 |
| `payroll_runs` | C1 |
| `payslips` | C1 |
| `student_leave_applications` | C3 |
| `homework` | C4 |

---

## ✅ Build Status

| Module | Status |
|--------|--------|
| A1 — Leave Management | ✅ Complete — code merged, DB migrated |
| A2 — Admission Management | ✅ Complete — code merged, DB migrated |
| B1 — Grades + Report Card | ✅ Complete — code merged, DB migrated |
| B2 — Fee Concessions + Installments | ✅ Complete — code merged, DB migrated |
| C1 — Basic Payroll | ✅ Complete — code merged, DB migrated |
| C2 — Parent Portal | ✅ Complete — handled via role dashboard routing |
| C3 — Student Leave | ✅ Complete — code merged, DB migrated |
| C4 — Homework | ✅ Complete — code merged, DB migrated |
