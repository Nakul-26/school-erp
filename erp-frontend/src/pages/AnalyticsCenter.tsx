import React, { useState, useEffect } from 'react';
import { useToast } from '../contexts/ToastContext';
import './AnalyticsCenter.css';

interface KPISnapshot {
  id: string;
  institution_id: string;
  category: 'Academic' | 'Finance' | 'Platform' | 'Security';
  kpi_key: string;
  kpi_value: number;
  previous_value: number;
  change_pct: number;
  trend: 'UP' | 'DOWN' | 'STABLE';
  unit: string;
  last_updated_at: string;
}

interface DailyAnalytics {
  id: string;
  institution_id: string;
  date: string;
  total_students: number;
  total_teachers: number;
  attendance_rate_pct: number;
  absent_count: number;
  fee_collection_amount: number;
  pending_fees_amount: number;
  pass_rate_pct: number;
  notifications_sent: number;
  storage_used_mb: number;
  jobs_executed_count: number;
  audit_events_count: number;
  created_at: string;
}

interface ScheduledReport {
  id: string;
  institution_id: string;
  name: string;
  report_type: string;
  schedule_cron: string;
  recipients_json: string;
  format: string;
  is_active: number;
  last_sent_at?: string | null;
}

const AnalyticsCenter: React.FC = () => {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'overview' | 'academic' | 'finance' | 'platform' | 'reports'>('overview');
  const [loading, setLoading] = useState<boolean>(true);

  // States
  const [kpis, setKpis] = useState<KPISnapshot[]>([]);
  const [dailyData, setDailyData] = useState<DailyAnalytics[]>([]);
  const [scheduledReports, setScheduledReports] = useState<ScheduledReport[]>([]);

  // Report Builder State
  const [reportType, setReportType] = useState<string>('AcademicSummary');
  const [previewRows, setPreviewRows] = useState<any[]>([]);

  // Schedule Modal State
  const [showScheduleModal, setShowScheduleModal] = useState<boolean>(false);
  const [schedName, setSchedName] = useState<string>('Weekly Executive Summary');
  const [schedType, setSchedType] = useState<string>('ExecutiveFinance');
  const [schedCron, setSchedCron] = useState<string>('0 8 * * 1');

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };
      const baseUrl = '/api';

      const kRes = await fetch(`${baseUrl}/analytics/kpis`, { headers });
      if (kRes.ok) setKpis(await kRes.json());

      const dRes = await fetch(`${baseUrl}/analytics/daily?limit=30`, { headers });
      if (dRes.ok) setDailyData(await dRes.json());

      const sRes = await fetch(`${baseUrl}/analytics/reports/schedules`, { headers });
      if (sRes.ok) setScheduledReports(await sRes.json());
    } catch (err) {
      console.error('Failed to load Analytics data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleManualRefresh = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/analytics/refresh', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success('Analytics warehouse and KPI snapshots refreshed!');
        fetchData();
      }
    } catch (err) {
      toast.error('Failed to refresh analytics cache');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReportPreview = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/analytics/reports/builder', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportType })
      });
      if (res.ok) {
        const data = await res.json();
        setPreviewRows(data.rows || []);
        toast.success(`Generated preview for ${data.title}`);
      }
    } catch (err) {
      toast.error('Failed to build report preview');
    }
  };

  const handleExportCSV = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/analytics/reports/export?reportType=${reportType}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${reportType}_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        toast.success('CSV Report downloaded successfully!');
      }
    } catch (err) {
      toast.error('Failed to export CSV');
    }
  };

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/analytics/reports/schedules', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: schedName,
          reportType: schedType,
          scheduleCron: schedCron,
          recipients: ['principal@oxford.edu']
        })
      });
      if (res.ok) {
        toast.success('Scheduled report created successfully!');
        setShowScheduleModal(false);
        fetchData();
      }
    } catch (err) {
      toast.error('Failed to create scheduled report');
    }
  };

  const handleTriggerReport = async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/analytics/reports/schedules/${id}/trigger`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success('Scheduled report executed and delivered!');
        fetchData();
      }
    } catch (err) {
      toast.error('Failed to trigger report delivery');
    }
  };

  const getTrendIcon = (trend: string, changePct: number) => {
    if (trend === 'UP') return <span className="kpi-trend trend-up">▲ +{changePct}%</span>;
    if (trend === 'DOWN') return <span className="kpi-trend trend-down">▼ {changePct}%</span>;
    return <span className="kpi-trend trend-stable">➔ 0%</span>;
  };

  return (
    <div className="analytics-container">
      {/* Header */}
      <div className="analytics-header">
        <div className="analytics-title-group">
          <h1>
            📊 Platform Analytics & Reporting Engine
            <span className="kpi-category-tag" style={{ background: '#dcfce7', color: '#166534' }}>
              Real-Time Warehouse
            </span>
          </h1>
          <p className="analytics-subtitle">
            Centralized institutional metrics, EventBus ingestion, KPI trend analysis & automated scheduled reporting
          </p>
        </div>
        <div className="analytics-actions">
          <button className="btn btn-secondary" onClick={handleManualRefresh} disabled={loading}>
            🔄 Refresh KPIs
          </button>
          <button className="btn btn-primary" onClick={() => setShowScheduleModal(true)}>
            + Schedule Report
          </button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="kpi-grid">
        {kpis.map(k => (
          <div key={k.id} className="kpi-card">
            <div className="kpi-card-header">
              <span className="kpi-category-tag">{k.category}</span>
              {getTrendIcon(k.trend, k.change_pct)}
            </div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
              {k.kpi_key.replace(/_/g, ' ')}
            </div>
            <div className="kpi-value">
              {k.unit === '₹' ? `₹${k.kpi_value.toLocaleString()}` : `${k.kpi_value} ${k.unit}`}
            </div>
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>
              Prev: {k.unit === '₹' ? `₹${k.previous_value.toLocaleString()}` : `${k.previous_value} ${k.unit}`}
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Tabs */}
      <div className="analytics-tabs">
        <button
          className={`analytics-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📈 Executive Summary
        </button>
        <button
          className={`analytics-tab-btn ${activeTab === 'academic' ? 'active' : ''}`}
          onClick={() => setActiveTab('academic')}
        >
          🎓 Academic Performance
        </button>
        <button
          className={`analytics-tab-btn ${activeTab === 'finance' ? 'active' : ''}`}
          onClick={() => setActiveTab('finance')}
        >
          💰 Financial Collection
        </button>
        <button
          className={`analytics-tab-btn ${activeTab === 'platform' ? 'active' : ''}`}
          onClick={() => setActiveTab('platform')}
        >
          ⚡ Platform Operations
        </button>
        <button
          className={`analytics-tab-btn ${activeTab === 'reports' ? 'active' : ''}`}
          onClick={() => setActiveTab('reports')}
        >
          📜 Report Builder & CSV Export
        </button>
      </div>

      {/* TAB 1: EXECUTIVE SUMMARY */}
      {activeTab === 'overview' && (
        <div className="analytics-table-container">
          <h3 style={{ padding: '16px 20px', margin: 0, borderBottom: '1px solid #e2e8f0' }}>
            📅 Daily Analytics Warehouse Rollup Stream
          </h3>
          <table className="analytics-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Students</th>
                <th>Teachers</th>
                <th>Attendance %</th>
                <th>Fee Collection</th>
                <th>Pending Dues</th>
                <th>Notifications</th>
                <th>Storage (MB)</th>
              </tr>
            </thead>
            <tbody>
              {dailyData.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                    No daily warehouse records logged yet.
                  </td>
                </tr>
              ) : (
                dailyData.map(d => (
                  <tr key={d.id}>
                    <td style={{ fontWeight: 700 }}>{d.date}</td>
                    <td>{d.total_students}</td>
                    <td>{d.total_teachers}</td>
                    <td><span style={{ fontWeight: 700, color: '#16a34a' }}>{d.attendance_rate_pct}%</span></td>
                    <td>₹{d.fee_collection_amount.toLocaleString()}</td>
                    <td style={{ color: '#dc2626' }}>₹{d.pending_fees_amount.toLocaleString()}</td>
                    <td>{d.notifications_sent}</td>
                    <td>{d.storage_used_mb} MB</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 2: ACADEMIC */}
      {activeTab === 'academic' && (
        <div className="analytics-table-container">
          <h3 style={{ padding: '16px 20px', margin: 0, borderBottom: '1px solid #e2e8f0' }}>
            🎓 Academic Attendance & Pass Rate Rollups
          </h3>
          <table className="analytics-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Total Enrolled Students</th>
                <th>Daily Absent Count</th>
                <th>Attendance Rate</th>
                <th>Pass Rate</th>
              </tr>
            </thead>
            <tbody>
              {dailyData.map(d => (
                <tr key={d.id}>
                  <td style={{ fontWeight: 700 }}>{d.date}</td>
                  <td>{d.total_students}</td>
                  <td style={{ color: '#dc2626' }}>{d.absent_count}</td>
                  <td><strong>{d.attendance_rate_pct}%</strong></td>
                  <td><span style={{ color: '#2563eb', fontWeight: 700 }}>{d.pass_rate_pct}%</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: FINANCE */}
      {activeTab === 'finance' && (
        <div className="analytics-table-container">
          <h3 style={{ padding: '16px 20px', margin: 0, borderBottom: '1px solid #e2e8f0' }}>
            💰 Fee Revenue & Collection Efficiency Breakdown
          </h3>
          <table className="analytics-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Fee Collection Amount</th>
                <th>Outstanding Dues</th>
                <th>Collection Efficiency</th>
              </tr>
            </thead>
            <tbody>
              {dailyData.map(d => {
                const total = d.fee_collection_amount + d.pending_fees_amount;
                const eff = total > 0 ? Math.round((d.fee_collection_amount / total) * 100) : 100;
                return (
                  <tr key={d.id}>
                    <td style={{ fontWeight: 700 }}>{d.date}</td>
                    <td style={{ color: '#16a34a', fontWeight: 700 }}>₹{d.fee_collection_amount.toLocaleString()}</td>
                    <td style={{ color: '#dc2626' }}>₹{d.pending_fees_amount.toLocaleString()}</td>
                    <td><span className="kpi-category-tag" style={{ background: '#dcfce7', color: '#166534' }}>{eff}%</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 4: PLATFORM OPERATIONS */}
      {activeTab === 'platform' && (
        <div className="analytics-table-container">
          <h3 style={{ padding: '16px 20px', margin: 0, borderBottom: '1px solid #e2e8f0' }}>
            ⚡ Infrastructure & Platform Service Metrics
          </h3>
          <table className="analytics-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Notifications Delivered</th>
                <th>Storage Consumption</th>
                <th>Background Jobs Executed</th>
                <th>Audit Log Events Recorded</th>
              </tr>
            </thead>
            <tbody>
              {dailyData.map(d => (
                <tr key={d.id}>
                  <td style={{ fontWeight: 700 }}>{d.date}</td>
                  <td>{d.notifications_sent}</td>
                  <td>{d.storage_used_mb} MB</td>
                  <td>{d.jobs_executed_count}</td>
                  <td>{d.audit_events_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 5: REPORT BUILDER & EXPORTS */}
      {activeTab === 'reports' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* Builder */}
          <div className="analytics-table-container" style={{ padding: '20px' }}>
            <h3 style={{ margin: '0 0 16px 0' }}>⚙️ Custom Report Builder & Exporter</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontWeight: 600, display: 'block', marginBottom: '4px' }}>Report Category</label>
                <select
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                >
                  <option value="AcademicSummary">Academic Summary</option>
                  <option value="ExecutiveFinance">Executive Finance</option>
                  <option value="SystemOperations">System Operations</option>
                  <option value="SecurityAudit">Security Audit Log</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn btn-secondary" onClick={handleGenerateReportPreview} style={{ flex: 1 }}>
                  🔍 Preview Report
                </button>
                <button className="btn btn-primary" onClick={handleExportCSV} style={{ flex: 1 }}>
                  ⬇ Export CSV
                </button>
              </div>

              {previewRows.length > 0 && (
                <div style={{ marginTop: '14px' }}>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>Report Preview ({previewRows.length} rows)</h4>
                  <pre style={{ background: '#f8fafc', padding: '12px', borderRadius: '6px', fontSize: '12px', overflowX: 'auto' }}>
                    {JSON.stringify(previewRows, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>

          {/* Scheduled Reports List */}
          <div className="analytics-table-container" style={{ padding: '20px' }}>
            <h3 style={{ margin: '0 0 16px 0' }}>📅 Scheduled Automated Reports</h3>
            <table className="analytics-table">
              <thead>
                <tr>
                  <th>Report Name</th>
                  <th>Schedule</th>
                  <th>Last Sent</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {scheduledReports.map(s => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 600 }}>{s.name}</td>
                    <td><code>{s.schedule_cron}</code></td>
                    <td>{s.last_sent_at ? new Date(s.last_sent_at).toLocaleString() : 'Never'}</td>
                    <td>
                      <button className="btn btn-sm btn-primary" onClick={() => handleTriggerReport(s.id)}>
                        ⚡ Trigger Now
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SCHEDULE REPORT MODAL */}
      {showScheduleModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{ background: '#fff', borderRadius: '12px', width: '90%', maxWidth: '500px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ margin: 0 }}>+ Create Automated Scheduled Report</h3>
              <button style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }} onClick={() => setShowScheduleModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateSchedule}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ fontWeight: 600, display: 'block', marginBottom: '4px' }}>Report Name</label>
                  <input
                    type="text"
                    required
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    value={schedName}
                    onChange={(e) => setSchedName(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ fontWeight: 600, display: 'block', marginBottom: '4px' }}>Report Type</label>
                  <select
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    value={schedType}
                    onChange={(e) => setSchedType(e.target.value)}
                  >
                    <option value="AcademicSummary">Academic Summary</option>
                    <option value="ExecutiveFinance">Executive Finance</option>
                    <option value="SystemOperations">System Operations</option>
                    <option value="SecurityAudit">Security Audit</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontWeight: 600, display: 'block', marginBottom: '4px' }}>Schedule (Cron Expression)</label>
                  <input
                    type="text"
                    required
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    value={schedCron}
                    onChange={(e) => setSchedCron(e.target.value)}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowScheduleModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Save Schedule</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsCenter;
