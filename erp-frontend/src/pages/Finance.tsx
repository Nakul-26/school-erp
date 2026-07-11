import './Finance.css';
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
          <div className="card finance-card">
            <form onSubmit={handleSearchSubmit} className="finance-row-2">
              <div className="search-container finance-search-container">
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
              <p className="finance-text-4">
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
                      <th className="finance-th-5">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student) => {
                      const outstanding = student.total_amount - student.paid_amount;
                      return (
                        <tr key={student.student_id} className="finance-tr-6" onClick={() => handleOpenLedger(student)}>
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
                          <td className="finance-td-7" onClick={e => e.stopPropagation()}>
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
          <div className="page-header finance-page-header">
            <div className="finance-row-9">
              <button className="btn btn-secondary finance-btn" onClick={() => { setFeeView('list'); fetchStudentRecords(); }}>
                <ArrowLeft size={18} />
              </button>
              <div>
                <h2>Ledger: {selectedStudent.first_name} {selectedStudent.last_name}</h2>
                <p className="finance-text-11">
                  Admission: {selectedStudent.admission_number} | Course: {selectedStudent.course_name}
                </p>
              </div>
            </div>
            <div className="finance-row-12">
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

          <div className="finance-grid-13">
            {/* Outstanding Items Card */}
            <div className="card">
              <h3 className="finance-title-14">Outstanding Liabilities</h3>
              {ledgerLoading ? <p>Loading ledger...</p> : ledger.length === 0 ? (
                <div className="finance-div-15">
                  <IndianRupee size={24} className="finance-IndianRupee-16"  />
                  <p>No billing records found. Click "Re-Sync Ledger" to apply current fee configs.</p>
                </div>
              ) : (
                <table className="table finance-ledger-table">
                  <thead>
                    <tr>
                      <th>Fee Category</th>
                      <th>Total</th>
                      <th>Paid</th>
                      <th>Due</th>
                      <th>Status</th>
                      {isFinanceAdmin && <th className="finance-th-18">Manage</th>}
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
                            <td className="finance-td-19">
                              <div className="finance-row-20">
                                <button className="btn btn-sm btn-outline finance-btn" onClick={() => handleOpenConcessions(item)}>
                                  Concession
                                </button>
                                <button className="btn btn-sm btn-outline finance-btn" onClick={() => handleOpenInstallments(item)}>
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
              <h3 className="finance-title-23">Transaction History</h3>
              {ledgerLoading ? <p>Loading transaction logs...</p> : payments.length === 0 ? (
                <div className="finance-div-24">
                  <Receipt size={24} className="finance-Receipt-25"  />
                  <p>No payments recorded for this student account yet.</p>
                </div>
              ) : (
                <table className="table finance-payments-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Category</th>
                      <th>Method</th>
                      <th>Amount</th>
                      <th className="finance-th-27">Receipt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id}>
                        <td>{p.payment_date}</td>
                        <td>{p.fee_type}</td>
                        <td>
                          <strong>{p.payment_method}</strong>
                          {p.transaction_reference && <div className="finance-div-28">Ref: {p.transaction_reference}</div>}
                        </td>
                        <td><strong>₹{p.amount.toLocaleString('en-IN')}</strong></td>
                        <td className="finance-td-29">
                          <button className="btn btn-sm btn-outline finance-btn" onClick={() => handleOpenReceipt(p)}>
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
          <div className="page-header no-print finance-page-header">
            <div className="finance-row-32">
              <button className="btn btn-secondary finance-btn" onClick={() => setFeeView('ledger')}>
                <ArrowLeft size={18} /> Back
              </button>
              <h2>Receipt Preview</h2>
            </div>
            <button className="btn btn-primary" onClick={() => window.print()}>
              <Printer size={18} /> Print Receipt
            </button>
          </div>

          <div className="receipt-print-container finance-receipt-print-container">
            <div className="finance-div-35">
              <h1 className="finance-title-36">{selectedReceipt.institution_name}</h1>
              <p className="finance-text-37">{selectedReceipt.institution_address || 'Education Campus Road, India'}</p>
              <h2 className="finance-title-38">FEES PAYMENT RECEIPT</h2>
            </div>

            <div className="finance-grid-39">
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

            <table className="finance-table-40">
              <thead>
                <tr className="finance-tr-41">
                  <th className="finance-th-42">FEE DESCRIPTION</th>
                  <th className="finance-th-43">TOTAL DUE</th>
                  <th className="finance-th-44">PAID AMOUNT</th>
                </tr>
              </thead>
              <tbody>
                <tr className="finance-tr-45">
                  <td className="finance-td-46">{selectedReceipt.fee_type} Payment ({selectedReceipt.payment_method})</td>
                  <td className="finance-td-47">₹{selectedReceipt.total_amount.toLocaleString('en-IN')}</td>
                  <td className="finance-td-48">₹{selectedReceipt.paid_amount.toLocaleString('en-IN')}</td>
                </tr>
              </tbody>
            </table>

            <div className="finance-row-49">
              <div>
                <div><strong>Payment Method:</strong> {selectedReceipt.payment_method}</div>
                {selectedReceipt.transaction_reference && <div><strong>Txn Reference:</strong> {selectedReceipt.transaction_reference}</div>}
                {selectedReceipt.remarks && <div><strong>Remarks:</strong> {selectedReceipt.remarks}</div>}
              </div>
              <div className="finance-div-50">
                <div className="finance-div-51">
                  <strong>Ledger Paid:</strong> ₹{selectedReceipt.total_paid.toLocaleString('en-IN')}
                </div>
                <div>
                  <strong>Ledger Due:</strong> ₹{(selectedReceipt.total_amount - selectedReceipt.total_paid).toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            <div className="finance-row-52">
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
          <div className="finance-div-53">
            <IndianRupee size={32} className="finance-IndianRupee-54"  />
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
                  {isFinanceAdmin && <th className="finance-th-55">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {plans.map((p) => (
                  <tr key={p.id}>
                    <td><strong>{p.academic_year_name}</strong></td>
                    <td><strong>{p.course_code}</strong> - {p.course_name}</td>
                    <td>Year {p.year_number}</td>
                    <td><span className="badge badge-secondary finance-badge">{p.fee_type}</span></td>
                    <td><strong>₹{p.amount.toLocaleString('en-IN')}</strong></td>
                    {isFinanceAdmin && (
                      <td className="finance-td-57">
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
            <div className="stats-grid finance-stats-grid">
              <div className="stat-card">
                <div className="icon finance-icon">
                  <IndianRupee size={24} />
                </div>
                <div className="info">
                  <h3>Total Collected</h3>
                  <div className="value finance-value">
                    ₹{reportStats.totalCollected.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              <div className="stat-card">
                <div className="icon finance-icon">
                  <Clock size={24} />
                </div>
                <div className="info">
                  <h3>Outstanding Fees</h3>
                  <div className="value finance-value">
                    ₹{reportStats.totalPending.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              <div className="stat-card">
                <div className="icon finance-icon">
                  <AlertTriangle size={24} />
                </div>
                <div className="info">
                  <h3>Overdue Amount</h3>
                  <div className="value finance-value">
                    ₹{reportStats.totalOverdue.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            </div>

            <div className="finance-grid-65">
              {/* MONTHLY REVENUE */}
              <div className="card">
                <h3 className="finance-row-66">
                  <TrendingUp size={18} /> Monthly Collection Trends
                </h3>
                {reportMonthly.length === 0 ? (
                  <p className="finance-text-67">No payments logged yet.</p>
                ) : (
                  <div className="table-responsive">
                    <table className="table finance-summary-table">
                      <thead>
                        <tr>
                          <th>Month</th>
                          <th className="finance-th-69">Total Collected</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportMonthly.map((row) => (
                          <tr key={row.month}>
                            <td><strong>{row.month}</strong></td>
                            <td className="finance-td-70">
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
                <h3 className="finance-row-71">
                  <Users size={18} className="finance-Users-72"  /> Top Dues Outstanding
                </h3>
                {reportDefaulters.length === 0 ? (
                  <p className="finance-text-73">No pending dues found.</p>
                ) : (
                  <div className="table-responsive">
                    <table className="table finance-plans-table">
                      <thead>
                        <tr>
                          <th>Admission No</th>
                          <th>Student</th>
                          <th>Course</th>
                          <th className="finance-th-75">Dues</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportDefaulters.map((row) => (
                          <tr key={row.student_id}>
                            <td><strong>{row.admission_number}</strong></td>
                            <td>{row.first_name} {row.last_name}</td>
                            <td>{row.course_name}</td>
                            <td className="finance-td-76">
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

      <div className="page-header finance-page-header">
        <div>
          <h2>Fees & Finance</h2>
          <p className="finance-text-78">
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
          <div className="modal-content finance-modal-content">
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
                <div className="finance-div-80">
                  <span className="finance-span-81">₹</span>
                  <input type="number" value={planForm.amount} onChange={(e) => setPlanForm({ ...planForm, amount: e.target.value })} placeholder="50000" required className="finance-input-82"  />
                </div>
              </div>

              <div className="modal-actions finance-modal-actions">
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
          <div className="modal-content finance-modal-content">
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
                <div className="finance-div-85">
                  <span className="finance-span-86">₹</span>
                  <input type="number" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} required className="finance-input-87"  />
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

              <div className="modal-actions finance-modal-actions">
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
          <div className="modal-content finance-modal-content">
            <h3 className="finance-title-90">Concessions: {selectedFeeRecord.fee_type}</h3>
            
            <form onSubmit={handleApplyConcession} className="finance-form-91">
              <div className="finance-grid-92">
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

              <div className="finance-grid-93">
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

              <button type="submit" className="btn btn-primary finance-btn">
                Apply Concession
              </button>
            </form>

            <h4>Applied Concessions</h4>
            <div className="table-responsive finance-table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Discount</th>
                    <th>Reason</th>
                    <th className="finance-th-96">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {concessions.map((c) => (
                    <tr key={c.id}>
                      <td><strong>{c.concession_type}</strong></td>
                      <td>{c.discount_type === 'percent' ? `${c.discount_value}%` : `₹${c.discount_value}`} (₹{c.discount_amount})</td>
                      <td>{c.reason || '—'}</td>
                      <td className="finance-td-97">
                        <button className="btn btn-sm btn-outline btn-danger" onClick={() => handleRemoveConcession(c.id)}>
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                  {concessions.length === 0 && (
                    <tr>
                      <td colSpan={4} className="finance-td-98">
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
          <div className="modal-content finance-modal-content">
            <h3 className="finance-title-100">Installments: {selectedFeeRecord.fee_type}</h3>
            
            {installments.length > 0 ? (
              <div>
                <h4>Installment Schedule</h4>
                <div className="table-responsive finance-table-responsive">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Term</th>
                        <th>Due Date</th>
                        <th>Amount</th>
                        <th>Paid</th>
                        <th>Status</th>
                        <th className="finance-th-102">Action</th>
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
                          <td className="finance-td-103">
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
                <p className="finance-text-104">
                  This fee item has no active installment schedule. Split the overall total into structured installments below:
                </p>
                
                <div className="form-group finance-form-group">
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

                <div className="finance-col-106">
                  {dynamicInstallments.map((item, idx) => (
                    <div key={idx} className="finance-row-107">
                      <span className="finance-span-108">Split #{idx + 1}:</span>
                      <input type="date" value={item.due_date} onChange={(e) => handleDynamicInstallmentChange(idx, 'due_date', e.target.value)} className="finance-input-109"  />
                      <input type="number" value={item.amount} onChange={(e) => handleDynamicInstallmentChange(idx, 'amount', e.target.value)} placeholder="Amount" className="finance-input-110"  />
                    </div>
                  ))}
                </div>

                <button className="btn btn-primary finance-btn" onClick={handleSaveInstallmentPlan}>
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
