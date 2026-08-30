import { Hono } from 'hono';
import { Env } from '../../types';
import { authMiddleware, requireRole } from '../../middleware/auth';
import { BackgroundJobsRepository } from './background-jobs.repository';
import { BackgroundJobsService } from './background-jobs.service';
import { jobRegistry } from './job-registry';

const jobs = new Hono<{ Bindings: Env }>();

jobs.use('*', authMiddleware);
// System-internal queue/worker administration — admin-only, not a role any
// teacher/accountant/student should be able to reach.
jobs.use('*', requireRole('admin'));

function getService(c: any) {
  const repo = new BackgroundJobsRepository(c.env.DB);
  return new BackgroundJobsService(repo);
}

function getInstId(c: any): string {
  const user = c.get('user');
  return user?.institution_id || c.req.header('x-institution-id') || 'inst-1';
}

function getUserId(c: any): string {
  const user = c.get('user');
  return user?.sub || 'ADMIN';
}

// 1. Dashboard Metrics & Analytics
jobs.get('/metrics', async (c) => {
  const service = getService(c);
  const institutionId = getInstId(c);
  const metrics = await service.repo.getMetrics(institutionId);
  const registeredTypes = jobRegistry.getRegisteredJobTypes();

  return c.json({
    ...metrics,
    registeredJobTypes: registeredTypes
  });
});

// 2. List Jobs
jobs.get('/', async (c) => {
  const service = getService(c);
  const institutionId = getInstId(c);
  const status = c.req.query('status');
  const job_type = c.req.query('job_type');
  const queue_name = c.req.query('queue_name');
  const search = c.req.query('search');
  const limit = parseInt(c.req.query('limit') || '50');
  const offset = parseInt(c.req.query('offset') || '0');

  const result = await service.repo.listJobs({
    institution_id: institutionId,
    status,
    job_type,
    queue_name,
    search,
    limit,
    offset
  });

  return c.json(result);
});

// 3. Enqueue Job
jobs.post('/', async (c) => {
  const service = getService(c);
  const institutionId = getInstId(c);
  const userId = getUserId(c);
  const body = await c.req.json();

  if (!body.jobType) {
    return c.json({ error: 'jobType is required' }, 400);
  }

  const job = await service.enqueue({
    jobType: body.jobType,
    payload: body.payload,
    queueName: body.queueName,
    priority: body.priority,
    maxAttempts: body.maxAttempts,
    scheduledAt: body.scheduledAt,
    delaySeconds: body.delaySeconds,
    createdBy: userId,
    institutionId
  });

  return c.json(job, 201);
});

// 4. Get Job Details
jobs.get('/:id', async (c) => {
  const service = getService(c);
  const id = c.req.param('id');
  const job = await service.repo.getJobById(id);
  if (!job) return c.json({ error: 'Job not found' }, 404);

  const history = await service.repo.listExecutionHistory(job.institution_id, { job_id: id });

  return c.json({
    ...job,
    executionHistory: history.history
  });
});

// 5. Retry Job
jobs.post('/:id/retry', async (c) => {
  const service = getService(c);
  const id = c.req.param('id');
  const userId = getUserId(c);

  try {
    const retriedJob = await service.retryJob(id, userId);
    return c.json(retriedJob);
  } catch (err: any) {
    return c.json({ error: err.message }, 400);
  }
});

// 6. Cancel Job
jobs.post('/:id/cancel', async (c) => {
  const service = getService(c);
  const id = c.req.param('id');
  const userId = getUserId(c);

  try {
    const cancelledJob = await service.cancelJob(id, userId);
    return c.json(cancelledJob);
  } catch (err: any) {
    return c.json({ error: err.message }, 400);
  }
});

// 7. Delete Job
jobs.delete('/:id', async (c) => {
  const service = getService(c);
  const id = c.req.param('id');
  const userId = getUserId(c);

  const deleted = await service.deleteJob(id, userId);
  return c.json({ success: deleted });
});

// 8. Process Queue / Worker Dispatch Endpoint
jobs.post('/process', async (c) => {
  const service = getService(c);
  const body = await c.req.json().catch(() => ({}));
  const workerId = body.workerId || 'worker-node-1';

  // Evaluate cron schedules first
  await service.evaluateCronSchedules();

  // Process pending/retrying jobs
  const result = await service.processQueue(workerId, c.env);
  return c.json(result);
});

// 9. List Cron Schedules
jobs.get('/schedules/list', async (c) => {
  const service = getService(c);
  const institutionId = getInstId(c);
  const schedules = await service.repo.listCronSchedules(institutionId);
  return c.json(schedules);
});

// 10. Create Cron Schedule
jobs.post('/schedules', async (c) => {
  const service = getService(c);
  const institutionId = getInstId(c);
  const userId = getUserId(c);
  const body = await c.req.json();

  if (!body.jobType || !body.name || !body.cronExpression) {
    return c.json({ error: 'jobType, name, and cronExpression are required' }, 400);
  }

  const schedule = await service.createCronSchedule({
    jobType: body.jobType,
    name: body.name,
    cronExpression: body.cronExpression,
    payload: body.payload,
    queueName: body.queueName,
    priority: body.priority,
    createdBy: userId,
    institutionId
  });

  return c.json(schedule, 201);
});

// 11. Toggle (Pause/Resume) Cron Schedule
jobs.put('/schedules/:id/toggle', async (c) => {
  const service = getService(c);
  const id = c.req.param('id');
  const userId = getUserId(c);
  const body = await c.req.json();

  try {
    const updated = await service.toggleCronSchedule(id, !!body.isActive, userId);
    return c.json(updated);
  } catch (err: any) {
    return c.json({ error: err.message }, 400);
  }
});

// 12. Requeue Cron Schedule (Trigger immediately)
jobs.post('/schedules/:id/requeue', async (c) => {
  const service = getService(c);
  const id = c.req.param('id');
  const userId = getUserId(c);

  try {
    const enqueuedJob = await service.requeueCronSchedule(id, userId);
    return c.json(enqueuedJob, 201);
  } catch (err: any) {
    return c.json({ error: err.message }, 400);
  }
});

// 13. Delete Cron Schedule
jobs.delete('/schedules/:id', async (c) => {
  const service = getService(c);
  const id = c.req.param('id');
  const deleted = await service.repo.deleteCronSchedule(id);
  return c.json({ success: deleted });
});

// 14. List Worker Nodes & Health Monitoring
jobs.get('/workers/list', async (c) => {
  const service = getService(c);
  const institutionId = getInstId(c);
  const workers = await service.repo.listWorkers(institutionId);
  return c.json(workers);
});

// 15. Record Worker Heartbeat
jobs.post('/workers/heartbeat', async (c) => {
  const service = getService(c);
  const body = await c.req.json();
  const workerId = body.workerId || 'worker-node-1';

  const worker = await service.heartbeatWorker(workerId, body.status || 'HEALTHY', {
    currentJobId: body.currentJobId,
    currentJobType: body.currentJobType,
    cpuUsage: body.cpuUsage,
    memoryUsage: body.memoryUsage,
    jobsCompleted: body.jobsCompleted,
    jobsFailed: body.jobsFailed,
    institutionId: getInstId(c)
  });

  return c.json(worker);
});

// 16. Dead Letter Queue Listing
jobs.get('/dead-letter/list', async (c) => {
  const service = getService(c);
  const institutionId = getInstId(c);
  const limit = parseInt(c.req.query('limit') || '50');
  const offset = parseInt(c.req.query('offset') || '0');

  const result = await service.repo.listJobs({
    institution_id: institutionId,
    status: 'DEAD_LETTER',
    limit,
    offset
  });

  return c.json(result);
});

// 17. Purge Dead Letter Queue
jobs.post('/dead-letter/purge', async (c) => {
  const service = getService(c);
  const institutionId = getInstId(c);
  const userId = getUserId(c);

  const purgedCount = await service.purgeDeadLetter(institutionId, userId);
  return c.json({ purgedCount });
});

// 18. Execution History Logs
jobs.get('/history/list', async (c) => {
  const service = getService(c);
  const institutionId = getInstId(c);
  const jobId = c.req.query('job_id');
  const jobType = c.req.query('job_type');
  const status = c.req.query('status');
  const limit = parseInt(c.req.query('limit') || '50');
  const offset = parseInt(c.req.query('offset') || '0');

  const result = await service.repo.listExecutionHistory(institutionId, {
    job_id: jobId,
    job_type: jobType,
    status,
    limit,
    offset
  });

  return c.json(result);
});

export default jobs;
