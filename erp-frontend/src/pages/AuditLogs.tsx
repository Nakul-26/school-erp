import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { api } from '../services/api';
import { Search, ClipboardList } from 'lucide-react';

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

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const data = await api.get('/audit-logs');
      setLogs(data);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const getActionBadgeColor = (action: string) => {
    if (action.startsWith('CREATE')) return 'badge-success';
    if (action.startsWith('DELETE')) return 'badge-danger';
    if (action.startsWith('UPDATE')) return 'badge-warning';
    return 'badge-secondary'; // e.g. LOGIN or others
  };

  const filteredLogs = logs.filter(log => 
    log.description.toLowerCase().includes(search.toLowerCase()) ||
    log.user_email.toLowerCase().includes(search.toLowerCase()) ||
    log.action.toLowerCase().includes(search.toLowerCase()) ||
    log.module.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h2>System Audit Logs</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Track all administrative actions, data edits, and logins inside the institution.
          </p>
        </div>
      </div>

      <div className="card filters">
        <div className="search-container">
          <Search size={18} />
          <input 
            type="text" 
            placeholder="Search logs by user, action, description, or module..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="card">
        {loading ? <p>Loading audit logs...</p> : (
          <table className="table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>User</th>
                <th>Action</th>
                <th>Module</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map(log => (
                <tr key={log.id}>
                  <td style={{ whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td>
                    <div><strong>{log.user_name}</strong></div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{log.user_email}</div>
                  </td>
                  <td>
                    <span className={`badge ${getActionBadgeColor(log.action)}`}>
                      {log.action}
                    </span>
                  </td>
                  <td style={{ textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 700 }}>
                    {log.module}
                  </td>
                  <td>
                    <div style={{ fontSize: '0.875rem', color: '#1e293b' }}>{log.description}</div>
                    {log.record_id && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>
                        ID: <code style={{ background: '#f1f5f9', padding: '0.125rem 0.25rem', borderRadius: '4px' }}>{log.record_id}</code>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>
                    <ClipboardList size={32} style={{ color: 'var(--text-muted)', opacity: 0.5, marginBottom: '0.5rem' }} />
                    <p style={{ color: 'var(--text-muted)' }}>No audit logs recorded yet.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  );
}
