import { Announcement, CreateAnnouncementInput, UpdateAnnouncementInput } from './announcements.types';

export class AnnouncementRepository {
  constructor(private db: D1Database) {}

  async create(id: string, institutionId: string, input: CreateAnnouncementInput, userId?: string): Promise<void> {
    await this.db.prepare(`
      INSERT INTO announcements (
        id, institution_id, title, content, 
        visible_to_students, visible_to_teachers, visible_to_parents, 
        section_id, created_by, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, institutionId, input.title, input.content,
      input.visible_to_students || 0, input.visible_to_teachers || 0, input.visible_to_parents || 0,
      input.section_id || null, userId || null, userId || null
    ).run();
  }

  async findById(id: string): Promise<Announcement | null> {
    return await this.db.prepare('SELECT * FROM announcements WHERE id = ? AND is_active = 1').bind(id).first<Announcement>();
  }

  async listAll(institutionId: string, sectionId?: string): Promise<Announcement[]> {
    let query = 'SELECT * FROM announcements WHERE institution_id = ? AND is_active = 1';
    const params: any[] = [institutionId];
    if (sectionId) {
      query += ' AND (section_id = ? OR section_id IS NULL)';
      params.push(sectionId);
    }
    query += ' ORDER BY created_at DESC';
    const { results } = await this.db.prepare(query).bind(...params).all<Announcement>();
    return results || [];
  }

  async listForAudience(
    institutionId: string, 
    filterField: 'visible_to_students' | 'visible_to_teachers' | 'visible_to_parents',
    sectionId?: string
  ): Promise<Announcement[]> {
    let query = `
      SELECT * FROM announcements 
      WHERE institution_id = ? AND ${filterField} = 1 AND is_active = 1
    `;
    const params: any[] = [institutionId];
    if (sectionId) {
      query += ' AND (section_id = ? OR section_id IS NULL)';
      params.push(sectionId);
    }
    query += ' ORDER BY created_at DESC';
    const { results } = await this.db.prepare(query).bind(...params).all<Announcement>();
    return results || [];
  }

  async update(id: string, input: UpdateAnnouncementInput, userId?: string): Promise<void> {
    const updates: string[] = [];
    const values: any[] = [];

    if (input.title !== undefined) {
      updates.push('title = ?');
      values.push(input.title);
    }
    if (input.content !== undefined) {
      updates.push('content = ?');
      values.push(input.content);
    }
    if (input.visible_to_students !== undefined) {
      updates.push('visible_to_students = ?');
      values.push(input.visible_to_students);
    }
    if (input.visible_to_teachers !== undefined) {
      updates.push('visible_to_teachers = ?');
      values.push(input.visible_to_teachers);
    }
    if (input.visible_to_parents !== undefined) {
      updates.push('visible_to_parents = ?');
      values.push(input.visible_to_parents);
    }
    if (input.section_id !== undefined) {
      updates.push('section_id = ?');
      values.push(input.section_id);
    }

    if (updates.length === 0) return;

    values.push(userId || null, id);

    await this.db.prepare(`
      UPDATE announcements 
      SET ${updates.join(', ')}, updated_at = datetime('now'), updated_by = ?
      WHERE id = ? AND is_active = 1
    `).bind(...values).run();
  }

  async softDelete(id: string, userId?: string): Promise<void> {
    await this.db.prepare(`
      UPDATE announcements 
      SET is_active = 0, deleted_at = datetime('now'), updated_by = ? 
      WHERE id = ?
    `).bind(userId || null, id).run();
  }
}
