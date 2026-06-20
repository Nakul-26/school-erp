import { AttendanceRepository } from './attendance.repository';
import { AttendanceSession, CreateAttendanceSessionInput, MarkStudentAttendanceInput } from './attendance.types';

export class AttendanceService {
  constructor(private repo: AttendanceRepository) {}

  async createSession(institutionId: string, input: CreateAttendanceSessionInput, userId?: string): Promise<string> {
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

  async markAttendance(institutionId: string, sessionId: string, attendance: MarkStudentAttendanceInput[], userId?: string): Promise<void> {
    await this.repo.markAttendance(institutionId, sessionId, attendance, userId);
  }

  async deleteSession(id: string, userId?: string): Promise<void> {
    await this.repo.deleteSession(id, userId);
  }
}
