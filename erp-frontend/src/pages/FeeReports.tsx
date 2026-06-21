import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { api } from '../services/api';
import { 
  BarChart3, IndianRupee, Clock, AlertTriangle, 
  TrendingUp, Users, Calendar 
} from 'lucide-react';

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

export default function FeeReports() {
  const [stats, setStats] = useState<SummaryStats>({
    totalCollected: 0,
    totalPending: 0,
    totalOverdue: 0
  });
  const [monthly, setMonthly] = useState<MonthlyRow[]>([]);
  const [defaulters, setDefaulters] = useState<DefaulterRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const [statsData, monthlyData, defaultersData] = await Promise.all([
        api.get('/fees/reports/summary'),
        api.get('/fees/reports/monthly'),
        api.get('/fees/reports/defaulters')
      ]);

      setStats(statsData);
      setMonthly(monthlyData);
      setDefaulters(defaultersData);
    } catch (err) {
      console.error('Error fetching fee reports:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h2>Financial Reports & Analytics</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Monitor fee collection trends, monthly revenues, and outstanding defaults
          </p>
        </div>
      </div>

      {loading ? <p>Loading reports...</p> : (
        <>
          {/* STATS TILES */}
          <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            <div className="stat-card card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem' }}>
              <div className="icon" style={{ background: '#f6ffed', color: '#52c41a', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IndianRupee size={24} /></div>
              <div className="info">
                <h3 style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>Total Collected</h3>
                <div className="value" style={{ fontSize: '1.5rem', fontWeight: 'bold', marginTop: '0.25rem', color: 'var(--success)' }}>
                  ₹{stats.totalCollected.toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            <div className="stat-card card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem' }}>
              <div className="icon" style={{ background: '#fff7e6', color: '#fa8c16', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Clock size={24} /></div>
              <div className="info">
                <h3 style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>Pending Liabilities</h3>
                <div className="value" style={{ fontSize: '1.5rem', fontWeight: 'bold', marginTop: '0.25rem', color: 'var(--warning)' }}>
                  ₹{stats.totalPending.toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            <div className="stat-card card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem' }}>
              <div className="icon" style={{ background: '#fff1f0', color: '#f5222d', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><AlertTriangle size={24} /></div>
              <div className="info">
                <h3 style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>Overdue Amount</h3>
                <div className="value" style={{ fontSize: '1.5rem', fontWeight: 'bold', marginTop: '0.25rem', color: '#f5222d' }}>
                  ₹{stats.totalOverdue.toLocaleString('en-IN')}
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            {/* MONTHLY REVENUE */}
            <div className="card">
              <h3 style={{ marginBottom: '1.25rem', fontSize: '1.1rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <TrendingUp size={18} /> Monthly Collection Trends
              </h3>
              {monthly.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No payments logged yet.</p>
              ) : (
                <table className="table" style={{ minWidth: 'auto' }}>
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th style={{ textAlign: 'right' }}>Total Collected</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthly.map((row) => (
                      <tr key={row.month}>
                        <td><strong>{row.month}</strong></td>
                        <td style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--success)' }}>
                          ₹{row.amount.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* TOP DEFAULTERS */}
            <div className="card">
              <h3 style={{ marginBottom: '1.25rem', fontSize: '1.1rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Users size={18} style={{ color: '#f5222d' }} /> Top Dues Outstanding
              </h3>
              {defaulters.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No pending dues found in the ledger.</p>
              ) : (
                <table className="table" style={{ minWidth: 'auto' }}>
                  <thead>
                    <tr>
                      <th>Admission No</th>
                      <th>Student</th>
                      <th>Program</th>
                      <th style={{ textAlign: 'right' }}>Dues Outstanding</th>
                    </tr>
                  </thead>
                  <tbody>
                    {defaulters.map((row) => (
                      <tr key={row.student_id}>
                        <td><strong>{row.admission_number}</strong></td>
                        <td>{row.first_name} {row.last_name}</td>
                        <td>{row.course_name}</td>
                        <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#f5222d' }}>
                          ₹{row.pending_amount.toLocaleString('en-IN')}
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
    </Layout>
  );
}
