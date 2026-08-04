import './Compliance.css';
import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { PageGuidance } from '../components/PageGuidance';
import { api } from '../services/api';
import { ShieldCheck, Users, ClipboardCheck, IndianRupee, Printer } from 'lucide-react';

interface EnrollmentSummary {
  total_students: number;
  by_gender: { gender: string; count: number }[];
  by_status: { status: string; count: number }[];
  by_course: { course_name: string; count: number }[];
  total_teachers: number;
  student_teacher_ratio: number | null;
}

interface AttendanceSummary {
  from: string;
  to: string;
  total_marked: number;
  present_count: number;
  absent_count: number;
  attendance_rate: number | null;
}

interface FeeCompliance {
  total_billed: number;
  total_collected: number;
  total_outstanding: number;
  collection_rate: number | null;
  overdue_records: number;
}

export default function Compliance() {
  const [enrollment, setEnrollment] = useState<EnrollmentSummary | null>(null);
  const [attendance, setAttendance] = useState<AttendanceSummary | null>(null);
  const [fees, setFees] = useState<FeeCompliance | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    to: new Date().toISOString().slice(0, 10),
  });

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [enrollData, attendData, feeData] = await Promise.all([
        api.get('/compliance/enrollment-summary'),
        api.get(`/compliance/attendance-summary?from=${dateRange.from}&to=${dateRange.to}`),
        api.get('/compliance/fee-compliance'),
      ]);
      setEnrollment(enrollData);
      setAttendance(attendData);
      setFees(feeData);
    } catch (err) {
      console.error('Error fetching compliance reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Layout>
      <PageGuidance
        title="Compliance & Regulatory Reports"
        description="Statutory-style summaries computed live from real enrollment, attendance, and fee data — enrollment demographics, attendance compliance, and fee collection compliance. Infrastructure/facility fields (e.g. UDISE+ classroom/toilet counts) aren't tracked by this system and are intentionally omitted rather than fabricated."
        steps={["Review enrollment demographics and student-teacher ratio.", "Check attendance compliance for a custom date range.", "Review fee collection compliance, then print or export for record-keeping."]}
      />

      <div className="page-header">
        <div>
          <h2>Compliance &amp; Regulatory Reports</h2>
          <p className="compliance-text-1">Enrollment, attendance, and fee compliance summaries computed from live data</p>
        </div>
        <button className="btn btn-outline" onClick={() => window.print()}>
          <Printer size={16} /> Print Report
        </button>
      </div>

      {loading ? <p>Loading compliance data...</p> : (
        <>
          <div className="card compliance-card">
            <h3 className="compliance-row-title"><Users className="compliance-icon" size={18} /> Enrollment Summary</h3>
            {enrollment && (
              <>
                <div className="compliance-stat-grid">
                  <div className="compliance-stat">
                    <span className="compliance-stat-value">{enrollment.total_students}</span>
                    <span className="compliance-stat-label">Total Students</span>
                  </div>
                  <div className="compliance-stat">
                    <span className="compliance-stat-value">{enrollment.total_teachers}</span>
                    <span className="compliance-stat-label">Total Teachers</span>
                  </div>
                  <div className="compliance-stat">
                    <span className="compliance-stat-value">{enrollment.student_teacher_ratio ?? '-'}</span>
                    <span className="compliance-stat-label">Student : Teacher Ratio</span>
                  </div>
                </div>

                <div className="compliance-breakdown-grid">
                  <div>
                    <h4 className="compliance-subtitle">By Gender</h4>
                    <table className="table">
                      <tbody>
                        {enrollment.by_gender.map(g => (
                          <tr key={g.gender}><td>{g.gender}</td><td className="compliance-td-right">{g.count}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div>
                    <h4 className="compliance-subtitle">By Status</h4>
                    <table className="table">
                      <tbody>
                        {enrollment.by_status.map(s => (
                          <tr key={s.status}><td>{s.status}</td><td className="compliance-td-right">{s.count}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div>
                    <h4 className="compliance-subtitle">By Class / Program</h4>
                    <table className="table">
                      <tbody>
                        {enrollment.by_course.map(c => (
                          <tr key={c.course_name}><td>{c.course_name}</td><td className="compliance-td-right">{c.count}</td></tr>
                        ))}
                        {enrollment.by_course.length === 0 && <tr><td className="no-data">No active enrollments found.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="card compliance-card">
            <h3 className="compliance-row-title"><ClipboardCheck className="compliance-icon" size={18} /> Attendance Compliance</h3>
            <div className="compliance-date-row">
              <div className="form-group">
                <label>From</label>
                <input type="date" value={dateRange.from} onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })} />
              </div>
              <div className="form-group">
                <label>To</label>
                <input type="date" value={dateRange.to} onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })} />
              </div>
              <button className="btn btn-outline compliance-refresh-btn" onClick={fetchAll}>Refresh</button>
            </div>
            {attendance && (
              <div className="compliance-stat-grid">
                <div className="compliance-stat">
                  <span className="compliance-stat-value">{attendance.total_marked}</span>
                  <span className="compliance-stat-label">Records Marked</span>
                </div>
                <div className="compliance-stat">
                  <span className="compliance-stat-value">{attendance.present_count}</span>
                  <span className="compliance-stat-label">Present / On-Duty</span>
                </div>
                <div className="compliance-stat">
                  <span className="compliance-stat-value">{attendance.absent_count}</span>
                  <span className="compliance-stat-label">Absent</span>
                </div>
                <div className="compliance-stat">
                  <span className="compliance-stat-value">{attendance.attendance_rate !== null ? `${attendance.attendance_rate}%` : '-'}</span>
                  <span className="compliance-stat-label">Attendance Rate</span>
                </div>
              </div>
            )}
          </div>

          <div className="card compliance-card">
            <h3 className="compliance-row-title"><IndianRupee className="compliance-icon" size={18} /> Fee Collection Compliance</h3>
            {fees && (
              <div className="compliance-stat-grid">
                <div className="compliance-stat">
                  <span className="compliance-stat-value">₹{fees.total_billed.toLocaleString('en-IN')}</span>
                  <span className="compliance-stat-label">Total Billed</span>
                </div>
                <div className="compliance-stat">
                  <span className="compliance-stat-value">₹{fees.total_collected.toLocaleString('en-IN')}</span>
                  <span className="compliance-stat-label">Total Collected</span>
                </div>
                <div className="compliance-stat">
                  <span className="compliance-stat-value">₹{fees.total_outstanding.toLocaleString('en-IN')}</span>
                  <span className="compliance-stat-label">Outstanding</span>
                </div>
                <div className="compliance-stat">
                  <span className="compliance-stat-value">{fees.collection_rate !== null ? `${fees.collection_rate}%` : '-'}</span>
                  <span className="compliance-stat-label">Collection Rate</span>
                </div>
                <div className="compliance-stat">
                  <span className="compliance-stat-value">{fees.overdue_records}</span>
                  <span className="compliance-stat-label">Overdue Records</span>
                </div>
              </div>
            )}
          </div>

          <div className="card compliance-card compliance-note-card">
            <ShieldCheck className="compliance-icon" size={18} />
            <p>
              Fields required by some government formats (e.g. UDISE+ classroom counts, toilet/facility ratios) are not
              tracked anywhere in this system yet and are intentionally left out of this report rather than estimated.
            </p>
          </div>
        </>
      )}
    </Layout>
  );
}
