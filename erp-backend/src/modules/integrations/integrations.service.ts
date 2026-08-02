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

  // ==================== SMS GATEWAY DISPATCH ==================== //

  async sendSms(integrationId: string, phone: string, text: string): Promise<{ success: boolean; provider: string }> {
    const integration = await this.repo.getIntegrationById(integrationId);
    if (!integration) throw new Error(`Integration not found: ${integrationId}`);

    const apiKeyCred = await this.repo.getCredentialByType(integrationId, 'API_KEY');
    if (!apiKeyCred) {
      console.log(`[SMS Gateway] No API_KEY credential saved for integration ${integrationId} — cannot send.`);
      return { success: false, provider: integration.provider };
    }
    const apiKey = decryptSecret(apiKeyCred.encrypted_secret);
    const number = phone.replace(/[^0-9]/g, '');

    try {
      switch (integration.provider) {
        case 'Fast2SMS': {
          const res = await fetch(integration.base_url || 'https://www.fast2sms.com/dev/bulkV2', {
            method: 'POST',
            headers: { authorization: apiKey, 'Content-Type': 'application/json' },
            body: JSON.stringify({ route: 'q', message: text, language: 'english', numbers: number })
          });
          return { success: res.ok, provider: integration.provider };
        }
        case 'MSG91': {
          const senderCred = await this.repo.getCredentialByType(integrationId, 'SENDER_ID');
          const sender = senderCred ? decryptSecret(senderCred.encrypted_secret) : 'MSGIND';
          const url = new URL(integration.base_url || 'https://api.msg91.com/api/v2/sendsms');
          url.searchParams.set('authkey', apiKey);
          url.searchParams.set('mobiles', number);
          url.searchParams.set('message', text);
          url.searchParams.set('sender', sender);
          url.searchParams.set('route', '4');
          const res = await fetch(url.toString(), { method: 'POST' });
          return { success: res.ok, provider: integration.provider };
        }
        case 'Twilio': {
          const sidCred = await this.repo.getCredentialByType(integrationId, 'ACCOUNT_SID');
          const fromCred = await this.repo.getCredentialByType(integrationId, 'SENDER_ID');
          if (!sidCred || !fromCred) return { success: false, provider: integration.provider };
          const accountSid = decryptSecret(sidCred.encrypted_secret);
          const from = decryptSecret(fromCred.encrypted_secret);
          const body = new URLSearchParams({ To: `+${number}`, From: from, Body: text });
          const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
            method: 'POST',
            headers: {
              Authorization: `Basic ${btoa(`${accountSid}:${apiKey}`)}`,
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: body.toString()
          });
          return { success: res.ok, provider: integration.provider };
        }
        case 'GenericSMS':
        default: {
          if (!integration.base_url) return { success: false, provider: integration.provider };
          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          if (integration.auth_type === 'BEARER_TOKEN') headers['Authorization'] = `Bearer ${apiKey}`;
          else headers['Authorization'] = apiKey;
          const res = await fetch(integration.base_url, {
            method: 'POST',
            headers,
            body: JSON.stringify({ to: number, message: text })
          });
          return { success: res.ok, provider: integration.provider };
        }
      }
    } catch (err) {
      console.error('[SMS Gateway Error]:', err);
      return { success: false, provider: integration.provider };
    }
  }

  async sendTestSms(integrationId: string, phone: string): Promise<{ success: boolean; provider: string }> {
    return this.sendSms(integrationId, phone, 'This is a test message from your TrackFlow ERP SMS gateway configuration.');
  }
}
