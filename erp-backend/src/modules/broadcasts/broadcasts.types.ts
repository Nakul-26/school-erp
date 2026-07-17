export interface Broadcast {
  id: string;
  institution_id: string;
  created_by: string;
  subject: string;
  body: string;
  category: string;
  priority: string;
  recipient_type: string;
  recipient_filter: string; // JSON string
  channel: string;
  status: string;
  expires_at: string | null;
  sent_at: string | null;
  scheduled_at: string | null;
  total_recipients: number;
  delivered_count: number;
  read_count: number;
  created_at: string;
  updated_at: string;
  is_active: number;
}

export interface RecipientFilter {
  type: 'class' | 'section' | 'department' | 'role' | 'all' | 'custom';
  classIds?: string[];
  sectionIds?: string[];
  departmentIds?: string[];
  roles?: string[];
  userIds?: string[];
  includeStudents: boolean;
  includeParents: boolean;
  includeTeachers: boolean;
}

export interface BroadcastRecipient {
  id: string;
  broadcast_id: string;
  user_id: string;
  is_read: number;
  read_at: string | null;
  delivered_at: string;
}

export interface BroadcastAttachment {
  id: string;
  broadcast_id: string;
  file_name: string;
  file_url: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
}

export type CreateBroadcastInput = Omit<
  Broadcast,
  'id' | 'institution_id' | 'created_by' | 'total_recipients' | 'delivered_count' | 'read_count' | 'created_at' | 'updated_at' | 'is_active' | 'sent_at' | 'scheduled_at'
> & {
  scheduled_at?: string | null;
  attachments?: {
    file_name: string;
    file_url: string;
    mime_type?: string;
    size_bytes?: number;
  }[];
};

export type UpdateBroadcastInput = Partial<CreateBroadcastInput> & Partial<Pick<Broadcast, 'is_active' | 'sent_at' | 'total_recipients' | 'delivered_count' | 'read_count'>>;
