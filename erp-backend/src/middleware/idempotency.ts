import { Context, Next } from 'hono';
import { Env, JwtPayload } from '../types';

type IdempotencyRow = {
  status: 'processing' | 'completed';
  response_status: number | null;
  response_body: string | null;
  request_hash: string | null;
};

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Idempotency guard for mutations where a duplicate submission must not
 * double-apply - payments, refunds, admission approval. Opt-in via an
 * `Idempotency-Key` request header:
 *
 *  - No header sent: no-op, the route behaves exactly as before.
 *  - New key: the handler runs normally, then its response is stored.
 *  - Same key replayed after the first call finished: the stored response is
 *    returned verbatim, without touching the database again.
 *  - Same key while the first call is still in flight: 409 (this is a real
 *    concurrent double-submit, not a safe-to-replay retry).
 *  - Same key reused with a different request body: 422 - a key should
 *    identify one logical operation, so this almost always means a client
 *    bug rather than an intentional retry.
 *
 * `scope` namespaces keys per endpoint (e.g. 'fees:payment') so the same key
 * value used against two different endpoints can't collide.
 */
export function idempotencyGuard(scope: string) {
  return async (c: Context<{ Bindings: Env; Variables: { user: JwtPayload } }>, next: Next) => {
    const key = c.req.header('Idempotency-Key');
    if (!key) {
      await next();
      return;
    }

    const db = c.env.DB;
    const user = c.get('user');
    const institutionId = user.institution_id;

    // Hono caches the raw body text the first time any of .text()/.json() is
    // called on a request, so reading it here doesn't stop the route handler
    // from calling c.req.json() itself afterwards.
    const rawBody = await c.req.text().catch(() => '');
    const requestHash = await sha256Hex(rawBody);
    const rowId = crypto.randomUUID();

    let claimedNewKey = false;
    try {
      await db.prepare(`
        INSERT INTO idempotency_keys (id, institution_id, scope, idempotency_key, request_hash, status)
        VALUES (?, ?, ?, ?, ?, 'processing')
      `).bind(rowId, institutionId, scope, key, requestHash).run();
      claimedNewKey = true;
    } catch (e: any) {
      // Anything other than the unique-constraint hit is a real DB error.
      if (!/unique/i.test(e?.message || '')) throw e;
    }

    if (!claimedNewKey) {
      const existing = await db.prepare(`
        SELECT status, response_status, response_body, request_hash
        FROM idempotency_keys WHERE institution_id = ? AND scope = ? AND idempotency_key = ?
      `).bind(institutionId, scope, key).first<IdempotencyRow>();

      if (!existing) {
        // Row was deleted between our failed insert and this read (e.g. a
        // concurrent request's handler just threw and cleaned up) - treat
        // this as a fresh attempt rather than blocking forever.
        await next();
        return;
      }

      if (existing.request_hash && existing.request_hash !== requestHash) {
        return c.json({ error: 'Idempotency-Key was already used for a different request body' }, 422);
      }

      if (existing.status === 'completed') {
        c.status((existing.response_status as any) || 200);
        return c.body(existing.response_body || '');
      }

      return c.json({ error: 'A request with this Idempotency-Key is already being processed' }, 409);
    }

    try {
      await next();
    } catch (e) {
      // The handler threw instead of catching its own error - unclear
      // whether anything committed. Don't leave the key stuck in
      // 'processing' forever; let a genuine retry take a fresh attempt.
      await db.prepare(`DELETE FROM idempotency_keys WHERE id = ?`).bind(rowId).run().catch(() => {});
      throw e;
    }

    const status = c.res.status;
    if (status >= 500) {
      // Ambiguous outcome (infra error, exhausted D1 retries, etc.) - don't
      // cache it as a settled result. Delete the placeholder so a retry with
      // the same key gets a real attempt instead of a cached failure.
      await db.prepare(`DELETE FROM idempotency_keys WHERE id = ?`).bind(rowId).run().catch(() => {});
      return;
    }

    // Best-effort: if this fails, the write itself already succeeded above -
    // a replay of this key just won't short-circuit, which is safe, only
    // slightly wasteful.
    try {
      const bodyText = await c.res.clone().text();
      await db.prepare(`
        UPDATE idempotency_keys
        SET status = 'completed', response_status = ?, response_body = ?, completed_at = datetime('now')
        WHERE id = ?
      `).bind(status, bodyText, rowId).run();
    } catch {
      // Non-fatal - see comment above.
    }
  };
}
