export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';
export type JournalStatus = 'DRAFT' | 'POSTED' | 'VOID';

export interface GLAccount {
  id: string;
  institution_id: string;
  code: string;
  name: string;
  account_type: AccountType;
  parent_account_id: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;

  parent_name?: string;
  balance?: number;
}

export interface CreateAccountInput {
  code: string;
  name: string;
  account_type: AccountType;
  parent_account_id?: string;
}

export type UpdateAccountInput = Partial<Omit<CreateAccountInput, 'account_type'>>;

export interface JournalLineInput {
  account_id: string;
  debit_amount?: number;
  credit_amount?: number;
  memo?: string;
}

export interface GLJournalLine extends JournalLineInput {
  id?: string;
  journal_entry_id?: string;
  line_order?: number;
  account_code?: string;
  account_name?: string;
}

export interface GLJournalEntry {
  id: string;
  institution_id: string;
  entry_number: string;
  entry_date: string;
  reference: string | null;
  description: string | null;
  status: JournalStatus;
  posted_at: string | null;
  created_at: string;
  updated_at: string;

  lines?: GLJournalLine[];
  total_debit?: number;
  total_credit?: number;
}

export interface CreateJournalEntryInput {
  entry_date?: string;
  reference?: string;
  description?: string;
  lines: JournalLineInput[];
}
