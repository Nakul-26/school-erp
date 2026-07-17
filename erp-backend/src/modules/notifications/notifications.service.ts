import { NotificationRepository } from './notifications.repository';
import { CreateNotificationInput, Notification } from './notifications.types';

export class NotificationService {
  constructor(private repo: NotificationRepository, private db?: D1Database) {}

  async listNotifications(institutionId: string, userId: string): Promise<Notification[]> {
    return await this.repo.listByUser(institutionId, userId);
  }

  async markAsRead(id: string, userId: string): Promise<void> {
    await this.repo.markAsRead(id, userId);
  }

  async markAllAsRead(institutionId: string, userId: string): Promise<void> {
    await this.repo.markAllAsRead(institutionId, userId);
  }

  async createNotification(institutionId: string, input: CreateNotificationInput): Promise<string> {
    const id = crypto.randomUUID();
    await this.repo.create(id, institutionId, input);
    return id;
  }

  // --- System Triggered Notification Helpers ---

  async notifyExamCreated(institutionId: string, examName: string, courseId: string, semester: number): Promise<void> {
    if (!this.db) return;
    
    // Find all student user IDs for students in this course + semester
    const { results } = await this.db.prepare(`
      SELECT DISTINCT s.user_id 
      FROM student_enrollments se
      JOIN students s ON se.student_id = s.id
      WHERE se.course_id = ? AND se.semester = ? AND se.is_active = 1 AND s.is_active = 1 AND s.user_id IS NOT NULL
    `).bind(courseId, semester).all<{ user_id: string }>();

    if (!results || results.length === 0) return;

    const notificationsInput: CreateNotificationInput[] = results.map(row => ({
      user_id: row.user_id,
      title: 'New Exam Created',
      message: `A new exam "${examName}" has been created for your semester. Please review the timetable.`,
      type: 'exam'
    }));

    await this.repo.createBulk(institutionId, notificationsInput);
  }

  async notifyAttendanceMarked(institutionId: string, sessionId: string, env?: any): Promise<void> {
    if (!this.db) return;

    // Get attendance session details (date & subject)
    const session = await this.db.prepare(`
      SELECT asess.date, sub.subject_name, asess.section_id
      FROM attendance_sessions asess
      JOIN subjects sub ON asess.subject_id = sub.id
      WHERE asess.id = ? AND asess.is_active = 1
    `).bind(sessionId).first<{ date: string; subject_name: string; section_id: string }>();

    if (!session) return;

    // Find all student user IDs enrolled in that section
    const { results } = await this.db.prepare(`
      SELECT DISTINCT s.user_id 
      FROM student_enrollments se
      JOIN students s ON se.student_id = s.id
      WHERE se.section_id = ? AND se.is_active = 1 AND s.is_active = 1 AND s.user_id IS NOT NULL
    `).bind(session.section_id).all<{ user_id: string }>();

    if (results && results.length > 0) {
      const notificationsInput: CreateNotificationInput[] = results.map(row => ({
        user_id: row.user_id,
        title: 'Attendance Marked',
        message: `Attendance for "${session.subject_name}" on ${session.date} has been marked.`,
        type: 'attendance'
      }));
      await this.repo.createBulk(institutionId, notificationsInput);
    }

    // Hook: Parent Absence Broadcast and Delivery (Central Notification Pipeline)
    if (env) {
      const absentGuardians = await this.db.prepare(`
        SELECT 
          s.first_name || ' ' || s.last_name as student_name,
          g.name as guardian_name,
          COALESCE(g.email, u.email, '') as guardian_email,
          COALESCE(g.phone, u.phone, '') as guardian_phone,
          g.user_id as guardian_user_id,
          t.user_id as teacher_user_id
        FROM student_attendance sa
        JOIN students s ON sa.student_id = s.id
        JOIN guardians g ON s.id = g.student_id
        JOIN attendance_sessions asess ON sa.session_id = asess.id
        LEFT JOIN users u ON g.user_id = u.id
        LEFT JOIN teachers t ON asess.teacher_id = t.id
        WHERE sa.session_id = ? AND sa.status = 'absent' AND sa.is_active = 1 AND g.is_active = 1 AND s.is_active = 1
      `).bind(sessionId).all<{ student_name: string; guardian_name: string; guardian_email: string; guardian_phone: string; guardian_user_id: string | null; teacher_user_id: string | null }>();

      if (absentGuardians.results && absentGuardians.results.length > 0) {
        const { BroadcastsRepository } = await import('../broadcasts/broadcasts.repository');
        const { BroadcastsService } = await import('../broadcasts/broadcasts.service');
        const { NotificationService: CentralNotifService } = await import('../broadcasts/notification.service');
        
        const broadcastsRepo = new BroadcastsRepository(this.db);
        const broadcastsService = new BroadcastsService(broadcastsRepo);
        const centralNotif = new CentralNotifService();

        for (const row of absentGuardians.results) {
          const alertSubject = `Absence Alert: ${row.student_name} was Absent`;
          const alertBody = `Dear ${row.guardian_name || 'Parent/Guardian'},\n\nThis is to inform you that your child, ${row.student_name}, was marked ABSENT during the attendance roll call for class session "${session.subject_name}" on ${session.date}.\n\nRegards,\nSchool Administration`;

          if (row.guardian_user_id) {
            try {
              await broadcastsService.createBroadcast(
                institutionId,
                row.teacher_user_id || 'system',
                {
                  subject: alertSubject,
                  body: alertBody,
                  category: 'attendance',
                  priority: 'important',
                  recipient_type: 'custom',
                  recipient_filter: JSON.stringify({
                    type: 'custom',
                    userIds: [row.guardian_user_id]
                  }),
                  channel: 'erp,email,sms',
                  status: 'sent',
                  expires_at: null,
                  attachments: []
                },
                env
              );
            } catch (err) {
              console.error('Failed to auto-create absence broadcast:', err);
            }
          } else {
            // Fallback for guardians without user account (send direct email/SMS)
            try {
              await centralNotif.deliver(
                env,
                ['email', 'sms'],
                [{
                  id: 'anonymous',
                  name: row.guardian_name,
                  email: row.guardian_email,
                  phone: row.guardian_phone
                }],
                {
                  subject: alertSubject,
                  body: alertBody
                }
              );
            } catch (err) {
              console.error('Failed to send direct notification to guardian without user account:', err);
            }
          }
        }
      }
    }
  }

  async notifyResultPublished(institutionId: string, examId: string, env?: any): Promise<void> {
    if (!this.db) return;

    // Get exam details
    const exam = await this.db.prepare(`
      SELECT name, course_id, semester FROM exams WHERE id = ? AND is_active = 1
    `).bind(examId).first<{ name: string; course_id: string; semester: number }>();

    if (!exam) return;

    // Find all student user IDs and guardian user IDs
    const { results } = await this.db.prepare(`
      SELECT DISTINCT 
        s.user_id as student_user_id,
        g.user_id as guardian_user_id,
        g.name as guardian_name,
        COALESCE(g.email, u.email, '') as guardian_email,
        COALESCE(g.phone, u.phone, '') as guardian_phone
      FROM student_enrollments se
      JOIN students s ON se.student_id = s.id
      LEFT JOIN guardians g ON s.id = g.student_id AND g.is_active = 1
      LEFT JOIN users u ON g.user_id = u.id
      WHERE se.course_id = ? AND se.semester = ? AND se.is_active = 1 AND s.is_active = 1
    `).bind(exam.course_id, exam.semester).all<{ student_user_id: string | null; guardian_user_id: string | null; guardian_name: string | null; guardian_email: string | null; guardian_phone: string | null }>();

    if (!results || results.length === 0) return;

    const userIdsSet = new Set<string>();
    const directContacts: { id: string; name: string; email: string; phone?: string | null }[] = [];

    for (const row of results) {
      if (row.student_user_id) {
        userIdsSet.add(row.student_user_id);
      }
      if (row.guardian_user_id) {
        userIdsSet.add(row.guardian_user_id);
      } else if (row.guardian_email || row.guardian_phone) {
        directContacts.push({
          id: 'anonymous',
          name: row.guardian_name || 'Parent/Guardian',
          email: row.guardian_email || '',
          phone: row.guardian_phone || ''
        });
      }
    }

    const targetUserIds = Array.from(userIdsSet);

    if (targetUserIds.length > 0) {
      const { BroadcastsRepository } = await import('../broadcasts/broadcasts.repository');
      const { BroadcastsService } = await import('../broadcasts/broadcasts.service');
      const broadcastsRepo = new BroadcastsRepository(this.db);
      const broadcastsService = new BroadcastsService(broadcastsRepo);

      try {
        await broadcastsService.createBroadcast(
          institutionId,
          'system',
          {
            subject: `Exam Results Published: ${exam.name}`,
            body: `Dear Student/Parent,\n\nThe results for the examination "${exam.name}" have been published. Please check your dashboard marksheet for details.\n\nRegards,\nExamination Cell`,
            category: 'examination',
            priority: 'normal',
            recipient_type: 'custom',
            recipient_filter: JSON.stringify({
              type: 'custom',
              userIds: targetUserIds
            }),
            channel: 'erp,email,sms',
            status: 'sent',
            expires_at: null,
            attachments: []
          },
          env
        );
      } catch (err) {
        console.error('Failed to auto-create result publication broadcast:', err);
      }
    }

    // Direct deliver to guardians without user account
    if (directContacts.length > 0 && env) {
      try {
        const { NotificationService: CentralNotifService } = await import('../broadcasts/notification.service');
        const centralNotif = new CentralNotifService();
        await centralNotif.deliver(
          env,
          ['email', 'sms'],
          directContacts,
          {
            subject: `Exam Results Published: ${exam.name}`,
            body: `Dear Parent/Guardian,\n\nThe results for the examination "${exam.name}" have been published. Please check details in your parent portal.\n\nRegards,\nExamination Cell`
          }
        );
      } catch (err) {
        console.error('Failed to send direct notifications for exam results:', err);
      }
    }
  }

  async notifyHomeworkPosted(
    institutionId: string,
    sectionId: string,
    subjectName: string,
    title: string,
    dueDate: string | null,
    env?: any
  ): Promise<void> {
    if (!this.db) return;

    // Find students enrolled in this section + their parent users
    const { results: studentUsers } = await this.db.prepare(`
      SELECT DISTINCT s.user_id
      FROM student_enrollments se
      JOIN students s ON se.student_id = s.id
      WHERE se.section_id = ? AND se.is_active = 1 AND s.is_active = 1 AND s.user_id IS NOT NULL
    `).bind(sectionId).all<{ user_id: string }>();

    // Also find parent/guardian user accounts linked to students in this section
    const { results: parentUsers } = await this.db.prepare(`
      SELECT DISTINCT g.user_id
      FROM student_enrollments se
      JOIN students s ON se.student_id = s.id
      JOIN guardians g ON g.student_id = s.id
      WHERE se.section_id = ? AND se.is_active = 1 AND s.is_active = 1 AND g.user_id IS NOT NULL AND g.is_active = 1
    `).bind(sectionId).all<{ user_id: string }>();

    const allUserIds = [
      ...(studentUsers || []).map(r => r.user_id),
      ...(parentUsers || []).map(r => r.user_id),
    ];

    const uniqueUserIds = [...new Set(allUserIds)];
    if (uniqueUserIds.length === 0) return;

    const dueDateStr = dueDate ? ` Due: ${dueDate}.` : '';
    const notificationsInput = uniqueUserIds.map(userId => ({
      user_id: userId,
      title: `📚 New Homework: ${subjectName}`,
      message: `${title}.${dueDateStr}`,
      type: 'general' as const,
    }));

    await this.repo.createBulk(institutionId, notificationsInput);

    // Also send Web Push if env is available
    if (env) {
      try {
        const { sendPushToUsers } = await import('../../utils/webpush');
        await sendPushToUsers(env, this.db, uniqueUserIds, {
          title: `📚 New Homework: ${subjectName}`,
          body: `${title}${dueDateStr}`,
          icon: '/icons/icon-192.png',
          url: '/homework',
          tag: 'homework',
        });
      } catch (e) {
        console.warn('[NotificationService] Web push failed (non-fatal):', e);
      }
    }
  }
}
