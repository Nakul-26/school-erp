import './Dashboard.css';
import React, { useEffect, useState } from 'react';
import { PageGuidance } from '../components/PageGuidance';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import SkeletonLoader from '../components/SkeletonLoader';
import AdminDashboard from './dashboards/AdminDashboard';
import TeacherDashboard from './dashboards/TeacherDashboard';
import StudentDashboard from './dashboards/StudentDashboard';
import ParentDashboard from './dashboards/ParentDashboard';
import AccountantDashboard from './dashboards/AccountantDashboard';
import { 
  Users, 
  BookOpen, 
  Clock, 
  TrendingUp, 
  LogOut, 
  Award, 
  Megaphone, 
  Bell, 
  Calendar, 
  IndianRupee, 
  AlertTriangle, 
  CheckCircle,
  AlertCircle,
  FileSpreadsheet,
  Printer,
  Eye,
  Download,
  ArrowRight,
  CreditCard,
  Smartphone,
  Check
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { user, logout } = useAuth();
  
  // Dashboard data states
  const [stats, setStats] = useState<any>(null);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Parent state for active child
  const [selectedChildIndex, setSelectedChildIndex] = useState(0);

  // Additional portal views state
  const [exams, setExams] = useState<any[]>([]);
  const [ledgerRecords, setLedgerRecords] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [homework, setHomework] = useState<any[]>([]);

  // Modals for Report Card & Receipts
  const [selectedReportCard, setSelectedReportCard] = useState<any | null>(null);
  const [showReportCardModal, setShowReportCardModal] = useState(false);
  const [loadingReportCard, setLoadingReportCard] = useState(false);
  
  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [loadingReceipt, setLoadingReceipt] = useState(false);

  // Online Fee Payments state (Phase C)
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedFeeRecord, setSelectedFeeRecord] = useState<any | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'Card' | 'UPI'>('UPI');
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState<{receiptNumber: string} | null>(null);
  const [upiTimer, setUpiTimer] = useState<number>(60);
  const [simulatingUpiSuccess, setSimulatingUpiSuccess] = useState(false);
  
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCVV, setCardCVV] = useState('');
  const [cardName, setCardName] = useState('');

  const handlePayOnlineInit = (rec: any) => {
    setSelectedFeeRecord(rec);
    const remaining = rec.total_amount - rec.paid_amount;
    setPaymentAmount(String(remaining));
    setPaymentMethod('UPI');
    setUpiTimer(60);
    setSimulatingUpiSuccess(false);
    setCardNumber('');
    setCardExpiry('');
    setCardCVV('');
    setCardName('');
    setPaymentSuccess(null);
    setShowPaymentModal(true);
  };

  useEffect(() => {
    let interval: any;
    if (showPaymentModal && paymentMethod === 'UPI' && upiTimer > 0 && !simulatingUpiSuccess) {
      interval = setInterval(() => {
        setUpiTimer(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [showPaymentModal, paymentMethod, upiTimer, simulatingUpiSuccess]);

  const triggerSimulateScan = async () => {
    if (submittingPayment) return;
    setSimulatingUpiSuccess(true);
    setSubmittingPayment(true);
    setTimeout(async () => {
      try {
        const remaining = selectedFeeRecord.total_amount - selectedFeeRecord.paid_amount;
        const amt = Number(paymentAmount) || remaining;
        const res = await api.post(`/fees/records/${selectedFeeRecord.id}/pay-online`, {
          amount: amt,
          payment_method: 'UPI-Online',
          transaction_reference: `UPI-TXN-${Date.now().toString().slice(-6)}`
        });
        setPaymentSuccess({ receiptNumber: res.receipt_number });
        fetchDashboardData();
      } catch (err: any) {
        alert(err.message || 'Payment processing failed');
        setSimulatingUpiSuccess(false);
      } finally {
        setSubmittingPayment(false);
      }
    }, 2500);
  };

  const handleCardPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardNumber || !cardExpiry || !cardCVV || !cardName) {
      return alert('Please fill in all credit/debit card fields.');
    }
    try {
      setSubmittingPayment(true);
      const remaining = selectedFeeRecord.total_amount - selectedFeeRecord.paid_amount;
      const amt = Number(paymentAmount) || remaining;
      const res = await api.post(`/fees/records/${selectedFeeRecord.id}/pay-online`, {
        amount: amt,
        payment_method: 'Card-Online',
        transaction_reference: `CRD-TXN-${Date.now().toString().slice(-6)}`
      });
      setPaymentSuccess({ receiptNumber: res.receipt_number });
      fetchDashboardData();
    } catch (err: any) {
      alert(err.message || 'Card authorization failed');
    } finally {
      setSubmittingPayment(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (!stats) return;
    
    const isStudent = stats.role === 'student';
    const isParent = stats.role === 'parent';
    
    const fetchPortalDetails = async () => {
      try {
        if (isStudent && stats.studentInfo?.id) {
          const studId = stats.studentInfo.id;
          const secId = stats.studentInfo.section_id;
          const [examsData, ledgerData, paymentsData, hwData] = await Promise.all([
            api.get('/exams').catch(() => []),
            api.get(`/fees/ledger/${studId}`).catch(() => []),
            api.get(`/fees/payments?student_id=${studId}`).catch(() => []),
            secId ? api.get(`/homework?section_id=${secId}`).catch(() => []) : Promise.resolve([])
          ]);
          setExams(examsData);
          setLedgerRecords(ledgerData);
          setPayments(paymentsData);
          setHomework(hwData);
        } else if (isParent && stats.children && stats.children.length > 0) {
          const child = stats.children[selectedChildIndex];
          if (child?.id) {
            const secId = child.section_id;
            const [examsData, ledgerData, paymentsData, hwData] = await Promise.all([
              api.get('/exams').catch(() => []),
              api.get(`/fees/ledger/${child.id}`).catch(() => []),
              api.get(`/fees/payments?student_id=${child.id}`).catch(() => []),
              secId ? api.get(`/homework?section_id=${secId}`).catch(() => []) : Promise.resolve([])
            ]);
            setExams(examsData);
            setLedgerRecords(ledgerData);
            setPayments(paymentsData);
            setHomework(hwData);
          }
        }
      } catch (err) {
        console.error('Error loading portal details:', err);
      }
    };
    
    fetchPortalDetails();
  }, [stats, selectedChildIndex]);

  const handleOpenReportCard = async (examId: string, studentId: string) => {
    try {
      setLoadingReportCard(true);
      setShowReportCardModal(true);
      const data = await api.get(`/grades/report-card/${examId}/${studentId}`);
      setSelectedReportCard(data);
    } catch (err: any) {
      alert(err.message || 'Error loading report card');
      setShowReportCardModal(false);
    } finally {
      setLoadingReportCard(false);
    }
  };

  const handleOpenReceipt = async (payment: any) => {
    try {
      setLoadingReceipt(true);
      setShowReceiptModal(true);
      
      let receipt;
      if (payment.receipt_number) {
        receipt = await api.get(`/fees/receipts/${payment.receipt_number}`);
      } else {
        const receiptsList = await api.get('/fees/receipts');
        const match = receiptsList.find((r: any) => r.payment_id === payment.id);
        if (match) {
          receipt = await api.get(`/fees/receipts/${match.id}`);
        }
      }
      
      if (!receipt) {
        throw new Error('Receipt record not found in system.');
      }
      
      setSelectedReceipt(receipt);
    } catch (err: any) {
      alert(err.message || 'Error loading fee receipt');
      setShowReceiptModal(false);
    } finally {
      setLoadingReceipt(false);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch stats, announcements, and notifications in parallel
      const [statsData, annData, notifData] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/announcements').catch(() => []),
        api.get('/notifications').catch(() => [])
      ]);
      
      setStats(statsData);
      setAnnouncements(annData);
      setNotifications(notifData);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to load dashboard overview.');
    } finally {
      setLoading(false);
    }
  };

  // Standalone sub-dashboards are now rendered as imported components.

  const getPortalRoleLabel = () => {
    if (stats?.role === 'admin') return 'Administrator';
    if (stats?.role === 'teacher') return 'Teaching Faculty';
    if (stats?.role === 'student') return 'Student Portal';
    if (stats?.role === 'parent') return 'Parent/Guardian Portal';
    if (stats?.role === 'accountant') return 'Accountant Portal';
    return user?.role || 'User';
  };

  return (
    <Layout>
      <div className="page-header">
        <h1>Dashboard Overview</h1>
        <button className="btn btn-outline" onClick={logout}>
          <LogOut size={18} /> Logout
        </button>
      </div>

      {loading ? (
        <div className="dashboard-col-1">
          <SkeletonLoader type="card" count={3} />
          <SkeletonLoader type="table" rows={3} cols={4} />
        </div>
      ) : error ? (
        <div className="alert alert-danger dashboard-alert">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      ) : (
        <>
          <div className="welcome-section card dashboard-welcome-section">
            <h2>Welcome back, {user?.name || user?.email}!</h2>
            <p>You are viewing the <strong>{getPortalRoleLabel()}</strong> panel. Here is your summary checklist for today.</p>
          </div>

          {/* Render Portal Dashboard View */}
          {stats?.role === 'admin' && <AdminDashboard stats={stats} />}
          {stats?.role === 'teacher' && <TeacherDashboard stats={stats} />}
          {stats?.role === 'student' && (
            <StudentDashboard
              stats={stats}
              exams={exams}
              ledgerRecords={ledgerRecords}
              payments={payments}
              homework={homework}
              handleOpenReportCard={handleOpenReportCard}
              handlePayOnlineInit={handlePayOnlineInit}
              handleOpenReceipt={handleOpenReceipt}
            />
          )}
          {stats?.role === 'parent' && (
            <ParentDashboard
              stats={stats}
              selectedChildIndex={selectedChildIndex}
              setSelectedChildIndex={setSelectedChildIndex}
              exams={exams}
              ledgerRecords={ledgerRecords}
              payments={payments}
              homework={homework}
              handleOpenReportCard={handleOpenReportCard}
              handlePayOnlineInit={handlePayOnlineInit}
              handleOpenReceipt={handleOpenReceipt}
            />
          )}
          {stats?.role === 'accountant' && <AccountantDashboard stats={stats} />}

          {/* General Bottom Section: Announcements & Notifications */}
          <div className="dashboard-grid dashboard-grid">
            {/* Announcements Card */}
            <div className="card dashboard-card-full">
              <div className="card-header-icon">
                <Megaphone className="header-icon dashboard-announcement-icon"  />
                <h3>Latest Announcements</h3>
              </div>
              {announcements.length === 0 ? (
                <p className="no-data">No active announcements for your role.</p>
              ) : (
                <div className="announcements-list">
                  {announcements.slice(0, 5).map((ann: any) => (
                    <div key={ann.id} className="announcement-item">
                      <div className="ann-title">
                        <h4>{ann.title}</h4>
                        <span className="ann-date">{new Date(ann.created_at).toLocaleDateString()}</span>
                      </div>
                      <p>{ann.content}</p>
                    </div>
                  ))}
                  {announcements.length > 5 && (
                    <Link to="/announcements" className="view-all-link">
                      View all announcements &rarr;
                    </Link>
                  )}
                </div>
              )}
            </div>

            {/* Notifications Card */}
            <div className="card dashboard-card-full">
              <div className="card-header-icon">
                <Bell className="header-icon dashboard-notification-icon"  />
                <h3>Notifications</h3>
              </div>
              {notifications.length === 0 ? (
                <p className="no-data">No unread notifications.</p>
              ) : (
                <div className="notifications-list">
                  {notifications.slice(0, 5).map((notif: any) => (
                    <div key={notif.id} className={`notification-item ${notif.is_read ? 'read' : 'unread'}`}>
                      <div className="notif-content">
                        <strong>{notif.title}</strong>
                        <p>{notif.message}</p>
                      </div>
                      <span className="notif-date">{new Date(notif.created_at).toLocaleDateString()}</span>
                    </div>
                  ))}
                  {notifications.length > 5 && (
                    <Link to="/notifications" className="view-all-link">
                      View all notifications &rarr;
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      

      {/* Report Card Modal */}
      {showReportCardModal && (
        <div className="modal-overlay no-print dashboard-modal-overlay" onClick={() => { setShowReportCardModal(false); setSelectedReportCard(null); }}>
          <div className="modal-content dashboard-modal-content" onClick={e => e.stopPropagation()}>
            <div className="dashboard-row-9">
              <h3 className="dashboard-title-10">Student Academic Report Card</h3>
              <button onClick={() => { setShowReportCardModal(false); setSelectedReportCard(null); }} className="dashboard-btn-11">✕</button>
            </div>
            
            {loadingReportCard ? (
              <p className="dashboard-text-12">Building report card layout...</p>
            ) : selectedReportCard ? (
              <div id="printable-report-card" className="dashboard-div-13">
                <div className="dashboard-div-14">
                  <h2 className="dashboard-title-15">Academic Report Card</h2>
                  <h3 className="dashboard-title-16">{selectedReportCard.exam.institution_name || 'Greenwood High School'}</h3>
                </div>

                <div className="dashboard-grid-17">
                  <div>
                    <p className="dashboard-text-18"><strong>Student Name:</strong> {selectedReportCard.student.first_name} {selectedReportCard.student.last_name}</p>
                    <p className="dashboard-text-19"><strong>Roll Number:</strong> {selectedReportCard.student.roll_number || '-'}</p>
                    <p className="dashboard-text-20"><strong>Admission No:</strong> {selectedReportCard.student.admission_number}</p>
                  </div>
                  <div className="dashboard-div-21">
                    <p className="dashboard-text-22"><strong>Exam:</strong> {selectedReportCard.exam.name}</p>
                    <p className="dashboard-text-23"><strong>Academic Year:</strong> {selectedReportCard.exam.academic_year}</p>
                    <p className="dashboard-text-24"><strong>Program:</strong> {selectedReportCard.exam.course}</p>
                  </div>
                </div>

                <table className="table dashboard-table">
                  <thead>
                    <tr className="dashboard-tr-26">
                      <th className="dashboard-th-27">Subject Code</th>
                      <th className="dashboard-th-28">Subject Name</th>
                      <th className="dashboard-th-29">Max Marks</th>
                      <th className="dashboard-th-30">Obtained</th>
                      <th className="dashboard-th-31">Percentage</th>
                      <th className="dashboard-th-32">Grade</th>
                      <th className="dashboard-th-33">GP</th>
                      <th className="dashboard-th-34">Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedReportCard.subjects.map((sub: any, idx: number) => (
                      <tr key={idx} className="dashboard-tr-35">
                        <td className="dashboard-td-36">{sub.subject_code}</td>
                        <td className="dashboard-td-37">{sub.subject_name}</td>
                        <td className="dashboard-td-38">{sub.max_marks}</td>
                        <td className="dashboard-td-39">{sub.marks_obtained}</td>
                        <td className="dashboard-td-40">{sub.percent}%</td>
                        <td className="dashboard-td-41">{sub.grade}</td>
                        <td className="dashboard-td-42">{sub.grade_point}</td>
                        <td className="dashboard-td-43">
                          <span style={{ color: sub.is_passing ? 'var(--success)' : 'var(--danger)', fontWeight: 'bold' }}>
                            {sub.is_passing ? 'PASS' : 'FAIL'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    <tr className="dashboard-tr-44">
                      <td colSpan={2} className="dashboard-td-45">GRAND TOTAL</td>
                      <td className="dashboard-td-46">{selectedReportCard.total.max_marks}</td>
                      <td className="dashboard-td-47">{selectedReportCard.total.marks_obtained}</td>
                      <td className="dashboard-td-48">{selectedReportCard.total.percent}%</td>
                      <td className="dashboard-td-49">{selectedReportCard.total.grade}</td>
                      <td className="dashboard-td-50">{selectedReportCard.total.grade_point}</td>
                      <td className="dashboard-td-51">
                        <span style={{ color: selectedReportCard.result === 'PASS' ? 'var(--success)' : 'var(--danger)' }}>
                          {selectedReportCard.result}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>

                <div className="dashboard-grid-52">
                  <div>
                    <p><strong>Rank in Class:</strong> {selectedReportCard.total.rank || 'N/A'}</p>
                  </div>
                  <div>
                    <p><strong>Attendance:</strong> {selectedReportCard.attendance_percent !== null ? `${selectedReportCard.attendance_percent}%` : 'N/A'}</p>
                  </div>
                  <div className="dashboard-div-53">
                    <p><strong>Overall Result:</strong> <span style={{ fontWeight: 'bold', color: selectedReportCard.result === 'PASS' ? 'var(--success)' : 'var(--danger)' }}>{selectedReportCard.result}</span></p>
                  </div>
                </div>

                <div className="dashboard-row-54">
                  <div className="dashboard-div-55">Class Teacher</div>
                  <div className="dashboard-div-56">Controller of Exams</div>
                  <div className="dashboard-div-57">Principal</div>
                </div>
              </div>
            ) : <p className="dashboard-text-58">No report card data loaded</p>}

            <div className="no-print dashboard-no-print">
              <button className="btn btn-outline" onClick={() => { setShowReportCardModal(false); setSelectedReportCard(null); }}>Close</button>
              <button className="btn btn-primary" onClick={() => window.print()} disabled={!selectedReportCard}>
                <Printer size={16} /> Print Report Card
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fee Receipt Modal */}
      {showReceiptModal && (
        <div className="modal-overlay no-print dashboard-modal-overlay" onClick={() => { setShowReceiptModal(false); setSelectedReceipt(null); }}>
          <div className="modal-content dashboard-modal-content" onClick={e => e.stopPropagation()}>
            <div className="dashboard-row-62">
              <h3 className="dashboard-title-63">Fee Payment Receipt</h3>
              <button onClick={() => { setShowReceiptModal(false); setSelectedReceipt(null); }} className="dashboard-btn-64">✕</button>
            </div>

            {loadingReceipt ? (
              <p className="dashboard-text-65">Loading receipt information...</p>
            ) : selectedReceipt ? (
              <div className="receipt-print-container dashboard-receipt-print-container">
                <div className="dashboard-div-67">
                  <h2 className="dashboard-title-68">{selectedReceipt.institution_name}</h2>
                  <p className="dashboard-text-69">{selectedReceipt.institution_address || 'Education Campus Road, IN'}</p>
                  <h3 className="dashboard-title-70">FEES PAYMENT RECEIPT</h3>
                </div>

                <div className="dashboard-grid-71">
                  <div>
                    <div><strong>Receipt No:</strong> {selectedReceipt.receipt_number}</div>
                    <div><strong>Date:</strong> {new Date(selectedReceipt.receipt_date).toLocaleDateString(undefined, { dateStyle: 'long' })}</div>
                    <div><strong>Student Name:</strong> {selectedReceipt.first_name} {selectedReceipt.last_name}</div>
                    <div><strong>Admission ID:</strong> {selectedReceipt.admission_number}</div>
                  </div>
                  <div>
                    <div><strong>Academic Year:</strong> {selectedReceipt.academic_year_name}</div>
                    <div><strong>Program:</strong> {selectedReceipt.course_name}</div>
                    <div><strong>Roll Number:</strong> {selectedReceipt.roll_number || '-'}</div>
                  </div>
                </div>

                <table className="dashboard-table-72">
                  <thead>
                    <tr className="dashboard-tr-73">
                      <th className="dashboard-th-74">FEE DESCRIPTION</th>
                      <th className="dashboard-th-75">TOTAL DUE</th>
                      <th className="dashboard-th-76">PAID AMOUNT</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="dashboard-tr-77">
                      <td className="dashboard-td-78">{selectedReceipt.fee_type} Payment ({selectedReceipt.payment_method})</td>
                      <td className="dashboard-td-79">₹{selectedReceipt.total_amount.toLocaleString('en-IN')}</td>
                      <td className="dashboard-td-80">₹{selectedReceipt.paid_amount.toLocaleString('en-IN')}</td>
                    </tr>
                  </tbody>
                </table>

                <div className="dashboard-row-81">
                  <div>
                    <div><strong>Payment Method:</strong> {selectedReceipt.payment_method}</div>
                    {selectedReceipt.transaction_reference && <div><strong>Txn Reference:</strong> {selectedReceipt.transaction_reference}</div>}
                    {selectedReceipt.remarks && <div><strong>Remarks:</strong> {selectedReceipt.remarks}</div>}
                  </div>
                  <div className="dashboard-div-82">
                    <div className="dashboard-div-83">
                      <strong>Ledger Paid:</strong> ₹{selectedReceipt.total_paid.toLocaleString('en-IN')}
                    </div>
                    <div>
                      <strong>Ledger Due:</strong> ₹{(selectedReceipt.total_amount - selectedReceipt.total_paid).toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>

                <div className="dashboard-row-84">
                  <div>* Computer generated receipt. No physical signature required.</div>
                  <div>Authorized Signatory</div>
                </div>
              </div>
            ) : <p className="dashboard-text-85">No receipt details loaded</p>}

            <div className="no-print dashboard-no-print">
              <button className="btn btn-outline" onClick={() => { setShowReceiptModal(false); setSelectedReceipt(null); }}>Close</button>
              <button className="btn btn-primary" onClick={() => window.print()} disabled={!selectedReceipt}>
                <Printer size={16} /> Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Online Payments Checkout Modal (Phase C) */}
      {showPaymentModal && selectedFeeRecord && (
        <div className="modal-overlay no-print dashboard-modal-overlay" onClick={() => setShowPaymentModal(false)}>
          <div className="modal-content dashboard-modal-content" onClick={e => e.stopPropagation()}>
            <div className="dashboard-row-89">
              <h3 className="dashboard-title-90">Online Fee Checkout</h3>
              <button onClick={() => { setShowPaymentModal(false); setPaymentSuccess(null); }} className="dashboard-btn-91">✕</button>
            </div>

            {paymentSuccess ? (
              <div className="dashboard-div-92">
                <div className="dashboard-row-93">✓</div>
                <h3 className="dashboard-title-94">Payment Successful!</h3>
                <p className="dashboard-text-95">
                  Your payment has been processed and recorded.
                </p>
                <div className="dashboard-div-96">
                  <div className="dashboard-div-97">Receipt Number</div>
                  <div className="dashboard-div-98">
                    {paymentSuccess.receiptNumber}
                  </div>
                </div>
                <button className="btn btn-primary dashboard-btn" onClick={() => { setShowPaymentModal(false); setPaymentSuccess(null); setSelectedFeeRecord(null); }}>
                  Done
                </button>
              </div>
            ) : (
              <>
                <div className="dashboard-div-100">
                  <div><strong>Fee Component:</strong> {selectedFeeRecord.fee_type}</div>
                  <div><strong>Dues Outstanding:</strong> ₹{(selectedFeeRecord.total_amount - selectedFeeRecord.paid_amount).toLocaleString('en-IN')}</div>
                </div>

                <div className="page-tabs dashboard-page-tabs">
                  <button type="button" className={`page-tab ${paymentMethod === 'UPI' ? 'active' : ''} dashboard-btn-102`} onClick={() => setPaymentMethod('UPI')}>
                    UPI QR Code
                  </button>
                  <button type="button" className={`page-tab ${paymentMethod === 'Card' ? 'active' : ''} dashboard-btn-103`} onClick={() => setPaymentMethod('Card')}>
                    Debit / Credit Card
                  </button>
                </div>

                {paymentMethod === 'UPI' ? (
                  <div className="dashboard-div-104">
                    <p className="dashboard-text-105">
                      Scan the secure UPI QR Code using your banking app (GPay, PhonePe, BHIM, etc.) to pay.
                    </p>
                    
                    <div className="dashboard-col-106">
                      {/* Simulated QR Code Graphic */}
                      <div style={{ width: '160px', height: '160px', backgroundImage: 'radial-gradient(var(--text-main) 60%, transparent 60%)', backgroundSize: '12px 12px', opacity: simulatingUpiSuccess ? 0.15 : 0.85 }} />
                      <Smartphone size={32} className="dashboard-Smartphone-107"  />
                      {simulatingUpiSuccess && (
                        <div className="dashboard-col-108">
                          <div className="spinner dashboard-spinner"  />
                          <span className="dashboard-span-110">Verifying Payment...</span>
                        </div>
                      )}
                    </div>

                    <div className="dashboard-div-111">
                      QR Code expires in: <span className="dashboard-span-112">{upiTimer}s</span>
                    </div>

                    <div className="dashboard-div-113">
                      <button type="button" className="btn btn-primary dashboard-btn" onClick={triggerSimulateScan} disabled={submittingPayment}>
                        {submittingPayment ? 'Processing Approval...' : 'Simulate UPI Scanner App Approval'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleCardPaymentSubmit}>
                    <div className="form-group">
                      <label>Cardholder Name</label>
                      <input
                        type="text"
                        placeholder="John Doe"
                        value={cardName}
                        onChange={e => setCardName(e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group dashboard-form-group">
                      <label>Card Number</label>
                      <div className="dashboard-div-116">
                        <input
                          type="text"
                          maxLength={19}
                          placeholder="4111 2222 3333 4444"
                          value={cardNumber}
                          onChange={e => setCardNumber(e.target.value.replace(/\s?/g, '').replace(/(\d{4})/g, '$1 ').trim())}
                          required
                        />
                        <CreditCard size={18} className="dashboard-CreditCard-117"  />
                      </div>
                    </div>

                    <div className="dashboard-grid-118">
                      <div className="form-group">
                        <label>Expiration Date</label>
                        <input
                          type="text"
                          maxLength={5}
                          placeholder="MM/YY"
                          value={cardExpiry}
                          onChange={e => setCardExpiry(e.target.value)}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>CVV / CVC</label>
                        <input
                          type="password"
                          maxLength={3}
                          placeholder="123"
                          value={cardCVV}
                          onChange={e => setCardCVV(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="dashboard-div-119">
                      <button type="submit" className="btn btn-primary dashboard-btn" disabled={submittingPayment}>
                        {submittingPayment ? 'Authorizing Card Transaction...' : `Authorize Payment of ₹${Number(paymentAmount).toLocaleString('en-IN')}`}
                      </button>
                    </div>
                  </form>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}
