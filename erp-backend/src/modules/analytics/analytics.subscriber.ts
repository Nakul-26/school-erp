import { eventBus, ERPEventPayload } from '../../utils/event-bus';
import { AnalyticsRepository } from './analytics.repository';

export function registerAnalyticsEventListener(db: any) {
  eventBus.subscribe('*', async (event: ERPEventPayload) => {
    try {
      if (!db || !event.institutionId) return;

      const repo = new AnalyticsRepository(db);
      const today = new Date().toISOString().split('T')[0];

      // Record event counter in analytics_events
      await repo.ingestEvent(event.institutionId, event.eventType, today);

      // Lightweight real-time KPI updates for high-impact events
      if (event.eventType === 'AttendanceMarkedAbsent') {
        const currentAbsent = await repo.getEventCountByType(event.institutionId, 'AttendanceMarkedAbsent');
        await repo.upsertKPISnapshot({
          institution_id: event.institutionId,
          category: 'Academic',
          kpi_key: 'daily_absent_count',
          kpi_value: currentAbsent,
          unit: 'Students'
        });
      } else if (event.eventType === 'FeeDueTomorrow' || event.eventType.includes('Fee')) {
        await repo.upsertKPISnapshot({
          institution_id: event.institutionId,
          category: 'Finance',
          kpi_key: 'recent_fee_activity',
          kpi_value: Date.now(),
          unit: 'Timestamp'
        });
      } else if (event.eventType.includes('Notification')) {
        const notifCount = await repo.getEventCountByType(event.institutionId, 'NotificationDelivered');
        await repo.upsertKPISnapshot({
          institution_id: event.institutionId,
          category: 'Platform',
          kpi_key: 'notifications_delivered',
          kpi_value: notifCount,
          unit: 'Count'
        });
      }
    } catch (err) {
      console.error('[AnalyticsSubscriber] Failed to process event:', err);
    }
  });
}
