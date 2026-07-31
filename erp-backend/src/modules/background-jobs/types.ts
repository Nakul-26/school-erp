export type JobStatus = 'PENDING' | 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'RETRYING' | 'DEAD_LETTER' | 'CANCELLED' | 'PAUSED';
export type JobPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export interface BackgroundJob {
  id: string;
  job_type: string;
  queue_name: string;
  payload_json: string | null;
  status: JobStatus;
  priority: JobPriority;
  attempts: number;
  max_attempts: number;
  scheduled_at: string;
  started_at?: string | null;
  completed_at?: string | null;
  failed_at?: string | null;
  next_retry_at?: string | null;
  failure_reason?: string | null;
  worker_id?: string | null;
  created_by?: string | null;
  institution_id: string;
  created_at: string;
  updated_at: string;
}

export interface JobCronSchedule {
  id: string;
  job_type: string;
  name: string;
  cron_expression: string;
  payload_json?: string | null;
  queue_name?: string;
  priority?: JobPriority;
  is_active: number;
  institution_id: string;
  last_run_at?: string | null;
  next_run_at?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface JobWorker {
  id: string;
  name: string;
  status: 'HEALTHY' | 'BUSY' | 'UNHEALTHY' | 'OFFLINE';
  current_job_id?: string | null;
  current_job_type?: string | null;
  last_heartbeat_at: string;
  cpu_usage_pct: number;
  memory_usage_mb: number;
  jobs_completed_count: number;
  jobs_failed_count: number;
  institution_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface JobExecutionHistory {
  id: string;
  job_id: string;
  job_type: string;
  worker_id: string;
  attempt_number: number;
  status: 'SUCCESS' | 'FAILED';
  started_at: string;
  completed_at: string;
  duration_ms: number;
  execution_log?: string | null;
  error_message?: string | null;
  stack_trace?: string | null;
  institution_id: string;
  created_at: string;
}

export interface JobHandlerContext {
  db: any;
  env: any;
  job: BackgroundJob;
  log: (message: string) => void;
}

export interface JobHandlerResult {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
  stack?: string;
}

export type JobHandler = (payload: any, ctx: JobHandlerContext) => Promise<JobHandlerResult>;

export interface EnqueueJobDTO {
  jobType: string;
  payload?: Record<string, any>;
  queueName?: string;
  priority?: JobPriority;
  maxAttempts?: number;
  scheduledAt?: string;
  delaySeconds?: number;
  createdBy?: string;
  institutionId: string;
}

export interface CronScheduleDTO {
  jobType: string;
  name: string;
  cronExpression: string;
  payload?: Record<string, any>;
  queueName?: string;
  priority?: JobPriority;
  createdBy?: string;
  institutionId: string;
}
