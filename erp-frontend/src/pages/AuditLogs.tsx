import { PageGuidance } from '../components/PageGuidance';
import { useEffect, useState, useCallback } from 'react';
import Layout from '../components/Layout';
import { api } from '../services/api';
import { Search, ClipboardList, Filter, ChevronLeft, ChevronRight } from 'lucide-react';

interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  module: string;
  record_id?: string;
  description: string;
  timestamp: string;
  user_name: string;
  user_email: string;
}

interface AuditResponse {
  data: AuditLog[];
  total: number;
  page: number;
  limit: number;
  modules: string[];
}

const LIMIT = 50;

export default function AuditLogs() {
  const [logs, setLogs]         = useState<AuditLog[]>([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [modules, setModules]   = useState<string[]>([]);
  const [loading, setLoading]   = useState(true);

  // Filters
  const [search, setSearch]     = useState('');
  const [module, setModule]     = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate]     = useState('');

  const fetchLogs = useCallback(async (p: number = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(p),
        limit: String(LIMIT),
      });
      if (module)   params.set('module', module);
      if (search)   params.set('action', search);
      if (fromDate) params.set('from_date', fromDate);
      if (toDate)   params.set('to_date', toDate);

      const res: AuditResponse = await api.get(`/audit-logs?${params.toString()}`);
      setLogs(res.data || []);
      setTotal(res.total || 0);
      setPage(res.page || p);
      if (res.modules?.length) setModules(res.modules);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoading(false);
    }
  }, [module, search, fromDate, toDate]);

  useEffect(() => {
    fetchLogs(1);
  }, [fetchLogs]);

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  const getActionBadgeColor = (action: string) => {
    if (action.startsWith('CREATE') || action.startsWith('BULK_IMPORT')) return 'badge-success';
    if (action.startsWith('DELETE')) return 'badge-danger';
    if (action.startsWith('UPDATE')) return 'badge-warning';
    if (action.startsWith('LOGIN'))  return 'badge-secondary';
    if (action.startsWith('EXPORT') || action.startsWith('RESTORE')) return 'badge-info';
    return 'badge-secondary';
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs(1);
  };

  return (
    <Layout>
      <PageGuidance
        title="Activity Log"
        description="Use this page to review a list of actions and updates made by users in the system."
        steps={["See who made changes, what they changed, and when.","Use the search filters to find activities for a specific date or module.","Browse the pages to see older activities."]}
      />
      <div className="page-header">
        <div>
          <h2>System Audit Logs</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Track all administrative actions, data edits, and logins inside the institution.
            {total > 0 && <span style={{ marginLeft: '0.5rem', fontWeight: 600, color: 'var(--primary)' }}>({total} total entries)</span>}
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <form className="card filters" onSubmit={handleSearch} style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end', padding: '1.25rem 1.5rem' }}>
        <div style={{ flex: '2', minWidth: '200px' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'block' }}>Search Action</label>
          <div className="search-container" style={{ margin: 0 }}>
            <Search size={16} />
            <input
              type="text"
              placeholder="e.g. LOGIN, UPDATE, BULK_IMPORT..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div style={{ flex: '1', minWidth: '150px' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'block' }}>
            <Filter size={13} style={{ verticalAlign: 'middle', marginRight: '0.25rem' }} />
            Module
          </label>
          <select value={module} onChange={(e) => setModule(e.target.value)} style={{ width: '100%' }}>
            <option value="">All Modules</option>
            {modules.map(m => (
              <option key={m} value={m}>{m.replace(/_/g, ' ').toUpperCase()}</option>
            ))}
          </select>
        </div>

        <div style={{ minWidth: '140px' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'block' }}>From Date</label>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </div>

        <div style={{ minWidth: '140px' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'block' }}>To Date</label>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>

        <button type="submit" className="btn btn-primary" style={{ whiteSpace: 'nowrap', height: '38px' }}>
          Apply Filters
        </button>
        <button
          type="button"
          className="btn btn-outline"
          style={{ height: '38px', whiteSpace: 'nowrap' }}
          onClick={() => { setSearch(''); setModule(''); setFromDate(''); setToDate(''); }}
        >
          Clear
        </button>
      </form>

      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <p style={{ padding: '2rem', color: 'var(--text-muted)', textAlign: 'center' }}>Loading audit logs...</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '170px' }}>Timestamp</th>
                <th>User</th>
                <th style={{ width: '200px' }}>Action</th>
                <th style={{ width: '120px' }}>Module</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id}>
                  <td style={{ whiteSpace: 'nowrap', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{log.user_name}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{log.user_email}</div>
                  </td>
                  <td>
                    <span className={`badge ${getActionBadgeColor(log.action)}`} style={{ fontSize: '0.7rem', whiteSpace: 'nowrap' }}>
                      {log.action}
                    </span>
                  </td>
                  <td>
                    <code style={{ background: '#f1f5f9', padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' }}>
                      {log.module}
                    </code>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.875rem' }}>{log.description}</div>
                    {log.record_id && (
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                        ID: <code style={{ background: '#f1f5f9', padding: '0.1rem 0.25rem', borderRadius: '3px' }}>{log.record_id}</code>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '3rem' }}>
                    <ClipboardList size={32} style={{ color: 'var(--text-muted)', opacity: 0.4, display: 'block', margin: '0 auto 0.75rem' }} />
                    <p style={{ color: 'var(--text-muted)', margin: 0 }}>No audit logs found matching your filters.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1.5rem' }}>
          <button
            className="btn btn-outline"
            onClick={() => fetchLogs(page - 1)}
            disabled={page <= 1}
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.45rem 1rem' }}
          >
            <ChevronLeft size={16} /> Prev
          </button>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            Page {page} of {totalPages}
          </span>
          <button
            className="btn btn-outline"
            onClick={() => fetchLogs(page + 1)}
            disabled={page >= totalPages}
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.45rem 1rem' }}
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
      )}
    </Layout>
  );
}
