import { Context, Next } from 'hono';

const attempts = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(maxAttempts: number, windowMs: number) {
  return async (c: Context, next: Next) => {
    const ip = c.req.header('cf-connecting-ip')
      || c.req.header('x-forwarded-for')
      || 'unknown';
    const key = `${c.req.path}:${ip}`;
    const now = Date.now();

    const entry = attempts.get(key);
    if (entry && now < entry.resetAt) {
      if (entry.count >= maxAttempts) {
        return c.json({ error: 'Too many attempts. Please try again later.' }, 429);
      }
      entry.count++;
    } else {
      attempts.set(key, { count: 1, resetAt: now + windowMs });
    }

    await next();
  };
}
