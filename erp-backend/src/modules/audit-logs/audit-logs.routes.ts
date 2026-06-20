import { Hono } from 'hono';
import { Env, JwtPayload } from '../../types';
import { authMiddleware, requireRole } from '../../middleware/auth';

const auditLogs = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();

auditLogs.use('*', authMiddleware);

auditLogs.get('/', requireRole('admin', 'super_admin', 'Principal'), async (c) => {
  const user = c.get('user');
  
  const { results } = await c.env.DB.prepare(`
    SELECT al.id, al.user_id, al.action, al.module, al.record_id, al.description, al.timestamp, u.name as user_name, u.email as user_email
    FROM audit_logs al
    JOIN users u ON al.user_id = u.id
    WHERE u.institution_id = ?
    ORDER BY al.timestamp DESC
    LIMIT 200
  `).bind(user.institution_id).all<any>();
  
  return c.json(results || []);
});

export default auditLogs;
