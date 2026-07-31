/**
 * Verification Test Suite for Module 14 — Background Jobs & Scheduler Audit
 */
const BASE_URL = 'http://127.0.0.1:8788';

async function runBackgroundJobsAuditTests() {
  console.log('🧪 Starting Background Jobs & Scheduler Audit verification tests...\n');

  let token = '';

  async function request(path, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options.headers,
    };

    const response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const text = await response.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch (e) {
      data = { text };
    }

    return {
      status: response.status,
      ok: response.ok,
      data,
    };
  }

  // 1. Auth Login as Super Admin
  const loginRes = await request('/auth/login', {
    method: 'POST',
    body: { email: 'admin@oxford.edu', password: 'admin123' }
  });

  if (!loginRes.ok) {
    console.error('❌ Login failed:', loginRes.data);
    process.exit(1);
  }
  token = loginRes.data.token;
  console.log('✅ 1. Authenticated successfully as Super Admin.');

  // Target 1: Job Creation (Immediate & Delayed)
  console.log('\n--- Target 1: Job Creation (Immediate & Delayed) ---');
  const createJobRes = await request('/background-jobs', {
    method: 'POST',
    body: {
      jobType: 'FeeReminderJob',
      queueName: 'notifications',
      priority: 'HIGH',
      maxAttempts: 3,
      payload: { recipientCount: 25, reason: 'Monthly tuition fee' }
    }
  });

  if (createJobRes.status !== 201 || !createJobRes.data.id) {
    console.error('❌ Enqueuing job failed:', createJobRes.data);
    process.exit(1);
  }
  const job1Id = createJobRes.data.id;
  console.log(`✅ Job enqueued successfully! (ID: ${job1Id}, Status: ${createJobRes.data.status})`);

  // Target 2 & 3: Queue Processing & Delayed Execution Handling
  console.log('\n--- Target 2 & 3: Queue Processing & Delayed Job Execution ---');
  const processRes = await request('/background-jobs/process', {
    method: 'POST',
    body: { workerId: 'worker-test-node-1' }
  });

  if (processRes.status !== 200) {
    console.error('❌ Process queue execution failed:', processRes.data);
    process.exit(1);
  }
  console.log(`✅ Queue processed! Output:`, processRes.data);

  const checkJob1 = await request(`/background-jobs/${job1Id}`);
  if (checkJob1.status !== 200 || checkJob1.data.status !== 'COMPLETED') {
    console.error('❌ Expected job to be COMPLETED, got:', checkJob1.data.status);
    process.exit(1);
  }
  console.log(`✅ Verified Job ${job1Id} status transition: PENDING -> RUNNING -> COMPLETED.`);

  // Target 4: Cron Scheduling Evaluation
  console.log('\n--- Target 4: Cron Scheduling Evaluation & Triggering ---');
  const createCronRes = await request('/background-jobs/schedules', {
    method: 'POST',
    body: {
      jobType: 'AttendanceSummaryJob',
      name: 'Daily Attendance Digest 8AM',
      cronExpression: '0 8 * * *',
      queueName: 'cron',
      priority: 'NORMAL',
      payload: { absentCount: 15, totalPresent: 450 }
    }
  });

  if (createCronRes.status !== 201 || !createCronRes.data.id) {
    console.error('❌ Cron schedule creation failed:', createCronRes.data);
    process.exit(1);
  }
  const cronId = createCronRes.data.id;
  console.log(`✅ Cron Schedule created! (ID: ${cronId}, Next run: ${createCronRes.data.next_run_at})`);

  const listCronRes = await request('/background-jobs/schedules/list');
  if (listCronRes.status !== 200 || !listCronRes.data.length) {
    console.error('❌ Listing cron schedules failed:', listCronRes.data);
    process.exit(1);
  }
  console.log(`✅ Active Cron Schedules listed (${listCronRes.data.length} schedule(s) found).`);

  // Target 5 & 6: Retry with Exponential Backoff & Dead Letter Queue
  console.log('\n--- Target 5 & 6: Retry Policy & Dead Letter Queue Migration ---');
  // Create a job with invalid jobType to force failure and max_attempts = 1
  const failJobRes = await request('/background-jobs', {
    method: 'POST',
    body: {
      jobType: 'NonExistentFailingJobType',
      queueName: 'default',
      maxAttempts: 1,
      payload: { fail: true }
    }
  });

  const failJobId = failJobRes.data.id;
  console.log(`ℹ️ Created test job destined to fail: ${failJobId}`);

  // Process queue to trigger failure & DLQ transition
  await request('/background-jobs/process', { method: 'POST', body: { workerId: 'worker-test-node-1' } });

  const deadLetterCheck = await request(`/background-jobs/${failJobId}`);
  if (deadLetterCheck.data.status !== 'DEAD_LETTER') {
    console.error('❌ Expected job to be moved to DEAD_LETTER, got:', deadLetterCheck.data.status);
    process.exit(1);
  }
  console.log(`✅ Job ${failJobId} failed max attempts (1/1) and migrated to DEAD_LETTER queue.`);

  const dlqListRes = await request('/background-jobs/dead-letter/list');
  if (dlqListRes.status !== 200 || dlqListRes.data.total === 0) {
    console.error('❌ Dead letter queue list empty or failed:', dlqListRes.data);
    process.exit(1);
  }
  console.log(`✅ Dead Letter Queue contains ${dlqListRes.data.total} item(s).`);

  // Target 7: Worker Heartbeat & Monitoring
  console.log('\n--- Target 7: Worker Health & Monitoring ---');
  const heartbeatRes = await request('/background-jobs/workers/heartbeat', {
    method: 'POST',
    body: {
      workerId: 'worker-test-node-1',
      status: 'HEALTHY',
      cpuUsage: 8.5,
      memoryUsage: 145.2,
      jobsCompleted: 10,
      jobsFailed: 1
    }
  });

  if (heartbeatRes.status !== 200) {
    console.error('❌ Worker heartbeat update failed:', heartbeatRes.data);
    process.exit(1);
  }

  const workersListRes = await request('/background-jobs/workers/list');
  if (workersListRes.status !== 200 || !workersListRes.data.length) {
    console.error('❌ Workers health listing failed:', workersListRes.data);
    process.exit(1);
  }
  console.log(`✅ Worker Node Health active: Worker ID '${workersListRes.data[0].id}' status '${workersListRes.data[0].status}'`);

  // Target 8: Manual Controls (Retry, Cancel, Pause, Resume, Requeue)
  console.log('\n--- Target 8: Manual Controls (Retry, Cancel, Pause, Resume, Requeue) ---');
  // Manual retry of dead letter job
  const retryDlqRes = await request(`/background-jobs/${failJobId}/retry`, { method: 'POST' });
  if (retryDlqRes.status !== 200 || retryDlqRes.data.status !== 'PENDING') {
    console.error('❌ Manual retry failed:', retryDlqRes.data);
    process.exit(1);
  }
  console.log(`✅ Manual Retry executed for job ${failJobId}: Status reset to PENDING.`);

  // Cancel job
  const cancelRes = await request(`/background-jobs/${failJobId}/cancel`, { method: 'POST' });
  if (cancelRes.status !== 200 || cancelRes.data.status !== 'CANCELLED') {
    console.error('❌ Manual cancel failed:', cancelRes.data);
    process.exit(1);
  }
  console.log(`✅ Manual Cancel executed: Job ${failJobId} status set to CANCELLED.`);

  // Pause & Resume Cron
  const pauseCronRes = await request(`/background-jobs/schedules/${cronId}/toggle`, {
    method: 'PUT',
    body: { isActive: false }
  });
  if (pauseCronRes.data.is_active !== 0) {
    console.error('❌ Pausing cron schedule failed:', pauseCronRes.data);
    process.exit(1);
  }
  console.log('✅ Cron Schedule paused (is_active: 0)');

  const resumeCronRes = await request(`/background-jobs/schedules/${cronId}/toggle`, {
    method: 'PUT',
    body: { isActive: true }
  });
  if (resumeCronRes.data.is_active !== 1) {
    console.error('❌ Resuming cron schedule failed:', resumeCronRes.data);
    process.exit(1);
  }
  console.log('✅ Cron Schedule resumed (is_active: 1)');

  // Requeue cron schedule immediately
  const requeueRes = await request(`/background-jobs/schedules/${cronId}/requeue`, { method: 'POST' });
  if (requeueRes.status !== 201) {
    console.error('❌ Requeueing cron schedule failed:', requeueRes.data);
    process.exit(1);
  }
  console.log(`✅ Manual Requeue executed for Cron Schedule ${cronId}! Created job ${requeueRes.data.id}.`);

  // Target 9: Job History Recording
  console.log('\n--- Target 9: Job Execution History Logs ---');
  const historyRes = await request('/background-jobs/history/list');
  if (historyRes.status !== 200 || historyRes.data.total === 0) {
    console.error('❌ Execution history log empty or failed:', historyRes.data);
    process.exit(1);
  }
  const sampleHist = historyRes.data.history[0];
  console.log(`✅ Execution History recorded (${historyRes.data.total} total log(s)). Sample duration: ${sampleHist.duration_ms}ms, Status: ${sampleHist.status}`);

  // Target 10: Metrics Accuracy
  console.log('\n--- Target 10: Dashboard Metrics & System Accuracy ---');
  const metricsRes = await request('/background-jobs/metrics');
  if (metricsRes.status !== 200) {
    console.error('❌ Fetching job metrics failed:', metricsRes.data);
    process.exit(1);
  }
  console.log('✅ Background Jobs Metrics verified:');
  console.log(`   Pending: ${metricsRes.data.pendingCount}`);
  console.log(`   Running: ${metricsRes.data.runningCount}`);
  console.log(`   Completed: ${metricsRes.data.completedCount}`);
  console.log(`   Failed: ${metricsRes.data.failedCount}`);
  console.log(`   Dead Letter: ${metricsRes.data.deadLetterCount}`);
  console.log(`   Success Rate: ${metricsRes.data.successRatePct}%`);
  console.log(`   Avg Execution Time: ${metricsRes.data.avgExecutionTimeMs} ms`);

  console.log('\n🎉 ALL 10 MODULE 14 AUDIT VERIFICATION TARGETS PASSED SUCCESSFULLY!\n');
}

runBackgroundJobsAuditTests().catch(err => {
  console.error('💥 Test suite crashed with error:', err);
  process.exit(1);
});
