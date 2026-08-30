import { Hono } from 'hono';
import { Env } from '../../types';
import { authMiddleware, requirePermission } from '../../middleware/auth';
import { AnalyticsRepository } from './analytics.repository';
import { AnalyticsService } from './analytics.service';
import { ReportType, ReportFormat } from './types';

const analytics = new Hono<{ Bindings: Env }>();

analytics.use('*', authMiddleware);
// School-wide KPIs/reports — gate the whole workspace behind reports.access
// (students/guardians don't hold it in the seeded permission catalog).
analytics.use('*', requirePermission('reports.access'));

function getService(c: any) {
  const repo = new AnalyticsRepository(c.env.DB);
  return new AnalyticsService(repo);
}

function getInstId(c: any): string {
  const user = c.get('user');
  return user?.institution_id || c.req.header('x-institution-id') || 'inst-1';
}

function getUserRole(c: any): string {
  const user = c.get('user');
  return user?.role || (user?.roles ? user.roles[0] : 'admin');
}

function getUserId(c: any): string {
  const user = c.get('user');
  return user?.sub || 'ADMIN';
}

// 1. Get Role-Filtered Cached KPIs
analytics.get('/kpis', async (c) => {
  const service = getService(c);
  const institutionId = getInstId(c);
  const role = getUserRole(c);
  const category = c.req.query('category');

  // Auto refresh if empty
  let kpis = await service.getRoleFilteredKPIs(institutionId, role);
  if (kpis.length === 0) {
    kpis = await service.refreshKPISnapshots(institutionId);
    kpis = await service.getRoleFilteredKPIs(institutionId, role);
  }

  if (category) {
    kpis = kpis.filter(k => k.category === category);
  }

  return c.json(kpis);
});

// 2. Trigger KPI & Warehouse Refresh
analytics.post('/refresh', async (c) => {
  const service = getService(c);
  const institutionId = getInstId(c);
  const refreshedKPIs = await service.refreshKPISnapshots(institutionId);
  return c.json({ refreshedCount: refreshedKPIs.length, kpis: refreshedKPIs });
});

// 3. Get Daily Trends
analytics.get('/daily', async (c) => {
  const service = getService(c);
  const institutionId = getInstId(c);
  const limit = parseInt(c.req.query('limit') || '30');

  let rows = await service.repo.getDailyAnalyticsRange(institutionId, limit);
  if (rows.length === 0) {
    await service.refreshKPISnapshots(institutionId);
    rows = await service.repo.getDailyAnalyticsRange(institutionId, limit);
  }

  return c.json(rows);
});

// 4. Get Monthly Trends
analytics.get('/monthly', async (c) => {
  const service = getService(c);
  const institutionId = getInstId(c);

  let rows = await service.repo.getMonthlyAnalytics(institutionId);
  if (rows.length === 0) {
    await service.refreshKPISnapshots(institutionId);
    rows = await service.repo.getMonthlyAnalytics(institutionId);
  }

  return c.json(rows);
});

// 5. JSON Report Builder API
analytics.post('/reports/builder', async (c) => {
  const service = getService(c);
  const institutionId = getInstId(c);
  const body = await c.req.json();

  const reportData = await service.buildReportData({
    institutionId,
    reportType: (body.reportType || 'AcademicSummary') as ReportType,
    startDate: body.startDate,
    endDate: body.endDate,
    departmentId: body.departmentId,
    sectionId: body.sectionId
  });

  return c.json(reportData);
});

// 6. CSV Report Export
analytics.get('/reports/export', async (c) => {
  const service = getService(c);
  const institutionId = getInstId(c);
  const reportType = (c.req.query('reportType') || 'AcademicSummary') as ReportType;

  const csvContent = await service.exportReportCSV({
    institutionId,
    reportType
  });

  const filename = `${reportType}_${new Date().toISOString().split('T')[0]}.csv`;

  return c.text(csvContent, 200, {
    'Content-Type': 'text/csv',
    'Content-Disposition': `attachment; filename="${filename}"`
  });
});

// 7. List Scheduled Reports
analytics.get('/reports/schedules', async (c) => {
  const service = getService(c);
  const institutionId = getInstId(c);
  const schedules = await service.repo.listScheduledReports(institutionId);
  return c.json(schedules);
});

// 8. Create Scheduled Report
analytics.post('/reports/schedules', async (c) => {
  const service = getService(c);
  const institutionId = getInstId(c);
  const userId = getUserId(c);
  const body = await c.req.json();

  if (!body.name || !body.reportType || !body.scheduleCron) {
    return c.json({ error: 'name, reportType, and scheduleCron are required' }, 400);
  }

  const recipients = body.recipients || ['admin@oxford.edu'];

  const schedule = await service.repo.createScheduledReport({
    id: `rpt_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    institution_id: institutionId,
    name: body.name,
    report_type: body.reportType,
    schedule_cron: body.scheduleCron,
    recipients_json: JSON.stringify(recipients),
    filters_json: body.filters ? JSON.stringify(body.filters) : null,
    format: body.format || 'CSV',
    created_by: userId
  });

  return c.json(schedule, 201);
});

// 9. Trigger Scheduled Report Delivery
analytics.post('/reports/schedules/:id/trigger', async (c) => {
  const service = getService(c);
  const id = c.req.param('id');

  try {
    const success = await service.triggerScheduledReportDelivery(id, c.env);
    return c.json({ success, message: 'Scheduled report generated and delivered' });
  } catch (err: any) {
    return c.json({ error: err.message }, 400);
  }
});

export default analytics;
