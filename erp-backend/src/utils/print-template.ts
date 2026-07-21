export interface FeeReceiptPrintData {
  institutionName: string;
  institutionAddress?: string;
  institutionPhone?: string;
  receiptNumber: string;
  receiptDate: string;
  studentName: string;
  admissionNumber: string;
  rollNumber?: string;
  courseName?: string;
  sectionName?: string;
  feeType: string;
  amountPaid: number;
  paymentMethod: string;
  transactionRef?: string;
  remarks?: string;
}

export function renderFeeReceiptHtml(data: FeeReceiptPrintData): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Fee Receipt - ${data.receiptNumber}</title>
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1e293b; margin: 0; padding: 24px; background: #fff; }
    .receipt-box { max-width: 650px; margin: 0 auto; border: 1px solid #cbd5e1; border-radius: 8px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
    .header { text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 24px; }
    .header h1 { margin: 0; font-size: 24px; color: #0f172a; }
    .header p { margin: 4px 0 0; color: #64748b; font-size: 13px; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; font-size: 14px; }
    .meta-item label { font-weight: 600; color: #475569; display: block; margin-bottom: 2px; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; }
    .meta-item span { color: #0f172a; font-size: 15px; }
    .table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    .table th, .table td { padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
    .table th { background: #f8fafc; font-weight: 600; color: #475569; }
    .total-row { font-size: 18px; font-weight: 700; color: #059669; }
    .footer { margin-top: 32px; border-top: 1px dashed #cbd5e1; padding-top: 16px; text-align: justify; font-size: 12px; color: #94a3b8; }
    .signatures { display: flex; justify-content: space-between; margin-top: 48px; }
    .sig-line { border-top: 1px solid #94a3b8; width: 160px; text-align: center; font-size: 12px; color: #475569; padding-top: 4px; }
    @media print {
      body { padding: 0; }
      .receipt-box { border: none; box-shadow: none; padding: 0; }
    }
  </style>
</head>
<body>
  <div class="receipt-box">
    <div class="header">
      <h1>${data.institutionName}</h1>
      ${data.institutionAddress ? `<p>${data.institutionAddress}</p>` : ''}
      ${data.institutionPhone ? `<p>Phone: ${data.institutionPhone}</p>` : ''}
    </div>

    <div style="text-align: center; margin-bottom: 20px;">
      <span style="background: #e0e7ff; color: #3730a3; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; text-transform: uppercase;">Official Fee Receipt</span>
    </div>

    <div class="meta-grid">
      <div class="meta-item"><label>Receipt No</label><span>${data.receiptNumber}</span></div>
      <div class="meta-item"><label>Payment Date</label><span>${data.receiptDate}</span></div>
      <div class="meta-item"><label>Student Name</label><span>${data.studentName}</span></div>
      <div class="meta-item"><label>Admission No</label><span>${data.admissionNumber}</span></div>
      ${data.courseName ? `<div class="meta-item"><label>Program / Class</label><span>${data.courseName} ${data.sectionName ? `(${data.sectionName})` : ''}</span></div>` : ''}
      <div class="meta-item"><label>Payment Mode</label><span>${data.paymentMethod} ${data.transactionRef ? `(${data.transactionRef})` : ''}</span></div>
    </div>

    <table class="table">
      <thead>
        <tr>
          <th>Description</th>
          <th style="text-align: right;">Amount Paid</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${data.feeType}</td>
          <td style="text-align: right;">₹${data.amountPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        </tr>
        <tr class="total-row">
          <td>Total Amount Paid</td>
          <td style="text-align: right;">₹${data.amountPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        </tr>
      </tbody>
    </table>

    ${data.remarks ? `<p style="font-size: 13px; color: #64748b;"><strong>Remarks:</strong> ${data.remarks}</p>` : ''}

    <div class="signatures">
      <div class="sig-line">Student / Parent Signature</div>
      <div class="sig-line">Authorized Signatory</div>
    </div>

    <div class="footer">
      This is a computer-generated receipt. Valid subject to realization of cheque / online transfer.
    </div>
  </div>
  <script>
    if (window.location.search.includes('print=true')) {
      window.print();
    }
  </script>
</body>
</html>`;
}
