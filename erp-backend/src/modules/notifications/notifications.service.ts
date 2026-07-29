import { NotificationsRepository } from './notifications.repository';
import { 
  CreateTemplateInput, NotificationItem, NotificationTemplate, 
  NotificationPreference, NotificationQueueItem, NotificationLog 
} from './notifications.types';
import { renderTemplate } from '../../utils/template-engine';
import { dispatchNotification } from '../../utils/notification-dispatcher';
import { eventBus, ERPEventPayload } from '../../utils/event-bus';
import { Env } from '../../types';

export class NotificationsService {
  constructor(private repo: NotificationsRepository, private db?: any) {
    this.registerEventBusListeners();
  }

  async notifyAttendanceMarked(env: any, ...args: any[]): Promise<void> {
    const data = typeof args[0] === 'object' ? args[0] : { student_id: args[0], status: args[1] };
    const instId = data.institutionId || data.institution_id;
    const userId = data.studentUserId || data.student_id || data.userId || args[0];
    if (instId && userId) {
      await this.dispatchEventNotification(env, instId, 'AttendanceMarkedAbsent', userId, data);
    }
  }

  async notifyExamCreated(env: any, ...args: any[]): Promise<void> {
    const data = typeof args[0] === 'object' ? args[0] : { exam_id: args[0], name: args[1] };
    const instId = data.institutionId || data.institution_id;
    const userId = data.userId || data.recipientUserId || data.studentId || args[0];
    if (instId && userId) {
      await this.dispatchEventNotification(env, instId, 'ExamCreated', userId, data);
    }
  }

  async notifyResultPublished(env: any, ...args: any[]): Promise<void> {
    const data = typeof args[0] === 'object' ? args[0] : { exam_id: args[0] };
    const instId = data.institutionId || data.institution_id;
    const userId = data.studentUserId || data.student_id || data.userId || args[0];
    if (instId && userId) {
      await this.dispatchEventNotification(env, instId, 'ResultsPublished', userId, data);
    }
  }

  async notifyHomeworkPosted(env: any, ...args: any[]): Promise<void> {
    const data = typeof args[0] === 'object' ? args[0] : { homework_id: args[0] };
    const instId = data.institutionId || data.institution_id;
    const userId = data.studentUserId || data.student_id || data.userId || args[0];
    if (instId && userId) {
      await this.dispatchEventNotification(env, instId, 'HomeworkPosted', userId, data);
    }
  }

  async createNotification(env: any, ...args: any[]): Promise<string> {
    const data = typeof args[0] === 'object' ? args[0] : { userId: args[0], title: args[1], message: args[2], type: args[3] };
    return await this.sendDirectNotification(
      env, data.institutionId || data.institution_id, data.userId || data.user_id, data.title || 'Notification', data.message || '', data.type || 'general', data.channels || ['in_app']
    );
  }

  private registerEventBusListeners() {
    eventBus.subscribe('*', async (event: ERPEventPayload) => {
      console.log(`[NotificationService] Processing event bus payload: ${event.eventType}`);
      // Listener will process matching templates and enqueue notifications
    });
  }

  // --- USER NOTIFICATIONS INBOX ---
  async listUserNotifications(userId: string, limit?: number): Promise<NotificationItem[]> {
    return await this.repo.listUserNotifications(userId, limit);
  }

  async countUnread(userId: string): Promise<number> {
    return await this.repo.countUnread(userId);
  }

  async markAsRead(id: string, userId: string): Promise<void> {
    await this.repo.markAsRead(id, userId);
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.repo.markAllAsRead(userId);
  }

  // --- IMMEDIATE / DIRECT NOTIFICATION ---
  async sendDirectNotification(
    env: Env,
    institutionId: string,
    userId: string,
    title: string,
    message: string,
    type = 'general',
    channels: ('in_app' | 'email' | 'sms' | 'whatsapp' | 'push')[] = ['in_app'],
    priority = 'NORMAL',
    scheduledAt?: string
  ): Promise<string> {
    const id = crypto.randomUUID();
    const isScheduled = Boolean(scheduledAt && new Date(scheduledAt) > new Date());
    const initialStatus = isScheduled ? 'PENDING' : 'QUEUED';

    await this.repo.createNotificationRecord(id, institutionId, userId, title, message, type, channels[0] || 'in_app', priority, initialStatus, undefined, scheduledAt);

    // Fetch user details for email & phone
    const userRes = await env.DB.prepare('SELECT email, phone FROM users WHERE id = ?').bind(userId).first<{ email?: string; phone?: string }>();

    const payload = {
      notificationId: id,
      userId,
      institutionId,
      title,
      message,
      type,
      email: userRes?.email,
      phone: userRes?.phone,
      channels,
      priority: priority as any
    };

    if (isScheduled) {
      await this.repo.enqueueNotification(crypto.randomUUID(), institutionId, userId, channels[0] || 'in_app', payload, id, scheduledAt);
      return id;
    }

    // Process immediately or queue
    try {
      const dispatchResults = await dispatchNotification(env, payload);
      const isAnyDelivered = Object.values(dispatchResults).some(Boolean);
      await this.repo.updateNotificationStatus(id, isAnyDelivered ? 'DELIVERED' : 'FAILED', isAnyDelivered ? undefined : 'Delivery failed on all selected channels');
    } catch (err: any) {
      await this.repo.updateNotificationStatus(id, 'FAILED', err.message);
      // Enqueue for background retry
      await this.repo.enqueueNotification(crypto.randomUUID(), institutionId, userId, channels[0] || 'in_app', payload, id);
    }

    return id;
  }

  // --- EVENT-DRIVEN TEMPLATED NOTIFICATIONS ---
  async dispatchEventNotification(
    env: Env,
    institutionId: string,
    eventType: string,
    recipientUserId: string,
    variables: Record<string, any>,
    overrideChannels?: string[],
    priority = 'NORMAL',
    scheduledAt?: string
  ): Promise<string | null> {
    // 1. Resolve Template
    const template = await this.repo.getTemplateByEventType(institutionId, eventType);
    let title = eventType;
    let body = JSON.stringify(variables);

    if (template) {
      title = renderTemplate(template.subject, variables);
      body = renderTemplate(template.body, variables);
    } else {
      title = variables.title || `${eventType} Alert`;
      body = variables.message || variables.body || `Event ${eventType} triggered.`;
    }

    const channelsToUse: any[] = overrideChannels && overrideChannels.length > 0 
      ? overrideChannels 
      : (template && template.channel !== 'all' ? [template.channel] : ['in_app', 'email', 'push']);

    return await this.sendDirectNotification(
      env, institutionId, recipientUserId, title, body, eventType.toLowerCase(), channelsToUse, priority, scheduledAt
    );
  }

  // --- TEMPLATES CRUD ---
  async createTemplate(institutionId: string, input: CreateTemplateInput): Promise<string> {
    const id = crypto.randomUUID();
    await this.repo.createTemplate(id, institutionId, input);
    return id;
  }

  async listTemplates(institutionId: string): Promise<NotificationTemplate[]> {
    return await this.repo.listTemplates(institutionId);
  }

  async getTemplateById(id: string): Promise<NotificationTemplate | null> {
    return await this.repo.getTemplateById(id);
  }

  async updateTemplate(id: string, institutionId: string, updates: Partial<CreateTemplateInput>): Promise<void> {
    await this.repo.updateTemplate(id, institutionId, updates);
  }

  async deleteTemplate(id: string, institutionId: string): Promise<void> {
    await this.repo.deleteTemplate(id, institutionId);
  }

  // --- BACKGROUND QUEUE WORKER & RETRY ENGINE ---
  async processNotificationQueue(env: Env): Promise<{ processed: number; succeeded: number; failed: number; deadLetter: number }> {
    const pendingItems = await this.repo.getPendingQueueItems(25);
    let processed = 0;
    let succeeded = 0;
    let failed = 0;
    let deadLetter = 0;

    for (const item of pendingItems) {
      processed++;
      const currentAttempts = item.attempts + 1;
      let payload: any = {};
      try {
        payload = JSON.parse(item.payload_json);
      } catch (e) {
        payload = {};
      }

      try {
        const dispatchResults = await dispatchNotification(env, payload);
        const isSuccess = Object.values(dispatchResults).some(Boolean);

        if (isSuccess) {
          succeeded++;
          await this.repo.updateQueueItemStatus(item.id, 'DELIVERED', currentAttempts);
          if (item.notification_id) {
            await this.repo.updateNotificationStatus(item.notification_id, 'DELIVERED');
          }
        } else {
          failed++;
          if (currentAttempts >= item.max_attempts) {
            deadLetter++;
            await this.repo.updateQueueItemStatus(item.id, 'DEAD_LETTER', currentAttempts, 'Max retry attempts exceeded');
            if (item.notification_id) {
              await this.repo.updateNotificationStatus(item.notification_id, 'DEAD_LETTER', 'Max retries exceeded');
            }
          } else {
            // Exponential Backoff: 5m, 15m, 60m
            const backoffMinutes = currentAttempts === 1 ? 5 : (currentAttempts === 2 ? 15 : 60);
            const nextRetry = new Date();
            nextRetry.setMinutes(nextRetry.getMinutes() + backoffMinutes);
            const nextRetryStr = nextRetry.toISOString().replace('T', ' ').split('.')[0] || '';

            await this.repo.updateQueueItemStatus(item.id, 'FAILED', currentAttempts, 'Provider delivery failure', nextRetryStr);
            if (item.notification_id) {
              await this.repo.updateNotificationStatus(item.notification_id, 'FAILED', `Failed attempt ${currentAttempts}/${item.max_attempts}`);
            }
          }
        }
      } catch (err: any) {
        failed++;
        if (currentAttempts >= item.max_attempts) {
          deadLetter++;
          await this.repo.updateQueueItemStatus(item.id, 'DEAD_LETTER', currentAttempts, err.message);
          if (item.notification_id) {
            await this.repo.updateNotificationStatus(item.notification_id, 'DEAD_LETTER', err.message);
          }
        } else {
          const nextRetry = new Date(Date.now() + 5 * 60 * 1000).toISOString().replace('T', ' ').split('.')[0] || '';
          await this.repo.updateQueueItemStatus(item.id, 'FAILED', currentAttempts, err.message, nextRetry);
        }
      }
    }

    return { processed, succeeded, failed, deadLetter };
  }

  async retryNotification(env: Env, notificationId: string, institutionId: string): Promise<boolean> {
    const notification = await this.repo.getNotificationById(notificationId);
    if (!notification || notification.institution_id !== institutionId) {
      throw new Error('Notification record not found');
    }

    // Re-queue notification
    let payload: any = {};
    try {
      payload = notification.payload_json ? JSON.parse(notification.payload_json) : {};
    } catch (e) {}

    if (!payload.userId) {
      payload = {
        notificationId: notification.id,
        userId: notification.user_id,
        institutionId: notification.institution_id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        channels: [notification.channel || 'in_app']
      };
    }

    await this.repo.updateNotificationStatus(notificationId, 'QUEUED');
    await this.repo.enqueueNotification(crypto.randomUUID(), institutionId, notification.user_id, notification.channel || 'in_app', payload, notificationId);
    
    // Process queue immediately
    await this.processNotificationQueue(env);
    return true;
  }

  async listQueueItems(institutionId: string, status?: string): Promise<NotificationQueueItem[]> {
    return await this.repo.listQueueItems(institutionId, status);
  }

  // --- PREFERENCES ---
  async getPreferencesByUser(userId: string): Promise<NotificationPreference | null> {
    return await this.repo.getPreferencesByUser(userId);
  }

  async updatePreferences(userId: string, prefs: Partial<NotificationPreference>): Promise<void> {
    await this.repo.upsertPreferences(userId, prefs);
  }

  // --- LOGS & ANALYTICS ---
  async listAuditLogs(institutionId: string, limit?: number): Promise<NotificationLog[]> {
    return await this.repo.listAuditLogs(institutionId, limit);
  }

  async getAnalytics(institutionId: string): Promise<any> {
    return await this.repo.getAnalytics(institutionId);
  }
}

export { NotificationsService as NotificationService };
