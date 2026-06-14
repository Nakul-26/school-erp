import { SectionRepository } from './sections.repository';
import { Section, CreateSectionInput, UpdateSectionInput } from './sections.types';

export class SectionService {
  constructor(private repo: SectionRepository) {}

  async createSection(institutionId: string, input: CreateSectionInput, userId?: string): Promise<string> {
    const id = crypto.randomUUID();
    await this.repo.create(id, institutionId, input, userId);
    return id;
  }

  async getSection(id: string): Promise<Section | null> {
    return await this.repo.findById(id);
  }

  async listSections(institutionId: string, filters?: { academic_year_id?: string; course_id?: string }): Promise<Section[]> {
    return await this.repo.listByInstitution(institutionId, filters);
  }

  async updateSection(id: string, input: UpdateSectionInput, userId?: string): Promise<void> {
    await this.repo.update(id, input, userId);
  }

  async deleteSection(id: string, userId?: string): Promise<void> {
    await this.repo.softDelete(id, userId);
  }
}
