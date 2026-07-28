import { TimetableSlotRepository } from './timetable-slots.repository';
import { TimetableSlot, CreateTimetableSlotInput, UpdateTimetableSlotInput } from './timetable-slots.types';

export class TimetableSlotServiceError extends Error {
  constructor(message: string, public statusCode: number = 400) {
    super(message);
    this.name = 'TimetableSlotServiceError';
  }
}

export class TimetableSlotService {
  constructor(private repo: TimetableSlotRepository) {}

  private validateSlotTime(startTime?: string, endTime?: string): void {
    if (startTime && endTime) {
      if (startTime >= endTime) {
        throw new TimetableSlotServiceError(`Slot start time (${startTime}) must be earlier than end time (${endTime}).`, 400);
      }
    }
  }

  async createSlot(institutionId: string, input: CreateTimetableSlotInput, userId?: string): Promise<string> {
    if (!input.name || !input.start_time || !input.end_time) {
      throw new TimetableSlotServiceError('Slot name, start time, and end time are required.', 400);
    }
    this.validateSlotTime(input.start_time, input.end_time);

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
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new TimetableSlotServiceError('Timetable slot not found.', 404);
    }

    const startTime = input.start_time || existing.start_time;
    const endTime = input.end_time || existing.end_time;
    this.validateSlotTime(startTime, endTime);

    await this.repo.update(id, input, userId);
  }

  async deleteSlot(id: string, userId?: string): Promise<void> {
    await this.repo.softDelete(id, userId);
  }
}
