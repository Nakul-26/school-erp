export interface Notification {
  id: string;
  institution_id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'exam' | 'attendance' | 'result' | 'announcement' | 'general';
  is_read: number; // 0 or 1
  created_at: string;
  read_at?: string | null;
}

export interface CreateNotificationInput {
  user_id: string;
  title: string;
  message: string;
  type: 'exam' | 'attendance' | 'result' | 'announcement' | 'general';
}
