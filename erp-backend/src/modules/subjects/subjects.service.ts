import { SubjectRepository } from './subjects.repository';
import { Subject, CreateSubjectInput, UpdateSubjectInput } from './subjects.types';

export class SubjectService {
  constructor(private repo: SubjectRepository) {}

  async createSubject(institutionId: string, input: CreateSubjectInput, userId?: string): Promise<string> {
    const id = crypto.randomUUID();
    await this.repo.create(id, institutionId, input, userId);
    return id;
  }

  async getSubject(id: string): Promise<Subject | null> {
    return await this.repo.findById(id);
  }

  async listSubjects(institutionId: string, filters?: { course_id?: string; semester?: number }): Promise<Subject[]> {
    return await this.repo.listByInstitution(institutionId, filters);
  }

  async updateSubject(id: string, input: UpdateSubjectInput, userId?: string): Promise<void> {
    await this.repo.update(id, input, userId);
  }

  async deleteSubject(id: string, userId?: string): Promise<void> {
    await this.repo.softDelete(id, userId);
  }
}
