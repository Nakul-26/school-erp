import './AuditLogs.css';
import React, { useEffect, useState, useCallback } from 'react';
import Layout from '../components/Layout';
import { PageGuidance } from '../components/PageGuidance';
import { api, BASE_URL } from '../services/api';
import { 
  ClipboardList, Search, Filter, ShieldAlert, Download, FileText, Activity, 
  Clock, Eye, ChevronLeft, ChevronRight, Hash, UserCheck, RefreshCw, X, ArrowRight
} from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

interface AuditLog {
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
  description: string;
  before_json?: string;
  after_json?: string;
  ip_address?: string;
  user_agent?: string;
  request_id?: string;
  status: string;
  reason?: string;
  timestamp: string;
}

const LIMIT = 50;

export default function AuditLogs() {
  const toastCtx = useToast();
  const [activeTab, setActiveTab] = useState<'activity' | 'timeline' | 'security' | 'exports'>('activity');

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [modules, setModules] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [requestIdFilter, setRequestIdFilter] = useState('');

  // Entity Timeline state
  const [entityType, setEntityType] = useState('Student');
  const [entityId, setEntityId] = useState('');
  const [timelineLogs, setTimelineLogs] = useState<AuditLog[]>([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);

  // Security Events state
  const [securityLogs, setSecurityLogs] = useState<AuditLog[]>([]);
  const [loadingSecurity, setLoadingSecurity] = useState(false);

  // Diff Modal State
  const [selectedDiffLog, setSelectedDiffLog] = useState<AuditLog | null>(null);

  const fetchLogs = useCallback(async (p: number = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(p),
        limit: String(LIMIT),
      });
      if (moduleFilter) params.set('module', moduleFilter);
      if (actionFilter) params.set('action', actionFilter);
      if (statusFilter) params.set('status', statusFilter);
      if (search) params.set('search', search);
      if (fromDate) params.set('from_date', fromDate);
      if (toDate) params.set('to_date', toDate);
      if (requestIdFilter) params.set('request_id', requestIdFilter);

      const res = await api.get(`/audit-logs?${params.toString()}`);
      setLogs(res.data || []);
      setTotal(res.total || 0);
      setPage(res.page || p);
      if (res.modules?.length) setModules(res.modules);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoading(false);
    }
  }, [moduleFilter, actionFilter, statusFilter, search, fromDate, toDate, requestIdFilter]);

  useEffect(() => {
    if (activeTab === 'activity') {
      fetchLogs(1);
    } else if (activeTab === 'security') {
      fetchSecurityLogs();
    }
  }, [activeTab, fetchLogs]);

  const fetchSecurityLogs = async () => {
    setLoadingSecurity(true);
    try {
      const data = await api.get('/audit-logs/security');
      setSecurityLogs(data || []);
    } catch (err) {
      console.error('Error fetching security events:', err);
    } finally {
      setLoadingSecurity(false);
    }
  };

  const fetchEntityTimeline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entityId.trim()) {
      toastCtx.error('Please enter an Entity ID');
      return;
    }
    setLoadingTimeline(true);
    try {
      const data = await api.get(`/audit-logs/entity/${entityType}/${entityId.trim()}`);
      setTimelineLogs(data || []);
    } catch (err: any) {
      toastCtx.error(err.message || 'Failed to fetch timeline');
    } finally {
      setLoadingTimeline(false);
    }
  };

  const handleExport = (type: 'csv' | 'json') => {
    const params = new URLSearchParams();
    if (moduleFilter) params.set('module', moduleFilter);
    if (fromDate) params.set('from_date', fromDate);
    if (toDate) params.set('to_date', toDate);

    window.open(`${BASE_URL}/audit-logs/export/${type}?${params.toString()}`, '_blank');
  };

  const getActionBadgeColor = (action: string) => {
    if (action.startsWith('CREATE') || action.startsWith('BULK')) return 'badge-success';
    if (action.startsWith('DELETE') || action.startsWith('REJECT')) return 'badge-danger';
    if (action.startsWith('UPDATE')) return 'badge-warning';
    if (action.startsWith('SECURITY') || action.startsWith('LOGIN')) return 'badge-info';
    return 'badge-secondary';
  };

  const parseJsonSafe = (str?: string) => {
    if (!str) return null;
    try {
      return JSON.parse(str);
    } catch (e) {
      return str;
    }
  };

  const renderJsonDiff = (beforeStr?: string, afterStr?: string) => {
    const beforeObj = parseJsonSafe(beforeStr);
    const afterObj = parseJsonSafe(afterStr);

    if (typeof beforeObj !== 'object' || typeof afterObj !== 'object' || !beforeObj || !afterObj) {
      return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <h5>Before</h5>
            <pre style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '6px', fontSize: '0.8rem' }}>{beforeStr || 'None'}</pre>
          </div>
          <div>
            <h5>After</h5>
            <pre style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '6px', fontSize: '0.8rem' }}>{afterStr || 'None'}</pre>
          </div>
        </div>
      );
    }

    const allKeys = Array.from(new Set([...Object.keys(beforeObj), ...Object.keys(afterObj)]));

    return (
      <table className="table" style={{ fontSize: '0.85rem' }}>
        <thead>
          <tr>
            <th>Property</th>
            <th>Old Value</th>
            <th>New Value</th>
          </tr>
        </thead>
        <tbody>
          {allKeys.map(key => {
            const oldVal = JSON.stringify(beforeObj[key]);
            const newVal = JSON.stringify(afterObj[key]);
            const isChanged = oldVal !== newVal;

            return (
              <tr key={key} style={{ background: isChanged ? 'rgba(234, 179, 8, 0.08)' : 'transparent' }}>
                <td><code>{key}</code></td>
                <td style={{ color: isChanged ? '#dc2626' : 'inherit' }}>{oldVal ?? 'undefined'}</td>
                <td style={{ color: isChanged ? '#16a34a' : 'inherit', fontWeight: isChanged ? '600' : 'normal' }}>{newVal ?? 'undefined'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  };

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <Layout>
      <PageGuidance
        title="Central Audit Logging Framework"
        description="Immutable, event-driven audit framework for transaction compliance, security monitoring, and entity lifecycle tracing."
        steps={[
          "Inspect all append-only audit entries recorded across ERP modules.",
          "Trace entity lifecycle changes with side-by-side visual diff inspection.",
          "Export compliance records in CSV or JSON format."
        ]}
      />

      <div className="page-header">
        <div>
          <h2>System Audit Framework</h2>
          <p className="text-muted" style={{ margin: 0 }}>
            Single source of truth for administrative operations, data updates & security events
            {total > 0 && <span style={{ marginLeft: '0.5rem', color: '#4f46e5', fontWeight: '600' }}>({total} entries)</span>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-outline" onClick={() => handleExport('csv')}>
            <Download size={16} /> Export CSV
          </button>
          <button className="btn btn-outline" onClick={() => handleExport('json')}>
            <FileText size={16} /> Export JSON
          </button>
        </div>
      </div>

      {/* TABS */}
      <div className="audit-tabs-bar" style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border)', marginBottom: '1.5rem' }}>
        <button className={`tab-btn ${activeTab === 'activity' ? 'active' : ''}`} onClick={() => setActiveTab('activity')}>
          <Activity size={16} /> Recent Activity
        </button>
        <button className={`tab-btn ${activeTab === 'timeline' ? 'active' : ''}`} onClick={() => setActiveTab('timeline')}>
          <Clock size={16} /> Entity History
        </button>
        <button className={`tab-btn ${activeTab === 'security' ? 'active' : ''}`} onClick={() => setActiveTab('security')}>
          <ShieldAlert size={16} /> Security Events
        </button>
      </div>

      {/* TAB 1: RECENT ACTIVITY */}
      {activeTab === 'activity' && (
        <>
          {/* SEARCH FILTERS */}
          <div className="card mb-4" style={{ padding: '1rem 1.25rem' }}>
            <form onSubmit={(e) => { e.preventDefault(); fetchLogs(1); }} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', alignItems: 'end' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.75rem' }}>Search Keywords</label>
                <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Description or action..." className="input input-sm" />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.75rem' }}>Module</label>
                <select value={moduleFilter} onChange={e => setModuleFilter(e.target.value)} className="input input-sm">
                  <option value="">All Modules</option>
                  {modules.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.75rem' }}>Action</label>
                <input type="text" value={actionFilter} onChange={e => setActionFilter(e.target.value)} placeholder="CREATE, UPDATE..." className="input input-sm" />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.75rem' }}>Status</label>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input input-sm">
                  <option value="">All Statuses</option>
                  <option value="SUCCESS">SUCCESS</option>
                  <option value="FAILURE">FAILURE</option>
                  <option value="BLOCKED">BLOCKED</option>
                </select>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.75rem' }}>Request ID</label>
                <input type="text" value={requestIdFilter} onChange={e => setRequestIdFilter(e.target.value)} placeholder="Correlation ID..." className="input input-sm" />
              </div>
              <button type="submit" className="btn btn-primary btn-sm" style={{ height: '36px' }}>
                <Filter size={14} /> Filter
              </button>
            </form>
          </div>

          {/* TABLE */}
          <div className="card">
            {loading ? <p>Loading audit entries...</p> : logs.length === 0 ? <p className="text-muted">No audit logs found matching criteria.</p> : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>User</th>
                    <th>Module</th>
                    <th>Action / Event</th>
                    <th>Description</th>
                    <th>Request ID</th>
                    <th>Status</th>
                    <th>Diff</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log.id}>
                      <td style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                        {new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td>
                        <strong>{log.user_name || 'System'}</strong>
                        {log.user_role && <div className="text-muted" style={{ fontSize: '0.75rem' }}>{log.user_role}</div>}
                      </td>
                      <td><span className="badge badge-outline">{log.module}</span></td>
                      <td>
                        <span className={`badge ${getActionBadgeColor(log.action)}`}>{log.action}</span>
                        {log.event_name && <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>{log.event_name}</div>}
                      </td>
                      <td style={{ maxWidth: '280px', fontSize: '0.85rem' }}>{log.description}</td>
                      <td>
                        {log.request_id ? (
                          <code style={{ fontSize: '0.75rem', cursor: 'pointer' }} onClick={() => setRequestIdFilter(log.request_id || '')} title="Click to filter by Request ID">
                            {log.request_id.substring(0, 12)}...
                          </code>
                        ) : '-'}
                      </td>
                      <td>
                        <span className={`badge badge-${log.status === 'SUCCESS' ? 'success' : 'danger'}`}>{log.status}</span>
                      </td>
                      <td>
                        {(log.before_json || log.after_json) && (
                          <button className="btn btn-sm btn-outline" onClick={() => setSelectedDiffLog(log)}>
                            <Eye size={12} /> View Diff
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* PAGINATION */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem' }}>
              <span className="text-muted" style={{ fontSize: '0.85rem' }}>Page {page} of {totalPages}</span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button disabled={page <= 1} onClick={() => fetchLogs(page - 1)} className="btn btn-sm btn-outline">
                  <ChevronLeft size={14} /> Previous
                </button>
                <button disabled={page >= totalPages} onClick={() => fetchLogs(page + 1)} className="btn btn-sm btn-outline">
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* TAB 2: ENTITY HISTORY TIMELINE */}
      {activeTab === 'timeline' && (
        <div className="card">
          <h3>Entity Change History Timeline</h3>
          <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '1.5rem' }}>View complete chronological audit trail and state transitions for a specific entity</p>

          <form onSubmit={fetchEntityTimeline} style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', maxWidth: '600px' }}>
            <select value={entityType} onChange={e => setEntityType(e.target.value)} className="input" style={{ width: '180px' }}>
              <option value="Student">Student</option>
              <option value="FeeRecord">Fee Record</option>
              <option value="Exam">Exam</option>
              <option value="User">User</option>
              <option value="Attendance">Attendance</option>
            </select>
            <input type="text" value={entityId} onChange={e => setEntityId(e.target.value)} placeholder="Entity ID (e.g. std-1001)..." className="input" style={{ flex: 1 }} />
            <button type="submit" className="btn btn-primary">
              <Search size={16} /> Fetch Timeline
            </button>
          </form>

          {loadingTimeline ? <p>Fetching entity timeline...</p> : timelineLogs.length === 0 ? (
            <p className="text-muted">Enter an Entity ID above to load its change timeline.</p>
          ) : (
            <div className="timeline-container" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderLeft: '2px solid #e2e8f0', paddingLeft: '1.5rem', marginLeft: '0.5rem' }}>
              {timelineLogs.map((item, idx) => (
                <div key={item.id} style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '-1.95rem', top: '0.25rem', width: '12px', height: '12px', borderRadius: '50%', background: '#4f46e5' }} />
                  <div className="card" style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className={`badge ${getActionBadgeColor(item.action)}`}>{item.action}</span>
                      <span className="text-muted" style={{ fontSize: '0.75rem' }}>{new Date(item.timestamp).toLocaleString()}</span>
                    </div>
                    <p style={{ margin: '0.5rem 0 0.25rem 0', fontWeight: '600' }}>{item.description}</p>
                    <div className="text-muted" style={{ fontSize: '0.8rem' }}>By: {item.user_name || 'System'} ({item.user_role || 'User'})</div>
                    {(item.before_json || item.after_json) && (
                      <button className="btn btn-sm btn-outline" style={{ marginTop: '0.5rem' }} onClick={() => setSelectedDiffLog(item)}>
                        <Eye size={12} /> Inspect Snapshot Diff
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SECURITY EVENTS */}
      {activeTab === 'security' && (
        <div className="card">
          <h3>Security & Authentication Audit Events</h3>
          <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '1.5rem' }}>Tracks authentication attempts, failed logins, password resets & permission updates</p>

          {loadingSecurity ? <p>Loading security events...</p> : securityLogs.length === 0 ? (
            <p className="text-muted">No security alert events logged.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>User</th>
                  <th>Event</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {securityLogs.map(s => (
                  <tr key={s.id}>
                    <td>{new Date(s.timestamp).toLocaleString()}</td>
                    <td><strong>{s.user_name || s.user_id || 'Unknown'}</strong></td>
                    <td><span className="badge badge-danger">{s.event_name || s.action}</span></td>
                    <td>{s.description}</td>
                    <td><span className={`badge badge-${s.status === 'SUCCESS' ? 'success' : 'danger'}`}>{s.status}</span></td>
                    <td className="text-muted" style={{ fontSize: '0.8rem' }}>{s.reason || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* DIFF INSPECTION MODAL */}
      {selectedDiffLog && (
        <div className="modal">
          <div className="modal-content" style={{ maxWidth: '750px', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ margin: 0 }}>Snapshot Visual Diff</h3>
                <p className="text-muted" style={{ margin: 0, fontSize: '0.8rem' }}>{selectedDiffLog.description}</p>
              </div>
              <button className="btn btn-outline btn-sm" onClick={() => setSelectedDiffLog(null)}>
                <X size={16} /> Close
              </button>
            </div>

            {renderJsonDiff(selectedDiffLog.before_json, selectedDiffLog.after_json)}
          </div>
        </div>
      )}
    </Layout>
  );
}
