import { ProgramRepository } from './programs.repository';
import { Program, CreateProgramInput, UpdateProgramInput } from './programs.types';

export class ProgramService {
  constructor(private repo: ProgramRepository) {}

  async createProgram(institutionId: string, input: CreateProgramInput, userId?: string): Promise<string> {
    const id = crypto.randomUUID();
    await this.repo.create(id, institutionId, input, userId);
    return id;
  }

  async getProgram(id: string): Promise<Program | null> {
    return await this.repo.findById(id);
  }

  async listPrograms(institutionId: string): Promise<Program[]> {
    return await this.repo.listByInstitution(institutionId);
  }

  async updateProgram(id: string, input: UpdateProgramInput, userId?: string): Promise<void> {
    await this.repo.update(id, input, userId);
  }

  async deleteProgram(id: string, userId?: string): Promise<void> {
    await this.repo.softDelete(id, userId);
  }
}
