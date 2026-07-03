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
      <PageGuidance
        title="Dashboard Overview"
        description="Use this page to get a quick summary of the school's daily activities, student counts, and important alerts."
        steps={["Check the total number of students and staff members in the school.","Look at today's attendance rate and pending tasks.","Read the latest announcements posted on the board."]}
      />
      <div className="page-header">
        <h1>Dashboard Overview</h1>
        <button className="btn btn-outline" onClick={logout}>
          <LogOut size={18} /> Logout
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <SkeletonLoader type="card" count={3} />
          <SkeletonLoader type="table" rows={3} cols={4} />
        </div>
      ) : error ? (
        <div className="alert alert-danger" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      ) : (
        <>
          <div className="welcome-section card" style={{ background: 'var(--primary-gradient)', color: 'white', marginBottom: '2rem' }}>
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
          <div className="dashboard-grid" style={{ marginTop: '2.5rem' }}>
            {/* Announcements Card */}
            <div className="card dashboard-card-full">
              <div className="card-header-icon">
                <Megaphone className="header-icon" style={{ color: 'var(--primary)' }} />
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
                <Bell className="header-icon" style={{ color: 'var(--warning)' }} />
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

      <style>{`
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 1.5rem;
        }
        .stat-card {
          display: flex;
          align-items: center;
          gap: 1.25rem;
          padding: 1.5rem;
        }
        .stat-card .icon {
          width: 48px;
          height: 48px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .stat-card .info h3 {
          margin: 0;
          font-size: 0.825rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-muted);
        }
        .stat-card .info .value {
          font-size: 1.5rem;
          font-weight: 800;
          margin-top: 0.25rem;
          color: var(--text-main);
        }
        .stat-card .info .sub-text {
          font-size: 0.725rem;
          color: var(--text-muted);
          display: block;
          margin-top: 0.15rem;
        }
        .loading-state {
          padding: 4rem;
          text-align: center;
          color: var(--text-muted);
        }
        .dashboard-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
          gap: 2rem;
        }
        .card-header-icon {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1.25rem;
          border-bottom: 1px solid var(--border);
          padding-bottom: 0.75rem;
        }
        .card-header-icon h3 {
          font-size: 1rem;
          font-weight: 700;
          margin: 0;
        }
        .header-icon {
          width: 20px;
          height: 20px;
        }
        .announcements-list, .notifications-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .announcement-item, .notification-item {
          padding: 1rem;
          border-radius: var(--radius-sm);
          background: #f8fafc;
          border-left: 3px solid var(--primary);
        }
        .notification-item.read {
          opacity: 0.7;
          border-left-color: var(--secondary);
        }
        .ann-title {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.5rem;
        }
        .ann-title h4 {
          font-size: 0.9rem;
          font-weight: 700;
          margin: 0;
        }
        .ann-date, .notif-date {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        .announcement-item p, .notif-content p {
          font-size: 0.825rem;
          color: var(--text-muted);
          margin-top: 0.25rem;
          line-height: 1.4;
        }
        .view-all-link {
          text-align: center;
          font-size: 0.825rem;
          color: var(--primary);
          text-decoration: none;
          font-weight: 600;
          margin-top: 0.5rem;
        }
        .no-data {
          color: var(--text-muted);
          font-size: 0.875rem;
          text-align: center;
          padding: 2rem 0;
        }
        .quick-actions-grid {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
        }
        .action-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.25rem;
          border-radius: var(--radius-sm);
          background: #f1f5f9;
          color: var(--text-main);
          text-decoration: none;
          font-weight: 600;
          font-size: 0.875rem;
          transition: all 0.2s;
          border: 1px solid var(--border);
        }
        .action-btn:hover {
          background: var(--primary);
          color: white;
          border-color: var(--primary);
        }
        .child-selector {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
          border-bottom: 1px solid var(--border);
          padding-bottom: 0.75rem;
        }
        .child-tab {
          padding: 0.5rem 1rem;
          border-radius: 20px;
          border: 1px solid var(--border);
          background: white;
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-muted);
          transition: all 0.2s;
        }
        .child-tab.active {
          background: var(--primary);
          color: white;
          border-color: var(--primary);
        }
        .table-responsive {
          margin-top: 1rem;
          overflow-x: auto;
        }
        .table {
          width: 100%;
          border-collapse: collapse;
        }
        .table th, .table td {
          padding: 0.75rem 1rem;
          text-align: left;
          font-size: 0.875rem;
          border-bottom: 1px solid var(--border);
        }
        .table th {
          font-weight: 600;
          color: var(--text-muted);
        }
        /* Setup checklist styles */
        .setup-checklist {
          background: white;
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          padding: 1.5rem;
        }
        .setup-checklist-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1.25rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid var(--border);
        }
        .setup-checklist-icon {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: rgba(79, 70, 229, 0.1);
          color: var(--primary);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .setup-checklist-title {
          font-size: 1rem;
          font-weight: 700;
          color: var(--text-main);
        }
        .setup-checklist-subtitle {
          font-size: 0.8rem;
          color: var(--text-muted);
          margin-top: 0.15rem;
        }
        .setup-checklist-steps {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .setup-step {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.875rem 1rem;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border);
          text-decoration: none;
          color: var(--text-main);
          background: #fafbfc;
          transition: all 0.2s;
        }
        .setup-step:hover {
          border-color: var(--primary);
          background: rgba(79, 70, 229, 0.03);
        }
        .setup-step-done {
          opacity: 0.6;
          background: #f6ffed;
          border-color: #b7eb8f;
        }
        .setup-step-icon {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.8rem;
          font-weight: 700;
          flex-shrink: 0;
        }
        .setup-step-icon-done {
          background: #52c41a;
          color: white;
        }
        .setup-step-icon-pending {
          background: var(--primary);
          color: white;
        }
        .setup-step-body {
          flex: 1;
        }
        .setup-step-label {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-main);
        }
        .setup-step-desc {
          font-size: 0.775rem;
          color: var(--text-muted);
          margin-top: 0.1rem;
        }
        .setup-step-cta {
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--primary);
          white-space: nowrap;
        }
      `}</style>

      {/* Report Card Modal */}
      {showReportCardModal && (
        <div className="modal-overlay no-print" onClick={() => { setShowReportCardModal(false); setSelectedReportCard(null); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.45)', zIndex: 1000, padding: '1rem' }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ backgroundColor: '#ffffff', borderRadius: 'var(--radius-lg)', maxWidth: '800px', width: '90%', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Student Academic Report Card</h3>
              <button onClick={() => { setShowReportCardModal(false); setSelectedReportCard(null); }} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
            </div>
            
            {loadingReportCard ? (
              <p style={{ textAlign: 'center', padding: '2rem' }}>Building report card layout...</p>
            ) : selectedReportCard ? (
              <div id="printable-report-card" style={{ padding: '1rem', backgroundColor: '#fff', color: '#000', fontFamily: 'Inter, sans-serif' }}>
                <div style={{ textAlign: 'center', marginBottom: '1.5rem', borderBottom: '2px solid #000', paddingBottom: '1rem' }}>
                  <h2 style={{ margin: 0, textTransform: 'uppercase', fontSize: '1.4rem', fontWeight: 800 }}>Academic Report Card</h2>
                  <h3 style={{ margin: '0.25rem 0 0 0', fontWeight: 'bold', fontSize: '1.1rem', color: '#1e293b' }}>{selectedReportCard.exam.institution_name || 'Greenwood High School'}</h3>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
                  <div>
                    <p style={{ margin: '0.25rem 0' }}><strong>Student Name:</strong> {selectedReportCard.student.first_name} {selectedReportCard.student.last_name}</p>
                    <p style={{ margin: '0.25rem 0' }}><strong>Roll Number:</strong> {selectedReportCard.student.roll_number || '-'}</p>
                    <p style={{ margin: '0.25rem 0' }}><strong>Admission No:</strong> {selectedReportCard.student.admission_number}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ margin: '0.25rem 0' }}><strong>Exam:</strong> {selectedReportCard.exam.name}</p>
                    <p style={{ margin: '0.25rem 0' }}><strong>Academic Year:</strong> {selectedReportCard.exam.academic_year}</p>
                    <p style={{ margin: '0.25rem 0' }}><strong>Program:</strong> {selectedReportCard.exam.course}</p>
                  </div>
                </div>

                <table className="table" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #000', backgroundColor: '#f8fafc' }}>
                      <th style={{ textAlign: 'left', padding: '0.5rem' }}>Subject Code</th>
                      <th style={{ textAlign: 'left', padding: '0.5rem' }}>Subject Name</th>
                      <th style={{ textAlign: 'center', padding: '0.5rem' }}>Max Marks</th>
                      <th style={{ textAlign: 'center', padding: '0.5rem' }}>Obtained</th>
                      <th style={{ textAlign: 'center', padding: '0.5rem' }}>Percentage</th>
                      <th style={{ textAlign: 'center', padding: '0.5rem' }}>Grade</th>
                      <th style={{ textAlign: 'center', padding: '0.5rem' }}>GP</th>
                      <th style={{ textAlign: 'center', padding: '0.5rem' }}>Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedReportCard.subjects.map((sub: any, idx: number) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '0.5rem' }}>{sub.subject_code}</td>
                        <td style={{ padding: '0.5rem' }}>{sub.subject_name}</td>
                        <td style={{ textAlign: 'center', padding: '0.5rem' }}>{sub.max_marks}</td>
                        <td style={{ textAlign: 'center', padding: '0.5rem' }}>{sub.marks_obtained}</td>
                        <td style={{ textAlign: 'center', padding: '0.5rem' }}>{sub.percent}%</td>
                        <td style={{ textAlign: 'center', padding: '0.5rem', fontWeight: 'bold' }}>{sub.grade}</td>
                        <td style={{ textAlign: 'center', padding: '0.5rem' }}>{sub.grade_point}</td>
                        <td style={{ textAlign: 'center', padding: '0.5rem' }}>
                          <span style={{ color: sub.is_passing ? 'var(--success)' : 'var(--danger)', fontWeight: 'bold' }}>
                            {sub.is_passing ? 'PASS' : 'FAIL'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    <tr style={{ fontWeight: 'bold', borderTop: '2px solid #000', borderBottom: '2px solid #000' }}>
                      <td colSpan={2} style={{ padding: '0.5rem' }}>GRAND TOTAL</td>
                      <td style={{ textAlign: 'center', padding: '0.5rem' }}>{selectedReportCard.total.max_marks}</td>
                      <td style={{ textAlign: 'center', padding: '0.5rem' }}>{selectedReportCard.total.marks_obtained}</td>
                      <td style={{ textAlign: 'center', padding: '0.5rem' }}>{selectedReportCard.total.percent}%</td>
                      <td style={{ textAlign: 'center', padding: '0.5rem' }}>{selectedReportCard.total.grade}</td>
                      <td style={{ textAlign: 'center', padding: '0.5rem' }}>{selectedReportCard.total.grade_point}</td>
                      <td style={{ textAlign: 'center', padding: '0.5rem' }}>
                        <span style={{ color: selectedReportCard.result === 'PASS' ? 'var(--success)' : 'var(--danger)' }}>
                          {selectedReportCard.result}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginTop: '1.5rem', fontSize: '0.85rem', borderTop: '1px dashed #ccc', paddingTop: '1rem' }}>
                  <div>
                    <p><strong>Rank in Class:</strong> {selectedReportCard.total.rank || 'N/A'}</p>
                  </div>
                  <div>
                    <p><strong>Attendance:</strong> {selectedReportCard.attendance_percent !== null ? `${selectedReportCard.attendance_percent}%` : 'N/A'}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p><strong>Overall Result:</strong> <span style={{ fontWeight: 'bold', color: selectedReportCard.result === 'PASS' ? 'var(--success)' : 'var(--danger)' }}>{selectedReportCard.result}</span></p>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3rem', fontSize: '0.75rem', color: '#555' }}>
                  <div style={{ borderTop: '1px solid #000', width: '140px', textAlign: 'center', paddingTop: '0.25rem' }}>Class Teacher</div>
                  <div style={{ borderTop: '1px solid #000', width: '140px', textAlign: 'center', paddingTop: '0.25rem' }}>Controller of Exams</div>
                  <div style={{ borderTop: '1px solid #000', width: '140px', textAlign: 'center', paddingTop: '0.25rem' }}>Principal</div>
                </div>
              </div>
            ) : <p style={{ textAlign: 'center', padding: '2rem' }}>No report card data loaded</p>}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '2rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }} className="no-print">
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
        <div className="modal-overlay no-print" onClick={() => { setShowReceiptModal(false); setSelectedReceipt(null); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.45)', zIndex: 1000, padding: '1rem' }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ backgroundColor: '#ffffff', borderRadius: 'var(--radius-lg)', maxWidth: '750px', width: '90%', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Fee Payment Receipt</h3>
              <button onClick={() => { setShowReceiptModal(false); setSelectedReceipt(null); }} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
            </div>

            {loadingReceipt ? (
              <p style={{ textAlign: 'center', padding: '2rem' }}>Loading receipt information...</p>
            ) : selectedReceipt ? (
              <div className="receipt-print-container" style={{ padding: '1.5rem', fontFamily: 'Courier New, monospace', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#fff', color: '#000' }}>
                <div style={{ textAlign: 'center', borderBottom: '2px dashed #cbd5e1', paddingBottom: '1rem', marginBottom: '1rem' }}>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 'bold', margin: 0, textTransform: 'uppercase' }}>{selectedReceipt.institution_name}</h2>
                  <p style={{ margin: '0.25rem 0 0 0', color: '#475569', fontSize: '0.8rem' }}>{selectedReceipt.institution_address || 'Education Campus Road, IN'}</p>
                  <h3 style={{ fontSize: '1.1rem', letterSpacing: '0.05em', marginTop: '0.75rem', textDecoration: 'underline' }}>FEES PAYMENT RECEIPT</h3>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem', fontSize: '0.85rem', lineHeight: '1.5' }}>
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

                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2rem', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px dashed #cbd5e1', borderTop: '2px dashed #cbd5e1' }}>
                      <th style={{ textAlign: 'left', padding: '0.5rem 0' }}>FEE DESCRIPTION</th>
                      <th style={{ textAlign: 'right', padding: '0.5rem 0' }}>TOTAL DUE</th>
                      <th style={{ textAlign: 'right', padding: '0.5rem 0' }}>PAID AMOUNT</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '2px dashed #e2e8f0' }}>
                      <td style={{ padding: '0.75rem 0' }}>{selectedReceipt.fee_type} Payment ({selectedReceipt.payment_method})</td>
                      <td style={{ textAlign: 'right', padding: '0.75rem 0' }}>₹{selectedReceipt.total_amount.toLocaleString('en-IN')}</td>
                      <td style={{ textAlign: 'right', padding: '0.75rem 0', fontWeight: 'bold' }}>₹{selectedReceipt.paid_amount.toLocaleString('en-IN')}</td>
                    </tr>
                  </tbody>
                </table>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: '0.85rem' }}>
                  <div>
                    <div><strong>Payment Method:</strong> {selectedReceipt.payment_method}</div>
                    {selectedReceipt.transaction_reference && <div><strong>Txn Reference:</strong> {selectedReceipt.transaction_reference}</div>}
                    {selectedReceipt.remarks && <div><strong>Remarks:</strong> {selectedReceipt.remarks}</div>}
                  </div>
                  <div style={{ textAlign: 'right', width: '220px' }}>
                    <div style={{ borderBottom: '1px solid #cbd5e1', paddingBottom: '0.25rem', marginBottom: '0.25rem' }}>
                      <strong>Ledger Paid:</strong> ₹{selectedReceipt.total_paid.toLocaleString('en-IN')}
                    </div>
                    <div>
                      <strong>Ledger Due:</strong> ₹{(selectedReceipt.total_amount - selectedReceipt.total_paid).toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>

                <div style={{ borderTop: '2px dashed #cbd5e1', marginTop: '2rem', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#475569' }}>
                  <div>* Computer generated receipt. No physical signature required.</div>
                  <div>Authorized Signatory</div>
                </div>
              </div>
            ) : <p style={{ textAlign: 'center', padding: '2rem' }}>No receipt details loaded</p>}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '2rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }} className="no-print">
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
        <div className="modal-overlay no-print" onClick={() => setShowPaymentModal(false)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.45)', zIndex: 1000, padding: '1rem' }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ backgroundColor: '#ffffff', borderRadius: 'var(--radius-lg)', maxWidth: '550px', width: '90%', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Online Fee Checkout</h3>
              <button onClick={() => { setShowPaymentModal(false); setPaymentSuccess(null); }} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
            </div>

            {paymentSuccess ? (
              <div style={{ textAlign: 'center', padding: '1.5rem 0.5rem' }}>
                <div style={{
                  width: '72px', height: '72px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 1.5rem', fontSize: '2rem', color: 'white',
                  boxShadow: '0 8px 24px rgba(16,185,129,0.3)'
                }}>✓</div>
                <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.35rem', fontWeight: 800 }}>Payment Successful!</h3>
                <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
                  Your payment has been processed and recorded.
                </p>
                <div style={{ background: 'var(--bg-main)', borderRadius: 'var(--radius-sm)', padding: '1rem', marginBottom: '2rem' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Receipt Number</div>
                  <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--primary)', letterSpacing: '0.05em' }}>
                    {paymentSuccess.receiptNumber}
                  </div>
                </div>
                <button className="btn btn-primary" style={{ width: '100%' }}
                  onClick={() => { setShowPaymentModal(false); setPaymentSuccess(null); setSelectedFeeRecord(null); }}>
                  Done
                </button>
              </div>
            ) : (
              <>
                <div style={{ backgroundColor: 'var(--bg-main)', padding: '1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
                  <div><strong>Fee Component:</strong> {selectedFeeRecord.fee_type}</div>
                  <div><strong>Dues Outstanding:</strong> ₹{(selectedFeeRecord.total_amount - selectedFeeRecord.paid_amount).toLocaleString('en-IN')}</div>
                </div>

                <div className="page-tabs" style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.5rem', background: '#f1f5f9', padding: '0.25rem', borderRadius: 'var(--radius-full)', width: '100%' }}>
                  <button type="button" className={`page-tab ${paymentMethod === 'UPI' ? 'active' : ''}`} style={{ flex: 1 }} onClick={() => setPaymentMethod('UPI')}>
                    UPI QR Code
                  </button>
                  <button type="button" className={`page-tab ${paymentMethod === 'Card' ? 'active' : ''}`} style={{ flex: 1 }} onClick={() => setPaymentMethod('Card')}>
                    Debit / Credit Card
                  </button>
                </div>

                {paymentMethod === 'UPI' ? (
                  <div style={{ textAlign: 'center', padding: '1rem' }}>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                      Scan the secure UPI QR Code using your banking app (GPay, PhonePe, BHIM, etc.) to pay.
                    </p>
                    
                    <div style={{ margin: '1.5rem auto', padding: '1rem', width: '200px', height: '200px', border: '2px solid var(--border)', borderRadius: '12px', background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                      {/* Simulated QR Code Graphic */}
                      <div style={{ width: '160px', height: '160px', backgroundImage: 'radial-gradient(var(--text-main) 60%, transparent 60%)', backgroundSize: '12px 12px', opacity: simulatingUpiSuccess ? 0.15 : 0.85 }} />
                      <Smartphone size={32} style={{ position: 'absolute', color: 'var(--primary)' }} />
                      {simulatingUpiSuccess && (
                        <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                          <div className="spinner" style={{ border: '4px solid rgba(99, 102, 241, 0.1)', borderTop: '4px solid var(--primary)', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite' }} />
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)' }}>Verifying Payment...</span>
                        </div>
                      )}
                    </div>

                    <div style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                      QR Code expires in: <span style={{ color: 'var(--danger)', fontWeight: 800 }}>{upiTimer}s</span>
                    </div>

                    <div style={{ marginTop: '2rem' }}>
                      <button 
                        type="button" 
                        className="btn btn-primary" 
                        style={{ width: '100%' }}
                        onClick={triggerSimulateScan}
                        disabled={submittingPayment}
                      >
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

                    <div className="form-group" style={{ marginTop: '1rem' }}>
                      <label>Card Number</label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type="text"
                          maxLength={19}
                          placeholder="4111 2222 3333 4444"
                          value={cardNumber}
                          onChange={e => setCardNumber(e.target.value.replace(/\s?/g, '').replace(/(\d{4})/g, '$1 ').trim())}
                          required
                        />
                        <CreditCard size={18} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
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

                    <div style={{ marginTop: '2rem' }}>
                      <button 
                        type="submit" 
                        className="btn btn-primary" 
                        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                        disabled={submittingPayment}
                      >
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
