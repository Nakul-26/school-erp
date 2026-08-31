# 44 - Fee Collection Process

This document details the configuration, invoice generation, discount mapping, collection, and receipt workflow rules.

---

## 🔄 Fee Collection Lifecycle

```
Fee Categories Configuration
            │
            ▼
┌─────────────────────────┐
│  Discount / Waivers Map │  (Applies scholarships or sibling adjustments)
└───────────┬─────────────┘
            │ Cycle Start
            ▼
┌─────────────────────────┐
│    Generate Invoices    │  (Populates student outstanding fee logs)
└───────────┬─────────────┘
            │ Payment Received
            ▼
┌─────────────────────────┐
│   Collect Transaction   │  (Immutable debit entry, updates total balances)
└───────────┬─────────────┘
            │ Completion
            ▼
┌─────────────────────────┐
│     PDF Receipt Print   │  (Generates proof of payment receipt immediately)
└─────────────────────────┘
```

---

## 🚦 Ledger Invariant Rules
*   **Immutable Entries**: Fee collection records are write-only. If a payment entry error occurs, cashiers must post a credit adjustment note rather than updating or deleting transaction entries.
*   **Balance Deductions**: Payments received must apply to the oldest outstanding invoice balance first (FIFO rule) unless explicitly specified by the cashier during selection.
*   **Over-Collection Limits**: Payments collected must never exceed the remaining total balance due for a student invoice.
