import { FacultyPublication, CreatePublicationInput, UpdatePublicationInput } from './faculty-research.types';

export class FacultyResearchRepository {
  constructor(private db: any) {}

  async listForInstitution(institutionId: string): Promise<FacultyPublication[]> {
    const res = await this.db.prepare(`
      SELECT fp.*, t.first_name as teacher_first, t.last_name as teacher_last, t.employee_id
      FROM faculty_publications fp
      JOIN teachers t ON t.id = fp.teacher_id
      WHERE fp.institution_id = ? AND fp.is_active = 1
      ORDER BY fp.publication_date DESC, fp.created_at DESC
    `).bind(institutionId).all();
    return (res.results || []) as FacultyPublication[];
  }

  async listForTeacher(teacherId: string, institutionId: string): Promise<FacultyPublication[]> {
    const res = await this.db.prepare(`
      SELECT fp.*, t.first_name as teacher_first, t.last_name as teacher_last, t.employee_id
      FROM faculty_publications fp
      JOIN teachers t ON t.id = fp.teacher_id
      WHERE fp.teacher_id = ? AND fp.institution_id = ? AND fp.is_active = 1
      ORDER BY fp.publication_date DESC, fp.created_at DESC
    `).bind(teacherId, institutionId).all();
    return (res.results || []) as FacultyPublication[];
  }

  async getById(id: string, institutionId: string): Promise<FacultyPublication | null> {
    const row = await this.db.prepare(
      `SELECT * FROM faculty_publications WHERE id = ? AND institution_id = ? AND is_active = 1`
    ).bind(id, institutionId).first();
    return row ? (row as FacultyPublication) : null;
  }

  async create(id: string, institutionId: string, input: CreatePublicationInput, userId?: string): Promise<void> {
    const now = new Date().toISOString();
    await this.db.prepare(`
      INSERT INTO faculty_publications (
        id, institution_id, teacher_id, title, publication_type, venue_name, publication_date,
        co_authors, doi_or_url, description, created_at, updated_at, created_by, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, institutionId, input.teacher_id, input.title, input.publication_type || 'JOURNAL',
      input.venue_name || null, input.publication_date || null, input.co_authors || null,
      input.doi_or_url || null, input.description || null, now, now, userId || null, userId || null
    ).run();
  }

  async update(id: string, institutionId: string, input: UpdatePublicationInput, userId?: string): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];
    for (const [key, value] of Object.entries(input)) {
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }
    if (fields.length === 0) return;
    fields.push('updated_at = ?', 'updated_by = ?');
    values.push(new Date().toISOString(), userId || null, id, institutionId);
    await this.db.prepare(
      `UPDATE faculty_publications SET ${fields.join(', ')} WHERE id = ? AND institution_id = ?`
    ).bind(...values).run();
  }

  async softDelete(id: string, institutionId: string, userId?: string): Promise<void> {
    await this.db.prepare(
      `UPDATE faculty_publications SET is_active = 0, updated_at = ?, updated_by = ? WHERE id = ? AND institution_id = ?`
    ).bind(new Date().toISOString(), userId || null, id, institutionId).run();
  }
}
