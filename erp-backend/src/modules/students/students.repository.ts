import { Student, CreateStudentInput, UpdateStudentInput } from './students.types';
import { getUpdateFields } from '../../utils/repository';

const UPDATE_FIELDS = [
  'user_id', 'admission_number', 'roll_number', 'first_name', 'middle_name', 'last_name',
  'gender', 'date_of_birth', 'email', 'phone', 'admission_date', 'status',
] as const;

export class StudentRepository {
  constructor(private db: D1Database) {}

  async create(id: string, institutionId: string, input: CreateStudentInput, userId?: string): Promise<void> {
    await this.db.prepare(`
      INSERT INTO students (
        id, institution_id, user_id, admission_number, roll_number, 
        first_name, middle_name, last_name, gender, date_of_birth, 
        email, phone, admission_date, status, created_by, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, institutionId, input.user_id || null, input.admission_number, input.roll_number || null,
      input.first_name, input.middle_name || null, input.last_name, input.gender || null, input.date_of_birth || null,
      input.email || null, input.phone || null, input.admission_date || null, input.status, userId || null, userId || null
    ).run();
  }

  async findById(id: string): Promise<Student | null> {
    return await this.db.prepare('SELECT * FROM students WHERE id = ? AND is_active = 1').bind(id).first<Student>();
  }

  async listByInstitution(institutionId: string): Promise<Student[]> {
    const { results } = await this.db.prepare('SELECT * FROM students WHERE institution_id = ? AND is_active = 1').bind(institutionId).all<Student>();
    return results || [];
  }

  async update(id: string, input: UpdateStudentInput, userId?: string): Promise<void> {
    const fields = getUpdateFields(input, UPDATE_FIELDS);
    if (fields.length === 0) return;

    const sets = fields.map(field => `${field} = ?`).join(', ');
    const values = [...fields.map(f => input[f as keyof UpdateStudentInput]), userId || null, id];

    await this.db.prepare(`
      UPDATE students 
      SET ${sets}, updated_at = datetime('now'), updated_by = ?
      WHERE id = ? AND is_active = 1
    `).bind(...values).run();
  }

  async softDelete(id: string, userId?: string): Promise<void> {
    await this.db.prepare(`
      UPDATE students 
      SET is_active = 0, deleted_at = datetime('now'), updated_by = ? 
      WHERE id = ?
    `).bind(userId || null, id).run();
  }
}
