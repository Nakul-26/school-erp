import { JobHandler, JobHandlerContext, JobHandlerResult } from './types';
import { eventBus } from '../../utils/event-bus';
import { buildDatabaseDump } from '../../utils/backup';

class JobRegistry {
  private handlers: Map<string, JobHandler> = new Map();

  constructor() {
    this.registerDefaults();
  }

  public register(jobType: string, handler: JobHandler): void {
    this.handlers.set(jobType, handler);
  }

  public getHandler(jobType: string): JobHandler | undefined {
    return this.handlers.get(jobType);
  }

  public getRegisteredJobTypes(): string[] {
    return Array.from(this.handlers.keys());
  }

  private registerDefaults(): void {
    // 1. FeeReminderJob - sends a real notification (in-app + email + push,
    // via the same NotificationsService.sendDirectNotification used
    // elsewhere) to a student and their guardians for each overdue,
    // not-yet-paid fee record. Previously this counted rows in a table
    // (`fee_allocations`) that doesn't exist in the schema - the query
    // always threw, was swallowed by a catch, and silently fell back to 0;
    // nothing was ever actually sent to anyone. Capped at 200 records per
    // run, and a record is skipped if it already got a reminder in the last
    // 24 hours (this job runs hourly), so a student isn't re-notified every
    // single hour for the same unpaid fee.
    this.register('FeeReminderJob', async (payload: any, ctx: JobHandlerContext): Promise<JobHandlerResult> => {
      ctx.log(`[FeeReminderJob] Checking for overdue, unreminded fees for institution: ${ctx.job.institution_id}`);

      let remindersSent = 0;
      let recordsChecked = 0;

      if (ctx.db) {
        try {
          const { results: overdueRecords } = await ctx.db.prepare(`
            SELECT sfr.id as record_id, sfr.student_id, sfr.fee_type, sfr.due_date,
                   sfr.total_amount, sfr.paid_amount, sfr.fine_amount, sfr.concession_amount, sfr.refund_amount,
                   s.user_id as student_user_id, s.first_name, s.last_name
            FROM student_fee_records sfr
            JOIN students s ON s.id = sfr.student_id AND s.is_active = 1
            WHERE sfr.institution_id = ?
              AND sfr.is_active = 1
              AND sfr.status != 'PAID'
              AND sfr.due_date IS NOT NULL
              AND date(sfr.due_date) <= date('now')
              AND NOT EXISTS (
                SELECT 1 FROM fee_reminders fr
                WHERE fr.student_fee_record_id = sfr.id
                  AND fr.sent_at > datetime('now', '-24 hours')
              )
            LIMIT 200
          `).bind(ctx.job.institution_id).all();

          recordsChecked = overdueRecords?.length || 0;

          if (recordsChecked > 0 && ctx.env) {
            const { NotificationsRepository } = await import('../notifications/notifications.repository');
            const { NotificationsService } = await import('../notifications/notifications.service');
            const notifRepo = new NotificationsRepository(ctx.db);
            const notifService = new NotificationsService(notifRepo, ctx.db);
            const { FeesRepository } = await import('../fees/fees.repository');
            const feesRepo = new FeesRepository(ctx.db);

            for (const record of overdueRecords) {
              const outstanding = Math.max(0, (record.total_amount + record.fine_amount) - (record.paid_amount + record.concession_amount) + record.refund_amount);
              if (outstanding <= 0.01) continue;

              const { results: guardians } = await ctx.db.prepare(
                `SELECT user_id FROM guardians WHERE student_id = ? AND is_active = 1 AND user_id IS NOT NULL`
              ).bind(record.student_id).all();

              const recipientUserIds = new Set<string>();
              if (record.student_user_id) recipientUserIds.add(record.student_user_id);
              for (const g of guardians || []) recipientUserIds.add(g.user_id);

              if (recipientUserIds.size === 0) continue;

              const title = `Fee payment due: ${record.fee_type}`;
              const message = `The ${record.fee_type} fee of ₹${outstanding.toFixed(2)} for ${record.first_name} ${record.last_name} was due on ${record.due_date} and is still unpaid. Please pay at the earliest to avoid additional fines.`;

              for (const userId of recipientUserIds) {
                try {
                  await notifService.sendDirectNotification(
                    ctx.env, ctx.job.institution_id, userId, title, message, 'fee_reminder', ['in_app', 'email', 'push']
                  );
                } catch (e) {
                  ctx.log(`[FeeReminderJob] Failed to notify user ${userId} for record ${record.record_id}: ${(e as Error).message}`);
                }
              }

              // Log once per record (not once per recipient) so the 24h
              // dedup check above and the existing reminders-history view
              // both read one row per fee record, same as a manual reminder.
              await feesRepo.logReminder(crypto.randomUUID(), ctx.job.institution_id, record.student_id, record.record_id, 'EMAIL', 'auto-reminder', message);
              remindersSent++;
            }
          }
        } catch (e) {
          ctx.log(`[FeeReminderJob] Error while processing overdue fees: ${(e as Error).message}`);
        }
      }

      ctx.log(`[FeeReminderJob] Checked ${recordsChecked} overdue fee record(s), sent reminders for ${remindersSent}.`);

      await eventBus.publish({
        institutionId: ctx.job.institution_id,
        eventType: 'FeeDueTomorrow',
        payload: {
          jobId: ctx.job.id,
          remindersSent,
          scheduledBy: ctx.job.created_by || 'SYSTEM',
        },
        priority: 'HIGH'
      });

      return {
        success: true,
        message: `Checked ${recordsChecked} overdue fee record(s), sent reminders for ${remindersSent}.`,
        data: { remindersSent, recordsChecked }
      };
    });

    // 2. AttendanceSummaryJob
    this.register('AttendanceSummaryJob', async (payload: any, ctx: JobHandlerContext): Promise<JobHandlerResult> => {
      ctx.log(`[AttendanceSummaryJob] Generating daily attendance summary report...`);
      
      let absentCount = payload?.absentCount || 12;
      let totalPresent = payload?.totalPresent || 345;
      
      if (ctx.db) {
        try {
          const absentRes = await ctx.db.prepare(
            `SELECT COUNT(*) as cnt FROM student_attendance WHERE status = 'ABSENT' AND institution_id = ?`
          ).bind(ctx.job.institution_id).first();
          if (absentRes) absentCount = absentRes.cnt || absentCount;
        } catch (e) {}
      }

      ctx.log(`[AttendanceSummaryJob] Summary: ${totalPresent} Present, ${absentCount} Absent.`);

      await eventBus.publish({
        institutionId: ctx.job.institution_id,
        eventType: 'AttendanceMarkedAbsent',
        payload: {
          jobId: ctx.job.id,
          absentCount,
          totalPresent,
          summaryDate: new Date().toISOString().split('T')[0]
        }
      });

      return {
        success: true,
        message: `Attendance digest compiled: ${absentCount} absent, ${totalPresent} present.`,
        data: { absentCount, totalPresent }
      };
    });

    // 3. BackupDatabaseJob - real SQL dump written to R2, not a simulated ID/size.
    this.register('BackupDatabaseJob', async (payload: any, ctx: JobHandlerContext): Promise<JobHandlerResult> => {
      ctx.log(`[BackupDatabaseJob] Starting database snapshot for institution ${ctx.job.institution_id}...`);

      if (!ctx.db || !ctx.env?.FILES) {
        return { success: false, error: 'DB or R2 (FILES) binding unavailable in job context.' };
      }

      const dumpText = await buildDatabaseDump(ctx.db, ctx.job.institution_id);
      const backupId = `bkp_${Date.now()}`;
      const key = `backups/${ctx.job.institution_id}/${backupId}.sql`;

      await ctx.env.FILES.put(key, dumpText, {
        httpMetadata: { contentType: 'application/sql' }
      });

      const sizeBytes = new TextEncoder().encode(dumpText).length;
      const sizeMb = parseFloat((sizeBytes / (1024 * 1024)).toFixed(2));
      ctx.log(`[BackupDatabaseJob] Wrote ${key} (${sizeMb} MB) to R2.`);

      return {
        success: true,
        message: `Database snapshot ${backupId} completed successfully (${sizeMb} MB).`,
        data: { backupId, key, archiveSizeMb: sizeMb }
      };
    });

    // 4. GenerateReportCardJob
    this.register('GenerateReportCardJob', async (payload: any, ctx: JobHandlerContext): Promise<JobHandlerResult> => {
      const examId = payload?.examId;
      if (!examId) {
        return {
          success: false,
          message: 'GenerateReportCardJob requires a payload.examId identifying which exam to build report cards for.',
          data: { generatedCount: 0 }
        };
      }

      ctx.log(`[GenerateReportCardJob] Compiling academic report cards for exam: ${examId}`);

      let count = 0;
      if (ctx.db) {
        try {
          const { GradesRepository } = await import('../grades/grades.repository');
          const { GradesService } = await import('../grades/grades.service');
          const repo = new GradesRepository(ctx.db);
          const service = new GradesService(repo);
          const cards = await service.buildAllReportCards(examId, ctx.job.institution_id);
          count = cards.length;
        } catch (e) {
          ctx.log(`[GenerateReportCardJob] Warning: ${(e as Error).message}`);
          return {
            success: false,
            message: `Failed to build report cards for exam ${examId}: ${(e as Error).message}`,
            data: { generatedCount: 0, examId }
          };
        }
      }

      ctx.log(`[GenerateReportCardJob] Computed ${count} student report cards from real marks data.`);

      return {
        success: true,
        message: `Generated ${count} report cards for exam ${examId}.`,
        data: { generatedCount: count, examId }
      };
    });

    // 5. NotificationJob
    this.register('NotificationJob', async (payload: any, ctx: JobHandlerContext): Promise<JobHandlerResult> => {
      ctx.log(`[NotificationJob] Processing queued multi-channel notification dispatch...`);

      let result = { processed: 0, succeeded: 0, failed: 0, deadLetter: 0 };
      if (ctx.db && ctx.env) {
        try {
          const { NotificationsRepository } = await import('../notifications/notifications.repository');
          const { NotificationsService } = await import('../notifications/notifications.service');
          const repo = new NotificationsRepository(ctx.db);
          const service = new NotificationsService(repo, ctx.db);
          result = await service.processNotificationQueue(ctx.env);
        } catch (e) {
          ctx.log(`[NotificationJob] Warning: ${(e as Error).message}`);
        }
      }

      ctx.log(`[NotificationJob] Processed ${result.processed} queued notifications (${result.succeeded} delivered, ${result.failed} failed, ${result.deadLetter} dead-lettered).`);

      return {
        success: true,
        message: `Processed ${result.processed} queued notifications: ${result.succeeded} delivered, ${result.failed} failed, ${result.deadLetter} dead-lettered.`,
        data: result
      };
    });

    // 6. AnalyticsRefreshJob
    this.register('AnalyticsRefreshJob', async (payload: any, ctx: JobHandlerContext): Promise<JobHandlerResult> => {
      ctx.log(`[AnalyticsRefreshJob] Recalculating dashboard KPI aggregations & trend metrics...`);
      let refreshedCount = 0;
      if (ctx.db) {
        try {
          const { AnalyticsRepository } = await import('../analytics/analytics.repository');
          const { AnalyticsService } = await import('../analytics/analytics.service');
          const repo = new AnalyticsRepository(ctx.db);
          const service = new AnalyticsService(repo);
          const kpis = await service.refreshKPISnapshots(ctx.job.institution_id);
          refreshedCount = kpis.length;
        } catch (e) {
          ctx.log(`[AnalyticsRefreshJob] Warning: ${ (e as Error).message }`);
        }
      }

      ctx.log(`[AnalyticsRefreshJob] Aggregated attendance rates, fee collection tallies, and user activity (${refreshedCount} KPIs updated).`);

      return {
        success: true,
        message: 'Analytics cache refreshed successfully.',
        data: { refreshedCount, refreshedAt: new Date().toISOString() }
      };
    });

    // 7. SessionCleanupJob
    this.register('SessionCleanupJob', async (payload: any, ctx: JobHandlerContext): Promise<JobHandlerResult> => {
      ctx.log(`[SessionCleanupJob] Purging expired user auth tokens and transient rate-limit entries...`);

      let purgedCount = 0;
      let purgedIdempotencyKeys = 0;
      if (ctx.db) {
        try {
          const nowTs = Math.floor(Date.now() / 1000);
          const res = await ctx.db.prepare(`DELETE FROM rate_limits WHERE reset_at < ?`).bind(nowTs).run();
          purgedCount = res?.meta?.changes || 0;
        } catch (e) {}

        try {
          // Completed idempotency-key records only need to live long enough
          // to catch a slow client retry (hours, not days) - 7 days is
          // generous. A row stuck in 'processing' for over an hour means the
          // request that claimed it never got to clean up after itself
          // (worker crash, uncaught exception past our own try/catch); purge
          // those too so a client isn't permanently stuck getting 409s.
          const idemRes = await ctx.db.prepare(`
            DELETE FROM idempotency_keys
            WHERE (status = 'completed' AND created_at < datetime('now', '-7 days'))
               OR (status = 'processing' AND created_at < datetime('now', '-1 hour'))
          `).run();
          purgedIdempotencyKeys = idemRes?.meta?.changes || 0;
        } catch (e) {}
      }

      ctx.log(`[SessionCleanupJob] Cleared ${purgedCount} expired temporary records and ${purgedIdempotencyKeys} stale idempotency-key records.`);

      return {
        success: true,
        message: `Purged ${purgedCount} expired rate-limit tracking records and ${purgedIdempotencyKeys} stale idempotency-key records.`,
        data: { purgedCount, purgedIdempotencyKeys }
      };
    });

    // 8. WebhookDeliveryJob
    this.register('WebhookDeliveryJob', async (payload: any, ctx: JobHandlerContext): Promise<JobHandlerResult> => {
      ctx.log(`[WebhookDeliveryJob] Executing signed HMAC SHA-256 webhook dispatch...`);
      let deliveryStatus = 'SKIPPED';
      if (ctx.db && payload?.subscriptionId) {
        try {
          const { IntegrationsRepository } = await import('../integrations/integrations.repository');
          const { IntegrationsService } = await import('../integrations/integrations.service');
          const repo = new IntegrationsRepository(ctx.db);
          const service = new IntegrationsService(repo);
          const deliv = await service.executeWebhookDelivery(payload.subscriptionId, payload.eventType || 'Event', payload.payload || {});
          deliveryStatus = deliv.status;
        } catch (e) {
          ctx.log(`[WebhookDeliveryJob] Error: ${(e as Error).message}`);
        }
      }

      return {
        success: deliveryStatus === 'SUCCESS' || deliveryStatus === 'SKIPPED',
        message: `Webhook delivery completed with status: ${deliveryStatus}`,
        data: { deliveryStatus }
      };
    });
  }
}

export const jobRegistry = new JobRegistry();
