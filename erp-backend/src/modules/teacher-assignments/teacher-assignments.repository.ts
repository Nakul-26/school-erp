import { TeacherSubjectAssignment, CreateAssignmentInput } from './teacher-assignments.types';

export class TeacherAssignmentRepository {
  constructor(private db: D1Database) {}

  async create(id: string, input: CreateAssignmentInput, userId?: string): Promise<void> {
    await this.db.prepare(`
      INSERT INTO teacher_subject_assignments (
        id, teacher_id, subject_id, course_id, section_id, academic_year_id, created_by, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, input.teacher_id, input.subject_id, input.course_id, input.section_id, input.academic_year_id, userId || null, userId || null
    ).run();
  }

  async listByTeacher(teacherId: string): Promise<TeacherSubjectAssignment[]> {
    const { results } = await this.db.prepare('SELECT * FROM teacher_subject_assignments WHERE teacher_id = ? AND is_active = 1').bind(teacherId).all<TeacherSubjectAssignment>();
    return results || [];
  }

  async listBySection(sectionId: string, academicYearId: string): Promise<TeacherSubjectAssignment[]> {
    const { results } = await this.db.prepare('SELECT * FROM teacher_subject_assignments WHERE section_id = ? AND academic_year_id = ? AND is_active = 1').bind(sectionId, academicYearId).all<TeacherSubjectAssignment>();
    return results || [];
  }

  async teacherBelongsToInstitution(teacherId: string, institutionId: string): Promise<boolean> {
    const result = await this.db.prepare(
      'SELECT 1 FROM teachers WHERE id = ? AND institution_id = ? AND is_active = 1'
    ).bind(teacherId, institutionId).first();
    return Boolean(result);
  }

  async sectionBelongsToInstitution(sectionId: string, institutionId: string): Promise<boolean> {
    const result = await this.db.prepare(
      'SELECT 1 FROM sections WHERE id = ? AND institution_id = ? AND is_active = 1'
    ).bind(sectionId, institutionId).first();
    return Boolean(result);
  }

  async belongsToInstitution(id: string, institutionId: string): Promise<boolean> {
    const result = await this.db.prepare(`
      SELECT 1 FROM teacher_subject_assignments a
      JOIN teachers t ON t.id = a.teacher_id
      WHERE a.id = ? AND t.institution_id = ? AND a.is_active = 1 AND t.is_active = 1
    `).bind(id, institutionId).first();
    return Boolean(result);
  }

  async referencesBelongToInstitution(input: CreateAssignmentInput, institutionId: string): Promise<boolean> {
    const result = await this.db.prepare(`
      SELECT 1
      FROM teachers t, subjects s, courses c, sections x, academic_years a
      WHERE t.id = ? AND s.id = ? AND c.id = ? AND x.id = ? AND a.id = ?
        AND t.institution_id = ? AND s.institution_id = ? AND c.institution_id = ?
        AND x.institution_id = ? AND a.institution_id = ?
        AND t.is_active = 1 AND s.is_active = 1 AND c.is_active = 1
        AND x.is_active = 1 AND a.is_active = 1
    `).bind(
      input.teacher_id, input.subject_id, input.course_id, input.section_id, input.academic_year_id,
      institutionId, institutionId, institutionId, institutionId, institutionId
    ).first();
    return Boolean(result);
  }

  async softDelete(id: string, userId?: string): Promise<void> {
    await this.db.prepare(`
      UPDATE teacher_subject_assignments 
      SET is_active = 0, deleted_at = datetime('now'), updated_by = ? 
      WHERE id = ?
    `).bind(userId || null, id).run();
  }
}
