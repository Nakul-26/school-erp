import { Subject, CreateSubjectInput, UpdateSubjectInput } from './subjects.types';
import { getUpdateFields } from '../../utils/repository';

const UPDATE_FIELDS = [
  'course_id', 
  'subject_code', 
  'subject_name', 
  'credits', 
  'semester',
  'is_elective',
  'status',
  'description',
  'theory_lab',
  'department',
  'weekly_hours'
] as const;

export class SubjectRepository {
  constructor(private db: D1Database) {}

  async create(id: string, institutionId: string, input: CreateSubjectInput, userId?: string): Promise<void> {
    await this.db.prepare(`
      INSERT INTO subjects (
        id, institution_id, course_id, subject_code, subject_name, credits, semester,
        is_elective, status, description, theory_lab, department, weekly_hours, created_by, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      institutionId,
      input.course_id,
      input.subject_code,
      input.subject_name,
      input.credits ?? null,
      input.semester ?? null,
      input.is_elective ?? 0,
      input.status ?? 'ACTIVE',
      input.description ?? null,
      input.theory_lab ?? 'Theory',
      input.department ?? null,
      input.weekly_hours ?? null,
      userId || null,
      userId || null
    ).run();
  }

  async findById(id: string): Promise<Subject | null> {
    return await this.db.prepare('SELECT * FROM subjects WHERE id = ? AND is_active = 1').bind(id).first<Subject>();
  }

  async listByInstitution(institutionId: string, filters?: { course_id?: string; semester?: number }): Promise<Subject[]> {
    let query = 'SELECT * FROM subjects WHERE institution_id = ? AND is_active = 1';
    const params: any[] = [institutionId];

    if (filters?.course_id) {
      query += ' AND course_id = ?';
      params.push(filters.course_id);
    }
    if (filters?.semester) {
      query += ' AND semester = ?';
      params.push(filters.semester);
    }

    const { results } = await this.db.prepare(query).bind(...params).all<Subject>();
    return results || [];
  }

  async update(id: string, input: UpdateSubjectInput, userId?: string): Promise<void> {
    const fields = getUpdateFields(input, UPDATE_FIELDS);
    if (fields.length === 0) return;

    const sets = fields.map(field => `${field} = ?`).join(', ');
    const values = [...fields.map(field => input[field]), userId || null, id];

    await this.db.prepare(`
      UPDATE subjects 
      SET ${sets}, updated_at = datetime('now'), updated_by = ?
      WHERE id = ? AND is_active = 1
    `).bind(...values).run();
  }

  async softDelete(id: string, userId?: string): Promise<void> {
    await this.db.prepare(`
      UPDATE subjects 
      SET is_active = 0, deleted_at = datetime('now'), updated_by = ? 
      WHERE id = ?
    `).bind(userId || null, id).run();
  }
}
