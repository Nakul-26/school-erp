import './StudentDashboard.css';
import React from 'react';
import { Clock, IndianRupee, Printer, BookOpen, Calendar, HelpCircle } from 'lucide-react';

interface StudentDashboardProps {
  stats: any;
  exams: any[];
  ledgerRecords: any[];
  payments: any[];
  homework: any[];
  handleOpenReportCard: (examId: string, studentId: string) => void;
  handlePayOnlineInit: (rec: any) => void;
  handleOpenReceipt: (payment: any) => void;
}

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
};

export default function StudentDashboard({
  stats,
  exams,
  ledgerRecords,
  payments,
  homework,
  handleOpenReportCard,
  handlePayOnlineInit,
  handleOpenReceipt,
}: StudentDashboardProps) {
  const sInfo = stats?.studentInfo;
  const att = stats?.attendance;
  const fees = stats?.fees;
  const results = stats?.results || [];

  // Filter exams for student
  const studentExams = exams.filter(
    (e: any) => e.course_id === sInfo?.course_id && e.semester === sInfo?.semester && e.status !== 'DRAFT'
  );

  return (
    <div className="portal-dashboard student-portal student-dashboard-portal-dashboard">
      <div className="stats-grid">
        {/* Attendance Overview */}
        <div className="stat-card card">
          <div className="icon student-dashboard-icon">
            <Clock size={24} />
          </div>
          <div className="info">
            <h3>Attendance %</h3>
            <div className="value">{att?.percentage || 0}%</div>
            <span className="sub-text">{att?.present || 0} of {att?.total || 0} sessions present</span>
          </div>
        </div>

        {/* Dues Status */}
        <div className="stat-card card">
          <div className="icon" style={{ 
            background: (fees?.due > 0) ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', 
            color: (fees?.due > 0) ? 'var(--danger)' : 'var(--success)' 
          }}>
            <IndianRupee size={24} />
          </div>
          <div className="info">
            <h3>Outstanding Dues</h3>
            <div className="value">{formatCurrency(fees?.due || 0)}</div>
            <span className="sub-text">Paid: {formatCurrency(fees?.paid || 0)} / Total: {formatCurrency(fees?.total || 0)}</span>
          </div>
        </div>
      </div>

      {/* Homework Section (PWA focus) */}
      <div className="card student-dashboard-card">
        <div className="student-dashboard-row-4">
          <div className="student-dashboard-div-5">
            <BookOpen size={20} />
          </div>
          <div>
            <h3 className="student-dashboard-title-6">Active Homework &amp; Assignments</h3>
            <p className="student-dashboard-text-7">Daily assignments and tasks assigned by your subject teachers</p>
          </div>
        </div>

        {homework.length === 0 ? (
          <div className="student-dashboard-div-8">
            <HelpCircle size={32} className="student-dashboard-HelpCircle-9"  />
            <h4 className="student-dashboard-title-10">No active homework</h4>
            <p className="student-dashboard-text-11">All caught up! No assignments are currently pending.</p>
          </div>
        ) : (
          <div className="student-dashboard-col-12">
            {homework.slice(0, 5).map((hw: any) => {
              const isOverdue = new Date(hw.due_date) < new Date() && hw.due_date;
              return (
                <div key={hw.id} className="student-dashboard-col-13">
                  <div className="student-dashboard-row-14">
                    <div>
                      <span className="badge student-dashboard-badge">
                        {hw.subject_name}
                      </span>
                      <strong className="student-dashboard-strong-16">{hw.title}</strong>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: isOverdue ? 'var(--danger)' : 'var(--text-muted)', fontWeight: 500 }}>
                      <Calendar size={12} />
                      <span>Due: {new Date(hw.due_date).toLocaleDateString()} {isOverdue && '(Overdue)'}</span>
                    </div>
                  </div>
                  {hw.description && (
                    <p className="student-dashboard-text-17">
                      {hw.description}
                    </p>
                  )}
                  <div className="student-dashboard-row-18">
                    <span>Assigned by: {hw.teacher_first} {hw.teacher_last}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="dashboard-content-grid student-dashboard-dashboard-content-grid">
        
        {/* Left Column: Academics */}
        <div className="student-dashboard-col-20">
          {/* Exam Results Summary */}
          <div className="card dashboard-section">
            <h3 className="student-dashboard-title-21">Latest Subject Marks</h3>
            {results.length === 0 ? (
              <p className="no-data student-dashboard-no-data">No exam results published yet.</p>
            ) : (
              <div className="table-responsive">
                <table className="table student-dashboard-table">
                  <thead>
                    <tr>
                      <th>Exam</th>
                      <th>Subject</th>
                      <th>Marks</th>
                      <th>Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r: any, idx: number) => {
                      const percentage = Math.round((r.marks_obtained / r.max_marks) * 100);
                      return (
                        <tr key={idx}>
                          <td><strong>{r.exam_name}</strong></td>
                          <td>{r.subject_name}</td>
                          <td>{r.marks_obtained} / {r.max_marks}</td>
                          <td>
                            <span className={`badge ${percentage >= 40 ? 'badge-success' : 'badge-danger'}`}>
                              {percentage}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Official Report Cards */}
          <div className="card dashboard-section">
            <h3 className="student-dashboard-title-24">Official Report Cards</h3>
            {studentExams.length === 0 ? (
              <p className="no-data student-dashboard-no-data">No official report cards available for download yet.</p>
            ) : (
              <div className="table-responsive">
                <table className="table student-dashboard-table">
                  <thead>
                    <tr>
                      <th>Exam Title</th>
                      <th>Timeline</th>
                      <th className="student-dashboard-th-27">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentExams.map((e: any) => (
                      <tr key={e.id}>
                        <td><strong>{e.name}</strong></td>
                        <td>{new Date(e.start_date).toLocaleDateString()} - {new Date(e.end_date).toLocaleDateString()}</td>
                        <td className="student-dashboard-td-28">
                          <button className="btn btn-sm btn-primary student-dashboard-btn" onClick={() => handleOpenReportCard(e.id, sInfo.id)}>
                            <Printer size={12} /> View &amp; Print
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Fees and Collections */}
        <div className="student-dashboard-col-30">
          {/* Fee Ledger Installments */}
          <div className="card dashboard-section">
            <h3 className="student-dashboard-title-31">Fee Ledger details</h3>
            {ledgerRecords.length === 0 ? (
              <p className="no-data student-dashboard-no-data">No fee allocations found for your account.</p>
            ) : (
              <div className="table-responsive">
                <table className="table student-dashboard-table">
                  <thead>
                    <tr>
                      <th>Fee Component</th>
                      <th>Due Date</th>
                      <th className="student-dashboard-th-34">Amount Due</th>
                      <th className="student-dashboard-th-35">Status</th>
                      <th className="student-dashboard-th-36">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledgerRecords.map((rec: any) => (
                      <tr key={rec.id}>
                        <td><strong>{rec.fee_type}</strong></td>
                        <td>{new Date(rec.due_date).toLocaleDateString()}</td>
                        <td className="student-dashboard-td-37">₹{(rec.total_amount - rec.paid_amount).toLocaleString('en-IN')}</td>
                        <td className="student-dashboard-td-38">
                          <span className={`badge ${
                            rec.status === 'PAID' ? 'badge-success' : rec.status === 'PARTIAL' ? 'badge-warning' : 'badge-danger'
                          }`}>
                            {rec.status}
                          </span>
                        </td>
                        <td className="student-dashboard-td-39">
                          {rec.status !== 'PAID' ? (
                            <button className="btn btn-outline student-dashboard-btn" onClick={() => handlePayOnlineInit(rec)}>
                              Pay Online
                            </button>
                          ) : (
                            <span className="student-dashboard-span-41">Paid</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Payment Receipts History */}
          <div className="card dashboard-section">
            <h3 className="student-dashboard-title-42">Payment History &amp; Receipts</h3>
            {payments.length === 0 ? (
              <p className="no-data student-dashboard-no-data">No payment transactions logged in the system.</p>
            ) : (
              <div className="table-responsive">
                <table className="table student-dashboard-table">
                  <thead>
                    <tr>
                      <th>Date Paid</th>
                      <th>Fee Type</th>
                      <th>Method</th>
                      <th className="student-dashboard-th-45">Amount</th>
                      <th className="student-dashboard-th-46">Receipt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p: any) => (
                      <tr key={p.id}>
                        <td>{new Date(p.payment_date).toLocaleDateString()}</td>
                        <td>{p.fee_type}</td>
                        <td>{p.payment_method}</td>
                        <td className="student-dashboard-td-47">₹{p.amount.toLocaleString('en-IN')}</td>
                        <td className="student-dashboard-td-48">
                          <button className="btn btn-sm btn-outline student-dashboard-btn" onClick={() => handleOpenReceipt(p)}>
                            <Printer size={12} /> Receipt
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
        
      </div>
    </div>
  );
}
