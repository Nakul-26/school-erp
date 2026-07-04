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
    <div className="portal-dashboard student-portal" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="stats-grid">
        {/* Attendance Overview */}
        <div className="stat-card card">
          <div className="icon" style={{ background: 'rgba(79, 70, 229, 0.1)', color: 'var(--primary)' }}>
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
      <div className="card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', padding: '0.5rem', borderRadius: 'var(--radius-sm)' }}>
            <BookOpen size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>Active Homework &amp; Assignments</h3>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Daily assignments and tasks assigned by your subject teachers</p>
          </div>
        </div>

        {homework.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem 1rem', border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)' }}>
            <HelpCircle size={32} style={{ color: 'var(--text-subtle)', marginBottom: '0.5rem' }} />
            <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>No active homework</h4>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>All caught up! No assignments are currently pending.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {homework.slice(0, 5).map((hw: any) => {
              const isOverdue = new Date(hw.due_date) < new Date() && hw.due_date;
              return (
                <div key={hw.id} style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  padding: '1rem',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-main)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <span className="badge" style={{ background: 'var(--primary-soft)', color: 'var(--primary)', fontWeight: 700, fontSize: '0.7rem', padding: '0.15rem 0.40rem', marginRight: '0.5rem' }}>
                        {hw.subject_name}
                      </span>
                      <strong style={{ fontSize: '0.875rem', color: 'var(--text-main)' }}>{hw.title}</strong>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: isOverdue ? 'var(--danger)' : 'var(--text-muted)', fontWeight: 500 }}>
                      <Calendar size={12} />
                      <span>Due: {new Date(hw.due_date).toLocaleDateString()} {isOverdue && '(Overdue)'}</span>
                    </div>
                  </div>
                  {hw.description && (
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                      {hw.description}
                    </p>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border)', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
                    <span>Assigned by: {hw.teacher_first} {hw.teacher_last}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="dashboard-content-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 450px), 1fr))', gap: '2rem' }}>
        
        {/* Left Column: Academics */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Exam Results Summary */}
          <div className="card dashboard-section">
            <h3 style={{ marginBottom: '1.25rem', fontSize: '1.05rem', fontWeight: 800 }}>Latest Subject Marks</h3>
            {results.length === 0 ? (
              <p className="no-data" style={{ padding: '2rem 0', color: 'var(--text-muted)' }}>No exam results published yet.</p>
            ) : (
              <div className="table-responsive">
                <table className="table" style={{ fontSize: '0.85rem' }}>
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
            <h3 style={{ marginBottom: '1.25rem', fontSize: '1.05rem', fontWeight: 800 }}>Official Report Cards</h3>
            {studentExams.length === 0 ? (
              <p className="no-data" style={{ padding: '2rem 0', color: 'var(--text-muted)' }}>No official report cards available for download yet.</p>
            ) : (
              <div className="table-responsive">
                <table className="table" style={{ fontSize: '0.85rem' }}>
                  <thead>
                    <tr>
                      <th>Exam Title</th>
                      <th>Timeline</th>
                      <th style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentExams.map((e: any) => (
                      <tr key={e.id}>
                        <td><strong>{e.name}</strong></td>
                        <td>{new Date(e.start_date).toLocaleDateString()} - {new Date(e.end_date).toLocaleDateString()}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button 
                            className="btn btn-sm btn-primary" 
                            onClick={() => handleOpenReportCard(e.id, sInfo.id)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                          >
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Fee Ledger Installments */}
          <div className="card dashboard-section">
            <h3 style={{ marginBottom: '1.25rem', fontSize: '1.05rem', fontWeight: 800 }}>Fee Ledger details</h3>
            {ledgerRecords.length === 0 ? (
              <p className="no-data" style={{ padding: '2rem 0', color: 'var(--text-muted)' }}>No fee allocations found for your account.</p>
            ) : (
              <div className="table-responsive">
                <table className="table" style={{ fontSize: '0.85rem' }}>
                  <thead>
                    <tr>
                      <th>Fee Component</th>
                      <th>Due Date</th>
                      <th style={{ textAlign: 'right' }}>Amount Due</th>
                      <th style={{ textAlign: 'center' }}>Status</th>
                      <th style={{ textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledgerRecords.map((rec: any) => (
                      <tr key={rec.id}>
                        <td><strong>{rec.fee_type}</strong></td>
                        <td>{new Date(rec.due_date).toLocaleDateString()}</td>
                        <td style={{ textAlign: 'right', fontWeight: 'bold' }}>₹{(rec.total_amount - rec.paid_amount).toLocaleString('en-IN')}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={`badge ${
                            rec.status === 'PAID' ? 'badge-success' : rec.status === 'PARTIAL' ? 'badge-warning' : 'badge-danger'
                          }`}>
                            {rec.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {rec.status !== 'PAID' ? (
                            <button
                              className="btn btn-outline"
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.72rem', borderColor: 'var(--primary)', color: 'var(--primary)', cursor: 'pointer' }}
                              onClick={() => handlePayOnlineInit(rec)}
                            >
                              Pay Online
                            </button>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Paid</span>
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
            <h3 style={{ marginBottom: '1.25rem', fontSize: '1.05rem', fontWeight: 800 }}>Payment History &amp; Receipts</h3>
            {payments.length === 0 ? (
              <p className="no-data" style={{ padding: '2rem 0', color: 'var(--text-muted)' }}>No payment transactions logged in the system.</p>
            ) : (
              <div className="table-responsive">
                <table className="table" style={{ fontSize: '0.85rem' }}>
                  <thead>
                    <tr>
                      <th>Date Paid</th>
                      <th>Fee Type</th>
                      <th>Method</th>
                      <th style={{ textAlign: 'right' }}>Amount</th>
                      <th style={{ textAlign: 'right' }}>Receipt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p: any) => (
                      <tr key={p.id}>
                        <td>{new Date(p.payment_date).toLocaleDateString()}</td>
                        <td>{p.fee_type}</td>
                        <td>{p.payment_method}</td>
                        <td style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--success)' }}>₹{p.amount.toLocaleString('en-IN')}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button 
                            className="btn btn-sm btn-outline" 
                            onClick={() => handleOpenReceipt(p)}
                            style={{ padding: '0.25rem 0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                          >
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
