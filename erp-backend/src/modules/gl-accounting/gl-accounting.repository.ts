import {
  GLAccount, CreateAccountInput, UpdateAccountInput,
  GLJournalEntry, GLJournalLine, CreateJournalEntryInput, JournalLineInput,
} from './gl-accounting.types';

export class GLAccountingRepository {
  constructor(private db: any) {}

  // ==================== ACCOUNTS ==================== //

  async listAccounts(institutionId: string): Promise<GLAccount[]> {
    const res = await this.db.prepare(`
      SELECT a.*, p.name as parent_name,
        COALESCE((
          SELECT SUM(l.debit_amount) - SUM(l.credit_amount)
          FROM gl_journal_lines l
          JOIN gl_journal_entries je ON je.id = l.journal_entry_id
          WHERE l.account_id = a.id AND je.status = 'POSTED'
        ), 0) as balance
      FROM gl_accounts a
      LEFT JOIN gl_accounts p ON p.id = a.parent_account_id
      WHERE a.institution_id = ? AND a.is_active = 1
      ORDER BY a.code ASC
    `).bind(institutionId).all();
    return (res.results || []) as GLAccount[];
  }

  async getAccount(id: string, institutionId: string): Promise<GLAccount | null> {
    const row = await this.db.prepare(
      `SELECT * FROM gl_accounts WHERE id = ? AND institution_id = ? AND is_active = 1`
    ).bind(id, institutionId).first();
    return row ? (row as GLAccount) : null;
  }

  async getAccountByCode(code: string, institutionId: string): Promise<GLAccount | null> {
    const row = await this.db.prepare(
      `SELECT * FROM gl_accounts WHERE code = ? AND institution_id = ? AND is_active = 1`
    ).bind(code, institutionId).first();
    return row ? (row as GLAccount) : null;
  }

  async createAccount(id: string, institutionId: string, input: CreateAccountInput, userId?: string): Promise<void> {
    const now = new Date().toISOString();
    await this.db.prepare(`
      INSERT INTO gl_accounts (id, institution_id, code, name, account_type, parent_account_id, created_at, updated_at, created_by, updated_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, institutionId, input.code, input.name, input.account_type,
      input.parent_account_id || null, now, now, userId || null, userId || null
    ).run();
  }

  async updateAccount(id: string, institutionId: string, input: UpdateAccountInput, userId?: string): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];
    for (const [key, value] of Object.entries(input)) {
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }
    if (fields.length === 0) return;
    fields.push('updated_at = ?', 'updated_by = ?');
    values.push(new Date().toISOString(), userId || null, id, institutionId);
    await this.db.prepare(
      `UPDATE gl_accounts SET ${fields.join(', ')} WHERE id = ? AND institution_id = ?`
    ).bind(...values).run();
  }

  async deleteAccount(id: string, institutionId: string): Promise<void> {
    await this.db.prepare(
      `UPDATE gl_accounts SET is_active = 0, updated_at = ? WHERE id = ? AND institution_id = ?`
    ).bind(new Date().toISOString(), id, institutionId).run();
  }

  async countJournalLinesForAccount(accountId: string): Promise<number> {
    const row: any = await this.db.prepare(
      `SELECT COUNT(*) as cnt FROM gl_journal_lines WHERE account_id = ?`
    ).bind(accountId).first();
    return row?.cnt || 0;
  }

  async countChildAccounts(accountId: string): Promise<number> {
    const row: any = await this.db.prepare(
      `SELECT COUNT(*) as cnt FROM gl_accounts WHERE parent_account_id = ? AND is_active = 1`
    ).bind(accountId).first();
    return row?.cnt || 0;
  }

  // ==================== JOURNAL ENTRIES ==================== //

  async listJournalEntries(institutionId: string, filters: { status?: string; from?: string; to?: string } = {}): Promise<GLJournalEntry[]> {
    let query = `
      SELECT je.*, COALESCE((SELECT SUM(debit_amount) FROM gl_journal_lines WHERE journal_entry_id = je.id), 0) as total_debit,
        COALESCE((SELECT SUM(credit_amount) FROM gl_journal_lines WHERE journal_entry_id = je.id), 0) as total_credit
      FROM gl_journal_entries je
      WHERE je.institution_id = ? AND je.deleted_at IS NULL`;
    const params: any[] = [institutionId];
    if (filters.status) {
      query += ` AND je.status = ?`;
      params.push(filters.status);
    }
    if (filters.from) {
      query += ` AND je.entry_date >= ?`;
      params.push(filters.from);
    }
    if (filters.to) {
      query += ` AND je.entry_date <= ?`;
      params.push(filters.to);
    }
    query += ` ORDER BY je.entry_date DESC, je.created_at DESC`;
    const res = await this.db.prepare(query).bind(...params).all();
    return (res.results || []) as GLJournalEntry[];
  }

  async getJournalEntry(id: string, institutionId: string): Promise<GLJournalEntry | null> {
    const entry = await this.db.prepare(
      `SELECT * FROM gl_journal_entries WHERE id = ? AND institution_id = ? AND deleted_at IS NULL`
    ).bind(id, institutionId).first();
    if (!entry) return null;

    const linesRes = await this.db.prepare(`
      SELECT l.*, a.code as account_code, a.name as account_name
      FROM gl_journal_lines l
      JOIN gl_accounts a ON a.id = l.account_id
      WHERE l.journal_entry_id = ?
      ORDER BY l.line_order ASC
    `).bind(id).all();

    return { ...(entry as GLJournalEntry), lines: (linesRes.results || []) as GLJournalLine[] };
  }

  async createJournalEntry(id: string, institutionId: string, entryNumber: string, input: CreateJournalEntryInput, userId?: string): Promise<void> {
    const now = new Date().toISOString();
    const statements = [
      this.db.prepare(`
        INSERT INTO gl_journal_entries (id, institution_id, entry_number, entry_date, reference, description, status, created_at, updated_at, created_by, updated_by)
        VALUES (?, ?, ?, ?, ?, ?, 'DRAFT', ?, ?, ?, ?)
      `).bind(
        id, institutionId, entryNumber, input.entry_date || new Date().toISOString().slice(0, 10),
        input.reference || null, input.description || null, now, now, userId || null, userId || null
      ),
      ...input.lines.map((line: JournalLineInput, idx: number) =>
        this.db.prepare(`
          INSERT INTO gl_journal_lines (id, journal_entry_id, account_id, debit_amount, credit_amount, memo, line_order)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(crypto.randomUUID(), id, line.account_id, line.debit_amount || 0, line.credit_amount || 0, line.memo || null, idx)
      ),
    ];
    await this.db.batch(statements);
  }

  async postJournalEntry(id: string, institutionId: string, userId?: string): Promise<void> {
    await this.db.prepare(`
      UPDATE gl_journal_entries SET status = 'POSTED', posted_at = ?, updated_at = ?, updated_by = ?
      WHERE id = ? AND institution_id = ?
    `).bind(new Date().toISOString(), new Date().toISOString(), userId || null, id, institutionId).run();
  }

  async voidJournalEntry(id: string, institutionId: string, userId?: string): Promise<void> {
    await this.db.prepare(`
      UPDATE gl_journal_entries SET status = 'VOID', updated_at = ?, updated_by = ?
      WHERE id = ? AND institution_id = ?
    `).bind(new Date().toISOString(), userId || null, id, institutionId).run();
  }

  async deleteDraftEntry(id: string, institutionId: string, userId?: string): Promise<void> {
    await this.db.prepare(`
      UPDATE gl_journal_entries SET deleted_at = ?, updated_at = ?, updated_by = ?
      WHERE id = ? AND institution_id = ?
    `).bind(new Date().toISOString(), new Date().toISOString(), userId || null, id, institutionId).run();
  }

  async countEntriesForInstitution(institutionId: string): Promise<number> {
    const row: any = await this.db.prepare(
      `SELECT COUNT(*) as cnt FROM gl_journal_entries WHERE institution_id = ?`
    ).bind(institutionId).first();
    return row?.cnt || 0;
  }

  // Trial balance: net posted balance per account as of an optional as-of date.
  async getTrialBalance(institutionId: string, asOfDate?: string): Promise<{ account_id: string; code: string; name: string; account_type: string; debit_total: number; credit_total: number }[]> {
    let query = `
      SELECT a.id as account_id, a.code, a.name, a.account_type,
        COALESCE(SUM(l.debit_amount), 0) as debit_total,
        COALESCE(SUM(l.credit_amount), 0) as credit_total
      FROM gl_accounts a
      LEFT JOIN gl_journal_lines l ON l.account_id = a.id
      LEFT JOIN gl_journal_entries je ON je.id = l.journal_entry_id AND je.status = 'POSTED'
        ${asOfDate ? 'AND je.entry_date <= ?' : ''}
      WHERE a.institution_id = ? AND a.is_active = 1
      GROUP BY a.id
      ORDER BY a.code ASC
    `;
    const params: any[] = asOfDate ? [asOfDate, institutionId] : [institutionId];
    const res = await this.db.prepare(query).bind(...params).all();
    return (res.results || []) as any[];
  }
}
