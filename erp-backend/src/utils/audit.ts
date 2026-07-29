import { D1Database } from '@cloudflare/workers-types';
import { maskSensitiveData } from './sensitive-masker';

export interface AuditLogOptions {
  institutionId?: string;
  userId?: string;
  userName?: string;
  userRole?: string;
  module: string;
  entityType?: string;
  entityId?: string;
  action: string;
  eventName?: string;
  description?: string;
  beforeData?: any;
  afterData?: any;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  status?: 'SUCCESS' | 'FAILURE' | 'BLOCKED';
  reason?: string;
}

export async function createAuditLog(
  db: D1Database,
  userIdOrOptions?: string | null | AuditLogOptions,
  action?: string,
  moduleName?: string,
  recordId?: string | null,
  descriptionText?: string
): Promise<string> {
  const id = crypto.randomUUID();

  let options: AuditLogOptions;

  if (userIdOrOptions && typeof userIdOrOptions === 'object') {
    options = userIdOrOptions;
  } else {
    options = {
      userId: userIdOrOptions || undefined,
      action: action || 'UNKNOWN',
      module: moduleName || 'system',
      entityId: recordId || undefined,
      description: descriptionText
    };
  }

  const beforeJson = options.beforeData ? JSON.stringify(maskSensitiveData(options.beforeData)) : null;
  const afterJson = options.afterData ? JSON.stringify(maskSensitiveData(options.afterData)) : null;

  try {
    await db.prepare(`
      INSERT INTO audit_logs (
        id, institution_id, user_id, user_name, user_role, module, entity_type, entity_id, record_id,
        action, event_name, description, before_json, after_json, ip_address, user_agent, request_id, status, reason
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      options.institutionId || null,
      options.userId || null,
      options.userName || null,
      options.userRole || null,
      options.module,
      options.entityType || options.module,
      options.entityId || null,
      options.entityId || null,
      options.action,
      options.eventName || `${options.entityType || options.module}_${options.action}`,
      options.description || `${options.action} on ${options.entityType || options.module}`,
      beforeJson,
      afterJson,
      options.ipAddress || null,
      options.userAgent || null,
      options.requestId || null,
      options.status || 'SUCCESS',
      options.reason || null
    ).run();
  } catch (err) {
    console.error('[createAuditLog] Failed to insert audit log:', err);
  }

  return id;
}
