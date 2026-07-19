import './Finance.css';
import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { hasAnyPermission, hasAnyRole } from '../utils/accessControl';
import { 
  Landmark, IndianRupee, CreditCard, Receipt, FileText, Plus, Search, Calendar, Play, 
  Activity, ArrowUpRight, ArrowDownRight, CheckCircle, AlertTriangle, TrendingUp, DollarSign, Wallet, Trash2,
  FileSpreadsheet
} from 'lucide-react';
import { PageGuidance } from '../components/PageGuidance';

// Import subcomponents
import FeeStructures from './FeeStructures';
import StudentFees from './StudentFees';
import PayrollRuns from './PayrollRuns';
import SalaryStructures from './SalaryStructures';

interface Expense {
  id: string;
  date: string;
  category: 'Utilities' | 'Stationery' | 'Salaries' | 'Transport' | 'Maintenance' | 'Others';
  description: string;
  amount: number;
  payment_method: 'Cash' | 'Bank Transfer' | 'Cheque' | 'UPI';
  recorded_by: string;
  status: 'PAID' | 'PENDING';
}

const DEFAULT_EXPENSES: Expense[] = [
  { id: '1', date: (new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString().split('T')[0] || ''), category: 'Utilities', description: 'Electricity Bill - June 2026', amount: 14200, payment_method: 'Bank Transfer', recorded_by: 'Admin', status: 'PAID' },
  { id: '2', date: (new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString().split('T')[0] || ''), category: 'Stationery', description: 'Exam Printing Papers & Chalks', amount: 3500, payment_method: 'Cash', recorded_by: 'Accountant', status: 'PAID' },
  { id: '3', date: (new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString().split('T')[0] || ''), category: 'Maintenance', description: 'Air Conditioner Servicing', amount: 8800, payment_method: 'UPI', recorded_by: 'Admin', status: 'PAID' },
  { id: '4', date: (new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString().split('T')[0] || ''), category: 'Transport', description: 'School Bus Fuel', amount: 25000, payment_method: 'Bank Transfer', recorded_by: 'Driver Coordinator', status: 'PAID' },
  { id: '5', date: (new Date(Date.now() - 12 * 24 * 3600 * 1000).toISOString().split('T')[0] || ''), category: 'Others', description: 'Office Water Can Delivery', amount: 1200, payment_method: 'Cash', recorded_by: 'Accountant', status: 'PAID' }
];

export default function Finance() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const activeTab = searchParams.get('tab') || 'overview';
  const { user } = useAuth();

  const roles: string[] = user?.roles || (user?.role ? [user.role] : []);
  const permissions: string[] = user?.permissions || [];
  const canManageSalary = hasAnyRole(roles, ['super_admin', 'admin', 'Principal']);
  const canManageFees = hasAnyPermission(permissions, ['fees.collect']) ||
    hasAnyRole(roles, ['super_admin', 'admin', 'Principal', 'HOD', 'Accountant']);
  const canManageExpenses = canManageFees;
  const canViewFinanceOverview = canManageFees || canManageSalary || canManageExpenses;

  // Overall Financial States
  const [loading, setLoading] = useState(true);
  const [feeRate, setFeeRate] = useState(84);
  const [totalCollectedFee, setTotalCollectedFee] = useState(0);
  const [totalOutstandingFee, setTotalOutstandingFee] = useState(0);
  const [monthlyPayrollSum, setMonthlyPayrollSum] = useState(480000);
  const [todayCollections, setTodayCollections] = useState(68000);
  
  // Expenses Ledger state (backed by localStorage)
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expenseSearchQuery, setExpenseSearchQuery] = useState('');
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState('All');
  const [expensePaymentFilter, setExpensePaymentFilter] = useState('All');
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    category: 'Utilities' as any,
    description: '',
    amount: '',
    payment_method: 'UPI' as any,
    status: 'PAID' as any
  });
  const [submittingExpense, setSubmittingExpense] = useState(false);

  const handleTabChange = (tab: string) => {
    setSearchParams({ tab });
  };

  useEffect(() => {
    const allowedTabs = [
      ...(canViewFinanceOverview ? ['overview'] : []),
      'collection',
      ...(canManageFees ? ['structures', 'expenses'] : []),
      ...(canManageSalary ? ['salary-structures', 'payroll'] : [])
    ];
    if (!allowedTabs.includes(activeTab)) {
      setSearchParams({ tab: allowedTabs[0] || 'collection' }, { replace: true });
    }
  }, [activeTab, canManageFees, canManageSalary, canViewFinanceOverview, setSearchParams]);

  useEffect(() => {
    if (canViewFinanceOverview) {
      fetchFinancialSummary();
    } else {
      setLoading(false);
    }
  }, [canViewFinanceOverview]);

  const fetchFinancialSummary = async () => {
    if (!canViewFinanceOverview) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // Fetch fee records to compute collection rates
      const records = await api.get('/fees/student-records').catch(() => []);
      const total = records.reduce((acc: number, curr: any) => acc + (curr.total_amount || 0), 0);
      const paid = records.reduce((acc: number, curr: any) => acc + (curr.paid_amount || 0), 0);
      
      if (total > 0) {
        setFeeRate(Math.round((paid / total) * 100));
        setTotalCollectedFee(paid);
        setTotalOutstandingFee(total - paid);
      }

      // Fetch latest payroll runs
      if (canManageSalary) {
        const runs = await api.get('/payroll/runs').catch(() => []);
        if (runs && runs.length > 0) {
          const latest = runs[0];
          setMonthlyPayrollSum(latest.total_net || 480000);
        }
      }

      // Calculate today's fee collections
      const todayStr = new Date().toISOString().split('T')[0];
      const payments = canManageFees ? await api.get('/fees/payments').catch(() => []) : [];
      const todayPayments = payments
        .filter((p: any) => p.payment_date && p.payment_date.startsWith(todayStr))
        .reduce((acc: number, curr: any) => acc + (curr.amount || 0), 0);

      setTodayCollections(todayPayments);

      // Load expenses from backend
      if (canManageExpenses) {
        const backendExpenses = await api.get('/fees/expenses').catch(() => []);
        setExpenses(backendExpenses || []);
      }

    } catch (e) {
      console.error('Error fetching financial summary:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageExpenses) return;
    if (!expenseForm.description || !expenseForm.amount || Number(expenseForm.amount) <= 0) {
      alert('Please fill out all fields with valid data.');
      return;
    }
    setSubmittingExpense(true);
    try {
      const payload = {
        date: new Date().toISOString().split('T')[0],
        category: expenseForm.category,
        description: expenseForm.description,
        amount: Number(expenseForm.amount),
        payment_method: expenseForm.payment_method,
        recorded_by: user?.name || 'Accountant',
        status: expenseForm.status
      };

      await api.post('/fees/expenses', payload);
      await fetchFinancialSummary();
      setShowExpenseModal(false);
      setExpenseForm({ category: 'Utilities', description: '', amount: '', payment_method: 'UPI', status: 'PAID' });
      alert('Expense recorded successfully!');
    } catch (err: any) {
      alert(err.message || 'Failed to record expense.');
    } finally {
      setSubmittingExpense(false);
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!canManageExpenses) return;
    if (!confirm('Are you sure you want to delete this expense?')) return;
    try {
      await api.delete(`/fees/expenses/${expenseId}`);
      await fetchFinancialSummary();
    } catch (err: any) {
      alert(err.message || 'Failed to delete expense.');
    }
  };

  const filteredExpenses = expenses.filter(exp => {
    const matchesSearch = exp.description.toLowerCase().includes(expenseSearchQuery.toLowerCase()) ||
                          (exp.recorded_by || '').toLowerCase().includes(expenseSearchQuery.toLowerCase());
    const matchesCategory = expenseCategoryFilter === 'All' || exp.category === expenseCategoryFilter;
    const matchesPayment = expensePaymentFilter === 'All' || exp.payment_method === expensePaymentFilter;
    return matchesSearch && matchesCategory && matchesPayment;
  });

  // Math helper
  const totalExpensesSum = expenses.reduce((acc, curr) => acc + curr.amount, 0);
  const netSurplus = totalCollectedFee - (totalExpensesSum + monthlyPayrollSum);

  return (
    <Layout>
      <PageGuidance
        title="Finance Workspace"
        description="Configure fee structures, log payments, monitor operational expenses, and process staff payroll."
        steps={[
          "Click \"Fee Structures\" to configure billing heads for class levels.",
          "Use \"Fee Collection\" to record UPI or cash receipts for student accounts.",
          "Track office utility or stationery bills inside the \"Expenses\" ledger."
        ]}
      />

      {/* Header */}
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h2>Finance Workspace</h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            Manage fee structures, collection logs, staff payroll runs, and operating expenses.
          </p>
        </div>
      </div>

      {/* Summary Card */}
      {canViewFinanceOverview && (
      <div className="card summary-card" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.5rem', background: 'var(--bg-card)', borderLeft: '4px solid var(--primary)', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '1.15rem', fontWeight: '700', color: 'var(--text-main)' }}>Finance Action Center</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
              Fiscal Year: 2026-27 &bull; Mode: Dual Ledger (Accrual/Cash)
            </div>
          </div>
          <div style={{ display: 'flex', gap: '2.5rem', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700', letterSpacing: '0.05em' }}>Fees Collected</div>
              <div style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--success)' }}>{feeRate}%</div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700', letterSpacing: '0.05em' }}>Monthly Payroll</div>
              <div style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-main)' }}>₹{(monthlyPayrollSum / 100000).toFixed(1)}L</div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700', letterSpacing: '0.05em' }}>Today's Collections</div>
              <div style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--primary)' }}>₹{(todayCollections / 1000).toFixed(0)}k</div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700', letterSpacing: '0.05em' }}>Total Expenses</div>
              <div style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--danger)' }}>₹{(totalExpensesSum / 1000).toFixed(0)}k</div>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Quick Actions Panel */}
      {(canManageFees || canManageSalary || canManageExpenses) && (
      <div className="card quick-actions-panel" style={{ padding: '0.75rem 1rem', marginBottom: '1.5rem', background: 'var(--bg-subtle)', display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-secondary)', marginRight: '0.5rem', letterSpacing: '0.05em' }}>Quick Actions:</span>
        {canManageFees && (
          <>
            <button className="btn btn-secondary" onClick={() => { handleTabChange('collection'); navigate('?tab=collection'); }} style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', height: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
              <IndianRupee size={13} /> Collect Student Fee
            </button>
            <button className="btn btn-secondary" onClick={() => { handleTabChange('structures'); navigate('?tab=structures'); }} style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', height: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
              <Plus size={13} /> Add Fee Structure
            </button>
          </>
        )}
        {canManageExpenses && (
          <button className="btn btn-secondary" onClick={() => setShowExpenseModal(true)} style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', height: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
            <Plus size={13} /> Record Expense Bill
          </button>
        )}
        {canManageSalary && (
          <>
            <button className="btn btn-secondary" onClick={() => { handleTabChange('payroll'); navigate('?tab=payroll'); }} style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', height: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
              <Play size={13} /> Calculate Staff Payroll
            </button>
            <button className="btn btn-secondary" onClick={() => { handleTabChange('salary-structures'); navigate('?tab=salary-structures'); }} style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', height: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
              <FileSpreadsheet size={13} /> Manage Salary Structures
            </button>
          </>
        )}
      </div>
      )}

      {/* Workspace Navigation Tabs */}
      <div className="finance-tabs" style={{ display: 'flex', gap: '1.5rem', borderBottom: '1px solid var(--border)', marginBottom: '1.5rem' }}>
        {[
          ...(canViewFinanceOverview ? [{ tab: 'overview', label: 'Financial Overview', icon: Activity }] : []),
          ...(canManageFees ? [{ tab: 'structures', label: 'Fee Structures', icon: Landmark }] : []),
          { tab: 'collection', label: 'Fee Collection Register', icon: CreditCard },
          ...(canManageExpenses ? [{ tab: 'expenses', label: `Operating Expenses (${expenses.length})`, icon: Wallet }] : []),
          ...(canManageSalary ? [{ tab: 'salary-structures', label: 'Salary Structures', icon: FileSpreadsheet }] : []),
          ...(canManageSalary ? [{ tab: 'payroll', label: 'Payroll Processing', icon: FileText }] : [])
        ].map(t => {
          const Icon = t.icon;
          const isActive = activeTab === t.tab;
          return (
            <button
              key={t.tab}
              type="button"
              onClick={() => handleTabChange(t.tab)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 0.25rem',
                border: 'none',
                background: 'none',
                borderBottom: isActive ? '3px solid var(--primary)' : '3px solid transparent',
                color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: isActive ? 700 : 400,
                cursor: 'pointer',
                fontSize: '0.9rem',
                transition: 'all 0.2s ease'
              }}
            >
              <Icon size={15} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      <div className="finance-tab-content">
        
        {/* 1. FINANCIAL OVERVIEW TAB */}
        {activeTab === 'overview' && canViewFinanceOverview && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Visual KPI Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
              
              {/* Card 1: Fee Collection Rate */}
              <div className="card" style={{ padding: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--success-soft)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <TrendingUp size={22} />
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '600' }}>Gross Fee Collection</span>
                  <div style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-main)', marginTop: '0.15rem' }}>₹{totalCollectedFee.toLocaleString('en-IN')}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>Outstanding: ₹{totalOutstandingFee.toLocaleString('en-IN')}</div>
                </div>
              </div>

              {/* Card 2: Operating Expenses */}
              <div className="card" style={{ padding: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--danger-soft)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Wallet size={22} />
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '600' }}>Operating Expenditures</span>
                  <div style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-main)', marginTop: '0.15rem' }}>₹{totalExpensesSum.toLocaleString('en-IN')}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>Recorded items: {expenses.length} bills</div>
                </div>
              </div>

              {/* Card 3: Staff Salaries */}
              <div className="card" style={{ padding: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--primary-soft)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileText size={22} />
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '600' }}>Active Monthly Payroll</span>
                  <div style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-main)', marginTop: '0.15rem' }}>₹{monthlyPayrollSum.toLocaleString('en-IN')}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>Calculated for all active teachers</div>
                </div>
              </div>
            </div>

            {/* Visual Net Margins Visualizer */}
            <div className="card" style={{ padding: '1.5rem' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-main)', marginBottom: '1rem' }}>Net Operating Balance (Collections vs Liabilities)</h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem', alignItems: 'center' }}>
                <div style={{ textAlign: 'center', padding: '1rem', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '600' }}>Net Profit Surplus</div>
                  <div style={{ fontSize: '2rem', fontWeight: '800', color: netSurplus >= 0 ? 'var(--success)' : 'var(--danger)', marginTop: '0.25rem' }}>
                    {netSurplus >= 0 ? '+' : ''}₹{netSurplus.toLocaleString('en-IN')}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Gross minus expenses & payroll</div>
                </div>

                <div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                        <span>Total Revenue (Fee Collection)</span>
                        <strong>100%</strong>
                      </div>
                      <div style={{ height: '8px', background: 'var(--bg-subtle)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: '100%', height: '100%', background: 'var(--success)' }} />
                      </div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                        <span>Total Expenses (Operating + Payroll)</span>
                        <strong>{Math.round(((totalExpensesSum + monthlyPayrollSum) / Math.max(1, totalCollectedFee)) * 100)}%</strong>
                      </div>
                      <div style={{ height: '8px', background: 'var(--bg-subtle)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(100, ((totalExpensesSum + monthlyPayrollSum) / Math.max(1, totalCollectedFee)) * 100)}%`, height: '100%', background: 'var(--danger)' }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* List of Recent Transactions */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              {/* Recent Expenses List */}
              <div className="card" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-main)' }}>Recent Expenses Ledger</h4>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }} onClick={() => handleTabChange('expenses')} className="hover-underline cursor-pointer">View All</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {expenses.slice(0, 3).map(exp => (
                    <div key={exp.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '0.85rem' }}>{exp.description}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>{exp.category} &bull; {new Date(exp.date).toLocaleDateString()}</div>
                      </div>
                      <div style={{ fontWeight: '700', color: 'var(--danger)' }}>-₹{exp.amount.toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Fee Payments */}
              <div className="card" style={{ padding: '1.25rem' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '1.5rem' }}>Payment Ledger Info</h4>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', background: 'var(--primary-soft)', color: 'var(--primary)', border: '1px solid var(--primary-border)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
                  <Activity size={16} style={{ flexShrink: 0, marginTop: '0.1rem' }} />
                  <div>
                    Click on the <strong>Fee Collection Register</strong> tab above to search students, view full billing accounts, concession requests, or split payments into installments.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. FEE STRUCTURES TAB */}
        {activeTab === 'structures' && canManageFees && (
          <FeeStructures isSubComponent={true} />
        )}

        {/* 3. FEE COLLECTION TAB */}
        {activeTab === 'collection' && (
          <StudentFees isSubComponent={true} />
        )}

        {/* 4. OPERATING EXPENSES TAB */}
        {activeTab === 'expenses' && canManageExpenses && (
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-main)' }}>Operating Expenditures Ledger</h4>
              {canManageExpenses && (
                <button className="btn btn-primary" onClick={() => setShowExpenseModal(true)}>
                  <Plus size={15} /> Record Expense
                </button>
              )}
            </div>

            {/* Expense Filters Bar */}
            <div className="filters" style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', padding: '0.5rem 0' }}>
              <div className="search-container" style={{ flex: 1, maxWidth: '280px' }}>
                <Search size={14} />
                <input
                  type="text"
                  placeholder="Search expense description..."
                  value={expenseSearchQuery}
                  onChange={e => setExpenseSearchQuery(e.target.value)}
                />
              </div>

              <div>
                <select
                  value={expenseCategoryFilter}
                  onChange={e => setExpenseCategoryFilter(e.target.value)}
                  className="input"
                  style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem', cursor: 'pointer', height: 'auto', minWidth: '150px' }}
                >
                  <option value="All">All Categories</option>
                  <option value="Utilities">Utilities</option>
                  <option value="Stationery">Stationery</option>
                  <option value="Salaries">Salaries</option>
                  <option value="Transport">Transport</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Others">Others</option>
                </select>
              </div>

              <div>
                <select
                  value={expensePaymentFilter}
                  onChange={e => setExpensePaymentFilter(e.target.value)}
                  className="input"
                  style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem', cursor: 'pointer', height: 'auto', minWidth: '150px' }}
                >
                  <option value="All">All Payment Methods</option>
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cheque">Cheque</option>
                  <option value="UPI">UPI</option>
                </select>
              </div>
            </div>

            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ textAlign: 'left', padding: '0.5rem' }}>Date</th>
                  <th style={{ textAlign: 'left', padding: '0.5rem' }}>Category</th>
                  <th style={{ textAlign: 'left', padding: '0.5rem' }}>Item Description</th>
                  <th style={{ textAlign: 'left', padding: '0.5rem' }}>Payment Method</th>
                  <th style={{ textAlign: 'right', padding: '0.5rem' }}>Amount</th>
                  <th style={{ textAlign: 'right', padding: '0.5rem', width: '80px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map(exp => (
                  <tr key={exp.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '0.65rem 0.5rem' }}><code>{new Date(exp.date).toLocaleDateString()}</code></td>
                    <td style={{ padding: '0.65rem 0.5rem' }}>
                      <span className="badge" style={{ fontSize: '0.75rem' }}>{exp.category}</span>
                    </td>
                    <td style={{ padding: '0.65rem 0.5rem', fontWeight: '600', color: 'var(--text-main)' }}>{exp.description}</td>
                    <td style={{ padding: '0.65rem 0.5rem' }}>{exp.payment_method}</td>
                    <td style={{ padding: '0.65rem 0.5rem', textAlign: 'right', fontWeight: '700', color: 'var(--danger)' }}>₹{exp.amount.toLocaleString()}</td>
                    <td style={{ padding: '0.65rem 0.5rem', textAlign: 'right' }}>
                      {canManageExpenses && (
                        <button className="btn btn-danger" style={{ padding: '0.2rem 0.4rem', height: 'auto' }} onClick={() => handleDeleteExpense(exp.id)}>
                          <Trash2 size={12} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredExpenses.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                      {expenses.length === 0 ? "No expenses recorded." : "No expenses match the selected filters."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* 4.5. SALARY STRUCTURES TAB */}
        {activeTab === 'salary-structures' && canManageSalary && (
          <SalaryStructures isSubComponent={true} />
        )}

        {/* 5. PAYROLL PROCESSING TAB */}
        {activeTab === 'payroll' && canManageSalary && (
          <PayrollRuns isSubComponent={true} />
        )}
      </div>

      {/* --- RECORD EXPENSE MODAL --- */}
      {showExpenseModal && canManageExpenses && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.40)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card modal-content" style={{ width: '420px', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '1rem' }}>Record Operational Expense</h3>
            <form onSubmit={handleAddExpense} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-secondary)' }}>Expense Category</label>
                <select 
                  value={expenseForm.category} 
                  onChange={e => setExpenseForm({ ...expenseForm, category: e.target.value as any })}
                  className="input"
                >
                  <option value="Utilities">Utilities (Power, Water)</option>
                  <option value="Stationery">Stationery & Office Papers</option>
                  <option value="Salaries">Salaries (Contract / Extra duty)</option>
                  <option value="Transport">Transport (Fuel, Maintenance)</option>
                  <option value="Maintenance">Maintenance & Repairs</option>
                  <option value="Others">Others</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-secondary)' }}>Item Description *</label>
                <input 
                  type="text" 
                  value={expenseForm.description} 
                  onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })} 
                  className="input"
                  placeholder="e.g. Electric Bill June"
                  required 
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-secondary)' }}>Amount (INR) *</label>
                  <input 
                    type="number" 
                    value={expenseForm.amount} 
                    onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })} 
                    className="input"
                    placeholder="e.g. 5000"
                    min="1"
                    required 
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-secondary)' }}>Payment Method</label>
                  <select 
                    value={expenseForm.payment_method} 
                    onChange={e => setExpenseForm({ ...expenseForm, payment_method: e.target.value as any })}
                    className="input"
                  >
                    <option value="UPI">UPI</option>
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowExpenseModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submittingExpense}>
                  {submittingExpense ? 'Saving...' : 'Record Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </Layout>
  );
}
