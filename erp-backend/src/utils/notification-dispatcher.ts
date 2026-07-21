import type { Env } from '../types';
import { sendPushToUsers } from './webpush';
import { sendEmail } from './email';

export interface NotificationPayload {
  userId: string;
  institutionId: string;
  title: string;
  message: string;
  type?: string;
  email?: string;
  phone?: string;
  channels?: ('in_app' | 'push' | 'email' | 'sms')[];
}

export async function dispatchNotification(
  env: Env,
  payload: NotificationPayload
): Promise<{ inApp: boolean; push: boolean; email: boolean; sms: boolean }> {
  const {
    userId,
    institutionId,
    title,
    message,
    type = 'general',
    email,
    phone,
    channels = ['in_app', 'push', 'email']
  } = payload;

  const results = { inApp: false, push: false, email: false, sms: false };

  // 1. In-App Notification (Database Insert)
  if (channels.includes('in_app')) {
    try {
      const id = crypto.randomUUID();
      await env.DB.prepare(`
        INSERT INTO notifications (id, institution_id, user_id, title, message, type, is_read, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 0, datetime('now'))
      `).bind(id, institutionId, userId, title, message, type).run();
      results.inApp = true;
    } catch (err) {
      console.error('[NotificationDispatcher] In-App dispatch error:', err);
    }
  }

  // 2. Web Push Notification
  if (channels.includes('push')) {
    try {
      await sendPushToUsers(env, env.DB, [userId], { title, body: message });
      results.push = true;
    } catch (err) {
      console.error('[NotificationDispatcher] Push dispatch error:', err);
    }
  }

  // 3. Email Notification
  if (channels.includes('email') && email && env.RESEND_API_KEY) {
    try {
      const emailRes: any = await sendEmail(env, {
        to: email,
        subject: title,
        html: `<div style="font-family:sans-serif;padding:16px;"><h2>${title}</h2><p>${message}</p></div>`
      });
      results.email = Boolean(emailRes && (emailRes.id || emailRes.success));
    } catch (err) {
      console.error('[NotificationDispatcher] Email dispatch error:', err);
    }
  }

  // 4. SMS Notification Hook (Fast2SMS / Twilio)
  if (channels.includes('sms') && phone) {
    try {
      results.sms = await sendSmsHook(env, phone, `${title}: ${message}`);
    } catch (err) {
      console.error('[NotificationDispatcher] SMS dispatch error:', err);
    }
  }

  return results;
}

async function sendSmsHook(env: Env, phone: string, text: string): Promise<boolean> {
  const smsApiKey = (env as any).SMS_API_KEY;
  if (!smsApiKey) {
    console.log(`[SMS Gateway Simulated] To: ${phone} | Text: ${text}`);
    return true;
  }

  try {
    const res = await fetch('https://www.fast2sms.com/dev/bulkV2', {
      method: 'POST',
      headers: {
        'authorization': smsApiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        route: 'q',
        message: text,
        language: 'english',
        numbers: phone.replace(/[^0-9]/g, '')
      })
    });
    return res.ok;
  } catch (err) {
    console.error('[SMS Gateway Error]:', err);
    return false;
  }
}
