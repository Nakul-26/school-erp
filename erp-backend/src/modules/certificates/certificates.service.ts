import { CertificatesRepository } from './certificates.repository';
import { renderTemplate } from '../../utils/template-engine';
import { CreateTemplateInput, UpdateTemplateInput, RenderedCertificate } from './certificates.types';

export class CertificatesServiceError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

const DEFAULT_ID_CARD = `<div style="border:2px solid #1e293b;border-radius:12px;padding:24px;max-width:380px;margin:0 auto;font-family:Arial,sans-serif;">
  <div style="text-align:center;border-bottom:2px solid #1e293b;padding-bottom:12px;margin-bottom:12px;">
    <h2 style="margin:0;font-size:18px;">{{institution.name}}</h2>
    <div style="font-size:12px;color:#555;">Student Identity Card</div>
  </div>
  <h3 style="margin:8px 0 2px;">{{student.full_name}}</h3>
  <div style="font-size:13px;color:#555;margin-bottom:8px;">{{student.course_name}} - {{student.section_name}}</div>
  <table style="width:100%;font-size:13px;">
    <tr><td><strong>Admission No.</strong></td><td>{{student.admission_number}}</td></tr>
    <tr><td><strong>Roll No.</strong></td><td>{{student.roll_number}}</td></tr>
    <tr><td><strong>Date of Birth</strong></td><td>{{student.date_of_birth}}</td></tr>
    <tr><td><strong>Blood Group</strong></td><td>{{student.blood_group}}</td></tr>
    <tr><td><strong>Emergency Contact</strong></td><td>{{guardian.phone}}</td></tr>
  </table>
</div>`;

const DEFAULT_BONAFIDE = `<div style="max-width:700px;margin:0 auto;font-family:Georgia,serif;padding:32px;">
  <div style="text-align:center;margin-bottom:24px;">
    <h1 style="margin:0;">{{institution.name}}</h1>
    <div>{{institution.address}}</div>
  </div>
  <h2 style="text-align:center;text-decoration:underline;">BONAFIDE CERTIFICATE</h2>
  <p style="line-height:1.8;">
    This is to certify that <strong>{{student.full_name}}</strong>, son/daughter of <strong>{{guardian.name}}</strong>,
    is a bonafide student of {{institution.name}}. He/She is currently enrolled in
    <strong>{{student.course_name}}</strong>, Section <strong>{{student.section_name}}</strong>,
    registered under Admission Number <strong>{{student.admission_number}}</strong>.
  </p>
  <p style="line-height:1.8;">
    According to the admission register, his/her date of birth is <strong>{{student.date_of_birth}}</strong>.
    His/Her conduct and character during their study has been consistently satisfactory.
  </p>
  <div style="display:flex;justify-content:space-between;margin-top:48px;">
    <div>
      <div>Date: {{certificate.issue_date}}</div>
      <div>Reference: {{certificate.reference_number}}</div>
    </div>
    <div style="text-align:center;">
      <div style="margin-bottom:32px;">&nbsp;</div>
      <strong>Principal Signature</strong>
    </div>
  </div>
</div>`;

const DEFAULT_TC = `<div style="max-width:750px;margin:0 auto;font-family:Georgia,serif;padding:32px;">
  <div style="text-align:center;margin-bottom:16px;">
    <h1 style="margin:0;">{{institution.name}}</h1>
    <div>{{institution.address}}</div>
    <h2>School Leaving / Transfer Certificate</h2>
  </div>
  <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:16px;">
    <div><strong>TC Register No:</strong> {{certificate.reference_number}}</div>
    <div><strong>Admission ID:</strong> {{student.admission_number}}</div>
    <div><strong>Date of Issue:</strong> {{certificate.issue_date}}</div>
  </div>
  <table style="width:100%;font-size:13px;border-collapse:collapse;">
    <tr><td style="padding:4px 0;">1. Name of the Pupil</td><td>: {{student.full_name}}</td></tr>
    <tr><td style="padding:4px 0;">2. Father's / Guardian's Name</td><td>: {{guardian.name}}</td></tr>
    <tr><td style="padding:4px 0;">3. Nationality</td><td>: Indian</td></tr>
    <tr><td style="padding:4px 0;">4. Date of first admission in School</td><td>: {{student.admission_date}}</td></tr>
    <tr><td style="padding:4px 0;">5. Date of Birth (in Christian Era)</td><td>: {{student.date_of_birth}}</td></tr>
    <tr><td style="padding:4px 0;">6. Class in which pupil last studied</td><td>: {{student.course_name}}</td></tr>
    <tr><td style="padding:4px 0;">7. Whether qualified for promotion</td><td>: Yes, promoted to next grade</td></tr>
    <tr><td style="padding:4px 0;">8. Total No. of working days on record</td><td>: {{attendance.total}}</td></tr>
    <tr><td style="padding:4px 0;">9. Total No. of working days present</td><td>: {{attendance.present}}</td></tr>
    <tr><td style="padding:4px 0;">10. Reason for leaving the School</td><td>: _____________________</td></tr>
    <tr><td style="padding:4px 0;">11. General Conduct</td><td>: Good</td></tr>
  </table>
  <div style="display:flex;justify-content:space-between;margin-top:48px;font-size:13px;">
    <div>Class Teacher</div>
    <div>Checked by (Clerk)</div>
    <div>Principal Signature</div>
  </div>
</div>`;

export class CertificatesService {
  constructor(private repo: CertificatesRepository) {}

  // Lazily seeds each institution's editable defaults on first access instead of a data migration -
  // works identically for institutions that already existed and ones created after this feature shipped.
  private async ensureDefaultTemplates(institutionId: string): Promise<void> {
    const count = await this.repo.countTemplates(institutionId);
    if (count > 0) return;
    await this.repo.createTemplate(crypto.randomUUID(), institutionId, { name: 'Student ID Card', type: 'ID_CARD', body_html: DEFAULT_ID_CARD });
    await this.repo.createTemplate(crypto.randomUUID(), institutionId, { name: 'Bonafide Certificate', type: 'BONAFIDE', body_html: DEFAULT_BONAFIDE });
    await this.repo.createTemplate(crypto.randomUUID(), institutionId, { name: 'Transfer Certificate', type: 'TRANSFER_CERTIFICATE', body_html: DEFAULT_TC });
  }

  async listTemplates(institutionId: string, type?: string) {
    await this.ensureDefaultTemplates(institutionId);
    return this.repo.listTemplates(institutionId, type);
  }

  async createTemplate(institutionId: string, input: CreateTemplateInput, userId?: string): Promise<string> {
    if (!input.name || input.name.trim().length < 2) throw new CertificatesServiceError('Template name is required.', 400);
    if (!input.body_html || input.body_html.trim().length === 0) throw new CertificatesServiceError('Template body is required.', 400);
    const id = crypto.randomUUID();
    await this.repo.createTemplate(id, institutionId, input, userId);
    return id;
  }

  async updateTemplate(institutionId: string, id: string, input: UpdateTemplateInput, userId?: string): Promise<void> {
    const existing = await this.repo.getTemplate(id, institutionId);
    if (!existing) throw new CertificatesServiceError('Certificate template not found.', 404);
    await this.repo.updateTemplate(id, institutionId, input, userId);
  }

  async deleteTemplate(institutionId: string, id: string): Promise<void> {
    const existing = await this.repo.getTemplate(id, institutionId);
    if (!existing) throw new CertificatesServiceError('Certificate template not found.', 404);
    await this.repo.deleteTemplate(id, institutionId);
  }

  async listIssuances(studentId: string, institutionId: string) {
    return this.repo.listIssuances(studentId, institutionId);
  }

  private async buildVariables(studentId: string, institutionId: string, referenceNumber: string) {
    const student = await this.repo.getStudentForCertificate(studentId, institutionId);
    if (!student) throw new CertificatesServiceError('Student not found.', 404);
    const [guardian, institution, attendance] = await Promise.all([
      this.repo.getPrimaryGuardian(studentId),
      this.repo.getInstitution(institutionId),
      this.repo.getAttendanceCounts(studentId, institutionId),
    ]);

    const formatDate = (d?: string | null) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '-';

    return {
      student: {
        first_name: student.first_name,
        middle_name: student.middle_name || '',
        last_name: student.last_name || '',
        full_name: `${student.first_name} ${student.last_name || ''}`.trim(),
        admission_number: student.admission_number,
        roll_number: student.roll_number || '-',
        date_of_birth: formatDate(student.date_of_birth),
        admission_date: formatDate(student.admission_date),
        blood_group: student.blood_group || '-',
        course_name: student.course_name || '-',
        section_name: student.section_name || '-',
        address: student.address || '-',
        phone: student.phone || '-',
        email: student.email || '-',
      },
      guardian: {
        name: guardian?.name || 'Parent/Guardian',
        relationship: guardian?.relationship || '-',
        phone: guardian?.phone || '-',
      },
      institution: {
        name: institution?.name || 'Institution',
        address: institution?.address || '-',
        phone: institution?.phone || '-',
        email: institution?.email || '-',
      },
      attendance: {
        total: attendance.total,
        present: attendance.present,
      },
      certificate: {
        reference_number: referenceNumber,
        issue_date: formatDate(new Date().toISOString()),
      },
    };
  }

  async previewCertificate(templateId: string, studentId: string, institutionId: string): Promise<string> {
    const template = await this.repo.getTemplate(templateId, institutionId);
    if (!template) throw new CertificatesServiceError('Certificate template not found.', 404);
    const variables = await this.buildVariables(studentId, institutionId, '(preview — no reference number issued)');
    return renderTemplate(template.body_html, variables);
  }

  async issueCertificate(templateId: string, studentId: string, institutionId: string, userId?: string): Promise<RenderedCertificate> {
    const template = await this.repo.getTemplate(templateId, institutionId);
    if (!template) throw new CertificatesServiceError('Certificate template not found.', 404);

    const referenceNumber = `${template.type.slice(0, 3)}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const variables = await this.buildVariables(studentId, institutionId, referenceNumber);
    const html = renderTemplate(template.body_html, variables);

    const issuanceId = crypto.randomUUID();
    await this.repo.createIssuance(issuanceId, institutionId, {
      template_id: templateId,
      student_id: studentId,
      reference_number: referenceNumber,
      rendered_html: html,
      issued_by: userId,
    });

    return { issuance_id: issuanceId, reference_number: referenceNumber, html };
  }
}
