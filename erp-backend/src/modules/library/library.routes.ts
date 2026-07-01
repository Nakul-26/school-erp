import { Hono } from 'hono';
import { authMiddleware } from '../../middleware/auth';
import type { Env } from '../../types';

const library = new Hono<{ Bindings: Env }>();

// Helper to ensure tables exist
async function ensureLibraryTables(db: D1Database) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS library_books (
      id TEXT PRIMARY KEY,
      institution_id TEXT NOT NULL,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      isbn TEXT,
      category TEXT,
      total_copies INTEGER NOT NULL DEFAULT 1,
      available_copies INTEGER NOT NULL DEFAULT 1,
      rack_location TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `).run();

  await db.prepare(`
    CREATE TABLE IF NOT EXISTS library_transactions (
      id TEXT PRIMARY KEY,
      institution_id TEXT NOT NULL,
      book_id TEXT NOT NULL REFERENCES library_books(id),
      student_id TEXT NOT NULL REFERENCES students(id),
      issued_by TEXT,
      issue_date TEXT NOT NULL,
      due_date TEXT NOT NULL,
      return_date TEXT,
      fine_amount REAL DEFAULT 0.0,
      fine_status TEXT DEFAULT 'NONE',
      status TEXT DEFAULT 'ISSUED',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `).run();
}

// 1. Get all books
library.get('/books', authMiddleware, async (c) => {
  const user = c.get('user');
  await ensureLibraryTables(c.env.DB);
  
  const { results } = await c.env.DB.prepare(`
    SELECT * FROM library_books 
    WHERE institution_id = ? AND is_active = 1 
    ORDER BY title ASC
  `).bind(user.institution_id).all();

  return c.json(results);
});

// 2. Add book
library.post('/books', authMiddleware, async (c) => {
  const user = c.get('user');
  await ensureLibraryTables(c.env.DB);
  const body = await c.req.json();

  if (!body.title || !body.author) {
    return c.json({ error: 'Title and author are required' }, 400);
  }

  const id = crypto.randomUUID();
  const total = Number(body.total_copies) || 1;

  await c.env.DB.prepare(`
    INSERT INTO library_books (id, institution_id, title, author, isbn, category, total_copies, available_copies, rack_location)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    user.institution_id,
    body.title,
    body.author,
    body.isbn || '',
    body.category || 'General',
    total,
    total,
    body.rack_location || ''
  ).run();

  return c.json({ success: true, id }, 201);
});

// 3. Edit book
library.put('/books/:id', authMiddleware, async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  await ensureLibraryTables(c.env.DB);
  const body = await c.req.json();

  // Get current book to calculate new available copies
  const book = await c.env.DB.prepare(`
    SELECT total_copies, available_copies FROM library_books WHERE id = ? AND institution_id = ?
  `).bind(id, user.institution_id).first<{ total_copies: number; available_copies: number }>();

  if (!book) return c.json({ error: 'Book not found' }, 404);

  const newTotal = Number(body.total_copies) ?? book.total_copies;
  const diff = newTotal - book.total_copies;
  const newAvailable = Math.max(0, book.available_copies + diff);

  await c.env.DB.prepare(`
    UPDATE library_books 
    SET title = ?, author = ?, isbn = ?, category = ?, total_copies = ?, available_copies = ?, rack_location = ?
    WHERE id = ? AND institution_id = ?
  `).bind(
    body.title,
    body.author,
    body.isbn || '',
    body.category || 'General',
    newTotal,
    newAvailable,
    body.rack_location || '',
    id,
    user.institution_id
  ).run();

  return c.json({ success: true });
});

// 4. Delete book (Soft delete)
library.delete('/books/:id', authMiddleware, async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  await ensureLibraryTables(c.env.DB);

  await c.env.DB.prepare(`
    UPDATE library_books SET is_active = 0 WHERE id = ? AND institution_id = ?
  `).bind(id, user.institution_id).run();

  return c.json({ success: true });
});

// 5. Get transactions (Issue/returns list)
library.get('/transactions', authMiddleware, async (c) => {
  const user = c.get('user');
  await ensureLibraryTables(c.env.DB);

  const { results } = await c.env.DB.prepare(`
    SELECT t.*, b.title as book_title, b.author as book_author, 
           s.first_name || ' ' || s.last_name as student_name, s.admission_number,
           u.name as issuer_name
    FROM library_transactions t
    JOIN library_books b ON t.book_id = b.id
    JOIN students s ON t.student_id = s.id
    LEFT JOIN users u ON t.issued_by = u.id
    WHERE t.institution_id = ? AND t.is_active = 1
    ORDER BY t.created_at DESC
  `).bind(user.institution_id).all();

  return c.json(results);
});

// 6. Issue book
library.post('/transactions/issue', authMiddleware, async (c) => {
  const user = c.get('user');
  await ensureLibraryTables(c.env.DB);
  const body = await c.req.json();

  if (!body.book_id || !body.student_id || !body.due_date) {
    return c.json({ error: 'Book ID, Student ID, and Due Date are required' }, 400);
  }

  // Check availability
  const book = await c.env.DB.prepare(`
    SELECT available_copies FROM library_books WHERE id = ? AND institution_id = ? AND is_active = 1
  `).bind(body.book_id, user.institution_id).first<{ available_copies: number }>();

  if (!book) return c.json({ error: 'Book not found' }, 404);
  if (book.available_copies <= 0) {
    return c.json({ error: 'No copies of this book are currently available for issue.' }, 400);
  }

  // Create transaction
  const id = crypto.randomUUID();
  const today = new Date().toISOString().split('T')[0];

  await c.env.DB.prepare(`
    INSERT INTO library_transactions (id, institution_id, book_id, student_id, issued_by, issue_date, due_date, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'ISSUED')
  `).bind(
    id,
    user.institution_id,
    body.book_id,
    body.student_id,
    user.sub,
    today,
    body.due_date
  ).run();

  // Decrement copies
  await c.env.DB.prepare(`
    UPDATE library_books SET available_copies = available_copies - 1 WHERE id = ?
  `).bind(body.book_id).run();

  return c.json({ success: true, id }, 201);
});

// 7. Return book & calculate fines
library.post('/transactions/:id/return', authMiddleware, async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  await ensureLibraryTables(c.env.DB);

  const txn = await c.env.DB.prepare(`
    SELECT * FROM library_transactions WHERE id = ? AND institution_id = ? AND status = 'ISSUED'
  `).bind(id, user.institution_id).first<{ book_id: string; due_date: string }>();

  if (!txn) return c.json({ error: 'Active issue transaction not found' }, 404);

  const todayStr = new Date().toISOString().split('T')[0];
  
  // Calculate overdue fine (₹5 per day overdue)
  const due = new Date(txn.due_date);
  const today = new Date(todayStr);
  let fine = 0.0;
  let fineStatus = 'NONE';

  if (today.getTime() > due.getTime()) {
    const diffTime = Math.abs(today.getTime() - due.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    fine = diffDays * 5.0; // ₹5 per day
    fineStatus = 'PENDING';
  }

  // Update transaction
  await c.env.DB.prepare(`
    UPDATE library_transactions 
    SET return_date = ?, fine_amount = ?, fine_status = ?, status = 'RETURNED'
    WHERE id = ?
  `).bind(todayStr, fine, fineStatus, id).run();

  // Increment copies
  await c.env.DB.prepare(`
    UPDATE library_books SET available_copies = available_copies + 1 WHERE id = ?
  `).bind(txn.book_id).run();

  return c.json({ success: true, fine_amount: fine });
});

// 8. Pay fine
library.post('/transactions/:id/pay-fine', authMiddleware, async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  await ensureLibraryTables(c.env.DB);

  await c.env.DB.prepare(`
    UPDATE library_transactions SET fine_status = 'PAID' WHERE id = ? AND institution_id = ?
  `).bind(id, user.institution_id).run();

  return c.json({ success: true });
});

export default library;
