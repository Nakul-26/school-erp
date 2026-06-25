# 40 - Admissions Process

This document details the complete admissions lifecycle business process. Implementing admissions goes beyond inserting a database row—it orchestrates records across multiple tables.

---

## 🔄 Admissions Lifecycle Flow

```
Enquiry / Application Submission
            │
            ▼
┌─────────────────────────┐
│  Document Verification  │  (Verifies birth certificates, past transcripts)
└───────────┬─────────────┘
            │ Approval
            ▼
┌─────────────────────────┐
│    Admit Student        │  (Inserts student record, links tenant ID)
└───────────┬─────────────┘
            │ Linkage
            ▼
┌─────────────────────────┐
│     Guardian Record     │  (Creates guardian and auto-provisions Parent account)
└───────────┬─────────────┘
            │ Setup
            ▼
┌─────────────────────────┐
│      Portal Access      │  (Pre-registers student portal login credentials)
└───────────┬─────────────┘
            │ Mapping
            ▼
┌─────────────────────────┐
│    Class Allocation     │  (Creates Student Enrollment trail record)
└───────────┬─────────────┘
            │ Ledger Init
            ▼
┌─────────────────────────┐
│    Fee Ledger Setup     │  (Queries class fee structure, generates invoices)
└───────────┬─────────────┘
            │ Completion
            ▼
┌─────────────────────────┐
│      Welcome & ID       │  (PDF ID Card print option, credentials print)
└─────────────────────────┘
```

---

## 📋 Steps & Transaction Rules
1.  **Student Record**: Creates the student profile in `students` with `status = 'ACTIVE'`.
2.  **Guardian Linkage**: If parent email/phone is provided, checks for an existing parent user. If none exists, auto-creates it in the database and links the parent-student mapping table.
3.  **Portal Setup**: Provisions student credentials if requested.
4.  **Academic Enrollment**: Inserts a row in the `student_enrollments` mapping table for the current class, section, and academic year.
5.  **Fee Ledger Generation**: Instantly maps default class fee category structures to the student, creating initial billing invoices in the `fee_ledger` tables.
6.  **Atomicity Constraint**: All steps must run in a single transaction blocks or rollback cleaned if any step fails.
