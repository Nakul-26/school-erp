import { Env } from '../../types';
import { NotificationService } from './notification.service';
import { BroadcastsRepository } from './broadcasts.repository';
import { Broadcast, CreateBroadcastInput, UpdateBroadcastInput, RecipientFilter } from './broadcasts.types';

export class BroadcastsService {
  constructor(private repo: BroadcastsRepository) {}

  async createBroadcast(institutionId: string, createdBy: string, input: CreateBroadcastInput, env: Env): Promise<string> {
    const id = crypto.randomUUID();
    
    // Create the broadcast database record
    await this.repo.create(id, institutionId, createdBy, input);

    // Save attachments if provided
    if (input.attachments && input.attachments.length > 0) {
      await this.repo.createAttachments(id, input.attachments);
    }

    // If status is 'sent', trigger fanout immediately
    if (input.status === 'sent') {
      await this.sendBroadcast(id, institutionId, env);
    }

    return id;
  }

  async updateBroadcast(id: string, input: UpdateBroadcastInput, institutionId: string, env: Env): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new Error('Broadcast not found');
    }
    if (existing.status === 'sent') {
      throw new Error('Cannot update an already sent broadcast');
    }

    // Update attachments if provided
    if (input.attachments !== undefined) {
      await this.repo.deleteAttachments(id);
      if (input.attachments.length > 0) {
        await this.repo.createAttachments(id, input.attachments);
      }
    }

    // Update broadcast record
    await this.repo.update(id, input);

    // If updating status to 'sent', trigger fanout
    if (input.status === 'sent') {
      await this.sendBroadcast(id, institutionId, env);
    }
  }

  async getBroadcast(id: string): Promise<any | null> {
    const broadcast = await this.repo.findById(id);
    if (!broadcast) return null;

    const attachments = await this.repo.getAttachments(id);
    return {
      ...broadcast,
      attachments
    };
  }

  async listBroadcasts(institutionId: string, status?: string, category?: string, createdBy?: string): Promise<Broadcast[]> {
    return await this.repo.listAll(institutionId, { status, category, createdBy });
  }

  async listReceivedBroadcasts(userId: string, institutionId: string, category?: string): Promise<any[]> {
    const list = await this.repo.listReceivedBroadcasts(userId, institutionId, category);
    
    // Populate attachments for each received broadcast
    const populated = await Promise.all(list.map(async b => {
      const attachments = await this.repo.getAttachments(b.id);
      return {
        ...b,
        attachments
      };
    }));

    return populated;
  }

  async markAsRead(broadcastId: string, userId: string): Promise<void> {
    await this.repo.markAsRead(broadcastId, userId);
  }

  async getRecipientAnalytics(broadcastId: string): Promise<any> {
    const broadcast = await this.repo.findById(broadcastId);
    if (!broadcast) {
      throw new Error('Broadcast not found');
    }

    const recipients = await this.repo.getRecipientAnalytics(broadcastId);
    
    const total = broadcast.total_recipients;
    const read = recipients.filter(r => r.is_read === 1).length;
    const unread = total - read;
    const readPercentage = total > 0 ? Math.round((read / total) * 100) : 0;

    return {
      broadcast: {
        id: broadcast.id,
        subject: broadcast.subject,
        sent_at: broadcast.sent_at,
        category: broadcast.category,
        priority: broadcast.priority
      },
      stats: {
        total,
        delivered: total, // For now delivered is total resolved
        read,
        unread,
        readPercentage
      },
      recipients: recipients.map(r => ({
        id: r.id,
        user_id: r.user_id,
        name: r.name,
        email: r.email,
        roles: r.roles ? r.roles.split(',') : [],
        is_read: r.is_read,
        read_at: r.read_at,
        delivered_at: r.delivered_at
      }))
    };
  }

  async deleteBroadcast(id: string): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new Error('Broadcast not found');
    }
    // Soft delete
    await this.repo.update(id, { is_active: 0 });
  }

  // Resolves targeted user IDs and performs the database inserts for recipient mapping
  private async sendBroadcast(broadcastId: string, institutionId: string, env: Env): Promise<void> {
    const broadcast = await this.repo.findById(broadcastId);
    if (!broadcast) {
      throw new Error('Broadcast not found');
    }

    let filter: RecipientFilter;
    try {
      filter = JSON.parse(broadcast.recipient_filter);
    } catch (e) {
      throw new Error('Invalid recipient filter JSON format');
    }

    const recipientUserIds = await this.resolveRecipientUserIds(filter, institutionId);

    // Prepare recipient records
    const recipientRecords = recipientUserIds.map(userId => ({
      id: crypto.randomUUID(),
      broadcast_id: broadcastId,
      user_id: userId
    }));

    // Save recipients in database
    await this.repo.addRecipients(recipientRecords);

    // Update broadcast status, sent time, and total recipient count
    await this.repo.update(broadcastId, {
      status: 'sent',
      sent_at: new Date().toISOString(),
      total_recipients: recipientUserIds.length,
      delivered_count: recipientUserIds.length
    });

    // Invoke Pluggable Multi-Channel NotificationService
    try {
      const channels = (broadcast.channel || 'erp').split(',');
      const contacts = await this.repo.getContactsByIds(recipientUserIds);
      const attachments = await this.repo.getAttachments(broadcastId);

      const notificationService = new NotificationService();
      await notificationService.deliver(
        env,
        channels,
        contacts,
        {
          subject: broadcast.subject,
          body: broadcast.body,
          attachments: attachments.map(a => ({ file_name: a.file_name, file_url: a.file_url }))
        }
      );
    } catch (err) {
      console.error('[BroadcastsService] Notification delivery error:', err);
    }
  }

  // High-level resolution of recipient user IDs based on RecipientFilter configuration
  private async resolveRecipientUserIds(filter: RecipientFilter, institutionId: string): Promise<string[]> {
    const userIdsSet = new Set<string>();

    const includeStudents = filter.includeStudents !== false; // Default true
    const includeParents = filter.includeParents !== false; // Default true
    const includeTeachers = filter.includeTeachers === true; // Default false

    switch (filter.type) {
      case 'class':
        if (filter.classIds && filter.classIds.length > 0) {
          if (includeStudents) {
            const studentIds = await this.repo.resolveStudentsByClasses(filter.classIds, institutionId);
            studentIds.forEach(id => userIdsSet.add(id));
          }
          if (includeParents) {
            const parentIds = await this.repo.resolveParentsByClasses(filter.classIds, institutionId);
            parentIds.forEach(id => userIdsSet.add(id));
          }
          if (includeTeachers) {
            const teacherIds = await this.repo.resolveTeachersByClasses(filter.classIds, institutionId);
            teacherIds.forEach(id => userIdsSet.add(id));
          }
        }
        break;

      case 'section':
        if (filter.sectionIds && filter.sectionIds.length > 0) {
          if (includeStudents) {
            const studentIds = await this.repo.resolveStudentsBySections(filter.sectionIds, institutionId);
            studentIds.forEach(id => userIdsSet.add(id));
          }
          if (includeParents) {
            const parentIds = await this.repo.resolveParentsBySections(filter.sectionIds, institutionId);
            parentIds.forEach(id => userIdsSet.add(id));
          }
          if (includeTeachers) {
            const teacherIds = await this.repo.resolveTeachersBySections(filter.sectionIds, institutionId);
            teacherIds.forEach(id => userIdsSet.add(id));
          }
        }
        break;

      case 'department':
        if (filter.departmentIds && filter.departmentIds.length > 0) {
          if (includeStudents) {
            const studentIds = await this.repo.resolveStudentsByDepartments(filter.departmentIds, institutionId);
            studentIds.forEach(id => userIdsSet.add(id));
          }
          if (includeParents) {
            const parentIds = await this.repo.resolveParentsByDepartments(filter.departmentIds, institutionId);
            parentIds.forEach(id => userIdsSet.add(id));
          }
          if (includeTeachers) {
            const teacherIds = await this.repo.resolveTeachersByDepartments(filter.departmentIds, institutionId);
            teacherIds.forEach(id => userIdsSet.add(id));
          }
        }
        break;

      case 'role':
        if (filter.roles && filter.roles.length > 0) {
          for (const role of filter.roles) {
            const roleUserIds = await this.repo.resolveAllAudienceByRole(role, institutionId);
            roleUserIds.forEach(id => userIdsSet.add(id));
          }
        }
        break;

      case 'all':
        // General broadcast targeting broad roles
        if (includeStudents) {
          const list = await this.repo.resolveAllStudents(institutionId);
          list.forEach(id => userIdsSet.add(id));
        }
        if (includeParents) {
          const list = await this.repo.resolveAllParents(institutionId);
          list.forEach(id => userIdsSet.add(id));
        }
        if (includeTeachers) {
          const list = await this.repo.resolveAllTeachers(institutionId);
          list.forEach(id => userIdsSet.add(id));
        }
        // Fallback in case no checkboxes were explicitly ticked
        if (!includeStudents && !includeParents && !includeTeachers) {
          const allParents = await this.repo.resolveAllParents(institutionId);
          allParents.forEach(id => userIdsSet.add(id));
          const allStudents = await this.repo.resolveAllStudents(institutionId);
          allStudents.forEach(id => userIdsSet.add(id));
          const allTeachers = await this.repo.resolveAllTeachers(institutionId);
          allTeachers.forEach(id => userIdsSet.add(id));
        }
        break;

      case 'custom':
        if (filter.userIds && filter.userIds.length > 0) {
          filter.userIds.forEach(id => userIdsSet.add(id));
        }
        break;
    }

    return Array.from(userIdsSet);
  }

  async processScheduledBroadcasts(env: Env): Promise<void> {
    const scheduled = await this.repo.findScheduledToDeliver();
    for (const b of scheduled) {
      try {
        await this.sendBroadcast(b.id, b.institution_id, env);
      } catch (err) {
        console.error(`[Scheduled Worker] Failed to send scheduled broadcast ${b.id}:`, err);
      }
    }
  }
}
