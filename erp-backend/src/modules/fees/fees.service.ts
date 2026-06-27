import { FeesRepository } from './fees.repository';
import { 
  CreateFeeStructureInput, UpdateFeeStructureInput, 
  CreateStudentFeeRecordInput, CreatePaymentInput,
  CreateConcessionInput, CreateInstallmentPlanInput
} from './fees.types';

export class FeesService {
  constructor(private repo: FeesRepository) {}

  // --- FEE STRUCTURES ---
  async createStructure(institutionId: string, input: CreateFeeStructureInput, userId?: string): Promise<string> {
    const id = crypto.randomUUID();
    await this.repo.createStructure(id, institutionId, input, userId);
    return id;
  }

  async listStructures(institutionId: string): Promise<any[]> {
    return await this.repo.listStructures(institutionId);
  }

  async deleteStructure(id: string, userId?: string): Promise<void> {
    await this.repo.deleteStructure(id, userId);
  }

  // --- STUDENT LEDGER / FEE RECORDS ---
  async createFeeRecord(institutionId: string, input: CreateStudentFeeRecordInput, userId?: string): Promise<string> {
    const id = crypto.randomUUID();
    await this.repo.createFeeRecord(id, institutionId, input, userId);
    return id;
  }

  async listStudentRecords(institutionId: string, search?: string): Promise<any[]> {
    return await this.repo.listStudentRecords(institutionId, search);
  }

  async getStudentLedger(studentId: string): Promise<any[]> {
    return await this.repo.getStudentLedger(studentId);
  }

  async generateRecordsForStudent(institutionId: string, studentId: string, academicYearId: string, courseId: string, yearNumber: number, userId?: string): Promise<void> {
    await this.repo.generateRecordsForStudent(institutionId, studentId, academicYearId, courseId, yearNumber, userId);
  }

  // --- PAYMENT AND RECEIPT GENERATION ---
  async makePayment(institutionId: string, input: CreatePaymentInput, userId?: string): Promise<{ paymentId: string; receiptId: string; receiptNumber: string }> {
    // 1. Fetch fee record to update
    const record = await this.repo.getRecordById(input.student_fee_record_id);
    if (!record || record.institution_id !== institutionId) {
      throw new Error('Student fee record not found');
    }

    if (input.amount <= 0) {
      throw new Error('Payment amount must be positive');
    }

    const newPaidAmount = record.paid_amount + input.amount;
    if (newPaidAmount > record.total_amount) {
      throw new Error(`Payment exceeds outstanding amount. Due: ${record.total_amount - record.paid_amount}`);
    }

    let status: 'PAID' | 'PARTIALLY_PAID' | 'UNPAID' = 'UNPAID';
    if (newPaidAmount >= record.total_amount) {
      status = 'PAID';
    } else if (newPaidAmount > 0) {
      status = 'PARTIALLY_PAID';
    }

    const paymentId = crypto.randomUUID();
    const receiptId = crypto.randomUUID();

    // Generate formatted receipt number: REC-YYYY-NNNNN
    const year = new Date().getFullYear().toString();
    const count = await this.repo.countReceiptsForYear(institutionId, year);
    const sequence = (count + 1).toString().padStart(5, '0');
    const receiptNumber = `REC-${year}-${sequence}`;

    // 2. Perform DB Writes
    await this.repo.createPayment(paymentId, institutionId, input, userId);
    await this.repo.updateRecordPayment(input.student_fee_record_id, newPaidAmount, status, userId);
    await this.repo.createReceipt(receiptId, institutionId, paymentId, receiptNumber, userId);

    return {
      paymentId,
      receiptId,
      receiptNumber
    };
  }

  async listPayments(institutionId: string, studentId?: string): Promise<any[]> {
    return await this.repo.listPayments(institutionId, studentId);
  }

  // --- RECEIPTS ---
  async getReceiptDetails(receiptId: string): Promise<any | null> {
    return await this.repo.getReceiptDetails(receiptId);
  }

  async getReceiptByPaymentId(paymentId: string): Promise<any | null> {
    return await this.repo.getReceiptByPaymentId(paymentId);
  }

  async listReceipts(institutionId: string): Promise<any[]> {
    return await this.repo.listReceipts(institutionId);
  }

  // --- REPORTS ---
  async getFeeSummaryStats(institutionId: string): Promise<any> {
    return await this.repo.getFeeSummaryStats(institutionId);
  }

  async getMonthlyCollection(institutionId: string): Promise<any[]> {
    return await this.repo.getMonthlyCollection(institutionId);
  }

  async getTopDefaulters(institutionId: string): Promise<any[]> {
    return await this.repo.getTopDefaulters(institutionId);
  }

  // --- CONCESSIONS ---
  async applyConcession(institutionId: string, input: CreateConcessionInput, userId?: string): Promise<string> {
    const record = await this.repo.getRecordById(input.student_fee_record_id);
    if (!record || record.institution_id !== institutionId) throw new Error('Fee record not found');

    let discountAmount: number;
    if (input.discount_type === 'percent') {
      discountAmount = Math.round((record.total_amount * input.discount_value / 100) * 100) / 100;
    } else {
      discountAmount = input.discount_value;
    }

    if (discountAmount > record.total_amount) throw new Error('Discount exceeds total amount');

    const id = crypto.randomUUID();
    await this.repo.createConcession(id, institutionId, input, discountAmount, userId);
    await this.repo.reduceTotalAmount(input.student_fee_record_id, discountAmount, userId);
    return id;
  }

  async listConcessions(recordId: string): Promise<any[]> {
    return this.repo.listConcessionsByRecord(recordId);
  }

  async removeConcession(id: string, institutionId: string, userId?: string): Promise<void> {
    const concession = await this.repo.getConcessionById(id);
    if (!concession || concession.institution_id !== institutionId) throw new Error('Concession not found');
    await this.repo.deleteConcession(id, userId);
    await this.repo.restoreTotalAmount(concession.student_fee_record_id, concession.discount_amount, userId);
  }

  // --- INSTALLMENTS ---
  async createInstallmentPlan(institutionId: string, input: CreateInstallmentPlanInput, userId?: string): Promise<void> {
    const record = await this.repo.getRecordById(input.student_fee_record_id);
    if (!record || record.institution_id !== institutionId) throw new Error('Fee record not found');

    const totalInstallmentAmount = input.installments.reduce((sum, i) => sum + i.amount, 0);
    if (Math.abs(totalInstallmentAmount - record.total_amount) > 1) {
      throw new Error(`Installment amounts (${totalInstallmentAmount}) must equal total fee amount (${record.total_amount})`);
    }

    await this.repo.createInstallments(institutionId, input, userId);
  }

  async listInstallments(recordId: string): Promise<any[]> {
    await this.repo.updateOverdueInstallments(recordId);
    return this.repo.listInstallmentsByRecord(recordId);
  }

  async payInstallment(id: string, institutionId: string, amount: number, userId?: string): Promise<void> {
    const inst = await this.repo.getInstallmentById(id);
    if (!inst || inst.institution_id !== institutionId) throw new Error('Installment not found');
    await this.repo.payInstallment(id, amount, userId);
  }
}
