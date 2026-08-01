import React from 'react';

interface FeesTabProps {
  ledger: any[];
  payments: any[];
  totalAssignedFees: number;
  totalPaidFees: number;
  remainingFeeDue: number;
}

export function FeesTab({ ledger, payments, totalAssignedFees, totalPaidFees, remainingFeeDue }: FeesTabProps) {
  return (
    <div>
      <h3 className="student-details-title-119">Financial Fee Ledger</h3>

      {/* KPI Summary Block */}
      <div className="student-details-grid-120">
        <div className="student-details-div-121">
          <span className="student-details-span-122">Assigned Charges</span>
          <strong className="student-details-strong-123">
            ₹{totalAssignedFees.toLocaleString('en-IN')}
          </strong>
        </div>
        <div className="student-details-div-124">
          <span className="student-details-span-125">Total Paid Amount</span>
          <strong className="student-details-strong-126">
            ₹{totalPaidFees.toLocaleString('en-IN')}
          </strong>
        </div>
        <div className="student-details-div-127">
          <span className="student-details-span-128">Pending Balance Due</span>
          <strong className={`student-details-feedue-val ${remainingFeeDue > 0 ? 'is-due' : 'is-none'}`}>
            ₹{remainingFeeDue.toLocaleString('en-IN')}
          </strong>
        </div>
      </div>

      {/* Fee structure logs */}
      <h4 className="student-details-title-129">Bill Ledger Items</h4>
      <div className="student-details-div-130">
        <table className="table">
          <thead>
            <tr>
              <th>Academic Year</th>
              <th>Fee Type</th>
              <th>Due Date</th>
              <th>Total Amount</th>
              <th>Paid Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {ledger.map(record => (
              <tr key={record.id}>
                <td><strong>{record.academic_year_name}</strong></td>
                <td>{record.fee_type}</td>
                <td>{record.due_date || '-'}</td>
                <td><strong>₹{(record.total_amount || 0).toLocaleString('en-IN')}</strong></td>
                <td>₹{(record.paid_amount || 0).toLocaleString('en-IN')}</td>
                <td>
                  <span className={`badge badge-${record.status === 'PAID' ? 'success' : record.status === 'PARTIALLY_PAID' ? 'warning' : 'danger'}`}>
                    {record.status}
                  </span>
                </td>
              </tr>
            ))}
            {ledger.length === 0 && (
              <tr>
                <td colSpan={6} className="student-details-td-131">No ledger charges assigned.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Payment history */}
      <h4 className="student-details-title-132">Payment Transactions</h4>
      <div className="student-details-div-133">
        <table className="table">
          <thead>
            <tr>
              <th>Receipt No</th>
              <th>Date</th>
              <th>Fee Head</th>
              <th>Payment Method</th>
              <th>Amount Collected</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {payments.map(payment => (
              <tr key={payment.id}>
                <td><strong>{payment.receipt_number || 'N/A'}</strong></td>
                <td>{payment.payment_date}</td>
                <td>{payment.fee_type}</td>
                <td>{payment.payment_method}</td>
                <td><strong>₹{(payment.amount || 0).toLocaleString('en-IN')}</strong></td>
                <td><span className="badge badge-success">Completed</span></td>
              </tr>
            ))}
            {payments.length === 0 && (
              <tr>
                <td colSpan={6} className="student-details-td-134">No transaction records found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
