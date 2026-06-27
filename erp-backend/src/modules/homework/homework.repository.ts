import { Homework, CreateHomeworkInput } from './homework.types';

export class HomeworkRepository {
  constructor(private db: D1Database) {}

  async create(id: string, institutionId: string, input: CreateHomeworkInput, userId?: string): Promise<void> {
    await this.db.prepare(`
      INSERT INTO homework (id, institution_id, section_id, subject_id, teacher_id, title, description, due_date, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, institutionId, input.section_id, input.subject_id, input.teacher_id, input.title, input.description || null, input.due_date, userId || null
    ).run();
  }

  async list(institutionId: string, sectionId?: string, subjectId?: string): Promise<any[]> {
    let query = `
      SELECT h.*, s.subject_name, s.subject_code, t.first_name as teacher_first, t.last_name as teacher_last, sec.name as section_name
      FROM homework h
      JOIN subjects s ON h.subject_id = s.id
      JOIN teachers t ON h.teacher_id = t.id
      JOIN sections sec ON h.section_id = sec.id
      WHERE h.institution_id = ? AND h.is_active = 1
    `;
    const params: any[] = [institutionId];

    if (sectionId) {
      query += ` AND h.section_id = ?`;
      params.push(sectionId);
    }
    if (subjectId) {
      query += ` AND h.subject_id = ?`;
      params.push(subjectId);
    }

    query += ` ORDER BY h.due_date ASC, h.created_at DESC`;

    const { results } = await this.db.prepare(query).bind(...params).all<any>();
    return results || [];
  }

  async getById(id: string): Promise<Homework | null> {
    return await this.db.prepare('SELECT * FROM homework WHERE id = ? AND is_active = 1').bind(id).first<Homework>();
  }

  async update(id: string, title: string, description: string | null, dueDate: string, userId?: string): Promise<void> {
    await this.db.prepare(`
      UPDATE homework
      SET title = ?, description = ?, due_date = ?, updated_at = datetime('now'), updated_by = ?
      WHERE id = ?
    `).bind(title, description, dueDate, userId || null, id).run();
  }

  async softDelete(id: string, userId?: string): Promise<void> {
    await this.db.prepare(`
      UPDATE homework
      SET is_active = 0, updated_at = datetime('now'), updated_by = ?
      WHERE id = ?
    `).bind(userId || null, id).run();
  }
}
