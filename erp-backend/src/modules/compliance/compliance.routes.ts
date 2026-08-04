import { Hono } from 'hono';
import { Env, JwtPayload } from '../../types';
import { ComplianceRepository } from './compliance.repository';
import { ComplianceService, ComplianceServiceError } from './compliance.service';
import { authMiddleware, requirePermission } from '../../middleware/auth';

const compliance = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();

compliance.use('*', authMiddleware);
compliance.use('*', requirePermission('compliance.view'));

function getService(c: any): ComplianceService {
  return new ComplianceService(new ComplianceRepository(c.env.DB));
}

function handleError(c: any, e: any) {
  const statusCode = e instanceof ComplianceServiceError ? e.statusCode : 400;
  return c.json({ error: e.message }, statusCode as any);
}

compliance.get('/enrollment-summary', async (c) => {
  const user = c.get('user');
  const service = getService(c);
  return c.json(await service.getEnrollmentSummary(user.institution_id));
});

compliance.get('/attendance-summary', async (c) => {
  const user = c.get('user');
  const service = getService(c);
  const from = c.req.query('from');
  const to = c.req.query('to');
  try {
    return c.json(await service.getAttendanceSummary(user.institution_id, from, to));
  } catch (e: any) {
    return handleError(c, e);
  }
});

compliance.get('/fee-compliance', async (c) => {
  const user = c.get('user');
  const service = getService(c);
  return c.json(await service.getFeeCompliance(user.institution_id));
});

export default compliance;
