import { CertificateTemplate, CreateTemplateInput, UpdateTemplateInput, CertificateIssuance } from './certificates.types';

export class CertificatesRepository {
  constructor(private db: any) {}

  async countTemplates(institutionId: string): Promise<number> {
    const row: any = await this.db.prepare(
      `SELECT COUNT(*) as cnt FROM certificate_templates WHERE institution_id = ? AND is_active = 1`
    ).bind(institutionId).first();
    return row?.cnt || 0;
  }

  async listTemplates(institutionId: string, type?: string): Promise<CertificateTemplate[]> {
    let query = `SELECT * FROM certificate_templates WHERE institution_id = ? AND is_active = 1`;
    const params: any[] = [institutionId];
    if (type) {
      query += ` AND type = ?`;
      params.push(type);
    }
    query += ` ORDER BY name ASC`;
    const res = await this.db.prepare(query).bind(...params).all();
    return (res.results || []) as CertificateTemplate[];
  }

  async getTemplate(id: string, institutionId: string): Promise<CertificateTemplate | null> {
    const row = await this.db.prepare(
      `SELECT * FROM certificate_templates WHERE id = ? AND institution_id = ? AND is_active = 1`
    ).bind(id, institutionId).first();
    return row ? (row as CertificateTemplate) : null;
  }

  async createTemplate(id: string, institutionId: string, input: CreateTemplateInput, userId?: string): Promise<void> {
    const now = new Date().toISOString();
    await this.db.prepare(
      `INSERT INTO certificate_templates (id, institution_id, name, type, body_html, created_at, updated_at, created_by, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(id, institutionId, input.name, input.type || 'CUSTOM', input.body_html, now, now, userId || null, userId || null).run();
  }

  async updateTemplate(id: string, institutionId: string, input: UpdateTemplateInput, userId?: string): Promise<void> {
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
      `UPDATE certificate_templates SET ${fields.join(', ')} WHERE id = ? AND institution_id = ?`
    ).bind(...values).run();
  }

  async deleteTemplate(id: string, institutionId: string): Promise<void> {
    await this.db.prepare(
      `UPDATE certificate_templates SET is_active = 0, updated_at = ? WHERE id = ? AND institution_id = ?`
    ).bind(new Date().toISOString(), id, institutionId).run();
  }

  async getStudentForCertificate(studentId: string, institutionId: string): Promise<any> {
    return await this.db.prepare(`
      SELECT s.*, c.name as course_name, sec.name as section_name
      FROM students s
      LEFT JOIN student_enrollments se ON se.student_id = s.id AND se.is_active = 1
      LEFT JOIN courses c ON c.id = se.course_id
      LEFT JOIN sections sec ON sec.id = se.section_id
      WHERE s.id = ? AND s.institution_id = ? AND s.is_active = 1
    `).bind(studentId, institutionId).first();
  }

  async getPrimaryGuardian(studentId: string): Promise<any> {
    return await this.db.prepare(
      `SELECT name, relationship, phone, email FROM guardians WHERE student_id = ? AND is_active = 1 ORDER BY created_at ASC LIMIT 1`
    ).bind(studentId).first();
  }

  async getInstitution(institutionId: string): Promise<any> {
    return await this.db.prepare(`SELECT * FROM institutions WHERE id = ?`).bind(institutionId).first();
  }

  async getAttendanceCounts(studentId: string, institutionId: string): Promise<{ total: number; present: number }> {
    const row: any = await this.db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status IN ('present', 'late', 'on_duty') THEN 1 ELSE 0 END) as present
      FROM student_attendance
      WHERE student_id = ? AND institution_id = ? AND is_active = 1
    `).bind(studentId, institutionId).first();
    return { total: row?.total || 0, present: row?.present || 0 };
  }

  async createIssuance(id: string, institutionId: string, data: {
    template_id: string; student_id: string; reference_number: string; rendered_html: string; issued_by?: string;
  }): Promise<void> {
    await this.db.prepare(`
      INSERT INTO certificate_issuances (id, institution_id, template_id, student_id, reference_number, rendered_html, issued_by, issued_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(id, institutionId, data.template_id, data.student_id, data.reference_number, data.rendered_html, data.issued_by || null, new Date().toISOString()).run();
  }

  async listIssuances(studentId: string, institutionId: string): Promise<CertificateIssuance[]> {
    const res = await this.db.prepare(`
      SELECT ci.*, ct.name as template_name
      FROM certificate_issuances ci
      JOIN certificate_templates ct ON ct.id = ci.template_id
      WHERE ci.student_id = ? AND ci.institution_id = ? AND ci.is_active = 1
      ORDER BY ci.issued_at DESC
    `).bind(studentId, institutionId).all();
    return (res.results || []) as CertificateIssuance[];
  }
}
