import { MessageTemplatesRepository } from './message-templates.repository';
import { MessageTemplate, CreateMessageTemplateInput, UpdateMessageTemplateInput } from './message-templates.types';

export class MessageTemplatesService {
  constructor(private repo: MessageTemplatesRepository) {}

  async createTemplate(institutionId: string, input: CreateMessageTemplateInput): Promise<string> {
    const id = crypto.randomUUID();
    await this.repo.create(id, institutionId, input);
    return id;
  }

  async getTemplate(id: string): Promise<MessageTemplate | null> {
    return await this.repo.findById(id);
  }

  async updateTemplate(id: string, input: UpdateMessageTemplateInput): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new Error('Template not found');
    }
    await this.repo.update(id, input);
  }

  async listTemplates(institutionId: string): Promise<MessageTemplate[]> {
    return await this.repo.listAll(institutionId);
  }

  async deleteTemplate(id: string): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new Error('Template not found');
    }
    await this.repo.softDelete(id);
  }

  async seedDefaultTemplates(institutionId: string, createdBy?: string): Promise<void> {
    const defaults: CreateMessageTemplateInput[] = [
      {
        name: 'Absent Student Notice',
        category: 'attendance',
        subject: 'Student Absence Notification',
        body: 'Dear {{parentName}},\n\nThis is to inform you that {{studentName}} (Class {{className}}) was absent today, {{date}}.\n\nRegards,\n{{schoolName}}',
        is_active: 1,
        created_by: createdBy || null
      },
      {
        name: 'Fee Reminder',
        category: 'fees',
        subject: 'Fee Payment Reminder — Action Required',
        body: 'Dear {{parentName}},\n\nThis is a friendly reminder that the outstanding fee of Rs. {{dueAmount}} for {{studentName}} is due on {{dueDate}}.\n\nPlease ignore if already paid.\n\nRegards,\n{{schoolName}}',
        is_active: 1,
        created_by: createdBy || null
      },
      {
        name: 'Exam Result Published',
        category: 'exams',
        subject: 'Examination Results Published',
        body: 'Dear {{parentName}},\n\nResults for {{examName}} have been published. You can now view {{studentName}}\'s report card in the ERP student portal.\n\nRegards,\n{{schoolName}}',
        is_active: 1,
        created_by: createdBy || null
      },
      {
        name: 'Holiday Notice',
        category: 'events',
        subject: 'Holiday Notification',
        body: 'Dear Parents & Students,\n\nPlease note that the institution will remain closed on {{date}} on account of {{holidayName}}.\n\nClasses will resume as normal on the following working day.\n\nRegards,\n{{schoolName}}',
        is_active: 1,
        created_by: createdBy || null
      },
      {
        name: 'PTM Reminder',
        category: 'events',
        subject: 'Parent-Teacher Meeting Reminder',
        body: 'Dear {{parentName}},\n\nYou are cordially invited to the Parent-Teacher Meeting scheduled on {{ptmDate}} for {{studentName}} (Class {{className}}).\n\nYour presence is highly valued to discuss your ward\'s academic progress.\n\nRegards,\n{{schoolName}}',
        is_active: 1,
        created_by: createdBy || null
      },
      {
        name: 'Admission Follow-up',
        category: 'general',
        subject: 'Admission Application Update',
        body: 'Dear {{parentName}},\n\nThank you for applying to our school. We have updated your ward {{applicantName}}\'s application status. Please log in to the admissions portal to check the updates.\n\nRegards,\n{{schoolName}}',
        is_active: 1,
        created_by: createdBy || null
      }
    ];

    for (const t of defaults) {
      await this.createTemplate(institutionId, t);
    }
  }
}
