# 60 - Student Hub Module Specification

The Student Hub manages the complete lifecycle of a student from initial admission, daily academic participation, term assessments, fee ledgers, through to final promotion or graduation.

---

## 🎯 1. Business Goals
*   Provide a seamless admission wizard that prevents incomplete profiles.
*   Automate parent/guardian account linkages.
*   Preserve historical enrollment trails (never overwrite class changes; archive them).

---

## 👥 2. Primary Users & Permissions
*   **Admissions Office / Admin**: Full write and read access (create, edit, promote, transfer).
*   **Teachers**: Read access, permission to update notes and document attachments.
*   **Parents & Students**: Read-only access to their respective hub.

---

## 📋 3. Key Workflows

### 1. View Student (Student Profile Hub)
Organized with standard layout headers and tabs:
*   **Timeline Tab**: Chronological events log (Admitted ➔ Enrolled ➔ Attendance Warning ➔ Grade Assessment ➔ Promoted).
*   **Attendance Tab**: Calendar interface showing color-coded daily status (Present, Absent, Excused) and monthly percentages.
*   **Fees Tab**: Outstanding fee invoice list, paid receipts history, and invoice generation CTA.
*   **Results Tab**: Grade summaries, term exam scores, GPA charts, and report card download triggers.
*   **Documents Tab**: Image upload triggers for ID card photos, birth certificates, and academic records.
*   **Health Card Tab**: Emergency contacts, blood group, and medical notes.

### 2. Student Promotion Workflow
*   **Step 1**: Choose Source and Target Academic Years.
*   **Step 2**: Filter student list by current Class/Section.
*   **Step 3**: Unpaid fees alert warnings block (holds back debtors).
*   **Step 4**: Target destination Class/Section mapping.
*   **Step 5**: Batch update execution, archives previous year enrollments.
