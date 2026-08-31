# 🔐 Finance, Fees & Payroll — Complete RBAC Audit Report

> **Scanned Files:**
> - Frontend: `erp-frontend/src/pages/Finance.tsx`, `FeeStructures.tsx`, `StudentFees.tsx`, `SalaryStructures.tsx`, `PayrollRuns.tsx`
> - Backend: `erp-backend/src/modules/fees/fees.routes.ts`, `payroll/payroll.routes.ts`
> - Routes: `App.tsx` line 149, `config/roleNav.ts` line 46
>
> Date: 2026-07-18

---

## 1. Route Guard Analysis (`App.tsx` + `roleNav.ts`)

### `/finance` — Finance Workspace Route

| Property | Value |
|---|---|
| `allowedRoles` | `['admin', 'super_admin', 'Principal', 'HOD', 'Accountant', 'Student', 'Parent']` |
| Route policy permissions | `['finance.access']` |
| ProtectedRoute applied | ✅ |

> [!WARNING]
> **ProtectedRoute Policy Gap:**
> - Due to the OR logic check in `ProtectedRoute.tsx`, any user holding any of the roles listed under `allowedRoles` (including `Student` and `Parent`) can access the `/finance` route, bypassing any permission policies.
> - While students and parents are restricted to the "Overview" and "Fee Collection Register" tabs on the UI, exposing the finance dashboard to students/parents poses risk and leads to data leak vulnerabilities in the underlying routes.

---

## 2. Frontend — `Finance.tsx`

### UI Gaps & Misleading Dashboard States

- **Dashboard Leakage:** If a student/parent logs into `/finance`, they see the "Financial Overview" tab.
- **API Requests:** The dashboard attempts to fetch `/fees/student-records` and `/fees/payments` to compute totals:
  - **`totalCollectedFee` & `totalOutstandingFee`:** In `Finance.tsx` lines 97–104, the page calls `GET /fees/student-records`. For a student, the backend filters and returns only their own record. However, the frontend sums this up and displays it as the "Gross Fee Collection" for the entire school. This causes a confusing UI state where a student's personal fee looks like the entire school's revenue.
  - **`todayCollections`:** Calls `GET /fees/payments`. Since this endpoint lacks restriction for students/parents when query parameter `student_id` is not passed, it could fail or return a leaked list.

---

## 3. Backend — `fees.routes.ts` (Fees & Collections)

### Critical Security Gaps (Information Leakage to Students/Parents)

1. **`GET /fees/receipts` (Line 237)**
   - No role or ownership checks.
   - **Vulnerability:** Any authenticated student or parent can query all fee receipts issued by the school, exposing other students' billing detail, names, and paid amounts.

2. **`GET /fees/receipts/:id` (Line 245)**
   - No role or ownership checks.
   - **Vulnerability:** Any student or parent can retrieve the exact transaction ledger details of any receipt ID.

3. **`GET /fees/records/:id/concessions` (Line 291)**
   - Only validates `record.institution_id === user.institution_id`.
   - **Vulnerability:** Any student or parent can inspect what financial concessions, waivers, or scholarships are assigned to another student's fee record by guessing or passing the record ID.

4. **`GET /fees/records/:id/installments` (Line 332)**
   - Only validates institution ID.
   - **Vulnerability:** Any student or parent can inspect the installment terms and remaining payment balances of other students.

---

## 4. Backend — `payroll.routes.ts` (Payroll & Salary)

### Critical Security Gaps (Teacher Financial Data Exposure)

The staff salary and payslip endpoints contain severe access control leaks:

1. **`GET /payroll/salary-structures/:teacherId` (Line 35)**
   - No role or self-scoping checks.
   - **Vulnerability:** Any authenticated student, parent, or colleague can query this endpoint to view a teacher's basic salary, allowances (HRA, DA), and tax deductions (PF, TDS).

2. **`GET /payroll/teacher/:teacherId/payslips` (Line 56)**
   - No role or self-scoping checks.
   - **Vulnerability:** Any authenticated user can retrieve a list of all historical payslips issued to any teacher, revealing exact pay rates and monthly disbursements.

---

## 5. Consolidated Findings

### 🔴 Critical

1. **`GET /payroll/salary-structures/:teacherId`** — Exposure of staff salary configurations to any logged-in user.
2. **`GET /payroll/teacher/:teacherId/payslips`** — Exposure of all teacher payslips and disbursement details to any logged-in user.
3. **`GET /fees/receipts`** and **`GET /fees/receipts/:id`** — Public exposure of student transaction receipts.
4. **`GET /fees/records/:id/concessions`** and **`GET /fees/records/:id/installments`** — Public exposure of student scholarships, concessions, and balance payment structures.

### 🟠 High

5. **Finance Dashboard Mismatch for Students** — Over-exposure of financial widgets to student/parent roles combined with client-side aggregations, leading to incorrect metrics representation.

---

## 6. Recommended Fixes

### Fix 1: Guard Teacher Payroll details
Ensure teachers can only query their own salary structure/payslips, and restrict administrative queries to `admin`/`Principal` roles:
```ts
// payroll.routes.ts
payroll.get('/salary-structures/:teacherId', requireRole('admin', 'super_admin', 'Principal'), async (c) => { ... });
payroll.get('/teacher/:teacherId/payslips', requireRole('admin', 'super_admin', 'Principal'), async (c) => { ... });
```

### Fix 2: Self-scoping for Concessions, Installments, and Receipts
Restrict concessions, installments, and receipts endpoints. For non-staff roles, require checking that the fee record belongs to the student's own ID or linked parent child:
```ts
// fees.routes.ts
fees.get('/records/:id/concessions', async (c) => {
  const user = c.get('user');
  const record = await repo.getRecordById(id);
  
  const userRoles = user.roles || [];
  const isAdminOrStaff = userRoles.some(r => ['admin', 'super_admin', 'Principal', 'HOD', 'Accountant'].includes(r));
  if (!isAdminOrStaff) {
    const student = await db.prepare('SELECT user_id FROM students WHERE id = ?').bind(record.student_id).first();
    if (student.user_id !== user.sub) {
      return c.json({ error: 'Forbidden' }, 403);
    }
  }
  // ...
});
```
Cwd:
