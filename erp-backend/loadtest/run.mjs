/**
 * Item 5 (database-scaling-strategy plan): load-test key TrackFlow workflows
 * against a local `wrangler dev` instance backed by local D1, ramping
 * concurrency and recording throughput / latency / error rates.
 *
 * IMPORTANT CAVEAT (see docs/LOAD_TEST_REPORT.md for the full writeup):
 * `wrangler dev --local` runs a single workerd process on one machine talking
 * to a local SQLite-backed D1 simulator. It is a faithful proxy for D1's
 * single-writer *lock contention* behavior (same underlying engine), but NOT
 * for production throughput ceilings - a real deployment spreads requests
 * across Cloudflare's edge and talks to D1's actual distributed storage
 * layer. Treat absolute req/sec numbers here as "does our code survive and
 * behave correctly under concurrent load", not as production capacity
 * planning - that needs the same scenarios re-run against a deployed Worker.
 *
 * Usage: node loadtest/run.mjs
 * Requires: `npm run dev` already running on BASE_URL, and
 *   loadtest/out/fee-records.ids.json already generated + inserted
 *   (see loadtest/generate-fee-records.mjs).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { runLoad } from './lib/load-driver.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = process.env.LOADTEST_BASE_URL || 'http://127.0.0.1:8788';
const CONNECTIONS = (process.env.LOADTEST_CONNECTIONS || '50,200,500,1000').split(',').map(Number);
const DURATION = parseInt(process.env.LOADTEST_DURATION || '15', 10);

const feeIds = JSON.parse(fs.readFileSync(path.join(__dirname, 'out', 'fee-records.ids.json'), 'utf8'));

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function login() {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'admin@oxford.edu', password: 'admin123' }),
  });
  const data = await res.json();
  if (!data.token) throw new Error('Login failed: ' + JSON.stringify(data));
  return data.token;
}

function scenarios(token) {
  const authHeaders = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };

  return [
    {
      name: 'fee-payment-burst',
      description: 'Concurrent fee payments against distinct student_fee_records (deadline-day payment rush). Every request also contends on the shared per-institution/year receipt-number counter.',
      buildRequest: () => {
        const rec = pick(feeIds);
        return {
          url: `${BASE_URL}/fees/payments`,
          options: {
            method: 'POST',
            headers: { ...authHeaders, 'idempotency-key': crypto.randomUUID() },
            body: JSON.stringify({
              student_fee_record_id: rec.id,
              student_id: rec.student_id,
              amount: 50,
              payment_date: new Date().toISOString().slice(0, 10),
              payment_method: 'CASH',
            }),
          },
        };
      },
    },
    {
      name: 'admission-inquiry-burst',
      description: 'Concurrent admission inquiry submissions (admission-season rush) - independent inserts, no shared row contention, isolates the baseline D1 single-writer throughput ceiling.',
      buildRequest: () => {
        const n = Math.floor(Math.random() * 1e9);
        return {
          url: `${BASE_URL}/admissions/inquiries`,
          options: {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({
              student_name: `Load Test Student ${n}`,
              parent_name: `Load Test Parent ${n}`,
              parent_phone: `9${String(n).padStart(9, '0').slice(0, 9)}`,
              applying_for_class: 'Grade 9',
              source: 'loadtest',
            }),
          },
        };
      },
    },
    {
      name: 'dashboard-read',
      description: 'Concurrent read-only student-list loads (parents/teachers/staff checking things during peak hours) - no writes, should scale cleanly.',
      buildRequest: () => ({
        url: `${BASE_URL}/students?limit=20`,
        options: { method: 'GET', headers: authHeaders },
      }),
    },
  ];
}

async function main() {
  console.log(`Logging in against ${BASE_URL}...`);
  const token = await login();
  console.log(`Loaded ${feeIds.length} fee-record ids for the payment-burst scenario.`);

  const allResults = [];

  for (const scenario of scenarios(token)) {
    console.log(`\n=== Scenario: ${scenario.name} ===`);
    console.log(scenario.description);
    for (const connections of CONNECTIONS) {
      console.log(`\n-- connections=${connections}, duration=${DURATION}s --`);
      const result = await runLoad({ connections, durationSec: DURATION, buildRequest: scenario.buildRequest });
      const summary = { scenario: scenario.name, ...result };
      allResults.push(summary);
      console.log(JSON.stringify(summary, null, 2));
    }
  }

  const outPath = path.join(__dirname, 'out', 'results.json');
  fs.writeFileSync(outPath, JSON.stringify(allResults, null, 2));
  console.log(`\nAll results written to ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
