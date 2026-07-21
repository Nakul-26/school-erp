import { Context, Next } from 'hono';
import { ZodSchema } from 'zod';

export function validateBody<T>(schema: ZodSchema<T>) {
  return async (c: Context, next: Next) => {
    try {
      const body = await c.req.json();
      const result = schema.safeParse(body);
      if (!result.success) {
        const issues = result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join(', ');
        return c.json({ error: `Validation error: ${issues}` }, 400);
      }
      c.set('validBody', result.data);
      await next();
    } catch (err) {
      return c.json({ error: 'Invalid JSON request payload' }, 400);
    }
  };
}
