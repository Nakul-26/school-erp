import { TeacherAttendanceRepository } from './teacher-attendance.repository';
import { MarkTeacherAttendanceInput, TeacherAttendanceRecord } from './teacher-attendance.types';

export class TeacherAttendanceService {
  constructor(private repo: TeacherAttendanceRepository) {}

  async listAttendanceByDate(institutionId: string, date: string): Promise<any[]> {
    return await this.repo.listAttendanceByDate(institutionId, date);
  }

  async markAttendance(institutionId: string, date: string, records: MarkTeacherAttendanceInput[], userId?: string): Promise<void> {
    await this.repo.markAttendance(institutionId, date, records, userId);
  }

  async getTeacherAttendanceHistory(teacherId: string): Promise<TeacherAttendanceRecord[]> {
    return await this.repo.getTeacherAttendanceHistory(teacherId);
  }
}
