import { Integration, IntegrationCredential, WebhookSubscription, WebhookDelivery, DeliveryStatus } from './types';

export class IntegrationsRepository {
  constructor(private db: any) {}

  // ==================== INTEGRATIONS REGISTRY ==================== //

  async createIntegration(data: {
    id: string;
    institution_id: string;
    name: string;
    provider: string;
    type: string;
    status?: string;
    base_url?: string;
    auth_type?: string;
    rate_limit_rpm?: number;
  }): Promise<Integration> {
    const now = new Date().toISOString();
    await this.db.prepare(
      `INSERT INTO integrations (
        id, institution_id, name, provider, type, status, base_url,
        auth_type, rate_limit_rpm, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`
    ).bind(
      data.id,
      data.institution_id,
      data.name,
      data.provider,
      data.type,
      data.status || 'ACTIVE',
      data.base_url || null,
      data.auth_type || 'NONE',
      data.rate_limit_rpm || 60,
      now,
      now
    ).run();

    const row = await this.db.prepare(`SELECT * FROM integrations WHERE id = ?`).bind(data.id).first();
    return row as Integration;
  }

  async listIntegrations(institutionId: string): Promise<Integration[]> {
    const res = await this.db.prepare(
      `SELECT * FROM integrations WHERE institution_id = ? ORDER BY created_at DESC`
    ).bind(institutionId).all();
    return (res.results || []) as Integration[];
  }

  async getIntegrationById(id: string): Promise<Integration | null> {
    const row = await this.db.prepare(`SELECT * FROM integrations WHERE id = ?`).bind(id).first();
    return row ? (row as Integration) : null;
  }

  async updateIntegration(id: string, fields: Partial<Integration>): Promise<Integration | null> {
    const keys = Object.keys(fields).filter(k => k !== 'id');
    if (keys.length === 0) return this.getIntegrationById(id);

    const now = new Date().toISOString();
    fields.updated_at = now;
    if (!keys.includes('updated_at')) keys.push('updated_at');

    const setClauses = keys.map(k => `${k} = ?`).join(', ');
    const values = keys.map(k => (fields as any)[k]);
    values.push(id);

    await this.db.prepare(`UPDATE integrations SET ${setClauses} WHERE id = ?`).bind(...values).run();
    return this.getIntegrationById(id);
  }

  // ==================== CREDENTIALS ==================== //

  async saveCredential(data: {
    id: string;
    integration_id: string;
    institution_id: string;
    credential_type: string;
    encrypted_secret: string;
  }): Promise<IntegrationCredential> {
    const now = new Date().toISOString();
    await this.db.prepare(
      `INSERT INTO integration_credentials (
        id, integration_id, institution_id, credential_type, encrypted_secret, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(data.id, data.integration_id, data.institution_id, data.credential_type, data.encrypted_secret, now, now).run();

    const row = await this.db.prepare(`SELECT * FROM integration_credentials WHERE id = ?`).bind(data.id).first();
    return row as IntegrationCredential;
  }

  async getCredentialByIntegrationId(integrationId: string): Promise<IntegrationCredential | null> {
    const row = await this.db.prepare(
      `SELECT * FROM integration_credentials WHERE integration_id = ? ORDER BY created_at DESC LIMIT 1`
    ).bind(integrationId).first();
    return row ? (row as IntegrationCredential) : null;
  }

  async getCredentialByType(integrationId: string, credentialType: string): Promise<IntegrationCredential | null> {
    const row = await this.db.prepare(
      `SELECT * FROM integration_credentials WHERE integration_id = ? AND credential_type = ? ORDER BY created_at DESC LIMIT 1`
    ).bind(integrationId, credentialType).first();
    return row ? (row as IntegrationCredential) : null;
  }

  async getActiveIntegrationByProviders(institutionId: string, providers: string[]): Promise<Integration | null> {
    if (providers.length === 0) return null;
    const placeholders = providers.map(() => '?').join(', ');
    const row = await this.db.prepare(
      `SELECT * FROM integrations WHERE institution_id = ? AND provider IN (${placeholders}) AND is_active = 1 AND status = 'ACTIVE' ORDER BY updated_at DESC LIMIT 1`
    ).bind(institutionId, ...providers).first();
    return row ? (row as Integration) : null;
  }

  // ==================== WEBHOOK SUBSCRIPTIONS ==================== //

  async createSubscription(data: {
    id: string;
    integration_id?: string;
    institution_id: string;
    name: string;
    event_type: string;
    target_url: string;
    secret: string;
    filter_rules_json?: string;
  }): Promise<WebhookSubscription> {
    const now = new Date().toISOString();
    await this.db.prepare(
      `INSERT INTO webhook_subscriptions (
        id, integration_id, institution_id, name, event_type, target_url,
        secret, filter_rules_json, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`
    ).bind(
      data.id,
      data.integration_id || null,
      data.institution_id,
      data.name,
      data.event_type,
      data.target_url,
      data.secret,
      data.filter_rules_json || null,
      now,
      now
    ).run();

    const row = await this.db.prepare(`SELECT * FROM webhook_subscriptions WHERE id = ?`).bind(data.id).first();
    return row as WebhookSubscription;
  }

  async listSubscriptions(institutionId: string): Promise<WebhookSubscription[]> {
    const res = await this.db.prepare(
      `SELECT * FROM webhook_subscriptions WHERE institution_id = ? ORDER BY created_at DESC`
    ).bind(institutionId).all();
    return (res.results || []) as WebhookSubscription[];
  }

  async getSubscriptionById(id: string): Promise<WebhookSubscription | null> {
    const row = await this.db.prepare(`SELECT * FROM webhook_subscriptions WHERE id = ?`).bind(id).first();
    return row ? (row as WebhookSubscription) : null;
  }

  async getMatchingSubscriptions(institutionId: string, eventType: string): Promise<WebhookSubscription[]> {
    const res = await this.db.prepare(
      `SELECT * FROM webhook_subscriptions
       WHERE institution_id = ? AND is_active = 1 AND (event_type = ? OR event_type = '*')`
    ).bind(institutionId, eventType).all();
    return (res.results || []) as WebhookSubscription[];
  }

  // ==================== WEBHOOK DELIVERIES & DLQ ==================== //

  async createDeliveryLog(data: {
    id: string;
    subscription_id?: string;
    integration_id?: string;
    institution_id: string;
    event_type: string;
    target_url: string;
    signature?: string;
    request_headers_json?: string;
    request_body_json?: string;
    attempt?: number;
    max_attempts?: number;
    status?: DeliveryStatus;
  }): Promise<WebhookDelivery> {
    const now = new Date().toISOString();
    await this.db.prepare(
      `INSERT INTO webhook_deliveries (
        id, subscription_id, integration_id, institution_id, event_type, target_url,
        signature, request_headers_json, request_body_json, duration_ms, attempt,
        max_attempts, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)`
    ).bind(
      data.id,
      data.subscription_id || null,
      data.integration_id || null,
      data.institution_id,
      data.event_type,
      data.target_url,
      data.signature || null,
      data.request_headers_json || null,
      data.request_body_json || null,
      data.attempt || 1,
      data.max_attempts || 3,
      data.status || 'PENDING',
      now
    ).run();

    const row = await this.db.prepare(`SELECT * FROM webhook_deliveries WHERE id = ?`).bind(data.id).first();
    return row as WebhookDelivery;
  }

  async updateDeliveryLog(id: string, fields: Partial<WebhookDelivery>): Promise<WebhookDelivery | null> {
    const keys = Object.keys(fields).filter(k => k !== 'id');
    if (keys.length === 0) return this.getDeliveryById(id);

    const setClauses = keys.map(k => `${k} = ?`).join(', ');
    const values = keys.map(k => (fields as any)[k]);
    values.push(id);

    await this.db.prepare(`UPDATE webhook_deliveries SET ${setClauses} WHERE id = ?`).bind(...values).run();
    return this.getDeliveryById(id);
  }

  async getDeliveryById(id: string): Promise<WebhookDelivery | null> {
    const row = await this.db.prepare(`SELECT * FROM webhook_deliveries WHERE id = ?`).bind(id).first();
    return row ? (row as WebhookDelivery) : null;
  }

  async listDeliveries(institutionId: string, status?: string): Promise<WebhookDelivery[]> {
    let query = `SELECT * FROM webhook_deliveries WHERE institution_id = ?`;
    const params: any[] = [institutionId];

    if (status) {
      query += ` AND status = ?`;
      params.push(status);
    }
    query += ` ORDER BY created_at DESC LIMIT 50`;

    const res = await this.db.prepare(query).bind(...params).all();
    return (res.results || []) as WebhookDelivery[];
  }
}
