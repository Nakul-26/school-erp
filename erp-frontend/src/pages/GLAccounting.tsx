import './GLAccounting.css';
import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { PageGuidance } from '../components/PageGuidance';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { Plus, Trash2, CheckCircle2, XCircle, BookOpen } from 'lucide-react';

interface Account {
  id: string;
  code: string;
  name: string;
  account_type: string;
  parent_account_id: string | null;
  parent_name: string | null;
  balance: number;
}

interface JournalLine {
  account_id: string;
  debit_amount: number;
  credit_amount: number;
  memo: string;
  account_code?: string;
  account_name?: string;
}

interface JournalEntry {
  id: string;
  entry_number: string;
  entry_date: string;
  reference: string | null;
  description: string | null;
  status: 'DRAFT' | 'POSTED' | 'VOID';
  total_debit: number;
  total_credit: number;
}

interface TrialBalanceRow {
  account_id: string;
  code: string;
  name: string;
  account_type: string;
  debit: number;
  credit: number;
}

export default function GLAccounting() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'accounts' | 'journal' | 'trial-balance'>('accounts');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [trialBalance, setTrialBalance] = useState<{ accounts: TrialBalanceRow[]; total_debit: number; total_credit: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const toastCtx = useToast();
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    if (type === 'success') toastCtx.success(message);
    else toastCtx.error(message);
  };

  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [accountForm, setAccountForm] = useState({ code: '', name: '', account_type: 'ASSET', parent_account_id: '' });
  const [entryForm, setEntryForm] = useState({ entry_date: new Date().toISOString().slice(0, 10), reference: '', description: '' });
  const [entryLines, setEntryLines] = useState<JournalLine[]>([
    { account_id: '', debit_amount: 0, credit_amount: 0, memo: '' },
    { account_id: '', debit_amount: 0, credit_amount: 0, memo: '' },
  ]);

  const userRoles = user?.roles || (user?.role ? [user.role] : []);
  const canManage = userRoles.some(r =>
    ['super_admin', 'Super Admin', 'admin', 'Admin', 'Principal', 'Accountant', 'accountant'].includes(r)
  );

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [accData, entriesData] = await Promise.all([
        api.get('/gl-accounting/accounts'),
        api.get('/gl-accounting/journal-entries'),
      ]);
      setAccounts(accData);
      setEntries(entriesData);
    } catch (err) {
      console.error('Error fetching GL data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTrialBalance = async () => {
    try {
      const data = await api.get('/gl-accounting/trial-balance');
      setTrialBalance(data);
    } catch (err) {
      console.error('Error fetching trial balance:', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'trial-balance') fetchTrialBalance();
  }, [activeTab]);

  const totalDebit = entryLines.reduce((sum, l) => sum + (Number(l.debit_amount) || 0), 0);
  const totalCredit = entryLines.reduce((sum, l) => sum + (Number(l.credit_amount) || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.005 && totalDebit > 0;

  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountForm.code || !accountForm.name) { showToast('Code and name are required', 'error'); return; }
    try {
      setSubmitting(true);
      await api.post('/gl-accounting/accounts', {
        ...accountForm,
        parent_account_id: accountForm.parent_account_id || undefined,
      });
      showToast('Account created');
      setShowAccountModal(false);
      setAccountForm({ code: '', name: '', account_type: 'ASSET', parent_account_id: '' });
      fetchData();
    } catch (err: any) {
      showToast(err.message || 'Error creating account', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAccount = async (id: string) => {
    if (!confirm('Delete this account?')) return;
    try {
      await api.delete(`/gl-accounting/accounts/${id}`);
      fetchData();
    } catch (err: any) {
      showToast(err.message || 'Error deleting account', 'error');
    }
  };

  const updateLine = (idx: number, patch: Partial<JournalLine>) => {
    setEntryLines(lines => lines.map((l, i) => i === idx ? { ...l, ...patch } : l));
  };

  const addLine = () => setEntryLines(lines => [...lines, { account_id: '', debit_amount: 0, credit_amount: 0, memo: '' }]);
  const removeLine = (idx: number) => setEntryLines(lines => lines.filter((_, i) => i !== idx));

  const resetEntryForm = () => {
    setEntryForm({ entry_date: new Date().toISOString().slice(0, 10), reference: '', description: '' });
    setEntryLines([
      { account_id: '', debit_amount: 0, credit_amount: 0, memo: '' },
      { account_id: '', debit_amount: 0, credit_amount: 0, memo: '' },
    ]);
  };

  const handleEntrySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isBalanced) { showToast('This entry does not balance — total debits must equal total credits', 'error'); return; }
    const validLines = entryLines.filter(l => l.account_id && (l.debit_amount > 0 || l.credit_amount > 0));
    if (validLines.length < 2) { showToast('At least two lines with an account and amount are required', 'error'); return; }
    try {
      setSubmitting(true);
      await api.post('/gl-accounting/journal-entries', { ...entryForm, lines: validLines });
      showToast('Journal entry created as draft');
      setShowEntryModal(false);
      resetEntryForm();
      fetchData();
    } catch (err: any) {
      showToast(err.message || 'Error creating journal entry', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePost = async (id: string) => {
    if (!confirm('Post this journal entry? Posted entries affect account balances and cannot be edited.')) return;
    try {
      await api.post(`/gl-accounting/journal-entries/${id}/post`, {});
      showToast('Journal entry posted');
      fetchData();
    } catch (err: any) {
      showToast(err.message || 'Error posting entry', 'error');
    }
  };

  const handleVoid = async (id: string) => {
    if (!confirm('Void this posted journal entry? This reverses its effect on account balances.')) return;
    try {
      await api.post(`/gl-accounting/journal-entries/${id}/void`, {});
      showToast('Journal entry voided');
      fetchData();
    } catch (err: any) {
      showToast(err.message || 'Error voiding entry', 'error');
    }
  };

  const handleDeleteDraft = async (id: string) => {
    if (!confirm('Delete this draft journal entry?')) return;
    try {
      await api.delete(`/gl-accounting/journal-entries/${id}`);
      showToast('Draft deleted');
      fetchData();
    } catch (err: any) {
      showToast(err.message || 'Error deleting entry', 'error');
    }
  };

  if (!canManage) {
    return (
      <Layout>
        <div className="card">
          <p className="no-data">You do not have permission to access the General Ledger.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <PageGuidance
        title="General Ledger"
        description="A real chart of accounts and double-entry journal, separate from the Finance page's income/expense log. Every journal entry must balance before it can be posted."
        steps={["Set up a chart of accounts under the Accounts tab.", "Record a journal entry with balanced debit/credit lines.", "Post the entry to affect account balances, then review the Trial Balance."]}
      />

      <div className="page-header">
        <div>
          <h2>General Ledger</h2>
          <p className="gl-text-1">Chart of accounts, double-entry journal, and trial balance</p>
        </div>
        {activeTab === 'accounts' && (
          <button className="btn btn-primary" onClick={() => setShowAccountModal(true)}>
            <Plus size={16} /> Add Account
          </button>
        )}
        {activeTab === 'journal' && (
          <button className="btn btn-primary" onClick={() => { resetEntryForm(); setShowEntryModal(true); }}>
            <Plus size={16} /> New Journal Entry
          </button>
        )}
      </div>

      <div className="page-tabs gl-page-tabs">
        <button className={`page-tab ${activeTab === 'accounts' ? 'active' : ''}`} onClick={() => setActiveTab('accounts')}>
          Chart of Accounts ({accounts.length})
        </button>
        <button className={`page-tab ${activeTab === 'journal' ? 'active' : ''}`} onClick={() => setActiveTab('journal')}>
          Journal Entries ({entries.length})
        </button>
        <button className={`page-tab ${activeTab === 'trial-balance' ? 'active' : ''}`} onClick={() => setActiveTab('trial-balance')}>
          Trial Balance
        </button>
      </div>

      {loading ? <p>Loading ledger...</p> : (
        <>
          {activeTab === 'accounts' && (
            <div className="card gl-card-full">
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Name</th>
                      <th>Type</th>
                      <th>Parent</th>
                      <th className="gl-th-right">Balance</th>
                      <th className="gl-th-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accounts.map(acc => (
                      <tr key={acc.id}>
                        <td><code>{acc.code}</code></td>
                        <td><strong>{acc.name}</strong></td>
                        <td><span className="badge gl-badge">{acc.account_type}</span></td>
                        <td>{acc.parent_name || '-'}</td>
                        <td className="gl-th-right">₹{Number(acc.balance || 0).toLocaleString('en-IN')}</td>
                        <td className="gl-th-center">
                          <button className="btn btn-outline gl-btn" onClick={() => handleDeleteAccount(acc.id)}>
                            <Trash2 size={12} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {accounts.length === 0 && (
                      <tr><td colSpan={6} className="no-data">No accounts configured yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'journal' && (
            <div className="card gl-card-full">
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Entry #</th>
                      <th>Date</th>
                      <th>Description</th>
                      <th>Status</th>
                      <th className="gl-th-right">Debit</th>
                      <th className="gl-th-right">Credit</th>
                      <th className="gl-th-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map(entry => (
                      <tr key={entry.id}>
                        <td><code>{entry.entry_number}</code></td>
                        <td>{new Date(entry.entry_date).toLocaleDateString()}</td>
                        <td>{entry.description || entry.reference || '-'}</td>
                        <td>
                          <span className={`badge gl-status-${entry.status.toLowerCase()}`}>{entry.status}</span>
                        </td>
                        <td className="gl-th-right">₹{Number(entry.total_debit).toLocaleString('en-IN')}</td>
                        <td className="gl-th-right">₹{Number(entry.total_credit).toLocaleString('en-IN')}</td>
                        <td className="gl-th-center">
                          {entry.status === 'DRAFT' && (
                            <>
                              <button className="btn btn-outline gl-btn" onClick={() => handlePost(entry.id)}>
                                <CheckCircle2 size={12} /> Post
                              </button>
                              <button className="btn btn-outline gl-btn" onClick={() => handleDeleteDraft(entry.id)}>
                                <Trash2 size={12} />
                              </button>
                            </>
                          )}
                          {entry.status === 'POSTED' && (
                            <button className="btn btn-outline gl-btn" onClick={() => handleVoid(entry.id)}>
                              <XCircle size={12} /> Void
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {entries.length === 0 && (
                      <tr><td colSpan={7} className="no-data">No journal entries yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'trial-balance' && (
            <div className="card gl-card-full">
              <h3 className="gl-row-48"><BookOpen className="gl-icon" size={18} /> Trial Balance</h3>
              {!trialBalance ? <p>Loading...</p> : (
                <div className="table-responsive">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>Account</th>
                        <th>Type</th>
                        <th className="gl-th-right">Debit</th>
                        <th className="gl-th-right">Credit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trialBalance.accounts.map(row => (
                        <tr key={row.account_id}>
                          <td><code>{row.code}</code></td>
                          <td>{row.name}</td>
                          <td><span className="badge gl-badge">{row.account_type}</span></td>
                          <td className="gl-th-right">{row.debit > 0 ? `₹${row.debit.toLocaleString('en-IN')}` : '-'}</td>
                          <td className="gl-th-right">{row.credit > 0 ? `₹${row.credit.toLocaleString('en-IN')}` : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="gl-totals-row">
                        <td colSpan={3}><strong>Total</strong></td>
                        <td className="gl-th-right"><strong>₹{trialBalance.total_debit.toLocaleString('en-IN')}</strong></td>
                        <td className="gl-th-right"><strong>₹{trialBalance.total_credit.toLocaleString('en-IN')}</strong></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Add Account Modal */}
      {showAccountModal && (
        <div className="modal">
          <div className="modal-content gl-modal-content">
            <h3>Add Ledger Account</h3>
            <form onSubmit={handleAccountSubmit}>
              <div className="gl-grid-2">
                <div className="form-group">
                  <label>Account Code</label>
                  <input type="text" placeholder="e.g. 1050" value={accountForm.code} onChange={(e) => setAccountForm({ ...accountForm, code: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Account Type</label>
                  <select value={accountForm.account_type} onChange={(e) => setAccountForm({ ...accountForm, account_type: e.target.value })}>
                    <option value="ASSET">Asset</option>
                    <option value="LIABILITY">Liability</option>
                    <option value="EQUITY">Equity</option>
                    <option value="INCOME">Income</option>
                    <option value="EXPENSE">Expense</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Account Name</label>
                <input type="text" placeholder="e.g. Petty Cash" value={accountForm.name} onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Parent Account (Optional)</label>
                <select value={accountForm.parent_account_id} onChange={(e) => setAccountForm({ ...accountForm, parent_account_id: e.target.value })}>
                  <option value="">-- None --</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
                </select>
              </div>
              <div className="modal-actions gl-modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAccountModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>Create Account</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Journal Entry Modal */}
      {showEntryModal && (
        <div className="modal">
          <div className="modal-content gl-modal-content-wide">
            <h3>New Journal Entry</h3>
            <form onSubmit={handleEntrySubmit}>
              <div className="gl-grid-3">
                <div className="form-group">
                  <label>Entry Date</label>
                  <input type="date" value={entryForm.entry_date} onChange={(e) => setEntryForm({ ...entryForm, entry_date: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Reference (Optional)</label>
                  <input type="text" placeholder="e.g. Invoice #204" value={entryForm.reference} onChange={(e) => setEntryForm({ ...entryForm, reference: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <input type="text" placeholder="e.g. August salary payout" value={entryForm.description} onChange={(e) => setEntryForm({ ...entryForm, description: e.target.value })} />
                </div>
              </div>

              <table className="table gl-lines-table">
                <thead>
                  <tr>
                    <th>Account</th>
                    <th className="gl-th-right">Debit</th>
                    <th className="gl-th-right">Credit</th>
                    <th>Memo</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {entryLines.map((line, idx) => (
                    <tr key={idx}>
                      <td>
                        <select value={line.account_id} onChange={(e) => updateLine(idx, { account_id: e.target.value })}>
                          <option value="">-- Account --</option>
                          {accounts.map(a => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
                        </select>
                      </td>
                      <td>
                        <input type="number" min={0} value={line.debit_amount || ''} onChange={(e) => updateLine(idx, { debit_amount: Number(e.target.value) || 0, credit_amount: 0 })} className="gl-amount-input" />
                      </td>
                      <td>
                        <input type="number" min={0} value={line.credit_amount || ''} onChange={(e) => updateLine(idx, { credit_amount: Number(e.target.value) || 0, debit_amount: 0 })} className="gl-amount-input" />
                      </td>
                      <td>
                        <input type="text" value={line.memo} onChange={(e) => updateLine(idx, { memo: e.target.value })} className="gl-memo-input" />
                      </td>
                      <td>
                        {entryLines.length > 2 && (
                          <button type="button" className="btn btn-outline gl-btn" onClick={() => removeLine(idx)}>
                            <Trash2 size={12} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td><button type="button" className="btn btn-outline gl-btn" onClick={addLine}><Plus size={12} /> Add Line</button></td>
                    <td className="gl-th-right"><strong>₹{totalDebit.toLocaleString('en-IN')}</strong></td>
                    <td className="gl-th-right"><strong>₹{totalCredit.toLocaleString('en-IN')}</strong></td>
                    <td colSpan={2}>
                      {isBalanced ? <span className="gl-balanced">Balanced</span> : <span className="gl-unbalanced">Not balanced</span>}
                    </td>
                  </tr>
                </tfoot>
              </table>

              <div className="modal-actions gl-modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowEntryModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting || !isBalanced}>Save as Draft</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
