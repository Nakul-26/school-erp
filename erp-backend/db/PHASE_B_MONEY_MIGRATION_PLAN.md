# Money-column migration plan — `REAL` → integer paisa

**Status: planning only. Nothing in this document has been executed.** This
is the last open item from `AUDIT_REPORT.md` Phase B ("plan a money-column
migration from `REAL` to integer paisa for new tables going forward; existing
tables can be migrated in a dedicated, carefully-tested pass given how much
financial code touches them"). Unlike the FK/CHECK rebuild, this isn't safe
to do as one mechanical pass — it changes the *meaning* of every affected
value, not just how it's constrained, and touches money math across the
entire fees, payroll, and expenses feature surface plus every screen that
displays or edits an amount. It needs its own dedicated session with the
user, not to be bundled into a "full sweep."

## Why this matters

SQLite's `REAL` is an IEEE-754 double. Individual currency values (e.g.
`4999.99`) usually round-trip fine, but repeated arithmetic on doubles —
exactly what happens across a `financial_ledger.balance_after` running
total, cumulative `paid_amount` updates on `fee_payments`/`student_fee_
records`, or payroll gross/net calculations that chain several
allowance/deduction columns together — accumulates floating-point drift.
`fees.service.ts` already works around this defensively with `+ 0.01`
epsilon comparisons (e.g. `if (input.amount > currentOutstanding + 0.01)`)
specifically because exact equality on `REAL` money values isn't reliable.
Storing money as an integer count of the smallest currency unit (paisa, for
₹) removes the entire class of bug and lets that epsilon-comparison
workaround be deleted.

## Full inventory of affected columns (44)

Grouped by subsystem; excludes `analytics_daily`/`analytics_monthly`/
`analytics_kpis`, which are derived/aggregated read-models recomputed from
the source tables below — once the source tables are converted, the
analytics jobs that populate these can simply emit integers too, with no
migration of their own required.

**Fees** (`fees.service.ts`, `fees.repository.ts`)
- `fee_structures.amount`
- `student_fee_records.total_amount`, `.paid_amount`, `.concession_amount`, `.fine_amount`, `.refund_amount`
- `fee_payments.amount`
- `fee_installments.amount`, `.paid_amount`
- `fee_concessions.discount_value`, `.discount_amount`
- `fee_fine_rules.fine_amount`, `.max_fine_amount`
- `fee_refunds.refund_amount`
- `financial_ledger.amount`, `.balance_after`

**Payroll** (`payroll.service.ts`, `payroll.repository.ts`)
- `salary_structures.basic_salary`, `.da`, `.hra`, `.other_allowances`, `.pf_deduction`, `.tds_deduction`, `.other_deductions`
- `payslips.basic_salary`, `.da`, `.hra`, `.other_allowances`, `.gross_salary`, `.pf_deduction`, `.tds_deduction`, `.lop_deduction`, `.other_deductions`, `.net_salary`
- `payroll_runs.total_gross`, `.total_net`

**Other**
- `expenses.amount`
- `assets.value`
- `transport_routes.monthly_charge`
- `library_transactions.fine_amount`

## Why this is materially riskier than the FK/CHECK rebuild

The FK/CHECK migration only changed constraints — every existing value was
already valid, so a straight `INSERT INTO t_new SELECT * FROM t` copy was
correct by construction. A money migration is different: **the stored value
itself must change** (`4999.99` → `499999`), and every single place in the
codebase that reads or writes one of these 44 columns must be updated in
lockstep, or it will silently misinterpret paisa as rupees (or vice versa)
by a factor of 100. That includes:

- Every repository method that does arithmetic on these columns (`fees.
  service.ts` alone has a dozen `total_amount + fine_amount - paid_amount`
  style expressions).
- Every frontend page that displays or edits an amount (`₹` formatting,
  input fields, CSV/PDF exports, printed receipts).
- Any report/analytics job that sums or averages these columns.
- Any external integration (the eventual payment gateway from Phase E,
  webhooks) that serializes amounts.

A partial migration — some code paths converted, others not — is worse than
not migrating at all, since it produces silent, hard-to-spot factor-of-100
errors in money math rather than the current, known, epsilon-guarded
floating-point drift.

## Proposed phased approach (do not attempt as one pass)

1. **New tables/columns only, starting now**: any *new* money-carrying table
   or column added going forward should use integer paisa from day one
   (e.g. a real payment-gateway integration in Phase E). This stops the
   problem from growing while the existing 44 columns are migrated on their
   own schedule.
2. **Dual-write transition period** for existing columns, subsystem by
   subsystem (fees first, since it's the highest-value and best-tested by
   the new vitest suite; payroll second; the rest last):
   - Add a parallel `*_paisa INTEGER` column next to each existing `REAL`
     column (a normal `ALTER TABLE ADD COLUMN`, low risk, additive).
   - Update every write path in that subsystem's service/repository layer to
     write both columns (`amount` and `amount_paisa = Math.round(amount *
     100)`), keeping `REAL` as the authoritative read path.
   - Backfill `*_paisa` for existing rows via a one-time `UPDATE ... SET
     x_paisa = ROUND(x * 100)`.
   - Add a scheduled/manual consistency check comparing `x_paisa / 100.0`
     against `x` across all rows, flagging any drift before proceeding.
3. **Cut over reads**: once dual-write has run for a full billing cycle
   with zero drift, switch the service layer to read/compute from the
   `*_paisa` columns instead, converting to rupees only at the presentation
   boundary (API response shaping / frontend formatting), mirroring how
   most payment-processor integrations (Stripe, Razorpay) already represent
   amounts in the smallest unit.
4. **Drop the old `REAL` columns** in a final table-rebuild pass (same
   12-step/rename-based procedure documented in `PHASE_B_FK_CHECK_PLAN.md`,
   since dropping a column also isn't an in-place `ALTER` in SQLite) once
   the cutover has been stable in production for an agreed soak period.
5. Rename `*_paisa` columns to the plain names (e.g. `amount`) in that same
   final rebuild, so the schema ends up clean rather than permanently
   carrying a `_paisa` suffix.

## Recommendation

Given the blast radius (every fee/payroll screen, every report, every
future payment-gateway integration), this should be scoped as its own
dedicated piece of work with the user before any code changes start —
likely starting with just the **fees** subsystem end-to-end (schema +
service + frontend + tests) as a proof of the pattern, before repeating it
for payroll and the smaller remaining columns. Not started in this session.
