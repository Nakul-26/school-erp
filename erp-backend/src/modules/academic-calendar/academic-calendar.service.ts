import { AcademicCalendarRepository } from './academic-calendar.repository';
import { AcademicCalendarEntry, CreateCalendarEntryInput, UpdateCalendarEntryInput } from './academic-calendar.types';

export class AcademicCalendarService {
  constructor(private repo: AcademicCalendarRepository) {}

  async createCalendarEntry(institutionId: string, input: CreateCalendarEntryInput, userId?: string): Promise<string> {
    const id = crypto.randomUUID();
    await this.repo.create(id, institutionId, input, userId);
    return id;
  }

  async getCalendarEntry(id: string): Promise<AcademicCalendarEntry | null> {
    return await this.repo.findById(id);
  }

  async listCalendarEntries(institutionId: string): Promise<AcademicCalendarEntry[]> {
    return await this.repo.listByInstitution(institutionId);
  }

  async updateCalendarEntry(id: string, input: UpdateCalendarEntryInput, userId?: string): Promise<void> {
    await this.repo.update(id, input, userId);
  }

  async deleteCalendarEntry(id: string, userId?: string): Promise<void> {
    await this.repo.softDelete(id, userId);
  }
}
