export interface MessageTemplate {
  id: string;
  institution_id: string;
  name: string;
  category: string;
  subject: string;
  body: string;
  is_active: number;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export type CreateMessageTemplateInput = Omit<MessageTemplate, 'id' | 'institution_id' | 'created_at' | 'updated_at'>;
export type UpdateMessageTemplateInput = Partial<CreateMessageTemplateInput>;
