import { TeacherAssignmentRepository } from './teacher-assignments.repository';
import { TeacherSubjectAssignment, CreateAssignmentInput } from './teacher-assignments.types';

export class TeacherAssignmentService {
  constructor(private repo: TeacherAssignmentRepository) {}

  async createAssignment(input: CreateAssignmentInput, userId?: string): Promise<string> {
    const id = crypto.randomUUID();
    await this.repo.create(id, input, userId);
    return id;
  }

  async listAssignmentsByTeacher(teacherId: string): Promise<TeacherSubjectAssignment[]> {
    return await this.repo.listByTeacher(teacherId);
  }

  async listAssignmentsBySection(sectionId: string, academicYearId: string): Promise<TeacherSubjectAssignment[]> {
    return await this.repo.listBySection(sectionId, academicYearId);
  }

  async deleteAssignment(id: string, userId?: string): Promise<void> {
    await this.repo.softDelete(id, userId);
  }
}
