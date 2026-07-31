import { Hono } from 'hono';
import { Env } from '../../types';
import { authMiddleware } from '../../middleware/auth';
import { IntegrationsRepository } from './integrations.repository';
import { IntegrationsService } from './integrations.service';
import { encryptSecret } from './crypto.utils';

const integrations = new Hono<{ Bindings: Env }>();

integrations.use('*', authMiddleware);

function getService(c: any) {
  const repo = new IntegrationsRepository(c.env.DB);
  return new IntegrationsService(repo);
}

function getInstId(c: any): string {
  const user = c.get('user');
  return user?.institution_id || c.req.header('x-institution-id') || 'inst-1';
}

function getUserId(c: any): string {
  const user = c.get('user');
  return user?.sub || 'ADMIN';
}

// 1. List Integrations
integrations.get('/', async (c) => {
  const service = getService(c);
  const institutionId = getInstId(c);
  const items = await service.repo.listIntegrations(institutionId);
  return c.json(items);
});

// 2. Create Integration
integrations.post('/', async (c) => {
  const service = getService(c);
  const institutionId = getInstId(c);
  const body = await c.req.json();

  if (!body.name || !body.provider) {
    return c.json({ error: 'name and provider are required' }, 400);
  }

  const integration = await service.repo.createIntegration({
    id: `int_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    institution_id: institutionId,
    name: body.name,
    provider: body.provider,
    type: body.type || 'OUTBOUND_WEBHOOK',
    base_url: body.baseUrl,
    auth_type: body.authType || 'NONE',
    rate_limit_rpm: body.rateLimitRpm || 60
  });

  return c.json(integration, 201);
});

// 3. Save Encrypted Credential
integrations.post('/:id/credentials', async (c) => {
  const service = getService(c);
  const institutionId = getInstId(c);
  const integrationId = c.req.param('id');
  const body = await c.req.json();

  if (!body.secret) {
    return c.json({ error: 'secret is required' }, 400);
  }

  const encryptedSecret = encryptSecret(body.secret);
  const cred = await service.repo.saveCredential({
    id: `cred_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    integration_id: integrationId,
    institution_id: institutionId,
    credential_type: body.credentialType || 'API_KEY',
    encrypted_secret: encryptedSecret
  });

  return c.json({ id: cred.id, integration_id: integrationId, status: 'ENCRYPTED_SAVED' }, 201);
});

// 4. Get Masked Credential
integrations.get('/:id/credentials', async (c) => {
  const service = getService(c);
  const integrationId = c.req.param('id');
  const masked = await service.getMaskedCredentials(integrationId);
  if (!masked) return c.json({ error: 'No credentials found' }, 404);
  return c.json(masked);
});

// 5. List Webhook Subscriptions
integrations.get('/webhooks/subscriptions', async (c) => {
  const service = getService(c);
  const institutionId = getInstId(c);
  const subs = await service.repo.listSubscriptions(institutionId);
  return c.json(subs);
});

// 6. Create Webhook Subscription
integrations.post('/webhooks/subscriptions', async (c) => {
  const service = getService(c);
  const institutionId = getInstId(c);
  const body = await c.req.json();

  if (!body.name || !body.eventType || !body.targetUrl) {
    return c.json({ error: 'name, eventType, and targetUrl are required' }, 400);
  }

  const secret = body.secret || `whsec_${Math.random().toString(36).substr(2, 16)}`;

  const sub = await service.repo.createSubscription({
    id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    integration_id: body.integrationId,
    institution_id: institutionId,
    name: body.name,
    event_type: body.eventType,
    target_url: body.targetUrl,
    secret,
    filter_rules_json: body.filterRules ? JSON.stringify(body.filterRules) : undefined
  });

  return c.json(sub, 201);
});

// 7. Send Test Webhook
integrations.post('/webhooks/subscriptions/:id/test', async (c) => {
  const service = getService(c);
  const id = c.req.param('id');

  try {
    const result = await service.sendTestWebhook(id);
    return c.json(result);
  } catch (err: any) {
    return c.json({ error: err.message }, 400);
  }
});

// 8. List Deliveries & DLQ
integrations.get('/webhooks/deliveries', async (c) => {
  const service = getService(c);
  const institutionId = getInstId(c);
  const status = c.req.query('status');

  const deliveries = await service.repo.listDeliveries(institutionId, status);
  return c.json(deliveries);
});

// 9. Replay Webhook Delivery
integrations.post('/webhooks/deliveries/:id/replay', async (c) => {
  const service = getService(c);
  const id = c.req.param('id');

  try {
    const replayed = await service.replayDelivery(id);
    return c.json({ success: true, replayed });
  } catch (err: any) {
    return c.json({ error: err.message }, 400);
  }
});

export default integrations;
