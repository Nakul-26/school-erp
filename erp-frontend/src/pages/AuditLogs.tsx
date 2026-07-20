import './AuditLogs.css';
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
          <p className="audit-logs-text-1">
            Track all administrative actions, data edits, and logins inside the institution.
            {total > 0 && <span className="audit-logs-span-2">({total} total entries)</span>}
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <form className="card filters audit-logs-filter-card" onSubmit={handleSearch}>
        <div className="search-container audit-logs-search-container">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search logs by action or user..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div>
          <select value={module} onChange={(e) => setModule(e.target.value)} className="input audit-logs-select">
            <option value="">All Modules</option>
            {modules.map(m => (
              <option key={m} value={m}>{m.replace(/_/g, ' ').toUpperCase()}</option>
            ))}
          </select>
        </div>

        <div>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="input audit-logs-date-input"
            title="From Date"
          />
        </div>

        <div>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="input audit-logs-date-input"
            title="To Date"
          />
        </div>

        <button type="submit" className="btn btn-primary audit-logs-btn">
          Search Logs
        </button>
        <button type="button" className="btn btn-outline audit-logs-btn" onClick={() => { setSearch(''); setModule(''); setFromDate(''); setToDate(''); }}>
          Clear
        </button>
      </form>

      <div className="card audit-logs-table-card">
        {loading ? (
          <p className="audit-logs-text-18">Loading audit logs...</p>
        ) : (
          <div className="audit-logs-div-19">
            <table className="table">
              <thead>
                <tr>
                  <th className="audit-logs-th-20">Timestamp</th>
                  <th>User</th>
                  <th className="audit-logs-th-21">Action</th>
                  <th className="audit-logs-th-22">Module</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id}>
                    <td className="audit-logs-td-23">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td>
                      <div className="audit-logs-div-24">{log.user_name}</div>
                      <div className="audit-logs-div-25">{log.user_email}</div>
                    </td>
                    <td>
                      <span className={`badge ${getActionBadgeColor(log.action)} audit-logs-span-26`}>
                        {log.action}
                      </span>
                    </td>
                    <td>
                      <code className="audit-logs-code-27">
                        {log.module}
                      </code>
                    </td>
                    <td>
                      <div className="audit-logs-div-28">{log.description}</div>
                      {log.record_id && (
                        <div className="audit-logs-div-29">
                          ID: <code className="audit-logs-code-30">{log.record_id}</code>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="audit-logs-td-31">
                      <ClipboardList size={32} className="audit-logs-ClipboardList-32"  />
                      <p className="audit-logs-text-33">No audit logs found matching your filters.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="audit-logs-row-34">
          <button className="btn btn-outline audit-logs-btn" onClick={() => fetchLogs(page - 1)} disabled={page <= 1}>
            <ChevronLeft size={16} /> Prev
          </button>
          <span className="audit-logs-span-36">
            Page {page} of {totalPages}
          </span>
          <button className="btn btn-outline audit-logs-btn" onClick={() => fetchLogs(page + 1)} disabled={page>= totalPages}>
            Next <ChevronRight size={16} />
          </button>
        </div>
      )}
    </Layout>
  );
}
