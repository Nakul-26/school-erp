import { Env } from '../../types';
import { sendEmail } from '../../utils/email';

export interface NotificationPayload {
  subject: string;
  body: string;
  attachments?: { file_name: string; file_url: string }[];
}

export interface RecipientContact {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
}

export interface NotificationAdapter {
  send(env: Env, recipients: RecipientContact[], payload: NotificationPayload): Promise<void>;
}

export class ERPInboxAdapter implements NotificationAdapter {
  async send(env: Env, recipients: RecipientContact[], payload: NotificationPayload): Promise<void> {
    console.log(`[ERPInboxAdapter] Internal inbox message distributed to ${recipients.length} users.`);
  }
}

export class EmailAdapter implements NotificationAdapter {
  async send(env: Env, recipients: RecipientContact[], payload: NotificationPayload): Promise<void> {
    console.log(`[EmailAdapter] Dispatching emails to ${recipients.length} users.`);
    for (const r of recipients) {
      if (!r.email) continue;
      try {
        const html = `
          <h3>${payload.subject}</h3>
          <p>${payload.body.replace(/\n/g, '<br/>')}</p>
          ${payload.attachments && payload.attachments.length > 0 ? `
            <hr/>
            <h4>Attachments:</h4>
            <ul>
              ${payload.attachments.map(a => `<li><a href="${a.file_url}">${a.file_name}</a></li>`).join('')}
            </ul>
          ` : ''}
        `;
        await sendEmail(env, {
          to: r.email,
          subject: payload.subject,
          html,
          text: payload.body
        });
      } catch (err) {
        console.error(`[EmailAdapter] Failed to send email to ${r.email}:`, err);
      }
    }
  }
}

export class SMSAdapter implements NotificationAdapter {
  async send(env: Env, recipients: RecipientContact[], payload: NotificationPayload): Promise<void> {
    console.log(`[SMSAdapter] Dispatching SMS to ${recipients.length} users.`);
    for (const r of recipients) {
      if (!r.phone) continue;
      console.log(`[SMSAdapter] Send SMS to ${r.phone} for user ${r.name}: "${payload.subject} - ${payload.body.slice(0, 50)}..."`);
    }
  }
}

export class WhatsAppAdapter implements NotificationAdapter {
  async send(env: Env, recipients: RecipientContact[], payload: NotificationPayload): Promise<void> {
    console.log(`[WhatsAppAdapter] Dispatching WhatsApp messages to ${recipients.length} users.`);
    for (const r of recipients) {
      if (!r.phone) continue;
      console.log(`[WhatsAppAdapter] Send WhatsApp to ${r.phone} for user ${r.name}: "${payload.body.slice(0, 100)}..."`);
    }
  }
}

export class NotificationService {
  private adapters: Record<string, NotificationAdapter> = {};

  constructor() {
    this.adapters['erp'] = new ERPInboxAdapter();
    this.adapters['email'] = new EmailAdapter();
    this.adapters['sms'] = new SMSAdapter();
    this.adapters['whatsapp'] = new WhatsAppAdapter();
  }

  async deliver(env: Env, channels: string[], recipients: RecipientContact[], payload: NotificationPayload): Promise<void> {
    for (const channel of channels) {
      const adapter = this.adapters[channel.trim().toLowerCase()];
      if (adapter) {
        try {
          await adapter.send(env, recipients, payload);
        } catch (err) {
          console.error(`[NotificationService] Error executing adapter for channel "${channel}":`, err);
        }
      } else {
        console.warn(`[NotificationService] No adapter registered for channel "${channel}"`);
      }
    }
  }
}
