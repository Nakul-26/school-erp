import { AcademicYearRepository } from './academic-year.repository';
import { AcademicYear, CreateAcademicYearInput, UpdateAcademicYearInput } from './academic-year.types';

export class AcademicYearService {
  constructor(private repo: AcademicYearRepository) {}

  async createAcademicYear(institutionId: string, input: CreateAcademicYearInput, userId?: string): Promise<string> {
    const id = crypto.randomUUID();
    await this.repo.create(id, institutionId, input, userId);
    return id;
  }

  async getAcademicYear(id: string): Promise<AcademicYear | null> {
    return await this.repo.findById(id);
  }

  async listAcademicYears(institutionId: string): Promise<AcademicYear[]> {
    return await this.repo.listByInstitution(institutionId);
  }

  async updateAcademicYear(id: string, institutionId: string, input: UpdateAcademicYearInput, userId?: string): Promise<void> {
    await this.repo.update(id, institutionId, input, userId);
  }

  async deleteAcademicYear(id: string, userId?: string): Promise<void> {
    await this.repo.softDelete(id, userId);
  }
}
