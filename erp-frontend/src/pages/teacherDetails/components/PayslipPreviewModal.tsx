import React from 'react';

interface PayslipPreviewModalProps {
  show: boolean;
  payslip: any;
  institutionName: string;
  onClose: () => void;
}

export function PayslipPreviewModal({ show, payslip, institutionName, onClose }: PayslipPreviewModalProps) {
  if (!show || !payslip) return null;
  return (
    <div className="teacher-details-modal-overlay no-print" onClick={onClose}>
      <div className="card modal-content teacher-details-payslip-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Salary Payslip Preview</h3>
          <button onClick={onClose} className="teacher-details-payslip-close-btn">✕</button>
        </div>
        <div className="modal-body">
          <div id="teacher-printable-payslip" className="teacher-details-payslip-div-9">
            <div className="teacher-details-payslip-div-10">
              <h2 className="teacher-details-payslip-title-11">Payslip Advice</h2>
              <h3 className="teacher-details-payslip-title-12">{institutionName || 'Education Institution'}</h3>
              <p className="teacher-details-payslip-text-13">
                Salary statement for {(() => {
                  const dates = new Date(2000, payslip.month - 1, 1);
                  return dates.toLocaleString('default', { month: 'long' });
                })()} {payslip.year}
              </p>
            </div>

            <div className="teacher-details-payslip-grid-14">
              <div>
                <p className="teacher-details-payslip-text-15"><strong>Employee Name:</strong> {payslip.first_name} {payslip.last_name}</p>
                <p className="teacher-details-payslip-text-16"><strong>Employee ID:</strong> {payslip.employee_id}</p>
                <p className="teacher-details-payslip-text-17"><strong>Designation:</strong> {payslip.designation}</p>
              </div>
              <div className="teacher-details-payslip-div-18">
                <p className="teacher-details-payslip-text-19"><strong>Working Days:</strong> {payslip.working_days}</p>
                <p className="teacher-details-payslip-text-20"><strong>Present Days:</strong> {payslip.present_days}</p>
                <p className="teacher-details-payslip-text-21"><strong>LOP Days:</strong> {payslip.lop_days}</p>
              </div>
            </div>

            <div className="teacher-details-payslip-grid-22">
              {/* Earnings */}
              <div className="teacher-details-payslip-div-23">
                <h4 className="teacher-details-payslip-title-24">EARNINGS</h4>
                <div className="teacher-details-payslip-row-25"><span>Basic Salary</span><span>₹{(payslip.basic_salary || 0).toLocaleString('en-IN')}</span></div>
                <div className="teacher-details-payslip-row-26"><span>Dearness Allowance (DA)</span><span>₹{(payslip.da || 0).toLocaleString('en-IN')}</span></div>
                <div className="teacher-details-payslip-row-27"><span>House Rent Allowance (HRA)</span><span>₹{(payslip.hra || 0).toLocaleString('en-IN')}</span></div>
                <div className="teacher-details-payslip-row-28"><span>Other Allowances</span><span>₹{(payslip.other_allowances || 0).toLocaleString('en-IN')}</span></div>
                <div className="teacher-details-payslip-row-29">
                  <span>Gross Earnings</span>
                  <span>₹{(payslip.gross_salary || 0).toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Deductions */}
              <div className="teacher-details-payslip-div-30">
                <h4 className="teacher-details-payslip-title-31">DEDUCTIONS</h4>
                <div className="teacher-details-payslip-row-32"><span>Provident Fund (PF)</span><span>₹{(payslip.pf_deduction || 0).toLocaleString('en-IN')}</span></div>
                <div className="teacher-details-payslip-row-33"><span>Tax Withheld (TDS)</span><span>₹{(payslip.tds_deduction || 0).toLocaleString('en-IN')}</span></div>
                <div className="teacher-details-payslip-row-34"><span style={{ color: payslip.lop_deduction > 0 ? 'var(--danger)' : '' }}>Loss of Pay (LOP)</span><span>₹{(payslip.lop_deduction || 0).toLocaleString('en-IN')}</span></div>
                <div className="teacher-details-payslip-row-35"><span>Other Deductions</span><span>₹{(payslip.other_deductions || 0).toLocaleString('en-IN')}</span></div>
                <div className="teacher-details-payslip-row-36">
                  <span>Total Deductions</span>
                  <span>₹{((payslip.pf_deduction || 0) + (payslip.tds_deduction || 0) + (payslip.lop_deduction || 0) + (payslip.other_deductions || 0)).toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            <div className="teacher-details-payslip-row-37">
              <span>NET SALARY PAYOUT</span>
              <span>₹{(payslip.net_salary || 0).toLocaleString('en-IN')}</span>
            </div>

            <div className="teacher-details-payslip-row-38">
              <div className="teacher-details-payslip-div-39">Employer Signature</div>
              <div className="teacher-details-payslip-div-40">Employee Signature</div>
            </div>
          </div>
        </div>
        <div className="teacher-details-payslip-footer no-print">
          <button className="btn btn-outline" onClick={onClose}>Close</button>
          <button className="btn btn-primary" onClick={() => window.print()}>Print Payslip</button>
        </div>
      </div>
    </div>
  );
}
