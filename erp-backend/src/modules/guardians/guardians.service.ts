import { GuardianRepository } from './guardians.repository';
import { Guardian, CreateGuardianInput, UpdateGuardianInput } from './guardians.types';

export class GuardianService {
  constructor(private repo: GuardianRepository) {}

  async createGuardian(input: CreateGuardianInput, userId?: string): Promise<string> {
    const id = crypto.randomUUID();
    await this.repo.create(id, input, userId);
    return id;
  }

  async getGuardian(id: string): Promise<Guardian | null> {
    return await this.repo.findById(id);
  }

  async listGuardiansByStudent(studentId: string): Promise<Guardian[]> {
    return await this.repo.listByStudent(studentId);
  }

  async updateGuardian(id: string, input: UpdateGuardianInput, userId?: string): Promise<void> {
    await this.repo.update(id, input, userId);
  }

  async deleteGuardian(id: string, userId?: string): Promise<void> {
    await this.repo.softDelete(id, userId);
  }
}
