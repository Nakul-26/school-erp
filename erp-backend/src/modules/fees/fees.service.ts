import { FeesRepository } from './fees.repository';
import { 
  CreateFeeStructureInput, UpdateFeeStructureInput, 
  CreateStudentFeeRecordInput, CreatePaymentInput,
  CreateConcessionInput, CreateInstallmentPlanInput,
  CreateRefundInput, CreateFineRuleInput
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

  async createNewVersion(institutionId: string, structureId: string, newAmount: number, userId?: string): Promise<string> {
    const existing = await this.repo.getStructureById(structureId);
    if (!existing || existing.institution_id !== institutionId) {
      throw new Error('Fee structure not found');
    }
    const newId = crypto.randomUUID();
    await this.repo.createStructure(newId, institutionId, {
      academic_year_id: existing.academic_year_id,
      course_id: existing.course_id,
      year_number: existing.year_number,
      fee_type: existing.fee_type,
      amount: newAmount,
      status: 'ACTIVE'
    }, userId, existing.id);

    return newId;
  }

  async deleteStructure(id: string, institutionId: string, userId?: string): Promise<void> {
    const existing = await this.repo.getStructureById(id);
    if (!existing || existing.institution_id !== institutionId) {
      throw new Error('Fee structure not found');
    }
    const allocationCount = await this.repo.countStructureAllocations(id);
    if (allocationCount > 0) {
      const err: any = new Error('Cannot delete or archive fee structure with active allocations');
      err.statusCode = 409;
      throw err;
    }
    await this.repo.deleteStructure(id, userId);
  }

  // --- STUDENT LEDGER / FEE RECORDS ---
  async createFeeRecord(institutionId: string, input: CreateStudentFeeRecordInput, userId?: string): Promise<string> {
    // 1. Validate student exists & active
    const student = await this.repo.getStudentById(institutionId, input.student_id);
    if (!student) {
      throw new Error('Student not found or is inactive');
    }

    // 2. Validate fee structure if specified
    if (input.fee_structure_id) {
      const structure = await this.repo.getStructureById(input.fee_structure_id);
      if (!structure || structure.institution_id !== institutionId) {
        throw new Error('Fee structure not found');
      }
      if (structure.status !== 'ACTIVE') {
        throw new Error('Cannot allocate a fee structure that is not ACTIVE');
      }
    }

    // 3. Check duplicate allocation
    const existing = await this.repo.checkExistingAllocation(
      input.student_id, input.academic_year_id, input.course_id, input.year_number, input.fee_type
    );
    if (existing) {
      const err: any = new Error(`Student already has a fee record allocated for ${input.fee_type} in this academic year`);
      err.statusCode = 409;
      throw err;
    }

    const id = crypto.randomUUID();
    await this.repo.createFeeRecord(id, institutionId, input, userId);

    // Ledger Entry
    await this.repo.addLedgerEntry(
      crypto.randomUUID(),
      institutionId,
      input.student_id,
      id,
      'ALLOCATION',
      input.total_amount,
      input.total_amount,
      `Fee allocated: ${input.fee_type} (₹${input.total_amount})`,
      id,
      userId
    );

    return id;
  }

  async listStudentRecords(institutionId: string, options: any = {}): Promise<any[]> {
    return await this.repo.listStudentRecords(institutionId, options);
  }

  async getStudentLedger(studentId: string): Promise<any[]> {
    return await this.repo.getStudentLedger(studentId);
  }

  async generateRecordsForStudent(institutionId: string, studentId: string, academicYearId: string, courseId: string, yearNumber: number, userId?: string): Promise<{ created: number; skipped: number }> {
    const student = await this.repo.getStudentById(institutionId, studentId);
    if (!student) {
      throw new Error('Student not found');
    }

    const structures = await this.repo.listStructures(institutionId);
    const matching = structures.filter(fs => 
      fs.academic_year_id === academicYearId && 
      fs.course_id === courseId && 
      fs.year_number === yearNumber && 
      fs.status === 'ACTIVE'
    );

    let created = 0;
    let skipped = 0;

    for (const fs of matching) {
      const existing = await this.repo.checkExistingAllocation(studentId, academicYearId, courseId, yearNumber, fs.fee_type);
      if (existing) {
        skipped++;
        continue;
      }

      const id = crypto.randomUUID();
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);
      const dueDateStr = dueDate.toISOString().split('T')[0];

      await this.repo.createFeeRecord(id, institutionId, {
        student_id: studentId,
        academic_year_id: academicYearId,
        course_id: courseId,
        year_number: yearNumber,
        fee_structure_id: fs.id,
        fee_type: fs.fee_type,
        total_amount: fs.amount,
        due_date: dueDateStr
      }, userId);

      await this.repo.addLedgerEntry(
        crypto.randomUUID(),
        institutionId,
        studentId,
        id,
        'ALLOCATION',
        fs.amount,
        fs.amount,
        `Fee allocated from structure version ${fs.version}: ${fs.fee_type} (₹${fs.amount})`,
        fs.id,
        userId
      );

      created++;
    }

    return { created, skipped };
  }

  async deleteFeeRecord(id: string, institutionId: string, userId?: string): Promise<void> {
    const record = await this.repo.getRecordById(id);
    if (!record || record.institution_id !== institutionId) {
      throw new Error('Fee record not found');
    }

    const paymentCount = await this.repo.countPaymentsForRecord(id);
    if (paymentCount > 0) {
      const err: any = new Error('Cannot delete fee record with existing payment transactions');
      err.statusCode = 409;
      throw err;
    }

    await this.repo.deleteFeeRecord(id, userId);
  }

  // --- PAYMENT AND RECEIPT GENERATION ---
  async makePayment(institutionId: string, input: CreatePaymentInput, userId?: string): Promise<{ paymentId: string; receiptId: string; receiptNumber: string }> {
    const record = await this.repo.getRecordById(input.student_fee_record_id);
    if (!record || record.institution_id !== institutionId) {
      throw new Error('Student fee record not found');
    }

    if (input.amount <= 0) {
      throw new Error('Payment amount must be positive');
    }

    // Check duplicate payment reference
    if (input.transaction_reference && input.transaction_reference.trim()) {
      const duplicateTx = await this.repo.getPaymentByTransactionRef(institutionId, input.transaction_reference.trim());
      if (duplicateTx) {
        const err: any = new Error(`Payment with transaction reference '${input.transaction_reference}' already exists`);
        err.statusCode = 409;
        throw err;
      }
    }

    // Calculate current outstanding: (total + fine) - (paid + concession) + refund
    const currentOutstanding = Math.max(0, (record.total_amount + record.fine_amount) - (record.paid_amount + record.concession_amount) + record.refund_amount);

    if (input.amount > currentOutstanding + 0.01) {
      const err: any = new Error(`Payment amount (₹${input.amount}) exceeds outstanding balance (₹${currentOutstanding.toFixed(2)})`);
      err.statusCode = 400;
      throw err;
    }

    const newPaidAmount = record.paid_amount + input.amount;
    const newOutstanding = Math.max(0, (record.total_amount + record.fine_amount) - (newPaidAmount + record.concession_amount) + record.refund_amount);

    let status: 'PAID' | 'PARTIALLY_PAID' | 'UNPAID' = 'UNPAID';
    if (newOutstanding <= 0.01) {
      status = 'PAID';
    } else if (newPaidAmount > 0) {
      status = 'PARTIALLY_PAID';
    }

    const paymentId = crypto.randomUUID();
    const receiptId = crypto.randomUUID();

    const year = new Date().getFullYear().toString();
    // Atomic upsert+RETURNING - no read-then-write gap, so concurrent payments
    // can't be issued the same receipt number.
    const sequence = (await this.repo.reserveNextReceiptSequence(institutionId, year)).toString().padStart(5, '0');
    const receiptNumber = `REC-${year}-${sequence}`;

    // Guard update runs first, standalone: D1 batches can't branch on an
    // earlier statement's row count, so the only way to fail fast without
    // side effects is to check this before creating the payment/receipt/
    // ledger rows. `WHERE paid_amount = <value we read above>` means a
    // concurrent payment against the same record can't be silently lost -
    // it fails here with changes=0 instead.
    const updateResult = await this.repo.updateRecordStatusAndTotalsStatement(
      input.student_fee_record_id,
      record.paid_amount,
      { paid_amount: newPaidAmount, status },
      userId
    ).run();
    if (updateResult.meta.changes === 0) {
      const err: any = new Error('Fee record was modified by another payment at the same time. Please retry.');
      err.statusCode = 409;
      throw err;
    }

    // The remaining three writes are unconditional inserts on fresh IDs, run
    // as a single atomic D1 batch so a mid-sequence failure can't leave the
    // payment, receipt, and ledger out of sync with each other.
    await this.repo.runBatch([
      this.repo.createPaymentStatement(paymentId, institutionId, input, receiptNumber, userId),
      this.repo.createReceiptStatement(receiptId, institutionId, paymentId, receiptNumber, userId),
      this.repo.addLedgerEntryStatement(
        crypto.randomUUID(),
        institutionId,
        input.student_id,
        input.student_fee_record_id,
        'PAYMENT',
        input.amount,
        newOutstanding,
        `Payment received via ${input.payment_method} (${receiptNumber})`,
        paymentId,
        userId
      ),
    ]);

    return { paymentId, receiptId, receiptNumber };
  }

  async listPayments(institutionId: string, options: any = {}): Promise<any[]> {
    return await this.repo.listPayments(institutionId, options);
  }

  // --- RECEIPTS ---
  async getReceiptDetails(receiptIdOrNumber: string): Promise<any | null> {
    return await this.repo.getReceiptDetails(receiptIdOrNumber);
  }

  async getReceiptByPaymentId(paymentId: string): Promise<any | null> {
    return await this.repo.getReceiptByPaymentId(paymentId);
  }

  async listReceipts(institutionId: string): Promise<any[]> {
    return await this.repo.listReceipts(institutionId);
  }

  // --- REFUND WORKFLOW ---
  async processRefund(institutionId: string, paymentId: string, input: CreateRefundInput, userId?: string): Promise<string> {
    const payment = await this.repo.getPaymentById(paymentId);
    if (!payment || payment.institution_id !== institutionId) {
      throw new Error('Payment transaction not found');
    }

    if (payment.status === 'CANCELLED') {
      throw new Error('Cannot refund a cancelled payment');
    }

    if (input.refund_amount <= 0) {
      throw new Error('Refund amount must be greater than zero');
    }

    const previousRefunds = await this.repo.getRefundsForPayment(paymentId);
    const totalRefundedSoFar = previousRefunds.reduce((sum, r) => sum + r.refund_amount, 0);
    const availableToRefund = payment.amount - totalRefundedSoFar;

    if (input.refund_amount > availableToRefund + 0.01) {
      throw new Error(`Refund amount (₹${input.refund_amount}) exceeds available payment balance (₹${availableToRefund.toFixed(2)})`);
    }

    const refundId = crypto.randomUUID();
    await this.repo.createRefund(refundId, institutionId, input, payment, userId);

    const newTotalRefunded = totalRefundedSoFar + input.refund_amount;
    const paymentStatus = newTotalRefunded >= payment.amount - 0.01 ? 'REFUNDED' : 'PARTIALLY_REFUNDED';
    await this.repo.updatePaymentRefundStatus(paymentId, paymentStatus, userId);

    // Update Student Fee Record refund amount & recalculate status
    const record = await this.repo.getRecordById(payment.student_fee_record_id);
    if (record) {
      const newRecordRefund = record.refund_amount + input.refund_amount;
      const newOutstanding = (record.total_amount + record.fine_amount) - (record.paid_amount + record.concession_amount) + newRecordRefund;
      let recordStatus: 'PAID' | 'PARTIALLY_PAID' | 'UNPAID' = 'UNPAID';
      if (newOutstanding <= 0.01) {
        recordStatus = 'PAID';
      } else if (record.paid_amount > 0) {
        recordStatus = 'PARTIALLY_PAID';
      }

      await this.repo.updateRecordStatusAndTotals(record.id, { refund_amount: newRecordRefund, status: recordStatus }, userId);

      // Financial Ledger
      await this.repo.addLedgerEntry(
        crypto.randomUUID(),
        institutionId,
        payment.student_id,
        record.id,
        'REFUND',
        input.refund_amount,
        newOutstanding,
        `Refund issued for payment ${payment.receipt_number || payment.id}: ${input.refund_reason}`,
        refundId,
        userId
      );
    }

    return refundId;
  }

  async listRefunds(institutionId: string): Promise<any[]> {
    return await this.repo.listRefunds(institutionId);
  }

  // --- CONCESSIONS & SCHOLARSHIPS ---
  async applyConcession(institutionId: string, input: CreateConcessionInput, userId?: string): Promise<string> {
    const record = await this.repo.getRecordById(input.student_fee_record_id);
    if (!record || record.institution_id !== institutionId) throw new Error('Fee record not found');

    let discountAmount: number;
    if (input.discount_type === 'percent') {
      discountAmount = Math.round((record.total_amount * input.discount_value / 100) * 100) / 100;
    } else {
      discountAmount = input.discount_value;
    }

    if (discountAmount > record.total_amount) {
      throw new Error('Concession amount cannot exceed total fee amount');
    }

    const currentOutstanding = Math.max(0, (record.total_amount + record.fine_amount) - (record.paid_amount + record.concession_amount) + record.refund_amount);
    if (discountAmount > currentOutstanding + 0.01) {
      throw new Error(`Concession amount (₹${discountAmount}) cannot exceed remaining balance (₹${currentOutstanding.toFixed(2)})`);
    }

    const id = crypto.randomUUID();
    await this.repo.createConcession(id, institutionId, input, discountAmount, userId);

    const newConcession = record.concession_amount + discountAmount;
    const newOutstanding = Math.max(0, (record.total_amount + record.fine_amount) - (record.paid_amount + newConcession) + record.refund_amount);
    let status: 'PAID' | 'PARTIALLY_PAID' | 'UNPAID' = 'UNPAID';
    if (newOutstanding <= 0.01) {
      status = 'PAID';
    } else if (record.paid_amount > 0) {
      status = 'PARTIALLY_PAID';
    }

    await this.repo.updateRecordStatusAndTotals(input.student_fee_record_id, { concession_amount: newConcession, status }, userId);

    // Ledger Entry
    await this.repo.addLedgerEntry(
      crypto.randomUUID(),
      institutionId,
      input.student_id,
      input.student_fee_record_id,
      input.concession_type.toLowerCase().includes('scholarship') ? 'SCHOLARSHIP' : 'DISCOUNT',
      discountAmount,
      newOutstanding,
      `${input.concession_type} granted: ₹${discountAmount} (${input.reason || 'N/A'})`,
      id,
      userId
    );

    return id;
  }

  async listConcessions(recordId: string): Promise<any[]> {
    return this.repo.listConcessionsByRecord(recordId);
  }

  async removeConcession(id: string, institutionId: string, userId?: string): Promise<void> {
    const concession = await this.repo.getConcessionById(id);
    if (!concession || concession.institution_id !== institutionId) throw new Error('Concession not found');

    const record = await this.repo.getRecordById(concession.student_fee_record_id);
    if (record) {
      const newConcession = Math.max(0, record.concession_amount - concession.discount_amount);
      const newOutstanding = Math.max(0, (record.total_amount + record.fine_amount) - (record.paid_amount + newConcession) + record.refund_amount);
      let status: 'PAID' | 'PARTIALLY_PAID' | 'UNPAID' = 'UNPAID';
      if (newOutstanding <= 0.01) {
        status = 'PAID';
      } else if (record.paid_amount > 0) {
        status = 'PARTIALLY_PAID';
      }

      await this.repo.updateRecordStatusAndTotals(record.id, { concession_amount: newConcession, status }, userId);
      await this.repo.deleteConcession(id, userId);

      await this.repo.addLedgerEntry(
        crypto.randomUUID(),
        institutionId,
        concession.student_id,
        record.id,
        'ADJUSTMENT',
        concession.discount_amount,
        newOutstanding,
        `Concession removed: ₹${concession.discount_amount}`,
        id,
        userId
      );
    }
  }

  // --- FINE RULES & ENGINE ---
  async createFineRule(institutionId: string, input: CreateFineRuleInput, userId?: string): Promise<string> {
    const id = crypto.randomUUID();
    await this.repo.createFineRule(id, institutionId, input, userId);
    return id;
  }

  async listFineRules(institutionId: string): Promise<any[]> {
    return await this.repo.listFineRules(institutionId);
  }

  async deleteFineRule(id: string, institutionId: string, userId?: string): Promise<void> {
    await this.repo.deleteFineRule(id, userId);
  }

  async calculateAndApplyFines(institutionId: string, userId?: string): Promise<{ recordsProcessed: number; finesApplied: number }> {
    const records = await this.repo.listStudentRecords(institutionId);
    const fineRules = await this.repo.listFineRules(institutionId);
    if (!fineRules.length) return { recordsProcessed: 0, finesApplied: 0 };

    const rule = fineRules[0]; // Active rule
    const today = new Date();
    let recordsProcessed = 0;
    let finesApplied = 0;

    for (const record of records) {
      if (!record.due_date || record.status === 'PAID' || record.is_fine_exempt === 1) continue;

      const dueDate = new Date(record.due_date);
      const graceDate = new Date(dueDate);
      graceDate.setDate(graceDate.getDate() + (rule.grace_period_days || 0));

      if (today > graceDate) {
        recordsProcessed++;
        const diffTime = Math.abs(today.getTime() - graceDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let calculatedFine = 0;
        if (rule.fine_type === 'flat') {
          calculatedFine = rule.fine_amount;
        } else if (rule.fine_type === 'daily') {
          calculatedFine = diffDays * rule.fine_amount;
        }

        if (rule.max_fine_amount > 0) {
          calculatedFine = Math.min(calculatedFine, rule.max_fine_amount);
        }

        if (calculatedFine > record.fine_amount) {
          const fineDiff = calculatedFine - record.fine_amount;
          const newFineTotal = calculatedFine;
          const newOutstanding = (record.total_amount + newFineTotal) - (record.paid_amount + record.concession_amount) + record.refund_amount;

          await this.repo.updateRecordStatusAndTotals(record.id, { fine_amount: newFineTotal, status: 'OVERDUE' }, userId);

          await this.repo.addLedgerEntry(
            crypto.randomUUID(),
            institutionId,
            record.student_id,
            record.id,
            'FINE',
            fineDiff,
            newOutstanding,
            `Late fee applied: ${rule.name} (₹${fineDiff})`,
            rule.id,
            userId
          );

          finesApplied++;
        }
      }
    }

    return { recordsProcessed, finesApplied };
  }

  // --- LEDGER & REMINDERS ---
  async getLedgerEntries(institutionId: string, options: any = {}): Promise<any[]> {
    return await this.repo.getLedgerEntries(institutionId, options);
  }

  async sendFeeReminder(institutionId: string, studentId: string, recordId: string | null, reminderType: 'EMAIL' | 'SMS' | 'WHATSAPP', recipient: string, message: string, userId?: string): Promise<string> {
    const id = crypto.randomUUID();
    await this.repo.logReminder(id, institutionId, studentId, recordId, reminderType, recipient, message, userId);
    return id;
  }

  async listReminders(institutionId: string, studentId?: string): Promise<any[]> {
    return await this.repo.listReminders(institutionId, studentId);
  }

  // --- REPORTS ---
  async getFeeSummaryStats(institutionId: string): Promise<any> {
    return await this.repo.getFeeSummaryStats(institutionId);
  }

  async getMonthlyCollection(institutionId: string): Promise<any[]> {
    return await this.repo.getMonthlyCollection(institutionId);
  }

  async getCashierSummary(institutionId: string): Promise<any[]> {
    return await this.repo.getCashierSummary(institutionId);
  }

  async getPaymentMethodDistribution(institutionId: string): Promise<any[]> {
    return await this.repo.getPaymentMethodDistribution(institutionId);
  }

  async getRevenueByFeeHead(institutionId: string): Promise<any[]> {
    return await this.repo.getRevenueByFeeHead(institutionId);
  }

  async getTopDefaulters(institutionId: string): Promise<any[]> {
    return await this.repo.getTopDefaulters(institutionId);
  }

  // --- INSTALLMENTS ---
  async createInstallmentPlan(institutionId: string, input: CreateInstallmentPlanInput, userId?: string): Promise<void> {
    const record = await this.repo.getRecordById(input.student_fee_record_id);
    if (!record || record.institution_id !== institutionId) throw new Error('Fee record not found');

    const totalInstallmentAmount = input.installments.reduce((sum, i) => sum + i.amount, 0);
    if (Math.abs(totalInstallmentAmount - record.total_amount) > 1) {
      throw new Error(`Installment amounts (₹${totalInstallmentAmount}) must equal total fee amount (₹${record.total_amount})`);
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
