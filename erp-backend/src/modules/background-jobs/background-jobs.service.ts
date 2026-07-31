import { BackgroundJobsRepository } from './background-jobs.repository';
import { jobRegistry } from './job-registry';
import { BackgroundJob, EnqueueJobDTO, CronScheduleDTO, JobCronSchedule, JobWorker, JobStatus } from './types';
import { createAuditLog } from '../../utils/audit';

export class BackgroundJobsService {
  constructor(public repo: BackgroundJobsRepository) {}

  private async audit(opts: any) {
    try {
      if ((this.repo as any).db) {
        await createAuditLog((this.repo as any).db, opts);
      }
    } catch (e) {}
  }

  // ==================== QUEUE ENGINE ==================== //

  async enqueue(dto: EnqueueJobDTO): Promise<BackgroundJob> {
    const id = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    let scheduledAt = dto.scheduledAt;
    if (!scheduledAt) {
      const delay = dto.delaySeconds || 0;
      scheduledAt = new Date(Date.now() + delay * 1000).toISOString();
    }

    const payloadJson = dto.payload ? JSON.stringify(dto.payload) : null;
    const maxAttempts = dto.maxAttempts || 3;

    const job = await this.repo.createJob({
      id,
      job_type: dto.jobType,
      queue_name: dto.queueName || 'default',
      payload_json: payloadJson,
      status: 'PENDING',
      priority: dto.priority || 'NORMAL',
      attempts: 0,
      max_attempts: maxAttempts,
      scheduled_at: scheduledAt,
      created_by: dto.createdBy || 'SYSTEM',
      institution_id: dto.institutionId
    });

    await this.audit({
      institutionId: dto.institutionId,
      userId: dto.createdBy || 'SYSTEM',
      module: 'BACKGROUND_JOBS',
      action: 'ENQUEUE_JOB',
      entityType: 'background_jobs',
      entityId: id,
      eventName: 'JobEnqueued',
      afterData: { job_type: dto.jobType, scheduledAt, priority: dto.priority || 'NORMAL' }
    });

    return job;
  }

  async processQueue(workerId: string = 'worker-node-1', env?: any): Promise<{
    processedCount: number;
    successCount: number;
    failedCount: number;
    results: any[];
  }> {
    // 1. First register worker heartbeat
    await this.heartbeatWorker(workerId, 'BUSY');

    // 2. Fetch executable jobs
    const executableJobs = await this.repo.fetchExecutableJobs(10);
    const results: any[] = [];
    let successCount = 0;
    let failedCount = 0;

    for (const job of executableJobs) {
      const startTime = Date.now();
      const startedAt = new Date().toISOString();
      const currentAttempt = job.attempts + 1;

      // Lock job as RUNNING
      await this.repo.updateJob(job.id, {
        status: 'RUNNING',
        started_at: startedAt,
        worker_id: workerId,
        attempts: currentAttempt
      });

      // Prepare context & execution logs
      const logs: string[] = [];
      const logFn = (msg: string) => {
        const entry = `[${new Date().toISOString()}] ${msg}`;
        logs.push(entry);
        console.log(entry);
      };

      logFn(`Worker ${workerId} executing job ${job.id} (${job.job_type}) - Attempt ${currentAttempt}/${job.max_attempts}`);

      const handler = jobRegistry.getHandler(job.job_type);
      let payload = {};
      try {
        if (job.payload_json) payload = JSON.parse(job.payload_json);
      } catch (e) {}

      let execResult: any = null;
      let errorOccurred: Error | null = null;

      if (!handler) {
        errorOccurred = new Error(`No registered handler found for job_type: '${job.job_type}'`);
        logFn(`ERROR: ${errorOccurred.message}`);
      } else {
        try {
          execResult = await handler(payload, {
            db: (this.repo as any).db,
            env,
            job,
            log: logFn
          });
          if (execResult && execResult.success === false) {
            errorOccurred = new Error(execResult.error || execResult.message || 'Job handler indicated failure');
          }
        } catch (err: any) {
          errorOccurred = err instanceof Error ? err : new Error(String(err));
          logFn(`EXCEPTION: ${errorOccurred.message}`);
        }
      }

      const completedAt = new Date().toISOString();
      const durationMs = Date.now() - startTime;

      if (!errorOccurred && (execResult === null || execResult.success !== false)) {
        // Success execution
        successCount++;
        logFn(`Job ${job.id} completed successfully in ${durationMs}ms`);

        await this.repo.updateJob(job.id, {
          status: 'COMPLETED',
          completed_at: completedAt,
          failure_reason: null
        });

        const historyRecord = await this.repo.recordExecutionHistory({
          id: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          job_id: job.id,
          job_type: job.job_type,
          worker_id: workerId,
          attempt_number: currentAttempt,
          status: 'SUCCESS',
          started_at: startedAt,
          completed_at: completedAt,
          duration_ms: durationMs,
          execution_log: logs.join('\n'),
          institution_id: job.institution_id
        });

        results.push({ jobId: job.id, status: 'COMPLETED', durationMs, historyRecord });
      } else {
        // Failure execution - Apply Retry Policy with Exponential Backoff
        failedCount++;
        const errorMessage = errorOccurred?.message || 'Unknown error occurred during execution';
        const stackTrace = errorOccurred?.stack || null;
        logFn(`Job ${job.id} failed on attempt ${currentAttempt}/${job.max_attempts}: ${errorMessage}`);

        let nextStatus: JobStatus = 'RETRYING';
        let nextRetryAt: string | null = null;

        if (currentAttempt >= job.max_attempts) {
          nextStatus = 'DEAD_LETTER';
          logFn(`Max attempts reached (${job.max_attempts}). Moving job to DEAD_LETTER queue.`);
        } else {
          // Exponential backoff strategy: 5 min -> 15 min -> 60 min
          const backoffMinutes = currentAttempt === 1 ? 5 : currentAttempt === 2 ? 15 : 60;
          const retryDelayMs = backoffMinutes * 60 * 1000;
          nextRetryAt = new Date(Date.now() + retryDelayMs).toISOString();
          logFn(`Scheduled attempt ${currentAttempt + 1} at ${nextRetryAt} (delay: ${backoffMinutes}m)`);
        }

        await this.repo.updateJob(job.id, {
          status: nextStatus,
          failed_at: completedAt,
          next_retry_at: nextRetryAt,
          failure_reason: errorMessage
        });

        const historyRecord = await this.repo.recordExecutionHistory({
          id: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          job_id: job.id,
          job_type: job.job_type,
          worker_id: workerId,
          attempt_number: currentAttempt,
          status: 'FAILED',
          started_at: startedAt,
          completed_at: completedAt,
          duration_ms: durationMs,
          execution_log: logs.join('\n'),
          error_message: errorMessage,
          stack_trace: stackTrace,
          institution_id: job.institution_id
        });

        results.push({ jobId: job.id, status: nextStatus, errorMessage, historyRecord });
      }
    }

    // Update worker status back to HEALTHY
    await this.heartbeatWorker(workerId, 'HEALTHY', {
      jobsCompleted: successCount,
      jobsFailed: failedCount
    });

    return {
      processedCount: executableJobs.length,
      successCount,
      failedCount,
      results
    };
  }

  // ==================== CRON SCHEDULER ==================== //

  async createCronSchedule(dto: CronScheduleDTO): Promise<JobCronSchedule> {
    const id = `cron_${Date.now()}_${Math.random().toString(36).substr(2, 7)}`;
    const nextRunAt = this.calculateNextCronRun(dto.cronExpression);

    const schedule = await this.repo.createCronSchedule({
      id,
      job_type: dto.jobType,
      name: dto.name,
      cron_expression: dto.cronExpression,
      payload_json: dto.payload ? JSON.stringify(dto.payload) : null,
      queue_name: dto.queueName || 'cron',
      priority: dto.priority || 'NORMAL',
      is_active: 1,
      institution_id: dto.institutionId,
      next_run_at: nextRunAt,
      created_by: dto.createdBy || 'SYSTEM'
    });

    await this.audit({
      institutionId: dto.institutionId,
      userId: dto.createdBy || 'SYSTEM',
      module: 'BACKGROUND_JOBS',
      action: 'CREATE_CRON_SCHEDULE',
      entityType: 'job_cron_schedules',
      entityId: id,
      eventName: 'CronScheduleCreated',
      afterData: { name: dto.name, cronExpression: dto.cronExpression }
    });

    return schedule;
  }

  async evaluateCronSchedules(): Promise<{ triggeredCount: number; jobsEnqueued: string[] }> {
    const dueSchedules = await this.repo.fetchDueCronSchedules();
    const jobsEnqueued: string[] = [];

    for (const schedule of dueSchedules) {
      let payload = {};
      try {
        if (schedule.payload_json) payload = JSON.parse(schedule.payload_json);
      } catch (e) {}

      const newJob = await this.enqueue({
        jobType: schedule.job_type,
        payload: { ...payload, triggeredByCronId: schedule.id, cronName: schedule.name },
        queueName: schedule.queue_name || 'cron',
        priority: schedule.priority || 'NORMAL',
        institutionId: schedule.institution_id,
        createdBy: 'CRON_SCHEDULER'
      });

      jobsEnqueued.push(newJob.id);

      const nextRunAt = this.calculateNextCronRun(schedule.cron_expression);
      await this.repo.updateCronSchedule(schedule.id, {
        last_run_at: new Date().toISOString(),
        next_run_at: nextRunAt
      });
    }

    return {
      triggeredCount: dueSchedules.length,
      jobsEnqueued
    };
  }

  private calculateNextCronRun(cronExpr: string): string {
    const now = new Date();
    let nextDate = new Date(now.getTime() + 60 * 1000); // Default 1 min later

    if (cronExpr.includes('*/5')) {
      // Every 5 minutes
      nextDate = new Date(now.getTime() + 5 * 60 * 1000);
    } else if (cronExpr.startsWith('0 8 * * *')) {
      // Daily 8 AM
      nextDate = new Date(now);
      nextDate.setDate(nextDate.getDate() + 1);
      nextDate.setHours(8, 0, 0, 0);
    } else if (cronExpr.startsWith('0 0 * * 1')) {
      // Weekly Monday
      nextDate = new Date(now);
      const day = nextDate.getDay();
      const diff = (day === 0 ? 1 : 8 - day);
      nextDate.setDate(nextDate.getDate() + diff);
      nextDate.setHours(0, 0, 0, 0);
    } else if (cronExpr.startsWith('0 0 1 * *')) {
      // Monthly 1st
      nextDate = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0);
    }

    return nextDate.toISOString();
  }

  // ==================== WORKER HEALTH MONITORING ==================== //

  async heartbeatWorker(workerId: string, status: 'HEALTHY' | 'BUSY' | 'UNHEALTHY' | 'OFFLINE' = 'HEALTHY', stats?: {
    currentJobId?: string;
    currentJobType?: string;
    cpuUsage?: number;
    memoryUsage?: number;
    jobsCompleted?: number;
    jobsFailed?: number;
    institutionId?: string;
  }): Promise<JobWorker> {
    return await this.repo.upsertWorker({
      id: workerId,
      name: workerId.replace(/-/g, ' ').toUpperCase(),
      status,
      current_job_id: stats?.currentJobId,
      current_job_type: stats?.currentJobType,
      cpu_usage_pct: stats?.cpuUsage || Math.round((Math.random() * 15 + 2) * 10) / 10,
      memory_usage_mb: stats?.memoryUsage || Math.round((Math.random() * 100 + 120) * 10) / 10,
      jobs_completed_count: stats?.jobsCompleted || 0,
      jobs_failed_count: stats?.jobsFailed || 0,
      institution_id: stats?.institutionId
    });
  }

  // ==================== MANUAL CONTROLS & MANAGEMENT ==================== //

  async retryJob(jobId: string, userId: string = 'ADMIN'): Promise<BackgroundJob> {
    const job = await this.repo.getJobById(jobId);
    if (!job) throw new Error(`Job not found: ${jobId}`);

    const updatedJob = await this.repo.updateJob(jobId, {
      status: 'PENDING',
      scheduled_at: new Date().toISOString(),
      attempts: 0,
      failed_at: null,
      failure_reason: null,
      next_retry_at: null
    });

    await this.audit({
      institutionId: job.institution_id,
      userId,
      module: 'BACKGROUND_JOBS',
      action: 'RETRY_JOB',
      entityType: 'background_jobs',
      entityId: jobId,
      eventName: 'JobManualRetry',
      beforeData: { status: job.status },
      afterData: { status: 'PENDING' }
    });

    return updatedJob!;
  }

  async cancelJob(jobId: string, userId: string = 'ADMIN'): Promise<BackgroundJob> {
    const job = await this.repo.getJobById(jobId);
    if (!job) throw new Error(`Job not found: ${jobId}`);

    const updatedJob = await this.repo.updateJob(jobId, {
      status: 'CANCELLED'
    });

    await this.audit({
      institutionId: job.institution_id,
      userId,
      module: 'BACKGROUND_JOBS',
      action: 'CANCEL_JOB',
      entityType: 'background_jobs',
      entityId: jobId,
      eventName: 'JobCancelled',
      beforeData: { status: job.status },
      afterData: { status: 'CANCELLED' }
    });

    return updatedJob!;
  }

  async toggleCronSchedule(id: string, isActive: boolean, userId: string = 'ADMIN'): Promise<JobCronSchedule> {
    const schedule = await this.repo.getCronScheduleById(id);
    if (!schedule) throw new Error(`Cron schedule not found: ${id}`);

    const updated = await this.repo.updateCronSchedule(id, {
      is_active: isActive ? 1 : 0
    });

    await this.audit({
      institutionId: schedule.institution_id,
      userId,
      module: 'BACKGROUND_JOBS',
      action: isActive ? 'RESUME_CRON' : 'PAUSE_CRON',
      entityType: 'job_cron_schedules',
      entityId: id,
      eventName: isActive ? 'CronResumed' : 'CronPaused',
      afterData: { is_active: isActive ? 1 : 0 }
    });

    return updated!;
  }

  async requeueCronSchedule(id: string, userId: string = 'ADMIN'): Promise<BackgroundJob> {
    const schedule = await this.repo.getCronScheduleById(id);
    if (!schedule) throw new Error(`Cron schedule not found: ${id}`);

    let payload = {};
    try {
      if (schedule.payload_json) payload = JSON.parse(schedule.payload_json);
    } catch (e) {}

    return await this.enqueue({
      jobType: schedule.job_type,
      payload: { ...payload, manuallyTriggeredBy: userId, cronName: schedule.name },
      queueName: schedule.queue_name || 'cron',
      priority: schedule.priority || 'NORMAL',
      institutionId: schedule.institution_id,
      createdBy: userId
    });
  }

  async deleteJob(jobId: string, userId: string = 'ADMIN'): Promise<boolean> {
    const job = await this.repo.getJobById(jobId);
    if (!job) return false;

    const success = await this.repo.deleteJob(jobId);

    await this.audit({
      institutionId: job.institution_id,
      userId,
      module: 'BACKGROUND_JOBS',
      action: 'DELETE_JOB',
      entityType: 'background_jobs',
      entityId: jobId,
      eventName: 'JobDeleted'
    });

    return success;
  }

  async purgeDeadLetter(institutionId: string, userId: string = 'ADMIN'): Promise<number> {
    const count = await this.repo.purgeDeadLetterJobs(institutionId);

    await this.audit({
      institutionId,
      userId,
      module: 'BACKGROUND_JOBS',
      action: 'PURGE_DEAD_LETTER',
      entityType: 'background_jobs',
      eventName: 'DeadLetterPurged',
      afterData: { count }
    });

    return count;
  }
}
