import { AdmissionsRepository } from './admissions.repository';
import { CreateInquiryInput, UpdateInquiryInput, CreateApplicationInput } from './admissions.types';

const VALID_INQUIRY_STATUSES = ['New', 'Contacted', 'Applied', 'Admitted', 'Rejected'] as const;

export class AdmissionsService {
  constructor(private repo: AdmissionsRepository) {}

  // --- INQUIRIES ---

  async createInquiry(institutionId: string, input: CreateInquiryInput, userId?: string): Promise<string> {
    const id = crypto.randomUUID();
    await this.repo.createInquiry(id, institutionId, input, userId);
    return id;
  }

  async listInquiries(institutionId: string, status?: string): Promise<any[]> {
    return await this.repo.listInquiries(institutionId, status);
  }

  async updateInquiry(id: string, input: UpdateInquiryInput, userId?: string): Promise<void> {
    await this.repo.updateInquiry(id, input, userId);
  }

  async updateInquiryStatus(id: string, status: string, userId?: string): Promise<void> {
    if (!VALID_INQUIRY_STATUSES.includes(status as any)) {
      throw new Error(`Invalid status. Must be one of: ${VALID_INQUIRY_STATUSES.join(', ')}`);
    }
    await this.repo.updateInquiryStatus(id, status, userId);
  }

  // --- APPLICATIONS ---

  async generateApplicationNumber(institutionId: string): Promise<string> {
    const year = new Date().getFullYear().toString();
    const count = await this.repo.countApplicationsForYear(institutionId, year);
    const sequence = (count + 1).toString().padStart(5, '0');
    return `APP-${year}-${sequence}`;
  }

  async createApplication(institutionId: string, input: CreateApplicationInput, userId?: string): Promise<string> {
    const id = crypto.randomUUID();
    const applicationNumber = await this.generateApplicationNumber(institutionId);
    await this.repo.createApplication(id, institutionId, applicationNumber, input, userId);
    return id;
  }

  async convertInquiryToApplication(
    inquiryId: string,
    institutionId: string,
    appInput: Partial<CreateApplicationInput>,
    userId?: string
  ): Promise<string> {
    const inquiry = await this.repo.getInquiryById(inquiryId);
    if (!inquiry || inquiry.institution_id !== institutionId) {
      throw new Error('Inquiry not found');
    }

    // Build application input from inquiry data + supplied extra fields
    const nameParts = inquiry.student_name.trim().split(' ');
    const firstName = nameParts[0] || inquiry.student_name;
    const lastName = nameParts.slice(1).join(' ') || '';

    const input: CreateApplicationInput = {
      inquiry_id: inquiryId,
      student_first_name: appInput.student_first_name || firstName,
      student_last_name: appInput.student_last_name || lastName,
      date_of_birth: appInput.date_of_birth || inquiry.date_of_birth || undefined,
      gender: appInput.gender || undefined,
      applying_for_course_id: appInput.applying_for_course_id || undefined,
      academic_year_id: appInput.academic_year_id || inquiry.academic_year_id,
      parent_name: appInput.parent_name || inquiry.parent_name,
      parent_phone: appInput.parent_phone || inquiry.parent_phone,
      parent_email: appInput.parent_email || inquiry.parent_email || undefined,
      previous_school: appInput.previous_school || undefined,
      previous_class: appInput.previous_class || inquiry.applying_for_class || undefined,
    };

    const applicationId = await this.createApplication(institutionId, input, userId);

    // Update inquiry status to Applied
    await this.repo.updateInquiryStatus(inquiryId, 'Applied', userId);

    return applicationId;
  }

  async listApplications(institutionId: string, status?: string): Promise<any[]> {
    return await this.repo.listApplications(institutionId, status);
  }

  async getApplicationDetail(id: string): Promise<any | null> {
    return await this.repo.getApplicationById(id);
  }

  async approveApplication(
    id: string,
    institutionId: string,
    approverId: string,
    db: D1Database
  ): Promise<{ studentId: string; admissionNumber: string }> {
    const app = await this.repo.getApplicationById(id);
    if (!app || app.institution_id !== institutionId) {
      throw new Error('Application not found');
    }
    if (app.status === 'Approved') {
      throw new Error('Application is already approved');
    }

    // Create student record
    const studentId = crypto.randomUUID();
    const admissionNumber = app.application_number;

    await db.prepare(`
      INSERT INTO students (
        id, institution_id, admission_number, first_name, last_name,
        date_of_birth, gender, email, phone,
        admission_date, status, created_by, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, date('now'), 'Active', ?, ?)
    `).bind(
      studentId, institutionId, admissionNumber,
      app.student_first_name, app.student_last_name,
      app.date_of_birth || null, app.gender || null,
      app.parent_email || null, app.parent_phone || null,
      approverId, approverId
    ).run();

    // Update application
    await this.repo.approveApplication(id, approverId);
    await this.repo.setConvertedStudentId(id, studentId);

    return { studentId, admissionNumber };
  }

  async rejectApplication(id: string, reason: string, approverId: string): Promise<void> {
    await this.repo.rejectApplication(id, reason, approverId);
  }
}
