import React, { useEffect, useState } from 'react';
import { PageGuidance } from '../components/PageGuidance';
import Layout from '../components/Layout';
import { api } from '../services/api';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Printer, FileText } from 'lucide-react';

interface PayrollRun {
  id: string;
  month: number;
  year: number;
  status: 'Draft' | 'Finalized';
  total_gross: number;
  total_net: number;
}

interface Payslip {
  id: string;
  teacher_id: string;
  first_name: string;
  last_name: string;
  employee_id: string;
  designation: string;
  working_days: number;
  present_days: number;
  leave_days: number;
  lop_days: number;
  basic_salary: number;
  da: number;
  hra: number;
  other_allowances: number;
  gross_salary: number;
  pf_deduction: number;
  tds_deduction: number;
  lop_deduction: number;
  other_deductions: number;
  net_salary: number;
}

export default function PayrollRunDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [run, setRun] = useState<PayrollRun | null>(null);
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(true);
  const [finalizing, setFinalizing] = useState(false);

  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);
  const [showSlipModal, setShowSlipModal] = useState(false);

  useEffect(() => {
    fetchRunDetail();
  }, [id]);

  const fetchRunDetail = async () => {
    try {
      setLoading(true);
      const data = await api.get(`/payroll/runs/${id}`);
      setRun(data.run);
      setPayslips(data.payslips);
    } catch (err) {
      console.error('Error loading run detail:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFinalize = async () => {
    if (!confirm('Are you sure you want to finalize this payroll run? This will lock calculations and release payslips to teacher portals.')) {
      return;
    }
    try {
      setFinalizing(true);
      await api.patch(`/payroll/runs/${id}/finalize`, {});
      alert('Payroll run finalized successfully!');
      fetchRunDetail();
    } catch (err) {
      alert('Failed to finalize payroll');
    } finally {
      setFinalizing(false);
    }
  };

  const handleOpenPayslip = (slip: Payslip) => {
    setSelectedPayslip(slip);
    setShowSlipModal(true);
  };

  const getMonthName = (monthNum: number) => {
    const dates = new Date(2000, monthNum - 1, 1);
    return dates.toLocaleString('default', { month: 'long' });
  };

  return (
    <Layout>
      <PageGuidance
        title="Payroll Calculations"
        description="Use this page to inspect individual payslip details calculated for a specific month and release them."
        steps={["View salary breakdowns, allowances, and deductions per teacher.","Click View next to any teacher to open and inspect their payslip advice.","Click Finalize & Release to publish the payslips to teachers."]}
      />
      <div className="page-header no-print">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="btn btn-secondary" style={{ padding: '0.5rem' }} onClick={() => navigate('/payroll/runs')}>
            <ArrowLeft size={18} />
          </button>
          {run && (
            <div>
              <h2>Payroll: {getMonthName(run.month)} {run.year}</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                Run status: <span className={`badge ${run.status === 'Finalized' ? 'badge-success' : 'badge-warning'}`}>{run.status}</span> | Gross billing: ₹{run.total_gross.toLocaleString('en-IN')}
              </p>
            </div>
          )}
        </div>
        {run && run.status === 'Draft' && (
          <button className="btn btn-success" onClick={handleFinalize} disabled={finalizing}>
            <Check size={16} style={{ marginRight: '0.25rem' }} /> Finalize & Release
          </button>
        )}
      </div>

      

      <div className="card no-print" style={{ padding: '1.5rem' }}>
        {loading ? <p>Loading run details...</p> : (
          <table className="table">
            <thead>
              <tr>
                <th>Emp ID</th>
                <th>Staff Name</th>
                <th>Designation</th>
                <th>Working Days</th>
                <th>LOP Days</th>
                <th>Gross Salary</th>
                <th>Deductions (incl LOP)</th>
                <th>Net Salary</th>
                <th style={{ textAlign: 'right' }}>Slip</th>
              </tr>
            </thead>
            <tbody>
              {payslips.map((p) => {
                const totalDeductions = p.pf_deduction + p.tds_deduction + p.lop_deduction + p.other_deductions;
                return (
                  <tr key={p.id}>
                    <td><strong>{p.employee_id}</strong></td>
                    <td><strong>{p.first_name} {p.last_name}</strong></td>
                    <td>{p.designation}</td>
                    <td>{p.working_days} days</td>
                    <td>
                      <span style={{ color: p.lop_days > 0 ? 'var(--danger)' : '' }}>
                        {p.lop_days} days
                      </span>
                    </td>
                    <td>₹{p.gross_salary.toLocaleString('en-IN')}</td>
                    <td>₹{totalDeductions.toLocaleString('en-IN')}</td>
                    <td><strong>₹{p.net_salary.toLocaleString('en-IN')}</strong></td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-sm btn-outline" onClick={() => handleOpenPayslip(p)}>
                        <Printer size={12} /> View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showSlipModal && selectedPayslip && run && (
        <div className="modal-overlay no-print" onClick={() => { setShowSlipModal(false); setSelectedPayslip(null); }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '750px', width: '90%' }}>
            <div className="modal-header">
              <h3>Salary Payslip Preview</h3>
              <button onClick={() => { setShowSlipModal(false); setSelectedPayslip(null); }}>✕</button>
            </div>
            <div className="modal-body">
              <div id="printable-payslip" style={{ padding: '2rem', backgroundColor: '#fff', color: '#000', fontFamily: 'monospace', border: '1px solid #000' }}>
                <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: '1rem', marginBottom: '1rem' }}>
                  <h2 style={{ margin: 0, textTransform: 'uppercase' }}>Payslip Advice</h2>
                  <h3 style={{ margin: '0.25rem 0 0 0', fontWeight: 'normal' }}>Education Institution Name</h3>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem' }}>Salary statement for {getMonthName(run.month)} {run.year}</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                  <div>
                    <p style={{ margin: '0.25rem 0' }}><strong>Employee Name:</strong> {selectedPayslip.first_name} {selectedPayslip.last_name}</p>
                    <p style={{ margin: '0.25rem 0' }}><strong>Employee ID:</strong> {selectedPayslip.employee_id}</p>
                    <p style={{ margin: '0.25rem 0' }}><strong>Designation:</strong> {selectedPayslip.designation}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ margin: '0.25rem 0' }}><strong>Working Days:</strong> {selectedPayslip.working_days}</p>
                    <p style={{ margin: '0.25rem 0' }}><strong>Present Days:</strong> {selectedPayslip.present_days}</p>
                    <p style={{ margin: '0.25rem 0' }}><strong>LOP Days:</strong> {selectedPayslip.lop_days}</p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '1.5rem' }}>
                  {/* Earnings */}
                  <div style={{ border: '1px solid #000', padding: '0.75rem' }}>
                    <h4 style={{ margin: '0 0 0.5rem 0', borderBottom: '1px solid #000', paddingBottom: '0.25rem' }}>EARNINGS</h4>
                    <div style={{ display: 'flex', justifyContent: 'space-between', margin: '0.25rem 0' }}><span>Basic Salary</span><span>₹{selectedPayslip.basic_salary.toLocaleString('en-IN')}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', margin: '0.25rem 0' }}><span>Dearness Allowance (DA)</span><span>₹{selectedPayslip.da.toLocaleString('en-IN')}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', margin: '0.25rem 0' }}><span>House Rent Allowance (HRA)</span><span>₹{selectedPayslip.hra.toLocaleString('en-IN')}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', margin: '0.25rem 0' }}><span>Other Allowances</span><span>₹{selectedPayslip.other_allowances.toLocaleString('en-IN')}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', margin: '0.5rem 0 0 0', fontWeight: 'bold', borderTop: '1px solid #000', paddingTop: '0.25rem' }}>
                      <span>Gross Earnings</span>
                      <span>₹{selectedPayslip.gross_salary.toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  {/* Deductions */}
                  <div style={{ border: '1px solid #000', padding: '0.75rem' }}>
                    <h4 style={{ margin: '0 0 0.5rem 0', borderBottom: '1px solid #000', paddingBottom: '0.25rem' }}>DEDUCTIONS</h4>
                    <div style={{ display: 'flex', justifyContent: 'space-between', margin: '0.25rem 0' }}><span>Provident Fund (PF)</span><span>₹{selectedPayslip.pf_deduction.toLocaleString('en-IN')}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', margin: '0.25rem 0' }}><span>Tax Withheld (TDS)</span><span>₹{selectedPayslip.tds_deduction.toLocaleString('en-IN')}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', margin: '0.25rem 0' }}><span style={{ color: selectedPayslip.lop_deduction > 0 ? 'var(--danger)' : '' }}>Loss of Pay (LOP)</span><span>₹{selectedPayslip.lop_deduction.toLocaleString('en-IN')}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', margin: '0.25rem 0' }}><span>Other Deductions</span><span>₹{selectedPayslip.other_deductions.toLocaleString('en-IN')}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', margin: '0.5rem 0 0 0', fontWeight: 'bold', borderTop: '1px solid #000', paddingTop: '0.25rem' }}>
                      <span>Total Deductions</span>
                      <span>₹{(selectedPayslip.pf_deduction + selectedPayslip.tds_deduction + selectedPayslip.lop_deduction + selectedPayslip.other_deductions).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>

                <div style={{ border: '1.5px solid #000', padding: '1rem', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1.1rem' }}>
                  <span>NET SALARY PAYOUT</span>
                  <span>₹{selectedPayslip.net_salary.toLocaleString('en-IN')}</span>
                </div>

                <div style={{ marginTop: '3rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <div style={{ borderTop: '1px solid #000', width: '150px', textAlign: 'center', paddingTop: '0.25rem' }}>Employer Signature</div>
                  <div style={{ borderTop: '1px solid #000', width: '150px', textAlign: 'center', paddingTop: '0.25rem' }}>Employee Signature</div>
                </div>
              </div>
            </div>
            <div className="modal-footer no-print">
              <button className="btn btn-outline" onClick={() => { setShowSlipModal(false); setSelectedPayslip(null); }}>Close</button>
              <button className="btn btn-primary" onClick={() => window.print()}>Print Payslip</button>
            </div>
          </div>
        </div>
      )}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-payslip, #printable-payslip * {
            visibility: visible;
          }
          #printable-payslip {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </Layout>
  );
}
