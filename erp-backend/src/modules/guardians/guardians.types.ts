export interface Guardian {
  id: string;
  student_id: string;
  user_id?: string;
  name: string;
  relationship: string;
  phone?: string;
  email?: string;
  occupation?: string;
  is_active: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  created_by?: string;
  updated_by?: string;
}

export type CreateGuardianInput = Omit<Guardian, 'id' | 'is_active' | 'created_at' | 'updated_at' | 'deleted_at' | 'created_by' | 'updated_by'>;
export type UpdateGuardianInput = Partial<CreateGuardianInput>;
