export type ERPEventType = 
  | 'AttendanceMarkedAbsent'
  | 'FeeDueTomorrow'
  | 'ResultsPublished'
  | 'StudentAdmitted'
  | 'TeacherSubstituted'
  | 'GeneralBroadcast';

export interface ERPEventPayload {
  institutionId: string;
  eventType: ERPEventType;
  recipientUserId?: string;
  payload: Record<string, any>;
  channels?: ('email' | 'sms' | 'whatsapp' | 'push' | 'in_app')[];
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  scheduledAt?: string;
}

type EventHandler = (event: ERPEventPayload) => Promise<void> | void;

class EventBus {
  private handlers: Map<string, EventHandler[]> = new Map();

  subscribe(eventType: ERPEventType | '*', handler: EventHandler): void {
    const list = this.handlers.get(eventType) || [];
    list.push(handler);
    this.handlers.set(eventType, list);
  }

  async publish(event: ERPEventPayload): Promise<void> {
    const specificHandlers = this.handlers.get(event.eventType) || [];
    const wildcardHandlers = this.handlers.get('*') || [];
    const allHandlers = [...specificHandlers, ...wildcardHandlers];

    for (const handler of allHandlers) {
      try {
        await handler(event);
      } catch (err) {
        console.error(`[EventBus] Error handling event ${event.eventType}:`, err);
      }
    }
  }
}

export const eventBus = new EventBus();
