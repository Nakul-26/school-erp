import { AuditLogsRepository } from './audit-logs.repository';
import { AuditLogEntry, AuditLogQueryFilters } from './audit-logs.types';

export class AuditLogsService {
  constructor(private repo: AuditLogsRepository) {}

  async logEvent(entry: Partial<AuditLogEntry>): Promise<string> {
    return await this.repo.createAuditEntry(entry);
  }

  async logBulkEvents(entries: Partial<AuditLogEntry>[]): Promise<string[]> {
    return await this.repo.bulkCreateAuditEntries(entries);
  }

  async queryLogs(filters: AuditLogQueryFilters) {
    return await this.repo.queryAuditLogs(filters);
  }

  async getEntityHistory(institutionId: string, entityType: string, entityId: string) {
    return await this.repo.getEntityHistory(institutionId, entityType, entityId);
  }

  async getSecurityEvents(institutionId: string, limit?: number) {
    return await this.repo.getSecurityEvents(institutionId, limit);
  }

  async getDistinctModules(institutionId: string) {
    return await this.repo.getDistinctModules(institutionId);
  }

  generateCSV(logs: AuditLogEntry[]): string {
    const headers = ['Timestamp', 'Request ID', 'User Name', 'Role', 'Module', 'Action', 'Event Name', 'Entity Type', 'Entity ID', 'Status', 'Description', 'Reason'];
    const rows = logs.map(l => [
      `"${l.timestamp}"`,
      `"${l.request_id || ''}"`,
      `"${l.user_name || l.user_id || 'System'}"`,
      `"${l.user_role || ''}"`,
      `"${l.module}"`,
      `"${l.action}"`,
      `"${l.event_name || ''}"`,
      `"${l.entity_type || ''}"`,
      `"${l.entity_id || l.record_id || ''}"`,
      `"${l.status || 'SUCCESS'}"`,
      `"${(l.description || '').replace(/"/g, '""')}"`,
      `"${(l.reason || '').replace(/"/g, '""')}"`
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }
}
