import { StudyMaterial, CreateStudyMaterialInput } from './study-materials.types';

export class StudyMaterialsRepository {
  constructor(private db: any) {}

  async create(id: string, institutionId: string, input: CreateStudyMaterialInput, userId?: string): Promise<void> {
    const now = new Date().toISOString();
    await this.db.prepare(`
      INSERT INTO study_materials (
        id, institution_id, section_id, subject_id, teacher_id, title, description,
        material_type, file_key, external_url, created_at, updated_at, created_by, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, institutionId, input.section_id, input.subject_id, input.teacher_id, input.title,
      input.description || null, input.material_type || 'DOCUMENT', input.file_key || null,
      input.external_url || null, now, now, userId || null, userId || null
    ).run();
  }

  async listForInstitution(institutionId: string, sectionId?: string, subjectId?: string): Promise<StudyMaterial[]> {
    let query = `
      SELECT sm.*, sec.name as section_name, sub.subject_name, sub.subject_code,
        t.first_name as teacher_first, t.last_name as teacher_last
      FROM study_materials sm
      JOIN sections sec ON sec.id = sm.section_id
      JOIN subjects sub ON sub.id = sm.subject_id
      JOIN teachers t ON t.id = sm.teacher_id
      WHERE sm.institution_id = ? AND sm.is_active = 1
    `;
    const params: any[] = [institutionId];
    if (sectionId) {
      query += ` AND sm.section_id = ?`;
      params.push(sectionId);
    }
    if (subjectId) {
      query += ` AND sm.subject_id = ?`;
      params.push(subjectId);
    }
    query += ` ORDER BY sm.created_at DESC`;
    const res = await this.db.prepare(query).bind(...params).all();
    return (res.results || []) as StudyMaterial[];
  }

  async listForTeacher(institutionId: string, teacherId: string, sectionId?: string, subjectId?: string): Promise<StudyMaterial[]> {
    let query = `
      SELECT sm.*, sec.name as section_name, sub.subject_name, sub.subject_code,
        t.first_name as teacher_first, t.last_name as teacher_last
      FROM study_materials sm
      JOIN sections sec ON sec.id = sm.section_id
      JOIN subjects sub ON sub.id = sm.subject_id
      JOIN teachers t ON t.id = sm.teacher_id
      WHERE sm.institution_id = ? AND sm.is_active = 1
        AND (
          sm.teacher_id = ?
          OR EXISTS (
            SELECT 1 FROM teacher_subject_assignments tsa
            WHERE tsa.teacher_id = ? AND tsa.section_id = sm.section_id AND tsa.subject_id = sm.subject_id AND tsa.is_active = 1
          )
          OR EXISTS (
            SELECT 1 FROM teaching_allocations ta
            WHERE ta.teacher_id = ? AND ta.section_id = sm.section_id AND ta.subject_id = sm.subject_id AND ta.institution_id = ? AND LOWER(ta.status) = 'active'
          )
        )
    `;
    const params: any[] = [institutionId, teacherId, teacherId, teacherId, institutionId];
    if (sectionId) {
      query += ` AND sm.section_id = ?`;
      params.push(sectionId);
    }
    if (subjectId) {
      query += ` AND sm.subject_id = ?`;
      params.push(subjectId);
    }
    query += ` ORDER BY sm.created_at DESC`;
    const res = await this.db.prepare(query).bind(...params).all();
    return (res.results || []) as StudyMaterial[];
  }

  async listForSection(institutionId: string, sectionId: string, subjectId?: string): Promise<StudyMaterial[]> {
    let query = `
      SELECT sm.*, sec.name as section_name, sub.subject_name, sub.subject_code,
        t.first_name as teacher_first, t.last_name as teacher_last
      FROM study_materials sm
      JOIN sections sec ON sec.id = sm.section_id
      JOIN subjects sub ON sub.id = sm.subject_id
      JOIN teachers t ON t.id = sm.teacher_id
      WHERE sm.institution_id = ? AND sm.is_active = 1 AND sm.section_id = ?
    `;
    const params: any[] = [institutionId, sectionId];
    if (subjectId) {
      query += ` AND sm.subject_id = ?`;
      params.push(subjectId);
    }
    query += ` ORDER BY sm.created_at DESC`;
    const res = await this.db.prepare(query).bind(...params).all();
    return (res.results || []) as StudyMaterial[];
  }

  async getById(id: string, institutionId: string): Promise<StudyMaterial | null> {
    const row = await this.db.prepare(
      `SELECT * FROM study_materials WHERE id = ? AND institution_id = ? AND is_active = 1`
    ).bind(id, institutionId).first();
    return row ? (row as StudyMaterial) : null;
  }

  async softDelete(id: string, institutionId: string, userId?: string): Promise<void> {
    await this.db.prepare(
      `UPDATE study_materials SET is_active = 0, updated_at = ?, updated_by = ? WHERE id = ? AND institution_id = ?`
    ).bind(new Date().toISOString(), userId || null, id, institutionId).run();
  }
}
