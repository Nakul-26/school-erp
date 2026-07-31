export type KPICategory = 'Academic' | 'Finance' | 'Platform' | 'Security';
export type KPITrend = 'UP' | 'DOWN' | 'STABLE';
export type ReportFormat = 'JSON' | 'CSV';
export type ReportType = 'AcademicSummary' | 'ExecutiveFinance' | 'SystemOperations' | 'SecurityAudit';

export interface DailyAnalytics {
  id: string;
  institution_id: string;
  date: string;
  total_students: number;
  total_teachers: number;
  attendance_rate_pct: number;
  absent_count: number;
  fee_collection_amount: number;
  pending_fees_amount: number;
  pass_rate_pct: number;
  notifications_sent: number;
  storage_used_mb: number;
  jobs_executed_count: number;
  audit_events_count: number;
  created_at: string;
  updated_at: string;
}

export interface MonthlyAnalytics {
  id: string;
  institution_id: string;
  year_month: string;
  avg_attendance_pct: number;
  total_revenue: number;
  new_enrollments: number;
  documents_uploaded_count: number;
  jobs_executed_count: number;
  created_at: string;
  updated_at: string;
}

export interface KPISnapshot {
  id: string;
  institution_id: string;
  category: KPICategory;
  kpi_key: string;
  kpi_value: number;
  previous_value: number;
  change_pct: number;
  trend: KPITrend;
  unit: string;
  last_updated_at: string;
}

export interface AnalyticsEvent {
  id: string;
  institution_id: string;
  event_type: string;
  event_count: number;
  date: string;
  created_at: string;
}

export interface ScheduledReport {
  id: string;
  institution_id: string;
  name: string;
  report_type: ReportType;
  schedule_cron: string;
  recipients_json: string;
  filters_json?: string | null;
  format: ReportFormat;
  is_active: number;
  last_sent_at?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReportFilterDTO {
  institutionId: string;
  reportType: ReportType;
  startDate?: string;
  endDate?: string;
  departmentId?: string;
  sectionId?: string;
  format?: ReportFormat;
}
