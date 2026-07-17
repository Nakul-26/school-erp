import './PayrollRuns.css';
import React, { useEffect, useState } from 'react';
import { PageGuidance } from '../components/PageGuidance';
import Layout from '../components/Layout';
import { api } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { Landmark, Calendar, Play, Trash2, FileSpreadsheet } from 'lucide-react';

interface PayrollRun {
  id: string;
  month: number;
  year: number;
  status: 'Draft' | 'Finalized';
  total_gross: number;
  total_net: number;
  created_at: string;
}

export default function PayrollRuns({ isSubComponent = false }: { isSubComponent?: boolean }) {
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const navigate = useNavigate();

  const userStr = localStorage.getItem('erp_user');
  const user = userStr ? JSON.parse(userStr) : null;
  const roles: string[] = user?.roles || (user?.role ? [user.role] : []);
  const normalizedRoles = roles.map(r => r.toLowerCase().replace(' ', '_').replace('role-', ''));
  const canManageSalary = normalizedRoles.some(r => ['super_admin', 'admin', 'principal'].includes(r));

  const [form, setForm] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  });

  useEffect(() => {
    fetchPayrollRuns();
  }, []);

  const fetchPayrollRuns = async () => {
    try {
      setLoading(true);
      const data = await api.get('/payroll/runs');
      setRuns(data);
    } catch (err) {
      console.error('Error fetching payroll runs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setGenerating(true);
      const res = await api.post('/payroll/runs', form);
      alert('Payroll run generated successfully!');
      fetchPayrollRuns();
      navigate(`/payroll/runs/${res.id}`);
    } catch (err: any) {
      alert(err.message || 'Failed to generate payroll');
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteRun = async (id: string, month: number, year: number) => {
    if (!confirm(`Are you sure you want to delete the payroll run for ${getMonthName(month)} ${year}? All calculated payslips for this month will be removed.`)) {
      return;
    }
    try {
      setLoading(true);
      await api.delete(`/payroll/runs/${id}`);
      alert('Payroll run deleted successfully.');
      fetchPayrollRuns();
    } catch (err: any) {
      alert(err.message || 'Failed to delete payroll run');
      setLoading(false);
    }
  };

  const getMonthName = (monthNum: number) => {
    const dates = new Date(2000, monthNum - 1, 1);
    return dates.toLocaleString('default', { month: 'long' });
  };

  const content = (
    <>
      {!isSubComponent && (
        <PageGuidance
          title="Payroll Process"
          description="Use this page to calculate monthly salaries for teachers and staff. Select the month and year, then click **Calculate Payroll**. The system automatically considers attendance, approved leaves, and salary settings before generating payslips."
          steps={["Select target Month and Year.","Click Calculate Monthly Payroll to compute earnings and apply LOP deductions.","Review calculation details and click Finalize & Release to publish payslips to teacher portals."]}
        />
      )}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2>Payroll Process Logs</h2>
          <p className="payroll-runs-text-1">
            Generate monthly salary ledgers and verify calculations with automated loss of pay (LOP) check.
          </p>
        </div>
        {canManageSalary && (
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={() => navigate('/payroll/salary-structures')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', padding: '0.5rem 0.75rem', height: 'auto' }}
          >
            <FileSpreadsheet size={14} /> Configure Salary Scales
          </button>
        )}
      </div>

      

      <div className="payroll-runs-grid-2">
        {/* Left Form card */}
        <div className="card payroll-runs-card">
          <h3 className="payroll-runs-title-4">Run New Payroll</h3>
          <form onSubmit={handleGenerate}>
            <div className="form-group">
              <label>Select Month</label>
              <select
                value={form.month}
                onChange={(e) => setForm({ ...form, month: Number(e.target.value) })}
                required
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <option key={m} value={m}>{getMonthName(m)}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Select Year</label>
              <select
                value={form.year}
                onChange={(e) => setForm({ ...form, year: Number(e.target.value) })}
                required
              >
                {[2025, 2026, 2027, 2028].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <button type="submit" className="btn btn-primary payroll-runs-btn" disabled={generating}>
              <Play size={16} className="payroll-runs-Play-6"  /> {generating ? 'Generating...' : 'Calculate Monthly Payroll'}
            </button>
          </form>
        </div>

        {/* Right runs history card */}
        <div className="card payroll-runs-card">
          <h3 className="payroll-runs-title-8">Run Logs History</h3>
          {loading ? <p>Loading history...</p> : (
            <table className="table">
              <thead>
                <tr>
                  <th>Billing Month</th>
                  <th>Total Gross</th>
                  <th>Total Net</th>
                  <th>Status</th>
                  <th className="payroll-runs-th-9">Actions</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div className="payroll-runs-row-10">
                        <Calendar size={16} className="payroll-runs-Calendar-11"  />
                        <strong>{getMonthName(r.month)} {r.year}</strong>
                      </div>
                    </td>
                    <td>₹{r.total_gross.toLocaleString('en-IN')}</td>
                    <td>₹{r.total_net.toLocaleString('en-IN')}</td>
                    <td>
                      <span className={`badge ${r.status === 'Finalized' ? 'badge-success' : 'badge-warning'}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="payroll-runs-td-12">
                      <div className="payroll-runs-actions">
                        <button className="btn btn-sm btn-outline" onClick={() => navigate(`/payroll/runs/${r.id}`)}>
                          View Payslips
                        </button>
                        <button className="btn btn-sm btn-outline payroll-runs-btn-delete" onClick={() => handleDeleteRun(r.id, r.month, r.year)}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {runs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="payroll-runs-td-13">
                      <Landmark size={32} className="payroll-runs-Landmark-14"  />
                      <p>No payroll runs found. Initiate your first run from the form on the left.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );

  if (isSubComponent) return content;
  return <Layout>{content}</Layout>;
}
