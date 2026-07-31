import { IntegrationsRepository } from './integrations.repository';
import { WebhookSubscription, WebhookDelivery, DeliveryStatus } from './types';
import { generateHMACSignature, maskSecret, encryptSecret, decryptSecret } from './crypto.utils';
import { createAuditLog } from '../../utils/audit';

export class IntegrationsService {
  constructor(public repo: IntegrationsRepository) {}

  private async audit(opts: any) {
    try {
      if ((this.repo as any).db) {
        const userId = (opts.userId && opts.userId !== 'SYSTEM') ? opts.userId : undefined;
        await createAuditLog((this.repo as any).db, { ...opts, userId });
      }
    } catch (e) {}
  }

  // ==================== WEBHOOK DELIVERY EXECUTION ==================== //

  async executeWebhookDelivery(subscriptionId: string, eventType: string, eventPayload: any): Promise<WebhookDelivery> {
    const sub = await this.repo.getSubscriptionById(subscriptionId);
    if (!sub) throw new Error(`Webhook subscription not found: ${subscriptionId}`);

    const deliveryId = `deliv_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const timestamp = Math.floor(Date.now() / 1000).toString();

    const requestBody = JSON.stringify({
      id: deliveryId,
      event: eventType,
      timestamp,
      institutionId: sub.institution_id,
      data: eventPayload
    });

    const signature = await generateHMACSignature(sub.secret, requestBody);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-ERP-Signature': signature,
      'X-ERP-Timestamp': timestamp,
      'X-ERP-Event': eventType,
      'X-ERP-Delivery-ID': deliveryId,
      'User-Agent': 'Antigravity-ERP-WebhookEngine/2.0'
    };

    const deliveryLog = await this.repo.createDeliveryLog({
      id: deliveryId,
      subscription_id: sub.id,
      integration_id: sub.integration_id || undefined,
      institution_id: sub.institution_id,
      event_type: eventType,
      target_url: sub.target_url,
      signature,
      request_headers_json: JSON.stringify(headers),
      request_body_json: requestBody,
      attempt: 1,
      max_attempts: 3,
      status: 'PENDING'
    });

    return await this.performHttpDelivery(deliveryLog, headers, requestBody);
  }

  async performHttpDelivery(delivery: WebhookDelivery, headers: Record<string, string>, body: string): Promise<WebhookDelivery> {
    const startTime = Date.now();
    let responseStatus = 0;
    let responseText = '';
    let status: DeliveryStatus = 'SUCCESS';

    try {
      const response = await fetch(delivery.target_url, {
        method: 'POST',
        headers,
        body
      });

      duration_ms: Date.now() - startTime;
      responseStatus = response.status;
      responseText = await response.text();

      if (!response.ok) {
        status = delivery.attempt >= delivery.max_attempts ? 'DLQ' : 'RETRYING';
      }
    } catch (err: any) {
      responseText = err.message || 'Network dispatch failed';
      status = delivery.attempt >= delivery.max_attempts ? 'DLQ' : 'RETRYING';
    }

    const duration_ms = Date.now() - startTime;

    let nextRetryAt: string | null = null;
    if (status === 'RETRYING') {
      const backoffSeconds = Math.pow(2, delivery.attempt) * 5; // Exponential backoff: 10s, 20s, 40s
      nextRetryAt = new Date(Date.now() + backoffSeconds * 1000).toISOString();
    }

    const updated = await this.repo.updateDeliveryLog(delivery.id, {
      response_status: responseStatus,
      response_body: responseText.substring(0, 1000),
      duration_ms,
      status,
      next_retry_at: nextRetryAt
    });

    await this.audit({
      institutionId: delivery.institution_id,
      userId: 'SYSTEM',
      module: 'INTEGRATIONS',
      action: 'DELIVER_WEBHOOK',
      entityType: 'webhook_deliveries',
      entityId: delivery.id,
      eventName: 'WebhookDelivered',
      afterData: { status, responseStatus, duration_ms }
    });

    return updated || delivery;
  }

  // ==================== REPLAY & TEST CONSOLE ==================== //

  async replayDelivery(deliveryId: string): Promise<WebhookDelivery> {
    const delivery = await this.repo.getDeliveryById(deliveryId);
    if (!delivery) throw new Error(`Webhook delivery log not found: ${deliveryId}`);

    const sub = delivery.subscription_id ? await this.repo.getSubscriptionById(delivery.subscription_id) : null;
    const secret = sub ? sub.secret : 'default-secret';

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const body = delivery.request_body_json || JSON.stringify({ replayOf: deliveryId });
    const signature = await generateHMACSignature(secret, body);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-ERP-Signature': signature,
      'X-ERP-Timestamp': timestamp,
      'X-ERP-Event': delivery.event_type,
      'X-ERP-Delivery-ID': delivery.id,
      'X-ERP-Replay': 'true',
      'User-Agent': 'Antigravity-ERP-WebhookEngine/2.0'
    };

    const newAttempt = delivery.attempt + 1;
    await this.repo.updateDeliveryLog(delivery.id, { attempt: newAttempt, status: 'PENDING' });

    return await this.performHttpDelivery(delivery, headers, body);
  }

  async sendTestWebhook(subscriptionId: string): Promise<{ success: boolean; delivery: WebhookDelivery }> {
    const delivery = await this.executeWebhookDelivery(subscriptionId, 'TestWebhookEvent', {
      message: 'Antigravity ERP Webhook Verification Ping',
      sentAt: new Date().toISOString()
    });

    return {
      success: delivery.status === 'SUCCESS',
      delivery
    };
  }

  // ==================== MASKED CREDENTIAL RETRIEVAL ==================== //

  async getMaskedCredentials(integrationId: string) {
    const cred = await this.repo.getCredentialByIntegrationId(integrationId);
    if (!cred) return null;

    const raw = decryptSecret(cred.encrypted_secret);
    return {
      id: cred.id,
      integration_id: cred.integration_id,
      credential_type: cred.credential_type,
      masked_secret: maskSecret(raw),
      created_at: cred.created_at
    };
  }
}
