export interface AuditLogEntry {
  id: string;
  institution_id?: string;
  user_id?: string;
  user_name?: string;
  user_role?: string;
  module: string;
  entity_type?: string;
  entity_id?: string;
  record_id?: string;
  action: string;
  event_name?: string;
  description?: string;
  before_json?: string;
  after_json?: string;
  ip_address?: string;
  user_agent?: string;
  request_id?: string;
  status: string;
  reason?: string;
  timestamp: string;
}

export interface AuditLogQueryFilters {
  institution_id: string;
  module?: string;
  entity_type?: string;
  entity_id?: string;
  user_id?: string;
  action?: string;
  event_name?: string;
  request_id?: string;
  status?: string;
  from_date?: string;
  to_date?: string;
  search?: string;
  page?: number;
  limit?: number;
}
