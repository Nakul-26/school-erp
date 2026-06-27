import {
  AdmissionInquiry, CreateInquiryInput, UpdateInquiryInput,
  AdmissionApplication, CreateApplicationInput
} from './admissions.types';

export class AdmissionsRepository {
  constructor(private db: D1Database) {}

  // --- INQUIRIES ---

  async createInquiry(id: string, institutionId: string, input: CreateInquiryInput, userId?: string): Promise<void> {
    await this.db.prepare(`
      INSERT INTO admission_inquiries (
        id, institution_id, student_name, parent_name, parent_phone, parent_email,
        date_of_birth, applying_for_class, academic_year_id, source, notes, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, institutionId, input.student_name, input.parent_name, input.parent_phone,
      input.parent_email || null, input.date_of_birth || null, input.applying_for_class,
      input.academic_year_id || null, input.source || 'Walk-in', input.notes || null,
      userId || null
    ).run();
  }

  async listInquiries(institutionId: string, status?: string): Promise<any[]> {
    let query = `
      SELECT ai.*, ay.name AS academic_year_name
      FROM admission_inquiries ai
      LEFT JOIN academic_years ay ON ai.academic_year_id = ay.id
      WHERE ai.institution_id = ? AND ai.is_active = 1
    `;
    const params: any[] = [institutionId];

    if (status) {
      query += ` AND ai.status = ?`;
      params.push(status);
    }

    query += ` ORDER BY ai.created_at DESC`;

    const { results } = await this.db.prepare(query).bind(...params).all<any>();
    return results || [];
  }

  async getInquiryById(id: string): Promise<any | null> {
    return await this.db.prepare(`
      SELECT ai.*, ay.name AS academic_year_name
      FROM admission_inquiries ai
      LEFT JOIN academic_years ay ON ai.academic_year_id = ay.id
      WHERE ai.id = ? AND ai.is_active = 1
    `).bind(id).first<any>();
  }

  async updateInquiry(id: string, input: UpdateInquiryInput, userId?: string): Promise<void> {
    const fields: string[] = [];
    const params: any[] = [];

    if (input.student_name !== undefined) { fields.push('student_name = ?'); params.push(input.student_name); }
    if (input.parent_name !== undefined) { fields.push('parent_name = ?'); params.push(input.parent_name); }
    if (input.parent_phone !== undefined) { fields.push('parent_phone = ?'); params.push(input.parent_phone); }
    if (input.parent_email !== undefined) { fields.push('parent_email = ?'); params.push(input.parent_email); }
    if (input.date_of_birth !== undefined) { fields.push('date_of_birth = ?'); params.push(input.date_of_birth); }
    if (input.applying_for_class !== undefined) { fields.push('applying_for_class = ?'); params.push(input.applying_for_class); }
    if (input.academic_year_id !== undefined) { fields.push('academic_year_id = ?'); params.push(input.academic_year_id); }
    if (input.source !== undefined) { fields.push('source = ?'); params.push(input.source); }
    if (input.notes !== undefined) { fields.push('notes = ?'); params.push(input.notes); }
    if (input.status !== undefined) { fields.push('status = ?'); params.push(input.status); }

    if (fields.length === 0) return;

    fields.push(`updated_at = datetime('now')`);
    params.push(id);

    await this.db.prepare(`
      UPDATE admission_inquiries SET ${fields.join(', ')} WHERE id = ?
    `).bind(...params).run();
  }

  async updateInquiryStatus(id: string, status: string, userId?: string): Promise<void> {
    await this.db.prepare(`
      UPDATE admission_inquiries
      SET status = ?, updated_at = datetime('now')
      WHERE id = ?
    `).bind(status, id).run();
  }

  // --- APPLICATIONS ---

  async countApplicationsForYear(institutionId: string, yearStr: string): Promise<number> {
    const result = await this.db.prepare(`
      SELECT COUNT(*) as count FROM admission_applications
      WHERE institution_id = ? AND application_number LIKE ?
    `).bind(institutionId, `APP-${yearStr}-%`).first<{ count: number }>();
    return result?.count || 0;
  }

  async createApplication(id: string, institutionId: string, applicationNumber: string, input: CreateApplicationInput, userId?: string): Promise<void> {
    await this.db.prepare(`
      INSERT INTO admission_applications (
        id, institution_id, inquiry_id, application_number,
        student_first_name, student_last_name, date_of_birth, gender,
        applying_for_course_id, academic_year_id,
        parent_name, parent_phone, parent_email,
        previous_school, previous_class, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, institutionId, input.inquiry_id || null, applicationNumber,
      input.student_first_name, input.student_last_name,
      input.date_of_birth || null, input.gender || null,
      input.applying_for_course_id || null, input.academic_year_id,
      input.parent_name, input.parent_phone, input.parent_email || null,
      input.previous_school || null, input.previous_class || null,
      userId || null
    ).run();
  }

  async listApplications(institutionId: string, status?: string): Promise<any[]> {
    let query = `
      SELECT aa.*, c.name AS course_name, ay.name AS academic_year_name
      FROM admission_applications aa
      LEFT JOIN courses c ON aa.applying_for_course_id = c.id
      JOIN academic_years ay ON aa.academic_year_id = ay.id
      WHERE aa.institution_id = ? AND aa.is_active = 1
    `;
    const params: any[] = [institutionId];

    if (status) {
      query += ` AND aa.status = ?`;
      params.push(status);
    }

    query += ` ORDER BY aa.created_at DESC`;

    const { results } = await this.db.prepare(query).bind(...params).all<any>();
    return results || [];
  }

  async getApplicationById(id: string): Promise<any | null> {
    return await this.db.prepare(`
      SELECT aa.*, c.name AS course_name, ay.name AS academic_year_name,
             u.name AS approved_by_name
      FROM admission_applications aa
      LEFT JOIN courses c ON aa.applying_for_course_id = c.id
      JOIN academic_years ay ON aa.academic_year_id = ay.id
      LEFT JOIN users u ON aa.approved_by = u.id
      WHERE aa.id = ? AND aa.is_active = 1
    `).bind(id).first<any>();
  }

  async approveApplication(id: string, approverId: string): Promise<void> {
    await this.db.prepare(`
      UPDATE admission_applications
      SET status = 'Approved', approved_by = ?, approved_at = datetime('now'), updated_at = datetime('now')
      WHERE id = ?
    `).bind(approverId, id).run();
  }

  async setConvertedStudentId(applicationId: string, studentId: string): Promise<void> {
    await this.db.prepare(`
      UPDATE admission_applications
      SET converted_student_id = ?, updated_at = datetime('now')
      WHERE id = ?
    `).bind(studentId, applicationId).run();
  }

  async rejectApplication(id: string, reason: string, approverId: string): Promise<void> {
    await this.db.prepare(`
      UPDATE admission_applications
      SET status = 'Rejected', rejection_reason = ?, approved_by = ?, updated_at = datetime('now')
      WHERE id = ?
    `).bind(reason, approverId, id).run();
  }
}
