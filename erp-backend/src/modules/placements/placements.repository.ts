import { Company, CreateCompanyInput, CreateDriveInput, PlacementApplication, PlacementDrive, UpdateApplicationInput, UpdateCompanyInput, UpdateDriveInput } from './placements.types';

export class PlacementsRepository {
  constructor(private db: D1Database) {}

  // ---- Companies ----
  async listCompanies(institutionId: string): Promise<Company[]> {
    const { results } = await this.db.prepare(
      `SELECT * FROM companies WHERE institution_id = ? AND is_active = 1 ORDER BY name ASC`
    ).bind(institutionId).all<Company>();
    return results || [];
  }

  async getCompany(id: string, institutionId: string): Promise<Company | null> {
    return await this.db.prepare(
      `SELECT * FROM companies WHERE id = ? AND institution_id = ? AND is_active = 1`
    ).bind(id, institutionId).first<Company>();
  }

  async createCompany(id: string, institutionId: string, input: CreateCompanyInput, userId?: string): Promise<void> {
    await this.db.prepare(`
      INSERT INTO companies (id, institution_id, name, industry, website, contact_person, contact_email, contact_phone, description, created_by, updated_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, institutionId, input.name, input.industry || null, input.website || null,
      input.contact_person || null, input.contact_email || null, input.contact_phone || null,
      input.description || null, userId || null, userId || null
    ).run();
  }

  async updateCompany(id: string, input: UpdateCompanyInput, userId?: string): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];
    for (const key of ['name', 'industry', 'website', 'contact_person', 'contact_email', 'contact_phone', 'description', 'is_active'] as const) {
      if (input[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(input[key]);
      }
    }
    if (fields.length === 0) return;
    fields.push(`updated_at = datetime('now')`, `updated_by = ?`);
    values.push(userId || null, id);
    await this.db.prepare(`UPDATE companies SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();
  }

  async softDeleteCompany(id: string, userId?: string): Promise<void> {
    await this.db.prepare(
      `UPDATE companies SET is_active = 0, deleted_at = datetime('now'), updated_by = ? WHERE id = ?`
    ).bind(userId || null, id).run();
  }

  // ---- Drives ----
  async listDrives(institutionId: string, courseId?: string): Promise<PlacementDrive[]> {
    const params: any[] = [institutionId];
    let filter = '';
    if (courseId) {
      filter = 'AND pd.course_id = ?';
      params.push(courseId);
    }
    const { results } = await this.db.prepare(`
      SELECT pd.*, c.name as company_name, co.name as course_name,
        (SELECT COUNT(*) FROM placement_applications pa WHERE pa.drive_id = pd.id AND pa.status != 'WITHDRAWN') as applicant_count
      FROM placement_drives pd
      JOIN companies c ON c.id = pd.company_id
      JOIN courses co ON co.id = pd.course_id
      WHERE pd.institution_id = ? AND pd.is_active = 1 ${filter}
      ORDER BY pd.created_at DESC
    `).bind(...params).all<any>();
    return results || [];
  }

  async getDrive(id: string): Promise<(PlacementDrive & { institution_id: string }) | null> {
    return await this.db.prepare(`
      SELECT pd.*, c.name as company_name, co.name as course_name
      FROM placement_drives pd
      JOIN companies c ON c.id = pd.company_id
      JOIN courses co ON co.id = pd.course_id
      WHERE pd.id = ? AND pd.is_active = 1
    `).bind(id).first<any>();
  }

  async createDrive(id: string, institutionId: string, input: CreateDriveInput, userId?: string): Promise<void> {
    await this.db.prepare(`
      INSERT INTO placement_drives (id, institution_id, company_id, course_id, title, drive_type, description, package_amount, drive_date, application_deadline, min_cgpa, max_backlogs, created_by, updated_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, institutionId, input.company_id, input.course_id, input.title, input.drive_type,
      input.description || null, input.package_amount ?? null, input.drive_date || null,
      input.application_deadline || null, input.min_cgpa ?? null, input.max_backlogs ?? null,
      userId || null, userId || null
    ).run();
  }

  async updateDrive(id: string, input: UpdateDriveInput, userId?: string): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];
    for (const key of ['title', 'description', 'package_amount', 'drive_date', 'application_deadline', 'min_cgpa', 'max_backlogs', 'status'] as const) {
      if (input[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(input[key]);
      }
    }
    if (fields.length === 0) return;
    fields.push(`updated_at = datetime('now')`, `updated_by = ?`);
    values.push(userId || null, id);
    await this.db.prepare(`UPDATE placement_drives SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();
  }

  async softDeleteDrive(id: string, userId?: string): Promise<void> {
    await this.db.prepare(
      `UPDATE placement_drives SET is_active = 0, deleted_at = datetime('now'), updated_by = ? WHERE id = ?`
    ).bind(userId || null, id).run();
  }

  // ---- Applications ----
  async isEnrolledInCourse(studentId: string, courseId: string): Promise<boolean> {
    const row = await this.db.prepare(
      `SELECT 1 FROM student_enrollments WHERE student_id = ? AND course_id = ? AND is_active = 1`
    ).bind(studentId, courseId).first();
    return !!row;
  }

  async findApplication(driveId: string, studentId: string): Promise<{ id: string; status: string } | null> {
    return await this.db.prepare(
      `SELECT id, status FROM placement_applications WHERE drive_id = ? AND student_id = ?`
    ).bind(driveId, studentId).first<any>();
  }

  async findApplicationById(id: string): Promise<{ id: string; institution_id: string; student_id: string; drive_id: string } | null> {
    return await this.db.prepare(
      `SELECT id, institution_id, student_id, drive_id FROM placement_applications WHERE id = ?`
    ).bind(id).first<any>();
  }

  async createApplication(id: string, institutionId: string, driveId: string, studentId: string, userId?: string): Promise<void> {
    await this.db.prepare(`
      INSERT INTO placement_applications (id, institution_id, drive_id, student_id, status, created_by, updated_by)
      VALUES (?, ?, ?, ?, 'APPLIED', ?, ?)
    `).bind(id, institutionId, driveId, studentId, userId || null, userId || null).run();
  }

  async reactivateApplication(id: string, userId?: string): Promise<void> {
    await this.db.prepare(`
      UPDATE placement_applications SET status = 'APPLIED', applied_at = datetime('now'), updated_at = datetime('now'), updated_by = ? WHERE id = ?
    `).bind(userId || null, id).run();
  }

  async withdrawApplication(id: string, userId?: string): Promise<void> {
    await this.db.prepare(
      `UPDATE placement_applications SET status = 'WITHDRAWN', updated_at = datetime('now'), updated_by = ? WHERE id = ?`
    ).bind(userId || null, id).run();
  }

  async updateApplicationStatus(id: string, input: UpdateApplicationInput, userId?: string): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];
    for (const key of ['status', 'offer_package', 'offer_date', 'remarks'] as const) {
      if (input[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(input[key]);
      }
    }
    if (fields.length === 0) return;
    fields.push(`updated_at = datetime('now')`, `updated_by = ?`);
    values.push(userId || null, id);
    await this.db.prepare(`UPDATE placement_applications SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();
  }

  async listApplicationsForDrive(driveId: string): Promise<PlacementApplication[]> {
    const { results } = await this.db.prepare(`
      SELECT pa.id, pa.drive_id, pa.student_id, s.first_name, s.last_name, s.roll_number, s.admission_number,
             pa.status, pa.applied_at, pa.offer_package, pa.offer_date, pa.remarks
      FROM placement_applications pa
      JOIN students s ON s.id = pa.student_id
      WHERE pa.drive_id = ? AND pa.status != 'WITHDRAWN'
      ORDER BY pa.applied_at ASC
    `).bind(driveId).all<any>();
    return (results || []).map((r: any) => ({
      id: r.id,
      drive_id: r.drive_id,
      student_id: r.student_id,
      student_name: `${r.first_name} ${r.last_name || ''}`.trim(),
      roll_number: r.roll_number,
      admission_number: r.admission_number,
      status: r.status,
      applied_at: r.applied_at,
      offer_package: r.offer_package,
      offer_date: r.offer_date,
      remarks: r.remarks,
    }));
  }

  async listApplicationsForStudent(institutionId: string, studentId: string): Promise<any[]> {
    const { results } = await this.db.prepare(`
      SELECT pa.id, pa.drive_id, pd.title, pd.drive_type, pd.package_amount, pd.status as drive_status,
             c.name as company_name, pa.status, pa.applied_at, pa.offer_package, pa.offer_date, pa.remarks
      FROM placement_applications pa
      JOIN placement_drives pd ON pd.id = pa.drive_id
      JOIN companies c ON c.id = pd.company_id
      WHERE pa.institution_id = ? AND pa.student_id = ?
      ORDER BY pa.applied_at DESC
    `).bind(institutionId, studentId).all<any>();
    return results || [];
  }
}
