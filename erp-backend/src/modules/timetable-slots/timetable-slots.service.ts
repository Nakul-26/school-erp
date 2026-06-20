import { TimetableSlotRepository } from './timetable-slots.repository';
import { TimetableSlot, CreateTimetableSlotInput, UpdateTimetableSlotInput } from './timetable-slots.types';

export class TimetableSlotService {
  constructor(private repo: TimetableSlotRepository) {}

  async createSlot(institutionId: string, input: CreateTimetableSlotInput, userId?: string): Promise<string> {
    const id = crypto.randomUUID();
    await this.repo.create(id, institutionId, input, userId);
    return id;
  }

  async getSlot(id: string): Promise<TimetableSlot | null> {
    return await this.repo.findById(id);
  }

  async listSlots(institutionId: string): Promise<TimetableSlot[]> {
    return await this.repo.listByInstitution(institutionId);
  }

  async updateSlot(id: string, input: UpdateTimetableSlotInput, userId?: string): Promise<void> {
    await this.repo.update(id, input, userId);
  }

  async deleteSlot(id: string, userId?: string): Promise<void> {
    await this.repo.softDelete(id, userId);
  }
}
