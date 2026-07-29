import { 
  NotificationItem, NotificationTemplate, CreateTemplateInput,
  NotificationQueueItem, NotificationPreference, NotificationLog
} from './notifications.types';

export class NotificationsRepository {
  constructor(private db: D1Database) {}

  // --- USER NOTIFICATIONS INBOX ---
  async listUserNotifications(userId: string, limit = 50): Promise<NotificationItem[]> {
    const { results } = await this.db.prepare(`
      SELECT * FROM notifications
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `).bind(userId, limit).all<NotificationItem>();
    return results || [];
  }

  async countUnread(userId: string): Promise<number> {
    const res = await this.db.prepare(`
      SELECT COUNT(*) as cnt FROM notifications WHERE user_id = ? AND is_read = 0
    `).bind(userId).first<{ cnt: number }>();
    return res?.cnt || 0;
  }

  async markAsRead(id: string, userId: string): Promise<void> {
    await this.db.prepare(`
      UPDATE notifications
      SET is_read = 1, read_at = datetime('now'), status = 'READ'
      WHERE id = ? AND user_id = ?
    `).bind(id, userId).run();
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.db.prepare(`
      UPDATE notifications
      SET is_read = 1, read_at = datetime('now'), status = 'READ'
      WHERE user_id = ? AND is_read = 0
    `).bind(userId).run();
  }

  async createNotificationRecord(id: string, institutionId: string, userId: string, title: string, message: string, type: string, channel: string, priority = 'NORMAL', status = 'DELIVERED', templateId?: string, scheduledAt?: string): Promise<void> {
    await this.db.prepare(`
      INSERT INTO notifications (
        id, institution_id, user_id, title, message, type, is_read, recipient_type, channel, template_id, status, priority, scheduled_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, 0, 'USER', ?, ?, ?, ?, ?, datetime('now'))
    `).bind(id, institutionId, userId, title, message, type, channel, templateId || null, status, priority, scheduledAt || null).run();
  }

  async updateNotificationStatus(id: string, status: string, failureReason?: string): Promise<void> {
    const isFailed = ['FAILED', 'DEAD_LETTER'].includes(status);
    const isDelivered = status === 'DELIVERED';

    await this.db.prepare(`
      UPDATE notifications
      SET status = ?, 
          sent_at = CASE WHEN ? THEN datetime('now') ELSE sent_at END,
          failed_at = CASE WHEN ? THEN datetime('now') ELSE failed_at END,
          failure_reason = ?,
          retry_count = retry_count + CASE WHEN ? THEN 1 ELSE 0 END
      WHERE id = ?
    `).bind(status, isDelivered ? 1 : 0, isFailed ? 1 : 0, failureReason || null, isFailed ? 1 : 0, id).run();
  }

  async getNotificationById(id: string): Promise<NotificationItem | null> {
    return await this.db.prepare('SELECT * FROM notifications WHERE id = ?').bind(id).first<NotificationItem>();
  }

  // --- TEMPLATES ---
  async createTemplate(id: string, institutionId: string, input: CreateTemplateInput): Promise<void> {
    await this.db.prepare(`
      INSERT INTO notification_templates (
        id, institution_id, name, event_type, channel, subject, body, variables_json, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
    `).bind(
      id, institutionId, input.name, input.event_type, input.channel || 'all', input.subject, input.body, input.variables_json || null
    ).run();
  }

  async listTemplates(institutionId: string): Promise<NotificationTemplate[]> {
    const { results } = await this.db.prepare(`
      SELECT * FROM notification_templates WHERE institution_id = ? AND is_active = 1 ORDER BY event_type ASC
    `).bind(institutionId).all<NotificationTemplate>();
    return results || [];
  }

  async getTemplateById(id: string): Promise<NotificationTemplate | null> {
    return await this.db.prepare('SELECT * FROM notification_templates WHERE id = ? AND is_active = 1').bind(id).first<NotificationTemplate>();
  }

  async getTemplateByEventType(institutionId: string, eventType: string, channel = 'all'): Promise<NotificationTemplate | null> {
    const t = await this.db.prepare(`
      SELECT * FROM notification_templates 
      WHERE institution_id = ? AND event_type = ? AND (channel = ? OR channel = 'all') AND is_active = 1
      ORDER BY CASE WHEN channel = ? THEN 1 ELSE 2 END
      LIMIT 1
    `).bind(institutionId, eventType, channel, channel).first<NotificationTemplate>();
    return t;
  }

  async updateTemplate(id: string, institutionId: string, updates: Partial<CreateTemplateInput>): Promise<void> {
    const fields: string[] = ['updated_at = datetime(\'now\')'];
    const params: any[] = [];

    if (updates.name) { fields.push('name = ?'); params.push(updates.name); }
    if (updates.event_type) { fields.push('event_type = ?'); params.push(updates.event_type); }
    if (updates.channel) { fields.push('channel = ?'); params.push(updates.channel); }
    if (updates.subject) { fields.push('subject = ?'); params.push(updates.subject); }
    if (updates.body) { fields.push('body = ?'); params.push(updates.body); }
    if (updates.variables_json !== undefined) { fields.push('variables_json = ?'); params.push(updates.variables_json); }

    params.push(id, institutionId);
    await this.db.prepare(`UPDATE notification_templates SET ${fields.join(', ')} WHERE id = ? AND institution_id = ?`).bind(...params).run();
  }

  async deleteTemplate(id: string, institutionId: string): Promise<void> {
    await this.db.prepare(`UPDATE notification_templates SET is_active = 0, updated_at = datetime('now') WHERE id = ? AND institution_id = ?`).bind(id, institutionId).run();
  }

  // --- QUEUE SYSTEM & WORKER ---
  async enqueueNotification(
    id: string, institutionId: string, recipientId: string, channel: string, payload: Record<string, any>, 
    notificationId?: string, scheduledAt?: string, maxAttempts = 3
  ): Promise<void> {
    await this.db.prepare(`
      INSERT INTO notification_queue (
        id, institution_id, notification_id, recipient_id, channel, payload_json, status, attempts, max_attempts, scheduled_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'PENDING', 0, ?, ?, datetime('now'), datetime('now'))
    `).bind(
      id, institutionId, notificationId || null, recipientId, channel, JSON.stringify(payload), maxAttempts, scheduledAt || null
    ).run();
  }

  async getPendingQueueItems(limit = 20): Promise<NotificationQueueItem[]> {
    const { results } = await this.db.prepare(`
      SELECT * FROM notification_queue
      WHERE (status = 'PENDING' OR status = 'QUEUED' OR (status = 'FAILED' AND attempts < max_attempts AND next_retry_at <= datetime('now')))
        AND (scheduled_at IS NULL OR scheduled_at <= datetime('now'))
      ORDER BY created_at ASC
      LIMIT ?
    `).bind(limit).all<NotificationQueueItem>();
    return results || [];
  }

  async updateQueueItemStatus(id: string, status: string, attempts: number, errorMsg?: string, nextRetryAt?: string): Promise<void> {
    await this.db.prepare(`
      UPDATE notification_queue
      SET status = ?, attempts = ?, error_message = ?, next_retry_at = ?, updated_at = datetime('now')
      WHERE id = ?
    `).bind(status, attempts, errorMsg || null, nextRetryAt || null, id).run();
  }

  async listQueueItems(institutionId: string, status?: string): Promise<NotificationQueueItem[]> {
    let query = `SELECT * FROM notification_queue WHERE institution_id = ?`;
    const params: any[] = [institutionId];

    if (status) {
      query += ` AND status = ?`;
      params.push(status);
    }
    query += ` ORDER BY created_at DESC LIMIT 100`;

    const { results } = await this.db.prepare(query).bind(...params).all<NotificationQueueItem>();
    return results || [];
  }

  // --- PREFERENCES ---
  async getPreferencesByUser(userId: string): Promise<NotificationPreference | null> {
    return await this.db.prepare(`SELECT * FROM notification_preferences WHERE user_id = ?`).bind(userId).first<NotificationPreference>();
  }

  async upsertPreferences(userId: string, prefs: Partial<NotificationPreference>): Promise<void> {
    await this.db.prepare(`
      INSERT INTO notification_preferences (
        user_id, email_enabled, sms_enabled, whatsapp_enabled, push_enabled, in_app_enabled, quiet_hours_start, quiet_hours_end, language, timezone, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(user_id) DO UPDATE SET
        email_enabled = COALESCE(excluded.email_enabled, notification_preferences.email_enabled),
        sms_enabled = COALESCE(excluded.sms_enabled, notification_preferences.sms_enabled),
        whatsapp_enabled = COALESCE(excluded.whatsapp_enabled, notification_preferences.whatsapp_enabled),
        push_enabled = COALESCE(excluded.push_enabled, notification_preferences.push_enabled),
        in_app_enabled = COALESCE(excluded.in_app_enabled, notification_preferences.in_app_enabled),
        quiet_hours_start = excluded.quiet_hours_start,
        quiet_hours_end = excluded.quiet_hours_end,
        language = COALESCE(excluded.language, notification_preferences.language),
        timezone = COALESCE(excluded.timezone, notification_preferences.timezone),
        updated_at = datetime('now')
    `).bind(
      userId,
      prefs.email_enabled ?? 1, prefs.sms_enabled ?? 1, prefs.whatsapp_enabled ?? 1,
      prefs.push_enabled ?? 1, prefs.in_app_enabled ?? 1,
      prefs.quiet_hours_start || null, prefs.quiet_hours_end || null,
      prefs.language || 'en', prefs.timezone || 'Asia/Kolkata'
    ).run();
  }

  // --- IMMUTABLE LOGS ---
  async addAuditLog(
    id: string, institutionId: string, notificationId: string | null, provider: string, 
    channel: string, status: string, responsePayload?: string, providerMsgId?: string, latencyMs = 0
  ): Promise<void> {
    await this.db.prepare(`
      INSERT INTO notification_logs (
        id, institution_id, notification_id, provider, provider_message_id, channel, status, response_payload, latency_ms, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).bind(
      id, institutionId, notificationId || null, provider, providerMsgId || null, channel, status, responsePayload || null, latencyMs
    ).run();
  }

  async listAuditLogs(institutionId: string, limit = 100): Promise<NotificationLog[]> {
    const { results } = await this.db.prepare(`
      SELECT * FROM notification_logs WHERE institution_id = ? ORDER BY created_at DESC LIMIT ?
    `).bind(institutionId, limit).all<NotificationLog>();
    return results || [];
  }

  // --- ANALYTICS ---
  async getAnalytics(institutionId: string): Promise<any> {
    const statusCounts = await this.db.prepare(`
      SELECT 
        COUNT(CASE WHEN status = 'DELIVERED' OR status = 'READ' THEN 1 END) as total_delivered,
        COUNT(CASE WHEN status = 'FAILED' THEN 1 END) as total_failed,
        COUNT(CASE WHEN status = 'DEAD_LETTER' THEN 1 END) as total_dead_letter,
        COUNT(CASE WHEN status = 'PENDING' OR status = 'QUEUED' OR status = 'SENDING' THEN 1 END) as total_pending,
        COUNT(CASE WHEN status = 'READ' THEN 1 END) as total_read,
        COUNT(*) as total_notifications
      FROM notifications
      WHERE institution_id = ?
    `).bind(institutionId).first<any>();

    const channelCounts = await this.db.prepare(`
      SELECT channel, COUNT(*) as count
      FROM notifications
      WHERE institution_id = ?
      GROUP BY channel
    `).bind(institutionId).all<any>();

    const providerCounts = await this.db.prepare(`
      SELECT provider, COUNT(*) as count, AVG(latency_ms) as avg_latency_ms
      FROM notification_logs
      WHERE institution_id = ?
      GROUP BY provider
    `).bind(institutionId).all<any>();

    const total = statusCounts?.total_notifications || 0;
    const delivered = statusCounts?.total_delivered || 0;
    const read = statusCounts?.total_read || 0;
    const deliveryRate = total > 0 ? Math.round((delivered / total) * 10000) / 100 : 100;
    const openRate = delivered > 0 ? Math.round((read / delivered) * 10000) / 100 : 0;

    return {
      total_notifications: total,
      total_delivered: delivered,
      total_failed: statusCounts?.total_failed || 0,
      total_dead_letter: statusCounts?.total_dead_letter || 0,
      total_pending: statusCounts?.total_pending || 0,
      total_read: read,
      delivery_rate_percent: deliveryRate,
      open_rate_percent: openRate,
      channel_distribution: channelCounts.results || [],
      provider_distribution: providerCounts.results || []
    };
  }
}

export { NotificationsRepository as NotificationRepository };
