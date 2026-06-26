export interface Announcement {
  id: string;
  institution_id: string;
  title: string;
  content: string;
  visible_to_students: number; // 0 or 1
  visible_to_teachers: number; // 0 or 1
  visible_to_parents: number;  // 0 or 1
  section_id?: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  created_by?: string;
  updated_by?: string;
}

export type CreateAnnouncementInput = Omit<Announcement, 'id' | 'institution_id' | 'is_active' | 'created_at' | 'updated_at' | 'deleted_at' | 'created_by' | 'updated_by'>;
export type UpdateAnnouncementInput = Partial<CreateAnnouncementInput>;
