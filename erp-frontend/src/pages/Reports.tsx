import './Reports.css';
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
      <div className="page-sub-header reports-page-sub-header">
        {attInitialLoading ? <p>Loading...</p> : (
          <div className="form-group reports-form-group">
            <label className="reports-label-3">Select Class / Section:</label>
            <select value={attSelectedSectionId} onChange={(e) => setAttSelectedSectionId(e.target.value)} className="reports-select-4">
              <option value="">-- Select Section --</option>
              {attSections.map(s => <option key={s.id} value={s.id}>{s.name} (Year {s.year_number})</option>)}
            </select>
          </div>
        )}
      </div>

      {attSelectedSectionId && attReport.length > 0 && (
        <div className="stats-grid reports-stats-grid">
          <div className="stat-card card">
            <div className="icon reports-icon"><Users size={24} /></div>
            <div className="info">
              <h3 className="reports-title-7">Total Students</h3>
              <div className="value reports-value">{attTotalStudents}</div>
            </div>
          </div>
          <div className="stat-card card">
            <div className="icon reports-icon"><Percent size={24} /></div>
            <div className="info">
              <h3 className="reports-title-10">Class Average</h3>
              <div className="value reports-value">{attClassAverage.toFixed(1)}%</div>
            </div>
          </div>
          <div className="stat-card card">
            <div className="icon reports-icon"><AlertTriangle size={24} /></div>
            <div className="info">
              <h3 className="reports-title-13">Below 75% Limit</h3>
              <div className="value reports-value">{attLowCount} students</div>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        {attLoading ? <p>Loading report data...</p> : !attSelectedSectionId ? (
          <p className="reports-text-15">Please select a section to view the attendance report.</p>
        ) : attReport.length === 0 ? (
          <p className="reports-text-16">No enrollment or session data found for this class.</p>
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
                      <div className="reports-row-17">
                        <div className="reports-div-18">
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
        <div className="stats-grid reports-stats-grid">
          <div className="stat-card card reports-stat-card">
            <div className="icon reports-icon"><Users size={24} /></div>
            <div className="info">
              <h3 className="reports-title-22">Total Faculty</h3>
              <div className="value reports-value">{teacherTotalCount}</div>
            </div>
          </div>
          <div className="stat-card card reports-stat-card">
            <div className="icon reports-icon"><BookOpen size={24} /></div>
            <div className="info">
              <h3 className="reports-title-26">Avg Classes Conducted</h3>
              <div className="value reports-value">{teacherAvgClasses.toFixed(1)} lectures</div>
            </div>
          </div>
          <div className="stat-card card reports-stat-card">
            <div className="icon reports-icon"><Clock size={24} /></div>
            <div className="info">
              <h3 className="reports-title-30">Faculty Avg Attendance</h3>
              <div className="value reports-value">{teacherAvgAttendance.toFixed(1)}%</div>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        {teacherLoading ? <p>Loading workload report...</p> : teacherReport.length === 0 ? (
          <p className="reports-text-32">No teachers or assignment data found.</p>
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
                      <div className="reports-row-33">
                        <div className="reports-div-34">
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
          <div className="stats-grid reports-stats-grid">
            <div className="stat-card card reports-stat-card">
              <div className="icon reports-icon"><IndianRupee size={24} /></div>
              <div className="info">
                <h3 className="reports-title-38">Total Collected</h3>
                <div className="value reports-value">
                  ₹{feeStats.totalCollected.toLocaleString('en-IN')}
                </div>
              </div>
            </div>
            <div className="stat-card card reports-stat-card">
              <div className="icon reports-icon"><Clock size={24} /></div>
              <div className="info">
                <h3 className="reports-title-42">Pending Liabilities</h3>
                <div className="value reports-value">
                  ₹{feeStats.totalPending.toLocaleString('en-IN')}
                </div>
              </div>
            </div>
            <div className="stat-card card reports-stat-card">
              <div className="icon reports-icon"><AlertTriangle size={24} /></div>
              <div className="info">
                <h3 className="reports-title-46">Overdue Amount</h3>
                <div className="value reports-value">
                  ₹{feeStats.totalOverdue.toLocaleString('en-IN')}
                </div>
              </div>
            </div>
          </div>

          <div className="reports-grid-48">
            <div className="card">
              <h3 className="reports-row-49">
                <TrendingUp size={18} /> Monthly Collection Trends
              </h3>
              {feeMonthly.length === 0 ? (
                <p className="reports-text-50">No payments logged yet.</p>
              ) : (
                <table className="table reports-table">
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th className="reports-th-52">Total Collected</th>
                    </tr>
                  </thead>
                  <tbody>
                    {feeMonthly.map((row) => (
                      <tr key={row.month}>
                        <td><strong>{row.month}</strong></td>
                        <td className="reports-td-53">
                          ₹{row.amount.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="card">
              <h3 className="reports-row-54">
                <Users size={18} className="reports-Users-55"  /> Top Dues Outstanding
              </h3>
              {feeDefaulters.length === 0 ? (
                <p className="reports-text-56">No pending dues found in the ledger.</p>
              ) : (
                <table className="table reports-table">
                  <thead>
                    <tr>
                      <th>Admission No</th>
                      <th>Student</th>
                      <th>Program</th>
                      <th className="reports-th-58">Dues Outstanding</th>
                      <th className="reports-th-59">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {feeDefaulters.map((row) => (
                      <tr key={row.student_id}>
                        <td><strong>{row.admission_number}</strong></td>
                        <td>{row.first_name} {row.last_name}</td>
                        <td>{row.course_name}</td>
                        <td className="reports-td-60">
                          ₹{row.pending_amount.toLocaleString('en-IN')}
                        </td>
                        <td className="reports-td-61">
                          <button className="btn btn-outline reports-btn" onClick={() => sendFeeReminder(row.student_id, row.pending_amount)} disabled={sendingReminderId === row.student_id}>
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
          <p className="reports-text-63">
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
