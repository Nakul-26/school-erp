
import './StudentFees.css';
import React, { useEffect, useState } from 'react';
import { PageGuidance } from '../components/PageGuidance';
import Layout from '../components/Layout';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { 
  Search, IndianRupee, CreditCard, Receipt, 
  ArrowLeft, Plus, Check, Calendar, User, Printer 
} from 'lucide-react';

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

export default function StudentFees({ isSubComponent = false }: { isSubComponent?: boolean }) {
  const { user } = useAuth();
  const [view, setView] = useState<'list' | 'ledger' | 'receipt'>('list');
  const [students, setStudents] = useState<StudentFeeSummaryRow[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Selected student details
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

  // Auth user check
  const userRoles = user?.roles || (user?.role ? [user.role] : []);
  const isFinanceAdmin = userRoles.some(r => ['super_admin', 'Super Admin', 'admin', 'Admin', 'Principal', 'Accountant', 'accountant'].includes(r));

  useEffect(() => {
    fetchStudentRecords();
  }, []);

  const fetchStudentRecords = async (searchTerm = '') => {
    try {
      setLoading(true);
      const data = await api.get(`/fees/student-records${searchTerm ? `?search=${searchTerm}` : ''}`);
      
      // Since database could have multiple entries per student (for different fee heads),
      // we aggregate them by student_id to show a high-level summary of total fee, paid, pending.
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

      // Recalculate status based on aggregated amounts
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
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchStudentRecords(search);
  };

  const handleOpenLedger = async (student: any) => {
    try {
      setLedgerLoading(true);
      setSelectedStudent(student);
      const [ledgerData, paymentsData] = await Promise.all([
        api.get(`/fees/ledger/${student.student_id}`),
        api.get(`/fees/payments?student_id=${student.student_id}`)
      ]);

      setLedger(ledgerData);
      setPayments(paymentsData);
      
      if (ledgerData.length > 0) {
        // Find first unpaid/partially paid item
        const unpaid = ledgerData.find((item: any) => item.status !== 'PAID');
        setPayForm(f => ({ 
          ...f, 
          student_fee_record_id: unpaid ? unpaid.id : ledgerData[0].id,
          amount: unpaid ? (unpaid.total_amount - unpaid.paid_amount).toString() : '0'
        }));
      }

      setView('ledger');
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
      // We will look up the enrollments for the student to fetch academic_year_id, course_id, and year_number
      // Or let's fetch enrollment details directly.
      const enrollments = await api.get('/enrollments');
      const studentEnrollment = enrollments.find((e: any) => e.student_id === selectedStudent.student_id);

      if (!studentEnrollment) {
        return alert('Student is not enrolled in any Course / Section. Enroll student first!');
      }

      await api.post('/fees/generate-ledger', {
        student_id: selectedStudent.student_id,
        academic_year_id: studentEnrollment.academic_year_id,
        course_id: studentEnrollment.course_id,
        year_number: studentEnrollment.semester ? Math.ceil(studentEnrollment.semester / 2) : 1 // Derive year from semester
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
      const res = await api.post('/fees/payments', {
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
      // Refresh ledger & payments
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
      // Fetch receipt details
      let receipt = await api.get(`/fees/receipts/${payment.receipt_number}`);
      if (!receipt && payment.id) {
        // Fallback or retrieve by payment_id
        receipt = await api.get(`/fees/receipts?payment_id=${payment.id}`);
      }
      setSelectedReceipt(receipt);
      setView('receipt');
    } catch (err) {
      // If direct route fails, lookup from list of receipts
      try {
        const receiptsList = await api.get('/fees/receipts');
        const match = receiptsList.find((r: any) => r.payment_id === payment.id);
        if (match) {
          const detail = await api.get(`/fees/receipts/${match.id}`);
          setSelectedReceipt(detail);
          setView('receipt');
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

  // --- CONCESSION HANDLERS ---
  const handleOpenConcessions = async (record: any) => {
    setSelectedFeeRecord(record);
    setShowConcessionModal(true);
    try {
      const data = await api.get(`/fees/records/${record.id}/concessions`);
      setConcessions(data);
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
      
      // Refresh list & ledger
      const updatedLedger = await api.get(`/fees/students/${selectedStudent.student_id}/ledger`);
      setLedger(updatedLedger);
      const data = await api.get(`/fees/records/${selectedFeeRecord.id}/concessions`);
      setConcessions(data);
    } catch (err: any) {
      alert(err.message || 'Error applying concession');
    }
  };

  const handleRemoveConcession = async (concessionId: string) => {
    if (!confirm('Are you sure you want to remove this concession?')) return;
    try {
      await api.delete(`/fees/concessions/${concessionId}`);
      alert('Concession removed successfully!');
      
      // Refresh list & ledger
      const updatedLedger = await api.get(`/fees/students/${selectedStudent.student_id}/ledger`);
      setLedger(updatedLedger);
      if (selectedFeeRecord) {
        const data = await api.get(`/fees/records/${selectedFeeRecord.id}/concessions`);
        setConcessions(data);
      }
    } catch (err: any) {
      alert(err.message || 'Error removing concession');
    }
  };

  // --- INSTALLMENT HANDLERS ---
  const handleOpenInstallments = async (record: any) => {
    setSelectedFeeRecord(record);
    setShowInstallmentModal(true);
    // Initialize default equal-split list
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
      setInstallments(data);
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
      setInstallments(data);
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
      
      // Refresh list, ledger & installments
      const updatedLedger = await api.get(`/fees/students/${selectedStudent.student_id}/ledger`);
      setLedger(updatedLedger);
      if (selectedFeeRecord) {
        const data = await api.get(`/fees/records/${selectedFeeRecord.id}/installments`);
        setInstallments(data);
      }
    } catch (err: any) {
      alert(err.message || 'Error making installment payment');
    }
  };

  const handlePrint = () => {
    window.print();
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

  const content = (
    <>
      {!isSubComponent && (
        <PageGuidance
          title="Fee Collection"
          description="Use this page to collect school fees, view ledgers, and print receipts."
          steps={["Search for a student to open their fee ledger.","Click Collect Fee to record Cash, UPI, or Card payments.","Print payment receipts for parents immediately."]}
        />
      )}
      {view === 'list' && (
        <>
          <div className="page-header">
            <div>
              <h2>Student Fee Accounts</h2>
              <p className="student-fees-text-1">
                Manage student ledger liabilities, collect payments, and generate printable receipts
              </p>
            </div>
          </div>

          <div className="card student-fees-card">
            <form onSubmit={handleSearchSubmit} className="student-fees-row-3">
              <div className="search-container student-fees-search-container">
                <Search size={18} />
                <input
                  type="text"
                  placeholder="Search students by name, admission ID, or roll number..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <button type="submit" className="btn btn-primary">Search</button>
            </form>
          </div>

          <div className="card">
            {loading ? <p>Loading student fee summaries...</p> : students.length === 0 ? (
              <p className="student-fees-text-5">
                No student accounts found. Try modifying your search query.
              </p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Admission No</th>
                    <th>Roll No</th>
                    <th>Student Name</th>
                    <th>Program</th>
                    <th>Total Billed</th>
                    <th>Paid</th>
                    <th>Outstanding</th>
                    <th>Status</th>
                    <th className="student-fees-th-6">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => {
                    const outstanding = student.total_amount - student.paid_amount;
                    return (
                      <tr key={student.student_id} className="student-fees-tr-7" onClick={() => handleOpenLedger(student)}>
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
                        <td className="student-fees-td-8" onClick={e => e.stopPropagation()}>
                          <button className="btn btn-sm btn-primary" onClick={() => handleOpenLedger(student)}>
                            Open Ledger
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {view === 'ledger' && selectedStudent && (
        <>
          <div className="page-header">
            <div className="student-fees-row-9">
              <button className="btn btn-secondary student-fees-btn" onClick={() => { setView('list'); fetchStudentRecords(); }}>
                <ArrowLeft size={18} />
              </button>
              <div>
                <h2>Fee Ledger: {selectedStudent.first_name} {selectedStudent.last_name}</h2>
                <p className="student-fees-text-11">
                  Admission: {selectedStudent.admission_number} | Course: {selectedStudent.course_name}
                </p>
              </div>
            </div>
            <div className="student-fees-row-12">
              {isFinanceAdmin && (
                <>
                  <button className="btn btn-outline" onClick={handleGenerateLedger} disabled={ledgerLoading}>
                    Generate Ledger
                  </button>
                  <button className="btn btn-primary" onClick={() => setShowPayModal(true)} disabled={ledgerLoading || ledger.length === 0}>
                    <CreditCard size={18} /> Collect Payment
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="student-fees-grid-13">
            {/* Outstanding Items Card */}
            <div className="card">
              <h3 className="student-fees-title-14">Outstanding Liabilities</h3>
              {ledgerLoading ? <p>Loading ledger...</p> : ledger.length === 0 ? (
                <div className="student-fees-div-15">
                  <IndianRupee size={24} className="student-fees-IndianRupee-16"  />
                  <p>No billing records found in this student's ledger. Click "Generate Ledger" to apply current fee structures.</p>
                </div>
              ) : (
                <table className="table student-fees-table">
                  <thead>
                    <tr>
                      <th>Fee Category</th>
                      <th>Total</th>
                      <th>Paid</th>
                      <th>Due</th>
                      <th>Status</th>
                      {isFinanceAdmin && <th className="student-fees-th-18">Manage</th>}
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
                            <td className="student-fees-td-19">
                              <div className="student-fees-row-20">
                                <button className="btn btn-sm btn-outline student-fees-btn" onClick={() => handleOpenConcessions(item)}>
                                  🏷️ Concession
                                </button>
                                <button className="btn btn-sm btn-outline student-fees-btn" onClick={() => handleOpenInstallments(item)}>
                                  📅 Installments
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
              <h3 className="student-fees-title-23">Transaction History</h3>
              {ledgerLoading ? <p>Loading transaction logs...</p> : payments.length === 0 ? (
                <div className="student-fees-div-24">
                  <Receipt size={24} className="student-fees-Receipt-25"  />
                  <p>No payments recorded for this student account yet.</p>
                </div>
              ) : (
                <table className="table student-fees-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Category</th>
                      <th>Paid Via</th>
                      <th>Amount</th>
                      <th className="student-fees-th-27">Receipt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id}>
                        <td>{p.payment_date}</td>
                        <td>{p.fee_type}</td>
                        <td>
                          <strong>{p.payment_method}</strong>
                          {p.transaction_reference && <div className="student-fees-div-28">Ref: {p.transaction_reference}</div>}
                        </td>
                        <td><strong>₹{p.amount.toLocaleString('en-IN')}</strong></td>
                        <td className="student-fees-td-29">
                          <button className="btn btn-sm btn-outline student-fees-btn" onClick={() => handleOpenReceipt(p)}>
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
      )}

      {view === 'receipt' && selectedReceipt && (
        <>
          <div className="page-header no-print">
            <div className="student-fees-row-31">
              <button className="btn btn-secondary student-fees-btn" onClick={() => setView('ledger')}>
                <ArrowLeft size={18} /> Back
              </button>
              <h2>Receipt Preview</h2>
            </div>
            <button className="btn btn-primary" onClick={handlePrint}>
              <Printer size={18} /> Print Receipt
            </button>
          </div>

          {/* PRINT FRIENDLY RECEIPT WRAPPER */}
          <div className="receipt-print-container student-fees-receipt-print-container">
            <div className="student-fees-div-34">
              <h1 className="student-fees-title-35">{selectedReceipt.institution_name}</h1>
              <p className="student-fees-text-36">{selectedReceipt.institution_address || 'Education Campus Road, IN'}</p>
              <h2 className="student-fees-title-37">FEES PAYMENT RECEIPT</h2>
            </div>

            <div className="student-fees-grid-38">
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

            <table className="student-fees-table-39">
              <thead>
                <tr className="student-fees-tr-40">
                  <th className="student-fees-th-41">FEE DESCRIPTION</th>
                  <th className="student-fees-th-42">TOTAL DUE</th>
                  <th className="student-fees-th-43">PAID AMOUNT</th>
                </tr>
              </thead>
              <tbody>
                <tr className="student-fees-tr-44">
                  <td className="student-fees-td-45">{selectedReceipt.fee_type} Payment ({selectedReceipt.payment_method})</td>
                  <td className="student-fees-td-46">₹{selectedReceipt.total_amount.toLocaleString('en-IN')}</td>
                  <td className="student-fees-td-47">₹{selectedReceipt.paid_amount.toLocaleString('en-IN')}</td>
                </tr>
              </tbody>
            </table>

            <div className="student-fees-row-48">
              <div>
                <div><strong>Payment Method:</strong> {selectedReceipt.payment_method}</div>
                {selectedReceipt.transaction_reference && <div><strong>Txn Reference:</strong> {selectedReceipt.transaction_reference}</div>}
                {selectedReceipt.remarks && <div><strong>Remarks:</strong> {selectedReceipt.remarks}</div>}
              </div>
              <div className="student-fees-div-49">
                <div className="student-fees-div-50">
                  <strong>Ledger Paid:</strong> ₹{selectedReceipt.total_paid.toLocaleString('en-IN')}
                </div>
                <div>
                  <strong>Ledger Due:</strong> ₹{(selectedReceipt.total_amount - selectedReceipt.total_paid).toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            <div className="student-fees-row-51">
              <div>* This is a computer generated invoice and requires no physical signature.</div>
              <div>Authorized Signatory</div>
            </div>
          </div>
        </>
      )}

      {/* COLLECT PAYMENT MODAL */}
      {showPayModal && selectedStudent && (
        <div className="modal">
          <div className="modal-content student-fees-modal-content">
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
                <div className="student-fees-div-53">
                  <span className="student-fees-span-54">₹</span>
                  <input type="number" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} required className="student-fees-input-55"  />
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
                  placeholder="e.g. Txn12345 / Cheque #00045"
                  value={payForm.transaction_reference}
                  onChange={(e) => setPayForm({ ...payForm, transaction_reference: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Additional remarks (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. paid on behalf of guardian"
                  value={payForm.remarks}
                  onChange={(e) => setPayForm({ ...payForm, remarks: e.target.value })}
                />
              </div>

              <div className="modal-actions student-fees-modal-actions">
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

      {showConcessionModal && selectedFeeRecord && (
        <div className="modal-overlay">
          <div className="modal student-fees-modal">
            <div className="modal-header">
              <h3>Manage Concessions — {selectedFeeRecord.fee_type}</h3>
              <button onClick={() => { setShowConcessionModal(false); setSelectedFeeRecord(null); }}>✕</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleApplyConcession} className="student-fees-form-58">
                <div className="student-fees-grid-59">
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

                <div className="student-fees-grid-60">
                  <div className="form-group">
                    <label>Value</label>
                    <input
                      type="number"
                      placeholder={concessionForm.discount_type === 'percent' ? 'e.g. 20' : 'e.g. 1000'}
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
                      placeholder="e.g. 20% sibling discount"
                      value={concessionForm.reason}
                      onChange={(e) => setConcessionForm({ ...concessionForm, reason: e.target.value })}
                    />
                  </div>
                </div>

                <button type="submit" className="btn btn-primary student-fees-btn">
                  Apply Concession
                </button>
              </form>

              <h4>Applied Concessions</h4>
              <table className="table student-fees-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Discount</th>
                    <th>Reason</th>
                    <th className="student-fees-th-63">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {concessions.map((c) => (
                    <tr key={c.id}>
                      <td><strong>{c.concession_type}</strong></td>
                      <td>{c.discount_type === 'percent' ? `${c.discount_value}%` : `₹${c.discount_value.toLocaleString('en-IN')}`} (₹{c.discount_amount.toLocaleString('en-IN')})</td>
                      <td>{c.reason || '—'}</td>
                      <td className="student-fees-td-64">
                        <button className="btn btn-sm btn-outline btn-danger" onClick={() => handleRemoveConcession(c.id)}>
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                  {concessions.length === 0 && (
                    <tr>
                      <td colSpan={4} className="student-fees-td-65">
                        No concessions applied to this record.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => { setShowConcessionModal(false); setSelectedFeeRecord(null); }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {showInstallmentModal && selectedFeeRecord && (
        <div className="modal-overlay">
          <div className="modal student-fees-modal">
            <div className="modal-header">
              <h3>Manage Installments — {selectedFeeRecord.fee_type}</h3>
              <button onClick={() => { setShowInstallmentModal(false); setSelectedFeeRecord(null); }}>✕</button>
            </div>
            <div className="modal-body">
              {installments.length > 0 ? (
                <div>
                  <h4>Installment Schedule</h4>
                  <table className="table student-fees-table">
                    <thead>
                      <tr>
                        <th>Term</th>
                        <th>Due Date</th>
                        <th>Amount</th>
                        <th>Paid</th>
                        <th>Status</th>
                        <th className="student-fees-th-68">Action</th>
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
                          <td className="student-fees-td-69">
                            {inst.status !== 'Paid' && (
                              <button className="btn btn-sm btn-primary" onClick={() => handlePayInstallment(inst)}>
                                Pay Term
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="student-fees-div-70">
                  No installment plan created for this fee category. Total amount: <strong>₹{selectedFeeRecord.total_amount.toLocaleString('en-IN')}</strong>.
                </div>
              )}

              <div className="student-fees-div-71">
                <h4>Setup Installment Plan</h4>
                <div className="form-group student-fees-form-group">
                  <label>Number of Installments</label>
                  <select value={installmentCount} onChange={(e) => handleInstallmentCountChange(Number(e.target.value))} className="student-fees-select-73">
                    {[2, 3, 4, 5, 6, 8, 10, 12].map(n => (
                      <option key={n} value={n}>{n} Installments</option>
                    ))}
                  </select>
                </div>

                <table className="table student-fees-table">
                  <thead>
                    <tr>
                      <th>Term</th>
                      <th>Due Date</th>
                      <th>Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dynamicInstallments.map((item, idx) => (
                      <tr key={idx}>
                        <td>Installment #{idx + 1}</td>
                        <td>
                          <input type="date" value={item.due_date} onChange={(e) => handleDynamicInstallmentChange(idx, 'due_date', e.target.value)} className="student-fees-input-75"  />
                        </td>
                        <td>
                          <input type="number" value={item.amount} onChange={(e) => handleDynamicInstallmentChange(idx, 'amount', e.target.value)} className="student-fees-input-76"  />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <button className="btn btn-primary student-fees-btn" onClick={handleSaveInstallmentPlan}>
                  Create & Save Installment Plan
                </button>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => { setShowInstallmentModal(false); setSelectedFeeRecord(null); }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* PRINT CUSTOM STYLING */}
      
    </>
  );

  if (isSubComponent) return content;
  return <Layout>{content}</Layout>;
}
