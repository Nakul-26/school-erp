export type BlockType = 'BOYS' | 'GIRLS' | 'CO_ED';
export type RoomType = 'SINGLE' | 'SHARED' | 'DORM';
export type AllocationStatus = 'ACTIVE' | 'VACATED';

export interface HostelBlock {
  id: string;
  institution_id: string;
  name: string;
  block_type: BlockType;
  warden_name: string | null;
  warden_phone: string | null;
  address: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface CreateBlockInput {
  name: string;
  block_type?: BlockType;
  warden_name?: string;
  warden_phone?: string;
  address?: string;
}

export type UpdateBlockInput = Partial<CreateBlockInput>;

export interface HostelRoom {
  id: string;
  institution_id: string;
  block_id: string;
  room_number: string;
  floor: string | null;
  capacity: number;
  room_type: RoomType;
  monthly_charge: number;
  is_active: number;
  created_at: string;
  updated_at: string;

  block_name?: string;
  occupied_count?: number;
}

export interface CreateRoomInput {
  block_id: string;
  room_number: string;
  floor?: string;
  capacity?: number;
  room_type?: RoomType;
  monthly_charge?: number;
}

export type UpdateRoomInput = Partial<Omit<CreateRoomInput, 'block_id'>>;

export interface HostelAllocation {
  id: string;
  institution_id: string;
  student_id: string;
  room_id: string;
  bed_label: string | null;
  allocated_date: string;
  vacated_date: string | null;
  status: AllocationStatus;
  is_active: number;
  created_at: string;
  updated_at: string;

  student_name?: string;
  admission_number?: string;
  room_number?: string;
  block_name?: string;
  monthly_charge?: number;
}

export interface CreateAllocationInput {
  student_id: string;
  room_id: string;
  bed_label?: string;
}
