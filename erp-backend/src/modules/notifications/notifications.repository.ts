import { Notification, CreateNotificationInput } from './notifications.types';

export class NotificationRepository {
  constructor(private db: D1Database) {}

  async create(id: string, institutionId: string, input: CreateNotificationInput): Promise<void> {
    await this.db.prepare(`
      INSERT INTO notifications (
        id, institution_id, user_id, title, message, type, is_read
      ) VALUES (?, ?, ?, ?, ?, ?, 0)
    `).bind(
      id, institutionId, input.user_id, input.title, input.message, input.type
    ).run();
  }

  async createBulk(institutionId: string, inputs: CreateNotificationInput[]): Promise<void> {
    if (inputs.length === 0) return;
    for (const input of inputs) {
      const id = crypto.randomUUID();
      await this.db.prepare(`
        INSERT INTO notifications (
          id, institution_id, user_id, title, message, type, is_read
        ) VALUES (?, ?, ?, ?, ?, ?, 0)
      `).bind(
        id, institutionId, input.user_id, input.title, input.message, input.type
      ).run();
    }
  }

  async listByUser(institutionId: string, userId: string): Promise<Notification[]> {
    const { results } = await this.db.prepare(`
      SELECT * FROM notifications 
      WHERE institution_id = ? AND user_id = ? 
      ORDER BY created_at DESC
    `).bind(institutionId, userId).all<Notification>();
    return results || [];
  }

  async markAsRead(id: string, userId: string): Promise<void> {
    await this.db.prepare(`
      UPDATE notifications 
      SET is_read = 1, read_at = datetime('now')
      WHERE id = ? AND user_id = ?
    `).bind(id, userId).run();
  }

  async markAllAsRead(institutionId: string, userId: string): Promise<void> {
    await this.db.prepare(`
      UPDATE notifications 
      SET is_read = 1, read_at = datetime('now')
      WHERE institution_id = ? AND user_id = ? AND is_read = 0
    `).bind(institutionId, userId).run();
  }
}
