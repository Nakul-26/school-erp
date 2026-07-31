import { eventBus, ERPEventPayload } from '../../utils/event-bus';
import { IntegrationsRepository } from './integrations.repository';

export function registerIntegrationsEventListener(db: any) {
  eventBus.subscribe('*', async (event: ERPEventPayload) => {
    try {
      if (!db || !event.institutionId) return;

      const repo = new IntegrationsRepository(db);
      const matchingSubs = await repo.getMatchingSubscriptions(event.institutionId, event.eventType);

      for (const sub of matchingSubs) {
        // Enqueue WebhookDeliveryJob via Module 14 Background Jobs
        const jobId = `job_wh_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        const now = new Date().toISOString();

        await db.prepare(
          `INSERT INTO background_jobs (
            id, institution_id, job_type, queue_name, payload_json, status, priority,
            attempt, max_attempts, scheduled_at, created_by, created_at, updated_at
          ) VALUES (?, ?, 'WebhookDeliveryJob', 'webhooks', ?, 'QUEUED', 1, 0, 3, ?, 'EVENTBUS', ?, ?)`
        ).bind(
          jobId,
          event.institutionId,
          JSON.stringify({
            subscriptionId: sub.id,
            eventType: event.eventType,
            payload: event.payload
          }),
          now,
          now,
          now
        ).run();
      }
    } catch (err) {
      console.error('[IntegrationsSubscriber] Failed to process event:', err);
    }
  });
}
