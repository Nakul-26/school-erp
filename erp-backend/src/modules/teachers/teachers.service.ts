import { TeacherRepository } from './teachers.repository';
import { Teacher, CreateTeacherInput, UpdateTeacherInput } from './teachers.types';

export class TeacherService {
  constructor(private repo: TeacherRepository) {}

  async createTeacher(institutionId: string, input: CreateTeacherInput, userId?: string): Promise<string> {
    const id = crypto.randomUUID();
    await this.repo.create(id, institutionId, input, userId);
    return id;
  }

  async getTeacher(id: string): Promise<Teacher | null> {
    return await this.repo.findById(id);
  }

  async listTeachers(institutionId: string): Promise<Teacher[]> {
    return await this.repo.listByInstitution(institutionId);
  }

  async updateTeacher(id: string, input: UpdateTeacherInput, userId?: string): Promise<void> {
    await this.repo.update(id, input, userId);
  }

  async deleteTeacher(id: string, userId?: string): Promise<void> {
    await this.repo.softDelete(id, userId);
  }
}
