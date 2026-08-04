import { FacultyResearchRepository } from './faculty-research.repository';
import { CreatePublicationInput, UpdatePublicationInput } from './faculty-research.types';

export class FacultyResearchServiceError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

export class FacultyResearchService {
  constructor(private repo: FacultyResearchRepository) {}

  async listForInstitution(institutionId: string) {
    return this.repo.listForInstitution(institutionId);
  }

  async listForTeacher(teacherId: string, institutionId: string) {
    return this.repo.listForTeacher(teacherId, institutionId);
  }

  async create(institutionId: string, input: CreatePublicationInput, userId?: string): Promise<string> {
    if (!input.teacher_id) throw new FacultyResearchServiceError('teacher_id is required.', 400);
    if (!input.title || input.title.trim().length < 2) {
      throw new FacultyResearchServiceError('A publication title is required.', 400);
    }
    const id = crypto.randomUUID();
    await this.repo.create(id, institutionId, input, userId);
    return id;
  }

  async update(institutionId: string, id: string, input: UpdatePublicationInput, userId?: string): Promise<void> {
    const existing = await this.repo.getById(id, institutionId);
    if (!existing) throw new FacultyResearchServiceError('Publication record not found.', 404);
    await this.repo.update(id, institutionId, input, userId);
  }

  async delete(institutionId: string, id: string, userId?: string): Promise<void> {
    const existing = await this.repo.getById(id, institutionId);
    if (!existing) throw new FacultyResearchServiceError('Publication record not found.', 404);
    await this.repo.softDelete(id, institutionId, userId);
  }

  async getById(institutionId: string, id: string) {
    const existing = await this.repo.getById(id, institutionId);
    if (!existing) throw new FacultyResearchServiceError('Publication record not found.', 404);
    return existing;
  }
}
