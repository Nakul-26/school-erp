import { StudyMaterialsRepository } from './study-materials.repository';
import { CreateStudyMaterialInput } from './study-materials.types';

export class StudyMaterialsServiceError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

export class StudyMaterialsService {
  constructor(private repo: StudyMaterialsRepository) {}

  async create(institutionId: string, input: CreateStudyMaterialInput, userId?: string): Promise<string> {
    if (!input.section_id || !input.subject_id || !input.teacher_id) {
      throw new StudyMaterialsServiceError('section_id, subject_id, and teacher_id are required.', 400);
    }
    if (!input.title || input.title.trim().length < 2) {
      throw new StudyMaterialsServiceError('A title is required.', 400);
    }
    if (!input.file_key && !input.external_url) {
      throw new StudyMaterialsServiceError('Either an uploaded file or an external URL is required.', 400);
    }
    const id = crypto.randomUUID();
    await this.repo.create(id, institutionId, input, userId);
    return id;
  }

  async listForInstitution(institutionId: string, sectionId?: string, subjectId?: string) {
    return this.repo.listForInstitution(institutionId, sectionId, subjectId);
  }

  async listForTeacher(institutionId: string, teacherId: string, sectionId?: string, subjectId?: string) {
    return this.repo.listForTeacher(institutionId, teacherId, sectionId, subjectId);
  }

  async listForSection(institutionId: string, sectionId: string, subjectId?: string) {
    return this.repo.listForSection(institutionId, sectionId, subjectId);
  }

  async delete(institutionId: string, id: string, userId?: string): Promise<string | null> {
    const existing = await this.repo.getById(id, institutionId);
    if (!existing) throw new StudyMaterialsServiceError('Study material not found.', 404);
    await this.repo.softDelete(id, institutionId, userId);
    return existing.file_key;
  }

  async getById(institutionId: string, id: string) {
    const existing = await this.repo.getById(id, institutionId);
    if (!existing) throw new StudyMaterialsServiceError('Study material not found.', 404);
    return existing;
  }
}
