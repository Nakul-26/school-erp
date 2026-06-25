import { ProgramRepository } from './programs.repository';
import { Program, CreateProgramInput, UpdateProgramInput } from './programs.types';

export class ProgramService {
  constructor(private repo: ProgramRepository) {}

  async createProgram(institutionId: string, input: CreateProgramInput, userId?: string): Promise<string> {
    if (!input.name || !input.course_code) {
      throw new Error('Name and Identifier Code are required');
    }

    const codeUpper = input.course_code.trim().toUpperCase();
    const existing = await this.repo.findByCode(institutionId, codeUpper);
    if (existing) {
      throw new Error(`A class/program with identifier '${codeUpper}' already exists.`);
    }

    const id = crypto.randomUUID();
    await this.repo.create(id, institutionId, {
      ...input,
      course_code: codeUpper
    }, userId);
    return id;
  }

  async getProgram(id: string): Promise<Program | null> {
    return this.repo.findById(id);
  }

  async listPrograms(institutionId: string, includeArchived = false): Promise<Program[]> {
    return this.repo.listByInstitution(institutionId, includeArchived);
  }

  async updateProgram(id: string, input: UpdateProgramInput, userId?: string): Promise<void> {
    const existingProg = await this.repo.findById(id);
    if (!existingProg) {
      throw new Error('Class/Program not found.');
    }

    if (input.course_code) {
      const codeUpper = input.course_code.trim().toUpperCase();
      if (codeUpper !== existingProg.course_code) {
        const duplicate = await this.repo.findByCode(existingProg.institution_id, codeUpper);
        if (duplicate) {
          throw new Error(`A class/program with identifier '${codeUpper}' already exists.`);
        }
        input.course_code = codeUpper;
      }
    }

    await this.repo.update(id, input, userId);
  }

  async deleteProgram(id: string, userId?: string): Promise<void> {
    const activeSections = await this.repo.hasActiveSections(id);
    if (activeSections > 0) {
      throw new Error(`Cannot archive class/program. ${activeSections} active section(s) are currently linked.`);
    }
    await this.repo.softDelete(id, userId);
  }

  async restoreProgram(id: string, userId?: string): Promise<void> {
    await this.repo.restore(id, userId);
  }
}
