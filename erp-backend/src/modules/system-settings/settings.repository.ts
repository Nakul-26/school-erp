import { SystemSetting } from './settings.types';

export class SystemSettingsRepository {
  constructor(private db: D1Database) {}

  async list(institutionId: string): Promise<SystemSetting[]> {
    const { results } = await this.db.prepare(`
      SELECT * FROM system_settings 
      WHERE institution_id = ?
    `).bind(institutionId).all<SystemSetting>();
    return results || [];
  }

  async save(institutionId: string, category: string, key: string, value: string, userId?: string): Promise<void> {
    const id = crypto.randomUUID();
    await this.db.prepare(`
      INSERT INTO system_settings (id, institution_id, category, setting_key, setting_value, updated_by)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(institution_id, category, setting_key) DO UPDATE SET
        setting_value = excluded.setting_value,
        updated_at = datetime('now'),
        updated_by = excluded.updated_by
    `).bind(id, institutionId, category, key, value, userId || null).run();
  }

  async getByKey(institutionId: string, category: string, key: string): Promise<string | null> {
    const res = await this.db.prepare(`
      SELECT setting_value FROM system_settings
      WHERE institution_id = ? AND category = ? AND setting_key = ?
    `).bind(institutionId, category, key).first<{ setting_value: string }>();
    return res ? res.setting_value : null;
  }
}
