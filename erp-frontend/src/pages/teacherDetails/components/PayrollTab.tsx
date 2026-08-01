import React from 'react';

interface PayrollTabProps {
  salaryStructure: any;
  basicSalary: number;
  da: number;
  hra: number;
  allowances: number;
  grossSalary: number;
  payslips: any[];
  isAdmin: boolean;
  onConfigureSalary: () => void;
  onViewPayslip: (slip: any) => void;
}

export function PayrollTab({
  salaryStructure, basicSalary, da, hra, allowances, grossSalary,
  payslips, isAdmin, onConfigureSalary, onViewPayslip,
}: PayrollTabProps) {
  return (
    <div className="card" style={{ padding: '1.25rem' }}>
      <h4 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-main)', marginBottom: '1.25rem' }}>Salary Structure & Payslip Archives</h4>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '1.5rem', alignItems: 'start' }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h5 style={{ fontWeight: '600', fontSize: '0.9rem', margin: 0 }}>Monthly Salary Structure</h5>
            {isAdmin && (
              <button
                onClick={onConfigureSalary}
                style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer', padding: 0 }}
              >
                Configure
              </button>
            )}
          </div>
          {salaryStructure ? (
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <tbody>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '0.5rem', color: 'var(--text-secondary)' }}>Basic Salary</td>
                  <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: '700' }}>₹{basicSalary.toLocaleString()}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '0.5rem', color: 'var(--text-secondary)' }}>DA (Dearness Allowance)</td>
                  <td style={{ padding: '0.5rem', textAlign: 'right' }}>₹{da.toLocaleString()}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '0.5rem', color: 'var(--text-secondary)' }}>HRA (House Rent Allowance)</td>
                  <td style={{ padding: '0.5rem', textAlign: 'right' }}>₹{hra.toLocaleString()}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '0.5rem', color: 'var(--text-secondary)' }}>Other Allowances</td>
                  <td style={{ padding: '0.5rem', textAlign: 'right' }}>₹{allowances.toLocaleString()}</td>
                </tr>
                <tr style={{ background: 'var(--bg-subtle)' }}>
                  <td style={{ padding: '0.65rem 0.5rem', fontWeight: '700' }}>Gross Monthly Salary</td>
                  <td style={{ padding: '0.65rem 0.5rem', textAlign: 'right', fontWeight: '800', color: 'var(--primary)' }}>₹{grossSalary.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          ) : (
            <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '1.25rem 1rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              <p style={{ margin: '0 0 0.5rem 0' }}>No active salary structure configured for this teacher yet.</p>
              {isAdmin && (
                <button
                  className="btn btn-sm btn-outline"
                  onClick={onConfigureSalary}
                  style={{ marginTop: '0.25rem' }}
                >
                  Set Up Salary
                </button>
              )}
            </div>
          )}
        </div>

        <div>
          <h5 style={{ fontWeight: '600', fontSize: '0.9rem', marginBottom: '0.75rem' }}>Issued Payslips List</h5>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ textAlign: 'left', padding: '0.5rem' }}>Month/Year</th>
                <th style={{ textAlign: 'center', padding: '0.5rem' }}>Days Present</th>
                <th style={{ textAlign: 'right', padding: '0.5rem' }}>Net Pay</th>
                <th style={{ textAlign: 'right', padding: '0.5rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {payslips.map(slip => (
                <tr key={slip.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '0.5rem' }}>{slip.month}/{slip.year}</td>
                  <td style={{ padding: '0.5rem', textAlign: 'center' }}>{slip.present_days} / {slip.working_days} days</td>
                  <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: '700' }}>₹{(slip.net_salary || 0).toLocaleString()}</td>
                  <td style={{ padding: '0.5rem', textAlign: 'right' }}>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '0.2rem 0.4rem', fontSize: '0.75rem', height: 'auto' }}
                      onClick={() => onViewPayslip(slip)}
                    >
                      View Slip
                    </button>
                  </td>
                </tr>
              ))}
              {payslips.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-secondary)' }}>No payslips generated for this teacher yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
