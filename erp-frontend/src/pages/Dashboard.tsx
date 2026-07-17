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
  Users, BookOpen, Clock, TrendingUp, LogOut, Award, Megaphone, Bell, Calendar, 
  IndianRupee, AlertTriangle, CheckCircle, AlertCircle, FileSpreadsheet, Printer, 
  Eye, Download, ArrowRight, CreditCard, Smartphone, Check, HelpCircle, 
  Plus, CheckSquare, Settings, Briefcase, FileText
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { subscribeToPushNotifications } from '../services/pushNotification';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  // Dashboard data states
  const [stats, setStats] = useState<any>(null);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPushBanner, setShowPushBanner] = useState(false);
  
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

  // Checklist Interactive state
  const [checkedTasks, setCheckedTasks] = useState<Record<string, boolean>>({});

  const handleTaskToggle = (taskId: string) => {
    setCheckedTasks(prev => ({
      ...prev,
      [taskId]: !prev[taskId]
    }));
  };

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
    // Show push banner only if permission not yet decided and not previously dismissed
    if ('Notification' in window && Notification.permission === 'default') {
      const dismissed = sessionStorage.getItem('push_banner_dismissed');
      if (!dismissed) {
        setShowPushBanner(true);
      }
    }
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

  const getPortalRoleLabel = () => {
    if (stats?.role === 'admin') return 'Administrator';
    if (stats?.role === 'teacher') return 'Teaching Faculty';
    if (stats?.role === 'student') return 'Student Portal';
    if (stats?.role === 'parent') return 'Parent/Guardian Portal';
    if (stats?.role === 'accountant') return 'Accountant Portal';
    return user?.role || 'User';
  };

  // Render Action Center Checklist dynamically per role
  const renderActionCenterChecklist = () => {
    const role = stats?.role;
    let tasks: Array<{ id: string; text: string; link: string }> = [];

    if (role === 'admin') {
      tasks = [
        { id: 'admin_assign', text: 'Confirm master Subject Assignments config', link: '/academic-setup?tab=assignments' },
        { id: 'admin_leaves', text: 'Approve pending faculty leave applications', link: '/leave/approvals' },
        { id: 'admin_payroll', text: 'Initiate monthly staff payroll calculations', link: '/finance?tab=payroll' },
        { id: 'admin_fees', text: 'Send fee payment reminders to defaulters', link: '/reports?tab=fees' }
      ];
    } else if (role === 'teacher') {
      tasks = [
        { id: 'teacher_att', text: 'Take student attendance for today\'s classes', link: '/attendance' },
        { id: 'teacher_lesson', text: 'Update lesson plans & syllabus coverage logs', link: '/subjects' },
        { id: 'teacher_marks', text: 'Submit grading marks for recent subject exams', link: '/exams' }
      ];
    } else if (role === 'student' || role === 'parent') {
      tasks = [
        { id: 'student_fees', text: 'Clear pending tuition fee balances online', link: '/finance?tab=collection' },
        { id: 'student_hw', text: 'Submit pending homework tasks', link: '/homework' },
        { id: 'student_report', text: 'Check recently released exam report cards', link: '/reports' }
      ];
    } else if (role === 'accountant') {
      tasks = [
        { id: 'account_verify', text: 'Verify pending online fee receipts', link: '/finance?tab=collection' },
        { id: 'account_expense', text: 'Review operational expenditures ledger', link: '/finance?tab=expenses' },
        { id: 'account_payroll', text: 'Audit finalized staff payslip releases', link: '/finance?tab=payroll' }
      ];
    }

    if (tasks.length === 0) return null;

    return (
      <div className="card dashboard-checklist-card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <CheckSquare size={16} /> Action Center Task Checklist
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {tasks.map(task => {
            const isChecked = !!checkedTasks[task.id];
            return (
              <div 
                key={task.id} 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  padding: '0.5rem 0.75rem',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  background: isChecked ? 'var(--bg-subtle)' : 'var(--bg-card)',
                  opacity: isChecked ? 0.7 : 1,
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input 
                    type="checkbox" 
                    checked={isChecked} 
                    onChange={() => handleTaskToggle(task.id)}
                    style={{ cursor: 'pointer', width: '15px', height: '15px' }}
                  />
                  <span style={{ textDecoration: isChecked ? 'line-through' : 'none', fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-main)' }}>
                    {task.text}
                  </span>
                </div>
                <button 
                  className="btn btn-sm btn-outline" 
                  onClick={() => navigate(task.link)}
                  style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', height: 'auto' }}
                >
                  Start Task &rarr;
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Render quick actions per role
  const renderQuickActions = () => {
    const role = stats?.role;
    
    if (role === 'admin') {
      return (
        <div className="card quick-actions-panel" style={{ padding: '0.75rem 1.25rem', marginBottom: '1.5rem', background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-secondary)', marginRight: '0.5rem', letterSpacing: '0.05em' }}>Actions:</span>
          <button className="btn btn-secondary" onClick={() => navigate('/users')} style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', height: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
            <Plus size={13} /> Add Student / Teacher
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/academic-setup?tab=assignments')} style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', height: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
            <Settings size={13} /> Subject Allocations
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/finance?tab=collection')} style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', height: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
            <IndianRupee size={13} /> Collect School Fee
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/communication?tab=announcements')} style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', height: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
            <Megaphone size={13} /> Broadcast Circular
          </button>
        </div>
      );
    }

    if (role === 'teacher') {
      return (
        <div className="card quick-actions-panel" style={{ padding: '0.75rem 1.25rem', marginBottom: '1.5rem', background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-secondary)', marginRight: '0.5rem', letterSpacing: '0.05em' }}>Actions:</span>
          <button className="btn btn-secondary" onClick={() => navigate('/attendance')} style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', height: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
            <Check size={13} /> Mark Daily Attendance
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/exams')} style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', height: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
            <Award size={13} /> Submit Exam Marks
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/leave/my')} style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', height: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
            <Plus size={13} /> Apply Leave Request
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/subjects')} style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', height: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
            <BookOpen size={13} /> Syllabus Lesson Plans
          </button>
        </div>
      );
    }

    if (role === 'student' || role === 'parent') {
      return (
        <div className="card quick-actions-panel" style={{ padding: '0.75rem 1.25rem', marginBottom: '1.5rem', background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-secondary)', marginRight: '0.5rem', letterSpacing: '0.05em' }}>Actions:</span>
          <button className="btn btn-secondary" onClick={() => navigate('/finance?tab=collection')} style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', height: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
            <CreditCard size={13} /> Make Fee Payment
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/timetable')} style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', height: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
            <Calendar size={13} /> View Time Table
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/homework')} style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', height: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
            <FileText size={13} /> Check Homework Task
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/leave/my')} style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', height: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
            <Plus size={13} /> Apply Leaves
          </button>
        </div>
      );
    }

    return null;
  };

  // Render role-specific stats Summary Card
  const renderSummaryCard = () => {
    const role = stats?.role;
    
    if (role === 'admin') {
      return (
        <div className="card summary-card" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.5rem', background: 'var(--bg-card)', borderLeft: '4px solid var(--primary)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: '1.15rem', fontWeight: '700', color: 'var(--text-main)' }}>Today's School Summary</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                Academic Session: 2026-27 &bull; Live School Roster
              </div>
            </div>
            <div style={{ display: 'flex', gap: '2.5rem', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700', letterSpacing: '0.05em' }}>Total Students</div>
                <div style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-main)' }}>{stats?.totalStudents || 0}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700', letterSpacing: '0.05em' }}>Faculty Staff</div>
                <div style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-main)' }}>{stats?.totalTeachers || 0}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700', letterSpacing: '0.05em' }}>Live Attendance Rate</div>
                <div style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--success)' }}>{stats?.overallAttendance || 100}%</div>
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700', letterSpacing: '0.05em' }}>Upcoming Exams</div>
                <div style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--primary)' }}>{stats?.upcomingExams || 0} Scheduled</div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (role === 'teacher') {
      return (
        <div className="card summary-card" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.5rem', background: 'var(--bg-card)', borderLeft: '4px solid var(--primary)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: '1.15rem', fontWeight: '700', color: 'var(--text-main)' }}>Teacher Roster Overview</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                Academic Session: 2026-27 &bull; Live Workload Allocation
              </div>
            </div>
            <div style={{ display: 'flex', gap: '2.5rem', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700', letterSpacing: '0.05em' }}>Classes Scheduled Today</div>
                <div style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-main)' }}>{stats?.classesToday || 0} Lectures</div>
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700', letterSpacing: '0.05em' }}>Assigned Students</div>
                <div style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-main)' }}>{stats?.totalStudents || 0}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700', letterSpacing: '0.05em' }}>Grades Pending Submission</div>
                <div style={{ fontSize: '1.15rem', fontWeight: '800', color: stats?.pendingMarks > 0 ? 'var(--warning)' : 'var(--success)' }}>
                  {stats?.pendingMarks || 0} Subject Exam
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (role === 'student' || role === 'parent') {
      const parentNameStr = role === 'parent' ? `${stats?.children?.[selectedChildIndex]?.first_name || 'Child'}'s Portal` : 'Student Portal';
      return (
        <div className="card summary-card" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.5rem', background: 'var(--bg-card)', borderLeft: '4px solid var(--primary)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: '1.15rem', fontWeight: '700', color: 'var(--text-main)' }}>{parentNameStr} Summary</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                Academic Session: 2026-27 &bull; Real-time Progress Tracking
              </div>
            </div>
            <div style={{ display: 'flex', gap: '2.5rem', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700', letterSpacing: '0.05em' }}>Attendance Rate</div>
                <div style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--success)' }}>{stats?.attendance || 100}%</div>
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700', letterSpacing: '0.05em' }}>Outstanding Fees Dues</div>
                <div style={{ fontSize: '1.15rem', fontWeight: '800', color: stats?.fees?.due > 0 ? 'var(--danger)' : 'var(--success)' }}>
                  ₹{(stats?.fees?.due || 0).toLocaleString()}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700', letterSpacing: '0.05em' }}>Assigned Homework Tasks</div>
                <div style={{ fontSize: '1.15rem', fontWeight: '800', color: homework.length > 0 ? 'var(--warning)' : 'var(--success)' }}>
                  {homework.length} Pending
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <Layout>
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <h1>Dashboard Action Center</h1>
        <button className="btn btn-outline" onClick={logout}>
          <LogOut size={18} /> Logout
        </button>
      </div>

      {/* Push Notification Onboarding Banner */}
      {showPushBanner && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          padding: '0.85rem 1.25rem',
          marginBottom: '1rem',
          background: 'linear-gradient(135deg, #1a237e 0%, #283593 100%)',
          borderRadius: '10px',
          color: '#fff',
          boxShadow: '0 4px 12px rgba(26,35,126,0.3)',
        }}>
          <Bell size={22} style={{ flexShrink: 0, color: '#fbbf24' }} />
          <div style={{ flexGrow: 1 }}>
            <strong style={{ fontSize: '0.9rem' }}>Stay in the loop — Enable Notifications</strong>
            <div style={{ fontSize: '0.75rem', opacity: 0.85, marginTop: '0.15rem' }}>
              Get instant alerts for attendance, exam results, fee reminders and more.
            </div>
          </div>
          <button
            className="btn"
            style={{ background: '#fbbf24', color: '#1a1a1a', fontWeight: '700', fontSize: '0.8rem', padding: '0.4rem 1rem', borderRadius: '6px', flexShrink: 0, height: 'auto' }}
            onClick={async () => {
              await subscribeToPushNotifications();
              setShowPushBanner(false);
              sessionStorage.setItem('push_banner_dismissed', '1');
            }}
          >
            Enable
          </button>
          <button
            style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: '1.1rem', padding: '0 0.25rem', lineHeight: 1 }}
            title="Dismiss"
            onClick={() => {
              setShowPushBanner(false);
              sessionStorage.setItem('push_banner_dismissed', '1');
            }}
          >
            ×
          </button>
        </div>
      )}

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
          {/* Welcome Intro */}
          <div className="welcome-section card dashboard-welcome-section" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
            <h2>Welcome back, {user?.name || user?.email}!</h2>
            <p>You are logged into the <strong>{getPortalRoleLabel()}</strong> command panel. Here are your key action points.</p>
          </div>

          {/* Top Status Summary Card */}
          {renderSummaryCard()}

          {/* Role-based Quick Actions */}
          {renderQuickActions()}

          {/* Interactive Checklist Center */}
          {renderActionCenterChecklist()}

          {/* Render Core Dashboard Graphs & Statistics */}
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
          <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginTop: '1.5rem' }}>
            {/* Announcements Card */}
            <div className="card dashboard-card-full">
              <div className="card-header-icon" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <Megaphone size={18} className="header-icon dashboard-announcement-icon" />
                <h3>Latest Notice Board Announcements</h3>
              </div>
              {announcements.length === 0 ? (
                <p className="no-data">No active announcements for your role.</p>
              ) : (
                <div className="announcements-list">
                  {announcements.slice(0, 5).map((ann: any) => (
                    <div key={ann.id} className="announcement-item" style={{ padding: '0.75rem 1rem' }}>
                      <div className="ann-title" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                        <h4 style={{ fontWeight: '700' }}>{ann.title}</h4>
                        <span className="ann-date" style={{ color: 'var(--text-muted)' }}>{new Date(ann.created_at).toLocaleDateString()}</span>
                      </div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{ann.content}</p>
                    </div>
                  ))}
                  {announcements.length > 5 && (
                    <Link to="/communication?tab=announcements" className="view-all-link" style={{ display: 'block', marginTop: '0.75rem', fontSize: '0.85rem', fontWeight: '700' }}>
                      View all notice circulars &rarr;
                    </Link>
                  )}
                </div>
              )}
            </div>

            {/* Notifications Card */}
            <div className="card dashboard-card-full">
              <div className="card-header-icon" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <Bell size={18} className="header-icon dashboard-notification-icon" />
                <h3>Recent System Notifications</h3>
              </div>
              {notifications.length === 0 ? (
                <p className="no-data">No unread notifications.</p>
              ) : (
                <div className="notifications-list">
                  {notifications.slice(0, 5).map((notif: any) => (
                    <div key={notif.id} className={`notification-item ${notif.is_read ? 'read' : 'unread'}`} style={{ padding: '0.75rem 1rem', opacity: notif.is_read ? 0.6 : 1 }}>
                      <div className="notif-content" style={{ fontSize: '0.85rem' }}>
                        <strong style={{ fontWeight: '700' }}>{notif.title}</strong>
                        <p style={{ color: 'var(--text-secondary)', marginTop: '0.15rem' }}>{notif.message}</p>
                      </div>
                      <span className="notif-date" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(notif.created_at).toLocaleDateString()}</span>
                    </div>
                  ))}
                  {notifications.length > 5 && (
                    <Link to="/communication?tab=notifications" className="view-all-link" style={{ display: 'block', marginTop: '0.75rem', fontSize: '0.85rem', fontWeight: '700' }}>
                      View all system alerts &rarr;
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
        <div className="modal-overlay no-print dashboard-modal-overlay" onClick={() => { setShowReportCardModal(false); setSelectedReportCard(null); }} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.40)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="modal-content dashboard-modal-content" onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-card)', padding: '1.5rem', width: '680px', maxHeight: '90vh', overflowY: 'auto', borderRadius: 'var(--radius-sm)' }}>
            <div className="dashboard-row-9" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 className="dashboard-title-10" style={{ fontSize: '1.05rem', fontWeight: '700' }}>Student Academic Report Card</h3>
              <button onClick={() => { setShowReportCardModal(false); setSelectedReportCard(null); }} className="dashboard-btn-11" style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.25rem' }}>✕</button>
            </div>
            
            {loadingReportCard ? (
              <p className="dashboard-text-12">Building report card layout...</p>
            ) : selectedReportCard ? (
              <div id="printable-report-card" className="dashboard-div-13">
                <div className="dashboard-div-14" style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                  <h2 className="dashboard-title-15" style={{ fontSize: '1.3rem', fontWeight: '800' }}>Academic Report Card</h2>
                  <h3 className="dashboard-title-16" style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>{selectedReportCard.exam.institution_name || 'Greenwood High School'}</h3>
                </div>

                <div className="dashboard-grid-17" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
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

                <table className="table dashboard-table" style={{ width: '100%', fontSize: '0.85rem' }}>
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
                    <tr className="dashboard-tr-44" style={{ fontWeight: '700' }}>
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

                <div className="dashboard-grid-52" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginTop: '1rem', fontSize: '0.85rem' }}>
                  <div>
                    <p><strong>Rank in Class:</strong> {selectedReportCard.total.rank || 'N/A'}</p>
                  </div>
                  <div>
                    <p><strong>Attendance:</strong> {selectedReportCard.attendance_percent !== null ? `${selectedReportCard.attendance_percent}%` : 'N/A'}</p>
                  </div>
                  <div className="dashboard-div-53" style={{ textAlign: 'right' }}>
                    <p><strong>Overall Result:</strong> <span style={{ fontWeight: 'bold', color: selectedReportCard.result === 'PASS' ? 'var(--success)' : 'var(--danger)' }}>{selectedReportCard.result}</span></p>
                  </div>
                </div>

                <div className="dashboard-row-54" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2.5rem', borderTop: '1px dashed var(--border)', paddingTop: '1.25rem', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                  <div className="dashboard-div-55" style={{ borderTop: '1px solid var(--border)', width: '120px', padding: '0.25rem 0' }}>Class Teacher</div>
                  <div className="dashboard-div-56" style={{ borderTop: '1px solid var(--border)', width: '120px', padding: '0.25rem 0' }}>Controller of Exams</div>
                  <div className="dashboard-div-57" style={{ borderTop: '1px solid var(--border)', width: '120px', padding: '0.25rem 0' }}>Principal</div>
                </div>
              </div>
            ) : <p className="dashboard-text-58">No report card data loaded</p>}

            <div className="no-print dashboard-no-print" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
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
        <div className="modal-overlay no-print dashboard-modal-overlay" onClick={() => { setShowReceiptModal(false); setSelectedReceipt(null); }} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.40)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="modal-content dashboard-modal-content" onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-card)', padding: '1.5rem', width: '620px', maxHeight: '90vh', overflowY: 'auto', borderRadius: 'var(--radius-sm)' }}>
            <div className="dashboard-row-62" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 className="dashboard-title-63" style={{ fontSize: '1.05rem', fontWeight: '700' }}>Fee Payment Receipt</h3>
              <button onClick={() => { setShowReceiptModal(false); setSelectedReceipt(null); }} className="dashboard-btn-64" style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.25rem' }}>✕</button>
            </div>

            {loadingReceipt ? (
              <p className="dashboard-text-65">Loading receipt information...</p>
            ) : selectedReceipt ? (
              <div className="receipt-print-container dashboard-receipt-print-container" style={{ padding: '0.5rem' }}>
                <div className="dashboard-div-67" style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                  <h2 className="dashboard-title-68" style={{ fontSize: '1.25rem', fontWeight: '800' }}>{selectedReceipt.institution_name}</h2>
                  <p className="dashboard-text-69" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{selectedReceipt.institution_address || 'Education Campus Road, IN'}</p>
                  <h3 className="dashboard-title-70" style={{ fontSize: '0.95rem', fontWeight: '700', marginTop: '0.25rem', textTransform: 'uppercase', textDecoration: 'underline' }}>FEES PAYMENT RECEIPT</h3>
                </div>

                <div className="dashboard-grid-71" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
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

                <table className="dashboard-table-72" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', marginBottom: '1rem' }}>
                  <thead>
                    <tr className="dashboard-tr-73" style={{ borderBottom: '1.5px solid var(--border)' }}>
                      <th className="dashboard-th-74" style={{ textAlign: 'left', padding: '0.35rem 0' }}>FEE DESCRIPTION</th>
                      <th className="dashboard-th-75" style={{ textAlign: 'right', padding: '0.35rem 0' }}>TOTAL DUE</th>
                      <th className="dashboard-th-76" style={{ textAlign: 'right', padding: '0.35rem 0' }}>PAID AMOUNT</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="dashboard-tr-77" style={{ borderBottom: '1px solid var(--border)' }}>
                      <td className="dashboard-td-78" style={{ padding: '0.5rem 0' }}>{selectedReceipt.fee_type} Payment ({selectedReceipt.payment_method})</td>
                      <td className="dashboard-td-79" style={{ textAlign: 'right', padding: '0.5rem 0' }}>₹{selectedReceipt.total_amount.toLocaleString('en-IN')}</td>
                      <td className="dashboard-td-80" style={{ textAlign: 'right', padding: '0.5rem 0', fontWeight: '700' }}>₹{selectedReceipt.paid_amount.toLocaleString('en-IN')}</td>
                    </tr>
                  </tbody>
                </table>

                <div className="dashboard-row-81" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                  <div>
                    <div><strong>Payment Method:</strong> {selectedReceipt.payment_method}</div>
                    {selectedReceipt.transaction_reference && <div><strong>Txn Reference:</strong> {selectedReceipt.transaction_reference}</div>}
                    {selectedReceipt.remarks && <div><strong>Remarks:</strong> {selectedReceipt.remarks}</div>}
                  </div>
                  <div className="dashboard-div-82" style={{ textAlign: 'right' }}>
                    <div className="dashboard-div-83" style={{ fontSize: '0.9rem', fontWeight: '700' }}>
                      <strong>Ledger Paid:</strong> ₹{selectedReceipt.total_paid.toLocaleString('en-IN')}
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      <strong>Ledger Due:</strong> ₹{(selectedReceipt.total_amount - selectedReceipt.total_paid).toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>

                <div className="dashboard-row-84" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', borderTop: '1px dashed var(--border)', paddingTop: '1rem' }}>
                  <div>* Computer generated receipt. No physical signature required.</div>
                  <div style={{ borderTop: '1px solid var(--border)', width: '120px', padding: '0.25rem 0', textAlign: 'center' }}>Authorized Signatory</div>
                </div>
              </div>
            ) : <p className="dashboard-text-85">No receipt details loaded</p>}

            <div className="no-print dashboard-no-print" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
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
        <div className="modal-overlay no-print dashboard-modal-overlay" onClick={() => setShowPaymentModal(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.40)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="modal-content dashboard-modal-content" onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-card)', padding: '1.5rem', width: '420px', borderRadius: 'var(--radius-sm)' }}>
            <div className="dashboard-row-89" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 className="dashboard-title-90" style={{ fontSize: '1.05rem', fontWeight: '700' }}>Online Fee Checkout</h3>
              <button onClick={() => { setShowPaymentModal(false); setPaymentSuccess(null); }} className="dashboard-btn-91" style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.25rem' }}>✕</button>
            </div>

            {paymentSuccess ? (
              <div className="dashboard-div-92" style={{ textAlign: 'center', padding: '1rem 0' }}>
                <div className="dashboard-row-93" style={{ width: '48px', height: '48px', background: 'var(--success-soft)', color: 'var(--success)', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: '800', marginBottom: '1rem' }}>✓</div>
                <h3 className="dashboard-title-94" style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.5rem' }}>Payment Successful!</h3>
                <p className="dashboard-text-95" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  Your payment has been processed and recorded.
                </p>
                <div className="dashboard-div-96" style={{ background: 'var(--bg-subtle)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem' }}>
                  <div className="dashboard-div-97" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Receipt Number</div>
                  <div className="dashboard-div-98" style={{ fontSize: '1.1rem', fontWeight: '800', marginTop: '0.25rem' }}>
                    {paymentSuccess.receiptNumber}
                  </div>
                </div>
                <button className="btn btn-primary dashboard-btn" style={{ width: '100%' }} onClick={() => { setShowPaymentModal(false); setPaymentSuccess(null); setSelectedFeeRecord(null); }}>
                  Done
                </button>
              </div>
            ) : (
              <>
                <div className="dashboard-div-100" style={{ background: 'var(--bg-subtle)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div><strong>Fee Component:</strong> {selectedFeeRecord.fee_type}</div>
                  <div><strong>Outstanding:</strong> ₹{(selectedFeeRecord.total_amount - selectedFeeRecord.paid_amount).toLocaleString()}</div>
                </div>

                <div className="page-tabs dashboard-page-tabs" style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border)', marginBottom: '1rem' }}>
                  <button type="button" className={`page-tab ${paymentMethod === 'UPI' ? 'active' : ''} dashboard-btn-102`} style={{ flex: 1, padding: '0.5rem 0', border: 'none', background: 'none', borderBottom: paymentMethod === 'UPI' ? '2px solid var(--primary)' : '2px solid transparent', color: paymentMethod === 'UPI' ? 'var(--primary)' : 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.85rem' }} onClick={() => setPaymentMethod('UPI')}>
                    UPI QR Code
                  </button>
                  <button type="button" className={`page-tab ${paymentMethod === 'Card' ? 'active' : ''} dashboard-btn-103`} style={{ flex: 1, padding: '0.5rem 0', border: 'none', background: 'none', borderBottom: paymentMethod === 'Card' ? '2px solid var(--primary)' : '2px solid transparent', color: paymentMethod === 'Card' ? 'var(--primary)' : 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.85rem' }} onClick={() => setPaymentMethod('Card')}>
                    Debit / Credit Card
                  </button>
                </div>

                {paymentMethod === 'UPI' ? (
                  <div className="dashboard-div-104" style={{ textAlign: 'center', padding: '0.5rem' }}>
                    <p className="dashboard-text-105" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                      Scan the secure UPI QR Code using your banking app (GPay, PhonePe, BHIM, etc.) to pay.
                    </p>
                    
                    <div className="dashboard-col-106" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', position: 'relative' }}>
                      <div style={{ width: '160px', height: '160px', backgroundImage: 'radial-gradient(var(--text-main) 60%, transparent 60%)', backgroundSize: '12px 12px', opacity: simulatingUpiSuccess ? 0.15 : 0.85 }} />
                      <Smartphone size={24} className="dashboard-Smartphone-107" style={{ position: 'absolute', top: '68px', color: 'var(--primary)' }} />
                      {simulatingUpiSuccess && (
                        <div className="dashboard-col-108" style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.7)', gap: '0.5rem' }}>
                          <div className="spinner dashboard-spinner" style={{ width: '24px', height: '24px', border: '2px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                          <span className="dashboard-span-110" style={{ fontSize: '0.8rem', fontWeight: '700' }}>Verifying Payment...</span>
                        </div>
                      )}
                    </div>

                    <div className="dashboard-div-111" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.75rem', marginBottom: '1.25rem' }}>
                      QR Code expires in: <span className="dashboard-span-112" style={{ fontWeight: '700', color: 'var(--danger)' }}>{upiTimer}s</span>
                    </div>

                    <div className="dashboard-div-113">
                      <button type="button" className="btn btn-primary dashboard-btn" style={{ width: '100%' }} onClick={triggerSimulateScan} disabled={submittingPayment}>
                        {submittingPayment ? 'Processing Approval...' : 'Simulate UPI Scanner App Approval'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleCardPaymentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div className="form-group">
                      <label style={{ fontSize: '0.8rem' }}>Cardholder Name</label>
                      <input
                        type="text"
                        placeholder="John Doe"
                        value={cardName}
                        onChange={e => setCardName(e.target.value)}
                        className="input"
                        required
                      />
                    </div>

                    <div className="form-group dashboard-form-group">
                      <label style={{ fontSize: '0.8rem' }}>Card Number</label>
                      <div className="dashboard-div-116" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <input
                          type="text"
                          maxLength={19}
                          placeholder="4111 2222 3333 4444"
                          value={cardNumber}
                          onChange={e => setCardNumber(e.target.value.replace(/\s?/g, '').replace(/(\d{4})/g, '$1 ').trim())}
                          className="input"
                          style={{ width: '100%', paddingRight: '2.25rem' }}
                          required
                        />
                        <CreditCard size={16} className="dashboard-CreditCard-117" style={{ position: 'absolute', right: '0.75rem', color: 'var(--text-secondary)' }} />
                      </div>
                    </div>

                    <div className="dashboard-grid-118" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div className="form-group">
                        <label style={{ fontSize: '0.8rem' }}>Expiration Date</label>
                        <input
                          type="text"
                          maxLength={5}
                          placeholder="MM/YY"
                          value={cardExpiry}
                          onChange={e => setCardExpiry(e.target.value)}
                          className="input"
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label style={{ fontSize: '0.8rem' }}>CVV / CVC</label>
                        <input
                          type="password"
                          maxLength={3}
                          placeholder="123"
                          value={cardCVV}
                          onChange={e => setCardCVV(e.target.value)}
                          className="input"
                          required
                        />
                      </div>
                    </div>

                    <div className="dashboard-div-119" style={{ marginTop: '0.5rem' }}>
                      <button type="submit" className="btn btn-primary dashboard-btn" style={{ width: '100%' }} disabled={submittingPayment}>
                        {submittingPayment ? 'Authorizing...' : `Authorize Payment of ₹${Number(paymentAmount).toLocaleString('en-IN')}`}
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
