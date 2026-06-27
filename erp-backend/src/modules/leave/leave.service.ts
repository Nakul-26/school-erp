import { LeaveRepository } from './leave.repository';
import { CreateLeaveTypeInput, CreateLeaveApplicationInput } from './leave.types';

export class LeaveService {
  constructor(private repo: LeaveRepository) {}

  // --- LEAVE TYPES ---

  async createLeaveType(institutionId: string, input: CreateLeaveTypeInput, userId?: string): Promise<string> {
    const id = crypto.randomUUID();
    await this.repo.createLeaveType(id, institutionId, input, userId);
    return id;
  }

  async listLeaveTypes(institutionId: string): Promise<any[]> {
    return await this.repo.listLeaveTypes(institutionId);
  }

  async updateLeaveType(id: string, name: string, daysPerYear: number, userId?: string): Promise<void> {
    await this.repo.updateLeaveType(id, name, daysPerYear, userId);
  }

  async deleteLeaveType(id: string, userId?: string): Promise<void> {
    await this.repo.softDeleteLeaveType(id, userId);
  }

  // --- LEAVE BALANCES ---

  async seedBalancesForYear(institutionId: string, academicYearId: string, userId?: string): Promise<void> {
    await this.repo.seedBalancesForYear(institutionId, academicYearId, userId);
  }

  async getBalancesForInstitution(institutionId: string, academicYearId: string): Promise<any[]> {
    return await this.repo.getAllBalancesForYear(institutionId, academicYearId);
  }

  async getMyBalances(teacherId: string, academicYearId: string): Promise<any[]> {
    return await this.repo.getBalancesForTeacher(teacherId, academicYearId);
  }

  // --- LEAVE APPLICATIONS ---

  async applyForLeave(institutionId: string, input: CreateLeaveApplicationInput, userId?: string): Promise<string> {
    const id = crypto.randomUUID();
    await this.repo.createApplication(id, institutionId, input, userId);
    return id;
  }

  async approveApplication(id: string, approverId: string, remarks?: string): Promise<void> {
    // Fetch the application first to get days_count, leaveTypeId, teacherId, academicYearId
    const app = await this.repo.getApplicationById(id);
    if (!app) throw new Error('Leave application not found');
    if (app.status !== 'Pending') throw new Error(`Application is already ${app.status}`);

    await this.repo.approveApplication(id, approverId, remarks);
    await this.repo.deductLeaveBalance(app.teacher_id, app.leave_type_id, app.academic_year_id, app.days_count);
  }

  async rejectApplication(id: string, approverId: string, remarks: string): Promise<void> {
    const app = await this.repo.getApplicationById(id);
    if (!app) throw new Error('Leave application not found');
    if (app.status !== 'Pending') throw new Error(`Application is already ${app.status}`);

    await this.repo.rejectApplication(id, approverId, remarks);
  }

  async listApplications(institutionId: string, status?: string, teacherId?: string): Promise<any[]> {
    return await this.repo.listApplications(institutionId, status, teacherId);
  }

  async listMyApplications(teacherId: string): Promise<any[]> {
    return await this.repo.listMyApplications(teacherId);
  }
}
