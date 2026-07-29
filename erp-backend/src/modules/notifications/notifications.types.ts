export interface NotificationItem {
  id: string;
  institution_id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: number;
  recipient_type?: string;
  channel?: 'in_app' | 'email' | 'sms' | 'whatsapp' | 'push' | string;
  template_id?: string | null;
  status: 'PENDING' | 'QUEUED' | 'SENDING' | 'DELIVERED' | 'FAILED' | 'READ' | 'ARCHIVED' | 'DEAD_LETTER' | string;
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' | string;
  payload_json?: string | null;
  scheduled_at?: string | null;
  sent_at?: string | null;
  failed_at?: string | null;
  failure_reason?: string | null;
  retry_count?: number;
  created_at: string;
  read_at?: string | null;
}

export interface NotificationTemplate {
  id: string;
  institution_id: string;
  name: string;
  event_type: string;
  channel: 'all' | 'email' | 'sms' | 'whatsapp' | 'push' | 'in_app' | string;
  subject: string;
  body: string;
  variables_json?: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface CreateTemplateInput {
  name: string;
  event_type: string;
  channel?: string;
  subject: string;
  body: string;
  variables_json?: string;
}

export interface NotificationQueueItem {
  id: string;
  institution_id: string;
  notification_id?: string | null;
  recipient_id: string;
  channel: string;
  payload_json: string;
  status: 'PENDING' | 'QUEUED' | 'PROCESSING' | 'DELIVERED' | 'FAILED' | 'DEAD_LETTER' | string;
  attempts: number;
  max_attempts: number;
  next_retry_at?: string | null;
  error_message?: string | null;
  scheduled_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationPreference {
  user_id: string;
  email_enabled: number;
  sms_enabled: number;
  whatsapp_enabled: number;
  push_enabled: number;
  in_app_enabled: number;
  quiet_hours_start?: string | null;
  quiet_hours_end?: string | null;
  language?: string;
  timezone?: string;
  updated_at?: string;
}

export interface NotificationLog {
  id: string;
  institution_id: string;
  notification_id?: string | null;
  provider: 'RESEND' | 'FAST2SMS' | 'TWILIO' | 'META_WHATSAPP' | 'FCM_PUSH' | 'IN_APP' | string;
  provider_message_id?: string | null;
  channel: string;
  status: string;
  response_payload?: string | null;
  latency_ms: number;
  created_at: string;
}
