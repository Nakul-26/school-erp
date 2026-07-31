import { BackgroundJob, JobCronSchedule, JobWorker, JobExecutionHistory, JobStatus, JobPriority } from './types';

export class BackgroundJobsRepository {
  constructor(private db: any) {}

  // ==================== BACKGROUND JOBS ==================== //

  async createJob(data: {
    id: string;
    job_type: string;
    queue_name?: string;
    payload_json?: string | null;
    status?: JobStatus;
    priority?: JobPriority;
    attempts?: number;
    max_attempts?: number;
    scheduled_at: string;
    created_by?: string | null;
    institution_id: string;
  }): Promise<BackgroundJob> {
    const queueName = data.queue_name || 'default';
    const status = data.status || 'PENDING';
    const priority = data.priority || 'NORMAL';
    const attempts = data.attempts || 0;
    const maxAttempts = data.max_attempts || 3;
    const now = new Date().toISOString();

    await this.db.prepare(
      `INSERT INTO background_jobs (
        id, job_type, queue_name, payload_json, status, priority,
        attempts, max_attempts, scheduled_at, created_by, institution_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      data.id,
      data.job_type,
      queueName,
      data.payload_json || null,
      status,
      priority,
      attempts,
      maxAttempts,
      data.scheduled_at,
      data.created_by || null,
      data.institution_id,
      now,
      now
    ).run();

    return (await this.getJobById(data.id))!;
  }

  async getJobById(id: string): Promise<BackgroundJob | null> {
    const row = await this.db.prepare(`SELECT * FROM background_jobs WHERE id = ?`).bind(id).first();
    return row ? (row as BackgroundJob) : null;
  }

  async listJobs(filters: {
    institution_id: string;
    status?: string;
    job_type?: string;
    queue_name?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ jobs: BackgroundJob[]; total: number }> {
    let query = `SELECT * FROM background_jobs WHERE institution_id = ?`;
    let countQuery = `SELECT COUNT(*) as count FROM background_jobs WHERE institution_id = ?`;
    const params: any[] = [filters.institution_id];
    const countParams: any[] = [filters.institution_id];

    if (filters.status) {
      query += ` AND status = ?`;
      countQuery += ` AND status = ?`;
      params.push(filters.status);
      countParams.push(filters.status);
    }

    if (filters.job_type) {
      query += ` AND job_type = ?`;
      countQuery += ` AND job_type = ?`;
      params.push(filters.job_type);
      countParams.push(filters.job_type);
    }

    if (filters.queue_name) {
      query += ` AND queue_name = ?`;
      countQuery += ` AND queue_name = ?`;
      params.push(filters.queue_name);
      countParams.push(filters.queue_name);
    }

    if (filters.search) {
      const searchTerm = `%${filters.search}%`;
      query += ` AND (job_type LIKE ? OR payload_json LIKE ? OR failure_reason LIKE ?)`;
      countQuery += ` AND (job_type LIKE ? OR payload_json LIKE ? OR failure_reason LIKE ?)`;
      params.push(searchTerm, searchTerm, searchTerm);
      countParams.push(searchTerm, searchTerm, searchTerm);
    }

    query += ` ORDER BY CASE priority WHEN 'URGENT' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'NORMAL' THEN 3 ELSE 4 END, scheduled_at ASC, created_at DESC`;

    const limit = filters.limit || 50;
    const offset = filters.offset || 0;
    query += ` LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const [rowsRes, countRes] = await Promise.all([
      this.db.prepare(query).bind(...params).all(),
      this.db.prepare(countQuery).bind(...countParams).first()
    ]);

    return {
      jobs: (rowsRes.results || []) as BackgroundJob[],
      total: countRes ? (countRes.count as number) : 0
    };
  }

  async fetchExecutableJobs(limit: number = 10): Promise<BackgroundJob[]> {
    const now = new Date().toISOString();
    const res = await this.db.prepare(
      `SELECT * FROM background_jobs
       WHERE status IN ('PENDING', 'QUEUED', 'RETRYING')
         AND (scheduled_at <= ? OR next_retry_at <= ?)
       ORDER BY CASE priority WHEN 'URGENT' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'NORMAL' THEN 3 ELSE 4 END, scheduled_at ASC
       LIMIT ?`
    ).bind(now, now, limit).all();

    return (res.results || []) as BackgroundJob[];
  }

  async updateJob(id: string, fields: Partial<BackgroundJob>): Promise<BackgroundJob | null> {
    const keys = Object.keys(fields).filter(k => k !== 'id');
    if (keys.length === 0) return this.getJobById(id);

    const now = new Date().toISOString();
    fields.updated_at = now;
    if (!keys.includes('updated_at')) keys.push('updated_at');

    const setClauses = keys.map(k => `${k} = ?`).join(', ');
    const values = keys.map(k => (fields as any)[k]);
    values.push(id);

    await this.db.prepare(`UPDATE background_jobs SET ${setClauses} WHERE id = ?`).bind(...values).run();
    return this.getJobById(id);
  }

  async deleteJob(id: string): Promise<boolean> {
    const res = await this.db.prepare(`DELETE FROM background_jobs WHERE id = ?`).bind(id).run();
    return (res?.meta?.changes || 0) > 0;
  }

  async purgeDeadLetterJobs(institution_id: string): Promise<number> {
    const res = await this.db.prepare(
      `DELETE FROM background_jobs WHERE institution_id = ? AND status = 'DEAD_LETTER'`
    ).bind(institution_id).run();
    return res?.meta?.changes || 0;
  }

  // ==================== CRON SCHEDULES ==================== //

  async createCronSchedule(data: {
    id: string;
    job_type: string;
    name: string;
    cron_expression: string;
    payload_json?: string | null;
    queue_name?: string;
    priority?: JobPriority;
    is_active?: number;
    institution_id: string;
    next_run_at: string;
    created_by?: string | null;
  }): Promise<JobCronSchedule> {
    const now = new Date().toISOString();
    await this.db.prepare(
      `INSERT INTO job_cron_schedules (
        id, job_type, name, cron_expression, payload_json, queue_name,
        priority, is_active, institution_id, next_run_at, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      data.id,
      data.job_type,
      data.name,
      data.cron_expression,
      data.payload_json || null,
      data.queue_name || 'cron',
      data.priority || 'NORMAL',
      data.is_active ?? 1,
      data.institution_id,
      data.next_run_at,
      data.created_by || null,
      now,
      now
    ).run();

    return (await this.getCronScheduleById(data.id))!;
  }

  async getCronScheduleById(id: string): Promise<JobCronSchedule | null> {
    const row = await this.db.prepare(`SELECT * FROM job_cron_schedules WHERE id = ?`).bind(id).first();
    return row ? (row as JobCronSchedule) : null;
  }

  async listCronSchedules(institution_id: string): Promise<JobCronSchedule[]> {
    const res = await this.db.prepare(
      `SELECT * FROM job_cron_schedules WHERE institution_id = ? ORDER BY name ASC`
    ).bind(institution_id).all();
    return (res.results || []) as JobCronSchedule[];
  }

  async fetchDueCronSchedules(): Promise<JobCronSchedule[]> {
    const now = new Date().toISOString();
    const res = await this.db.prepare(
      `SELECT * FROM job_cron_schedules WHERE is_active = 1 AND (next_run_at IS NULL OR next_run_at <= ?)`
    ).bind(now).all();
    return (res.results || []) as JobCronSchedule[];
  }

  async updateCronSchedule(id: string, fields: Partial<JobCronSchedule>): Promise<JobCronSchedule | null> {
    const keys = Object.keys(fields).filter(k => k !== 'id');
    if (keys.length === 0) return this.getCronScheduleById(id);

    const now = new Date().toISOString();
    fields.updated_at = now;
    if (!keys.includes('updated_at')) keys.push('updated_at');

    const setClauses = keys.map(k => `${k} = ?`).join(', ');
    const values = keys.map(k => (fields as any)[k]);
    values.push(id);

    await this.db.prepare(`UPDATE job_cron_schedules SET ${setClauses} WHERE id = ?`).bind(...values).run();
    return this.getCronScheduleById(id);
  }

  async deleteCronSchedule(id: string): Promise<boolean> {
    const res = await this.db.prepare(`DELETE FROM job_cron_schedules WHERE id = ?`).bind(id).run();
    return (res?.meta?.changes || 0) > 0;
  }

  // ==================== WORKER HEALTH MONITORING ==================== //

  async upsertWorker(data: {
    id: string;
    name: string;
    status?: 'HEALTHY' | 'BUSY' | 'UNHEALTHY' | 'OFFLINE';
    current_job_id?: string | null;
    current_job_type?: string | null;
    cpu_usage_pct?: number;
    memory_usage_mb?: number;
    jobs_completed_count?: number;
    jobs_failed_count?: number;
    institution_id?: string | null;
  }): Promise<JobWorker> {
    const now = new Date().toISOString();
    const status = data.status || 'HEALTHY';

    await this.db.prepare(
      `INSERT INTO job_workers (
        id, name, status, current_job_id, current_job_type, last_heartbeat_at,
        cpu_usage_pct, memory_usage_mb, jobs_completed_count, jobs_failed_count, institution_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        status = excluded.status,
        current_job_id = excluded.current_job_id,
        current_job_type = excluded.current_job_type,
        last_heartbeat_at = excluded.last_heartbeat_at,
        cpu_usage_pct = excluded.cpu_usage_pct,
        memory_usage_mb = excluded.memory_usage_mb,
        jobs_completed_count = job_workers.jobs_completed_count + COALESCE(excluded.jobs_completed_count, 0),
        jobs_failed_count = job_workers.jobs_failed_count + COALESCE(excluded.jobs_failed_count, 0),
        updated_at = excluded.updated_at`
    ).bind(
      data.id,
      data.name,
      status,
      data.current_job_id || null,
      data.current_job_type || null,
      now,
      data.cpu_usage_pct || 0.0,
      data.memory_usage_mb || 0.0,
      data.jobs_completed_count || 0,
      data.jobs_failed_count || 0,
      data.institution_id || null,
      now,
      now
    ).run();

    return (await this.getWorkerById(data.id))!;
  }

  async getWorkerById(id: string): Promise<JobWorker | null> {
    const row = await this.db.prepare(`SELECT * FROM job_workers WHERE id = ?`).bind(id).first();
    return row ? (row as JobWorker) : null;
  }

  async listWorkers(institution_id?: string): Promise<JobWorker[]> {
    let query = `SELECT * FROM job_workers`;
    const params: any[] = [];
    if (institution_id) {
      query += ` WHERE institution_id = ? OR institution_id IS NULL`;
      params.push(institution_id);
    }
    query += ` ORDER BY last_heartbeat_at DESC`;

    const res = await this.db.prepare(query).bind(...params).all();
    return (res.results || []) as JobWorker[];
  }

  // ==================== EXECUTION HISTORY ==================== //

  async recordExecutionHistory(data: {
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
  }): Promise<JobExecutionHistory> {
    const now = new Date().toISOString();
    await this.db.prepare(
      `INSERT INTO job_execution_history (
        id, job_id, job_type, worker_id, attempt_number, status,
        started_at, completed_at, duration_ms, execution_log, error_message, stack_trace, institution_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      data.id,
      data.job_id,
      data.job_type,
      data.worker_id,
      data.attempt_number,
      data.status,
      data.started_at,
      data.completed_at,
      data.duration_ms,
      data.execution_log || null,
      data.error_message || null,
      data.stack_trace || null,
      data.institution_id,
      now
    ).run();

    const row = await this.db.prepare(`SELECT * FROM job_execution_history WHERE id = ?`).bind(data.id).first();
    return row as JobExecutionHistory;
  }

  async listExecutionHistory(institution_id: string, filters?: {
    job_id?: string;
    job_type?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ history: JobExecutionHistory[]; total: number }> {
    let query = `SELECT * FROM job_execution_history WHERE institution_id = ?`;
    let countQuery = `SELECT COUNT(*) as count FROM job_execution_history WHERE institution_id = ?`;
    const params: any[] = [institution_id];
    const countParams: any[] = [institution_id];

    if (filters?.job_id) {
      query += ` AND job_id = ?`;
      countQuery += ` AND job_id = ?`;
      params.push(filters.job_id);
      countParams.push(filters.job_id);
    }

    if (filters?.job_type) {
      query += ` AND job_type = ?`;
      countQuery += ` AND job_type = ?`;
      params.push(filters.job_type);
      countParams.push(filters.job_type);
    }

    if (filters?.status) {
      query += ` AND status = ?`;
      countQuery += ` AND status = ?`;
      params.push(filters.status);
      countParams.push(filters.status);
    }

    query += ` ORDER BY created_at DESC`;
    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;
    query += ` LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const [rowsRes, countRes] = await Promise.all([
      this.db.prepare(query).bind(...params).all(),
      this.db.prepare(countQuery).bind(...countParams).first()
    ]);

    return {
      history: (rowsRes.results || []) as JobExecutionHistory[],
      total: countRes ? (countRes.count as number) : 0
    };
  }

  // ==================== METRICS ==================== //

  async getMetrics(institution_id: string): Promise<{
    pendingCount: number;
    queuedCount: number;
    runningCount: number;
    completedCount: number;
    failedCount: number;
    retryingCount: number;
    deadLetterCount: number;
    cancelledCount: number;
    totalCount: number;
    successRatePct: number;
    avgExecutionTimeMs: number;
    activeWorkersCount: number;
  }> {
    const statusCountsRes = await this.db.prepare(
      `SELECT status, COUNT(*) as count FROM background_jobs WHERE institution_id = ? GROUP BY status`
    ).bind(institution_id).all();

    const counts: Record<string, number> = {
      PENDING: 0,
      QUEUED: 0,
      RUNNING: 0,
      COMPLETED: 0,
      FAILED: 0,
      RETRYING: 0,
      DEAD_LETTER: 0,
      CANCELLED: 0
    };

    let total = 0;
    for (const r of (statusCountsRes.results || [])) {
      counts[r.status] = r.count;
      total += r.count;
    }

    const execStatsRes = await this.db.prepare(
      `SELECT 
        COUNT(*) as totalExecs,
        SUM(CASE WHEN status = 'SUCCESS' THEN 1 ELSE 0 END) as successCount,
        AVG(duration_ms) as avgDuration
       FROM job_execution_history WHERE institution_id = ?`
    ).bind(institution_id).first();

    const totalExecs = execStatsRes?.totalExecs || 0;
    const successCount = execStatsRes?.successCount || 0;
    const avgDuration = execStatsRes?.avgDuration || 0;

    const successRatePct = totalExecs > 0 ? Math.round((successCount / totalExecs) * 1000) / 10 : 100;

    const workersRes = await this.db.prepare(
      `SELECT COUNT(*) as count FROM job_workers WHERE (institution_id = ? OR institution_id IS NULL) AND status IN ('HEALTHY', 'BUSY')`
    ).bind(institution_id).first();

    return {
      pendingCount: counts.PENDING || 0,
      queuedCount: counts.QUEUED || 0,
      runningCount: counts.RUNNING || 0,
      completedCount: counts.COMPLETED || 0,
      failedCount: counts.FAILED || 0,
      retryingCount: counts.RETRYING || 0,
      deadLetterCount: counts.DEAD_LETTER || 0,
      cancelledCount: counts.CANCELLED || 0,
      totalCount: total,
      successRatePct,
      avgExecutionTimeMs: Math.round(avgDuration),
      activeWorkersCount: workersRes?.count || 0
    };
  }
}
