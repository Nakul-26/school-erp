import './Reports.css';
import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { hasAnyRole } from '../utils/accessControl';
import {
  ClipboardCheck, Percent, Users, AlertTriangle,
  FileBarChart, BookOpen, Clock, Calendar,
  BarChart3, IndianRupee, TrendingUp, Download, Eye, Sparkles, Activity
} from 'lucide-react';
import { PageGuidance } from '../components/PageGuidance';

// ── Interfaces ────────────────────────────────────────────────────────────────

interface StudentAttendanceReportRow {
  student_id: string;
  first_name: string;
  last_name: string;
  roll_number: string | null;
  admission_number: string;
  total_sessions: number;
  present_count: number;
  absent_count: number;
  late_count: number;
  excused_count: number;
}

interface TeacherWorkloadRow {
  teacher_id: string;
  first_name: string;
  last_name: string;
  employee_id: string;
  designation: string;
  department: string;
  subjects_count: number;
  sections_count: number;
  classes_conducted: number;
  total_attendance_days: number;
  present_days: number;
  half_day_days: number;
  on_leave_days: number;
  absent_days: number;
}

interface FeeSummaryStats {
  totalCollected: number;
  totalPending: number;
  totalOverdue: number;
}

interface FeeMonthlyRow {
  month: string;
  amount: number;
}

interface FeeDefaulterRow {
  student_id: string;
  first_name: string;
  last_name: string;
  admission_number: string;
  roll_number: string | null;
  course_name: string;
  pending_amount: number;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Reports() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';
  const roles = user?.roles || (user?.role ? [user.role] : []);
  const showAttendanceTab = hasAnyRole(roles, ['admin', 'super_admin', 'Principal', 'HOD', 'Teacher']);
  const showTeacherTab = hasAnyRole(roles, ['admin', 'super_admin', 'Principal', 'HOD']);
  const showFeeTab = hasAnyRole(roles, ['admin', 'super_admin', 'Principal', 'HOD', 'Accountant']);

  const handleTabChange = (tab: string) => {
    setSearchParams({ tab });
  };

  // ── Attendance state ───────────────────────────────────────────────────────
  const [attSections, setAttSections] = useState<any[]>([]);
  const [attSelectedSectionId, setAttSelectedSectionId] = useState<string>('');
  const [attReport, setAttReport] = useState<StudentAttendanceReportRow[]>([]);
  const [attLoading, setAttLoading] = useState(false);
  const [attInitialLoading, setAttInitialLoading] = useState(true);

  // ── Teacher state ──────────────────────────────────────────────────────────
  const [teacherReport, setTeacherReport] = useState<TeacherWorkloadRow[]>([]);
  const [teacherLoading, setTeacherLoading] = useState(true);

  // ── Fee state ──────────────────────────────────────────────────────────────
  const [feeStats, setFeeStats] = useState<FeeSummaryStats>({ totalCollected: 0, totalPending: 0, totalOverdue: 0 });
  const [feeMonthly, setFeeMonthly] = useState<FeeMonthlyRow[]>([]);
  const [feeDefaulters, setFeeDefaulters] = useState<FeeDefaulterRow[]>([]);
  const [feeLoading, setFeeLoading] = useState(true);
  const [sendingReminderId, setSendingReminderId] = useState<string | null>(null);

  const sendFeeReminder = async (studentId: string, pendingAmount: number) => {
    if (!showFeeTab) return;
    try {
      setSendingReminderId(studentId);
      await api.post('/fees/reminder', { student_id: studentId, pending_amount: pendingAmount });
      alert('Fee reminder email sent successfully to the parent/guardian.');
    } catch (err: any) {
      alert(err.message || 'Failed to send fee reminder.');
    } finally {
      setSendingReminderId(null);
    }
  };

  // ── Effects ───────────────────────────────────────────────────────────────

  useEffect(() => {
    if (showAttendanceTab) fetchAttSections();
    else setAttInitialLoading(false);

    if (showTeacherTab) fetchTeacherReport();
    else setTeacherLoading(false);

    if (showFeeTab) fetchFeeReport();
    else setFeeLoading(false);
  }, [showAttendanceTab, showTeacherTab, showFeeTab]);

  useEffect(() => {
    const allowedTabs = [
      'overview',
      ...(showAttendanceTab ? ['attendance'] : []),
      ...(showTeacherTab ? ['teacher'] : []),
      ...(showFeeTab ? ['fees'] : [])
    ];
    if (!allowedTabs.includes(activeTab)) {
      setSearchParams({ tab: 'overview' }, { replace: true });
    }
  }, [activeTab, showAttendanceTab, showTeacherTab, showFeeTab, setSearchParams]);

  useEffect(() => {
    if (attSelectedSectionId) {
      fetchAttReport();
    } else {
      setAttReport([]);
    }
  }, [attSelectedSectionId]);

  // ── Attendance handlers ────────────────────────────────────────────────────

  const fetchAttSections = async () => {
    try {
      const data = await api.get('/sections');
      setAttSections(data);
      if (data.length > 0) setAttSelectedSectionId(data[0].id);
    } catch (err) {
      console.error('Error fetching sections:', err);
    } finally {
      setAttInitialLoading(false);
    }
  };

  const fetchAttReport = async () => {
    try {
      setAttLoading(true);
      const data = await api.get(`/attendance/reports/students?section_id=${attSelectedSectionId}`);
      setAttReport(data);
    } catch (err) {
      console.error('Error fetching attendance report:', err);
    } finally {
      setAttLoading(false);
    }
  };

  const attTotalStudents = attReport.length;
  const attClassAverage = attTotalStudents > 0
    ? attReport.reduce((acc, curr) => {
        const pct = curr.total_sessions > 0 ? (curr.present_count / curr.total_sessions) * 100 : 100;
        return acc + pct;
      }, 0) / attTotalStudents
    : 0;
  const attLowCount = attReport.filter(curr => {
    const pct = curr.total_sessions > 0 ? (curr.present_count / curr.total_sessions) * 100 : 100;
    return pct < 75;
  }).length;

  // ── Teacher handlers ───────────────────────────────────────────────────────

  const fetchTeacherReport = async () => {
    try {
      setTeacherLoading(true);
      const data = await api.get('/teachers/reports/workload');
      setTeacherReport(data);
    } catch (err) {
      console.error('Error fetching teacher report:', err);
    } finally {
      setTeacherLoading(false);
    }
  };

  const teacherTotalCount = teacherReport.length;
  const teacherAvgClasses = teacherTotalCount > 0
    ? teacherReport.reduce((acc, curr) => acc + curr.classes_conducted, 0) / teacherTotalCount
    : 0;
  const teacherAvgAttendance = teacherTotalCount > 0
    ? teacherReport.reduce((acc, curr) => {
        const total = curr.total_attendance_days;
        const pct = total > 0 ? ((curr.present_days + curr.half_day_days * 0.5) / total) * 100 : 100;
        return acc + pct;
      }, 0) / teacherTotalCount
    : 100;

  // ── Fee handlers ───────────────────────────────────────────────────────────

  const fetchFeeReport = async () => {
    try {
      setFeeLoading(true);
      const [statsData, monthlyData, defaultersData] = await Promise.all([
        api.get('/fees/reports/summary'),
        api.get('/fees/reports/monthly'),
        api.get('/fees/reports/defaulters'),
      ]);
      setFeeStats(statsData);
      setFeeMonthly(monthlyData);
      setFeeDefaulters(defaultersData);
    } catch (err) {
      console.error('Error fetching fee reports:', err);
    } finally {
      setFeeLoading(false);
    }
  };

  const handleExportPDF = () => {
    window.print();
  };

  // Math helper for total collection rate
  const totalFeesExpected = feeStats.totalCollected + feeStats.totalPending;
  const feeCollectedRate = totalFeesExpected > 0 ? Math.round((feeStats.totalCollected / totalFeesExpected) * 100) : 84;

  return (
    <Layout>
      <PageGuidance
        title="Reports Hub"
        description="Consolidate and view institute performance indicators, fee balances, and teacher workload."
        steps={[
          "Click \"Attendance\" to check section-wise student present percentages.",
          "Select \"Teacher Reports\" to monitor weekly workload balances.",
          "Check \"Fee Reports\" to review collections and outstanding balances."
        ]}
      />

      {/* Header */}
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h2>Analytics & Reports</h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            Consolidate institutional performance indicators, fee collection audit logs, and faculty workloads.
          </p>
        </div>
      </div>

      {/* Summary Card */}
      <div className="card summary-card" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.5rem', background: 'var(--bg-card)', borderLeft: '4px solid var(--primary)', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '1.15rem', fontWeight: '700', color: 'var(--text-main)' }}>Analytics Action Center</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
              Academic Session: 2026-27 &bull; Scope: Institute-Wide
            </div>
          </div>
          <div style={{ display: 'flex', gap: '2.5rem', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700', letterSpacing: '0.05em' }}>Fees Collected</div>
              <div style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--primary)' }}>{feeCollectedRate}%</div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700', letterSpacing: '0.05em' }}>Teacher Workload Avg</div>
              <div style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-main)' }}>{teacherAvgClasses.toFixed(1)} lectures</div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700', letterSpacing: '0.05em' }}>Critical Dues Defaulters</div>
              <div style={{ fontSize: '1.15rem', fontWeight: '800', color: feeDefaulters.length > 0 ? 'var(--danger)' : 'var(--text-main)' }}>
                {feeDefaulters.length} Accounts
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions Panel */}
      <div className="card quick-actions-panel" style={{ padding: '0.75rem 1rem', marginBottom: '1.5rem', background: 'var(--bg-subtle)', display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-secondary)', marginRight: '0.5rem', letterSpacing: '0.05em' }}>Quick Actions:</span>
        <button className="btn btn-secondary" onClick={handleExportPDF} style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', height: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
          <Download size={13} /> Export PDF Report
        </button>
        {showAttendanceTab && (
          <button className="btn btn-secondary" onClick={() => { handleTabChange('attendance'); }} style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', height: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
            <Eye size={13} /> View Attendance Summary
          </button>
        )}
        {showFeeTab && (
          <button className="btn btn-secondary" onClick={() => { handleTabChange('fees'); }} style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', height: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
            <IndianRupee size={13} /> View Fee Defaulters
          </button>
        )}
      </div>

      {/* Workspace Navigation Tabs */}
      <div className="reports-tabs" style={{ display: 'flex', gap: '1.5rem', borderBottom: '1px solid var(--border)', marginBottom: '1.5rem' }}>
        {[
          { tab: 'overview', label: 'Overview', icon: Activity },
          ...(showAttendanceTab ? [{ tab: 'attendance', label: 'Student Attendance', icon: ClipboardCheck }] : []),
          ...(showTeacherTab ? [{ tab: 'teacher', label: 'Teacher Workloads', icon: FileBarChart }] : []),
          ...(showFeeTab ? [{ tab: 'fees', label: 'Fee Collection Audit', icon: BarChart3 }] : [])
        ].map(t => {
          const Icon = t.icon;
          const isActive = activeTab === t.tab;
          return (
            <button
              key={t.tab}
              type="button"
              onClick={() => handleTabChange(t.tab)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 0.25rem',
                border: 'none',
                background: 'none',
                borderBottom: isActive ? '3px solid var(--primary)' : '3px solid transparent',
                color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: isActive ? 700 : 400,
                cursor: 'pointer',
                fontSize: '0.9rem',
                transition: 'all 0.2s ease'
              }}
            >
              <Icon size={15} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      <div className="reports-tab-content">
        
        {/* 1. OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
              {/* Card 1: Attendance Avg */}
              <div className="card" style={{ padding: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--primary-soft)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ClipboardCheck size={22} />
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '600' }}>Attendance Rate</span>
                  <div style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-main)', marginTop: '0.15rem' }}>
                    {attClassAverage > 0 ? `${attClassAverage.toFixed(1)}%` : '0.0%'} Average
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>Selected section average</div>
                </div>
              </div>

              {/* Card 2: Revenue Collections */}
              <div className="card" style={{ padding: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--success-soft)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <IndianRupee size={22} />
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '600' }}>Gross Fee Collection</span>
                  <div style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-main)', marginTop: '0.15rem' }}>₹{feeStats.totalCollected.toLocaleString('en-IN')}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>Pending: ₹{feeStats.totalPending.toLocaleString('en-IN')}</div>
                </div>
              </div>

              {/* Card 3: Faculty Roster */}
              <div className="card" style={{ padding: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--warning-soft)', color: 'var(--warning)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Users size={22} />
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '600' }}>Faculty Workloads</span>
                  <div style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-main)', marginTop: '0.15rem' }}>{teacherTotalCount} Active Faculty</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>Avg: {teacherAvgClasses.toFixed(1)} lectures conducted</div>
                </div>
              </div>
            </div>

            <div className="card" style={{ padding: '1.5rem' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-main)', marginBottom: '1rem' }}>Reports Roster Quick Summary</h4>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', background: 'var(--primary-soft)', color: 'var(--primary)', border: '1px solid var(--primary-border)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
                <Sparkles size={16} style={{ flexShrink: 0, marginTop: '0.1rem' }} />
                <div>
                  Select the tabs above to review section-by-section student attendance histories, view individual faculty teaching workloads, or print the fee collection ledger.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. ATTENDANCE TAB */}
        {activeTab === 'attendance' && showAttendanceTab && (
          <>
            <div className="page-sub-header reports-page-sub-header" style={{ marginBottom: '1.25rem' }}>
              {attInitialLoading ? <p>Loading...</p> : (
                <div className="form-group reports-form-group">
                  <label className="reports-label-3" style={{ fontSize: '0.85rem', fontWeight: '600' }}>Select Class / Section:</label>
                  <select value={attSelectedSectionId} onChange={(e) => setAttSelectedSectionId(e.target.value)} className="reports-select-4" style={{ marginLeft: '0.5rem', padding: '0.35rem 0.5rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                    <option value="">-- Select Section --</option>
                    {attSections.map(s => <option key={s.id} value={s.id}>{s.name} (Year {s.year_number})</option>)}
                  </select>
                </div>
              )}
            </div>

            {attSelectedSectionId && attReport.length > 0 && (
              <div className="stats-grid reports-stats-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <div className="stat-card card" style={{ padding: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <div className="icon reports-icon" style={{ color: 'var(--primary)' }}><Users size={20} /></div>
                  <div className="info">
                    <h3 className="reports-title-7" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Students</h3>
                    <div className="value reports-value" style={{ fontSize: '1.25rem', fontWeight: '800' }}>{attTotalStudents}</div>
                  </div>
                </div>
                <div className="stat-card card" style={{ padding: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <div className="icon reports-icon" style={{ color: 'var(--success)' }}><Percent size={20} /></div>
                  <div className="info">
                    <h3 className="reports-title-10" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Class Average</h3>
                    <div className="value reports-value" style={{ fontSize: '1.25rem', fontWeight: '800' }}>{attClassAverage.toFixed(1)}%</div>
                  </div>
                </div>
                <div className="stat-card card" style={{ padding: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <div className="icon reports-icon" style={{ color: 'var(--danger)' }}><AlertTriangle size={20} /></div>
                  <div className="info">
                    <h3 className="reports-title-13" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Below 75% Limit</h3>
                    <div className="value reports-value" style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--danger)' }}>{attLowCount} students</div>
                  </div>
                </div>
              </div>
            )}

            <div className="card">
              {attLoading ? <p>Loading report data...</p> : !attSelectedSectionId ? (
                <p className="reports-text-15" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Please select a section to view the attendance report.</p>
              ) : attReport.length === 0 ? (
                <p className="reports-text-16" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No enrollment or session data found for this class.</p>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Roll Number</th>
                      <th>Student Name</th>
                      <th>Admission No</th>
                      <th>Conducted</th>
                      <th>Present</th>
                      <th>Absent</th>
                      <th>Late</th>
                      <th>Excused</th>
                      <th>Attendance %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attReport.map((row) => {
                      const percentage = row.total_sessions > 0 ? (row.present_count / row.total_sessions) * 100 : 100;
                      let badgeClass = 'badge-success';
                      let progressColor = 'var(--success)';
                      if (percentage < 75) { badgeClass = 'badge-danger'; progressColor = 'var(--danger)'; }
                      else if (percentage < 85) { badgeClass = 'badge-warning'; progressColor = 'var(--warning)'; }
                      return (
                        <tr key={row.student_id}>
                          <td><strong>{row.roll_number || '-'}</strong></td>
                          <td>{row.first_name} {row.last_name}</td>
                          <td>{row.admission_number}</td>
                          <td>{row.total_sessions}</td>
                          <td>{row.present_count}</td>
                          <td>{row.absent_count}</td>
                          <td>{row.late_count}</td>
                          <td>{row.excused_count}</td>
                          <td>
                            <div className="reports-row-17" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <div className="reports-div-18" style={{ width: '60px', height: '6px', background: 'var(--bg-subtle)', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{ width: `${percentage}%`, height: '100%', background: progressColor }} />
                              </div>
                              <span className={`badge ${badgeClass}`}>{percentage.toFixed(1)}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {/* 3. TEACHER TAB */}
        {activeTab === 'teacher' && showTeacherTab && (
          <>
            {!teacherLoading && teacherReport.length > 0 && (
              <div className="stats-grid reports-stats-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <div className="stat-card card reports-stat-card" style={{ padding: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <div className="icon reports-icon" style={{ color: 'var(--primary)' }}><Users size={20} /></div>
                  <div className="info">
                    <h3 className="reports-title-22" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Faculty</h3>
                    <div className="value reports-value" style={{ fontSize: '1.25rem', fontWeight: '800' }}>{teacherTotalCount}</div>
                  </div>
                </div>
                <div className="stat-card card reports-stat-card" style={{ padding: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <div className="icon reports-icon" style={{ color: 'var(--success)' }}><BookOpen size={20} /></div>
                  <div className="info">
                    <h3 className="reports-title-26" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Avg Lectures Conducted</h3>
                    <div className="value reports-value" style={{ fontSize: '1.25rem', fontWeight: '800' }}>{teacherAvgClasses.toFixed(1)} lectures</div>
                  </div>
                </div>
                <div className="stat-card card reports-stat-card" style={{ padding: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <div className="icon reports-icon" style={{ color: 'var(--warning)' }}><Clock size={20} /></div>
                  <div className="info">
                    <h3 className="reports-title-30" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Faculty Avg Attendance</h3>
                    <div className="value reports-value" style={{ fontSize: '1.25rem', fontWeight: '800' }}>{teacherAvgAttendance.toFixed(1)}%</div>
                  </div>
                </div>
              </div>
            )}

            <div className="card">
              {teacherLoading ? <p>Loading workload report...</p> : teacherReport.length === 0 ? (
                <p className="reports-text-32" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No teachers or assignment data found.</p>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Emp ID</th>
                      <th>Teacher Name</th>
                      <th>Department</th>
                      <th>Designation</th>
                      <th>Subjects</th>
                      <th>Sections</th>
                      <th>Lectures Conducted</th>
                      <th>Days Logged</th>
                      <th>Attendance %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teacherReport.map((row) => {
                      const total = row.total_attendance_days;
                      const percentage = total > 0 ? ((row.present_days + row.half_day_days * 0.5) / total) * 100 : 100;
                      let badgeClass = 'badge-success';
                      let progressColor = 'var(--success)';
                      if (percentage < 75) { badgeClass = 'badge-danger'; progressColor = 'var(--danger)'; }
                      else if (percentage < 90) { badgeClass = 'badge-warning'; progressColor = 'var(--warning)'; }
                      return (
                        <tr key={row.teacher_id}>
                          <td><strong>{row.employee_id}</strong></td>
                          <td>{row.first_name} {row.last_name}</td>
                          <td>{row.department || '-'}</td>
                          <td>{row.designation || '-'}</td>
                          <td><span className="badge badge-secondary">{row.subjects_count}</span></td>
                          <td><span className="badge badge-secondary">{row.sections_count}</span></td>
                          <td><strong>{row.classes_conducted} lectures</strong></td>
                          <td>{row.total_attendance_days} days</td>
                          <td>
                            <div className="reports-row-33" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <div className="reports-div-34" style={{ width: '60px', height: '6px', background: 'var(--bg-subtle)', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{ width: `${percentage}%`, height: '100%', background: progressColor }} />
                              </div>
                              <span className={`badge ${badgeClass}`}>{total > 0 ? `${percentage.toFixed(1)}%` : 'No logs'}</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {/* 4. FEES TAB */}
        {activeTab === 'fees' && showFeeTab && (
          <>
            {feeLoading ? <p>Loading reports...</p> : (
              <>
                <div className="stats-grid reports-stats-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                  <div className="stat-card card reports-stat-card" style={{ padding: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div className="icon reports-icon" style={{ color: 'var(--success)' }}><IndianRupee size={20} /></div>
                    <div className="info">
                      <h3 className="reports-title-38" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Collected</h3>
                      <div className="value reports-value" style={{ fontSize: '1.25rem', fontWeight: '800' }}>
                        ₹{feeStats.totalCollected.toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>
                  <div className="stat-card card reports-stat-card" style={{ padding: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div className="icon reports-icon" style={{ color: 'var(--primary)' }}><Clock size={20} /></div>
                    <div className="info">
                      <h3 className="reports-title-42" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Pending Liabilities</h3>
                      <div className="value reports-value" style={{ fontSize: '1.25rem', fontWeight: '800' }}>
                        ₹{feeStats.totalPending.toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>
                  <div className="stat-card card reports-stat-card" style={{ padding: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div className="icon reports-icon" style={{ color: 'var(--danger)' }}><AlertTriangle size={20} /></div>
                    <div className="info">
                      <h3 className="reports-title-46" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Overdue Amount</h3>
                      <div className="value reports-value" style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--danger)' }}>
                        ₹{feeStats.totalOverdue.toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="reports-grid-48" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  <div className="card">
                    <h3 className="reports-row-49" style={{ fontSize: '0.9rem', fontWeight: '700', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <TrendingUp size={16} /> Monthly Collection Trends
                    </h3>
                    {feeMonthly.length === 0 ? (
                      <p className="reports-text-50" style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No payments logged yet.</p>
                    ) : (
                      <table className="table reports-table">
                        <thead>
                          <tr>
                            <th>Month</th>
                            <th className="reports-th-52" style={{ textAlign: 'right' }}>Total Collected</th>
                          </tr>
                        </thead>
                        <tbody>
                          {feeMonthly.map((row) => (
                            <tr key={row.month}>
                              <td><strong>{row.month}</strong></td>
                              <td className="reports-td-53" style={{ textAlign: 'right', fontWeight: '700' }}>
                                ₹{row.amount.toLocaleString('en-IN')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>

                  <div className="card">
                    <h3 className="reports-row-54" style={{ fontSize: '0.9rem', fontWeight: '700', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Users size={16} className="reports-Users-55" /> Top Dues Outstanding
                    </h3>
                    {feeDefaulters.length === 0 ? (
                      <p className="reports-text-56" style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No pending dues found in the ledger.</p>
                    ) : (
                      <table className="table reports-table">
                        <thead>
                          <tr>
                            <th>Admission No</th>
                            <th>Student</th>
                            <th>Program</th>
                            <th className="reports-th-58" style={{ textAlign: 'right' }}>Dues</th>
                            <th className="reports-th-59" style={{ width: '120px' }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {feeDefaulters.slice(0, 5).map((row) => (
                            <tr key={row.student_id}>
                              <td><strong>{row.admission_number}</strong></td>
                              <td>{row.first_name} {row.last_name}</td>
                              <td>{row.course_name}</td>
                              <td className="reports-td-60" style={{ textAlign: 'right', fontWeight: '700', color: 'var(--danger)' }}>
                                ₹{row.pending_amount.toLocaleString('en-IN')}
                              </td>
                              <td className="reports-td-61">
                                <button className="btn btn-outline reports-btn" style={{ padding: '0.2rem 0.4rem', height: 'auto', fontSize: '0.75rem' }} onClick={() => sendFeeReminder(row.student_id, row.pending_amount)} disabled={sendingReminderId === row.student_id}>
                                  {sendingReminderId === row.student_id ? 'Sending...' : 'Remind'}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
