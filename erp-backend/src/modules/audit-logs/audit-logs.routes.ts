import { Hono } from 'hono';
import { Env, JwtPayload } from '../../types';
import { authMiddleware, requireRole } from '../../middleware/auth';
import { AuditLogsRepository } from './audit-logs.repository';
import { AuditLogsService } from './audit-logs.service';
import { registerAuditEventListener } from './audit-logs.subscriber';

const auditLogs = new Hono<{ Bindings: Env; Variables: { user: JwtPayload; requestId?: string } }>();

auditLogs.use('*', authMiddleware);

// --- SEARCH & FILTER AUDIT LOGS ---
auditLogs.get('/', requireRole('admin', 'super_admin', 'Principal', 'HOD', 'Accountant'), async (c) => {
  const user = c.get('user');
  const repo = new AuditLogsRepository(c.env.DB);
  const service = new AuditLogsService(repo);

  const filters = {
    institution_id: user.institution_id,
    module: c.req.query('module') || undefined,
    entity_type: c.req.query('entity_type') || undefined,
    entity_id: c.req.query('entity_id') || c.req.query('record_id') || undefined,
    user_id: c.req.query('user_id') || undefined,
    action: c.req.query('action') || undefined,
    event_name: c.req.query('event_name') || undefined,
    request_id: c.req.query('request_id') || undefined,
    status: c.req.query('status') || undefined,
    from_date: c.req.query('from_date') || undefined,
    to_date: c.req.query('to_date') || undefined,
    search: c.req.query('search') || undefined,
    page: c.req.query('page') ? parseInt(c.req.query('page')!, 10) : 1,
    limit: c.req.query('limit') ? parseInt(c.req.query('limit')!, 10) : 50,
  };

  const result = await service.queryLogs(filters);
  const modules = await service.getDistinctModules(user.institution_id);

  return c.json({
    ...result,
    modules,
  });
});

// --- ENTITY TIMELINE HISTORY ---
auditLogs.get('/entity/:entityType/:entityId', requireRole('admin', 'super_admin', 'Principal', 'HOD', 'Accountant'), async (c) => {
  const user = c.get('user');
  const entityType = c.req.param('entityType')!;
  const entityId = c.req.param('entityId')!;

  const repo = new AuditLogsRepository(c.env.DB);
  const service = new AuditLogsService(repo);

  const history = await service.getEntityHistory(user.institution_id, entityType, entityId);
  return c.json(history);
});

// --- SECURITY EVENTS ---
auditLogs.get('/security', requireRole('admin', 'super_admin', 'Principal'), async (c) => {
  const user = c.get('user');
  const limit = c.req.query('limit') ? parseInt(c.req.query('limit')!, 10) : 100;

  const repo = new AuditLogsRepository(c.env.DB);
  const service = new AuditLogsService(repo);

  const securityLogs = await service.getSecurityEvents(user.institution_id, limit);
  return c.json(securityLogs);
});

// --- DISTINCT MODULES ---
auditLogs.get('/modules', async (c) => {
  const user = c.get('user');
  const repo = new AuditLogsRepository(c.env.DB);
  const service = new AuditLogsService(repo);

  const modules = await service.getDistinctModules(user.institution_id);
  return c.json(modules);
});

// --- CSV EXPORT ---
auditLogs.get('/export/csv', requireRole('admin', 'super_admin', 'Principal'), async (c) => {
  const user = c.get('user');
  const repo = new AuditLogsRepository(c.env.DB);
  const service = new AuditLogsService(repo);

  const filters = {
    institution_id: user.institution_id,
    module: c.req.query('module') || undefined,
    entity_type: c.req.query('entity_type') || undefined,
    from_date: c.req.query('from_date') || undefined,
    to_date: c.req.query('to_date') || undefined,
    page: 1,
    limit: 1000,
  };

  const { data } = await service.queryLogs(filters);
  const csvText = service.generateCSV(data);

  return c.text(csvText, 200, {
    'Content-Type': 'text/csv',
    'Content-Disposition': `attachment; filename="audit_log_export_${Date.now()}.csv"`
  });
});

// --- JSON EXPORT ---
auditLogs.get('/export/json', requireRole('admin', 'super_admin', 'Principal'), async (c) => {
  const user = c.get('user');
  const repo = new AuditLogsRepository(c.env.DB);
  const service = new AuditLogsService(repo);

  const filters = {
    institution_id: user.institution_id,
    module: c.req.query('module') || undefined,
    entity_type: c.req.query('entity_type') || undefined,
    from_date: c.req.query('from_date') || undefined,
    to_date: c.req.query('to_date') || undefined,
    page: 1,
    limit: 1000,
  };

  const { data } = await service.queryLogs(filters);
  return c.json({
    exported_at: new Date().toISOString(),
    institution_id: user.institution_id,
    total_records: data.length,
    logs: data
  });
});

// --- POST MANUAL AUDIT ENTRY ---
auditLogs.post('/', requireRole('admin', 'super_admin', 'Principal'), async (c) => {
  const user = c.get('user');
  const requestId = c.get('requestId');
  const input = await c.req.json();

  if (!input.module || !input.action) {
    return c.json({ error: 'Missing required audit fields: module, action' }, 400);
  }

  const repo = new AuditLogsRepository(c.env.DB);
  const service = new AuditLogsService(repo);

  const id = await service.logEvent({
    ...input,
    institution_id: user.institution_id,
    user_id: user.sub,
    user_name: user.name || user.email,
    user_role: (user.roles || [user.role])[0] || 'User',
    request_id: requestId || input.request_id,
  });

  return c.json({ id, message: 'Audit entry created successfully' }, 201);
});

// --- BULK AUDIT ENTRIES ---
auditLogs.post('/bulk', requireRole('admin', 'super_admin', 'Principal'), async (c) => {
  const user = c.get('user');
  const requestId = c.get('requestId');
  const { entries } = await c.req.json();

  if (!Array.isArray(entries) || entries.length === 0) {
    return c.json({ error: 'Expected non-empty entries array' }, 400);
  }

  const repo = new AuditLogsRepository(c.env.DB);
  const service = new AuditLogsService(repo);

  const preparedEntries = entries.map((e: any) => ({
    ...e,
    institution_id: user.institution_id,
    user_id: user.sub,
    user_name: user.name || user.email,
    user_role: (user.roles || [user.role])[0] || 'User',
    request_id: requestId || e.request_id || crypto.randomUUID(),
  }));

  const ids = await service.logBulkEvents(preparedEntries);
  return c.json({ ids, count: ids.length, message: 'Bulk audit entries created successfully' }, 201);
});

export default auditLogs;
