import { eventBus, ERPEventPayload } from '../../utils/event-bus';
import { createAuditLog } from '../../utils/audit';
import { D1Database } from '@cloudflare/workers-types';

export function registerAuditEventListener(db: D1Database) {
  eventBus.subscribe('*', async (event: ERPEventPayload) => {
    try {
      const payload = event.payload || {};
      const action = deriveActionFromEvent(event.eventType);
      const moduleName = deriveModuleFromEvent(event.eventType);
      const entityType = deriveEntityTypeFromEvent(event.eventType);

      await createAuditLog(db, {
        institutionId: event.institutionId,
        userId: payload.userId || payload.user_id || payload.acted_by,
        userName: payload.userName || payload.user_name,
        userRole: payload.userRole || payload.user_role,
        module: moduleName,
        entityType: entityType,
        entityId: payload.entityId || payload.entity_id || payload.studentId || payload.feeId || payload.id,
        action: action,
        eventName: event.eventType,
        description: payload.description || `Event ${event.eventType} triggered`,
        beforeData: payload.before || payload.beforeData,
        afterData: payload.after || payload.afterData || payload,
        requestId: payload.requestId || payload.request_id,
        status: payload.status || 'SUCCESS',
        reason: payload.reason
      });
    } catch (err) {
      console.error('[AuditSubscriber] Failed to log event to audit table:', err);
    }
  });
}

function deriveActionFromEvent(eventType: string): string {
  if (eventType.includes('Created') || eventType.includes('Admitted') || eventType.includes('Posted')) return 'CREATE';
  if (eventType.includes('Updated') || eventType.includes('Substituted') || eventType.includes('Changed')) return 'UPDATE';
  if (eventType.includes('Deleted') || eventType.includes('Archived')) return 'DELETE';
  if (eventType.includes('Paid') || eventType.includes('Refunded')) return 'TRANSACTION';
  if (eventType.includes('Login') || eventType.includes('Auth')) return 'SECURITY';
  return 'EVENT';
}

function deriveModuleFromEvent(eventType: string): string {
  if (eventType.startsWith('Student')) return 'students';
  if (eventType.startsWith('Fee')) return 'fees';
  if (eventType.startsWith('Attendance')) return 'attendance';
  if (eventType.startsWith('Exam') || eventType.startsWith('Results')) return 'exams';
  if (eventType.startsWith('Teacher')) return 'academics';
  if (eventType.startsWith('Notification')) return 'notifications';
  if (eventType.startsWith('Login') || eventType.startsWith('Auth') || eventType.startsWith('Permission')) return 'auth';
  return 'system';
}

function deriveEntityTypeFromEvent(eventType: string): string {
  if (eventType.startsWith('Student')) return 'Student';
  if (eventType.startsWith('Fee')) return 'FeeRecord';
  if (eventType.startsWith('Attendance')) return 'Attendance';
  if (eventType.startsWith('Exam')) return 'Exam';
  if (eventType.startsWith('Teacher')) return 'Teacher';
  if (eventType.startsWith('Notification')) return 'Notification';
  return 'SystemEntity';
}
