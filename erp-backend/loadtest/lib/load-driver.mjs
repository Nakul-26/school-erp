/**
 * Minimal concurrent load driver (replaces an earlier attempt to use
 * autocannon - see docs/LOAD_TEST_REPORT.md for why: autocannon's
 * `setupRequest`-driven per-request body/header mutation reliably produced
 * spurious 500s in its own client against this server, while the exact same
 * bytes sent over a plain Node `net.Socket` or `http.Agent` succeeded every
 * time - i.e. an autocannon client bug, not a server bug. Rolling a ~80-line
 * driver on `fetch` was faster than chasing that further and keeps the
 * methodology transparent).
 *
 * Runs `connections` concurrent async workers in a tight loop against
 * `buildRequest()` until `durationSec` elapses, recording status + latency
 * for every request.
 */

export async function runLoad({ connections, durationSec, buildRequest }) {
  const endAt = Date.now() + durationSec * 1000;
  const latencies = [];
  const statusCounts = {};
  let errors = 0;
  let total = 0;

  async function worker() {
    while (Date.now() < endAt) {
      const { url, options } = buildRequest();
      const start = performance.now();
      try {
        const res = await fetch(url, options);
        await res.arrayBuffer(); // drain body so the connection can be reused
        const elapsed = performance.now() - start;
        latencies.push(elapsed);
        statusCounts[res.status] = (statusCounts[res.status] || 0) + 1;
      } catch (e) {
        errors++;
      }
      total++;
    }
  }

  const start = Date.now();
  await Promise.all(Array.from({ length: connections }, () => worker()));
  const actualDurationSec = (Date.now() - start) / 1000;

  latencies.sort((a, b) => a - b);
  const pct = (p) => latencies.length ? latencies[Math.min(latencies.length - 1, Math.floor((p / 100) * latencies.length))] : null;

  return {
    connections,
    durationSec: actualDurationSec,
    totalRequests: total,
    requestsPerSec: total / actualDurationSec,
    errors,
    statusCounts,
    latencyMs: {
      avg: latencies.length ? latencies.reduce((a, b) => a + b, 0) / latencies.length : null,
      p50: pct(50),
      p95: pct(95),
      p99: pct(99),
      max: latencies.length ? latencies[latencies.length - 1] : null,
    },
  };
}
