import { Hono } from 'hono';
import { Env, JwtPayload } from '../../types';
import { MessageTemplatesRepository } from './message-templates.repository';
import { MessageTemplatesService } from './message-templates.service';
import { authMiddleware, requireRole } from '../../middleware/auth';
import { createAuditLog } from '../../utils/audit';

const messageTemplates = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();

messageTemplates.use('*', authMiddleware);

// 1. List all templates
messageTemplates.get('/', requireRole('admin', 'super_admin', 'Principal', 'HOD', 'Teacher'), async (c) => {
  const user = c.get('user');

  const repo = new MessageTemplatesRepository(c.env.DB);
  const service = new MessageTemplatesService(repo);
  const results = await service.listTemplates(user.institution_id);
  return c.json(results);
});

// 2. Get single template
messageTemplates.get('/:id', requireRole('admin', 'super_admin', 'Principal', 'HOD', 'Teacher'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;

  const repo = new MessageTemplatesRepository(c.env.DB);
  const service = new MessageTemplatesService(repo);
  const result = await service.getTemplate(id);

  if (!result || result.institution_id !== user.institution_id) {
    return c.json({ error: 'Template not found' }, 404);
  }
  return c.json(result);
});

// 3. Create a template
messageTemplates.post('/', requireRole('admin', 'super_admin', 'Principal', 'HOD', 'Teacher'), async (c) => {
  const user = c.get('user');
  const input = await c.req.json();

  const repo = new MessageTemplatesRepository(c.env.DB);
  const service = new MessageTemplatesService(repo);

  try {
    const payload = {
      ...input,
      created_by: user.sub
    };
    const id = await service.createTemplate(user.institution_id, payload);
    await createAuditLog(
      c.env.DB,
      user.sub,
      'CREATE_TEMPLATE',
      'message_templates',
      id,
      `Created message template: ${input.name}`
    );
    return c.json({ id, success: true }, 201);
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

// 4. Update template
messageTemplates.put('/:id', requireRole('admin', 'super_admin', 'Principal', 'HOD', 'Teacher'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const input = await c.req.json();

  const repo = new MessageTemplatesRepository(c.env.DB);
  const service = new MessageTemplatesService(repo);

  try {
    await service.updateTemplate(id, input);
    await createAuditLog(
      c.env.DB,
      user.sub,
      'UPDATE_TEMPLATE',
      'message_templates',
      id,
      `Updated message template: ${input.name || id}`
    );
    return c.json({ success: true });
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

// 5. Delete template (soft delete)
messageTemplates.delete('/:id', requireRole('admin', 'super_admin', 'Principal'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;

  const repo = new MessageTemplatesRepository(c.env.DB);
  const service = new MessageTemplatesService(repo);

  try {
    await service.deleteTemplate(id);
    await createAuditLog(
      c.env.DB,
      user.sub,
      'DELETE_TEMPLATE',
      'message_templates',
      id,
      `Deleted message template: ${id}`
    );
    return c.json({ success: true });
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

// 6. Manual trigger to seed default templates (admin only, useful for migration for existing schools)
messageTemplates.post('/seed-defaults', requireRole('admin', 'super_admin'), async (c) => {
  const user = c.get('user');

  const repo = new MessageTemplatesRepository(c.env.DB);
  const service = new MessageTemplatesService(repo);

  try {
    await service.seedDefaultTemplates(user.institution_id, user.sub);
    await createAuditLog(
      c.env.DB,
      user.sub,
      'SEED_TEMPLATES',
      'message_templates',
      user.institution_id,
      'Seeded default message templates'
    );
    return c.json({ success: true, message: 'Default templates seeded successfully' });
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

export default messageTemplates;
