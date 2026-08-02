import { HostelRepository } from './hostel.repository';
import { CreateBlockInput, UpdateBlockInput, CreateRoomInput, UpdateRoomInput, CreateAllocationInput } from './hostel.types';

export class HostelServiceError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

export class HostelService {
  constructor(private repo: HostelRepository, private db: any) {}

  // ---- Blocks ----
  async listBlocks(institutionId: string) {
    return this.repo.listBlocks(institutionId);
  }

  async createBlock(institutionId: string, input: CreateBlockInput, userId?: string): Promise<string> {
    if (!input.name || input.name.trim().length < 2) {
      throw new HostelServiceError('Block name is required.', 400);
    }
    const id = crypto.randomUUID();
    await this.repo.createBlock(id, institutionId, input, userId);
    return id;
  }

  async updateBlock(institutionId: string, id: string, input: UpdateBlockInput, userId?: string): Promise<void> {
    const existing = await this.repo.getBlock(id, institutionId);
    if (!existing) throw new HostelServiceError('Hostel block not found.', 404);
    await this.repo.updateBlock(id, institutionId, input, userId);
  }

  async deleteBlock(institutionId: string, id: string): Promise<void> {
    const existing = await this.repo.getBlock(id, institutionId);
    if (!existing) throw new HostelServiceError('Hostel block not found.', 404);
    await this.repo.deleteBlock(id, institutionId);
  }

  // ---- Rooms ----
  async listRooms(institutionId: string, blockId?: string) {
    return this.repo.listRooms(institutionId, blockId);
  }

  async createRoom(institutionId: string, input: CreateRoomInput, userId?: string): Promise<string> {
    if (!input.block_id) throw new HostelServiceError('block_id is required.', 400);
    if (!input.room_number || input.room_number.trim().length === 0) {
      throw new HostelServiceError('Room number is required.', 400);
    }
    const block = await this.repo.getBlock(input.block_id, institutionId);
    if (!block) throw new HostelServiceError('Hostel block not found.', 404);
    if (input.capacity !== undefined && input.capacity < 1) {
      throw new HostelServiceError('Room capacity must be at least 1.', 400);
    }
    const id = crypto.randomUUID();
    try {
      await this.repo.createRoom(id, institutionId, input, userId);
    } catch (err: any) {
      if (String(err?.message || '').includes('UNIQUE')) {
        throw new HostelServiceError('This room number already exists in the selected block.', 409);
      }
      throw err;
    }
    return id;
  }

  async updateRoom(institutionId: string, id: string, input: UpdateRoomInput, userId?: string): Promise<void> {
    const existing = await this.repo.getRoom(id, institutionId);
    if (!existing) throw new HostelServiceError('Hostel room not found.', 404);
    if (input.capacity !== undefined) {
      if (input.capacity < 1) throw new HostelServiceError('Room capacity must be at least 1.', 400);
      const occupied = await this.repo.countActiveOccupants(id);
      if (input.capacity < occupied) {
        throw new HostelServiceError(`Cannot reduce capacity below the ${occupied} student(s) currently occupying this room.`, 409);
      }
    }
    await this.repo.updateRoom(id, institutionId, input, userId);
  }

  async deleteRoom(institutionId: string, id: string): Promise<void> {
    const existing = await this.repo.getRoom(id, institutionId);
    if (!existing) throw new HostelServiceError('Hostel room not found.', 404);
    if ((existing.occupied_count || 0) > 0) {
      throw new HostelServiceError('Cannot delete a room with active occupants — vacate them first.', 409);
    }
    await this.repo.deleteRoom(id, institutionId);
  }

  // ---- Allocations ----
  async listAllocations(institutionId: string, filters: { roomId?: string; blockId?: string } = {}) {
    return this.repo.listAllocations(institutionId, filters);
  }

  async getStudentAllocation(institutionId: string, studentId: string) {
    return this.repo.getActiveAllocationForStudent(studentId, institutionId);
  }

  async allocateRoom(institutionId: string, input: CreateAllocationInput, userId?: string): Promise<string> {
    if (!input.student_id || !input.room_id) {
      throw new HostelServiceError('student_id and room_id are required.', 400);
    }
    const room = await this.repo.getRoom(input.room_id, institutionId);
    if (!room) throw new HostelServiceError('Hostel room not found.', 404);

    const existingForStudent = await this.repo.getActiveAllocationForStudent(input.student_id, institutionId);
    if (existingForStudent) {
      throw new HostelServiceError('This student already has an active hostel allocation — vacate it before reassigning.', 409);
    }

    const occupied = await this.repo.countActiveOccupants(input.room_id);
    if (occupied >= room.capacity) {
      throw new HostelServiceError(`Room ${room.room_number} is at full capacity (${room.capacity}).`, 409);
    }

    const id = crypto.randomUUID();
    try {
      await this.repo.createAllocation(id, institutionId, input, userId);
    } catch (err: any) {
      if (String(err?.message || '').includes('UNIQUE')) {
        throw new HostelServiceError('This student already has an active hostel allocation.', 409);
      }
      throw err;
    }
    return id;
  }

  async vacateAllocation(institutionId: string, id: string, userId?: string): Promise<void> {
    const existing = await this.repo.getAllocation(id, institutionId);
    if (!existing) throw new HostelServiceError('Hostel allocation not found.', 404);
    if (existing.status === 'VACATED') throw new HostelServiceError('This allocation is already vacated.', 400);
    await this.repo.vacateAllocation(id, institutionId, userId);
  }

  // ---- Billing (matches Transport's manual "generate for the month" pattern) ----
  async generateMonthlyBilling(institutionId: string, dueDate: string, billingMonthName: string): Promise<{ billed: number; skipped: number }> {
    if (!dueDate || !billingMonthName) {
      throw new HostelServiceError('due_date and billing_month_name are required.', 400);
    }
    const allocations = await this.repo.listActiveAllocationsForBilling(institutionId);
    const feeTypeName = `Hostel Fee - ${billingMonthName}`;
    let billed = 0;
    let skipped = 0;

    for (const alloc of allocations) {
      const already = await this.db.prepare(
        `SELECT id FROM student_fee_records WHERE student_id = ? AND fee_type = ? AND is_active = 1`
      ).bind(alloc.student_id, feeTypeName).first();

      if (already) {
        skipped++;
        continue;
      }

      await this.db.prepare(`
        INSERT INTO student_fee_records (
          id, institution_id, student_id, academic_year_id, course_id,
          year_number, fee_type, total_amount, paid_amount, due_date, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0.0, ?, 'UNPAID')
      `).bind(
        crypto.randomUUID(), institutionId, alloc.student_id, alloc.academic_year_id, alloc.course_id,
        alloc.semester, feeTypeName, alloc.monthly_charge, dueDate
      ).run();
      billed++;
    }

    return { billed, skipped };
  }
}
