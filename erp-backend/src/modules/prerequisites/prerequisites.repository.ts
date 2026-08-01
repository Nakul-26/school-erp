import { PrerequisiteLink } from './prerequisites.types';

export class PrerequisitesRepository {
  constructor(private db: D1Database) {}

  async listForCourse(institutionId: string, courseId: string): Promise<PrerequisiteLink[]> {
    const { results } = await this.db.prepare(`
      SELECT sp.id, sp.subject_id, s.subject_code, s.subject_name,
             sp.prerequisite_subject_id, ps.subject_code as prerequisite_code, ps.subject_name as prerequisite_name
      FROM subject_prerequisites sp
      JOIN subjects s ON s.id = sp.subject_id
      JOIN subjects ps ON ps.id = sp.prerequisite_subject_id
      WHERE sp.institution_id = ? AND sp.is_active = 1 AND s.course_id = ?
      ORDER BY s.subject_code ASC, ps.subject_code ASC
    `).bind(institutionId, courseId).all<PrerequisiteLink>();
    return results || [];
  }

  async listForSubject(institutionId: string, subjectId: string): Promise<PrerequisiteLink[]> {
    const { results } = await this.db.prepare(`
      SELECT sp.id, sp.subject_id, s.subject_code, s.subject_name,
             sp.prerequisite_subject_id, ps.subject_code as prerequisite_code, ps.subject_name as prerequisite_name
      FROM subject_prerequisites sp
      JOIN subjects s ON s.id = sp.subject_id
      JOIN subjects ps ON ps.id = sp.prerequisite_subject_id
      WHERE sp.institution_id = ? AND sp.is_active = 1 AND sp.subject_id = ?
    `).bind(institutionId, subjectId).all<PrerequisiteLink>();
    return results || [];
  }

  async getSubject(institutionId: string, subjectId: string): Promise<{ id: string; course_id: string; subject_code: string; subject_name: string } | null> {
    return await this.db.prepare(
      `SELECT id, course_id, subject_code, subject_name FROM subjects WHERE id = ? AND institution_id = ? AND is_active = 1`
    ).bind(subjectId, institutionId).first<any>();
  }

  async findExisting(subjectId: string, prerequisiteSubjectId: string): Promise<{ id: string } | null> {
    return await this.db.prepare(
      `SELECT id FROM subject_prerequisites WHERE subject_id = ? AND prerequisite_subject_id = ? AND is_active = 1`
    ).bind(subjectId, prerequisiteSubjectId).first<any>();
  }

  async create(id: string, institutionId: string, subjectId: string, prerequisiteSubjectId: string, userId?: string): Promise<void> {
    await this.db.prepare(`
      INSERT INTO subject_prerequisites (id, institution_id, subject_id, prerequisite_subject_id, created_by)
      VALUES (?, ?, ?, ?, ?)
    `).bind(id, institutionId, subjectId, prerequisiteSubjectId, userId || null).run();
  }

  async findById(id: string): Promise<{ id: string; institution_id: string } | null> {
    return await this.db.prepare(`SELECT id, institution_id FROM subject_prerequisites WHERE id = ? AND is_active = 1`).bind(id).first<any>();
  }

  async remove(id: string): Promise<void> {
    await this.db.prepare(`UPDATE subject_prerequisites SET is_active = 0 WHERE id = ?`).bind(id).run();
  }

  // Depth-first walk over existing active links to reject a link that would close a cycle
  // (e.g. A requires B, B requires A) before it's ever inserted.
  async wouldCreateCycle(subjectId: string, prerequisiteSubjectId: string): Promise<boolean> {
    const { results } = await this.db.prepare(
      `SELECT subject_id, prerequisite_subject_id FROM subject_prerequisites WHERE is_active = 1`
    ).all<{ subject_id: string; prerequisite_subject_id: string }>();
    const edges = results || [];

    const visited = new Set<string>();
    const stack = [prerequisiteSubjectId];
    while (stack.length > 0) {
      const current = stack.pop()!;
      if (current === subjectId) return true;
      if (visited.has(current)) continue;
      visited.add(current);
      for (const edge of edges) {
        if (edge.subject_id === current) stack.push(edge.prerequisite_subject_id);
      }
    }
    return false;
  }

  // Latest published/completed exam attempt for a student in a given subject (any semester),
  // used purely for pass/fail eligibility checks — independent of the credit/GPA system.
  async getLatestAttempt(studentId: string, institutionId: string, subjectId: string): Promise<{ marks_obtained: number; max_marks: number } | null> {
    return await this.db.prepare(`
      SELECT sm.marks_obtained, sm.max_marks
      FROM exams e
      JOIN exam_subjects es ON es.exam_id = e.id AND es.is_active = 1 AND es.subject_id = ?
      JOIN student_marks sm ON sm.exam_subject_id = es.id AND sm.student_id = ? AND sm.is_active = 1
      WHERE e.institution_id = ? AND e.status IN ('PUBLISHED', 'COMPLETED') AND e.is_active = 1
      ORDER BY e.start_date DESC, e.created_at DESC
      LIMIT 1
    `).bind(subjectId, studentId, institutionId).first<{ marks_obtained: number; max_marks: number }>();
  }
}
