import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { wrapD1WithRetry } from '../src/utils/d1-retry';

// Minimal fakes implementing just the D1 surface the wrapper touches —
// no real D1/Miniflare binding needed to test retry/backoff logic in isolation.
function makeFakeStatement(runImpl: (...args: any[]) => any) {
  const stmt: any = {
    run: vi.fn(runImpl),
    first: vi.fn(runImpl),
    all: vi.fn(runImpl),
    raw: vi.fn(runImpl),
    bind: vi.fn((...args: any[]) => stmt),
  };
  return stmt;
}

function makeFakeDb(prepareImpl: (query: string) => any) {
  return {
    prepare: vi.fn(prepareImpl),
    batch: vi.fn(),
    exec: vi.fn(),
    dump: vi.fn(),
  } as any;
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

async function runAndFlush<T>(fn: () => Promise<T>): Promise<T> {
  const promise = fn();
  // Attach a no-op handler immediately so a rejection that lands before the
  // timers finish draining isn't reported as an unhandled rejection — the
  // real rejection still propagates below via `return promise`.
  promise.catch(() => {});
  // Drain any pending backoff timers the retry loop schedules.
  await vi.runAllTimersAsync();
  return promise;
}

describe('wrapD1WithRetry', () => {
  it('passes through a call that succeeds on the first attempt', async () => {
    let calls = 0;
    const stmt = makeFakeStatement(async () => {
      calls++;
      return { success: true };
    });
    const db = makeFakeDb(() => stmt);
    const wrapped = wrapD1WithRetry(db);

    const result = await runAndFlush(() => wrapped.prepare('SELECT 1').run());

    expect(result).toEqual({ success: true });
    expect(calls).toBe(1);
  });

  it('retries a SQLITE_BUSY failure and succeeds once the lock clears', async () => {
    let calls = 0;
    const stmt = makeFakeStatement(async () => {
      calls++;
      if (calls < 3) {
        throw new Error('D1_ERROR: database is locked: SQLITE_BUSY');
      }
      return { success: true };
    });
    const db = makeFakeDb(() => stmt);
    const wrapped = wrapD1WithRetry(db);

    const result = await runAndFlush(() => wrapped.prepare('UPDATE t SET x = 1').run());

    expect(result).toEqual({ success: true });
    expect(calls).toBe(3);
  });

  it('does not retry a non-transient error (e.g. a constraint violation)', async () => {
    let calls = 0;
    const stmt = makeFakeStatement(async () => {
      calls++;
      throw new Error('D1_ERROR: UNIQUE constraint failed: students.admission_number');
    });
    const db = makeFakeDb(() => stmt);
    const wrapped = wrapD1WithRetry(db);

    await expect(runAndFlush(() => wrapped.prepare('INSERT INTO students ...').run())).rejects.toThrow(
      /UNIQUE constraint/
    );
    expect(calls).toBe(1);
  });

  it('gives up after the max attempts if contention never clears', async () => {
    let calls = 0;
    const stmt = makeFakeStatement(async () => {
      calls++;
      throw new Error('SQLITE_BUSY: database is locked');
    });
    const db = makeFakeDb(() => stmt);
    const wrapped = wrapD1WithRetry(db);

    await expect(runAndFlush(() => wrapped.prepare('UPDATE t SET x = 1').run())).rejects.toThrow(/SQLITE_BUSY/);
    expect(calls).toBe(5); // MAX_ATTEMPTS
  });

  it('keeps retry behavior across a .bind() chain', async () => {
    let calls = 0;
    const stmt = makeFakeStatement(async () => {
      calls++;
      if (calls < 2) {
        throw new Error('database is locked');
      }
      return { success: true };
    });
    const db = makeFakeDb(() => stmt);
    const wrapped = wrapD1WithRetry(db);

    const result = await runAndFlush(() => wrapped.prepare('UPDATE t SET x = ?').bind(1).run());

    expect(result).toEqual({ success: true });
    expect(stmt.bind).toHaveBeenCalledWith(1);
    expect(calls).toBe(2);
  });

  it('retries db.batch() as a whole on transient failure', async () => {
    let calls = 0;
    const db: any = {
      prepare: vi.fn(),
      exec: vi.fn(),
      batch: vi.fn(async () => {
        calls++;
        if (calls < 2) {
          throw new Error('SQLITE_BUSY');
        }
        return [{ success: true }];
      }),
    };
    const wrapped = wrapD1WithRetry(db);

    const result = await runAndFlush(() => wrapped.batch([]));

    expect(result).toEqual([{ success: true }]);
    expect(calls).toBe(2);
  });

  it('is idempotent — wrapping an already-wrapped db returns the same instance', () => {
    const db = makeFakeDb(() => makeFakeStatement(async () => ({})));
    const wrapped = wrapD1WithRetry(db);
    const rewrapped = wrapD1WithRetry(wrapped);

    expect(rewrapped).toBe(wrapped);
  });
});
