import './Library.css';
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
      ? <span className="badge badge-warning library-badge">Issued</span>
      : <span className="badge badge-success library-badge">Returned</span>;
  };

  const getFineBadge = (txn: TransactionType) => {
    if (txn.fine_amount === 0) return <span className="library-span-3">-</span>;
    if (txn.fine_status === 'PAID') {
      return <span className="badge badge-success library-badge">Paid ₹{txn.fine_amount}</span>;
    }
    return (
      <span className="badge badge-danger library-badge">
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
          <p className="library-text-6">
            Manage physical copies, search categories, track checkouts, and charge overdue liabilities
          </p>
        </div>
        {canManage && (
          <div className="library-row-7">
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
      <div className="page-tabs library-page-tabs">
        <button className={`page-tab ${activeTab === 'catalog' ? 'active' : ''}`} onClick={() => { setActiveTab('catalog'); setSearchQuery(''); }}>
          Book Catalog
        </button>
        <button className={`page-tab ${activeTab === 'transactions' ? 'active' : ''}`} onClick={() => { setActiveTab('transactions'); setSearchQuery(''); }}>
          Borrowing Registry
        </button>
      </div>

      {/* Toolbar / Search */}
      <div className="card library-toolbar-card">
        <div className="library-div-10">
          <Search size={16} className="library-Search-11"  />
          <input type="text" placeholder={activeTab === 'catalog' ? "Search by title, author, isbn or rack location..." : "Search by student name, roll or book title..."} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="library-input-12"  />
        </div>

        {activeTab === 'catalog' ? (
          <div className="library-row-13">
            <span className="library-span-14">Category:</span>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="library-select-15">
              {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
        ) : (
          <div className="library-row-16">
            <span className="library-span-17">Status:</span>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="library-select-18">
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
        <div className="library-grid-19">
          {filteredBooks.length === 0 ? (
            <div className="card library-empty-card">
              <Book size={48} className="library-Book-21"  />
              <h3 className="library-title-22">No Books Found</h3>
              <p className="library-text-23">We couldn't find any books matching your query.</p>
            </div>
          ) : (
            filteredBooks.map(book => (
              <div key={book.id} className="card library-book-card">
                <div>
                  <div className="library-row-25">
                    <span className="badge library-badge">
                      {book.category}
                    </span>
                    {book.rack_location && (
                      <span className="library-span-27">
                        📍 Rack {book.rack_location}
                      </span>
                    )}
                  </div>
                  <h3 className="library-title-28">
                    {book.title}
                  </h3>
                  <p className="library-text-29">
                    by <strong>{book.author}</strong>
                  </p>
                  {book.isbn && (
                    <p className="library-text-30">
                      ISBN: {book.isbn}
                    </p>
                  )}
                </div>

                <div className="library-row-31">
                  <div>
                    <span className="library-span-32">Availability</span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 800, color: book.available_copies > 0 ? 'var(--success)' : 'var(--danger)' }}>
                      {book.available_copies} / {book.total_copies} available
                    </span>
                  </div>

                  {canManage && (
                    <div className="library-row-33">
                      <button className="btn btn-outline library-btn" onClick={() => { setEditingBook(book); setBookForm({ title: book.title, author: book.author, isbn: book.isbn, category: book.category, total_copies: book.total_copies, rack_location: book.rack_location }); setShowBookModal(true); }} title="Edit Book Details">
                        <Edit size={14} />
                      </button>
                      <button className="btn btn-outline library-btn" onClick={() => handleDeleteBook(book.id)} title="Delete Book">
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
        <div className="card library-transactions-card">
          <h3 className="library-title-37">Borrowing Records</h3>
          {filteredTransactions.length === 0 ? (
            <p className="no-data library-no-data">
              No borrowing transaction logs found.
            </p>
          ) : (
            <div className="table-responsive">
              <table className="table library-table">
                <thead>
                  <tr>
                    <th>Book Details</th>
                    <th>Student Name</th>
                    <th>Issue Date</th>
                    <th>Due Date</th>
                    <th>Return Date</th>
                    <th className="library-th-40">Status</th>
                    <th className="library-th-41">Overdue Fine</th>
                    {canManage && <th className="library-th-42">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((txn) => (
                    <tr key={txn.id}>
                      <td>
                        <strong>{txn.book_title}</strong>
                        <div className="library-div-43">by {txn.book_author}</div>
                      </td>
                      <td>
                        <strong>{txn.student_name}</strong>
                        <div className="library-div-44">ID: {txn.admission_number}</div>
                      </td>
                      <td>{new Date(txn.issue_date).toLocaleDateString()}</td>
                      <td>{new Date(txn.due_date).toLocaleDateString()}</td>
                      <td>
                        {txn.return_date ? new Date(txn.return_date).toLocaleDateString() : <span className="library-span-45">-</span>}
                      </td>
                      <td className="library-td-46">{getStatusBadge(txn.status)}</td>
                      <td className="library-td-47">{getFineBadge(txn)}</td>
                      {canManage && (
                        <td className="library-td-48">
                          <div className="library-row-49">
                            {txn.status === 'ISSUED' && (
                              <button className="btn btn-outline library-btn" onClick={() => handleReturnBook(txn.id)}>
                                Mark Return
                              </button>
                            )}
                            {txn.fine_amount > 0 && txn.fine_status === 'PENDING' && (
                              <button className="btn btn-outline library-btn" onClick={() => handlePayFine(txn.id)}>
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
          <div className="modal-content library-modal-content">
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

              <div className="library-grid-53">
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

              <div className="library-grid-54">
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

              <div className="modal-actions library-modal-actions">
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
          <div className="modal-content library-modal-content">
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
                <input type="text" placeholder="Type student name or admission number..." value={studentSearch} onChange={(e) => { setStudentSearch(e.target.value); setIssueForm({...issueForm, student_id: ''}); }} className="library-input-57"  />
                {studentSearch.length >= 2 && (
                  <select value={issueForm.student_id} onChange={(e) => setIssueForm({ ...issueForm, student_id: e.target.value })} required className="library-select-58">
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
                  <p className="library-text-59">
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

              <div className="modal-actions library-modal-actions">
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
