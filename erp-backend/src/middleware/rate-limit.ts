import { Context, Next } from 'hono';

const memoryAttempts = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(maxAttempts: number, windowMs: number) {
  return async (c: Context, next: Next) => {
    const ip = c.req.header('cf-connecting-ip')
      || c.req.header('x-forwarded-for')
      || 'unknown';
    const key = `${c.req.path}:${ip}`;
    const now = Date.now();
    const db: D1Database | undefined = (c.env as any)?.DB;

    if (db) {
      try {
        await db.prepare(`
          CREATE TABLE IF NOT EXISTS rate_limits (
            key TEXT PRIMARY KEY,
            count INTEGER NOT NULL DEFAULT 1,
            reset_at INTEGER NOT NULL
          )
        `).run();

        const entry = await db.prepare('SELECT count, reset_at FROM rate_limits WHERE key = ?').bind(key).first<{ count: number; reset_at: number }>();

        if (entry && now < entry.reset_at) {
          if (entry.count >= maxAttempts) {
            return c.json({ error: 'Too many attempts. Please try again later.' }, 429);
          }
          await db.prepare('UPDATE rate_limits SET count = count + 1 WHERE key = ?').bind(key).run();
        } else {
          await db.prepare(`
            INSERT INTO rate_limits (key, count, reset_at)
            VALUES (?, 1, ?)
            ON CONFLICT(key) DO UPDATE SET count = 1, reset_at = excluded.reset_at
          `).bind(key, now + windowMs).run();
        }
        await next();
        return;
      } catch (err) {
        console.error('[RateLimit DB Error, falling back to memory]:', err);
      }
    }

    const entry = memoryAttempts.get(key);
    if (entry && now < entry.resetAt) {
      if (entry.count >= maxAttempts) {
        return c.json({ error: 'Too many attempts. Please try again later.' }, 429);
      }
      entry.count++;
    } else {
      memoryAttempts.set(key, { count: 1, resetAt: now + windowMs });
    }

    await next();
  };
}

