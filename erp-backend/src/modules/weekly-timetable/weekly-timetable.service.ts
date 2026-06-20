import { WeeklyTimetableRepository } from './weekly-timetable.repository';
import { WeeklyTimetableEntry, CreateWeeklyTimetableInput, UpdateWeeklyTimetableInput } from './weekly-timetable.types';

export class WeeklyTimetableService {
  constructor(private repo: WeeklyTimetableRepository) {}

  async createEntry(institutionId: string, input: CreateWeeklyTimetableInput, userId?: string): Promise<string> {
    const id = crypto.randomUUID();
    await this.repo.create(id, institutionId, input, userId);
    return id;
  }

  async getEntry(id: string): Promise<WeeklyTimetableEntry | null> {
    return await this.repo.findById(id);
  }

  async listEntries(institutionId: string): Promise<WeeklyTimetableEntry[]> {
    return await this.repo.listByInstitution(institutionId);
  }

  async listEntriesBySection(institutionId: string, sectionId: string): Promise<WeeklyTimetableEntry[]> {
    return await this.repo.listBySection(institutionId, sectionId);
  }

  async listEntriesByTeacher(institutionId: string, teacherId: string): Promise<WeeklyTimetableEntry[]> {
    return await this.repo.listByTeacher(institutionId, teacherId);
  }

  async updateEntry(id: string, input: UpdateWeeklyTimetableInput, userId?: string): Promise<void> {
    await this.repo.update(id, input, userId);
  }

  async deleteEntry(id: string, userId?: string): Promise<void> {
    await this.repo.softDelete(id, userId);
  }
}
