/**
 * Wraps a D1Database binding so every prepared-statement execution
 * (`run`/`first`/`all`/`raw`) and every `batch`/`exec` call transparently
 * retries on transient, concurrency-related D1 failures — the
 * "SQLITE_BUSY"-style errors you get when many writers hit the same
 * database at once (e.g. a burst of simultaneous submissions).
 *
 * This is applied once, at the point where `env.DB` is bound into the
 * request context (see index.ts), so none of the ~76 repository files
 * that call `c.env.DB` directly need to change.
 *
 * Caveat: retrying is safe for errors that happen *before* the statement
 * ran (lock contention) — nothing executed, so re-running it is a no-op
 * from the DB's point of view. It is less clean-cut for a timeout that
 * happens *during* execution, where a write may have already landed and
 * a retry could re-apply it. That's exactly why write idempotency
 * (separate hardening item) matters for money/records that must never
 * be double-applied (payments, admission approval, etc.) — this wrapper
 * reduces failed requests, it doesn't replace idempotency.
 */

const MAX_ATTEMPTS = 5;
const BASE_DELAY_MS = 50;
const MAX_DELAY_MS = 2000;

// Substrings seen in D1/SQLite errors that are safe/worth retrying —
// all describe transient contention or infra hiccups, never a query,
// schema, or constraint problem.
const RETRYABLE_PATTERNS = [
  'sqlite_busy',
  'database is locked',
  'database table is locked',
  'network connection lost',
  'internal error',
  'too many requests',
  'storage caused object to be reset',
  'reset because its code was updated',
];

function isRetryableError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  const lower = message.toLowerCase();
  return RETRYABLE_PATTERNS.some((pattern) => lower.includes(pattern));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry<T>(label: string, fn: () => Promise<T>): Promise<T> {
  let attempt = 0;
  for (;;) {
    try {
      return await fn();
    } catch (err) {
      attempt++;
      if (attempt >= MAX_ATTEMPTS || !isRetryableError(err)) {
        throw err;
      }
      const backoff = Math.min(BASE_DELAY_MS * 2 ** (attempt - 1), MAX_DELAY_MS);
      const jitter = Math.random() * backoff * 0.5;
      const delay = backoff + jitter;
      console.warn(
        `[d1-retry] ${label} failed (attempt ${attempt}/${MAX_ATTEMPTS}), retrying in ${Math.round(delay)}ms:`,
        err instanceof Error ? err.message : err
      );
      await sleep(delay);
    }
  }
}

const RETRY_MARKER = Symbol('d1RetryWrapped');

function wrapStatement(stmt: D1PreparedStatement): D1PreparedStatement {
  return new Proxy(stmt, {
    get(target, prop, receiver) {
      if (prop === 'bind') {
        return (...args: unknown[]) => wrapStatement((target.bind as any)(...args));
      }
      if (prop === 'run' || prop === 'first' || prop === 'all' || prop === 'raw') {
        return (...args: unknown[]) => withRetry(`statement.${String(prop)}`, () => (target as any)[prop](...args));
      }
      const value = Reflect.get(target, prop, receiver);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}

export function wrapD1WithRetry(db: D1Database): D1Database {
  if ((db as any)[RETRY_MARKER]) {
    return db;
  }

  const wrapped = new Proxy(db, {
    get(target, prop, receiver) {
      if (prop === RETRY_MARKER) {
        return true;
      }
      if (prop === 'prepare') {
        return (query: string) => wrapStatement(target.prepare(query));
      }
      if (prop === 'batch') {
        return (statements: D1PreparedStatement[]) => withRetry('batch', () => target.batch(statements as any));
      }
      if (prop === 'exec') {
        return (query: string) => withRetry('exec', () => target.exec(query));
      }
      const value = Reflect.get(target, prop, receiver);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });

  return wrapped;
}
