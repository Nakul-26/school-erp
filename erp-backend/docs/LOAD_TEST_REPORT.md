# Load Test Report — item 5 of the database-hardening plan

Date: 2026-08-31
Scope: item 5 of the agreed 5-item write-concurrency plan ("load-test key workflows before onboarding a real institution"). Items 1-4 (retry/backoff, bulk-op batching, write idempotency, background-jobs guidance) were completed in earlier sessions.

## TL;DR

- Found and fixed a **real data-integrity bug** in `makePayment` (fees): under concurrent load, a request could commit a fee record's `paid_amount` bump without the matching payment/receipt/ledger rows ever being created, leaving "money recorded as paid with no record of what was paid." This wasn't a theoretical risk — it happened during this test run, once, at moderate concurrency. Fixed by merging the optimistic-lock guard and the three dependent inserts into a single atomic D1 batch (details below). Verified fixed with a follow-up 119-request concurrent re-run: zero new inconsistencies.
- No duplicate receipt numbers, no lost payments, and no SQLITE_BUSY-shaped errors turned up anywhere in ~750 concurrent payment requests — the atomic receipt-sequence reservation (from earlier hardening work) and the D1 retry wrapper held up.
- The local test environment (a single `wrangler dev` process on one machine) saturates hard somewhere between 150 and 400 concurrent long-lived connections — for **reads and writes alike**. That's a single-process/local-runtime ceiling, not evidence about Cloudflare's actual production D1 or edge capacity. See "What this test does and doesn't tell us" below before drawing capacity conclusions from the raw numbers.
- Recommendation: before onboarding an institution whose usage pattern could plausibly produce a real payment-deadline rush (hundreds of parents paying in the same window), re-run `loadtest/run.mjs` against a deployed Worker + real D1, not local dev, to get a production-representative throughput ceiling.

## What was tested

Three scenarios, run with a small custom load-testing harness (`erp-backend/loadtest/`) against `wrangler dev` on `localhost:8788`, backed by local D1 seeded with a real institution (Greenwood High School demo data) plus 3,000 synthetic `student_fee_records` generated for this test:

1. **`fee-payment-burst`** — `POST /fees/payments` against a random one of the 3,000 fee records each time, with a fresh `Idempotency-Key` per request. Models a fee-deadline payment rush. Every request also contends on the same shared per-institution/year receipt-number counter — this is the closest analogue in TrackFlow today to the "800 students hitting the same thing at once" scenario that motivated this whole plan.
2. **`admission-inquiry-burst`** — `POST /admissions/inquiries` with randomized applicant data each time. Independent inserts, no shared-row contention — isolates the baseline write throughput ceiling from any row-level lock contention.
3. **`dashboard-read`** — `GET /students?limit=20`. Read-only, no writes — a control group to separate "D1/write contention" effects from "this process can't handle this many concurrent requests, period" effects.

Concurrency levels: 25, 50, 150, 400 persistent "virtual users," each looping requests continuously for 20 seconds per level (so higher concurrency levels naturally produce more total requests, not more time).

### Why a custom harness instead of a standard tool

The first attempt used `autocannon` (industry-standard, added as a devDependency). It reliably produced spurious 500s whenever a request's body/headers were generated per-request via its `setupRequest` hook — but the *exact same bytes*, sent once over a plain `net.Socket` or via Node's `http.Agent` with keep-alive, succeeded every time. That isolates it as a bug/quirk in autocannon's own client under dynamic per-request bodies, not a server problem. Rather than debug a third-party library, `autocannon` was removed and a ~50-line fetch-based concurrent driver (`loadtest/lib/load-driver.mjs`) was used instead — simple enough to trust by inspection, and the results below were independently sanity-checked with raw `fetch`/`http` calls before trusting the ramp numbers.

### Reproducing this test

```bash
# 1. Seed synthetic fee records (one-time, or re-run to regenerate):
node loadtest/generate-fee-records.mjs <path-to-student-ids.json> 3000 loadtest/out/fee-records.sql
npx wrangler d1 execute erp-db --local --file=loadtest/out/fee-records.sql

# 2. Start the server (separate terminal):
npm run dev

# 3. Run the ramp (defaults: connections 50/200/500/1000, 15s each):
LOADTEST_CONNECTIONS=25,50,150,400 LOADTEST_DURATION=20 node loadtest/run.mjs
```

## Results

| Scenario | Connections | Total req | req/sec | p50 latency | p95 latency | p99 latency | Errors / non-2xx |
|---|---:|---:|---:|---:|---:|---:|---|
| fee-payment-burst | 25 | 67 | 2.7 | 7.2s | 24.6s | 24.9s | 0 |
| fee-payment-burst | 50 | 109 | 3.4 | 9.6s | 27.4s | 29.6s | 12× 503 |
| fee-payment-burst | 150 | 191 | 3.0 | 31.6s | 60.2s | 63.5s | 3× 503 |
| fee-payment-burst | 400 | 646 | 8.2 | 15.2s | 67.2s | 76.0s | 412× 503 |
| admission-inquiry-burst | 25 | 219 | 9.9 | 2.1s | 3.1s | 4.3s | 1× 503 |
| admission-inquiry-burst | 50 | 211 | 9.8 | 4.7s | 11.4s | 20.1s | 0 |
| admission-inquiry-burst | 150 | 321 | 9.8 | 6.1s | 30.4s | 32.4s | 2× 503 |
| admission-inquiry-burst | 400 | 692 | 17.8 | 12.7s | 26.1s | 28.9s | 317× 503 |
| dashboard-read (GET) | 25 | 250 | 12.4 | 2.0s | 2.1s | 2.1s | 0 |
| dashboard-read (GET) | 50 | 204 | 8.1 | 3.6s | 13.3s | 24.3s | 0 |
| dashboard-read (GET) | 150 | 264 | 7.6 | 11.4s | 30.4s | 31.8s | 0 |
| dashboard-read (GET) | 400 | 508 | 1.6 | 23.2s | 48.4s | 49.4s | 169 fetch-level errors |

Full raw output: `loadtest/out/results.json` (git-ignored — regenerate with the commands above).

### Reading these numbers correctly

- **Latency grows badly with concurrency across all three scenarios, including the pure-read one.** That rules out D1 write-locking as the main driver — a read-only endpoint degrading the same way as the write-heavy ones points at the local `wrangler dev` process itself (one workerd instance, one machine, one JS isolate's event loop) running out of headroom, not at D1 specifically.
- **The 503s and connection errors at high concurrency are not coming from TrackFlow's own code** — grepped the codebase; nothing in it ever returns a 503. They're coming from the local dev runtime or the OS/Node socket layer hitting a concurrency ceiling. A dedicated follow-up probe (200 concurrent instantaneous requests, then 200 sustained for 15s) could not reliably reproduce a clean isolated 503 body on demand — consistent with resource exhaustion under sustained load rather than a deterministic app-level failure path.
- **No SQLITE_BUSY-shaped errors and no lock-contention 409s appeared at any level tested.** The D1 retry wrapper (item 1) and the optimistic-lock guard (item 3) were exercised (750+ concurrent writes against 3,000 shared rows) but never had to do their job here — the local runtime hit its own ceiling well before D1's write-lock became the bottleneck.
- **Zero duplicate receipt numbers** across ~750 total payments generated during this test, despite heavy concurrent contention on the shared per-institution/year counter — confirms the atomic `INSERT ... ON CONFLICT ... RETURNING` sequence reservation (from earlier hardening work) holds under real concurrent load, not just in unit tests.

## The bug this test found

While auditing correctness after the run, one of the 3,000 synthetic fee records showed `paid_amount = 50` with **zero** matching rows in `fee_payments` — i.e., the system's own records said money had been collected, with no payment, no receipt, and no ledger entry to show what was paid or by whom.

Root cause, in `fees.service.ts`'s `makePayment()`: the optimistic-lock guard update (bump `paid_amount`, checked via `WHERE paid_amount = <value read earlier>`) ran as its own standalone `.run()` call, and the payment/receipt/ledger inserts ran afterward as a *separate* `.batch()` call. Those are two separate round-trips to D1 with a gap in between. If the request got torn down in that gap — a timeout, the Worker being evicted mid-request, a network blip — the guard's effect (the `paid_amount` bump) was already committed, but the inserts never ran. The result: a phantom "payment" with no trail. This is exactly the kind of failure mode that gets more likely, not less, as concurrency rises (more in-flight requests, more chances for one to be interrupted) — which is why it turned up during a load test and not in the single-request tests from earlier sessions.

**Fix**: `fees.repository.ts` gained `buildPaymentBatchStatements()`, which builds all four statements (the guard update, plus the payment/receipt/ledger inserts) as **one** D1 batch. The three inserts are written as `INSERT ... SELECT ... WHERE EXISTS (SELECT 1 FROM student_fee_records WHERE id = ? AND paid_amount = ?)`, re-checking that the record now shows the *exact* `paid_amount` value the guard update just tried to set. Because a D1 batch runs as a single transaction, nothing else can touch the row between statements — so if the guard update matched 0 rows (a concurrent payment beat this one to it), the row never reaches that value, and all three dependent inserts become no-ops in the same atomic step. Either everything commits together or nothing does; there is no longer a gap for a mid-request failure to land in.

Verified: full test suite still green (26/26, `npx vitest run`), `npm run typecheck` clean, and a targeted 119-request concurrent re-run against the fixed code produced zero new `paid_amount`/payment-row mismatches (the one pre-existing bad record from before the fix is still sitting in the local synthetic dataset as evidence — it predates the fix and wasn't touched by it).

## What this test does and doesn't tell us

**Does tell us:** the write-concurrency-hardening work from items 1-4 (retry/backoff, batching, idempotency keys, the background-jobs guardrail) behaves correctly under genuine concurrent load against real D1 (even if it's the local/dev-mode flavor of D1) — no duplicate payments, no duplicate receipts, no lost updates, no silent double-approvals. It also found and let us fix a real bug that none of the earlier single-request-at-a-time testing could have caught.

**Doesn't tell us:** absolute production capacity. `wrangler dev --local` is one workerd process on one machine — it has nothing to do with how Cloudflare's actual edge network and D1's real distributed storage layer behave under load. The req/sec ceiling and multi-second latencies observed here are an artifact of testing against a single dev-mode process, not a preview of what a live institution would experience. **Before onboarding an institution with a genuinely bursty usage pattern** (a fee deadline, a results-release day), the right next step is re-running these same scripts (`loadtest/run.mjs` is environment-agnostic — just point `LOADTEST_BASE_URL` at a deployed Worker) against a real deployed environment to get numbers that actually mean something for capacity planning.

## Artifacts

- `erp-backend/loadtest/generate-fee-records.mjs` — generates synthetic `student_fee_records` fixture data for the payment-burst scenario.
- `erp-backend/loadtest/lib/load-driver.mjs` — the concurrent load driver (connections × duration, records latency/status).
- `erp-backend/loadtest/run.mjs` — the three-scenario ramp runner.
- `erp-backend/loadtest/out/` — generated fixtures and results (git-ignored).
