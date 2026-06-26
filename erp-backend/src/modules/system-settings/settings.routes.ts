import { Hono } from 'hono';
import { Env, JwtPayload } from '../../types';
import { SystemSettingsRepository } from './settings.repository';
import { authMiddleware, requirePermission } from '../../middleware/auth';
import { createAuditLog } from '../../utils/audit';

const settings = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();

settings.use('*', authMiddleware);

// 1. GET /: List all settings
settings.get('/', async (c) => {
  const user = c.get('user');
  const repo = new SystemSettingsRepository(c.env.DB);
  const list = await repo.list(user.institution_id);
  return c.json(list);
});

// 2. GET /rule: Evaluate a rule threshold
settings.get('/rule', async (c) => {
  const user = c.get('user');
  const category = c.req.query('category');
  const key = c.req.query('key');

  if (!category || !key) {
    return c.json({ error: 'category and key parameters are required' }, 400);
  }

  const repo = new SystemSettingsRepository(c.env.DB);
  const val = await repo.getByKey(user.institution_id, category, key);
  
  if (val === null) {
    return c.json({ error: 'Rule setting not found' }, 404);
  }

  try {
    return c.json({ value: JSON.parse(val) });
  } catch {
    return c.json({ value: val });
  }
});

// 3. POST /: Save or update multiple settings in a batch
settings.post('/', requirePermission('institution.manage'), async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{
    settings: Array<{
      category: string;
      setting_key: string;
      setting_value: string;
    }>;
  }>();

  if (!body.settings || !Array.isArray(body.settings)) {
    return c.json({ error: 'Invalid settings payload' }, 400);
  }

  const repo = new SystemSettingsRepository(c.env.DB);

  try {
    for (const s of body.settings) {
      await repo.save(user.institution_id, s.category, s.setting_key, s.setting_value, user.sub);
      await createAuditLog(
        c.env.DB,
        user.sub,
        'UPDATE_SYSTEM_SETTINGS',
        'system_settings',
        s.setting_key,
        `Updated settings key ${s.setting_key} in category ${s.category} to ${s.setting_value}`
      );
    }
    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

export default settings;
