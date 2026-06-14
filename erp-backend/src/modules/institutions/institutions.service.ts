import { InstitutionRepository } from './institutions.repository';
import { CreateInstitutionInput, UpdateInstitutionInput, Institution } from './institutions.types';

export class InstitutionService {
  constructor(private repo: InstitutionRepository) {}

  async createInstitution(input: CreateInstitutionInput, userId?: string): Promise<string> {
    const id = crypto.randomUUID();
    await this.repo.create(id, input, userId);
    return id;
  }

  async getInstitution(id: string): Promise<Institution | null> {
    return await this.repo.findById(id);
  }

  async getAllInstitutions(): Promise<Institution[]> {
    return await this.repo.findAll();
  }

  async updateInstitution(id: string, input: UpdateInstitutionInput, userId?: string): Promise<void> {
    await this.repo.update(id, input, userId);
  }

  async deleteInstitution(id: string, userId?: string): Promise<void> {
    await this.repo.softDelete(id, userId);
  }
}
