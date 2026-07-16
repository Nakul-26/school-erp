import './PayrollRunDetail.css';
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
        <div className="payroll-run-detail-row-1">
          <button className="btn btn-secondary payroll-run-detail-btn" onClick={() => navigate('/payroll/runs')}>
            <ArrowLeft size={18} />
          </button>
          {run && (
            <div>
              <h2>Payroll: {getMonthName(run.month)} {run.year}</h2>
              <p className="payroll-run-detail-text-3">
                Run status: <span className={`badge ${run.status === 'Finalized' ? 'badge-success' : 'badge-warning'}`}>{run.status}</span> | Gross billing: ₹{run.total_gross.toLocaleString('en-IN')}
              </p>
            </div>
          )}
        </div>
        {run && run.status === 'Draft' && (
          <button className="btn btn-success" onClick={handleFinalize} disabled={finalizing}>
            <Check size={16} className="payroll-run-detail-Check-4"  /> Finalize & Release
          </button>
        )}
      </div>

      

      <div className="card no-print payroll-run-detail-card">
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
                <th className="payroll-run-detail-th-6">Slip</th>
              </tr>
            </thead>
            <tbody>
              {payslips.length === 0 ? (
                <tr>
                  <td colSpan={9} className="payroll-run-detail-empty-cell">
                    <div className="payroll-run-detail-empty-title">No Payslips Calculated</div>
                    <p>
                      Please ensure that active staff members have their <strong>Salary Structures</strong> configured first,
                      then re-run the payroll calculation for this month.
                    </p>
                  </td>
                </tr>
              ) : (
                payslips.map((p) => {
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
                      <td className="payroll-run-detail-td-7">
                        <button className="btn btn-sm btn-outline" onClick={() => handleOpenPayslip(p)}>
                          <Printer size={12} /> View
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      {showSlipModal && selectedPayslip && run && (
        <div className="modal-overlay no-print" onClick={() => { setShowSlipModal(false); setSelectedPayslip(null); }}>
          <div className="modal payroll-run-detail-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Salary Payslip Preview</h3>
              <button onClick={() => { setShowSlipModal(false); setSelectedPayslip(null); }}>✕</button>
            </div>
            <div className="modal-body">
              <div id="printable-payslip" className="payroll-run-detail-div-9">
                <div className="payroll-run-detail-div-10">
                  <h2 className="payroll-run-detail-title-11">Payslip Advice</h2>
                  <h3 className="payroll-run-detail-title-12">Education Institution Name</h3>
                  <p className="payroll-run-detail-text-13">Salary statement for {getMonthName(run.month)} {run.year}</p>
                </div>

                <div className="payroll-run-detail-grid-14">
                  <div>
                    <p className="payroll-run-detail-text-15"><strong>Employee Name:</strong> {selectedPayslip.first_name} {selectedPayslip.last_name}</p>
                    <p className="payroll-run-detail-text-16"><strong>Employee ID:</strong> {selectedPayslip.employee_id}</p>
                    <p className="payroll-run-detail-text-17"><strong>Designation:</strong> {selectedPayslip.designation}</p>
                  </div>
                  <div className="payroll-run-detail-div-18">
                    <p className="payroll-run-detail-text-19"><strong>Working Days:</strong> {selectedPayslip.working_days}</p>
                    <p className="payroll-run-detail-text-20"><strong>Present Days:</strong> {selectedPayslip.present_days}</p>
                    <p className="payroll-run-detail-text-21"><strong>LOP Days:</strong> {selectedPayslip.lop_days}</p>
                  </div>
                </div>

                <div className="payroll-run-detail-grid-22">
                  {/* Earnings */}
                  <div className="payroll-run-detail-div-23">
                    <h4 className="payroll-run-detail-title-24">EARNINGS</h4>
                    <div className="payroll-run-detail-row-25"><span>Basic Salary</span><span>₹{selectedPayslip.basic_salary.toLocaleString('en-IN')}</span></div>
                    <div className="payroll-run-detail-row-26"><span>Dearness Allowance (DA)</span><span>₹{selectedPayslip.da.toLocaleString('en-IN')}</span></div>
                    <div className="payroll-run-detail-row-27"><span>House Rent Allowance (HRA)</span><span>₹{selectedPayslip.hra.toLocaleString('en-IN')}</span></div>
                    <div className="payroll-run-detail-row-28"><span>Other Allowances</span><span>₹{selectedPayslip.other_allowances.toLocaleString('en-IN')}</span></div>
                    <div className="payroll-run-detail-row-29">
                      <span>Gross Earnings</span>
                      <span>₹{selectedPayslip.gross_salary.toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  {/* Deductions */}
                  <div className="payroll-run-detail-div-30">
                    <h4 className="payroll-run-detail-title-31">DEDUCTIONS</h4>
                    <div className="payroll-run-detail-row-32"><span>Provident Fund (PF)</span><span>₹{selectedPayslip.pf_deduction.toLocaleString('en-IN')}</span></div>
                    <div className="payroll-run-detail-row-33"><span>Tax Withheld (TDS)</span><span>₹{selectedPayslip.tds_deduction.toLocaleString('en-IN')}</span></div>
                    <div className="payroll-run-detail-row-34"><span style={{ color: selectedPayslip.lop_deduction > 0 ? 'var(--danger)' : '' }}>Loss of Pay (LOP)</span><span>₹{selectedPayslip.lop_deduction.toLocaleString('en-IN')}</span></div>
                    <div className="payroll-run-detail-row-35"><span>Other Deductions</span><span>₹{selectedPayslip.other_deductions.toLocaleString('en-IN')}</span></div>
                    <div className="payroll-run-detail-row-36">
                      <span>Total Deductions</span>
                      <span>₹{(selectedPayslip.pf_deduction + selectedPayslip.tds_deduction + selectedPayslip.lop_deduction + selectedPayslip.other_deductions).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>

                <div className="payroll-run-detail-row-37">
                  <span>NET SALARY PAYOUT</span>
                  <span>₹{selectedPayslip.net_salary.toLocaleString('en-IN')}</span>
                </div>

                <div className="payroll-run-detail-row-38">
                  <div className="payroll-run-detail-div-39">Employer Signature</div>
                  <div className="payroll-run-detail-div-40">Employee Signature</div>
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
      
    </Layout>
  );
}
