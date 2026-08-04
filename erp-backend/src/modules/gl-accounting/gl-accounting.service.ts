import { GLAccountingRepository } from './gl-accounting.repository';
import { CreateAccountInput, UpdateAccountInput, CreateJournalEntryInput } from './gl-accounting.types';

export class GLAccountingServiceError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

const DEFAULT_CHART_OF_ACCOUNTS: { code: string; name: string; account_type: CreateAccountInput['account_type'] }[] = [
  { code: '1000', name: 'Cash', account_type: 'ASSET' },
  { code: '1010', name: 'Bank Account', account_type: 'ASSET' },
  { code: '1200', name: 'Accounts Receivable (Student Fees)', account_type: 'ASSET' },
  { code: '2000', name: 'Accounts Payable', account_type: 'LIABILITY' },
  { code: '3000', name: "Owner's / Trust Equity", account_type: 'EQUITY' },
  { code: '4000', name: 'Tuition & Fee Income', account_type: 'INCOME' },
  { code: '4100', name: 'Other Income', account_type: 'INCOME' },
  { code: '5000', name: 'Salary & Payroll Expense', account_type: 'EXPENSE' },
  { code: '5100', name: 'Utilities Expense', account_type: 'EXPENSE' },
  { code: '5200', name: 'Maintenance & Supplies Expense', account_type: 'EXPENSE' },
  { code: '5900', name: 'Other Expense', account_type: 'EXPENSE' },
];

export class GLAccountingService {
  constructor(private repo: GLAccountingRepository) {}

  // Seeds a minimal default chart of accounts the first time an institution opens this
  // module with none configured yet — same lazy-seeding pattern as certificates' default templates.
  async ensureDefaultAccounts(institutionId: string, userId?: string): Promise<void> {
    const existing = await this.repo.listAccounts(institutionId);
    if (existing.length > 0) return;
    for (const acc of DEFAULT_CHART_OF_ACCOUNTS) {
      const id = crypto.randomUUID();
      await this.repo.createAccount(id, institutionId, acc, userId);
    }
  }

  async listAccounts(institutionId: string, userId?: string) {
    await this.ensureDefaultAccounts(institutionId, userId);
    return this.repo.listAccounts(institutionId);
  }

  async createAccount(institutionId: string, input: CreateAccountInput, userId?: string): Promise<string> {
    if (!input.code || !input.name || !input.account_type) {
      throw new GLAccountingServiceError('code, name, and account_type are required.', 400);
    }
    const existing = await this.repo.getAccountByCode(input.code, institutionId);
    if (existing) throw new GLAccountingServiceError(`An account with code "${input.code}" already exists.`, 409);

    if (input.parent_account_id) {
      const parent = await this.repo.getAccount(input.parent_account_id, institutionId);
      if (!parent) throw new GLAccountingServiceError('Parent account not found.', 404);
    }

    const id = crypto.randomUUID();
    await this.repo.createAccount(id, institutionId, input, userId);
    return id;
  }

  async updateAccount(institutionId: string, id: string, input: UpdateAccountInput, userId?: string): Promise<void> {
    const existing = await this.repo.getAccount(id, institutionId);
    if (!existing) throw new GLAccountingServiceError('Account not found.', 404);
    if (input.code && input.code !== existing.code) {
      const codeClash = await this.repo.getAccountByCode(input.code, institutionId);
      if (codeClash) throw new GLAccountingServiceError(`An account with code "${input.code}" already exists.`, 409);
    }
    await this.repo.updateAccount(id, institutionId, input, userId);
  }

  async deleteAccount(institutionId: string, id: string): Promise<void> {
    const existing = await this.repo.getAccount(id, institutionId);
    if (!existing) throw new GLAccountingServiceError('Account not found.', 404);
    const lineCount = await this.repo.countJournalLinesForAccount(id);
    if (lineCount > 0) throw new GLAccountingServiceError('Cannot delete an account that has journal entries posted against it.', 409);
    const childCount = await this.repo.countChildAccounts(id);
    if (childCount > 0) throw new GLAccountingServiceError('Cannot delete an account that has child accounts — reassign or delete them first.', 409);
    await this.repo.deleteAccount(id, institutionId);
  }

  async listJournalEntries(institutionId: string, filters: { status?: string; from?: string; to?: string } = {}) {
    return this.repo.listJournalEntries(institutionId, filters);
  }

  async getJournalEntry(institutionId: string, id: string) {
    const entry = await this.repo.getJournalEntry(id, institutionId);
    if (!entry) throw new GLAccountingServiceError('Journal entry not found.', 404);
    return entry;
  }

  async createJournalEntry(institutionId: string, input: CreateJournalEntryInput, userId?: string): Promise<string> {
    if (!input.lines || input.lines.length < 2) {
      throw new GLAccountingServiceError('A journal entry needs at least two lines.', 400);
    }
    for (const line of input.lines) {
      if (!line.account_id) throw new GLAccountingServiceError('Every line must reference an account.', 400);
      const debit = line.debit_amount || 0;
      const credit = line.credit_amount || 0;
      if (debit < 0 || credit < 0) throw new GLAccountingServiceError('Amounts cannot be negative.', 400);
      if (debit > 0 && credit > 0) throw new GLAccountingServiceError('A single line cannot have both a debit and a credit amount.', 400);
      if (debit === 0 && credit === 0) throw new GLAccountingServiceError('Each line must have either a debit or a credit amount.', 400);
      const account = await this.repo.getAccount(line.account_id, institutionId);
      if (!account) throw new GLAccountingServiceError('One or more accounts on this entry were not found.', 404);
    }

    const totalDebit = input.lines.reduce((sum, l) => sum + (l.debit_amount || 0), 0);
    const totalCredit = input.lines.reduce((sum, l) => sum + (l.credit_amount || 0), 0);
    if (Math.abs(totalDebit - totalCredit) > 0.005) {
      throw new GLAccountingServiceError(`This entry does not balance: total debits (${totalDebit.toFixed(2)}) must equal total credits (${totalCredit.toFixed(2)}).`, 400);
    }

    const id = crypto.randomUUID();
    const seq = (await this.repo.countEntriesForInstitution(institutionId)) + 1;
    const entryNumber = `JE-${String(seq).padStart(5, '0')}`;
    await this.repo.createJournalEntry(id, institutionId, entryNumber, input, userId);
    return id;
  }

  async postJournalEntry(institutionId: string, id: string, userId?: string): Promise<void> {
    const entry = await this.repo.getJournalEntry(id, institutionId);
    if (!entry) throw new GLAccountingServiceError('Journal entry not found.', 404);
    if (entry.status !== 'DRAFT') throw new GLAccountingServiceError('Only draft entries can be posted.', 400);

    const totalDebit = (entry.lines || []).reduce((sum, l) => sum + (l.debit_amount || 0), 0);
    const totalCredit = (entry.lines || []).reduce((sum, l) => sum + (l.credit_amount || 0), 0);
    if (Math.abs(totalDebit - totalCredit) > 0.005) {
      throw new GLAccountingServiceError('This entry does not balance and cannot be posted.', 400);
    }

    await this.repo.postJournalEntry(id, institutionId, userId);
  }

  async voidJournalEntry(institutionId: string, id: string, userId?: string): Promise<void> {
    const entry = await this.repo.getJournalEntry(id, institutionId);
    if (!entry) throw new GLAccountingServiceError('Journal entry not found.', 404);
    if (entry.status !== 'POSTED') throw new GLAccountingServiceError('Only posted entries can be voided.', 400);
    await this.repo.voidJournalEntry(id, institutionId, userId);
  }

  async deleteDraftEntry(institutionId: string, id: string, userId?: string): Promise<void> {
    const entry = await this.repo.getJournalEntry(id, institutionId);
    if (!entry) throw new GLAccountingServiceError('Journal entry not found.', 404);
    if (entry.status !== 'DRAFT') throw new GLAccountingServiceError('Only draft entries can be deleted — void a posted entry instead.', 400);
    await this.repo.deleteDraftEntry(id, institutionId, userId);
  }

  async getTrialBalance(institutionId: string, asOfDate?: string) {
    const rows = await this.repo.getTrialBalance(institutionId, asOfDate);
    let totalDebit = 0;
    let totalCredit = 0;
    // ASSET/EXPENSE accounts normally carry a debit balance; LIABILITY/EQUITY/INCOME carry a
    // credit balance. Net = total debits - total credits; the balance is shown on whichever
    // side is its natural side, so a trial balance always reads as two columns that sum equal.
    const accounts = rows.map(r => {
      const net = r.debit_total - r.credit_total;
      const isDebitNormal = r.account_type === 'ASSET' || r.account_type === 'EXPENSE';
      const finalDebit = isDebitNormal ? Math.max(net, 0) : Math.max(-net, 0);
      const finalCredit = isDebitNormal ? Math.max(-net, 0) : Math.max(net, 0);
      totalDebit += finalDebit;
      totalCredit += finalCredit;
      return { account_id: r.account_id, code: r.code, name: r.name, account_type: r.account_type, debit: finalDebit, credit: finalCredit };
    });
    return { accounts, total_debit: totalDebit, total_credit: totalCredit };
  }
}
