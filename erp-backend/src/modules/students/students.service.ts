import { StudentRepository } from './students.repository';
import { Student, CreateStudentInput, UpdateStudentInput } from './students.types';

export class StudentService {
  constructor(private repo: StudentRepository) {}

  async createStudent(institutionId: string, input: CreateStudentInput, userId?: string): Promise<string> {
    const id = crypto.randomUUID();
    await this.repo.create(id, institutionId, input, userId);
    return id;
  }

  async getStudent(id: string): Promise<Student | null> {
    return await this.repo.findById(id);
  }

  async listStudents(institutionId: string): Promise<Student[]> {
    return await this.repo.listByInstitution(institutionId);
  }

  async updateStudent(id: string, input: UpdateStudentInput, userId?: string): Promise<void> {
    await this.repo.update(id, input, userId);
  }

  async deleteStudent(id: string, userId?: string): Promise<void> {
    await this.repo.softDelete(id, userId);
  }
}
