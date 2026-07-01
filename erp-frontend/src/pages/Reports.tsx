import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { api } from '../services/api';
import {
  ClipboardCheck, Percent, Users, AlertTriangle,
  FileBarChart, BookOpen, Clock, Calendar,
  BarChart3, IndianRupee, TrendingUp,
} from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState<'attendance' | 'teacher' | 'fees'>('attendance');

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
    fetchAttSections();
    fetchTeacherReport();
    fetchFeeReport();
  }, []);

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

  // ── Render: Attendance ─────────────────────────────────────────────────────

  const renderAttendance = () => (
    <>
      <div className="page-sub-header" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
        {attInitialLoading ? <p>Loading...</p> : (
          <div className="form-group" style={{ margin: 0, display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ whiteSpace: 'nowrap' }}>Select Class / Section:</label>
            <select
              value={attSelectedSectionId}
              onChange={(e) => setAttSelectedSectionId(e.target.value)}
              style={{ width: 'auto', padding: '0.5rem 1.5rem' }}
            >
              <option value="">-- Select Section --</option>
              {attSections.map(s => <option key={s.id} value={s.id}>{s.name} (Year {s.year_number})</option>)}
            </select>
          </div>
        )}
      </div>

      {attSelectedSectionId && attReport.length > 0 && (
        <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          <div className="stat-card card">
            <div className="icon" style={{ background: '#e6f7ff', color: '#1890ff', width: '50px', height: '50px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Users size={24} /></div>
            <div className="info">
              <h3 style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>Total Students</h3>
              <div className="value" style={{ fontSize: '1.5rem', fontWeight: 'bold', marginTop: '0.25rem' }}>{attTotalStudents}</div>
            </div>
          </div>
          <div className="stat-card card">
            <div className="icon" style={{ background: '#f6ffed', color: '#52c41a', width: '50px', height: '50px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Percent size={24} /></div>
            <div className="info">
              <h3 style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>Class Average</h3>
              <div className="value" style={{ fontSize: '1.5rem', fontWeight: 'bold', marginTop: '0.25rem' }}>{attClassAverage.toFixed(1)}%</div>
            </div>
          </div>
          <div className="stat-card card">
            <div className="icon" style={{ background: '#fff1f0', color: '#f5222d', width: '50px', height: '50px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><AlertTriangle size={24} /></div>
            <div className="info">
              <h3 style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>Below 75% Limit</h3>
              <div className="value" style={{ fontSize: '1.5rem', fontWeight: 'bold', marginTop: '0.25rem', color: '#f5222d' }}>{attLowCount} students</div>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        {attLoading ? <p>Loading report data...</p> : !attSelectedSectionId ? (
          <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Please select a section to view the attendance report.</p>
        ) : attReport.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No enrollment or session data found for this class.</p>
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: '80px', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
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
  );

  // ── Render: Teacher Reports ────────────────────────────────────────────────

  const renderTeacher = () => (
    <>
      {!teacherLoading && teacherReport.length > 0 && (
        <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          <div className="stat-card card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem' }}>
            <div className="icon" style={{ background: '#e6f7ff', color: '#1890ff', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Users size={24} /></div>
            <div className="info">
              <h3 style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>Total Faculty</h3>
              <div className="value" style={{ fontSize: '1.5rem', fontWeight: 'bold', marginTop: '0.25rem' }}>{teacherTotalCount}</div>
            </div>
          </div>
          <div className="stat-card card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem' }}>
            <div className="icon" style={{ background: '#f6ffed', color: '#52c41a', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><BookOpen size={24} /></div>
            <div className="info">
              <h3 style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>Avg Classes Conducted</h3>
              <div className="value" style={{ fontSize: '1.5rem', fontWeight: 'bold', marginTop: '0.25rem' }}>{teacherAvgClasses.toFixed(1)} lectures</div>
            </div>
          </div>
          <div className="stat-card card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem' }}>
            <div className="icon" style={{ background: '#fff7e6', color: '#fa8c16', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Clock size={24} /></div>
            <div className="info">
              <h3 style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>Faculty Avg Attendance</h3>
              <div className="value" style={{ fontSize: '1.5rem', fontWeight: 'bold', marginTop: '0.25rem' }}>{teacherAvgAttendance.toFixed(1)}%</div>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        {teacherLoading ? <p>Loading workload report...</p> : teacherReport.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No teachers or assignment data found.</p>
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: '80px', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
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
  );

  // ── Render: Fee Reports ────────────────────────────────────────────────────

  const renderFees = () => (
    <>
      {feeLoading ? <p>Loading reports...</p> : (
        <>
          <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            <div className="stat-card card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem' }}>
              <div className="icon" style={{ background: '#f6ffed', color: '#52c41a', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IndianRupee size={24} /></div>
              <div className="info">
                <h3 style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>Total Collected</h3>
                <div className="value" style={{ fontSize: '1.5rem', fontWeight: 'bold', marginTop: '0.25rem', color: 'var(--success)' }}>
                  ₹{feeStats.totalCollected.toLocaleString('en-IN')}
                </div>
              </div>
            </div>
            <div className="stat-card card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem' }}>
              <div className="icon" style={{ background: '#fff7e6', color: '#fa8c16', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Clock size={24} /></div>
              <div className="info">
                <h3 style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>Pending Liabilities</h3>
                <div className="value" style={{ fontSize: '1.5rem', fontWeight: 'bold', marginTop: '0.25rem', color: 'var(--warning)' }}>
                  ₹{feeStats.totalPending.toLocaleString('en-IN')}
                </div>
              </div>
            </div>
            <div className="stat-card card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem' }}>
              <div className="icon" style={{ background: '#fff1f0', color: '#f5222d', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><AlertTriangle size={24} /></div>
              <div className="info">
                <h3 style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>Overdue Amount</h3>
                <div className="value" style={{ fontSize: '1.5rem', fontWeight: 'bold', marginTop: '0.25rem', color: '#f5222d' }}>
                  ₹{feeStats.totalOverdue.toLocaleString('en-IN')}
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            <div className="card">
              <h3 style={{ marginBottom: '1.25rem', fontSize: '1.1rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <TrendingUp size={18} /> Monthly Collection Trends
              </h3>
              {feeMonthly.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No payments logged yet.</p>
              ) : (
                <table className="table" style={{ minWidth: 'auto' }}>
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th style={{ textAlign: 'right' }}>Total Collected</th>
                    </tr>
                  </thead>
                  <tbody>
                    {feeMonthly.map((row) => (
                      <tr key={row.month}>
                        <td><strong>{row.month}</strong></td>
                        <td style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--success)' }}>
                          ₹{row.amount.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="card">
              <h3 style={{ marginBottom: '1.25rem', fontSize: '1.1rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Users size={18} style={{ color: '#f5222d' }} /> Top Dues Outstanding
              </h3>
              {feeDefaulters.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No pending dues found in the ledger.</p>
              ) : (
                <table className="table" style={{ minWidth: 'auto' }}>
                  <thead>
                    <tr>
                      <th>Admission No</th>
                      <th>Student</th>
                      <th>Program</th>
                      <th style={{ textAlign: 'right' }}>Dues Outstanding</th>
                      <th style={{ textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {feeDefaulters.map((row) => (
                      <tr key={row.student_id}>
                        <td><strong>{row.admission_number}</strong></td>
                        <td>{row.first_name} {row.last_name}</td>
                        <td>{row.course_name}</td>
                        <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#f5222d' }}>
                          ₹{row.pending_amount.toLocaleString('en-IN')}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            className="btn btn-outline"
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.72rem', borderColor: 'var(--warning)', color: 'var(--warning)', cursor: 'pointer' }}
                            onClick={() => sendFeeReminder(row.student_id, row.pending_amount)}
                            disabled={sendingReminderId === row.student_id}
                          >
                            {sendingReminderId === row.student_id ? 'Sending...' : 'Send Reminder'}
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
  );

  // ── Root render ────────────────────────────────────────────────────────────

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h2>Reports</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            View attendance, teacher, and fee reports
          </p>
        </div>
      </div>

      <div className="page-tabs">
        <button
          className={`page-tab${activeTab === 'attendance' ? ' active' : ''}`}
          onClick={() => setActiveTab('attendance')}
        >
          <ClipboardCheck size={16} /> Attendance
        </button>
        <button
          className={`page-tab${activeTab === 'teacher' ? ' active' : ''}`}
          onClick={() => setActiveTab('teacher')}
        >
          <FileBarChart size={16} /> Teacher Reports
        </button>
        <button
          className={`page-tab${activeTab === 'fees' ? ' active' : ''}`}
          onClick={() => setActiveTab('fees')}
        >
          <BarChart3 size={16} /> Fee Reports
        </button>
      </div>

      {activeTab === 'attendance' && renderAttendance()}
      {activeTab === 'teacher' && renderTeacher()}
      {activeTab === 'fees' && renderFees()}
    </Layout>
  );
}
