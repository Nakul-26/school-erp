import { EnrollmentRepository } from './enrollments.repository';
import { StudentEnrollment, CreateEnrollmentInput, UpdateEnrollmentInput } from './enrollments.types';

export class EnrollmentService {
  constructor(private repo: EnrollmentRepository) {}

  async createEnrollment(input: CreateEnrollmentInput, userId?: string): Promise<string> {
    const id = crypto.randomUUID();
    await this.repo.create(id, input, userId);
    return id;
  }

  async listEnrollmentsByStudent(studentId: string): Promise<StudentEnrollment[]> {
    return await this.repo.listByStudent(studentId);
  }

  async updateEnrollment(id: string, input: UpdateEnrollmentInput, userId?: string): Promise<void> {
    await this.repo.update(id, input, userId);
  }

  async deleteEnrollment(id: string, userId?: string): Promise<void> {
    await this.repo.softDelete(id, userId);
  }
}
