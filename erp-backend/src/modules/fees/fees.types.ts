export interface FeeStructure {
  id: string;
  institution_id: string;
  academic_year_id: string;
  course_id: string;
  year_number: number;
  fee_type: 'Tuition Fee' | 'Exam Fee' | 'Library Fee' | 'Other';
  amount: number;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export type CreateFeeStructureInput = Omit<FeeStructure, 'id' | 'institution_id' | 'is_active' | 'created_at' | 'updated_at'>;
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
  payment_method: 'UPI' | 'Cash' | 'Bank Transfer' | 'Cheque';
  transaction_reference?: string | null;
  remarks?: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;

  // populated fields
  first_name?: string;
  last_name?: string;
  fee_type?: string;
  receipt_number?: string;
}

export interface CreatePaymentInput {
  student_id: string;
  student_fee_record_id: string;
  amount: number;
  payment_date: string;
  payment_method: 'UPI' | 'Cash' | 'Bank Transfer' | 'Cheque';
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
