import { AttendanceRepository } from './attendance.repository';
import { AttendanceSession, CreateAttendanceSessionInput, MarkStudentAttendanceInput } from './attendance.types';

export class AttendanceServiceError extends Error {
  constructor(message: string, public statusCode: number = 400) {
    super(message);
    this.name = 'AttendanceServiceError';
  }
}

export class AttendanceService {
  constructor(private repo: AttendanceRepository, private db?: D1Database) {}

  private isOlderThan24Hours(dateStr: string): boolean {
    const sessionDate = new Date(dateStr);
    const now = new Date();
    const diffHours = (now.getTime() - sessionDate.getTime()) / (1000 * 60 * 60);
    return diffHours > 24;
  }

  async createSession(institutionId: string, input: CreateAttendanceSessionInput, userId?: string, allowOverride = false): Promise<string> {
    if (!input.section_id || !input.subject_id || !input.teacher_id || !input.date) {
      throw new AttendanceServiceError('Section, subject, teacher, and date are required.', 400);
    }

    if (this.db) {
      // 1. Fetch metadata for clean error messages
      const [sec, sub, teacher] = await Promise.all([
        this.db.prepare('SELECT name, course_id FROM sections WHERE id = ? AND institution_id = ? AND is_active = 1').bind(input.section_id, institutionId).first<any>(),
        this.db.prepare('SELECT subject_name, course_id FROM subjects WHERE id = ? AND institution_id = ? AND is_active = 1').bind(input.subject_id, institutionId).first<any>(),
        this.db.prepare("SELECT (first_name || ' ' || last_name) as name FROM teachers WHERE id = ? AND institution_id = ? AND is_active = 1").bind(input.teacher_id, institutionId).first<any>()
      ]);

      if (!sec || !sub || !teacher) {
        throw new AttendanceServiceError('Invalid section, subject, or teacher specified.', 400);
      }

      if (sub.course_id !== sec.course_id) {
        throw new AttendanceServiceError(`Subject '${sub.subject_name}' does not belong to the curriculum program of section '${sec.name}'.`, 400);
      }

      // 2. Teaching Allocation Check
      const isAllocated = await this.repo.checkTeacherAllocation(input.teacher_id, input.subject_id, input.section_id, institutionId);
      if (!isAllocated) {
        throw new AttendanceServiceError(`Teacher '${teacher.name}' is not assigned to teach '${sub.subject_name}' for section '${sec.name}'.`, 400);
      }

      // 3. Duplicate Session Check (409 Conflict)
      const existing = await this.repo.findActiveSession(input.section_id, input.subject_id, input.date, input.slot_id);
      if (existing) {
        throw new AttendanceServiceError(`An attendance session already exists for section '${sec.name}', subject '${sub.subject_name}' on ${input.date} for the selected period slot.`, 409);
      }

      // 4. Holiday / Weekend Restriction
      const holidayInfo = await this.repo.isHolidayOrSunday(institutionId, input.date);
      if (holidayInfo.isHoliday && !allowOverride && !input.allow_override) {
        throw new AttendanceServiceError(`Cannot mark attendance on a holiday or non-working day (${holidayInfo.eventName}) unless override permission is enabled.`, 400);
      }
    }

    const id = crypto.randomUUID();
    await this.repo.createSession(id, institutionId, input, userId);
    return id;
  }

  async getSession(id: string): Promise<AttendanceSession | null> {
    return await this.repo.findSessionById(id);
  }

  async listSessions(institutionId: string, sectionId?: string, date?: string): Promise<AttendanceSession[]> {
    return await this.repo.listSessions(institutionId, sectionId, date);
  }

  async getSessionAttendance(sessionId: string, sectionId: string): Promise<any[]> {
    return await this.repo.getSessionAttendance(sessionId, sectionId);
  }

  async markAttendance(institutionId: string, sessionId: string, attendance: MarkStudentAttendanceInput[], userId?: string, allowOverride = false): Promise<void> {
    const session = await this.repo.findSessionById(sessionId);
    if (!session || session.institution_id !== institutionId) {
      throw new AttendanceServiceError('Attendance session not found.', 404);
    }

    // Lock Window Check (24 Hours)
    if (this.isOlderThan24Hours(session.date) && !allowOverride) {
      throw new AttendanceServiceError('Attendance sessions older than 24 hours are locked and cannot be modified without override permission.', 403);
    }

    await this.repo.markAttendance(institutionId, sessionId, attendance, userId);
  }

  async deleteSession(id: string, institutionId: string, userId?: string, allowOverride = false): Promise<void> {
    const session = await this.repo.findSessionById(id);
    if (!session || session.institution_id !== institutionId) {
      throw new AttendanceServiceError('Attendance session not found.', 404);
    }

    if (this.isOlderThan24Hours(session.date) && !allowOverride) {
      throw new AttendanceServiceError('Attendance sessions older than 24 hours are locked and cannot be deleted without override permission.', 403);
    }

    await this.repo.deleteSession(id, userId);
  }

  async getStudentAttendanceReport(institutionId: string, sectionId: string): Promise<any[]> {
    return await this.repo.getStudentAttendanceReport(institutionId, sectionId);
  }
}
