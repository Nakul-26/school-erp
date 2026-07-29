import { D1Database } from '@cloudflare/workers-types';
import { AuditLogEntry, AuditLogQueryFilters } from './audit-logs.types';
import { maskSensitiveData } from '../../utils/sensitive-masker';

export class AuditLogsRepository {
  constructor(private db: D1Database) {}

  async createAuditEntry(entry: Partial<AuditLogEntry>): Promise<string> {
    const id = entry.id || crypto.randomUUID();
    const beforeJson = entry.before_json ? JSON.stringify(maskSensitiveData(JSON.parse(entry.before_json))) : null;
    const afterJson = entry.after_json ? JSON.stringify(maskSensitiveData(JSON.parse(entry.after_json))) : null;

    await this.db.prepare(`
      INSERT INTO audit_logs (
        id, institution_id, user_id, user_name, user_role, module, entity_type, entity_id, record_id,
        action, event_name, description, before_json, after_json, ip_address, user_agent, request_id, status, reason
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      entry.institution_id || null,
      entry.user_id || null,
      entry.user_name || null,
      entry.user_role || null,
      entry.module || 'system',
      entry.entity_type || entry.module || 'Entity',
      entry.entity_id || null,
      entry.entity_id || null,
      entry.action || 'ACTION',
      entry.event_name || 'EVENT',
      entry.description || '',
      beforeJson,
      afterJson,
      entry.ip_address || null,
      entry.user_agent || null,
      entry.request_id || null,
      entry.status || 'SUCCESS',
      entry.reason || null
    ).run();

    return id;
  }

  async bulkCreateAuditEntries(entries: Partial<AuditLogEntry>[]): Promise<string[]> {
    const ids: string[] = [];
    for (const entry of entries) {
      const id = await this.createAuditEntry(entry);
      ids.push(id);
    }
    return ids;
  }

  async queryAuditLogs(filters: AuditLogQueryFilters): Promise<{ data: AuditLogEntry[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(200, Math.max(1, filters.limit || 50));
    const offset = (page - 1) * limit;

    const conditions: string[] = ['(institution_id = ? OR institution_id IS NULL)'];
    const values: any[] = [filters.institution_id];

    if (filters.module) {
      conditions.push('module = ?');
      values.push(filters.module);
    }
    if (filters.entity_type) {
      conditions.push('entity_type = ?');
      values.push(filters.entity_type);
    }
    if (filters.entity_id) {
      conditions.push('(entity_id = ? OR record_id = ?)');
      values.push(filters.entity_id, filters.entity_id);
    }
    if (filters.user_id) {
      conditions.push('user_id = ?');
      values.push(filters.user_id);
    }
    if (filters.action) {
      conditions.push('action LIKE ?');
      values.push(`%${filters.action}%`);
    }
    if (filters.event_name) {
      conditions.push('event_name = ?');
      values.push(filters.event_name);
    }
    if (filters.request_id) {
      conditions.push('request_id = ?');
      values.push(filters.request_id);
    }
    if (filters.status) {
      conditions.push('status = ?');
      values.push(filters.status);
    }
    if (filters.from_date) {
      conditions.push("date(timestamp) >= date(?)");
      values.push(filters.from_date);
    }
    if (filters.to_date) {
      conditions.push("date(timestamp) <= date(?)");
      values.push(filters.to_date);
    }
    if (filters.search) {
      conditions.push("(description LIKE ? OR user_name LIKE ? OR event_name LIKE ? OR action LIKE ?)");
      const term = `%${filters.search}%`;
      values.push(term, term, term, term);
    }

    const where = conditions.join(' AND ');

    const [{ results }, countRow] = await Promise.all([
      this.db.prepare(`
        SELECT * FROM audit_logs
        WHERE ${where}
        ORDER BY timestamp DESC
        LIMIT ? OFFSET ?
      `).bind(...values, limit, offset).all<AuditLogEntry>(),
      this.db.prepare(`
        SELECT COUNT(*) as total FROM audit_logs
        WHERE ${where}
      `).bind(...values).first<{ total: number }>()
    ]);

    return {
      data: results || [],
      total: countRow?.total || 0,
      page,
      limit
    };
  }

  async getEntityHistory(institutionId: string, entityType: string, entityId: string): Promise<AuditLogEntry[]> {
    const { results } = await this.db.prepare(`
      SELECT * FROM audit_logs
      WHERE (institution_id = ? OR institution_id IS NULL)
        AND (entity_type = ? OR module = ?)
        AND (entity_id = ? OR record_id = ?)
      ORDER BY timestamp ASC
    `).bind(institutionId, entityType, entityType.toLowerCase(), entityId, entityId).all<AuditLogEntry>();

    return results || [];
  }

  async getSecurityEvents(institutionId: string, limit = 100): Promise<AuditLogEntry[]> {
    const { results } = await this.db.prepare(`
      SELECT * FROM audit_logs
      WHERE (institution_id = ? OR institution_id IS NULL)
        AND (
          module = 'auth' 
          OR action IN ('LOGIN', 'LOGIN_FAILED', 'PASSWORD_RESET', 'ROLE_CHANGED', 'PERMISSION_CHANGED', 'SESSION_REVOKED')
          OR status = 'BLOCKED'
        )
      ORDER BY timestamp DESC
      LIMIT ?
    `).bind(institutionId, limit).all<AuditLogEntry>();

    return results || [];
  }

  async getDistinctModules(institutionId: string): Promise<string[]> {
    const { results } = await this.db.prepare(`
      SELECT DISTINCT module FROM audit_logs
      WHERE (institution_id = ? OR institution_id IS NULL) AND module IS NOT NULL
      ORDER BY module ASC
    `).bind(institutionId).all<{ module: string }>();

    return (results || []).map(r => r.module);
  }
}
