import React, { useEffect, useState } from 'react';
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

export default function StudentFees() {
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
        due_date: d.toISOString().split('T')[0],
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
        due_date: d.toISOString().split('T')[0],
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

  return (
    <Layout>
      {view === 'list' && (
        <>
          <div className="page-header">
            <div>
              <h2>Student Fee Accounts</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                Manage student ledger liabilities, collect payments, and generate printable receipts
              </p>
            </div>
          </div>

          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.5rem' }}>
              <div className="search-container" style={{ flex: 1 }}>
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
              <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
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
            )}
          </div>
        </>
      )}

      {view === 'ledger' && selectedStudent && (
        <>
          <div className="page-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button className="btn btn-secondary" style={{ padding: '0.5rem' }} onClick={() => { setView('list'); fetchStudentRecords(); }}>
                <ArrowLeft size={18} />
              </button>
              <div>
                <h2>Fee Ledger: {selectedStudent.first_name} {selectedStudent.last_name}</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  Admission: {selectedStudent.admission_number} | Course: {selectedStudent.course_name}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
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

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            {/* Outstanding Items Card */}
            <div className="card">
              <h3 style={{ marginBottom: '1.25rem', fontSize: '1.1rem', fontWeight: '800' }}>Outstanding Liabilities</h3>
              {ledgerLoading ? <p>Loading ledger...</p> : ledger.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <IndianRupee size={24} style={{ marginBottom: '0.5rem' }} />
                  <p>No billing records found in this student's ledger. Click "Generate Ledger" to apply current fee structures.</p>
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
                                  style={{ padding: '0.2rem 0.4rem', fontSize: '0.75rem' }}
                                  onClick={() => handleOpenConcessions(item)}
                                >
                                  🏷️ Concession
                                </button>
                                <button
                                  className="btn btn-sm btn-outline"
                                  style={{ padding: '0.2rem 0.4rem', fontSize: '0.75rem' }}
                                  onClick={() => handleOpenInstallments(item)}
                                >
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
                      <th>Paid Via</th>
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
      )}

      {view === 'receipt' && selectedReceipt && (
        <>
          <div className="page-header no-print">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button className="btn btn-secondary" style={{ padding: '0.5rem' }} onClick={() => setView('ledger')}>
                <ArrowLeft size={18} /> Back
              </button>
              <h2>Receipt Preview</h2>
            </div>
            <button className="btn btn-primary" onClick={handlePrint}>
              <Printer size={18} /> Print Receipt
            </button>
          </div>

          {/* PRINT FRIENDLY RECEIPT WRAPPER */}
          <div className="receipt-print-container" style={{
            background: 'white',
            border: '2px solid #e2e8f0',
            borderRadius: '12px',
            padding: '3rem',
            maxWidth: '750px',
            margin: '0 auto',
            fontFamily: 'Courier New, monospace',
            boxShadow: 'var(--shadow-md)'
          }}>
            <div style={{ textAlign: 'center', borderBottom: '2px dashed #cbd5e1', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
              <h1 style={{ fontSize: '1.6rem', fontWeight: 'bold', margin: 0, textTransform: 'uppercase' }}>{selectedReceipt.institution_name}</h1>
              <p style={{ margin: '0.5rem 0 0 0', color: '#475569', fontSize: '0.875rem' }}>{selectedReceipt.institution_address || 'Education Campus Road, IN'}</p>
              <h2 style={{ fontSize: '1.25rem', letterSpacing: '0.1em', marginTop: '1rem', textDecoration: 'underline' }}>FEES PAYMENT RECEIPT</h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem', fontSize: '0.9rem', lineHeight: '1.6' }}>
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

            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2.5rem', fontSize: '0.95rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px dashed #cbd5e1', borderTop: '2px dashed #cbd5e1' }}>
                  <th style={{ textAlign: 'left', padding: '0.75rem 0' }}>FEE DESCRIPTION</th>
                  <th style={{ textAlign: 'right', padding: '0.75rem 0' }}>TOTAL DUE</th>
                  <th style={{ textAlign: 'right', padding: '0.75rem 0' }}>PAID AMOUNT</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '2px dashed #e2e8f0' }}>
                  <td style={{ padding: '1rem 0' }}>{selectedReceipt.fee_type} Payment ({selectedReceipt.payment_method})</td>
                  <td style={{ textAlign: 'right', padding: '1rem 0' }}>₹{selectedReceipt.total_amount.toLocaleString('en-IN')}</td>
                  <td style={{ textAlign: 'right', padding: '1rem 0', fontWeight: 'bold' }}>₹{selectedReceipt.paid_amount.toLocaleString('en-IN')}</td>
                </tr>
              </tbody>
            </table>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: '0.9rem' }}>
              <div>
                <div><strong>Payment Method:</strong> {selectedReceipt.payment_method}</div>
                {selectedReceipt.transaction_reference && <div><strong>Txn Reference:</strong> {selectedReceipt.transaction_reference}</div>}
                {selectedReceipt.remarks && <div><strong>Remarks:</strong> {selectedReceipt.remarks}</div>}
              </div>
              <div style={{ textAlign: 'right', width: '250px' }}>
                <div style={{ borderBottom: '1px solid #cbd5e1', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
                  <strong>Ledger Paid:</strong> ₹{selectedReceipt.total_paid.toLocaleString('en-IN')}
                </div>
                <div>
                  <strong>Ledger Due:</strong> ₹{(selectedReceipt.total_amount - selectedReceipt.total_paid).toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            <div style={{ borderTop: '2px dashed #cbd5e1', marginTop: '3rem', paddingTop: '2rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#475569' }}>
              <div>* This is a computer generated invoice and requires no physical signature.</div>
              <div>Authorized Signatory</div>
            </div>
          </div>
        </>
      )}

      {/* COLLECT PAYMENT MODAL */}
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

      {showConcessionModal && selectedFeeRecord && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '600px', width: '90%' }}>
            <div className="modal-header">
              <h3>Manage Concessions — {selectedFeeRecord.fee_type}</h3>
              <button onClick={() => { setShowConcessionModal(false); setSelectedFeeRecord(null); }}>✕</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleApplyConcession} style={{ marginBottom: '1.5rem', borderBottom: '1px dashed var(--border)', paddingBottom: '1.5rem' }}>
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

                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                  Apply Concession
                </button>
              </form>

              <h4>Applied Concessions</h4>
              <table className="table" style={{ marginTop: '0.5rem' }}>
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
                      <td>{c.discount_type === 'percent' ? `${c.discount_value}%` : `₹${c.discount_value.toLocaleString('en-IN')}`} (₹{c.discount_amount.toLocaleString('en-IN')})</td>
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
                      <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1.5rem' }}>
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
          <div className="modal" style={{ maxWidth: '650px', width: '90%' }}>
            <div className="modal-header">
              <h3>Manage Installments — {selectedFeeRecord.fee_type}</h3>
              <button onClick={() => { setShowInstallmentModal(false); setSelectedFeeRecord(null); }}>✕</button>
            </div>
            <div className="modal-body">
              {installments.length > 0 ? (
                <div>
                  <h4>Installment Schedule</h4>
                  <table className="table" style={{ marginTop: '0.5rem', marginBottom: '1.5rem' }}>
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
                <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', border: '1px dashed var(--border)', borderRadius: '6px', marginBottom: '1.5rem' }}>
                  No installment plan created for this fee category. Total amount: <strong>₹{selectedFeeRecord.total_amount.toLocaleString('en-IN')}</strong>.
                </div>
              )}

              <div style={{ borderTop: '1px dashed var(--border)', paddingTop: '1.5rem' }}>
                <h4>Setup Installment Plan</h4>
                <div className="form-group" style={{ marginTop: '0.5rem' }}>
                  <label>Number of Installments</label>
                  <select
                    value={installmentCount}
                    onChange={(e) => handleInstallmentCountChange(Number(e.target.value))}
                    style={{ padding: '0.4rem', border: '1px solid var(--border)', borderRadius: '4px' }}
                  >
                    {[2, 3, 4, 5, 6, 8, 10, 12].map(n => (
                      <option key={n} value={n}>{n} Installments</option>
                    ))}
                  </select>
                </div>

                <table className="table" style={{ marginTop: '0.5rem' }}>
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
                          <input
                            type="date"
                            value={item.due_date}
                            onChange={(e) => handleDynamicInstallmentChange(idx, 'due_date', e.target.value)}
                            style={{ padding: '0.3rem', border: '1px solid var(--border)', borderRadius: '4px' }}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            value={item.amount}
                            onChange={(e) => handleDynamicInstallmentChange(idx, 'amount', e.target.value)}
                            style={{ padding: '0.3rem', border: '1px solid var(--border)', borderRadius: '4px', width: '120px' }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <button className="btn btn-primary" onClick={handleSaveInstallmentPlan} style={{ marginTop: '1rem', width: '100%' }}>
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
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .receipt-print-container, .receipt-print-container * {
            visibility: visible;
          }
          .receipt-print-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            max-width: 100% !important;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </Layout>
  );
}
