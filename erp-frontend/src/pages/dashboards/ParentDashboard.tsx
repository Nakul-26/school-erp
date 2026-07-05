import './ParentDashboard.css';
import React from 'react';
import { AlertCircle, Clock, IndianRupee, Printer, BookOpen, Calendar, HelpCircle } from 'lucide-react';

interface ParentDashboardProps {
  stats: any;
  selectedChildIndex: number;
  setSelectedChildIndex: (idx: number) => void;
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

export default function ParentDashboard({
  stats,
  selectedChildIndex,
  setSelectedChildIndex,
  exams,
  ledgerRecords,
  payments,
  homework,
  handleOpenReportCard,
  handlePayOnlineInit,
  handleOpenReceipt,
}: ParentDashboardProps) {
  const children = stats?.children || [];
  if (children.length === 0) {
    return (
      <div className="card parent-dashboard-card">
        <AlertCircle size={48} className="parent-dashboard-AlertCircle-2"  />
        <h3>No Children Linked</h3>
        <p>Please contact your institution administration to link your parent account with your children.</p>
      </div>
    );
  }

  const activeChild = children[selectedChildIndex];
  const results = activeChild?.results || [];

  // Filter exams for active child
  const childExams = exams.filter(
    (e: any) => e.course_id === activeChild?.course_id && e.semester === activeChild?.semester && e.status !== 'DRAFT'
  );

  return (
    <div className="portal-dashboard parent-portal parent-dashboard-portal-dashboard">
      {/* Child Selector Tabs */}
      {children.length > 1 && (
        <div className="child-selector parent-dashboard-child-selector">
          {children.map((child: any, idx: number) => (
            <button
              key={child.student_id}
              className={`child-tab ${selectedChildIndex === idx ? 'active' : ''}`}
              onClick={() => setSelectedChildIndex(idx)}
              style={{
                padding: '0.5rem 1rem',
                marginRight: '0.5rem',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                background: selectedChildIndex === idx ? 'var(--primary)' : 'white',
                color: selectedChildIndex === idx ? 'white' : 'var(--text-main)',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              {child.name}
            </button>
          ))}
        </div>
      )}

      {activeChild && (
        <div className="selected-child-overview parent-dashboard-selected-child-overview">
          <div className="welcome-section card parent-dashboard-welcome-section">
            <h4 className="parent-dashboard-title-7">Academic overview for: <strong>{activeChild.name}</strong></h4>
            <p className="parent-dashboard-text-8">
              Roll Number: {activeChild.roll_number || 'N/A'} | Relationship: {activeChild.relationship}
            </p>
          </div>

          <div className="stats-grid">
            {/* Child Attendance */}
            <div className="stat-card card">
              <div className="icon parent-dashboard-icon">
                <Clock size={24} />
              </div>
              <div className="info">
                <h3>Attendance %</h3>
                <div className="value">{activeChild.attendance?.percentage || 0}%</div>
                <span className="sub-text">
                  Present: {activeChild.attendance?.present} of {activeChild.attendance?.total} classes
                </span>
              </div>
            </div>

            {/* Child Fees Status */}
            <div className="stat-card card">
              <div className="icon" style={{ 
                background: (activeChild.fees?.due > 0) ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', 
                color: (activeChild.fees?.due > 0) ? 'var(--danger)' : 'var(--success)' 
              }}>
                <IndianRupee size={24} />
              </div>
              <div className="info">
                <h3>Outstanding Fees</h3>
                <div className="value">{formatCurrency(activeChild.fees?.due || 0)}</div>
                <span className="sub-text">
                  Paid: {formatCurrency(activeChild.fees?.paid || 0)} / Total: {formatCurrency(activeChild.fees?.total || 0)}
                </span>
              </div>
            </div>
          </div>

          {/* Child Active Homework */}
          <div className="card parent-dashboard-card">
            <div className="parent-dashboard-row-11">
              <div className="parent-dashboard-div-12">
                <BookOpen size={20} />
              </div>
              <div>
                <h3 className="parent-dashboard-title-13">Active Homework &amp; Assignments</h3>
                <p className="parent-dashboard-text-14">Homework and projects assigned to {activeChild.name}</p>
              </div>
            </div>

            {homework.length === 0 ? (
              <div className="parent-dashboard-div-15">
                <HelpCircle size={32} className="parent-dashboard-HelpCircle-16"  />
                <h4 className="parent-dashboard-title-17">No active homework</h4>
                <p className="parent-dashboard-text-18">No assignments are currently pending for your child.</p>
              </div>
            ) : (
              <div className="parent-dashboard-col-19">
                {homework.slice(0, 5).map((hw: any) => {
                  const isOverdue = new Date(hw.due_date) < new Date() && hw.due_date;
                  return (
                    <div key={hw.id} className="parent-dashboard-col-20">
                      <div className="parent-dashboard-row-21">
                        <div>
                          <span className="badge parent-dashboard-badge">
                            {hw.subject_name}
                          </span>
                          <strong className="parent-dashboard-strong-23">{hw.title}</strong>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: isOverdue ? 'var(--danger)' : 'var(--text-muted)', fontWeight: 500 }}>
                          <Calendar size={12} />
                          <span>Due: {new Date(hw.due_date).toLocaleDateString()} {isOverdue && '(Overdue)'}</span>
                        </div>
                      </div>
                      {hw.description && (
                        <p className="parent-dashboard-text-24">
                          {hw.description}
                        </p>
                      )}
                      <div className="parent-dashboard-row-25">
                        <span>Teacher: {hw.teacher_first} {hw.teacher_last}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="dashboard-content-grid parent-dashboard-dashboard-content-grid">
            {/* Left Column: Academics */}
            <div className="parent-dashboard-col-27">
              {/* Child Results Table */}
              <div className="card dashboard-section">
                <h3 className="parent-dashboard-title-28">Latest Subject Marks</h3>
                {results.length === 0 ? (
                  <p className="no-data parent-dashboard-no-data">No results published yet for this student.</p>
                ) : (
                  <div className="table-responsive">
                    <table className="table parent-dashboard-table">
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

              {/* Child Official Report Cards */}
              <div className="card dashboard-section">
                <h3 className="parent-dashboard-title-31">Official Report Cards</h3>
                {childExams.length === 0 ? (
                  <p className="no-data parent-dashboard-no-data">No official report cards available for download yet.</p>
                ) : (
                  <div className="table-responsive">
                    <table className="table parent-dashboard-table">
                      <thead>
                        <tr>
                          <th>Exam Title</th>
                          <th>Timeline</th>
                          <th className="parent-dashboard-th-34">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {childExams.map((e: any) => (
                          <tr key={e.id}>
                            <td><strong>{e.name}</strong></td>
                            <td>{new Date(e.start_date).toLocaleDateString()} - {new Date(e.end_date).toLocaleDateString()}</td>
                            <td className="parent-dashboard-td-35">
                              <button className="btn btn-sm btn-primary parent-dashboard-btn" onClick={() => handleOpenReportCard(e.id, activeChild.id)}>
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

            {/* Right Column: Fees Ledger */}
            <div className="parent-dashboard-col-37">
              {/* Child Fee Ledger */}
              <div className="card dashboard-section">
                <h3 className="parent-dashboard-title-38">Fee Ledger details</h3>
                {ledgerRecords.length === 0 ? (
                  <p className="no-data parent-dashboard-no-data">No fee allocations found for this child.</p>
                ) : (
                  <div className="table-responsive">
                    <table className="table parent-dashboard-table">
                      <thead>
                        <tr>
                          <th>Fee Component</th>
                          <th>Due Date</th>
                          <th className="parent-dashboard-th-41">Amount Due</th>
                          <th className="parent-dashboard-th-42">Status</th>
                          <th className="parent-dashboard-th-43">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ledgerRecords.map((rec: any) => (
                          <tr key={rec.id}>
                            <td><strong>{rec.fee_type}</strong></td>
                            <td>{new Date(rec.due_date).toLocaleDateString()}</td>
                            <td className="parent-dashboard-td-44">₹{(rec.total_amount - rec.paid_amount).toLocaleString('en-IN')}</td>
                            <td className="parent-dashboard-td-45">
                              <span className={`badge ${
                                rec.status === 'PAID' ? 'badge-success' : rec.status === 'PARTIAL' ? 'badge-warning' : 'badge-danger'
                              }`}>
                                {rec.status}
                              </span>
                            </td>
                            <td className="parent-dashboard-td-46">
                              {rec.status !== 'PAID' ? (
                                <button className="btn btn-outline parent-dashboard-btn" onClick={() => handlePayOnlineInit(rec)}>
                                  Pay Online
                                </button>
                              ) : (
                                <span className="parent-dashboard-span-48">Paid</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Child Payment Receipts */}
              <div className="card dashboard-section">
                <h3 className="parent-dashboard-title-49">Payment History &amp; Receipts</h3>
                {payments.length === 0 ? (
                  <p className="no-data parent-dashboard-no-data">No payment transactions logged in the system.</p>
                ) : (
                  <div className="table-responsive">
                    <table className="table parent-dashboard-table">
                      <thead>
                        <tr>
                          <th>Date Paid</th>
                          <th>Fee Type</th>
                          <th>Method</th>
                          <th className="parent-dashboard-th-52">Amount</th>
                          <th className="parent-dashboard-th-53">Receipt</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payments.map((p: any) => (
                          <tr key={p.id}>
                            <td>{new Date(p.payment_date).toLocaleDateString()}</td>
                            <td>{p.fee_type}</td>
                            <td>{p.payment_method}</td>
                            <td className="parent-dashboard-td-54">₹{p.amount.toLocaleString('en-IN')}</td>
                            <td className="parent-dashboard-td-55">
                              <button className="btn btn-sm btn-outline parent-dashboard-btn" onClick={() => handleOpenReceipt(p)}>
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
      )}
    </div>
  );
}
