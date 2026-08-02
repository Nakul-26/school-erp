export type IntegrationProvider = 'CustomWebhook' | 'Moodle' | 'GoogleWorkspace' | 'Microsoft365' | 'Razorpay' | 'Stripe' | 'LDAP' | 'SAML' | 'GenericREST' | 'Fast2SMS' | 'MSG91' | 'Twilio' | 'GenericSMS';
export type IntegrationType = 'OUTBOUND_WEBHOOK' | 'INBOUND_REST' | 'OAUTH2' | 'SMS_GATEWAY';
export type IntegrationStatus = 'ACTIVE' | 'INACTIVE' | 'DEGRADED';
export type AuthType = 'NONE' | 'BEARER_TOKEN' | 'API_KEY' | 'HMAC_SECRET' | 'OAUTH2';
export type DeliveryStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'RETRYING' | 'DLQ';

// SMS providers dispatchable via IntegrationsService.sendSms — kept in sync with the switch in that method.
export const SMS_PROVIDERS: IntegrationProvider[] = ['Fast2SMS', 'MSG91', 'Twilio', 'GenericSMS'];

export interface Integration {
  id: string;
  institution_id: string;
  name: string;
  provider: IntegrationProvider;
  type: IntegrationType;
  status: IntegrationStatus;
  base_url?: string | null;
  auth_type: AuthType;
  rate_limit_rpm: number;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface IntegrationCredential {
  id: string;
  integration_id: string;
  institution_id: string;
  credential_type: string;
  encrypted_secret: string;
  created_at: string;
  updated_at: string;
}

export interface WebhookSubscription {
  id: string;
  integration_id?: string | null;
  institution_id: string;
  name: string;
  event_type: string;
  target_url: string;
  secret: string;
  filter_rules_json?: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface WebhookDelivery {
  id: string;
  subscription_id?: string | null;
  integration_id?: string | null;
  institution_id: string;
  event_type: string;
  target_url: string;
  signature?: string | null;
  request_headers_json?: string | null;
  request_body_json?: string | null;
  response_status?: number | null;
  response_body?: string | null;
  duration_ms: number;
  attempt: number;
  max_attempts: number;
  status: DeliveryStatus;
  next_retry_at?: string | null;
  created_at: string;
}
