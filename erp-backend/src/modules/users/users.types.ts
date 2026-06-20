export interface User {
  id: string;
  institution_id: string;
  username: string;
  email: string;
  password_hash: string;
  roles: string[];
  role?: string;
  name: string;
  phone?: string;
  reset_token?: string;
  reset_expires?: string;
  is_active: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  created_by?: string;
  updated_by?: string;
}

export type CreateUserInput = Omit<User, 'id' | 'password_hash' | 'is_active' | 'created_at' | 'updated_at' | 'deleted_at' | 'created_by' | 'updated_by' | 'reset_token' | 'reset_expires'>;
export type UpdateUserInput = Partial<Omit<CreateUserInput, 'institution_id' | 'username' | 'email'>>;
