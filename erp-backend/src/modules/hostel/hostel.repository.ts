import {
  HostelBlock, CreateBlockInput, UpdateBlockInput,
  HostelRoom, CreateRoomInput, UpdateRoomInput,
  HostelAllocation, CreateAllocationInput,
} from './hostel.types';

export class HostelRepository {
  constructor(private db: any) {}

  // ==================== BLOCKS ==================== //

  async listBlocks(institutionId: string): Promise<HostelBlock[]> {
    const res = await this.db.prepare(
      `SELECT * FROM hostel_blocks WHERE institution_id = ? AND is_active = 1 ORDER BY name ASC`
    ).bind(institutionId).all();
    return (res.results || []) as HostelBlock[];
  }

  async getBlock(id: string, institutionId: string): Promise<HostelBlock | null> {
    const row = await this.db.prepare(
      `SELECT * FROM hostel_blocks WHERE id = ? AND institution_id = ? AND is_active = 1`
    ).bind(id, institutionId).first();
    return row ? (row as HostelBlock) : null;
  }

  async createBlock(id: string, institutionId: string, input: CreateBlockInput, userId?: string): Promise<void> {
    const now = new Date().toISOString();
    await this.db.prepare(
      `INSERT INTO hostel_blocks (id, institution_id, name, block_type, warden_name, warden_phone, address, created_at, updated_at, created_by, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      id, institutionId, input.name, input.block_type || 'CO_ED',
      input.warden_name || null, input.warden_phone || null, input.address || null,
      now, now, userId || null, userId || null
    ).run();
  }

  async updateBlock(id: string, institutionId: string, input: UpdateBlockInput, userId?: string): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];
    for (const [key, value] of Object.entries(input)) {
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }
    if (fields.length === 0) return;
    fields.push('updated_at = ?', 'updated_by = ?');
    values.push(new Date().toISOString(), userId || null, id, institutionId);
    await this.db.prepare(
      `UPDATE hostel_blocks SET ${fields.join(', ')} WHERE id = ? AND institution_id = ?`
    ).bind(...values).run();
  }

  async deleteBlock(id: string, institutionId: string): Promise<void> {
    await this.db.prepare(
      `UPDATE hostel_blocks SET is_active = 0, updated_at = ? WHERE id = ? AND institution_id = ?`
    ).bind(new Date().toISOString(), id, institutionId).run();
  }

  // ==================== ROOMS ==================== //

  async listRooms(institutionId: string, blockId?: string): Promise<HostelRoom[]> {
    let query = `
      SELECT r.*, b.name as block_name,
        (SELECT COUNT(*) FROM hostel_allocations a WHERE a.room_id = r.id AND a.status = 'ACTIVE') as occupied_count
      FROM hostel_rooms r
      JOIN hostel_blocks b ON b.id = r.block_id
      WHERE r.institution_id = ? AND r.is_active = 1`;
    const params: any[] = [institutionId];
    if (blockId) {
      query += ` AND r.block_id = ?`;
      params.push(blockId);
    }
    query += ` ORDER BY b.name ASC, r.room_number ASC`;
    const res = await this.db.prepare(query).bind(...params).all();
    return (res.results || []) as HostelRoom[];
  }

  async getRoom(id: string, institutionId: string): Promise<HostelRoom | null> {
    const row = await this.db.prepare(
      `SELECT r.*, b.name as block_name,
        (SELECT COUNT(*) FROM hostel_allocations a WHERE a.room_id = r.id AND a.status = 'ACTIVE') as occupied_count
       FROM hostel_rooms r JOIN hostel_blocks b ON b.id = r.block_id
       WHERE r.id = ? AND r.institution_id = ? AND r.is_active = 1`
    ).bind(id, institutionId).first();
    return row ? (row as HostelRoom) : null;
  }

  async createRoom(id: string, institutionId: string, input: CreateRoomInput, userId?: string): Promise<void> {
    const now = new Date().toISOString();
    await this.db.prepare(
      `INSERT INTO hostel_rooms (id, institution_id, block_id, room_number, floor, capacity, room_type, monthly_charge, created_at, updated_at, created_by, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      id, institutionId, input.block_id, input.room_number, input.floor || null,
      input.capacity ?? 1, input.room_type || 'SHARED', input.monthly_charge ?? 0.0,
      now, now, userId || null, userId || null
    ).run();
  }

  async updateRoom(id: string, institutionId: string, input: UpdateRoomInput, userId?: string): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];
    for (const [key, value] of Object.entries(input)) {
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }
    if (fields.length === 0) return;
    fields.push('updated_at = ?', 'updated_by = ?');
    values.push(new Date().toISOString(), userId || null, id, institutionId);
    await this.db.prepare(
      `UPDATE hostel_rooms SET ${fields.join(', ')} WHERE id = ? AND institution_id = ?`
    ).bind(...values).run();
  }

  async deleteRoom(id: string, institutionId: string): Promise<void> {
    await this.db.prepare(
      `UPDATE hostel_rooms SET is_active = 0, updated_at = ? WHERE id = ? AND institution_id = ?`
    ).bind(new Date().toISOString(), id, institutionId).run();
  }

  // ==================== ALLOCATIONS ==================== //

  async listAllocations(institutionId: string, filters: { roomId?: string; blockId?: string } = {}): Promise<HostelAllocation[]> {
    let query = `
      SELECT a.*, s.first_name || ' ' || COALESCE(s.last_name, '') as student_name, s.admission_number,
        r.room_number, r.monthly_charge, b.name as block_name
      FROM hostel_allocations a
      JOIN students s ON s.id = a.student_id
      JOIN hostel_rooms r ON r.id = a.room_id
      JOIN hostel_blocks b ON b.id = r.block_id
      WHERE a.institution_id = ? AND a.status = 'ACTIVE'`;
    const params: any[] = [institutionId];
    if (filters.roomId) {
      query += ` AND a.room_id = ?`;
      params.push(filters.roomId);
    }
    if (filters.blockId) {
      query += ` AND r.block_id = ?`;
      params.push(filters.blockId);
    }
    query += ` ORDER BY b.name ASC, r.room_number ASC, s.first_name ASC`;
    const res = await this.db.prepare(query).bind(...params).all();
    return (res.results || []) as HostelAllocation[];
  }

  async getActiveAllocationForStudent(studentId: string, institutionId: string): Promise<HostelAllocation | null> {
    const row = await this.db.prepare(`
      SELECT a.*, r.room_number, r.monthly_charge, b.name as block_name
      FROM hostel_allocations a
      JOIN hostel_rooms r ON r.id = a.room_id
      JOIN hostel_blocks b ON b.id = r.block_id
      WHERE a.student_id = ? AND a.institution_id = ? AND a.status = 'ACTIVE'
    `).bind(studentId, institutionId).first();
    return row ? (row as HostelAllocation) : null;
  }

  async getAllocation(id: string, institutionId: string): Promise<HostelAllocation | null> {
    const row = await this.db.prepare(
      `SELECT * FROM hostel_allocations WHERE id = ? AND institution_id = ?`
    ).bind(id, institutionId).first();
    return row ? (row as HostelAllocation) : null;
  }

  async createAllocation(id: string, institutionId: string, input: CreateAllocationInput, userId?: string): Promise<void> {
    const now = new Date().toISOString();
    await this.db.prepare(
      `INSERT INTO hostel_allocations (id, institution_id, student_id, room_id, bed_label, allocated_date, status, created_at, updated_at, created_by, updated_by)
       VALUES (?, ?, ?, ?, ?, date('now'), 'ACTIVE', ?, ?, ?, ?)`
    ).bind(
      id, institutionId, input.student_id, input.room_id, input.bed_label || null,
      now, now, userId || null, userId || null
    ).run();
  }

  async vacateAllocation(id: string, institutionId: string, userId?: string): Promise<void> {
    await this.db.prepare(
      `UPDATE hostel_allocations SET status = 'VACATED', vacated_date = date('now'), updated_at = ?, updated_by = ?
       WHERE id = ? AND institution_id = ?`
    ).bind(new Date().toISOString(), userId || null, id, institutionId).run();
  }

  async countActiveOccupants(roomId: string): Promise<number> {
    const row: any = await this.db.prepare(
      `SELECT COUNT(*) as cnt FROM hostel_allocations WHERE room_id = ? AND status = 'ACTIVE'`
    ).bind(roomId).first();
    return row?.cnt || 0;
  }

  async listActiveAllocationsForBilling(institutionId: string): Promise<{
    student_id: string; monthly_charge: number; academic_year_id: string; course_id: string; semester: number;
  }[]> {
    const res = await this.db.prepare(`
      SELECT a.student_id, r.monthly_charge, sen.academic_year_id, sen.course_id, sen.semester
      FROM hostel_allocations a
      JOIN hostel_rooms r ON r.id = a.room_id
      JOIN student_enrollments sen ON sen.student_id = a.student_id AND sen.is_active = 1
      WHERE a.institution_id = ? AND a.status = 'ACTIVE'
    `).bind(institutionId).all();
    return (res.results || []) as any[];
  }
}
