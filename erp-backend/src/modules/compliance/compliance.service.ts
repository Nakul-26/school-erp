import { ComplianceRepository } from './compliance.repository';
import { EnrollmentSummary, AttendanceSummary, FeeComplianceSummary } from './compliance.types';

export class ComplianceServiceError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

export class ComplianceService {
  constructor(private repo: ComplianceRepository) {}

  async getEnrollmentSummary(institutionId: string): Promise<EnrollmentSummary> {
    const [totalStudents, totalTeachers, byGender, byStatus, byCourse] = await Promise.all([
      this.repo.getStudentCount(institutionId),
      this.repo.getTeacherCount(institutionId),
      this.repo.getStudentsByGender(institutionId),
      this.repo.getStudentsByStatus(institutionId),
      this.repo.getStudentsByCourse(institutionId),
    ]);

    return {
      total_students: totalStudents,
      by_gender: byGender,
      by_status: byStatus,
      by_course: byCourse,
      total_teachers: totalTeachers,
      student_teacher_ratio: totalTeachers > 0 ? Math.round((totalStudents / totalTeachers) * 10) / 10 : null,
    };
  }

  async getAttendanceSummary(institutionId: string, from?: string, to?: string): Promise<AttendanceSummary> {
    const toDate = to || new Date().toISOString().slice(0, 10);
    const fromDate = from || new Date(new Date(toDate).getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    if (fromDate > toDate) {
      throw new ComplianceServiceError('"from" date must be before "to" date.', 400);
    }

    const { total_marked, present_count } = await this.repo.getAttendanceSummary(institutionId, fromDate, toDate);
    return {
      from: fromDate,
      to: toDate,
      total_marked,
      present_count,
      absent_count: total_marked - present_count,
      attendance_rate: total_marked > 0 ? Math.round((present_count / total_marked) * 1000) / 10 : null,
    };
  }

  async getFeeCompliance(institutionId: string): Promise<FeeComplianceSummary> {
    const { total_billed, total_collected, overdue_records } = await this.repo.getFeeCompliance(institutionId);
    const outstanding = total_billed - total_collected;
    return {
      total_billed,
      total_collected,
      total_outstanding: outstanding,
      collection_rate: total_billed > 0 ? Math.round((total_collected / total_billed) * 1000) / 10 : null,
      overdue_records,
    };
  }
}
