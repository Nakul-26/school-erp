import { StudentRepository } from './students.repository';
import { Student, CreateStudentInput, UpdateStudentInput } from './students.types';

export class StudentService {
  constructor(private repo: StudentRepository) {}

  async createStudent(institutionId: string, input: any, userId?: string): Promise<string> {
    const id = crypto.randomUUID();
    await this.repo.create(id, institutionId, input, userId);
    return id;
  }

  async getStudent(id: string): Promise<any | null> {
    return await this.repo.findById(id);
  }

  async listStudents(
    institutionId: string,
    filters?: {
      search?: string;
      program_id?: string;
      section_id?: string;
      academic_year_id?: string;
      status?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ students: any[]; total: number }> {
    return await this.repo.listByInstitution(institutionId, filters);
  }

  async updateStudent(id: string, input: any, userId?: string): Promise<void> {
    await this.repo.update(id, input, userId);
  }

  async deleteStudent(id: string, userId?: string): Promise<void> {
    await this.repo.hardDelete(id);
  }
}
