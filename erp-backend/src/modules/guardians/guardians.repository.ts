import { Guardian, CreateGuardianInput, UpdateGuardianInput } from './guardians.types';
import { getUpdateFields } from '../../utils/repository';

const UPDATE_FIELDS = ['user_id', 'name', 'relationship', 'phone', 'email', 'occupation'] as const;

export class GuardianRepository {
  constructor(private db: D1Database) {}

  async create(id: string, input: CreateGuardianInput, userId?: string): Promise<void> {
    await this.db.prepare(`
      INSERT INTO guardians (
        id, student_id, user_id, name, relationship, phone, email, occupation, created_by, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, input.student_id, input.user_id || null, input.name, input.relationship, input.phone || null,
      input.email || null, input.occupation || null, userId || null, userId || null
    ).run();
  }

  async findById(id: string): Promise<Guardian | null> {
    return await this.db.prepare('SELECT * FROM guardians WHERE id = ? AND is_active = 1').bind(id).first<Guardian>();
  }

  async listByStudent(studentId: string): Promise<Guardian[]> {
    const { results } = await this.db.prepare('SELECT * FROM guardians WHERE student_id = ? AND is_active = 1').bind(studentId).all<Guardian>();
    return results || [];
  }

  async belongsToInstitution(id: string, institutionId: string): Promise<boolean> {
    const result = await this.db.prepare(`
      SELECT 1 FROM guardians g
      JOIN students s ON s.id = g.student_id
      WHERE g.id = ? AND s.institution_id = ? AND g.is_active = 1 AND s.is_active = 1
    `).bind(id, institutionId).first();
    return Boolean(result);
  }

  async studentBelongsToInstitution(studentId: string, institutionId: string): Promise<boolean> {
    const result = await this.db.prepare(
      'SELECT 1 FROM students WHERE id = ? AND institution_id = ? AND is_active = 1'
    ).bind(studentId, institutionId).first();
    return Boolean(result);
  }

  async update(id: string, input: UpdateGuardianInput, userId?: string): Promise<void> {
    const fields = getUpdateFields(input, UPDATE_FIELDS);
    if (fields.length === 0) return;

    const sets = fields.map(field => `${field} = ?`).join(', ');
    const values = [...fields.map(f => input[f as keyof UpdateGuardianInput]), userId || null, id];

    await this.db.prepare(`
      UPDATE guardians 
      SET ${sets}, updated_at = datetime('now'), updated_by = ?
      WHERE id = ? AND is_active = 1
    `).bind(...values).run();
  }

  async softDelete(id: string, userId?: string): Promise<void> {
    await this.db.prepare(`
      UPDATE guardians 
      SET is_active = 0, deleted_at = datetime('now'), updated_by = ? 
      WHERE id = ?
    `).bind(userId || null, id).run();
  }
}
