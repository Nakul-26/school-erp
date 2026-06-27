import { HomeworkRepository } from './homework.repository';
import { CreateHomeworkInput } from './homework.types';

export class HomeworkService {
  constructor(private repo: HomeworkRepository) {}

  async create(institutionId: string, input: CreateHomeworkInput, userId?: string): Promise<string> {
    const id = crypto.randomUUID();
    await this.repo.create(id, institutionId, input, userId);
    return id;
  }

  async list(institutionId: string, sectionId?: string, subjectId?: string): Promise<any[]> {
    return await this.repo.list(institutionId, sectionId, subjectId);
  }

  async update(id: string, title: string, description: string | null, dueDate: string, userId?: string): Promise<void> {
    await this.repo.update(id, title, description, dueDate, userId);
  }

  async delete(id: string, userId?: string): Promise<void> {
    await this.repo.softDelete(id, userId);
  }
}
