import { Hono } from 'hono';
import { Env, JwtPayload } from '../../types';
import { authMiddleware, requireRole } from '../../middleware/auth';

const auditLogs = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();

auditLogs.use('*', authMiddleware);

auditLogs.get('/', requireRole('admin', 'super_admin', 'Principal'), async (c) => {
  const user = c.get('user');

  const module    = c.req.query('module')    || '';
  const action    = c.req.query('action')    || '';
  const recordId  = c.req.query('record_id') || '';
  const fromDate  = c.req.query('from_date') || '';
  const toDate    = c.req.query('to_date')   || '';
  const page      = Math.max(1, parseInt(c.req.query('page')  || '1', 10));
  const limit     = Math.min(200, Math.max(1, parseInt(c.req.query('limit') || '50', 10)));
  const offset    = (page - 1) * limit;

  const conditions: string[] = ['u.institution_id = ?'];
  const values: any[] = [user.institution_id];

  if (module) {
    conditions.push('al.module = ?');
    values.push(module);
  }
  if (action) {
    conditions.push('al.action LIKE ?');
    values.push(`%${action}%`);
  }
  if (recordId) {
    conditions.push('al.record_id = ?');
    values.push(recordId);
  }
  if (fromDate) {
    conditions.push("date(al.timestamp) >= date(?)");
    values.push(fromDate);
  }
  if (toDate) {
    conditions.push("date(al.timestamp) <= date(?)");
    values.push(toDate);
  }

  const where = conditions.join(' AND ');

  const [{ results: logs }, countRow] = await Promise.all([
    c.env.DB.prepare(`
      SELECT al.id, al.user_id, al.action, al.module, al.record_id, al.description, al.timestamp,
             u.name as user_name, u.email as user_email
      FROM audit_logs al
      JOIN users u ON al.user_id = u.id
      WHERE ${where}
      ORDER BY al.timestamp DESC
      LIMIT ? OFFSET ?
    `).bind(...values, limit, offset).all<any>(),
    c.env.DB.prepare(`
      SELECT COUNT(*) as total
      FROM audit_logs al
      JOIN users u ON al.user_id = u.id
      WHERE ${where}
    `).bind(...values).first<{ total: number }>(),
  ]);

  // Get distinct modules for filter dropdown
  const { results: moduleList } = await c.env.DB.prepare(`
    SELECT DISTINCT al.module
    FROM audit_logs al
    JOIN users u ON al.user_id = u.id
    WHERE u.institution_id = ?
    ORDER BY al.module ASC
  `).bind(user.institution_id).all<{ module: string }>();

  return c.json({
    data: logs || [],
    total: countRow?.total || 0,
    page,
    limit,
    modules: (moduleList || []).map(m => m.module),
  });
});

export default auditLogs;

