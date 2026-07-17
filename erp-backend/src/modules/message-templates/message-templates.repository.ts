import { MessageTemplate, CreateMessageTemplateInput, UpdateMessageTemplateInput } from './message-templates.types';

export class MessageTemplatesRepository {
  constructor(private db: D1Database) {}

  async create(id: string, institutionId: string, input: CreateMessageTemplateInput): Promise<void> {
    await this.db.prepare(`
      INSERT INTO message_templates (
        id, institution_id, name, category, subject, body, is_active, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      institutionId,
      input.name,
      input.category || 'general',
      input.subject,
      input.body,
      input.is_active !== undefined ? input.is_active : 1,
      input.created_by || null
    ).run();
  }

  async findById(id: string): Promise<MessageTemplate | null> {
    return await this.db.prepare(
      'SELECT * FROM message_templates WHERE id = ? AND is_active = 1'
    ).bind(id).first<MessageTemplate>();
  }

  async update(id: string, input: UpdateMessageTemplateInput): Promise<void> {
    const updates: string[] = [];
    const values: any[] = [];

    const fieldMapping: Record<string, string> = {
      name: 'name',
      category: 'category',
      subject: 'subject',
      body: 'body',
      is_active: 'is_active'
    };

    for (const [key, dbCol] of Object.entries(fieldMapping)) {
      if (input[key as keyof UpdateMessageTemplateInput] !== undefined) {
        updates.push(`${dbCol} = ?`);
        values.push(input[key as keyof UpdateMessageTemplateInput]);
      }
    }

    if (updates.length === 0) return;

    values.push(id);

    await this.db.prepare(`
      UPDATE message_templates
      SET ${updates.join(', ')}, updated_at = datetime('now')
      WHERE id = ? AND is_active = 1
    `).bind(...values).run();
  }

  async listAll(institutionId: string): Promise<MessageTemplate[]> {
    const { results } = await this.db.prepare(
      'SELECT * FROM message_templates WHERE institution_id = ? AND is_active = 1 ORDER BY name ASC'
    ).bind(institutionId).all<MessageTemplate>();
    return results || [];
  }

  async softDelete(id: string): Promise<void> {
    await this.db.prepare(
      "UPDATE message_templates SET is_active = 0, updated_at = datetime('now') WHERE id = ?"
    ).bind(id).run();
  }
}
