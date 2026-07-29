import { MiddlewareHandler } from 'hono';

export const requestIdMiddleware: MiddlewareHandler = async (c, next) => {
  const existingRequestId = c.req.header('x-request-id') || c.req.header('X-Request-ID');
  const requestId = existingRequestId || crypto.randomUUID();

  c.set('requestId', requestId);
  c.header('X-Request-ID', requestId);

  await next();
};
