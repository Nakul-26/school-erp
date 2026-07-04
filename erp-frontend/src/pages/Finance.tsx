import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { PageGuidance } from '../components/PageGuidance';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { 
  Plus, Trash2, Calendar, BookOpen, Layers, IndianRupee,
  Search, CreditCard, Receipt, ArrowLeft, Check, User, Printer,
  BarChart3, Clock, AlertTriangle, TrendingUp, Users
} from 'lucide-react';

// --- INTERFACES ---
interface FeeStructureRow {
  id: string;
  academic_year_name: string;
  course_name: string;
  course_code: string;
  year_number: number;
  fee_type: string;
  amount: number;
}

interface StudentFeeSummaryRow {
  id: string;
  student_id: string;
  first_name: string;
  last_name: string;
  admission_number: string;
  roll_number: string | null;
  course_name: string;
  total_amount: number;
  paid_amount: number;
  status: string;
}

interface StudentFeeRecord {
  id: string;
  fee_type: string;
  total_amount: number;
  paid_amount: number;
  due_date: string | null;
  status: string;
  academic_year_name: string;
}

interface PaymentRecord {
  id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  transaction_reference: string | null;
  remarks: string | null;
  fee_type: string;
  receipt_number: string | null;
}

interface SummaryStats {
  totalCollected: number;
  totalPending: number;
  totalOverdue: number;
}

interface MonthlyRow {
  month: string;
  amount: number;
}

interface DefaulterRow {
  student_id: string;
  first_name: string;
  last_name: string;
  admission_number: string;
  roll_number: string | null;
  course_name: string;
  pending_amount: number;
}

export default function Finance() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryTab = searchParams.get('tab');
  
  const [activeTab, setActiveTab] = useState<'students' | 'plans' | 'reports'>(
    (queryTab === 'plans' || queryTab === 'reports') ? queryTab : 'students'
  );

  // Sync tab with search params
  const handleTabChange = (tab: 'students' | 'plans' | 'reports') => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  // --- COMMON METADATA STATES ---
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);

  // --- TAB 1: STUDENT FEES STATES ---
  const [feeView, setFeeView] = useState<'list' | 'ledger' | 'receipt'>('list');
  const [students, setStudents] = useState<StudentFeeSummaryRow[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentsLoading, setStudentsLoading] = useState(true);

  // Student Ledger & Payments
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [ledger, setLedger] = useState<StudentFeeRecord[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  // Collect Payment Form State
  const [showPayModal, setShowPayModal] = useState(false);
  const [payForm, setPayForm] = useState({
    student_fee_record_id: '',
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'UPI' as any,
    transaction_reference: '',
    remarks: ''
  });
  const [paying, setPaying] = useState(false);

  // Receipt Print State
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [receiptLoading, setReceiptLoading] = useState(false);

  // Concession & Installment States
  const [showConcessionModal, setShowConcessionModal] = useState(false);
  const [showInstallmentModal, setShowInstallmentModal] = useState(false);
  const [selectedFeeRecord, setSelectedFeeRecord] = useState<any | null>(null);
  const [concessions, setConcessions] = useState<any[]>([]);
  const [installments, setInstallments] = useState<any[]>([]);
  const [concessionForm, setConcessionForm] = useState({
    concession_type: 'Scholarship',
    discount_type: 'percent',
    discount_value: '',
    reason: ''
  });
  const [installmentCount, setInstallmentCount] = useState<number>(2);
  const [dynamicInstallments, setDynamicInstallments] = useState<Array<{ due_date: string; amount: number }>>([]);

  // --- TAB 2: FEE PLANS (STRUCTURES) STATES ---
  const [plans, setPlans] = useState<FeeStructureRow[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [plansSaving, setPlansSaving] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [planForm, setPlanForm] = useState({
    academic_year_id: '',
    course_id: '',
    year_number: 1,
    fee_type: 'Tuition Fee' as any,
    amount: ''
  });

  // --- TAB 3: REPORTS STATES ---
  const [reportStats, setReportStats] = useState<SummaryStats>({
    totalCollected: 0,
    totalPending: 0,
    totalOverdue: 0
  });
  const [reportMonthly, setReportMonthly] = useState<MonthlyRow[]>([]);
  const [reportDefaulters, setReportDefaulters] = useState<DefaulterRow[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);

  // Roles verification
  const userRoles = user?.roles || (user?.role ? [user.role] : []);
  const isFinanceAdmin = userRoles.some(r => ['super_admin', 'Super Admin', 'admin', 'Admin', 'Principal', 'Accountant', 'accountant'].includes(r));

  // --- LIFECYCLE EFFECTS ---
  useEffect(() => {
    fetchCommonMetadata();
  }, []);

  useEffect(() => {
    if (activeTab === 'students' && feeView === 'list') {
      fetchStudentRecords();
    } else if (activeTab === 'plans') {
      fetchPlans();
    } else if (activeTab === 'reports') {
      fetchReportData();
    }
  }, [activeTab, feeView]);

  const fetchCommonMetadata = async () => {
    try {
      const [yearsData, coursesData] = await Promise.all([
        api.get('/academic-years'),
        api.get('/programs')
      ]);
      setAcademicYears(yearsData || []);
      setCourses(coursesData || []);
      
      if (yearsData.length > 0) {
        setPlanForm(f => ({ ...f, academic_year_id: yearsData[0].id }));
      }
      if (coursesData.length > 0) {
        setPlanForm(f => ({ ...f, course_id: coursesData[0].id }));
      }
    } catch (err) {
      console.error('Error fetching metadata:', err);
    }
  };

  // --- STUDENT FEES FUNCTIONS ---
  const fetchStudentRecords = async (searchTerm = '') => {
    try {
      setStudentsLoading(true);
      const data = await api.get(`/fees/student-records${searchTerm ? `?search=${searchTerm}` : ''}`);
      
      const aggregated: Record<string, StudentFeeSummaryRow> = {};
      data.forEach((row: any) => {
        if (!aggregated[row.student_id]) {
          aggregated[row.student_id] = {
            id: row.id,
            student_id: row.student_id,
            first_name: row.first_name,
            last_name: row.last_name,
            admission_number: row.admission_number,
            roll_number: row.roll_number,
            course_name: row.course_name,
            total_amount: 0,
            paid_amount: 0,
            status: 'UNPAID'
          };
        }
        const current = aggregated[row.student_id];
        if (current) {
          current.total_amount += row.total_amount;
          current.paid_amount += row.paid_amount;
        }
      });

      Object.values(aggregated).forEach(student => {
        if (student.paid_amount >= student.total_amount) {
          student.status = 'PAID';
        } else if (student.paid_amount > 0) {
          student.status = 'PARTIALLY_PAID';
        } else {
          student.status = 'UNPAID';
        }
      });

      setStudents(Object.values(aggregated));
    } catch (err) {
      console.error(err);
    } finally {
      setStudentsLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchStudentRecords(studentSearch);
  };

  const handleOpenLedger = async (student: any) => {
    try {
      setLedgerLoading(true);
      setSelectedStudent(student);
      const [ledgerData, paymentsData] = await Promise.all([
        api.get(`/fees/ledger/${student.student_id}`),
        api.get(`/fees/payments?student_id=${student.student_id}`)
      ]);

      setLedger(ledgerData || []);
      setPayments(paymentsData || []);
      
      if (ledgerData && ledgerData.length > 0) {
        const unpaid = ledgerData.find((item: any) => item.status !== 'PAID');
        setPayForm(f => ({ 
          ...f, 
          student_fee_record_id: unpaid ? unpaid.id : ledgerData[0].id,
          amount: unpaid ? (unpaid.total_amount - unpaid.paid_amount).toString() : '0'
        }));
      }

      setFeeView('ledger');
    } catch (err) {
      alert('Error fetching student ledger');
    } finally {
      setLedgerLoading(false);
    }
  };

  const handleGenerateLedger = async () => {
    if (!selectedStudent) return;
    try {
      setLedgerLoading(true);
      const enrollments = await api.get('/enrollments');
      const studentEnrollment = enrollments.find((e: any) => e.student_id === selectedStudent.student_id);

      if (!studentEnrollment) {
        return alert('Student is not enrolled in any Course / Section. Enroll student first!');
      }

      await api.post('/fees/generate-ledger', {
        student_id: selectedStudent.student_id,
        academic_year_id: studentEnrollment.academic_year_id,
        course_id: studentEnrollment.course_id,
        year_number: studentEnrollment.semester ? Math.ceil(studentEnrollment.semester / 2) : 1
      });

      alert('Ledger generated successfully based on configured fee structures!');
      handleOpenLedger(selectedStudent);
    } catch (err: any) {
      alert(err.message || 'Error generating ledger');
    } finally {
      setLedgerLoading(false);
    }
  };

  const handleCollectPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payForm.amount || Number(payForm.amount) <= 0) {
      return alert('Enter a valid amount');
    }

    const selectedRecord = ledger.find(item => item.id === payForm.student_fee_record_id);
    if (!selectedRecord) return;

    const outstanding = selectedRecord.total_amount - selectedRecord.paid_amount;
    if (Number(payForm.amount) > outstanding) {
      return alert(`Payment amount cannot exceed outstanding balance of ₹${outstanding}`);
    }

    try {
      setPaying(true);
      await api.post('/fees/payments', {
        student_id: selectedStudent.student_id,
        student_fee_record_id: payForm.student_fee_record_id,
        amount: Number(payForm.amount),
        payment_date: payForm.payment_date,
        payment_method: payForm.payment_method,
        transaction_reference: payForm.transaction_reference,
        remarks: payForm.remarks
      });

      alert('Payment recorded successfully!');
      setShowPayModal(false);
      setPayForm({
        student_fee_record_id: '',
        amount: '',
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: 'UPI',
        transaction_reference: '',
        remarks: ''
      });
      handleOpenLedger(selectedStudent);
    } catch (err: any) {
      alert(err.message || 'Error collecting payment');
    } finally {
      setPaying(false);
    }
  };

  const handleOpenReceipt = async (payment: any) => {
    try {
      setReceiptLoading(true);
      let receipt = await api.get(`/fees/receipts/${payment.receipt_number}`);
      if (!receipt && payment.id) {
        receipt = await api.get(`/fees/receipts?payment_id=${payment.id}`);
      }
      setSelectedReceipt(receipt);
      setFeeView('receipt');
    } catch (err) {
      try {
        const receiptsList = await api.get('/fees/receipts');
        const match = receiptsList.find((r: any) => r.payment_id === payment.id);
        if (match) {
          const detail = await api.get(`/fees/receipts/${match.id}`);
          setSelectedReceipt(detail);
          setFeeView('receipt');
        } else {
          alert('Receipt not found');
        }
      } catch (e) {
        alert('Error fetching receipt details');
      }
    } finally {
      setReceiptLoading(false);
    }
  };

  const handleOpenConcessions = async (record: any) => {
    setSelectedFeeRecord(record);
    setShowConcessionModal(true);
    try {
      const data = await api.get(`/fees/records/${record.id}/concessions`);
      setConcessions(data || []);
    } catch (err) {
      console.error('Error fetching concessions:', err);
    }
  };

  const handleApplyConcession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFeeRecord) return;
    try {
      await api.post(`/fees/records/${selectedFeeRecord.id}/concession`, {
        student_id: selectedStudent.student_id,
        concession_type: concessionForm.concession_type,
        discount_type: concessionForm.discount_type,
        discount_value: Number(concessionForm.discount_value),
        reason: concessionForm.reason
      });
      alert('Concession applied successfully!');
      setConcessionForm({ concession_type: 'Scholarship', discount_type: 'percent', discount_value: '', reason: '' });
      
      const updatedLedger = await api.get(`/fees/ledger/${selectedStudent.student_id}`);
      setLedger(updatedLedger || []);
      const data = await api.get(`/fees/records/${selectedFeeRecord.id}/concessions`);
      setConcessions(data || []);
    } catch (err: any) {
      alert(err.message || 'Error applying concession');
    }
  };

  const handleRemoveConcession = async (concessionId: string) => {
    if (!confirm('Are you sure you want to remove this concession?')) return;
    try {
      await api.delete(`/fees/concessions/${concessionId}`);
      alert('Concession removed successfully!');
      
      const updatedLedger = await api.get(`/fees/ledger/${selectedStudent.student_id}`);
      setLedger(updatedLedger || []);
      if (selectedFeeRecord) {
        const data = await api.get(`/fees/records/${selectedFeeRecord.id}/concessions`);
        setConcessions(data || []);
      }
    } catch (err: any) {
      alert(err.message || 'Error removing concession');
    }
  };

  const handleOpenInstallments = async (record: any) => {
    setSelectedFeeRecord(record);
    setShowInstallmentModal(true);
    const count = installmentCount;
    const splitAmount = Math.round((record.total_amount / count) * 100) / 100;
    const initial: Array<{ due_date: string; amount: number }> = [];
    for (let i = 0; i < count; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() + i);
      initial.push({
        due_date: d.toISOString().split('T')[0] || '',
        amount: i === count - 1 ? record.total_amount - (splitAmount * (count - 1)) : splitAmount
      });
    }
    setDynamicInstallments(initial);

    try {
      const data = await api.get(`/fees/records/${record.id}/installments`);
      setInstallments(data || []);
    } catch (err) {
      console.error('Error fetching installments:', err);
    }
  };

  const handleInstallmentCountChange = (count: number) => {
    setInstallmentCount(count);
    if (!selectedFeeRecord) return;
    const splitAmount = Math.round((selectedFeeRecord.total_amount / count) * 100) / 100;
    const next: Array<{ due_date: string; amount: number }> = [];
    for (let i = 0; i < count; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() + i);
      next.push({
        due_date: d.toISOString().split('T')[0] || '',
        amount: i === count - 1 ? selectedFeeRecord.total_amount - (splitAmount * (count - 1)) : splitAmount
      });
    }
    setDynamicInstallments(next);
  };

  const handleDynamicInstallmentChange = (index: number, field: 'due_date' | 'amount', value: any) => {
    setDynamicInstallments(prev => prev.map((item, idx) => {
      if (idx === index) {
        return {
          ...item,
          [field]: field === 'amount' ? Number(value) : value
        };
      }
      return item;
    }));
  };

  const handleSaveInstallmentPlan = async () => {
    if (!selectedFeeRecord) return;
    try {
      const totalAmount = dynamicInstallments.reduce((sum, item) => sum + item.amount, 0);
      if (Math.abs(totalAmount - selectedFeeRecord.total_amount) > 1) {
        return alert(`Total of installments (₹${totalAmount}) must match overall fee amount (₹${selectedFeeRecord.total_amount})`);
      }

      await api.post(`/fees/records/${selectedFeeRecord.id}/installments`, {
        student_id: selectedStudent.student_id,
        installments: dynamicInstallments
      });
      alert('Installment plan saved successfully!');
      
      const data = await api.get(`/fees/records/${selectedFeeRecord.id}/installments`);
      setInstallments(data || []);
    } catch (err: any) {
      alert(err.message || 'Error saving installment plan');
    }
  };

  const handlePayInstallment = async (inst: any) => {
    const payAmountStr = prompt(`Enter amount to pay for Installment #${inst.installment_number} (Outstanding: ₹${inst.amount - inst.paid_amount})`, String(inst.amount - inst.paid_amount));
    if (payAmountStr === null || payAmountStr.trim() === '') return;
    const payAmount = Number(payAmountStr);
    if (isNaN(payAmount) || payAmount <= 0 || payAmount > (inst.amount - inst.paid_amount)) {
      return alert('Invalid payment amount entered');
    }

    try {
      await api.patch(`/fees/installments/${inst.id}/pay`, { amount: payAmount });
      alert('Installment payment recorded successfully!');
      
      const updatedLedger = await api.get(`/fees/ledger/${selectedStudent.student_id}`);
      setLedger(updatedLedger || []);
      if (selectedFeeRecord) {
        const data = await api.get(`/fees/records/${selectedFeeRecord.id}/installments`);
        setInstallments(data || []);
      }
    } catch (err: any) {
      alert(err.message || 'Error making installment payment');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return <span className="badge badge-success">Paid</span>;
      case 'PARTIALLY_PAID':
        return <span className="badge badge-warning">Partial</span>;
      default:
        return <span className="badge badge-danger">Unpaid</span>;
    }
  };

  // --- PLANS (STRUCTURES) FUNCTIONS ---
  const fetchPlans = async () => {
    try {
      setPlansLoading(true);
      const data = await api.get('/fees/structures');
      setPlans(data || []);
    } catch (err) {
      console.error('Error fetching structures:', err);
    } finally {
      setPlansLoading(false);
    }
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planForm.amount || Number(planForm.amount) <= 0) {
      return alert('Please enter a valid amount');
    }

    try {
      setPlansSaving(true);
      await api.post('/fees/structures', {
        ...planForm,
        amount: Number(planForm.amount),
        year_number: Number(planForm.year_number)
      });
      alert('Fee plan config created successfully!');
      setShowPlanModal(false);
      setPlanForm(f => ({ ...f, amount: '' }));
      fetchPlans();
    } catch (err: any) {
      alert(err.message || 'Error creating fee structure');
    } finally {
      setPlansSaving(false);
    }
  };

  const handleDeletePlan = async (id: string) => {
    if (!confirm('Are you sure you want to delete this fee structure config? This will not affect already generated student accounts.')) return;
    try {
      await api.delete(`/fees/structures/${id}`);
      setPlans(prev => prev.filter(p => p.id !== id));
    } catch (err: any) {
      alert(err.message || 'Error deleting structure');
    }
  };

  // --- REPORTS FUNCTIONS ---
  const fetchReportData = async () => {
    try {
      setReportsLoading(true);
      const [statsData, monthlyData, defaultersData] = await Promise.all([
        api.get('/fees/reports/summary'),
        api.get('/fees/reports/monthly'),
        api.get('/fees/reports/defaulters')
      ]);

      setReportStats(statsData || { totalCollected: 0, totalPending: 0, totalOverdue: 0 });
      setReportMonthly(monthlyData || []);
      setReportDefaulters(defaultersData || []);
    } catch (err) {
      console.error('Error fetching reports:', err);
    } finally {
      setReportsLoading(false);
    }
  };

  // --- RENDERING TABS ---
  const renderStudentsTab = () => {
    if (feeView === 'list') {
      return (
        <>
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.5rem' }}>
              <div className="search-container" style={{ flex: 1 }}>
                <Search size={18} />
                <input
                  type="text"
                  placeholder="Search students by name, admission ID, or roll number..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                />
              </div>
              <button type="submit" className="btn btn-primary">Search</button>
            </form>
          </div>

          <div className="card">
            {studentsLoading ? <p>Loading student fee summaries...</p> : students.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                No student accounts found. Try modifying your search query.
              </p>
            ) : (
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Admission No</th>
                      <th>Roll No</th>
                      <th>Student Name</th>
                      <th>Course / Program</th>
                      <th>Total Billed</th>
                      <th>Paid</th>
                      <th>Outstanding</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student) => {
                      const outstanding = student.total_amount - student.paid_amount;
                      return (
                        <tr key={student.student_id} style={{ cursor: 'pointer' }} onClick={() => handleOpenLedger(student)}>
                          <td><strong>{student.admission_number}</strong></td>
                          <td>{student.roll_number || '-'}</td>
                          <td><strong>{student.first_name} {student.last_name}</strong></td>
                          <td>{student.course_name}</td>
                          <td>₹{student.total_amount.toLocaleString('en-IN')}</td>
                          <td>₹{student.paid_amount.toLocaleString('en-IN')}</td>
                          <td>
                            <span style={{ color: outstanding > 0 ? 'var(--danger)' : 'var(--text-main)', fontWeight: 'bold' }}>
                              ₹{outstanding.toLocaleString('en-IN')}
                            </span>
                          </td>
                          <td>{getStatusBadge(student.status)}</td>
                          <td style={{ textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                            <button className="btn btn-sm btn-primary" onClick={() => handleOpenLedger(student)}>
                              Open Ledger
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      );
    }

    if (feeView === 'ledger' && selectedStudent) {
      return (
        <>
          <div className="page-header" style={{ marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button className="btn btn-secondary" style={{ padding: '0.5rem' }} onClick={() => { setFeeView('list'); fetchStudentRecords(); }}>
                <ArrowLeft size={18} />
              </button>
              <div>
                <h2>Ledger: {selectedStudent.first_name} {selectedStudent.last_name}</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  Admission: {selectedStudent.admission_number} | Course: {selectedStudent.course_name}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {isFinanceAdmin && (
                <>
                  <button className="btn btn-outline" onClick={handleGenerateLedger} disabled={ledgerLoading}>
                    Re-Sync Ledger
                  </button>
                  <button className="btn btn-primary" onClick={() => setShowPayModal(true)} disabled={ledgerLoading || ledger.length === 0}>
                    <CreditCard size={18} /> Collect Fee
                  </button>
                </>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            {/* Outstanding Items Card */}
            <div className="card">
              <h3 style={{ marginBottom: '1.25rem', fontSize: '1.1rem', fontWeight: '800' }}>Outstanding Liabilities</h3>
              {ledgerLoading ? <p>Loading ledger...</p> : ledger.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <IndianRupee size={24} style={{ marginBottom: '0.5rem' }} />
                  <p>No billing records found. Click "Re-Sync Ledger" to apply current fee configs.</p>
                </div>
              ) : (
                <table className="table" style={{ minWidth: 'auto' }}>
                  <thead>
                    <tr>
                      <th>Fee Category</th>
                      <th>Total</th>
                      <th>Paid</th>
                      <th>Due</th>
                      <th>Status</th>
                      {isFinanceAdmin && <th style={{ textAlign: 'right' }}>Manage</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {ledger.map((item) => {
                      const outstanding = item.total_amount - item.paid_amount;
                      return (
                        <tr key={item.id}>
                          <td><strong>{item.fee_type}</strong></td>
                          <td>₹{item.total_amount.toLocaleString('en-IN')}</td>
                          <td>₹{item.paid_amount.toLocaleString('en-IN')}</td>
                          <td><span style={{ fontWeight: 'bold', color: outstanding > 0 ? 'var(--danger)' : '' }}>₹{outstanding.toLocaleString('en-IN')}</span></td>
                          <td>{getStatusBadge(item.status)}</td>
                          {isFinanceAdmin && (
                            <td style={{ textAlign: 'right' }}>
                              <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'flex-end' }}>
                                <button
                                  className="btn btn-sm btn-outline"
                                  style={{ padding: '0.2rem 0.4rem', fontSize: '0.72rem' }}
                                  onClick={() => handleOpenConcessions(item)}
                                >
                                  Concession
                                </button>
                                <button
                                  className="btn btn-sm btn-outline"
                                  style={{ padding: '0.2rem 0.4rem', fontSize: '0.72rem' }}
                                  onClick={() => handleOpenInstallments(item)}
                                >
                                  Split
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Payment History Card */}
            <div className="card">
              <h3 style={{ marginBottom: '1.25rem', fontSize: '1.1rem', fontWeight: '800' }}>Transaction History</h3>
              {ledgerLoading ? <p>Loading transaction logs...</p> : payments.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <Receipt size={24} style={{ marginBottom: '0.5rem' }} />
                  <p>No payments recorded for this student account yet.</p>
                </div>
              ) : (
                <table className="table" style={{ minWidth: 'auto' }}>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Category</th>
                      <th>Method</th>
                      <th>Amount</th>
                      <th style={{ textAlign: 'right' }}>Receipt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id}>
                        <td>{p.payment_date}</td>
                        <td>{p.fee_type}</td>
                        <td>
                          <strong>{p.payment_method}</strong>
                          {p.transaction_reference && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Ref: {p.transaction_reference}</div>}
                        </td>
                        <td><strong>₹{p.amount.toLocaleString('en-IN')}</strong></td>
                        <td style={{ textAlign: 'right' }}>
                          <button className="btn btn-sm btn-outline" style={{ padding: '0.25rem 0.5rem' }} onClick={() => handleOpenReceipt(p)}>
                            <Printer size={12} /> Print
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
      );
    }

    if (feeView === 'receipt' && selectedReceipt) {
      return (
        <>
          <div className="page-header no-print" style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button className="btn btn-secondary" style={{ padding: '0.5rem' }} onClick={() => setFeeView('ledger')}>
                <ArrowLeft size={18} /> Back
              </button>
              <h2>Receipt Preview</h2>
            </div>
            <button className="btn btn-primary" onClick={() => window.print()}>
              <Printer size={18} /> Print Receipt
            </button>
          </div>

          <div className="receipt-print-container" style={{
            background: 'white',
            border: '2px dashed #cbd5e1',
            borderRadius: '12px',
            padding: '2.5rem',
            maxWidth: '650px',
            margin: '0 auto',
            fontFamily: 'Courier New, monospace',
            boxShadow: 'var(--shadow-md)'
          }}>
            <div style={{ textAlign: 'center', borderBottom: '2px dashed #cbd5e1', paddingBottom: '1.25rem', marginBottom: '1.25rem' }}>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 'bold', margin: 0, textTransform: 'uppercase' }}>{selectedReceipt.institution_name}</h1>
              <p style={{ margin: '0.25rem 0 0 0', color: '#475569', fontSize: '0.8rem' }}>{selectedReceipt.institution_address || 'Education Campus Road, India'}</p>
              <h2 style={{ fontSize: '1.1rem', letterSpacing: '0.05em', marginTop: '0.75rem', textDecoration: 'underline' }}>FEES PAYMENT RECEIPT</h2>
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

            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
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

            <div style={{ borderTop: '2px dashed #cbd5e1', marginTop: '2rem', paddingTop: '1.5rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#475569' }}>
              <div>* Computer generated receipt. Requires no physical signature.</div>
              <div>Authorized Signatory</div>
            </div>
          </div>
        </>
      );
    }
  };

  const renderPlansTab = () => {
    return (
      <div className="card">
        {plansLoading ? <p>Loading fee plans...</p> : plans.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            <IndianRupee size={32} style={{ marginBottom: '0.5rem' }} />
            <p>No fee structures configured yet. Click "Add Fee Config" to configure one.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Academic Year</th>
                  <th>Course / Program</th>
                  <th>Year Level</th>
                  <th>Fee Type / Head</th>
                  <th>Amount</th>
                  {isFinanceAdmin && <th style={{ textAlign: 'right' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {plans.map((p) => (
                  <tr key={p.id}>
                    <td><strong>{p.academic_year_name}</strong></td>
                    <td><strong>{p.course_code}</strong> - {p.course_name}</td>
                    <td>Year {p.year_number}</td>
                    <td><span className="badge badge-secondary" style={{ textTransform: 'none' }}>{p.fee_type}</span></td>
                    <td><strong>₹{p.amount.toLocaleString('en-IN')}</strong></td>
                    {isFinanceAdmin && (
                      <td style={{ textAlign: 'right' }}>
                        <button className="btn btn-sm btn-outline btn-danger" onClick={() => handleDeletePlan(p.id)}>
                          <Trash2 size={14} /> Delete
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  const renderReportsTab = () => {
    return (
      <>
        {reportsLoading ? <p>Loading financial dashboards...</p> : (
          <>
            <div className="stats-grid" style={{ marginBottom: '2rem' }}>
              <div className="stat-card">
                <div className="icon" style={{ background: '#f0fdf4', color: 'var(--success)' }}>
                  <IndianRupee size={24} />
                </div>
                <div className="info">
                  <h3>Total Collected</h3>
                  <div className="value" style={{ color: 'var(--success)' }}>
                    ₹{reportStats.totalCollected.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              <div className="stat-card">
                <div className="icon" style={{ background: '#fffbeb', color: 'var(--warning)' }}>
                  <Clock size={24} />
                </div>
                <div className="info">
                  <h3>Outstanding Fees</h3>
                  <div className="value" style={{ color: 'var(--warning)' }}>
                    ₹{reportStats.totalPending.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              <div className="stat-card">
                <div className="icon" style={{ background: '#fef2f2', color: 'var(--danger)' }}>
                  <AlertTriangle size={24} />
                </div>
                <div className="info">
                  <h3>Overdue Amount</h3>
                  <div className="value" style={{ color: 'var(--danger)' }}>
                    ₹{reportStats.totalOverdue.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
              {/* MONTHLY REVENUE */}
              <div className="card">
                <h3 style={{ marginBottom: '1.25rem', fontSize: '1.05rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <TrendingUp size={18} /> Monthly Collection Trends
                </h3>
                {reportMonthly.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No payments logged yet.</p>
                ) : (
                  <div className="table-responsive">
                    <table className="table" style={{ minWidth: 'auto' }}>
                      <thead>
                        <tr>
                          <th>Month</th>
                          <th style={{ textAlign: 'right' }}>Total Collected</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportMonthly.map((row) => (
                          <tr key={row.month}>
                            <td><strong>{row.month}</strong></td>
                            <td style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--success)' }}>
                              ₹{row.amount.toLocaleString('en-IN')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* TOP DEFAULTERS */}
              <div className="card">
                <h3 style={{ marginBottom: '1.25rem', fontSize: '1.05rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Users size={18} style={{ color: 'var(--danger)' }} /> Top Dues Outstanding
                </h3>
                {reportDefaulters.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No pending dues found.</p>
                ) : (
                  <div className="table-responsive">
                    <table className="table" style={{ minWidth: 'auto' }}>
                      <thead>
                        <tr>
                          <th>Admission No</th>
                          <th>Student</th>
                          <th>Course</th>
                          <th style={{ textAlign: 'right' }}>Dues</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportDefaulters.map((row) => (
                          <tr key={row.student_id}>
                            <td><strong>{row.admission_number}</strong></td>
                            <td>{row.first_name} {row.last_name}</td>
                            <td>{row.course_name}</td>
                            <td style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--danger)' }}>
                              ₹{row.pending_amount.toLocaleString('en-IN')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </>
    );
  };

  return (
    <Layout>
      <PageGuidance
        title="Fees & Finance Management"
        description="Unified Billing, Accounts and Collections hub. Configure fee structures, collect cash/online payments, manage concessions/installments, and review financial collections summaries."
        steps={[
          "Go to Fee Plans to set tuition and exam billing structures per course.",
          "Use Student Accounts to check billing ledger, split dues into installments, or record payments.",
          "Check Fee Reports to monitor trends and identify payment defaults."
        ]}
      />

      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h2>Fees & Finance</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Configure fee plans, view billing accounts, collect payments, and track outstanding balances
          </p>
        </div>
        
        {isFinanceAdmin && activeTab === 'plans' && (
          <button className="btn btn-primary" onClick={() => setShowPlanModal(true)}>
            <Plus size={18} /> Add Fee Config
          </button>
        )}
      </div>

      {/* PILL TABS switcher */}
      <div className="page-tabs">
        <button 
          className={`page-tab ${activeTab === 'students' ? 'active' : ''}`}
          onClick={() => handleTabChange('students')}
        >
          Student Accounts
        </button>
        <button 
          className={`page-tab ${activeTab === 'plans' ? 'active' : ''}`}
          onClick={() => handleTabChange('plans')}
        >
          Fee Plans
        </button>
        <button 
          className={`page-tab ${activeTab === 'reports' ? 'active' : ''}`}
          onClick={() => handleTabChange('reports')}
        >
          Financial Reports
        </button>
      </div>

      {/* RENDER ACTIVE TAB */}
      {activeTab === 'students' && renderStudentsTab()}
      {activeTab === 'plans' && renderPlansTab()}
      {activeTab === 'reports' && renderReportsTab()}

      {/* --- ADD FEE PLAN CONFIG MODAL --- */}
      {showPlanModal && (
        <div className="modal">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <h3>Add Fee Config</h3>
            <form onSubmit={handleCreatePlan}>
              <div className="form-group">
                <label>Academic Year</label>
                <select
                  value={planForm.academic_year_id}
                  onChange={(e) => setPlanForm({ ...planForm, academic_year_id: e.target.value })}
                  required
                >
                  {academicYears.map(ay => <option key={ay.id} value={ay.id}>{ay.name}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label>Course / Program</label>
                <select
                  value={planForm.course_id}
                  onChange={(e) => setPlanForm({ ...planForm, course_id: e.target.value })}
                  required
                >
                  {courses.map(c => <option key={c.id} value={c.id}>{c.name} ({c.course_code})</option>)}
                </select>
              </div>

              <div className="form-group">
                <label>Academic Year Level</label>
                <select
                  value={planForm.year_number}
                  onChange={(e) => setPlanForm({ ...planForm, year_number: Number(e.target.value) })}
                  required
                >
                  <option value={1}>1st Year / Grade 1</option>
                  <option value={2}>2nd Year / Grade 2</option>
                  <option value={3}>3rd Year / Grade 3</option>
                  <option value={4}>4th Year / Grade 4</option>
                </select>
              </div>

              <div className="form-group">
                <label>Fee Head Type</label>
                <select
                  value={planForm.fee_type}
                  onChange={(e) => setPlanForm({ ...planForm, fee_type: e.target.value as any })}
                  required
                >
                  <option value="Tuition Fee">Tuition Fee</option>
                  <option value="Exam Fee">Exam Fee</option>
                  <option value="Library Fee">Library Fee</option>
                  <option value="Other">Other Fees</option>
                </select>
              </div>

              <div className="form-group">
                <label>Amount (INR)</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontWeight: 'bold' }}>₹</span>
                  <input
                    type="number"
                    value={planForm.amount}
                    onChange={(e) => setPlanForm({ ...planForm, amount: e.target.value })}
                    placeholder="50000"
                    required
                    style={{ paddingLeft: '2rem' }}
                  />
                </div>
              </div>

              <div className="modal-actions" style={{ marginTop: '2rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowPlanModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={plansSaving}>
                  {plansSaving ? 'Saving...' : 'Add Config'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- RECORD PAYMENT MODAL --- */}
      {showPayModal && selectedStudent && (
        <div className="modal">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <h3>Record Fee Payment</h3>
            <form onSubmit={handleCollectPayment}>
              <div className="form-group">
                <label>Select Fee ledger item</label>
                <select
                  value={payForm.student_fee_record_id}
                  onChange={(e) => {
                    const record = ledger.find(item => item.id === e.target.value);
                    const outstanding = record ? (record.total_amount - record.paid_amount) : 0;
                    setPayForm({ 
                      ...payForm, 
                      student_fee_record_id: e.target.value,
                      amount: outstanding.toString()
                    });
                  }}
                  required
                >
                  {ledger.map(item => {
                    const outstanding = item.total_amount - item.paid_amount;
                    return (
                      <option key={item.id} value={item.id} disabled={item.status === 'PAID'}>
                        {item.fee_type} (Due: ₹{outstanding.toLocaleString('en-IN')})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="form-group">
                <label>Payment Date</label>
                <input
                  type="date"
                  value={payForm.payment_date}
                  onChange={(e) => setPayForm({ ...payForm, payment_date: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Amount to Collect (INR)</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontWeight: 'bold' }}>₹</span>
                  <input
                    type="number"
                    value={payForm.amount}
                    onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                    required
                    style={{ paddingLeft: '2rem' }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Payment Channel</label>
                <select
                  value={payForm.payment_method}
                  onChange={(e) => setPayForm({ ...payForm, payment_method: e.target.value as any })}
                  required
                >
                  <option value="UPI">UPI Payment</option>
                  <option value="Cash">Cash payment</option>
                  <option value="Bank Transfer">Bank Wire Transfer</option>
                  <option value="Cheque">Cheque Deposit</option>
                </select>
              </div>

              <div className="form-group">
                <label>Transaction Reference ID (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. UPI Ref / Cheque number"
                  value={payForm.transaction_reference}
                  onChange={(e) => setPayForm({ ...payForm, transaction_reference: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Remarks (Optional)</label>
                <input
                  type="text"
                  value={payForm.remarks}
                  onChange={(e) => setPayForm({ ...payForm, remarks: e.target.value })}
                />
              </div>

              <div className="modal-actions" style={{ marginTop: '2rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowPayModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={paying}>
                  {paying ? 'Recording...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- CONCESSIONS MODAL --- */}
      {showConcessionModal && selectedFeeRecord && (
        <div className="modal">
          <div className="modal-content" style={{ maxWidth: '600px', width: '90%' }}>
            <h3 style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>Concessions: {selectedFeeRecord.fee_type}</h3>
            
            <form onSubmit={handleApplyConcession} style={{ marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px dashed var(--border)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Concession Type</label>
                  <select
                    value={concessionForm.concession_type}
                    onChange={(e) => setConcessionForm({ ...concessionForm, concession_type: e.target.value })}
                    required
                  >
                    <option value="Scholarship">Scholarship</option>
                    <option value="Sibling">Sibling Discount</option>
                    <option value="Staff Ward">Staff Ward</option>
                    <option value="Merit">Merit Discount</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Discount Type</label>
                  <select
                    value={concessionForm.discount_type}
                    onChange={(e) => setConcessionForm({ ...concessionForm, discount_type: e.target.value as any })}
                    required
                  >
                    <option value="percent">Percentage (%)</option>
                    <option value="flat">Flat Amount (₹)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Value</label>
                  <input
                    type="number"
                    placeholder={concessionForm.discount_type === 'percent' ? '20%' : '5000'}
                    value={concessionForm.discount_value}
                    onChange={(e) => setConcessionForm({ ...concessionForm, discount_value: e.target.value })}
                    required
                    min={0}
                  />
                </div>
                <div className="form-group">
                  <label>Reason / Description</label>
                  <input
                    type="text"
                    value={concessionForm.reason}
                    onChange={(e) => setConcessionForm({ ...concessionForm, reason: e.target.value })}
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                Apply Concession
              </button>
            </form>

            <h4>Applied Concessions</h4>
            <div className="table-responsive" style={{ maxHeight: '200px', overflowY: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Discount</th>
                    <th>Reason</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {concessions.map((c) => (
                    <tr key={c.id}>
                      <td><strong>{c.concession_type}</strong></td>
                      <td>{c.discount_type === 'percent' ? `${c.discount_value}%` : `₹${c.discount_value}`} (₹{c.discount_amount})</td>
                      <td>{c.reason || '—'}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="btn btn-sm btn-outline btn-danger" onClick={() => handleRemoveConcession(c.id)}>
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                  {concessions.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1rem' }}>
                        No concessions applied yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => { setShowConcessionModal(false); setSelectedFeeRecord(null); }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- INSTALLMENTS MODAL --- */}
      {showInstallmentModal && selectedFeeRecord && (
        <div className="modal">
          <div className="modal-content" style={{ maxWidth: '650px', width: '90%' }}>
            <h3 style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>Installments: {selectedFeeRecord.fee_type}</h3>
            
            {installments.length > 0 ? (
              <div>
                <h4>Installment Schedule</h4>
                <div className="table-responsive" style={{ maxHeight: '240px', overflowY: 'auto', marginBottom: '1.5rem' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Term</th>
                        <th>Due Date</th>
                        <th>Amount</th>
                        <th>Paid</th>
                        <th>Status</th>
                        <th style={{ textAlign: 'right' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {installments.map((inst) => (
                        <tr key={inst.id}>
                          <td>Installment #{inst.installment_number}</td>
                          <td>{inst.due_date}</td>
                          <td>₹{inst.amount.toLocaleString('en-IN')}</td>
                          <td>₹{inst.paid_amount.toLocaleString('en-IN')}</td>
                          <td>
                            <span className={`badge ${inst.status === 'Paid' ? 'badge-success' : inst.status === 'Overdue' ? 'badge-danger' : 'badge-warning'}`}>
                              {inst.status}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            {inst.status !== 'Paid' && (
                              <button className="btn btn-sm btn-primary" onClick={() => handlePayInstallment(inst)}>
                                Pay Dues
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                  This fee item has no active installment schedule. Split the overall total into structured installments below:
                </p>
                
                <div className="form-group" style={{ maxWidth: '200px' }}>
                  <label>Installment Splits</label>
                  <select 
                    value={installmentCount} 
                    onChange={(e) => handleInstallmentCountChange(Number(e.target.value))}
                  >
                    <option value={2}>2 Installments</option>
                    <option value={3}>3 Installments</option>
                    <option value={4}>4 Installments</option>
                    <option value={6}>6 Installments</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', margin: '1rem 0 1.5rem' }}>
                  {dynamicInstallments.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, width: '100px' }}>Split #{idx + 1}:</span>
                      <input
                        type="date"
                        value={item.due_date}
                        onChange={(e) => handleDynamicInstallmentChange(idx, 'due_date', e.target.value)}
                        style={{ maxWidth: '160px' }}
                      />
                      <input
                        type="number"
                        value={item.amount}
                        onChange={(e) => handleDynamicInstallmentChange(idx, 'amount', e.target.value)}
                        placeholder="Amount"
                        style={{ maxWidth: '140px' }}
                      />
                    </div>
                  ))}
                </div>

                <button className="btn btn-primary" onClick={handleSaveInstallmentPlan} style={{ width: '100%', marginBottom: '1rem' }}>
                  Save Split Schedule
                </button>
              </div>
            )}

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => { setShowInstallmentModal(false); setSelectedFeeRecord(null); }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
