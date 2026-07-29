import type { Env } from '../types';
import { sendPushToUsers } from './webpush';
import { sendEmail } from './email';

export interface NotificationDispatchPayload {
  notificationId?: string;
  userId: string;
  institutionId: string;
  title: string;
  message: string;
  type?: string;
  email?: string;
  phone?: string;
  channels?: ('in_app' | 'push' | 'email' | 'sms' | 'whatsapp')[];
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
}

export interface DispatchResults {
  inApp: boolean;
  push: boolean;
  email: boolean;
  sms: boolean;
  whatsapp: boolean;
}

export async function dispatchNotification(
  env: Env,
  payload: NotificationDispatchPayload
): Promise<DispatchResults> {
  const {
    notificationId,
    userId,
    institutionId,
    title,
    message,
    type = 'general',
    email,
    phone,
    channels = ['in_app', 'push', 'email'],
    priority = 'NORMAL'
  } = payload;

  const results: DispatchResults = { inApp: false, push: false, email: false, sms: false, whatsapp: false };

  // 0. Fetch user notification preferences
  const prefs = await env.DB.prepare(`
    SELECT * FROM notification_preferences WHERE user_id = ?
  `).bind(userId).first<any>();

  // Check quiet hours if not URGENT
  let isQuietHour = false;
  if (priority !== 'URGENT' && prefs?.quiet_hours_start && prefs?.quiet_hours_end) {
    const now = new Date();
    const currentHM = now.toTimeString().slice(0, 5); // 'HH:MM'
    if (prefs.quiet_hours_start <= prefs.quiet_hours_end) {
      isQuietHour = currentHM >= prefs.quiet_hours_start && currentHM <= prefs.quiet_hours_end;
    } else {
      isQuietHour = currentHM >= prefs.quiet_hours_start || currentHM <= prefs.quiet_hours_end;
    }
  }

  // 1. In-App Notification (Database Insert)
  if (channels.includes('in_app') && (prefs?.in_app_enabled ?? 1) === 1) {
    const startTime = Date.now();
    try {
      const id = notificationId || crypto.randomUUID();
      await env.DB.prepare(`
        INSERT INTO notifications (id, institution_id, user_id, title, message, type, is_read, channel, status, priority, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 0, 'in_app', 'DELIVERED', ?, datetime('now'))
        ON CONFLICT(id) DO UPDATE SET status = 'DELIVERED', sent_at = datetime('now')
      `).bind(id, institutionId, userId, title, message, type, priority).run();
      results.inApp = true;

      await logAudit(env.DB, institutionId, notificationId || id, 'IN_APP', 'in_app', 'DELIVERED', JSON.stringify({ success: true }), null, Date.now() - startTime);
    } catch (err: any) {
      console.error('[NotificationDispatcher] In-App dispatch error:', err);
      await logAudit(env.DB, institutionId, notificationId || null, 'IN_APP', 'in_app', 'FAILED', JSON.stringify({ error: err.message }), null, Date.now() - startTime);
    }
  }

  if (isQuietHour) {
    console.log(`[NotificationDispatcher] Quiet hours active for user ${userId}. Skipping external channels for ${priority} notification.`);
    return results;
  }

  // 2. Web Push Notification
  if (channels.includes('push') && (prefs?.push_enabled ?? 1) === 1) {
    const startTime = Date.now();
    try {
      await sendPushToUsers(env, env.DB, [userId], { title, body: message });
      results.push = true;
      await logAudit(env.DB, institutionId, notificationId || null, 'FCM_PUSH', 'push', 'DELIVERED', JSON.stringify({ success: true }), null, Date.now() - startTime);
    } catch (err: any) {
      console.error('[NotificationDispatcher] Push dispatch error:', err);
      await logAudit(env.DB, institutionId, notificationId || null, 'FCM_PUSH', 'push', 'FAILED', JSON.stringify({ error: err.message }), null, Date.now() - startTime);
    }
  }

  // 3. Email Notification
  if (channels.includes('email') && (prefs?.email_enabled ?? 1) === 1 && email && env.RESEND_API_KEY) {
    const startTime = Date.now();
    try {
      const emailRes: any = await sendEmail(env, {
        to: email,
        subject: title,
        html: `<div style="font-family:sans-serif;padding:16px;"><h2>${title}</h2><p>${message}</p></div>`
      });
      const success = Boolean(emailRes && (emailRes.id || emailRes.success));
      results.email = success;
      await logAudit(env.DB, institutionId, notificationId || null, 'RESEND', 'email', success ? 'DELIVERED' : 'FAILED', JSON.stringify(emailRes), emailRes?.id || null, Date.now() - startTime);
    } catch (err: any) {
      console.error('[NotificationDispatcher] Email dispatch error:', err);
      await logAudit(env.DB, institutionId, notificationId || null, 'RESEND', 'email', 'FAILED', JSON.stringify({ error: err.message }), null, Date.now() - startTime);
    }
  }

  // 4. SMS Notification
  if (channels.includes('sms') && (prefs?.sms_enabled ?? 1) === 1 && phone) {
    const startTime = Date.now();
    try {
      const smsOk = await sendSmsHook(env, phone, `${title}: ${message}`);
      results.sms = smsOk;
      await logAudit(env.DB, institutionId, notificationId || null, 'FAST2SMS', 'sms', smsOk ? 'DELIVERED' : 'FAILED', JSON.stringify({ success: smsOk }), null, Date.now() - startTime);
    } catch (err: any) {
      console.error('[NotificationDispatcher] SMS dispatch error:', err);
      await logAudit(env.DB, institutionId, notificationId || null, 'FAST2SMS', 'sms', 'FAILED', JSON.stringify({ error: err.message }), null, Date.now() - startTime);
    }
  }

  // 5. WhatsApp Notification (Meta Cloud API Hook)
  if (channels.includes('whatsapp') && (prefs?.whatsapp_enabled ?? 1) === 1 && phone) {
    const startTime = Date.now();
    try {
      const waOk = await sendWhatsAppHook(env, phone, title, message);
      results.whatsapp = waOk;
      await logAudit(env.DB, institutionId, notificationId || null, 'META_WHATSAPP', 'whatsapp', waOk ? 'DELIVERED' : 'FAILED', JSON.stringify({ success: waOk }), null, Date.now() - startTime);
    } catch (err: any) {
      console.error('[NotificationDispatcher] WhatsApp dispatch error:', err);
      await logAudit(env.DB, institutionId, notificationId || null, 'META_WHATSAPP', 'whatsapp', 'FAILED', JSON.stringify({ error: err.message }), null, Date.now() - startTime);
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

async function sendWhatsAppHook(env: Env, phone: string, title: string, body: string): Promise<boolean> {
  const waToken = (env as any).WHATSAPP_API_TOKEN;
  if (!waToken) {
    console.log(`[WhatsApp Gateway Simulated] To: ${phone} | ${title}: ${body}`);
    return true;
  }

  try {
    const res = await fetch('https://graph.facebook.com/v18.0/me/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${waToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phone.replace(/[^0-9]/g, ''),
        type: 'text',
        text: { body: `*${title}*\n${body}` }
      })
    });
    return res.ok;
  } catch (err) {
    console.error('[WhatsApp Gateway Error]:', err);
    return false;
  }
}

async function logAudit(db: D1Database, institutionId: string, notificationId: string | null, provider: string, channel: string, status: string, payload: string, msgId: string | null, latencyMs: number) {
  try {
    await db.prepare(`
      INSERT INTO notification_logs (id, institution_id, notification_id, provider, provider_message_id, channel, status, response_payload, latency_ms, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).bind(crypto.randomUUID(), institutionId, notificationId || null, provider, msgId || null, channel, status, payload, latencyMs).run();
  } catch (e) {
    console.error('[NotificationAuditLog Error]:', e);
  }
}
