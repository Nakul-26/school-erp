import { 
  FeeStructure, CreateFeeStructureInput, 
  StudentFeeRecord, CreateStudentFeeRecordInput, 
  FeePayment, CreatePaymentInput, FeeReceipt,
  FeeConcession, CreateConcessionInput, FeeInstallment, CreateInstallmentPlanInput,
  FeeRefund, CreateRefundInput, FeeFineRule, CreateFineRuleInput, FinancialLedgerEntry, FeeReminder
} from './fees.types';

export class FeesRepository {
  constructor(private db: D1Database) {}

  // Runs prepared statements as a single atomic D1 batch (all-or-nothing).
  runBatch(statements: D1PreparedStatement[]): Promise<D1Result[]> {
    return this.db.batch(statements);
  }

  // --- FEE STRUCTURES ---
  async getNextVersionNumber(institutionId: string, academicYearId: string, courseId: string, yearNumber: number, feeType: string): Promise<number> {
    const res = await this.db.prepare(`
      SELECT MAX(version) as max_version 
      FROM fee_structures 
      WHERE institution_id = ? AND academic_year_id = ? AND course_id = ? AND year_number = ? AND fee_type = ?
    `).bind(institutionId, academicYearId, courseId, yearNumber, feeType).first<{ max_version: number | null }>();
    return (res?.max_version || 0) + 1;
  }

  async createStructure(id: string, institutionId: string, input: CreateFeeStructureInput, userId?: string, parentVersionId?: string): Promise<void> {
    const version = await this.getNextVersionNumber(institutionId, input.academic_year_id, input.course_id, input.year_number, input.fee_type);
    const status = input.status || 'ACTIVE';

    await this.db.prepare(`
      INSERT INTO fee_structures (
        id, institution_id, academic_year_id, course_id, year_number, fee_type, amount, version, status, parent_version_id, created_by, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, institutionId, input.academic_year_id, input.course_id, input.year_number, input.fee_type, input.amount, version, status, parentVersionId || null, userId || null, userId || null
    ).run();
  }

  async listStructures(institutionId: string): Promise<any[]> {
    const { results } = await this.db.prepare(`
      SELECT fs.*, ay.name AS academic_year_name, c.name AS course_name, c.course_code
      FROM fee_structures fs
      JOIN academic_years ay ON fs.academic_year_id = ay.id
      JOIN courses c ON fs.course_id = c.id
      WHERE fs.institution_id = ? AND fs.is_active = 1
      ORDER BY fs.academic_year_id DESC, c.name ASC, fs.year_number ASC, fs.version DESC
    `).bind(institutionId).all<any>();
    return results || [];
  }

  async getStructureById(id: string): Promise<FeeStructure | null> {
    return await this.db.prepare('SELECT * FROM fee_structures WHERE id = ? AND is_active = 1').bind(id).first<FeeStructure>();
  }

  async countStructureAllocations(structureId: string): Promise<number> {
    const res = await this.db.prepare(`
      SELECT COUNT(*) as cnt FROM student_fee_records WHERE fee_structure_id = ? AND is_active = 1
    `).bind(structureId).first<{ cnt: number }>();
    return res?.cnt || 0;
  }

  async deleteStructure(id: string, userId?: string): Promise<void> {
    await this.db.prepare(`
      UPDATE fee_structures
      SET is_active = 0, status = 'ARCHIVED', deleted_at = datetime('now'), updated_by = ?
      WHERE id = ?
    `).bind(userId || null, id).run();
  }

  // --- STUDENT FEE RECORDS ---
  async getStudentById(institutionId: string, studentId: string): Promise<any | null> {
    return await this.db.prepare(`
      SELECT s.*
      FROM students s
      WHERE s.id = ? AND s.institution_id = ? AND s.is_active = 1
    `).bind(studentId, institutionId).first<any>();
  }

  async checkExistingAllocation(studentId: string, academicYearId: string, courseId: string, yearNumber: number, feeType: string): Promise<StudentFeeRecord | null> {
    return await this.db.prepare(`
      SELECT * FROM student_fee_records
      WHERE student_id = ? AND academic_year_id = ? AND course_id = ? AND year_number = ? AND fee_type = ? AND is_active = 1
    `).bind(studentId, academicYearId, courseId, yearNumber, feeType).first<StudentFeeRecord>();
  }

  async createFeeRecord(id: string, institutionId: string, input: CreateStudentFeeRecordInput, userId?: string): Promise<void> {
    await this.db.prepare(`
      INSERT INTO student_fee_records (
        id, institution_id, student_id, academic_year_id, course_id, year_number, 
        fee_structure_id, fee_type, total_amount, paid_amount, concession_amount, fine_amount, refund_amount, due_date, status, created_by, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0.0, 0.0, 0.0, 0.0, ?, 'UNPAID', ?, ?)
    `).bind(
      id, institutionId, input.student_id, input.academic_year_id, input.course_id, input.year_number,
      input.fee_structure_id || null, input.fee_type, input.total_amount, input.due_date || null, userId || null, userId || null
    ).run();
  }

  async listStudentRecords(institutionId: string, options: {
    search?: string;
    student_id?: string;
    academic_year_id?: string;
    course_id?: string;
    status?: string;
  } = {}): Promise<any[]> {
    let query = `
      SELECT sfr.*, s.first_name, s.last_name, s.admission_number, s.roll_number, c.name AS course_name, ay.name AS academic_year_name
      FROM student_fee_records sfr
      JOIN students s ON sfr.student_id = s.id
      JOIN courses c ON sfr.course_id = c.id
      JOIN academic_years ay ON sfr.academic_year_id = ay.id
      WHERE sfr.institution_id = ? AND sfr.is_active = 1
    `;
    const params: any[] = [institutionId];

    if (options.student_id) {
      query += ` AND sfr.student_id = ?`;
      params.push(options.student_id);
    }
    if (options.academic_year_id) {
      query += ` AND sfr.academic_year_id = ?`;
      params.push(options.academic_year_id);
    }
    if (options.course_id) {
      query += ` AND sfr.course_id = ?`;
      params.push(options.course_id);
    }
    if (options.status) {
      query += ` AND sfr.status = ?`;
      params.push(options.status);
    }
    if (options.search) {
      query += ` AND (s.first_name LIKE ? OR s.last_name LIKE ? OR s.admission_number LIKE ? OR s.roll_number LIKE ?)`;
      const pattern = `%${options.search}%`;
      params.push(pattern, pattern, pattern, pattern);
    }

    query += ` ORDER BY sfr.created_at DESC`;

    const { results } = await this.db.prepare(query).bind(...params).all<any>();
    return results || [];
  }

  async getStudentLedger(studentId: string): Promise<any[]> {
    const { results } = await this.db.prepare(`
      SELECT sfr.*, ay.name AS academic_year_name, c.name AS course_name
      FROM student_fee_records sfr
      JOIN academic_years ay ON sfr.academic_year_id = ay.id
      JOIN courses c ON sfr.course_id = c.id
      WHERE sfr.student_id = ? AND sfr.is_active = 1
      ORDER BY sfr.due_date ASC, sfr.created_at ASC
    `).bind(studentId).all<any>();
    return results || [];
  }

  async getRecordById(id: string): Promise<StudentFeeRecord | null> {
    return await this.db.prepare('SELECT * FROM student_fee_records WHERE id = ? AND is_active = 1').bind(id).first<StudentFeeRecord>();
  }

  async updateRecordStatusAndTotals(
    id: string, 
    totals: { paid_amount?: number; concession_amount?: number; fine_amount?: number; refund_amount?: number; status: string }, 
    userId?: string
  ): Promise<void> {
    const updates: string[] = ['status = ?', 'updated_at = datetime(\'now\')', 'updated_by = ?'];
    const params: any[] = [totals.status, userId || null];

    if (totals.paid_amount !== undefined) {
      updates.push('paid_amount = ?');
      params.push(totals.paid_amount);
    }
    if (totals.concession_amount !== undefined) {
      updates.push('concession_amount = ?');
      params.push(totals.concession_amount);
    }
    if (totals.fine_amount !== undefined) {
      updates.push('fine_amount = ?');
      params.push(totals.fine_amount);
    }
    if (totals.refund_amount !== undefined) {
      updates.push('refund_amount = ?');
      params.push(totals.refund_amount);
    }

    params.push(id);
    await this.db.prepare(`UPDATE student_fee_records SET ${updates.join(', ')} WHERE id = ?`).bind(...params).run();
  }

  async deleteFeeRecord(id: string, userId?: string): Promise<void> {
    await this.db.prepare(`
      UPDATE student_fee_records SET is_active = 0, deleted_at = datetime('now'), updated_by = ? WHERE id = ?
    `).bind(userId || null, id).run();
  }

  // --- FEE PAYMENTS & DUPLICATE PREVENTION ---
  async getPaymentByTransactionRef(institutionId: string, txRef: string): Promise<FeePayment | null> {
    if (!txRef || !txRef.trim()) return null;
    return await this.db.prepare(`
      SELECT * FROM fee_payments 
      WHERE institution_id = ? AND transaction_reference = ? AND is_active = 1
    `).bind(institutionId, txRef.trim()).first<FeePayment>();
  }

  async countPaymentsForRecord(recordId: string): Promise<number> {
    const res = await this.db.prepare(`
      SELECT COUNT(*) as cnt FROM fee_payments WHERE student_fee_record_id = ? AND is_active = 1
    `).bind(recordId).first<{ cnt: number }>();
    return res?.cnt || 0;
  }

  async createPayment(id: string, institutionId: string, input: CreatePaymentInput, receiptNumber: string, userId?: string): Promise<void> {
    await this.createPaymentStatement(id, institutionId, input, receiptNumber, userId).run();
  }

  createPaymentStatement(id: string, institutionId: string, input: CreatePaymentInput, receiptNumber: string, userId?: string): D1PreparedStatement {
    return this.db.prepare(`
      INSERT INTO fee_payments (
        id, institution_id, student_id, student_fee_record_id, amount, payment_date, payment_method, transaction_reference, remarks, status, receipt_number, collected_by, created_by, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'COMPLETED', ?, ?, ?, ?)
    `).bind(
      id, institutionId, input.student_id, input.student_fee_record_id, input.amount, input.payment_date, input.payment_method,
      input.transaction_reference ? input.transaction_reference.trim() : null, input.remarks || null, receiptNumber, userId || null, userId || null, userId || null
    );
  }

  // Reserves the next sequential receipt number for (institution, year) atomically,
  // via a single upsert+RETURNING statement - avoids the read-then-write race of
  // the previous COUNT(*)+1 approach where concurrent payments could collide.
  async reserveNextReceiptSequence(institutionId: string, year: string): Promise<number> {
    const res = await this.db.prepare(`
      INSERT INTO fee_receipt_counters (institution_id, year, next_seq)
      VALUES (?, ?, 2)
      ON CONFLICT(institution_id, year) DO UPDATE SET next_seq = next_seq + 1
      RETURNING next_seq - 1 AS seq
    `).bind(institutionId, year).first<{ seq: number }>();
    return res!.seq;
  }

  // Optimistic-concurrency variant: only applies if paid_amount still matches what
  // the caller last read, so two concurrent payments against the same fee record
  // can't silently overwrite each other's totals.
  updateRecordStatusAndTotalsStatement(
    id: string,
    expectedPaidAmount: number,
    totals: { paid_amount?: number; concession_amount?: number; fine_amount?: number; refund_amount?: number; status: string },
    userId?: string
  ): D1PreparedStatement {
    const updates: string[] = ['status = ?', "updated_at = datetime('now')", 'updated_by = ?'];
    const params: any[] = [totals.status, userId || null];

    if (totals.paid_amount !== undefined) {
      updates.push('paid_amount = ?');
      params.push(totals.paid_amount);
    }
    if (totals.concession_amount !== undefined) {
      updates.push('concession_amount = ?');
      params.push(totals.concession_amount);
    }
    if (totals.fine_amount !== undefined) {
      updates.push('fine_amount = ?');
      params.push(totals.fine_amount);
    }
    if (totals.refund_amount !== undefined) {
      updates.push('refund_amount = ?');
      params.push(totals.refund_amount);
    }

    params.push(id, expectedPaidAmount);
    return this.db.prepare(
      `UPDATE student_fee_records SET ${updates.join(', ')} WHERE id = ? AND paid_amount = ?`
    ).bind(...params);
  }

  createReceiptStatement(id: string, institutionId: string, paymentId: string, receiptNumber: string, userId?: string): D1PreparedStatement {
    return this.db.prepare(`
      INSERT INTO fee_receipts (id, institution_id, payment_id, receipt_number, created_by, updated_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(id, institutionId, paymentId, receiptNumber, userId || null, userId || null);
  }

  addLedgerEntryStatement(
    id: string,
    institutionId: string,
    studentId: string,
    studentFeeRecordId: string | null,
    entryType: 'ALLOCATION' | 'PAYMENT' | 'DISCOUNT' | 'SCHOLARSHIP' | 'FINE' | 'REFUND' | 'ADJUSTMENT',
    amount: number,
    balanceAfter: number,
    description: string,
    referenceId?: string | null,
    userId?: string
  ): D1PreparedStatement {
    return this.db.prepare(`
      INSERT INTO financial_ledger (
        id, institution_id, student_id, student_fee_record_id, entry_type, amount, balance_after, description, reference_id, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, institutionId, studentId, studentFeeRecordId || null, entryType, amount, balanceAfter, description, referenceId || null, userId || null
    );
  }

  // Builds the complete atomic write-set for makePayment(): the optimistic-
  // lock guard update, plus the payment/receipt/ledger inserts, as ONE D1
  // batch (single transaction). Previously the guard ran as a standalone
  // `.run()` and the three inserts as a *separate* `.batch()` call
  // immediately after - two round-trips with a gap between them. Under load
  // testing at high concurrency, a request that got torn down in that gap
  // (timeout, worker eviction, network blip) left the guard's paid_amount
  // bump committed with no payment/receipt/ledger row behind it: money
  // recorded as paid with zero trail of what was paid or why.
  //
  // Each insert is written as `INSERT ... SELECT ... WHERE EXISTS(...)`,
  // re-checking that the record now shows `paid_amount = newPaidAmount` (the
  // value *this* guard update just tried to set). Because everything below
  // runs inside one D1 batch/transaction, nothing else can touch the row
  // between statements - so if the guard's UPDATE matched 0 rows (a
  // concurrent payment beat us to it), the row never reaches that value and
  // every dependent insert becomes a no-op in the same atomic step, instead
  // of a separate compensating action after the fact.
  buildPaymentBatchStatements(params: {
    recordId: string;
    expectedPaidAmount: number;
    newPaidAmount: number;
    status: string;
    institutionId: string;
    input: CreatePaymentInput;
    paymentId: string;
    receiptId: string;
    ledgerId: string;
    receiptNumber: string;
    newOutstanding: number;
    userId?: string;
  }): D1PreparedStatement[] {
    const { recordId, expectedPaidAmount, newPaidAmount, status, institutionId, input, paymentId, receiptId, ledgerId, receiptNumber, newOutstanding, userId } = params;

    const guardUpdate = this.updateRecordStatusAndTotalsStatement(recordId, expectedPaidAmount, { paid_amount: newPaidAmount, status }, userId);

    const stillApplied = `EXISTS (SELECT 1 FROM student_fee_records WHERE id = ? AND paid_amount = ?)`;

    const paymentInsert = this.db.prepare(`
      INSERT INTO fee_payments (
        id, institution_id, student_id, student_fee_record_id, amount, payment_date, payment_method, transaction_reference, remarks, status, receipt_number, collected_by, created_by, updated_by
      )
      SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, 'COMPLETED', ?, ?, ?, ?
      WHERE ${stillApplied}
    `).bind(
      paymentId, institutionId, input.student_id, recordId, input.amount, input.payment_date, input.payment_method,
      input.transaction_reference ? input.transaction_reference.trim() : null, input.remarks || null, receiptNumber, userId || null, userId || null, userId || null,
      recordId, newPaidAmount
    );

    const receiptInsert = this.db.prepare(`
      INSERT INTO fee_receipts (id, institution_id, payment_id, receipt_number, created_by, updated_by)
      SELECT ?, ?, ?, ?, ?, ?
      WHERE ${stillApplied}
    `).bind(receiptId, institutionId, paymentId, receiptNumber, userId || null, userId || null, recordId, newPaidAmount);

    const ledgerInsert = this.db.prepare(`
      INSERT INTO financial_ledger (
        id, institution_id, student_id, student_fee_record_id, entry_type, amount, balance_after, description, reference_id, created_by
      )
      SELECT ?, ?, ?, ?, 'PAYMENT', ?, ?, ?, ?, ?
      WHERE ${stillApplied}
    `).bind(
      ledgerId, institutionId, input.student_id, recordId, input.amount, newOutstanding,
      `Payment received via ${input.payment_method} (${receiptNumber})`, paymentId, userId || null,
      recordId, newPaidAmount
    );

    return [guardUpdate, paymentInsert, receiptInsert, ledgerInsert];
  }

  async getPaymentById(id: string): Promise<FeePayment | null> {
    return await this.db.prepare('SELECT * FROM fee_payments WHERE id = ? AND is_active = 1').bind(id).first<FeePayment>();
  }

  async listPayments(institutionId: string, options: {
    student_id?: string;
    payment_method?: string;
    receipt_number?: string;
    transaction_reference?: string;
    start_date?: string;
    end_date?: string;
  } = {}): Promise<any[]> {
    let query = `
      SELECT fp.*, s.first_name, s.last_name, s.admission_number, sfr.fee_type, COALESCE(fp.receipt_number, fr.receipt_number) as receipt_number
      FROM fee_payments fp
      JOIN students s ON fp.student_id = s.id
      JOIN student_fee_records sfr ON fp.student_fee_record_id = sfr.id
      LEFT JOIN fee_receipts fr ON fr.payment_id = fp.id
      WHERE fp.institution_id = ? AND fp.is_active = 1
    `;
    const params: any[] = [institutionId];

    if (options.student_id) {
      query += ` AND fp.student_id = ?`;
      params.push(options.student_id);
    }
    if (options.payment_method) {
      query += ` AND fp.payment_method = ?`;
      params.push(options.payment_method);
    }
    if (options.receipt_number) {
      query += ` AND (fp.receipt_number LIKE ? OR fr.receipt_number LIKE ?)`;
      params.push(`%${options.receipt_number}%`, `%${options.receipt_number}%`);
    }
    if (options.transaction_reference) {
      query += ` AND fp.transaction_reference LIKE ?`;
      params.push(`%${options.transaction_reference}%`);
    }
    if (options.start_date) {
      query += ` AND fp.payment_date >= ?`;
      params.push(options.start_date);
    }
    if (options.end_date) {
      query += ` AND fp.payment_date <= ?`;
      params.push(options.end_date);
    }

    query += ` ORDER BY fp.payment_date DESC, fp.created_at DESC`;

    const { results } = await this.db.prepare(query).bind(...params).all<any>();
    return results || [];
  }

  // --- RECEIPTS ---
  async createReceipt(id: string, institutionId: string, paymentId: string, receiptNumber: string, userId?: string): Promise<void> {
    await this.db.prepare(`
      INSERT INTO fee_receipts (id, institution_id, payment_id, receipt_number, created_by, updated_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(id, institutionId, paymentId, receiptNumber, userId || null, userId || null).run();
  }

  async getReceiptDetails(receiptIdOrNumber: string): Promise<any | null> {
    return await this.db.prepare(`
      SELECT fr.id AS receipt_id, fr.receipt_number, fr.created_at AS receipt_date,
             fp.id AS payment_id, fp.amount, fp.payment_date, fp.payment_method, fp.transaction_reference, fp.remarks, fp.status as payment_status,
             s.id AS student_id, s.first_name, s.last_name, s.admission_number, s.roll_number,
             sfr.id AS record_id, sfr.fee_type, sfr.total_amount, sfr.paid_amount, sfr.due_date, sfr.concession_amount, sfr.fine_amount, sfr.refund_amount,
             ay.name AS academic_year_name, c.name AS course_name,
             inst.name AS institution_name, inst.email AS institution_email, inst.phone AS institution_phone, inst.address AS institution_address
      FROM fee_receipts fr
      JOIN fee_payments fp ON fr.payment_id = fp.id
      JOIN student_fee_records sfr ON fp.student_fee_record_id = sfr.id
      JOIN students s ON fp.student_id = s.id
      JOIN academic_years ay ON sfr.academic_year_id = ay.id
      JOIN courses c ON sfr.course_id = c.id
      JOIN institutions inst ON fr.institution_id = inst.id
      WHERE (fr.id = ? OR fr.receipt_number = ? OR fp.id = ?) AND fr.is_active = 1
    `).bind(receiptIdOrNumber, receiptIdOrNumber, receiptIdOrNumber).first<any>();
  }

  async getReceiptByPaymentId(paymentId: string): Promise<any | null> {
    return this.getReceiptDetails(paymentId);
  }

  async listReceipts(institutionId: string): Promise<any[]> {
    const { results } = await this.db.prepare(`
      SELECT fr.*, fp.amount, fp.payment_date, fp.payment_method, s.first_name, s.last_name, s.admission_number
      FROM fee_receipts fr
      JOIN fee_payments fp ON fr.payment_id = fp.id
      JOIN students s ON fp.student_id = s.id
      WHERE fr.institution_id = ? AND fr.is_active = 1
      ORDER BY fr.created_at DESC
    `).bind(institutionId).all<any>();
    return results || [];
  }

  // --- REFUNDS & WORKFLOW ---
  async createRefund(refundId: string, institutionId: string, input: CreateRefundInput, payment: FeePayment, userId?: string): Promise<void> {
    await this.db.prepare(`
      INSERT INTO fee_refunds (
        id, institution_id, payment_id, student_fee_record_id, student_id, refund_amount, refund_reason, refund_date, refund_reference, approved_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), ?, ?)
    `).bind(
      refundId, institutionId, payment.id, payment.student_fee_record_id, payment.student_id,
      input.refund_amount, input.refund_reason, input.refund_reference || null, userId || null
    ).run();
  }

  async updatePaymentRefundStatus(paymentId: string, newStatus: string, userId?: string): Promise<void> {
    await this.db.prepare(`
      UPDATE fee_payments SET status = ?, updated_at = datetime('now'), updated_by = ? WHERE id = ?
    `).bind(newStatus, userId || null, paymentId).run();
  }

  async getRefundsForPayment(paymentId: string): Promise<FeeRefund[]> {
    const { results } = await this.db.prepare(`
      SELECT * FROM fee_refunds WHERE payment_id = ? ORDER BY created_at DESC
    `).bind(paymentId).all<FeeRefund>();
    return results || [];
  }

  async listRefunds(institutionId: string): Promise<any[]> {
    const { results } = await this.db.prepare(`
      SELECT fr.*, s.first_name, s.last_name, s.admission_number, fp.amount as payment_amount, fp.receipt_number
      FROM fee_refunds fr
      JOIN students s ON fr.student_id = s.id
      JOIN fee_payments fp ON fr.payment_id = fp.id
      WHERE fr.institution_id = ?
      ORDER BY fr.created_at DESC
    `).bind(institutionId).all<any>();
    return results || [];
  }

  // --- FINE & DUE DATE ENGINE ---
  async createFineRule(id: string, institutionId: string, input: CreateFineRuleInput, userId?: string): Promise<void> {
    await this.db.prepare(`
      INSERT INTO fee_fine_rules (id, institution_id, name, grace_period_days, fine_type, fine_amount, max_fine_amount, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, institutionId, input.name, input.grace_period_days || 0, input.fine_type, input.fine_amount, input.max_fine_amount || 0, userId || null
    ).run();
  }

  async listFineRules(institutionId: string): Promise<FeeFineRule[]> {
    const { results } = await this.db.prepare(`
      SELECT * FROM fee_fine_rules WHERE institution_id = ? AND is_active = 1 ORDER BY created_at DESC
    `).bind(institutionId).all<FeeFineRule>();
    return results || [];
  }

  async deleteFineRule(id: string, userId?: string): Promise<void> {
    await this.db.prepare(`
      UPDATE fee_fine_rules SET is_active = 0, updated_at = datetime('now'), created_by = ? WHERE id = ?
    `).bind(userId || null, id).run();
  }

  // --- FINANCIAL LEDGER (IMMUTABLE) ---
  async addLedgerEntry(
    id: string,
    institutionId: string,
    studentId: string,
    studentFeeRecordId: string | null,
    entryType: 'ALLOCATION' | 'PAYMENT' | 'DISCOUNT' | 'SCHOLARSHIP' | 'FINE' | 'REFUND' | 'ADJUSTMENT',
    amount: number,
    balanceAfter: number,
    description: string,
    referenceId?: string | null,
    userId?: string
  ): Promise<void> {
    await this.db.prepare(`
      INSERT INTO financial_ledger (
        id, institution_id, student_id, student_fee_record_id, entry_type, amount, balance_after, description, reference_id, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, institutionId, studentId, studentFeeRecordId || null, entryType, amount, balanceAfter, description, referenceId || null, userId || null
    ).run();
  }

  async getLedgerEntries(institutionId: string, options: { student_id?: string; record_id?: string } = {}): Promise<FinancialLedgerEntry[]> {
    let query = `
      SELECT fl.*, s.first_name, s.last_name, s.admission_number
      FROM financial_ledger fl
      JOIN students s ON fl.student_id = s.id
      WHERE fl.institution_id = ?
    `;
    const params: any[] = [institutionId];

    if (options.student_id) {
      query += ` AND fl.student_id = ?`;
      params.push(options.student_id);
    }
    if (options.record_id) {
      query += ` AND fl.student_fee_record_id = ?`;
      params.push(options.record_id);
    }

    query += ` ORDER BY fl.created_at DESC`;

    const { results } = await this.db.prepare(query).bind(...params).all<any>();
    return results || [];
  }

  // --- REMINDERS ---
  async logReminder(
    id: string,
    institutionId: string,
    studentId: string,
    studentFeeRecordId: string | null,
    reminderType: 'EMAIL' | 'SMS' | 'WHATSAPP',
    recipient: string,
    message: string,
    userId?: string
  ): Promise<void> {
    await this.db.prepare(`
      INSERT INTO fee_reminders (id, institution_id, student_id, student_fee_record_id, reminder_type, recipient, message, status, sent_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'SENT', ?)
    `).bind(id, institutionId, studentId, studentFeeRecordId || null, reminderType, recipient, message, userId || null).run();
  }

  async listReminders(institutionId: string, studentId?: string): Promise<FeeReminder[]> {
    let query = `
      SELECT fr.*, s.first_name, s.last_name, s.admission_number
      FROM fee_reminders fr
      JOIN students s ON fr.student_id = s.id
      WHERE fr.institution_id = ?
    `;
    const params: any[] = [institutionId];

    if (studentId) {
      query += ` AND fr.student_id = ?`;
      params.push(studentId);
    }

    query += ` ORDER BY fr.sent_at DESC`;

    const { results } = await this.db.prepare(query).bind(...params).all<any>();
    return results || [];
  }

  // --- REPORTS & ANALYTICS ---
  async getFeeSummaryStats(institutionId: string): Promise<any> {
    const stats = await this.db.prepare(`
      SELECT 
        COALESCE(SUM(total_amount), 0) AS total_allocated,
        COALESCE(SUM(paid_amount), 0) AS total_collected,
        COALESCE(SUM(concession_amount), 0) AS total_concessions,
        COALESCE(SUM(fine_amount), 0) AS total_fines,
        COALESCE(SUM(refund_amount), 0) AS total_refunds,
        COALESCE(SUM( (total_amount + fine_amount) - (paid_amount + concession_amount) + refund_amount ), 0) AS total_outstanding,
        COUNT(CASE WHEN status = 'OVERDUE' OR (due_date < date('now') AND status != 'PAID') THEN 1 END) AS overdue_count,
        COUNT(*) as total_records
      FROM student_fee_records
      WHERE institution_id = ? AND is_active = 1
    `).bind(institutionId).first<any>();

    const todayCollection = await this.db.prepare(`
      SELECT COALESCE(SUM(amount), 0) AS today_amount
      FROM fee_payments
      WHERE institution_id = ? AND is_active = 1 AND payment_date = date('now')
    `).bind(institutionId).first<any>();

    const monthlyCollection = await this.db.prepare(`
      SELECT COALESCE(SUM(amount), 0) AS monthly_amount
      FROM fee_payments
      WHERE institution_id = ? AND is_active = 1 AND strftime('%Y-%m', payment_date) = strftime('%Y-%m', 'now')
    `).bind(institutionId).first<any>();

    const allocated = stats?.total_allocated || 0;
    const collected = stats?.total_collected || 0;
    const collectionPercentage = allocated > 0 ? Math.round((collected / allocated) * 100 * 100) / 100 : 0;

    return {
      total_allocated: stats?.total_allocated || 0,
      total_collected: stats?.total_collected || 0,
      total_concessions: stats?.total_concessions || 0,
      total_fines: stats?.total_fines || 0,
      total_refunds: stats?.total_refunds || 0,
      total_outstanding: Math.max(0, stats?.total_outstanding || 0),
      overdue_count: stats?.overdue_count || 0,
      total_records: stats?.total_records || 0,
      today_collection: todayCollection?.today_amount || 0,
      monthly_collection: monthlyCollection?.monthly_amount || 0,
      collection_percentage: collectionPercentage
    };
  }

  async getMonthlyCollection(institutionId: string): Promise<any[]> {
    const { results } = await this.db.prepare(`
      SELECT strftime('%Y-%m', payment_date) AS month, SUM(amount) AS total_amount, COUNT(*) as count
      FROM fee_payments
      WHERE institution_id = ? AND is_active = 1
      GROUP BY month
      ORDER BY month DESC
      LIMIT 12
    `).bind(institutionId).all<any>();
    return results || [];
  }

  async getCashierSummary(institutionId: string): Promise<any[]> {
    const { results } = await this.db.prepare(`
      SELECT u.id as user_id, u.name as cashier_name, u.email as cashier_email,
             COUNT(fp.id) as transactions_count, COALESCE(SUM(fp.amount), 0) as total_collected
      FROM fee_payments fp
      LEFT JOIN users u ON fp.collected_by = u.id OR fp.created_by = u.id
      WHERE fp.institution_id = ? AND fp.is_active = 1
      GROUP BY u.id, u.name, u.email
      ORDER BY total_collected DESC
    `).bind(institutionId).all<any>();
    return results || [];
  }

  async getPaymentMethodDistribution(institutionId: string): Promise<any[]> {
    const { results } = await this.db.prepare(`
      SELECT payment_method, COUNT(*) as count, SUM(amount) as total_amount
      FROM fee_payments
      WHERE institution_id = ? AND is_active = 1
      GROUP BY payment_method
      ORDER BY total_amount DESC
    `).bind(institutionId).all<any>();
    return results || [];
  }

  async getRevenueByFeeHead(institutionId: string): Promise<any[]> {
    const { results } = await this.db.prepare(`
      SELECT sfr.fee_type, SUM(sfr.paid_amount) as total_collected, SUM(sfr.total_amount) as total_allocated
      FROM student_fee_records sfr
      WHERE sfr.institution_id = ? AND sfr.is_active = 1
      GROUP BY sfr.fee_type
      ORDER BY total_collected DESC
    `).bind(institutionId).all<any>();
    return results || [];
  }

  async getTopDefaulters(institutionId: string): Promise<any[]> {
    const { results } = await this.db.prepare(`
      SELECT s.id AS student_id, s.first_name, s.last_name, s.admission_number, c.name AS course_name,
             SUM( (sfr.total_amount + sfr.fine_amount) - (sfr.paid_amount + sfr.concession_amount) + sfr.refund_amount ) AS total_due
      FROM student_fee_records sfr
      JOIN students s ON sfr.student_id = s.id
      JOIN courses c ON sfr.course_id = c.id
      WHERE sfr.institution_id = ? AND sfr.is_active = 1 AND sfr.status != 'PAID'
      GROUP BY s.id, s.first_name, s.last_name, s.admission_number, c.name
      HAVING total_due > 0
      ORDER BY total_due DESC
      LIMIT 20
    `).bind(institutionId).all<any>();
    return results || [];
  }

  // --- CONCESSIONS ---
  async createConcession(id: string, institutionId: string, input: CreateConcessionInput, discountAmount: number, userId?: string): Promise<void> {
    await this.db.prepare(`
      INSERT INTO fee_concessions (
        id, institution_id, student_fee_record_id, student_id, concession_type, discount_type, discount_value, discount_amount, reason, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, institutionId, input.student_fee_record_id, input.student_id, input.concession_type, input.discount_type, input.discount_value, discountAmount, input.reason || null, userId || null
    ).run();
  }

  async getConcessionById(id: string): Promise<FeeConcession | null> {
    return await this.db.prepare('SELECT * FROM fee_concessions WHERE id = ? AND is_active = 1').bind(id).first<FeeConcession>();
  }

  async deleteConcession(id: string, userId?: string): Promise<void> {
    await this.db.prepare(`
      UPDATE fee_concessions SET is_active = 0, updated_at = datetime('now') WHERE id = ?
    `).bind(id).run();
  }

  async listConcessionsByRecord(recordId: string): Promise<any[]> {
    const { results } = await this.db.prepare(`
      SELECT * FROM fee_concessions WHERE student_fee_record_id = ? AND is_active = 1 ORDER BY created_at DESC
    `).bind(recordId).all<any>();
    return results || [];
  }

  // --- INSTALLMENTS ---
  async createInstallments(institutionId: string, input: CreateInstallmentPlanInput, userId?: string): Promise<void> {
    for (let i = 0; i < input.installments.length; i++) {
      const inst = input.installments[i];
      const id = crypto.randomUUID();
      await this.db.prepare(`
        INSERT INTO fee_installments (
          id, institution_id, student_fee_record_id, student_id, installment_number, due_date, amount, paid_amount, status, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 0.0, 'Pending', ?)
      `).bind(id, institutionId, input.student_fee_record_id, input.student_id, i + 1, inst.due_date, inst.amount, userId || null).run();
    }
  }

  async listInstallmentsByRecord(recordId: string): Promise<any[]> {
    const { results } = await this.db.prepare(`
      SELECT * FROM fee_installments WHERE student_fee_record_id = ? AND is_active = 1 ORDER BY installment_number ASC
    `).bind(recordId).all<any>();
    return results || [];
  }

  async updateOverdueInstallments(recordId: string): Promise<void> {
    await this.db.prepare(`
      UPDATE fee_installments
      SET status = 'Overdue'
      WHERE student_fee_record_id = ? AND status = 'Pending' AND due_date < date('now')
    `).bind(recordId).run();
  }

  async getInstallmentById(id: string): Promise<FeeInstallment | null> {
    return await this.db.prepare('SELECT * FROM fee_installments WHERE id = ? AND is_active = 1').bind(id).first<FeeInstallment>();
  }

  async payInstallment(id: string, amount: number, userId?: string): Promise<void> {
    const inst = await this.getInstallmentById(id);
    if (!inst) return;
    const newPaid = inst.paid_amount + amount;
    const status = newPaid >= inst.amount ? 'Paid' : inst.status;
    await this.db.prepare(`
      UPDATE fee_installments SET paid_amount = ?, status = ?, updated_at = datetime('now') WHERE id = ?
    `).bind(newPaid, status, id).run();
  }
}
