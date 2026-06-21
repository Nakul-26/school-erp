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

  async notifyAttendanceMarked(institutionId: string, sessionId: string): Promise<void> {
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

    if (!results || results.length === 0) return;

    const notificationsInput: CreateNotificationInput[] = results.map(row => ({
      user_id: row.user_id,
      title: 'Attendance Marked',
      message: `Attendance for "${session.subject_name}" on ${session.date} has been marked.`,
      type: 'attendance'
    }));

    await this.repo.createBulk(institutionId, notificationsInput);
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
