import React, { useState, useEffect } from 'react';
import { useToast } from '../contexts/ToastContext';
import './JobCenter.css';

interface Metrics {
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
  registeredJobTypes?: string[];
}

interface Job {
  id: string;
  job_type: string;
  queue_name: string;
  payload_json: string | null;
  status: string;
  priority: string;
  attempts: number;
  max_attempts: number;
  scheduled_at: string;
  started_at?: string | null;
  completed_at?: string | null;
  failed_at?: string | null;
  next_retry_at?: string | null;
  failure_reason?: string | null;
  worker_id?: string | null;
  created_at: string;
}

interface CronSchedule {
  id: string;
  job_type: string;
  name: string;
  cron_expression: string;
  payload_json?: string | null;
  queue_name?: string;
  priority?: string;
  is_active: number;
  last_run_at?: string | null;
  next_run_at?: string | null;
}

interface WorkerNode {
  id: string;
  name: string;
  status: string;
  current_job_id?: string | null;
  current_job_type?: string | null;
  last_heartbeat_at: string;
  cpu_usage_pct: number;
  memory_usage_mb: number;
  jobs_completed_count: number;
  jobs_failed_count: number;
}

interface HistoryItem {
  id: string;
  job_id: string;
  job_type: string;
  worker_id: string;
  attempt_number: number;
  status: string;
  started_at: string;
  completed_at: string;
  duration_ms: number;
  execution_log?: string | null;
  error_message?: string | null;
  stack_trace?: string | null;
}

const JobCenter: React.FC = () => {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'jobs' | 'cron' | 'workers' | 'dlq' | 'history'>('dashboard');
  const [loading, setLoading] = useState<boolean>(true);

  // Metrics & Data States
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [totalJobs, setTotalJobs] = useState<number>(0);
  const [schedules, setSchedules] = useState<CronSchedule[]>([]);
  const [workers, setWorkers] = useState<WorkerNode[]>([]);
  const [dlqJobs, setDlqJobs] = useState<Job[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [showEnqueueModal, setShowEnqueueModal] = useState<boolean>(false);
  const [showCronModal, setShowCronModal] = useState<boolean>(false);
  const [selectedJobDetail, setSelectedJobDetail] = useState<Job | null>(null);
  const [selectedHistoryLog, setSelectedHistoryLog] = useState<HistoryItem | null>(null);

  // Form States
  const [newJobType, setNewJobType] = useState<string>('FeeReminderJob');
  const [newJobQueue, setNewJobQueue] = useState<string>('default');
  const [newJobPriority, setNewJobPriority] = useState<string>('NORMAL');
  const [newJobMaxAttempts, setNewJobMaxAttempts] = useState<number>(3);
  const [newJobDelaySec, setNewJobDelaySec] = useState<number>(0);
  const [newJobPayload, setNewJobPayload] = useState<string>('{"recipientCount": 15}');

  // Cron Form
  const [cronName, setCronName] = useState<string>('Daily Fee Reminder');
  const [cronJobType, setCronJobType] = useState<string>('FeeReminderJob');
  const [cronExpr, setCronExpr] = useState<string>('0 8 * * *');

  useEffect(() => {
    fetchAllData();
  }, [activeTab, statusFilter, typeFilter]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };
      const baseUrl = '/api';

      // Always fetch metrics
      const mRes = await fetch(`${baseUrl}/background-jobs/metrics`, { headers });
      if (mRes.ok) setMetrics(await mRes.json());

      if (activeTab === 'dashboard' || activeTab === 'jobs') {
        let url = `${baseUrl}/background-jobs?limit=50`;
        if (statusFilter) url += `&status=${statusFilter}`;
        if (typeFilter) url += `&job_type=${typeFilter}`;
        if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
        const jRes = await fetch(url, { headers });
        if (jRes.ok) {
          const data = await jRes.json();
          setJobs(data.jobs || []);
          setTotalJobs(data.total || 0);
        }
      }

      if (activeTab === 'dashboard' || activeTab === 'cron') {
        const cRes = await fetch(`${baseUrl}/background-jobs/schedules/list`, { headers });
        if (cRes.ok) setSchedules(await cRes.json());
      }

      if (activeTab === 'dashboard' || activeTab === 'workers') {
        const wRes = await fetch(`${baseUrl}/background-jobs/workers/list`, { headers });
        if (wRes.ok) setWorkers(await wRes.json());
      }

      if (activeTab === 'dlq') {
        const dRes = await fetch(`${baseUrl}/background-jobs/dead-letter/list`, { headers });
        if (dRes.ok) {
          const data = await dRes.json();
          setDlqJobs(data.jobs || []);
        }
      }

      if (activeTab === 'history') {
        const hRes = await fetch(`${baseUrl}/background-jobs/history/list?limit=50`, { headers });
        if (hRes.ok) {
          const data = await hRes.json();
          setHistory(data.history || []);
        }
      }
    } catch (err) {
      console.error('Failed to load Background Jobs data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRunWorkerNow = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/background-jobs/process', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ workerId: 'worker-ui-manual' })
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(`Queue processed: ${data.processedCount} jobs (${data.successCount} succeeded, ${data.failedCount} failed)`);
        fetchAllData();
      } else {
        toast.error('Worker execution failed');
      }
    } catch (e) {
      toast.error('Failed to trigger worker queue');
    }
  };

  const handleEnqueueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let parsedPayload = {};
      try {
        if (newJobPayload) parsedPayload = JSON.parse(newJobPayload);
      } catch (err) {
        toast.error('Invalid JSON in payload field');
        return;
      }

      const token = localStorage.getItem('token');
      const res = await fetch('/api/background-jobs', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobType: newJobType,
          queueName: newJobQueue,
          priority: newJobPriority,
          maxAttempts: newJobMaxAttempts,
          delaySeconds: newJobDelaySec,
          payload: parsedPayload
        })
      });

      if (res.ok) {
        toast.success('Background job enqueued successfully!');
        setShowEnqueueModal(false);
        fetchAllData();
      } else {
        const errData = await res.json();
        toast.error(errData.error || 'Failed to enqueue job');
      }
    } catch (err) {
      toast.error('Error submitting job request');
    }
  };

  const handleCreateCronSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/background-jobs/schedules', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cronName,
          jobType: cronJobType,
          cronExpression: cronExpr
        })
      });

      if (res.ok) {
        toast.success('Cron schedule created successfully!');
        setShowCronModal(false);
        fetchAllData();
      } else {
        const errData = await res.json();
        toast.error(errData.error || 'Failed to create cron schedule');
      }
    } catch (err) {
      toast.error('Error creating cron schedule');
    }
  };

  const handleRetryJob = async (jobId: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/background-jobs/${jobId}/retry`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success('Job manual retry triggered!');
        fetchAllData();
      }
    } catch (err) {
      toast.error('Retry action failed');
    }
  };

  const handleCancelJob = async (jobId: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/background-jobs/${jobId}/cancel`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast.info('Job cancelled successfully');
        fetchAllData();
      }
    } catch (err) {
      toast.error('Cancel action failed');
    }
  };

  const handleToggleCron = async (cronId: string, currentActive: number) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/background-jobs/schedules/${cronId}/toggle`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: currentActive === 0 })
      });
      if (res.ok) {
        toast.info(`Cron schedule ${currentActive === 0 ? 'resumed' : 'paused'}`);
        fetchAllData();
      }
    } catch (err) {
      toast.error('Toggle cron action failed');
    }
  };

  const handleRequeueCron = async (cronId: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/background-jobs/schedules/${cronId}/requeue`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success('Cron schedule enqueued immediately!');
        fetchAllData();
      }
    } catch (err) {
      toast.error('Requeue cron failed');
    }
  };

  const handlePurgeDLQ = async () => {
    if (!window.confirm('Are you sure you want to purge all Dead Letter Queue jobs?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/background-jobs/dead-letter/purge', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(`Purged ${data.purgedCount} dead-letter jobs`);
        fetchAllData();
      }
    } catch (e) {
      toast.error('Purge DLQ failed');
    }
  };

  return (
    <div className="job-center-container">
      {/* Header */}
      <div className="job-center-header">
        <div className="job-center-title-group">
          <h1>
            ⚡ Background Jobs & Scheduler
            <span className="status-badge status-COMPLETED">Engine Active</span>
          </h1>
          <p className="job-center-subtitle">
            Unified Platform Execution Layer for Async Tasks, Queues, Workers & Recurring Cron Schedules
          </p>
        </div>
        <div className="job-center-actions">
          <button className="btn btn-secondary" onClick={fetchAllData} disabled={loading}>
            🔄 Refresh
          </button>
          <button className="btn btn-outline" onClick={handleRunWorkerNow}>
            ▶ Run Worker Now
          </button>
          <button className="btn btn-primary" onClick={() => setShowEnqueueModal(true)}>
            + Enqueue Job
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      {metrics && (
        <div className="job-metrics-grid">
          <div className="job-metric-card metric-card-pending">
            <div className="metric-header">
              <span className="metric-label">Pending Jobs</span>
              <span>⏳</span>
            </div>
            <div className="metric-value">{metrics.pendingCount}</div>
          </div>
          <div className="job-metric-card metric-card-running">
            <div className="metric-header">
              <span className="metric-label">Running Jobs</span>
              <span>⚙️</span>
            </div>
            <div className="metric-value">{metrics.runningCount}</div>
          </div>
          <div className="job-metric-card metric-card-completed">
            <div className="metric-header">
              <span className="metric-label">Completed Jobs</span>
              <span>✅</span>
            </div>
            <div className="metric-value">{metrics.completedCount}</div>
          </div>
          <div className="job-metric-card metric-card-failed">
            <div className="metric-header">
              <span className="metric-label">Failed Jobs</span>
              <span>❌</span>
            </div>
            <div className="metric-value">{metrics.failedCount}</div>
          </div>
          <div className="job-metric-card metric-card-retrying">
            <div className="metric-header">
              <span className="metric-label">Retrying</span>
              <span>🔄</span>
            </div>
            <div className="metric-value">{metrics.retryingCount}</div>
          </div>
          <div className="job-metric-card metric-card-deadletter">
            <div className="metric-header">
              <span className="metric-label">Dead Letter</span>
              <span>💀</span>
            </div>
            <div className="metric-value">{metrics.deadLetterCount}</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="job-center-tabs">
        <button
          className={`job-tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          📊 Dashboard Overview
        </button>
        <button
          className={`job-tab-btn ${activeTab === 'jobs' ? 'active' : ''}`}
          onClick={() => setActiveTab('jobs')}
        >
          📋 Background Jobs ({metrics?.totalCount || 0})
        </button>
        <button
          className={`job-tab-btn ${activeTab === 'cron' ? 'active' : ''}`}
          onClick={() => setActiveTab('cron')}
        >
          ⏰ Cron Schedules ({schedules.length})
        </button>
        <button
          className={`job-tab-btn ${activeTab === 'workers' ? 'active' : ''}`}
          onClick={() => setActiveTab('workers')}
        >
          🖥️ Worker Nodes ({metrics?.activeWorkersCount || 0})
        </button>
        <button
          className={`job-tab-btn ${activeTab === 'dlq' ? 'active' : ''}`}
          onClick={() => setActiveTab('dlq')}
        >
          ⚠️ Dead Letter Queue ({metrics?.deadLetterCount || 0})
        </button>
        <button
          className={`job-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          📜 Execution History
        </button>
      </div>

      {/* TAB 1: DASHBOARD OVERVIEW */}
      {activeTab === 'dashboard' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
            <div className="job-table-container" style={{ padding: '20px' }}>
              <h3 style={{ margin: '0 0 16px 0' }}>💡 Platform Registered Job Handlers</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
                {(metrics?.registeredJobTypes || [
                  'FeeReminderJob',
                  'AttendanceSummaryJob',
                  'BackupDatabaseJob',
                  'GenerateReportCardJob',
                  'NotificationJob',
                  'AnalyticsRefreshJob',
                  'SessionCleanupJob'
                ]).map(type => (
                  <div key={type} style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '14px' }}>{type}</div>
                    <div style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 10px 0' }}>Automated business execution task</div>
                    <button
                      className="btn btn-sm btn-outline"
                      style={{ fontSize: '12px' }}
                      onClick={() => {
                        setNewJobType(type);
                        setShowEnqueueModal(true);
                      }}
                    >
                      + Enqueue Now
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="job-table-container" style={{ padding: '20px' }}>
              <h3 style={{ margin: '0 0 16px 0' }}>📈 Engine Metrics</h3>
              <div style={{ fontSize: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', paddingBottom: '8px' }}>
                  <span style={{ color: '#64748b' }}>Success Rate:</span>
                  <span style={{ fontWeight: 700, color: '#166534' }}>{metrics?.successRatePct || 100}%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', paddingBottom: '8px' }}>
                  <span style={{ color: '#64748b' }}>Avg Execution Duration:</span>
                  <span style={{ fontWeight: 700 }}>{metrics?.avgExecutionTimeMs || 0} ms</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', paddingBottom: '8px' }}>
                  <span style={{ color: '#64748b' }}>Active Worker Nodes:</span>
                  <span style={{ fontWeight: 700, color: '#0369a1' }}>{metrics?.activeWorkersCount || 0} Nodes</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Total System Enqueues:</span>
                  <span style={{ fontWeight: 700 }}>{metrics?.totalCount || 0} Jobs</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: BACKGROUND JOBS LISTING */}
      {activeTab === 'jobs' && (
        <div>
          <div className="job-filter-bar">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="PENDING">PENDING</option>
              <option value="QUEUED">QUEUED</option>
              <option value="RUNNING">RUNNING</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="FAILED">FAILED</option>
              <option value="RETRYING">RETRYING</option>
              <option value="DEAD_LETTER">DEAD_LETTER</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>

            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="">All Job Types</option>
              <option value="FeeReminderJob">FeeReminderJob</option>
              <option value="AttendanceSummaryJob">AttendanceSummaryJob</option>
              <option value="BackupDatabaseJob">BackupDatabaseJob</option>
              <option value="GenerateReportCardJob">GenerateReportCardJob</option>
              <option value="NotificationJob">NotificationJob</option>
              <option value="AnalyticsRefreshJob">AnalyticsRefreshJob</option>
              <option value="SessionCleanupJob">SessionCleanupJob</option>
            </select>

            <input
              type="text"
              placeholder="Search jobs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchAllData()}
            />

            <button className="btn btn-secondary" onClick={fetchAllData}>
              Apply Filters
            </button>
          </div>

          <div className="job-table-container">
            <table className="job-table">
              <thead>
                <tr>
                  <th>Job ID / Type</th>
                  <th>Queue</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Attempts</th>
                  <th>Scheduled At</th>
                  <th>Failure Reason / Notes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {jobs.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                      No background jobs found matching criteria.
                    </td>
                  </tr>
                ) : (
                  jobs.map(j => (
                    <tr key={j.id}>
                      <td>
                        <div style={{ fontWeight: 700 }}>{j.job_type}</div>
                        <div style={{ fontSize: '12px', color: '#64748b', fontFamily: 'monospace' }}>{j.id}</div>
                      </td>
                      <td><code>{j.queue_name}</code></td>
                      <td><span className={`priority-badge priority-${j.priority}`}>{j.priority}</span></td>
                      <td><span className={`status-badge status-${j.status}`}>{j.status}</span></td>
                      <td>{j.attempts} / {j.max_attempts}</td>
                      <td>{new Date(j.scheduled_at).toLocaleString()}</td>
                      <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {j.failure_reason || (j.completed_at ? `Done ${new Date(j.completed_at).toLocaleTimeString()}` : '-')}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button className="btn btn-sm btn-outline" onClick={() => setSelectedJobDetail(j)}>
                            Inspect
                          </button>
                          {(j.status === 'FAILED' || j.status === 'DEAD_LETTER') && (
                            <button className="btn btn-sm btn-primary" onClick={() => handleRetryJob(j.id)}>
                              Retry
                            </button>
                          )}
                          {(j.status === 'PENDING' || j.status === 'RETRYING') && (
                            <button className="btn btn-sm btn-secondary" onClick={() => handleCancelJob(j.id)}>
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: CRON SCHEDULES */}
      {activeTab === 'cron' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3>Active Recurring Cron Jobs</h3>
            <button className="btn btn-primary" onClick={() => setShowCronModal(true)}>
              + Add Cron Schedule
            </button>
          </div>

          <div className="job-table-container">
            <table className="job-table">
              <thead>
                <tr>
                  <th>Schedule Name</th>
                  <th>Job Type</th>
                  <th>Cron Expression</th>
                  <th>Status</th>
                  <th>Last Run</th>
                  <th>Next Run</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {schedules.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                      No cron schedules configured.
                    </td>
                  </tr>
                ) : (
                  schedules.map(s => (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 700 }}>{s.name}</td>
                      <td><code>{s.job_type}</code></td>
                      <td><code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>{s.cron_expression}</code></td>
                      <td>
                        <span className={`status-badge status-${s.is_active === 1 ? 'COMPLETED' : 'CANCELLED'}`}>
                          {s.is_active === 1 ? 'Active' : 'Paused'}
                        </span>
                      </td>
                      <td>{s.last_run_at ? new Date(s.last_run_at).toLocaleString() : 'Never'}</td>
                      <td>{s.next_run_at ? new Date(s.next_run_at).toLocaleString() : 'Pending calculation'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button className="btn btn-sm btn-outline" onClick={() => handleToggleCron(s.id, s.is_active)}>
                            {s.is_active === 1 ? 'Pause' : 'Resume'}
                          </button>
                          <button className="btn btn-sm btn-secondary" onClick={() => handleRequeueCron(s.id)}>
                            Trigger Now
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: WORKER HEALTH MONITORING */}
      {activeTab === 'workers' && (
        <div>
          <div className="workers-grid">
            {workers.length === 0 ? (
              <div style={{ color: '#64748b', padding: '20px' }}>No active worker nodes registered yet.</div>
            ) : (
              workers.map(w => (
                <div key={w.id} className="worker-card">
                  <div className="worker-card-header">
                    <span className="worker-name">🖥️ {w.name || w.id}</span>
                    <span className={`status-badge status-${w.status === 'HEALTHY' ? 'COMPLETED' : w.status === 'BUSY' ? 'RUNNING' : 'FAILED'}`}>
                      {w.status}
                    </span>
                  </div>
                  <div className="worker-stat-row">
                    <span>Last Heartbeat:</span>
                    <strong>{new Date(w.last_heartbeat_at).toLocaleTimeString()}</strong>
                  </div>
                  <div className="worker-stat-row">
                    <span>CPU Usage:</span>
                    <strong>{w.cpu_usage_pct}%</strong>
                  </div>
                  <div className="worker-stat-row">
                    <span>Memory Usage:</span>
                    <strong>{w.memory_usage_mb} MB</strong>
                  </div>
                  <div className="worker-stat-row">
                    <span>Jobs Completed:</span>
                    <strong style={{ color: '#166534' }}>{w.jobs_completed_count}</strong>
                  </div>
                  <div className="worker-stat-row">
                    <span>Jobs Failed:</span>
                    <strong style={{ color: '#991b1b' }}>{w.jobs_failed_count}</strong>
                  </div>
                  <div className="worker-stat-row">
                    <span>Current Execution:</span>
                    <span>{w.current_job_type || 'Idle'}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 5: DEAD LETTER QUEUE */}
      {activeTab === 'dlq' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            <p style={{ color: '#64748b', margin: 0 }}>Jobs that exceeded retry limits move here for manual inspection and re-triggering.</p>
            <button className="btn btn-secondary" onClick={handlePurgeDLQ} disabled={dlqJobs.length === 0}>
              🗑️ Purge Dead Letter Queue
            </button>
          </div>

          <div className="job-table-container">
            <table className="job-table">
              <thead>
                <tr>
                  <th>Job ID / Type</th>
                  <th>Attempts</th>
                  <th>Failed Reason</th>
                  <th>Created Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {dlqJobs.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                      Dead Letter Queue is empty! All background jobs operating smoothly.
                    </td>
                  </tr>
                ) : (
                  dlqJobs.map(j => (
                    <tr key={j.id}>
                      <td>
                        <div style={{ fontWeight: 700, color: '#991b1b' }}>{j.job_type}</div>
                        <div style={{ fontSize: '12px', color: '#64748b', fontFamily: 'monospace' }}>{j.id}</div>
                      </td>
                      <td>{j.attempts} / {j.max_attempts}</td>
                      <td style={{ color: '#b91c1c', fontWeight: 600 }}>{j.failure_reason || 'Unknown execution failure'}</td>
                      <td>{new Date(j.created_at).toLocaleString()}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button className="btn btn-sm btn-outline" onClick={() => setSelectedJobDetail(j)}>Inspect</button>
                          <button className="btn btn-sm btn-primary" onClick={() => handleRetryJob(j.id)}>Retry</button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: EXECUTION HISTORY */}
      {activeTab === 'history' && (
        <div>
          <div className="job-table-container">
            <table className="job-table">
              <thead>
                <tr>
                  <th>Job ID / Type</th>
                  <th>Worker Node</th>
                  <th>Attempt</th>
                  <th>Status</th>
                  <th>Duration</th>
                  <th>Executed At</th>
                  <th>Log</th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                      No execution history recorded yet.
                    </td>
                  </tr>
                ) : (
                  history.map(h => (
                    <tr key={h.id}>
                      <td>
                        <div style={{ fontWeight: 700 }}>{h.job_type}</div>
                        <div style={{ fontSize: '12px', color: '#64748b', fontFamily: 'monospace' }}>{h.job_id}</div>
                      </td>
                      <td><code>{h.worker_id}</code></td>
                      <td>#{h.attempt_number}</td>
                      <td>
                        <span className={`status-badge status-${h.status === 'SUCCESS' ? 'COMPLETED' : 'FAILED'}`}>
                          {h.status}
                        </span>
                      </td>
                      <td>{h.duration_ms} ms</td>
                      <td>{new Date(h.completed_at).toLocaleString()}</td>
                      <td>
                        <button className="btn btn-sm btn-outline" onClick={() => setSelectedHistoryLog(h)}>
                          View Log
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: ENQUEUE JOB */}
      {showEnqueueModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">+ Enqueue Background Job</h3>
              <button className="modal-close-btn" onClick={() => setShowEnqueueModal(false)}>✕</button>
            </div>
            <form onSubmit={handleEnqueueSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ fontWeight: 600, display: 'block', marginBottom: '4px' }}>Job Type</label>
                  <select
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    value={newJobType}
                    onChange={(e) => setNewJobType(e.target.value)}
                  >
                    <option value="FeeReminderJob">FeeReminderJob</option>
                    <option value="AttendanceSummaryJob">AttendanceSummaryJob</option>
                    <option value="BackupDatabaseJob">BackupDatabaseJob</option>
                    <option value="GenerateReportCardJob">GenerateReportCardJob</option>
                    <option value="NotificationJob">NotificationJob</option>
                    <option value="AnalyticsRefreshJob">AnalyticsRefreshJob</option>
                    <option value="SessionCleanupJob">SessionCleanupJob</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontWeight: 600, display: 'block', marginBottom: '4px' }}>Queue Name</label>
                    <input
                      type="text"
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                      value={newJobQueue}
                      onChange={(e) => setNewJobQueue(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ fontWeight: 600, display: 'block', marginBottom: '4px' }}>Priority</label>
                    <select
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                      value={newJobPriority}
                      onChange={(e) => setNewJobPriority(e.target.value)}
                    >
                      <option value="LOW">LOW</option>
                      <option value="NORMAL">NORMAL</option>
                      <option value="HIGH">HIGH</option>
                      <option value="URGENT">URGENT</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontWeight: 600, display: 'block', marginBottom: '4px' }}>Max Attempts</label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                      value={newJobMaxAttempts}
                      onChange={(e) => setNewJobMaxAttempts(parseInt(e.target.value))}
                    />
                  </div>
                  <div>
                    <label style={{ fontWeight: 600, display: 'block', marginBottom: '4px' }}>Delay (Seconds)</label>
                    <input
                      type="number"
                      min={0}
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                      value={newJobDelaySec}
                      onChange={(e) => setNewJobDelaySec(parseInt(e.target.value))}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontWeight: 600, display: 'block', marginBottom: '4px' }}>Payload JSON</label>
                  <textarea
                    rows={4}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontFamily: 'monospace' }}
                    value={newJobPayload}
                    onChange={(e) => setNewJobPayload(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowEnqueueModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Enqueue Job
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE CRON */}
      {showCronModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">+ Add Recurring Cron Schedule</h3>
              <button className="modal-close-btn" onClick={() => setShowCronModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateCronSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ fontWeight: 600, display: 'block', marginBottom: '4px' }}>Schedule Name</label>
                  <input
                    type="text"
                    required
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    value={cronName}
                    onChange={(e) => setCronName(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ fontWeight: 600, display: 'block', marginBottom: '4px' }}>Job Type</label>
                  <select
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    value={cronJobType}
                    onChange={(e) => setCronJobType(e.target.value)}
                  >
                    <option value="FeeReminderJob">FeeReminderJob</option>
                    <option value="AttendanceSummaryJob">AttendanceSummaryJob</option>
                    <option value="BackupDatabaseJob">BackupDatabaseJob</option>
                    <option value="GenerateReportCardJob">GenerateReportCardJob</option>
                    <option value="AnalyticsRefreshJob">AnalyticsRefreshJob</option>
                    <option value="SessionCleanupJob">SessionCleanupJob</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontWeight: 600, display: 'block', marginBottom: '4px' }}>Cron Expression</label>
                  <input
                    type="text"
                    required
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontFamily: 'monospace' }}
                    value={cronExpr}
                    onChange={(e) => setCronExpr(e.target.value)}
                    placeholder="e.g. 0 8 * * * or */5 * * * *"
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowCronModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Create Schedule
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INSPECT JOB MODAL */}
      {selectedJobDetail && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">🔍 Inspect Job Details ({selectedJobDetail.id})</h3>
              <button className="modal-close-btn" onClick={() => setSelectedJobDetail(null)}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div><strong>Job Type:</strong> {selectedJobDetail.job_type}</div>
              <div><strong>Status:</strong> <span className={`status-badge status-${selectedJobDetail.status}`}>{selectedJobDetail.status}</span></div>
              <div><strong>Priority:</strong> {selectedJobDetail.priority}</div>
              <div><strong>Attempts:</strong> {selectedJobDetail.attempts} / {selectedJobDetail.max_attempts}</div>
              {selectedJobDetail.failure_reason && (
                <div>
                  <strong style={{ color: '#991b1b' }}>Failure Reason:</strong>
                  <div style={{ color: '#b91c1c', background: '#fee2e2', padding: '10px', borderRadius: '6px', marginTop: '4px' }}>
                    {selectedJobDetail.failure_reason}
                  </div>
                </div>
              )}
              <div>
                <strong>Payload JSON:</strong>
                <pre className="code-block">{selectedJobDetail.payload_json || '{}'}</pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW LOG MODAL */}
      {selectedHistoryLog && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">📜 Execution Log Details</h3>
              <button className="modal-close-btn" onClick={() => setSelectedHistoryLog(null)}>✕</button>
            </div>
            <div>
              <pre className="code-block">{selectedHistoryLog.execution_log || 'No detailed log output.'}</pre>
              {selectedHistoryLog.stack_trace && (
                <div style={{ marginTop: '12px' }}>
                  <strong style={{ color: '#ef4444' }}>Stack Trace:</strong>
                  <pre className="code-block">{selectedHistoryLog.stack_trace}</pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobCenter;
