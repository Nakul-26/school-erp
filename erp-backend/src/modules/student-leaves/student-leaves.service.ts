import { StudentLeavesRepository } from './student-leaves.repository';
import { CreateStudentLeaveInput, StudentLeaveApplication } from './student-leaves.types';

export class StudentLeavesService {
  constructor(private repo: StudentLeavesRepository) {}

  async applyLeave(institutionId: string, input: CreateStudentLeaveInput, userId?: string): Promise<string> {
    const id = crypto.randomUUID();
    await this.repo.createApplication(id, institutionId, input, userId);
    return id;
  }

  async listApplicationsForReview(institutionId: string, userRoles: string[], userId: string, db: D1Database): Promise<any[]> {
    const isAdmin = userRoles.some(r => ['admin', 'Admin', 'super_admin', 'Super Admin', 'role-super-admin', 'Principal', 'principal', 'HOD', 'hod'].includes(r));
    if (isAdmin) {
      return await this.repo.listApplicationsForAdmin(institutionId);
    }
    
    // Check if user is a teacher
    const teacher = await db.prepare('SELECT id FROM teachers WHERE user_id = ? AND institution_id = ? AND is_active = 1')
      .bind(userId, institutionId).first<{ id: string }>();
    if (teacher) {
      return await this.repo.listApplicationsForTeacher(institutionId, teacher.id);
    }
    
    return [];
  }

  async listStudentLeaves(studentId: string): Promise<StudentLeaveApplication[]> {
    return await this.repo.listMyApplications(studentId);
  }

  async approveLeave(id: string, reviewerId: string, remarks?: string): Promise<void> {
    await this.repo.reviewApplication(id, 'Approved', reviewerId, remarks);
  }

  async rejectLeave(id: string, reviewerId: string, remarks: string): Promise<void> {
    if (!remarks) throw new Error('Remarks are required for leave rejection');
    await this.repo.reviewApplication(id, 'Rejected', reviewerId, remarks);
  }
}
