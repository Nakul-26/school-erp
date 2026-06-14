import { StudentEnrollment, CreateEnrollmentInput, UpdateEnrollmentInput } from './enrollments.types';
import { getUpdateFields } from '../../utils/repository';

const UPDATE_FIELDS = ['academic_year_id', 'course_id', 'section_id', 'semester'] as const;

export class EnrollmentRepository {
  constructor(private db: D1Database) {}

  async create(id: string, input: CreateEnrollmentInput, userId?: string): Promise<void> {
    await this.db.prepare(`
      INSERT INTO student_enrollments (
        id, student_id, academic_year_id, course_id, section_id, semester, created_by, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, input.student_id, input.academic_year_id, input.course_id, input.section_id, input.semester ?? null, userId || null, userId || null
    ).run();
  }

  async listByStudent(studentId: string): Promise<StudentEnrollment[]> {
    const { results } = await this.db.prepare('SELECT * FROM student_enrollments WHERE student_id = ? AND is_active = 1').bind(studentId).all<StudentEnrollment>();
    return results || [];
  }

  async findById(id: string): Promise<StudentEnrollment | null> {
    return await this.db.prepare('SELECT * FROM student_enrollments WHERE id = ? AND is_active = 1').bind(id).first<StudentEnrollment>();
  }

  async belongsToInstitution(id: string, institutionId: string): Promise<boolean> {
    const result = await this.db.prepare(`
      SELECT 1 FROM student_enrollments e
      JOIN students s ON s.id = e.student_id
      WHERE e.id = ? AND s.institution_id = ? AND e.is_active = 1 AND s.is_active = 1
    `).bind(id, institutionId).first();
    return Boolean(result);
  }

  async studentBelongsToInstitution(studentId: string, institutionId: string): Promise<boolean> {
    const result = await this.db.prepare(
      'SELECT 1 FROM students WHERE id = ? AND institution_id = ? AND is_active = 1'
    ).bind(studentId, institutionId).first();
    return Boolean(result);
  }

  async referencesBelongToInstitution(input: CreateEnrollmentInput, institutionId: string): Promise<boolean> {
    const result = await this.db.prepare(`
      SELECT 1
      FROM students s, academic_years a, courses c, sections x
      WHERE s.id = ? AND a.id = ? AND c.id = ? AND x.id = ?
        AND s.institution_id = ? AND a.institution_id = ? AND c.institution_id = ? AND x.institution_id = ?
        AND s.is_active = 1 AND a.is_active = 1 AND c.is_active = 1 AND x.is_active = 1
    `).bind(
      input.student_id, input.academic_year_id, input.course_id, input.section_id,
      institutionId, institutionId, institutionId, institutionId
    ).first();
    return Boolean(result);
  }

  async updateReferencesBelongToInstitution(
    id: string,
    input: UpdateEnrollmentInput,
    institutionId: string
  ): Promise<boolean> {
    const existing = await this.findById(id);
    if (!existing) return false;
    return this.referencesBelongToInstitution({ ...existing, ...input }, institutionId);
  }

  async update(id: string, input: UpdateEnrollmentInput, userId?: string): Promise<void> {
    const fields = getUpdateFields(input, UPDATE_FIELDS);
    if (fields.length === 0) return;

    const sets = fields.map(field => `${field} = ?`).join(', ');
    const values = [...fields.map(f => input[f as keyof UpdateEnrollmentInput]), userId || null, id];

    await this.db.prepare(`
      UPDATE student_enrollments 
      SET ${sets}, updated_at = datetime('now'), updated_by = ?
      WHERE id = ? AND is_active = 1
    `).bind(...values).run();
  }

  async softDelete(id: string, userId?: string): Promise<void> {
    await this.db.prepare(`
      UPDATE student_enrollments 
      SET is_active = 0, deleted_at = datetime('now'), updated_by = ? 
      WHERE id = ?
    `).bind(userId || null, id).run();
  }
}
