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

    // Hook: Parent Absence Email Alerts (Phase B)
    if (env) {
      const absentGuardians = await this.db.prepare(`
        SELECT 
          s.first_name || ' ' || s.last_name as student_name,
          COALESCE(g.email, u.email, '') as guardian_email,
          g.name as guardian_name
        FROM student_attendance sa
        JOIN students s ON sa.student_id = s.id
        JOIN guardians g ON s.id = g.student_id
        LEFT JOIN users u ON g.user_id = u.id
        WHERE sa.session_id = ? AND sa.status = 'absent' AND sa.is_active = 1 AND g.is_active = 1 AND s.is_active = 1
      `).bind(sessionId).all<{ student_name: string; guardian_email: string; guardian_name: string }>();

      if (absentGuardians.results && absentGuardians.results.length > 0) {
        const { sendEmail } = await import('../../utils/email');
        for (const row of absentGuardians.results) {
          if (row.guardian_email && row.guardian_email.trim() !== '') {
            try {
              await sendEmail(env, {
                to: row.guardian_email,
                subject: `Absence Alert: ${row.student_name} was Absent`,
                html: `
                  <div style="font-family: sans-serif; padding: 20px; line-height: 1.6; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #fff;">
                    <h2 style="color: #ef4444; margin-top: 0; border-bottom: 2px solid #fee2e2; padding-bottom: 0.5rem;">Student Absence Alert</h2>
                    <p>Dear ${row.guardian_name || 'Parent/Guardian'},</p>
                    <p>This is to inform you that your child, <strong>${row.student_name}</strong>, was marked <strong>ABSENT</strong> during the attendance roll call for class session <strong>"${session.subject_name}"</strong> on <strong>${session.date}</strong>.</p>
                    <p>If this absence was unplanned, please contact the class teacher or the school administration office to clarify the reason.</p>
                    <hr style="border: 0; border-top: 1px solid #cbd5e1; margin: 20px 0;" />
                    <p style="font-size: 0.8rem; color: #64748b; text-align: center;">This is an automated notification from your School ERP Portal.</p>
                  </div>
                `
              });
            } catch (emailErr) {
              console.error(`Failed to dispatch parent absence email to ${row.guardian_email}:`, emailErr);
            }
          }
        }
      }
    }
  }

  async notifyResultPublished(institutionId: string, examId: string): Promise<void> {
    if (!this.db) return;

    // Get exam details
    const exam = await this.db.prepare(`
      SELECT name, course_id, semester FROM exams WHERE id = ? AND is_active = 1
    `).bind(examId).first<{ name: string; course_id: string; semester: number }>();

    if (!exam) return;

    // Find all student user IDs enrolled in that course + semester
    const { results } = await this.db.prepare(`
      SELECT DISTINCT s.user_id 
      FROM student_enrollments se
      JOIN students s ON se.student_id = s.id
      WHERE se.course_id = ? AND se.semester = ? AND se.is_active = 1 AND s.is_active = 1 AND s.user_id IS NOT NULL
    `).bind(exam.course_id, exam.semester).all<{ user_id: string }>();

    if (!results || results.length === 0) return;

    const notificationsInput: CreateNotificationInput[] = results.map(row => ({
      user_id: row.user_id,
      title: 'Result Published',
      message: `Results for exam "${exam.name}" have been published. Check your marksheet.`,
      type: 'result'
    }));

    await this.repo.createBulk(institutionId, notificationsInput);
  }
}
