export interface Institution {
  id: string;
  name: string;
  address?: string;
  contact_email?: string;
  contact_phone?: string;
  institution_type: 'school' | 'pu_college' | 'degree_college' | 'engineering_college';
  is_active: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  created_by?: string;
  updated_by?: string;
}

export type CreateInstitutionInput = Omit<Institution, 'id' | 'is_active' | 'created_at' | 'updated_at' | 'deleted_at' | 'created_by' | 'updated_by'>;
export type UpdateInstitutionInput = Partial<CreateInstitutionInput>;
