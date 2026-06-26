import { AnnouncementRepository } from './announcements.repository';
import { Announcement, CreateAnnouncementInput, UpdateAnnouncementInput } from './announcements.types';

export class AnnouncementService {
  constructor(private repo: AnnouncementRepository) {}

  async createAnnouncement(institutionId: string, input: CreateAnnouncementInput, userId?: string): Promise<string> {
    const id = crypto.randomUUID();
    await this.repo.create(id, institutionId, input, userId);
    return id;
  }

  async getAnnouncement(id: string): Promise<Announcement | null> {
    return await this.repo.findById(id);
  }

  async listAnnouncements(institutionId: string, roles: string[], sectionId?: string): Promise<Announcement[]> {
    const isAdminOrStaff = roles.some(r => 
      ['super_admin', 'Super Admin', 'admin', 'Admin', 'Principal', 'Principal', 'HOD', 'hod'].includes(r)
    );

    if (isAdminOrStaff) {
      return await this.repo.listAll(institutionId, sectionId);
    }

    // Otherwise, check roles and accumulate
    const announcementsMap = new Map<string, Announcement>();

    if (roles.some(r => ['student', 'Student'].includes(r))) {
      const list = await this.repo.listForAudience(institutionId, 'visible_to_students', sectionId);
      list.forEach(a => announcementsMap.set(a.id, a));
    }
    if (roles.some(r => ['teacher', 'Teacher'].includes(r))) {
      const list = await this.repo.listForAudience(institutionId, 'visible_to_teachers', sectionId);
      list.forEach(a => announcementsMap.set(a.id, a));
    }
    if (roles.some(r => ['parent', 'Parent', 'guardian', 'Guardian'].includes(r))) {
      const list = await this.repo.listForAudience(institutionId, 'visible_to_parents', sectionId);
      list.forEach(a => announcementsMap.set(a.id, a));
    }

    // Default: if no roles matched (or just standard view), show none or return empty
    return Array.from(announcementsMap.values()).sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  async updateAnnouncement(id: string, input: UpdateAnnouncementInput, userId?: string): Promise<void> {
    await this.repo.update(id, input, userId);
  }

  async deleteAnnouncement(id: string, userId?: string): Promise<void> {
    await this.repo.softDelete(id, userId);
  }
}
