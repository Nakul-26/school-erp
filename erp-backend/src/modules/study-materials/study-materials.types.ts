export type MaterialType = 'DOCUMENT' | 'VIDEO' | 'LINK' | 'PRESENTATION' | 'OTHER';

export interface StudyMaterial {
  id: string;
  institution_id: string;
  section_id: string;
  subject_id: string;
  teacher_id: string;
  title: string;
  description: string | null;
  material_type: MaterialType;
  file_key: string | null;
  external_url: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;

  section_name?: string;
  subject_name?: string;
  subject_code?: string;
  teacher_first?: string;
  teacher_last?: string;
}

export interface CreateStudyMaterialInput {
  section_id: string;
  subject_id: string;
  teacher_id: string;
  title: string;
  description?: string;
  material_type?: MaterialType;
  file_key?: string;
  external_url?: string;
}
