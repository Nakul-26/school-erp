import { Hono } from 'hono';
import { Env, JwtPayload } from '../../types';
import { GLAccountingRepository } from './gl-accounting.repository';
import { GLAccountingService, GLAccountingServiceError } from './gl-accounting.service';
import { authMiddleware, requirePermission } from '../../middleware/auth';
import { createAuditLog } from '../../utils/audit';

const glAccounting = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();

glAccounting.use('*', authMiddleware);

function getService(c: any): GLAccountingService {
  return new GLAccountingService(new GLAccountingRepository(c.env.DB));
}

function handleError(c: any, e: any) {
  const statusCode = e instanceof GLAccountingServiceError ? e.statusCode : 400;
  return c.json({ error: e.message }, statusCode as any);
}

// ==================== ACCOUNTS ==================== //

glAccounting.get('/accounts', requirePermission('gl.view'), async (c) => {
  const user = c.get('user');
  const service = getService(c);
  return c.json(await service.listAccounts(user.institution_id, user.sub));
});

glAccounting.post('/accounts', requirePermission('gl.manage'), async (c) => {
  const user = c.get('user');
  const service = getService(c);
  const body = await c.req.json();
  try {
    const id = await service.createAccount(user.institution_id, body, user.sub);
    await createAuditLog(c.env.DB, { institutionId: user.institution_id, userId: user.sub, module: 'GL_ACCOUNTING', action: 'CREATE_ACCOUNT', entityType: 'gl_accounts', entityId: id, afterData: body });
    return c.json({ id }, 201);
  } catch (e: any) {
    return handleError(c, e);
  }
});

glAccounting.put('/accounts/:id', requirePermission('gl.manage'), async (c) => {
  const user = c.get('user');
  const service = getService(c);
  const id = c.req.param('id')!;
  const body = await c.req.json();
  try {
    await service.updateAccount(user.institution_id, id, body, user.sub);
    return c.json({ success: true });
  } catch (e: any) {
    return handleError(c, e);
  }
});

glAccounting.delete('/accounts/:id', requirePermission('gl.manage'), async (c) => {
  const user = c.get('user');
  const service = getService(c);
  const id = c.req.param('id')!;
  try {
    await service.deleteAccount(user.institution_id, id);
    return c.json({ success: true });
  } catch (e: any) {
    return handleError(c, e);
  }
});

// ==================== JOURNAL ENTRIES ==================== //

glAccounting.get('/journal-entries', requirePermission('gl.view'), async (c) => {
  const user = c.get('user');
  const service = getService(c);
  const status = c.req.query('status');
  const from = c.req.query('from');
  const to = c.req.query('to');
  return c.json(await service.listJournalEntries(user.institution_id, { status, from, to }));
});

glAccounting.get('/journal-entries/:id', requirePermission('gl.view'), async (c) => {
  const user = c.get('user');
  const service = getService(c);
  const id = c.req.param('id')!;
  try {
    return c.json(await service.getJournalEntry(user.institution_id, id));
  } catch (e: any) {
    return handleError(c, e);
  }
});

glAccounting.post('/journal-entries', requirePermission('gl.manage'), async (c) => {
  const user = c.get('user');
  const service = getService(c);
  const body = await c.req.json();
  try {
    const id = await service.createJournalEntry(user.institution_id, body, user.sub);
    await createAuditLog(c.env.DB, { institutionId: user.institution_id, userId: user.sub, module: 'GL_ACCOUNTING', action: 'CREATE_JOURNAL_ENTRY', entityType: 'gl_journal_entries', entityId: id, afterData: body });
    return c.json({ id }, 201);
  } catch (e: any) {
    return handleError(c, e);
  }
});

glAccounting.post('/journal-entries/:id/post', requirePermission('gl.manage'), async (c) => {
  const user = c.get('user');
  const service = getService(c);
  const id = c.req.param('id')!;
  try {
    await service.postJournalEntry(user.institution_id, id, user.sub);
    await createAuditLog(c.env.DB, { institutionId: user.institution_id, userId: user.sub, module: 'GL_ACCOUNTING', action: 'POST_JOURNAL_ENTRY', entityType: 'gl_journal_entries', entityId: id });
    return c.json({ success: true });
  } catch (e: any) {
    return handleError(c, e);
  }
});

glAccounting.post('/journal-entries/:id/void', requirePermission('gl.manage'), async (c) => {
  const user = c.get('user');
  const service = getService(c);
  const id = c.req.param('id')!;
  try {
    await service.voidJournalEntry(user.institution_id, id, user.sub);
    await createAuditLog(c.env.DB, { institutionId: user.institution_id, userId: user.sub, module: 'GL_ACCOUNTING', action: 'VOID_JOURNAL_ENTRY', entityType: 'gl_journal_entries', entityId: id });
    return c.json({ success: true });
  } catch (e: any) {
    return handleError(c, e);
  }
});

glAccounting.delete('/journal-entries/:id', requirePermission('gl.manage'), async (c) => {
  const user = c.get('user');
  const service = getService(c);
  const id = c.req.param('id')!;
  try {
    await service.deleteDraftEntry(user.institution_id, id, user.sub);
    return c.json({ success: true });
  } catch (e: any) {
    return handleError(c, e);
  }
});

// ==================== REPORTS ==================== //

glAccounting.get('/trial-balance', requirePermission('gl.view'), async (c) => {
  const user = c.get('user');
  const service = getService(c);
  const asOf = c.req.query('as_of');
  return c.json(await service.getTrialBalance(user.institution_id, asOf));
});

export default glAccounting;
