export interface Department {
  id: string;
  institution_id: string;
  name: string;
  code: string;
  description?: string;
  is_active: number;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string;
  created_by?: string;
  updated_by?: string;
}

export interface CreateDepartmentInput {
  name: string;
  code: string;
  description?: string;
}

export interface UpdateDepartmentInput {
  name?: string;
  code?: string;
  description?: string;
}
