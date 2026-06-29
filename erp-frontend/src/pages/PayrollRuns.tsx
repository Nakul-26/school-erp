import React, { useEffect, useState } from 'react';
import { PageGuidance } from '../components/PageGuidance';
import Layout from '../components/Layout';
import { api } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { Landmark, Calendar, Play } from 'lucide-react';

interface PayrollRun {
  id: string;
  month: number;
  year: number;
  status: 'Draft' | 'Finalized';
  total_gross: number;
  total_net: number;
  created_at: string;
}

export default function PayrollRuns() {
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const navigate = useNavigate();

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

  const getMonthName = (monthNum: number) => {
    const dates = new Date(2000, monthNum - 1, 1);
    return dates.toLocaleString('default', { month: 'long' });
  };

  return (
    <Layout>
      <PageGuidance
        title="Payroll Process"
        description="Use this page to calculate monthly salaries for teachers and staff. Select the month and year, then click **Calculate Payroll**. The system automatically considers attendance, approved leaves, and salary settings before generating payslips."
        steps={["Select target Month and Year.","Click Calculate Monthly Payroll to compute earnings and apply LOP deductions.","Review calculation details and click Finalize & Release to publish payslips to teacher portals."]}
      />
      <div className="page-header">
        <div>
          <h2>Payroll Process Logs</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Generate monthly salary ledgers and verify calculations with automated loss of pay (LOP) check.
          </p>
        </div>
      </div>

      

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem' }}>
        {/* Left Form card */}
        <div className="card" style={{ padding: '1.5rem', height: 'fit-content' }}>
          <h3 style={{ marginBottom: '1rem', fontWeight: '800' }}>Run New Payroll</h3>
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

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={generating}>
              <Play size={16} style={{ marginRight: '0.25rem' }} /> {generating ? 'Generating...' : 'Calculate Monthly Payroll'}
            </button>
          </form>
        </div>

        {/* Right runs history card */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem', fontWeight: '800' }}>Run Logs History</h3>
          {loading ? <p>Loading history...</p> : (
            <table className="table">
              <thead>
                <tr>
                  <th>Billing Month</th>
                  <th>Total Gross</th>
                  <th>Total Net</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Calendar size={16} style={{ color: 'var(--primary)' }} />
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
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-sm btn-outline" onClick={() => navigate(`/payroll/runs/${r.id}`)}>
                        View Payslips
                      </button>
                    </td>
                  </tr>
                ))}
                {runs.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      <Landmark size={32} style={{ marginBottom: '0.5rem' }} />
                      <p>No payroll runs found. Initiate your first run from the form on the left.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Layout>
  );
}
