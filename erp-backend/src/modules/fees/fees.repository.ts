import { 
  FeeStructure, CreateFeeStructureInput, 
  StudentFeeRecord, CreateStudentFeeRecordInput, 
  FeePayment, CreatePaymentInput, FeeReceipt,
  FeeConcession, CreateConcessionInput, FeeInstallment, CreateInstallmentPlanInput
} from './fees.types';

export class FeesRepository {
  constructor(private db: D1Database) {}

  // --- FEE STRUCTURES ---
  async createStructure(id: string, institutionId: string, input: CreateFeeStructureInput, userId?: string): Promise<void> {
    await this.db.prepare(`
      INSERT INTO fee_structures (
        id, institution_id, academic_year_id, course_id, year_number, fee_type, amount, created_by, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, institutionId, input.academic_year_id, input.course_id, input.year_number, input.fee_type, input.amount, userId || null, userId || null
    ).run();
  }

  async listStructures(institutionId: string): Promise<any[]> {
    const { results } = await this.db.prepare(`
      SELECT fs.*, ay.name AS academic_year_name, c.name AS course_name, c.course_code
      FROM fee_structures fs
      JOIN academic_years ay ON fs.academic_year_id = ay.id
      JOIN courses c ON fs.course_id = c.id
      WHERE fs.institution_id = ? AND fs.is_active = 1
      ORDER BY fs.year_number ASC, c.name ASC
    `).bind(institutionId).all<any>();
    return results || [];
  }

  async deleteStructure(id: string, userId?: string): Promise<void> {
    await this.db.prepare(`
      UPDATE fee_structures
      SET is_active = 0, deleted_at = datetime('now'), updated_by = ?
      WHERE id = ?
    `).bind(userId || null, id).run();
  }

  async getStructureById(id: string): Promise<FeeStructure | null> {
    return await this.db.prepare('SELECT * FROM fee_structures WHERE id = ? AND is_active = 1').bind(id).first<FeeStructure>();
  }

  // --- STUDENT FEE RECORDS ---
  async createFeeRecord(id: string, institutionId: string, input: CreateStudentFeeRecordInput, userId?: string): Promise<void> {
    await this.db.prepare(`
      INSERT INTO student_fee_records (
        id, institution_id, student_id, academic_year_id, course_id, year_number, 
        fee_structure_id, fee_type, total_amount, paid_amount, due_date, status, created_by, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0.0, ?, 'UNPAID', ?, ?)
    `).bind(
      id, institutionId, input.student_id, input.academic_year_id, input.course_id, input.year_number,
      input.fee_structure_id || null, input.fee_type, input.total_amount, input.due_date || null, userId || null, userId || null
    ).run();
  }

  async listStudentRecords(institutionId: string, search?: string): Promise<any[]> {
    let query = `
      SELECT sfr.*, s.first_name, s.last_name, s.admission_number, s.roll_number, c.name AS course_name
      FROM student_fee_records sfr
      JOIN students s ON sfr.student_id = s.id
      JOIN courses c ON sfr.course_id = c.id
      WHERE sfr.institution_id = ? AND sfr.is_active = 1
    `;
    const params: any[] = [institutionId];

    if (search) {
      query += ` AND (s.first_name LIKE ? OR s.last_name LIKE ? OR s.admission_number LIKE ? OR s.roll_number LIKE ?)`;
      const pattern = `%${search}%`;
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

  async updateRecordPayment(id: string, paidAmount: number, status: string, userId?: string): Promise<void> {
    await this.db.prepare(`
      UPDATE student_fee_records
      SET paid_amount = ?, status = ?, updated_at = datetime('now'), updated_by = ?
      WHERE id = ?
    `).bind(paidAmount, status, userId || null, id).run();
  }

  async generateRecordsForStudent(institutionId: string, studentId: string, academicYearId: string, courseId: string, yearNumber: number, userId?: string): Promise<void> {
    // 1. Fetch matching fee structures
    const { results: structures } = await this.db.prepare(`
      SELECT * FROM fee_structures 
      WHERE institution_id = ? AND academic_year_id = ? AND course_id = ? AND year_number = ? AND is_active = 1
    `).bind(institutionId, academicYearId, courseId, yearNumber).all<FeeStructure>();

    if (!structures || structures.length === 0) return;

    // 2. Insert fee records if they don't exist
    for (const fs of structures) {
      const id = crypto.randomUUID();
      // Use INSERT OR IGNORE / ON CONFLICT to avoid duplicates
      await this.db.prepare(`
        INSERT INTO student_fee_records (
          id, institution_id, student_id, academic_year_id, course_id, year_number, 
          fee_structure_id, fee_type, total_amount, paid_amount, due_date, status, created_by, updated_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0.0, date('now', '+30 days'), 'UNPAID', ?, ?)
        ON CONFLICT(student_id, academic_year_id, course_id, year_number, fee_type) DO NOTHING
      `).bind(
        id, institutionId, studentId, academicYearId, courseId, yearNumber,
        fs.id, fs.fee_type, fs.amount, userId || null, userId || null
      ).run();
    }
  }

  // --- FEE PAYMENTS ---
  async createPayment(id: string, institutionId: string, input: CreatePaymentInput, userId?: string): Promise<void> {
    await this.db.prepare(`
      INSERT INTO fee_payments (
        id, institution_id, student_id, student_fee_record_id, amount, payment_date, payment_method, transaction_reference, remarks, created_by, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, institutionId, input.student_id, input.student_fee_record_id, input.amount, input.payment_date, input.payment_method, input.transaction_reference || null, input.remarks || null, userId || null, userId || null
    ).run();
  }

  async listPayments(institutionId: string, studentId?: string): Promise<any[]> {
    let query = `
      SELECT fp.*, s.first_name, s.last_name, s.admission_number, sfr.fee_type, fr.receipt_number
      FROM fee_payments fp
      JOIN students s ON fp.student_id = s.id
      JOIN student_fee_records sfr ON fp.student_fee_record_id = sfr.id
      LEFT JOIN fee_receipts fr ON fr.payment_id = fp.id
      WHERE fp.institution_id = ? AND fp.is_active = 1
    `;
    const params: any[] = [institutionId];

    if (studentId) {
      query += ` AND fp.student_id = ?`;
      params.push(studentId);
    }

    query += ` ORDER BY fp.payment_date DESC, fp.created_at DESC`;

    const { results } = await this.db.prepare(query).bind(...params).all<any>();
    return results || [];
  }

  async getPaymentById(id: string): Promise<FeePayment | null> {
    return await this.db.prepare('SELECT * FROM fee_payments WHERE id = ? AND is_active = 1').bind(id).first<FeePayment>();
  }

  // --- FEE RECEIPTS ---
  async createReceipt(id: string, institutionId: string, paymentId: string, receiptNumber: string, userId?: string): Promise<void> {
    await this.db.prepare(`
      INSERT INTO fee_receipts (
        id, institution_id, payment_id, receipt_number, created_by, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).bind(id, institutionId, paymentId, receiptNumber, userId || null, userId || null).run();
  }

  async countReceiptsForYear(institutionId: string, year: string): Promise<number> {
    const result = await this.db.prepare(`
      SELECT COUNT(*) as count FROM fee_receipts 
      WHERE institution_id = ? AND receipt_number LIKE ?
    `).bind(institutionId, `REC-${year}-%`).first<{ count: number }>();
    return result?.count || 0;
  }

  async getReceiptDetails(id: string): Promise<any | null> {
    return await this.db.prepare(`
      SELECT fr.id AS receipt_id, fr.receipt_number, fr.created_at AS receipt_date,
             fp.amount AS paid_amount, fp.payment_date, fp.payment_method, fp.transaction_reference, fp.remarks,
             s.first_name, s.last_name, s.admission_number, s.roll_number,
             sfr.fee_type, sfr.total_amount, sfr.paid_amount AS total_paid,
             c.name AS course_name, ay.name AS academic_year_name, inst.name AS institution_name, inst.address AS institution_address
      FROM fee_receipts fr
      JOIN fee_payments fp ON fr.payment_id = fp.id
      JOIN students s ON fp.student_id = s.id
      JOIN student_fee_records sfr ON fp.student_fee_record_id = sfr.id
      JOIN courses c ON sfr.course_id = c.id
      JOIN academic_years ay ON sfr.academic_year_id = ay.id
      JOIN institutions inst ON fr.institution_id = inst.id
      WHERE fr.id = ? AND fr.is_active = 1
    `).bind(id).first<any>();
  }

  async getReceiptByPaymentId(paymentId: string): Promise<any | null> {
    return await this.db.prepare('SELECT * FROM fee_receipts WHERE payment_id = ? AND is_active = 1').bind(paymentId).first<any>();
  }

  async listReceipts(institutionId: string): Promise<any[]> {
    const { results } = await this.db.prepare(`
      SELECT fr.*, fp.student_id, fp.amount, fp.payment_date, s.first_name, s.last_name, s.admission_number, sfr.fee_type
      FROM fee_receipts fr
      JOIN fee_payments fp ON fr.payment_id = fp.id
      JOIN students s ON fp.student_id = s.id
      JOIN student_fee_records sfr ON fp.student_fee_record_id = sfr.id
      WHERE fr.institution_id = ? AND fr.is_active = 1
      ORDER BY fr.created_at DESC
    `).bind(institutionId).all<any>();
    return results || [];
  }

  // --- FEE REPORTS ---
  async getFeeSummaryStats(institutionId: string): Promise<any> {
    const totalCollected = await this.db.prepare(`
      SELECT SUM(amount) as sum FROM fee_payments WHERE institution_id = ? AND is_active = 1
    `).bind(institutionId).first<{ sum: number }>();

    const ledgerSums = await this.db.prepare(`
      SELECT SUM(total_amount) as total, SUM(paid_amount) as paid FROM student_fee_records WHERE institution_id = ? AND is_active = 1
    `).bind(institutionId).first<{ total: number; paid: number }>();

    const overdueSum = await this.db.prepare(`
      SELECT SUM(total_amount - paid_amount) as sum FROM student_fee_records 
      WHERE institution_id = ? AND status != 'PAID' AND due_date < date('now') AND is_active = 1
    `).bind(institutionId).first<{ sum: number }>();

    const total = ledgerSums?.total || 0;
    const paid = ledgerSums?.paid || 0;
    const pending = total - paid;

    return {
      totalCollected: totalCollected?.sum || 0,
      totalPending: pending > 0 ? pending : 0,
      totalOverdue: overdueSum?.sum || 0
    };
  }

  async getMonthlyCollection(institutionId: string): Promise<any[]> {
    const { results } = await this.db.prepare(`
      SELECT strftime('%Y-%m', payment_date) as month, SUM(amount) as amount 
      FROM fee_payments 
      WHERE institution_id = ? AND is_active = 1
      GROUP BY month
      ORDER BY month DESC
      LIMIT 12
    `).bind(institutionId).all<any>();
    return results || [];
  }

  async getTopDefaulters(institutionId: string): Promise<any[]> {
    const { results } = await this.db.prepare(`
      SELECT 
        s.id AS student_id,
        s.first_name,
        s.last_name,
        s.admission_number,
        s.roll_number,
        c.name as course_name,
        SUM(sfr.total_amount - sfr.paid_amount) AS pending_amount
      FROM student_fee_records sfr
      JOIN students s ON sfr.student_id = s.id
      JOIN courses c ON sfr.course_id = c.id
      WHERE sfr.institution_id = ? AND sfr.is_active = 1 AND sfr.status != 'PAID'
      GROUP BY s.id
      HAVING pending_amount > 0
      ORDER BY pending_amount DESC
      LIMIT 10
    `).bind(institutionId).all<any>();
    return results || [];
  }

  // --- CONCESSIONS ---
  async createConcession(id: string, institutionId: string, input: CreateConcessionInput, discountAmount: number, userId?: string): Promise<void> {
    await this.db.prepare(`
      INSERT INTO fee_concessions (id, institution_id, student_fee_record_id, student_id, concession_type, discount_type, discount_value, discount_amount, reason, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(id, institutionId, input.student_fee_record_id, input.student_id, input.concession_type, input.discount_type, input.discount_value, discountAmount, input.reason || null, userId || null).run();
  }

  async listConcessionsByRecord(recordId: string): Promise<FeeConcession[]> {
    const { results } = await this.db.prepare(
      `SELECT * FROM fee_concessions WHERE student_fee_record_id = ? AND is_active = 1 ORDER BY created_at DESC`
    ).bind(recordId).all<FeeConcession>();
    return results || [];
  }

  async deleteConcession(id: string, userId?: string): Promise<void> {
    await this.db.prepare(
      `UPDATE fee_concessions SET is_active = 0, updated_at = datetime('now') WHERE id = ?`
    ).bind(id).run();
  }

  async getConcessionById(id: string): Promise<FeeConcession | null> {
    return await this.db.prepare('SELECT * FROM fee_concessions WHERE id = ? AND is_active = 1').bind(id).first<FeeConcession>();
  }

  async reduceTotalAmount(recordId: string, discountAmount: number, userId?: string): Promise<void> {
    await this.db.prepare(
      `UPDATE student_fee_records SET total_amount = MAX(0, total_amount - ?), updated_at = datetime('now'), updated_by = ? WHERE id = ?`
    ).bind(discountAmount, userId || null, recordId).run();
  }

  async restoreTotalAmount(recordId: string, discountAmount: number, userId?: string): Promise<void> {
    await this.db.prepare(
      `UPDATE student_fee_records SET total_amount = total_amount + ?, updated_at = datetime('now'), updated_by = ? WHERE id = ?`
    ).bind(discountAmount, userId || null, recordId).run();
  }

  // --- INSTALLMENTS ---
  async createInstallments(institutionId: string, input: CreateInstallmentPlanInput, userId?: string): Promise<void> {
    // First soft-delete any existing installments for this record
    await this.db.prepare(
      `UPDATE fee_installments SET is_active = 0, updated_at = datetime('now') WHERE student_fee_record_id = ? AND is_active = 1`
    ).bind(input.student_fee_record_id).run();
    // Create new installments
    for (let i = 0; i < input.installments.length; i++) {
      const inst = input.installments[i];
      const id = crypto.randomUUID();
      await this.db.prepare(`
        INSERT INTO fee_installments (id, institution_id, student_fee_record_id, student_id, installment_number, due_date, amount, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(id, institutionId, input.student_fee_record_id, input.student_id, i + 1, inst.due_date, inst.amount, userId || null).run();
    }
  }

  async listInstallmentsByRecord(recordId: string): Promise<FeeInstallment[]> {
    const { results } = await this.db.prepare(
      `SELECT * FROM fee_installments WHERE student_fee_record_id = ? AND is_active = 1 ORDER BY installment_number ASC`
    ).bind(recordId).all<FeeInstallment>();
    return results || [];
  }

  async getInstallmentById(id: string): Promise<FeeInstallment | null> {
    return await this.db.prepare('SELECT * FROM fee_installments WHERE id = ? AND is_active = 1').bind(id).first<FeeInstallment>();
  }

  async payInstallment(id: string, amount: number, userId?: string): Promise<void> {
    await this.db.prepare(
      `UPDATE fee_installments SET paid_amount = paid_amount + ?, status = CASE WHEN paid_amount + ? >= amount THEN 'Paid' ELSE 'Pending' END, updated_at = datetime('now') WHERE id = ?`
    ).bind(amount, amount, id).run();
  }

  async updateOverdueInstallments(studentFeeRecordId: string): Promise<void> {
    await this.db.prepare(
      `UPDATE fee_installments SET status = 'Overdue' WHERE student_fee_record_id = ? AND status = 'Pending' AND due_date < date('now') AND is_active = 1`
    ).bind(studentFeeRecordId).run();
  }
}
