import { describe, it, expect, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { env, reset } from 'cloudflare:test';
import { applySchema } from './helpers/apply-schema';
import { seedInstitution } from './helpers/seed';
import { idempotencyGuard } from '../src/middleware/idempotency';
import type { Env, JwtPayload } from '../src/types';

beforeEach(async () => {
  await reset();
  await applySchema(env.DB);
});

function buildApp(institutionId: string) {
  const app = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();
  app.use('*', async (c, next) => {
    c.set('user', { sub: 'u1', institution_id: institutionId, roles: ['admin'], email: 'a@b.com', name: 'A', exp: 0 });
    await next();
  });

  let handlerCalls = 0;
  app.post('/do', idempotencyGuard('test:scope'), async (c) => {
    handlerCalls++;
    const body = await c.req.json().catch(() => ({}));
    return c.json({ handlerCalls, echo: body }, 201);
  });

  app.post('/fail', idempotencyGuard('test:fail'), async (c) => {
    handlerCalls++;
    return c.json({ error: 'boom' }, 500);
  });

  return { app, getCalls: () => handlerCalls };
}

async function post(app: Hono<any>, path: string, body: any, headers: Record<string, string> = {}) {
  return app.request(
    path,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
    },
    { DB: env.DB }
  );
}

describe('idempotencyGuard', () => {
  it('is a no-op when no Idempotency-Key header is sent', async () => {
    const institutionId = crypto.randomUUID();
    await seedInstitution(env.DB, institutionId);
    const { app, getCalls } = buildApp(institutionId);

    await post(app, '/do', { amount: 1 });
    await post(app, '/do', { amount: 1 });

    expect(getCalls()).toBe(2);
  });

  it('replays the stored response for a repeated key instead of re-running the handler', async () => {
    const institutionId = crypto.randomUUID();
    await seedInstitution(env.DB, institutionId);
    const { app, getCalls } = buildApp(institutionId);

    const first = await post(app, '/do', { amount: 1 }, { 'Idempotency-Key': 'key-1' });
    expect(first.status).toBe(201);
    const firstBody = await first.json();
    expect(firstBody.handlerCalls).toBe(1);

    const second = await post(app, '/do', { amount: 1 }, { 'Idempotency-Key': 'key-1' });
    expect(second.status).toBe(201);
    const secondBody = await second.json();

    // Same response as the first call - the handler was not invoked again.
    expect(secondBody).toEqual(firstBody);
    expect(getCalls()).toBe(1);
  });

  it('scopes keys per institution - the same key from a different institution runs independently', async () => {
    const institutionA = crypto.randomUUID();
    const institutionB = crypto.randomUUID();
    await seedInstitution(env.DB, institutionA);
    await seedInstitution(env.DB, institutionB);

    const appA = buildApp(institutionA);
    const appB = buildApp(institutionB);

    await post(appA.app, '/do', { amount: 1 }, { 'Idempotency-Key': 'shared-key' });
    await post(appB.app, '/do', { amount: 1 }, { 'Idempotency-Key': 'shared-key' });

    expect(appA.getCalls()).toBe(1);
    expect(appB.getCalls()).toBe(1);
  });

  it('rejects the same key reused with a different request body', async () => {
    const institutionId = crypto.randomUUID();
    await seedInstitution(env.DB, institutionId);
    const { app, getCalls } = buildApp(institutionId);

    await post(app, '/do', { amount: 1 }, { 'Idempotency-Key': 'key-2' });
    const res = await post(app, '/do', { amount: 999 }, { 'Idempotency-Key': 'key-2' });

    expect(res.status).toBe(422);
    expect(getCalls()).toBe(1);
  });

  it('returns 409 for a concurrent duplicate that is still being processed', async () => {
    const institutionId = crypto.randomUUID();
    await seedInstitution(env.DB, institutionId);

    // Simulate the in-flight state directly: a 'processing' row already
    // claims this key, as if another request is mid-handler right now.
    await env.DB.prepare(`
      INSERT INTO idempotency_keys (id, institution_id, scope, idempotency_key, request_hash, status)
      VALUES (?, ?, 'test:scope', 'key-3', ?, 'processing')
    `).bind(crypto.randomUUID(), institutionId, await sha256(JSON.stringify({ amount: 1 }))).run();

    const { app, getCalls } = buildApp(institutionId);
    const res = await post(app, '/do', { amount: 1 }, { 'Idempotency-Key': 'key-3' });

    expect(res.status).toBe(409);
    expect(getCalls()).toBe(0);
  });

  it('does not cache a 5xx response, so a retry with the same key gets a fresh attempt', async () => {
    const institutionId = crypto.randomUUID();
    await seedInstitution(env.DB, institutionId);
    const { app, getCalls } = buildApp(institutionId);

    const first = await post(app, '/fail', {}, { 'Idempotency-Key': 'key-4' });
    expect(first.status).toBe(500);

    const row = await env.DB.prepare(`SELECT * FROM idempotency_keys WHERE idempotency_key = 'key-4'`).first();
    expect(row).toBeNull();

    const second = await post(app, '/fail', {}, { 'Idempotency-Key': 'key-4' });
    expect(second.status).toBe(500);

    expect(getCalls()).toBe(2);
  });
});

async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}
