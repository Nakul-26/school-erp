export interface FeeStructure {
  id: string;
  institution_id: string;
  academic_year_id: string;
  course_id: string;
  year_number: number;
  fee_type: 'Tuition Fee' | 'Exam Fee' | 'Library Fee' | 'Other' | string;
  amount: number;
  version: number;
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  parent_version_id?: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
  academic_year_name?: string;
  course_name?: string;
  course_code?: string;
}

export interface CreateFeeStructureInput {
  academic_year_id: string;
  course_id: string;
  year_number: number;
  fee_type: string;
  amount: number;
  status?: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
}

export type UpdateFeeStructureInput = Partial<CreateFeeStructureInput>;

export interface StudentFeeRecord {
  id: string;
  institution_id: string;
  student_id: string;
  academic_year_id: string;
  course_id: string;
  year_number: number;
  fee_structure_id: string | null;
  fee_type: string;
  total_amount: number;
  paid_amount: number;
  concession_amount: number;
  fine_amount: number;
  refund_amount: number;
  is_fine_exempt: number;
  due_date: string | null; // YYYY-MM-DD
  status: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE';
  is_active: number;
  created_at: string;
  updated_at: string;

  // populated fields for ledger
  first_name?: string;
  last_name?: string;
  admission_number?: string;
  roll_number?: string;
  course_name?: string;
  academic_year_name?: string;
}

export interface CreateStudentFeeRecordInput {
  student_id: string;
  academic_year_id: string;
  course_id: string;
  year_number: number;
  fee_structure_id?: string;
  fee_type: string;
  total_amount: number;
  due_date?: string;
}

export interface FeePayment {
  id: string;
  institution_id: string;
  student_id: string;
  student_fee_record_id: string;
  amount: number;
  payment_date: string; // YYYY-MM-DD
  payment_method: 'UPI' | 'Cash' | 'Bank Transfer' | 'Cheque' | 'Card' | 'Online Gateway' | string;
  transaction_reference?: string | null;
  remarks?: string | null;
  status: 'COMPLETED' | 'FAILED' | 'REFUNDED' | 'PARTIALLY_REFUNDED' | 'CANCELLED' | string;
  receipt_number?: string | null;
  collected_by?: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;

  // populated fields
  first_name?: string;
  last_name?: string;
  admission_number?: string;
  fee_type?: string;
}

export interface CreatePaymentInput {
  student_id: string;
  student_fee_record_id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  transaction_reference?: string;
  remarks?: string;
}

export interface FeeReceipt {
  id: string;
  institution_id: string;
  payment_id: string;
  receipt_number: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface FeeConcession {
  id: string;
  institution_id: string;
  student_fee_record_id: string;
  student_id: string;
  concession_type: string;
  discount_type: 'flat' | 'percent';
  discount_value: number;
  discount_amount: number;
  reason: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface CreateConcessionInput {
  student_fee_record_id: string;
  student_id: string;
  concession_type: string;
  discount_type: 'flat' | 'percent';
  discount_value: number;
  reason?: string;
}

export interface FeeRefund {
  id: string;
  institution_id: string;
  payment_id: string;
  student_fee_record_id: string;
  student_id: string;
  refund_amount: number;
  refund_reason: string;
  refund_date: string;
  refund_reference?: string | null;
  approved_by?: string | null;
  created_at: string;
}

export interface CreateRefundInput {
  refund_amount: number;
  refund_reason: string;
  refund_reference?: string;
}

export interface FeeFineRule {
  id: string;
  institution_id: string;
  name: string;
  grace_period_days: number;
  fine_type: 'flat' | 'daily';
  fine_amount: number;
  max_fine_amount: number;
  is_active: number;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
}

export interface CreateFineRuleInput {
  name: string;
  grace_period_days: number;
  fine_type: 'flat' | 'daily';
  fine_amount: number;
  max_fine_amount?: number;
}

export interface FinancialLedgerEntry {
  id: string;
  institution_id: string;
  student_id: string;
  student_fee_record_id?: string | null;
  entry_type: 'ALLOCATION' | 'PAYMENT' | 'DISCOUNT' | 'SCHOLARSHIP' | 'FINE' | 'REFUND' | 'ADJUSTMENT';
  amount: number;
  balance_after: number;
  description: string;
  reference_id?: string | null;
  created_by?: string | null;
  created_at: string;
}

export interface FeeInstallment {
  id: string;
  institution_id: string;
  student_fee_record_id: string;
  student_id: string;
  installment_number: number;
  due_date: string;
  amount: number;
  paid_amount: number;
  status: 'Pending' | 'Paid' | 'Overdue';
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface CreateInstallmentPlanInput {
  student_fee_record_id: string;
  student_id: string;
  installments: Array<{ due_date: string; amount: number }>;
}

export interface FeeReminder {
  id: string;
  institution_id: string;
  student_id: string;
  student_fee_record_id?: string | null;
  reminder_type: 'EMAIL' | 'SMS' | 'WHATSAPP';
  recipient: string;
  message: string;
  status: string;
  sent_at: string;
  sent_by?: string | null;
}
