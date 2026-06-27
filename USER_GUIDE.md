# K-12 School ERP — User & Trial Guide

Welcome to the School ERP! This platform is designed to streamline school operations, including admissions, academic scheduling, student/teacher attendance, exams, leaves, and basic payroll.

---

## 🔑 Role-Based Access Control (RBAC) & Permissions
The system uses strict Role-Based Access Control (RBAC) to ensure security and privacy. What you can see and do is determined by your role:

| Role | Permissions & Access Level |
| :--- | :--- |
| **Super Admin / Admin** | Full access to all modules, system configurations, user management, audit logs, backup tools, and settings. |
| **Principal / HOD** | Access to academic setups, leave approvals (staff & students), grading scale settings, and report cards. |
| **Teacher** | Access to class timetables, student attendance registers, posting homework assignments, entering exam marks, and applying for leaves. |
| **Accountant** | Access to student fee accounts, payment collection, fee receipts, structures, and concessions. |
| **Student / Parent** | View personal dashboard, academic calendar, timetables, notifications, homework logs, grades, and fee ledger statements. |

---

## 📖 Module-by-Module User Guide

### 1. Admissions Management
* **Admission Inquiries:**
  * **How to use:** Go to `Admissions` ➜ `Admission Inquiries`. Click **+ Add Inquiry** to record basic details of a prospective student (walk-in, phone call, or website lead).
  * **Actions:** Update status (e.g. *Contacted*, *Applied*). Click **Convert** on qualified leads to automatically copy details into a formal application.
* **Admission Applications:**
  * **How to use:** Go to `Admissions` ➜ `Applications`. Fill out a detailed registration form including previous school details.
  * **Approval:** Admin/Principal reviews the application. Clicking **Approve** locks the file, automatically creates a new student profile in the system, and assigns a unique Admission ID.

### 2. Leave Management
* **Leave Setup (Admin):** Go to `Finance & HR` ➜ `Leave Types`. Setup annual quotas per leave category. Click **Seed Balances for Year** to automatically allocate leave quotas to all active teachers.
* **Requesting Leave (Teachers & Staff):** Go to `Finance & HR` ➜ `My Leave History`. View remaining leave balances. Click **Apply for Leave** to fill a form.
* **Approvals:** Administrators receive leave requests under `Finance & HR` ➜ `Staff Leaves Inbox` to *Approve* or *Reject* (requires remarks).

### 3. Student Leaves
* **Application:** Go to `Finance & HR` ➜ `Student Leaves`. Parents or students can submit sick/casual leave applications.
* **Review:** Class teachers and HODs receive student leave requests under their inbox to check, approve, or reject.

### 4. Grading Scales & Report Cards
* **Setup (Admin):** Go to `Setup & System` ➜ `Grade Scaling`. Load the default K-12 Indian school scale (A+, A, B+, B, C, D, F) or customize percentage ranges and GPAs.
* **Marks Entry:** Teachers go to `Academics` ➜ `Exams & Grading`. Select a subject section and click **Results** or **Marksheet** to enter marks inline.
* **Report Cards:** In the exam results list, click **📋 Report Card** next to any student. This computes the grand total, overall percentage, class rank, attendance percentage, and generates a print-ready report card.

### 5. Fee Management, Concessions & Installments
* **Fee Structure:** Accountants set up term fees (e.g. Tuition, Term-I, Transport) under `Fee Structures`.
* **Fee Ledgers:** Go to `Student Fees` to inspect a student's ledger.
  * **🏷️ Concessions:** Click **Concession** on any outstanding fee category. Applyflat or percentage discounts (e.g. Sibling or Merit Scholarship).
  * **📅 Installments:** Click **Installments** to split the total liability into equal or custom monthly payments.
  * **🖨️ Receipt:** Collect payments inline and print official cash receipts.

### 6. Automated Payroll Logs
* **Salary Scales (Admin):** Go to `Finance & HR` ➜ `Staff Salary Scales`. Define basic, DA, HRA, and provident fund deductions per teacher.
* **Monthly Calculations:** Go to `Finance & HR` ➜ `Monthly Payroll`. Click **Calculate Monthly Payroll**. The engine fetches attendance logs and automatically calculates deductions for Loss of Pay (LOP).
* **Finalize & Print:** Click **View** to inspect a payslip. Click **Finalize & Release** to publish the payslip to the teacher's profile.

### 7. Homework Logs
* **Post Task (Teachers):** Go to `Academics` ➜ `Homework Logs`. Select Class Section, Subject, write details, and specify the due date.
* **View:** Students and parents can access the log to download tasks and check submission schedules.

---

## ❓ FAQ & Troubleshooting
* **Why can't I see the salary settings?**
  * Check your account role. Salary and payroll management are strictly restricted to Administrators and Principal roles.
* **Why did the student's overall grade show "—"?**
  * Make sure you have set up a grading scale under `Grade Scaling` first. The system requires min/max percentage ranges to calculate letter grades.
* **How do I print a receipt or payslip?**
  * Open the receipt or payslip view and click **Print**. The system contains print-specific CSS that hides headers, footers, and sidebars, delivering a clean, clean layout for your physical printers or PDF downloads.
