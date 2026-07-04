import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { PageGuidance } from '../components/PageGuidance';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { 
  Book, BookOpen, Plus, Search, Calendar, User, 
  CheckCircle, AlertCircle, XCircle, Info, Landmark, 
  Trash2, Edit, CreditCard 
} from 'lucide-react';

interface BookType {
  id: string;
  title: string;
  author: string;
  isbn: string;
  category: string;
  total_copies: number;
  available_copies: number;
  rack_location: string;
}

interface TransactionType {
  id: string;
  book_id: string;
  book_title: string;
  book_author: string;
  student_id: string;
  student_name: string;
  admission_number: string;
  issuer_name?: string;
  issue_date: string;
  due_date: string;
  return_date: string | null;
  fine_amount: number;
  fine_status: string;
  status: 'ISSUED' | 'RETURNED';
}

export default function Library() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'catalog' | 'transactions'>('catalog');
  const [books, setBooks] = useState<BookType[]>([]);
  const [transactions, setTransactions] = useState<TransactionType[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search/Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All'); // For transactions

  // Modals
  const [showBookModal, setShowBookModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [editingBook, setEditingBook] = useState<BookType | null>(null);

  // Forms
  const [bookForm, setBookForm] = useState({
    title: '',
    author: '',
    isbn: '',
    category: 'General',
    total_copies: 1,
    rack_location: ''
  });

  const [issueForm, setIssueForm] = useState({
    book_id: '',
    student_id: '',
    due_date: ''
  });

  const [studentSearch, setStudentSearch] = useState('');
  const toastCtx = useToast();
  const showToast = (message: string, type: 'success'|'error' = 'success') => {
    if (type === 'success') toastCtx.success(message);
    else toastCtx.error(message);
  };

  const userRoles = user?.roles || (user?.role ? [user.role] : []);
  const canManage = userRoles.some(r => 
    ['super_admin', 'Super Admin', 'admin', 'Admin', 'Principal', 'HOD', 'hod', 'Teacher', 'teacher', 'Accountant', 'accountant'].includes(r)
  );

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const booksData = await api.get('/library/books');
      setBooks(booksData);

      const txnsData = await api.get('/library/transactions');
      setTransactions(txnsData);

      if (canManage) {
        const studentsData = await api.get('/students');
        setStudents(studentsData);
      }
    } catch (err) {
      console.error('Error fetching library data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBookSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookForm.title || !bookForm.author) return showToast('Title and Author are required', 'error');

    try {
      if (editingBook) {
        await api.put(`/library/books/${editingBook.id}`, bookForm);
        showToast('Book updated successfully');
      } else {
        await api.post('/library/books', bookForm);
        showToast('Book added to catalog successfully');
      }
      setShowBookModal(false);
      setEditingBook(null);
      setBookForm({ title: '', author: '', isbn: '', category: 'General', total_copies: 1, rack_location: '' });
      fetchData();
    } catch (err) {
      showToast('Error saving book details', 'error');
    }
  };

  const handleIssueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueForm.book_id || !issueForm.student_id || !issueForm.due_date) {
      return showToast('All fields are required to issue a book', 'error');
    }

    try {
      await api.post('/library/transactions/issue', issueForm);
      showToast('Book issued successfully');
      setShowIssueModal(false);
      setStudentSearch('');
      setIssueForm({ book_id: '', student_id: '', due_date: '' });
      fetchData();
    } catch (err: any) {
      showToast(err.message || 'Error issuing book', 'error');
    }
  };

  const handleReturnBook = async (id: string) => {
    try {
      const res = await api.post(`/library/transactions/${id}/return`, {});
      showToast(res.fine_amount > 0 ? `Book returned. Overdue fine: ₹${res.fine_amount}` : 'Book returned successfully');
      fetchData();
    } catch (err) {
      showToast('Error returning book', 'error');
    }
  };

  const handlePayFine = async (id: string) => {
    try {
      await api.post(`/library/transactions/${id}/pay-fine`, {});
      showToast('Fine cleared successfully');
      fetchData();
    } catch (err) {
      showToast('Error clearing fine', 'error');
    }
  };

  const handleDeleteBook = async (id: string) => {
    try {
      await api.delete(`/library/books/${id}`);
      fetchData();
    } catch (err) {
      showToast('Error deleting book', 'error');
    }
  };

  const categories = ['All', ...Array.from(new Set(books.map(b => b.category)))];

  // Filter Catalog
  const filteredBooks = books.filter(b => {
    const matchesSearch = 
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.isbn && b.isbn.includes(searchQuery)) ||
      (b.rack_location && b.rack_location.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = categoryFilter === 'All' || b.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Filter Transactions
  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = 
      t.book_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.admission_number.includes(searchQuery);

    const matchesStatus = 
      statusFilter === 'All' ||
      (statusFilter === 'ISSUED' && t.status === 'ISSUED') ||
      (statusFilter === 'RETURNED' && t.status === 'RETURNED') ||
      (statusFilter === 'FINES' && t.fine_amount > 0 && t.fine_status === 'PENDING');

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    return status === 'ISSUED' 
      ? <span className="badge badge-warning" style={{ fontWeight: 700 }}>Issued</span>
      : <span className="badge badge-success" style={{ fontWeight: 700 }}>Returned</span>;
  };

  const getFineBadge = (txn: TransactionType) => {
    if (txn.fine_amount === 0) return <span style={{ color: 'var(--text-muted)' }}>-</span>;
    if (txn.fine_status === 'PAID') {
      return <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>Paid ₹{txn.fine_amount}</span>;
    }
    return (
      <span className="badge badge-danger" style={{ fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
        Unpaid ₹{txn.fine_amount}
      </span>
    );
  };

  return (
    <Layout>
      <PageGuidance
        title="Library Management"
        description="Browse the book catalog, manage checkouts and returns, and bill overdue fines to student profiles."
        steps={["Browse or search the catalog of library books.","Use the checkout transaction lists to issue new books or mark returns.","Collect library overdue fines and clear pending payments."]}
      />

      <div className="page-header">
        <div>
          <h2>Library & Digital Catalog</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Manage physical copies, search categories, track checkouts, and charge overdue liabilities
          </p>
        </div>
        {canManage && (
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-outline" onClick={() => setShowIssueModal(true)}>
              <BookOpen size={16} /> Issue Book
            </button>
            <button className="btn btn-primary" onClick={() => { setEditingBook(null); setBookForm({ title: '', author: '', isbn: '', category: 'General', total_copies: 1, rack_location: '' }); setShowBookModal(true); }}>
              <Plus size={16} /> Add New Book
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="page-tabs" style={{ marginBottom: '1.5rem' }}>
        <button className={`page-tab ${activeTab === 'catalog' ? 'active' : ''}`} onClick={() => { setActiveTab('catalog'); setSearchQuery(''); }}>
          Book Catalog
        </button>
        <button className={`page-tab ${activeTab === 'transactions' ? 'active' : ''}`} onClick={() => { setActiveTab('transactions'); setSearchQuery(''); }}>
          Borrowing Registry
        </button>
      </div>

      {/* Toolbar / Search */}
      <div className="card" style={{ padding: '1rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder={activeTab === 'catalog' ? "Search by title, author, isbn or rack location..." : "Search by student name, roll or book title..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '2.25rem', width: '100%', marginBottom: 0 }}
          />
        </div>

        {activeTab === 'catalog' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{ padding: '0.4rem', fontSize: '0.85rem', minWidth: '150px' }}
            >
              {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ padding: '0.4rem', fontSize: '0.85rem', minWidth: '150px' }}
            >
              <option value="All">All Transactions</option>
              <option value="ISSUED">Currently Issued</option>
              <option value="RETURNED">Returned Copies</option>
              <option value="FINES">Overdue Outstanding Fines</option>
            </select>
          </div>
        )}
      </div>

      {loading ? <p>Loading library records...</p> : activeTab === 'catalog' ? (
        // Catalog View
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {filteredBooks.length === 0 ? (
            <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem 2rem' }}>
              <Book size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
              <h3 style={{ color: 'var(--text-main)', marginBottom: '0.25rem' }}>No Books Found</h3>
              <p style={{ color: 'var(--text-muted)' }}>We couldn't find any books matching your query.</p>
            </div>
          ) : (
            filteredBooks.map(book => (
              <div key={book.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '1.25rem', gap: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span className="badge" style={{ backgroundColor: 'var(--primary-soft)', color: 'var(--primary)', fontWeight: 700, fontSize: '0.7rem' }}>
                      {book.category}
                    </span>
                    {book.rack_location && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                        📍 Rack {book.rack_location}
                      </span>
                    )}
                  </div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginTop: '0.5rem', color: 'var(--text-main)', lineHeight: 1.3 }}>
                    {book.title}
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                    by <strong>{book.author}</strong>
                  </p>
                  {book.isbn && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      ISBN: {book.isbn}
                    </p>
                  )}
                </div>

                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>Availability</span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 800, color: book.available_copies > 0 ? 'var(--success)' : 'var(--danger)' }}>
                      {book.available_copies} / {book.total_copies} available
                    </span>
                  </div>

                  {canManage && (
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button 
                        className="btn btn-outline" 
                        style={{ padding: '0.4rem' }} 
                        onClick={() => {
                          setEditingBook(book);
                          setBookForm({
                            title: book.title,
                            author: book.author,
                            isbn: book.isbn,
                            category: book.category,
                            total_copies: book.total_copies,
                            rack_location: book.rack_location
                          });
                          setShowBookModal(true);
                        }}
                        title="Edit Book Details"
                      >
                        <Edit size={14} />
                      </button>
                      <button 
                        className="btn btn-outline" 
                        style={{ padding: '0.4rem', color: 'var(--danger)', borderColor: 'rgba(239,68,68,0.2)' }}
                        onClick={() => handleDeleteBook(book.id)}
                        title="Delete Book"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        // Transactions Table View
        <div className="card" style={{ padding: '1rem' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '1rem' }}>Borrowing Records</h3>
          {filteredTransactions.length === 0 ? (
            <p className="no-data" style={{ padding: '3rem 0', color: 'var(--text-muted)', textAlign: 'center' }}>
              No borrowing transaction logs found.
            </p>
          ) : (
            <div className="table-responsive">
              <table className="table" style={{ fontSize: '0.85rem' }}>
                <thead>
                  <tr>
                    <th>Book Details</th>
                    <th>Student Name</th>
                    <th>Issue Date</th>
                    <th>Due Date</th>
                    <th>Return Date</th>
                    <th style={{ textAlign: 'center' }}>Status</th>
                    <th style={{ textAlign: 'center' }}>Overdue Fine</th>
                    {canManage && <th style={{ textAlign: 'center' }}>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((txn) => (
                    <tr key={txn.id}>
                      <td>
                        <strong>{txn.book_title}</strong>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>by {txn.book_author}</div>
                      </td>
                      <td>
                        <strong>{txn.student_name}</strong>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>ID: {txn.admission_number}</div>
                      </td>
                      <td>{new Date(txn.issue_date).toLocaleDateString()}</td>
                      <td>{new Date(txn.due_date).toLocaleDateString()}</td>
                      <td>
                        {txn.return_date ? new Date(txn.return_date).toLocaleDateString() : <span style={{ color: 'var(--text-muted)' }}>-</span>}
                      </td>
                      <td style={{ textAlign: 'center' }}>{getStatusBadge(txn.status)}</td>
                      <td style={{ textAlign: 'center' }}>{getFineBadge(txn)}</td>
                      {canManage && (
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                            {txn.status === 'ISSUED' && (
                              <button 
                                className="btn btn-outline" 
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderColor: 'var(--primary)', color: 'var(--primary)' }}
                                onClick={() => handleReturnBook(txn.id)}
                              >
                                Mark Return
                              </button>
                            )}
                            {txn.fine_amount > 0 && txn.fine_status === 'PENDING' && (
                              <button 
                                className="btn btn-outline" 
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderColor: 'var(--success)', color: 'var(--success)' }}
                                onClick={() => handlePayFine(txn.id)}
                              >
                                <CreditCard size={12} /> Clear Fine
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Book Modal */}
      {showBookModal && (
        <div className="modal">
          <div className="modal-content" style={{ maxWidth: '550px' }}>
            <h3>{editingBook ? 'Edit Book Details' : 'Add Book to Catalog'}</h3>
            <form onSubmit={handleBookSubmit}>
              <div className="form-group">
                <label>Book Title</label>
                <input
                  type="text"
                  placeholder="e.g. Introduction to Algorithms"
                  value={bookForm.title}
                  onChange={(e) => setBookForm({ ...bookForm, title: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Author</label>
                <input
                  type="text"
                  placeholder="e.g. Thomas H. Cormen"
                  value={bookForm.author}
                  onChange={(e) => setBookForm({ ...bookForm, author: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>ISBN Number (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. 9780262033848"
                    value={bookForm.isbn}
                    onChange={(e) => setBookForm({ ...bookForm, isbn: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Book Category</label>
                  <select
                    value={bookForm.category}
                    onChange={(e) => setBookForm({ ...bookForm, category: e.target.value })}
                  >
                    <option value="General">General</option>
                    <option value="Science">Science & Tech</option>
                    <option value="Mathematics">Mathematics</option>
                    <option value="History">History</option>
                    <option value="Fiction">Literature & Fiction</option>
                    <option value="Reference">Reference Encyclopedias</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Total Copies</label>
                  <input
                    type="number"
                    min={1}
                    value={bookForm.total_copies}
                    onChange={(e) => setBookForm({ ...bookForm, total_copies: Number(e.target.value) })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Rack Location (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. A-4, Shelf 2"
                    value={bookForm.rack_location}
                    onChange={(e) => setBookForm({ ...bookForm, rack_location: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-actions" style={{ marginTop: '2rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => { setShowBookModal(false); setEditingBook(null); }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingBook ? 'Update Details' : 'Add to Catalog'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Issue Modal */}
      {showIssueModal && (
        <div className="modal">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <h3>Issue Library Book</h3>
            <form onSubmit={handleIssueSubmit}>
              <div className="form-group">
                <label>Select Book</label>
                <select
                  value={issueForm.book_id}
                  onChange={(e) => setIssueForm({ ...issueForm, book_id: e.target.value })}
                  required
                >
                  <option value="">-- Choose Book Copy --</option>
                  {books.filter(b => b.available_copies > 0).map(b => (
                    <option key={b.id} value={b.id}>{b.title} ({b.available_copies} copies available)</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Find Student</label>
                <input
                  type="text"
                  placeholder="Type student name or admission number..."
                  value={studentSearch}
                  onChange={(e) => { setStudentSearch(e.target.value); setIssueForm({...issueForm, student_id: ''}); }}
                  style={{ marginBottom: '0.5rem' }}
                />
                {studentSearch.length >= 2 && (
                  <select
                    value={issueForm.student_id}
                    onChange={(e) => setIssueForm({ ...issueForm, student_id: e.target.value })}
                    required
                    style={{ width: '100%' }}
                  >
                    <option value="">-- Select student --</option>
                    {students
                      .filter(s =>
                        `${s.first_name} ${s.last_name}`.toLowerCase().includes(studentSearch.toLowerCase()) ||
                        s.admission_number.includes(studentSearch)
                      )
                      .map(s => (
                        <option key={s.id} value={s.id}>
                          {s.first_name} {s.last_name} ({s.admission_number})
                        </option>
                      ))}
                  </select>
                )}
                {studentSearch.length < 2 && (
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>
                    Type at least 2 characters to search
                  </p>
                )}
              </div>

              <div className="form-group">
                <label>Return Due Date</label>
                <input
                  type="date"
                  value={issueForm.due_date}
                  onChange={(e) => setIssueForm({ ...issueForm, due_date: e.target.value })}
                  required
                />
              </div>

              <div className="modal-actions" style={{ marginTop: '2rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => { setShowIssueModal(false); setStudentSearch(''); }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Issue Book Copy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Toast notifications managed globally */}
    </Layout>
  );
}
