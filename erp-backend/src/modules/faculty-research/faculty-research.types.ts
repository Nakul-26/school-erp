export type PublicationType = 'JOURNAL' | 'CONFERENCE' | 'BOOK' | 'BOOK_CHAPTER' | 'PATENT' | 'OTHER';

export interface FacultyPublication {
  id: string;
  institution_id: string;
  teacher_id: string;
  title: string;
  publication_type: PublicationType;
  venue_name: string | null;
  publication_date: string | null;
  co_authors: string | null;
  doi_or_url: string | null;
  description: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;

  teacher_first?: string;
  teacher_last?: string;
  employee_id?: string;
}

export interface CreatePublicationInput {
  teacher_id: string;
  title: string;
  publication_type?: PublicationType;
  venue_name?: string;
  publication_date?: string;
  co_authors?: string;
  doi_or_url?: string;
  description?: string;
}

export type UpdatePublicationInput = Partial<Omit<CreatePublicationInput, 'teacher_id'>>;
