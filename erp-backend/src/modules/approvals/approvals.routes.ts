import { Hono } from 'hono';
import { Env, JwtPayload } from '../../types';
import { ApprovalsRepository } from './approvals.repository';
import { CreateApprovalInput } from './approvals.types';
import { authMiddleware, requirePermission } from '../../middleware/auth';
import { createAuditLog } from '../../utils/audit';

const approvals = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();

approvals.use('*', authMiddleware);

// 1. GET /: List approval requests
approvals.get('/', async (c) => {
  const user = c.get('user');
  const query = c.req.query();
  const repo = new ApprovalsRepository(c.env.DB);

  const list = await repo.list(user.institution_id, {
    status: query.status,
    requester_id: query.requester_id
  });

  return c.json(list);
});

// 2. GET /:id: Get details of single approval request
approvals.get('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const repo = new ApprovalsRepository(c.env.DB);

  const item = await repo.findById(id, user.institution_id);
  if (!item) {
    return c.json({ error: 'Approval request not found' }, 404);
  }

  return c.json(item);
});

// 3. POST /: Create approval request
approvals.post('/', async (c) => {
  const user = c.get('user');
  const input = await c.req.json<CreateApprovalInput>();
  const repo = new ApprovalsRepository(c.env.DB);

  if (!input.approval_type || !input.entity_type || !input.entity_id) {
    return c.json({ error: 'Missing required request parameters' }, 400);
  }

  const id = crypto.randomUUID();
  try {
    await repo.create(id, user.institution_id, user.sub, input);
    await createAuditLog(
      c.env.DB,
      user.sub,
      'CREATE_APPROVAL_REQUEST',
      'approvals',
      id,
      `Requested approval for ${input.approval_type} (table: ${input.entity_type}, id: ${input.entity_id})`
    );

    return c.json({ success: true, id }, 201);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// 4. POST /:id/action: Approve or reject request (restricted to academic.manage or institution.manage / administrative roles)
approvals.post('/:id/action', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const body = await c.req.json<{
    status: 'Approved' | 'Rejected';
    remarks?: string;
  }>();

  if (!body.status || !['Approved', 'Rejected'].includes(body.status)) {
    return c.json({ error: 'Status must be Approved or Rejected' }, 400);
  }

  const repo = new ApprovalsRepository(c.env.DB);

  try {
    await repo.processApproval(id, user.institution_id, user.sub, body.status, body.remarks);
    await createAuditLog(
      c.env.DB,
      user.sub,
      'PROCESS_APPROVAL_REQUEST',
      'approvals',
      id,
      `Approval request ${body.status} with remarks: ${body.remarks || 'None'}`
    );

    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

export default approvals;
