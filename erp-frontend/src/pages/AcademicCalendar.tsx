import './AcademicCalendar.css';
import React, { useEffect, useState } from 'react';
import { PageGuidance } from '../components/PageGuidance';
import Layout from '../components/Layout';
import { api } from '../services/api';
import { Plus, Trash2, Calendar as CalendarIcon, Tag, MapPin, Clock } from 'lucide-react';

interface CalendarEntry {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  type: 'holiday' | 'event' | 'exam' | 'vacation';
  description: string | null;
}

export default function AcademicCalendar() {
  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    name: '',
    start_date: '',
    end_date: '',
    type: 'holiday' as const,
    description: ''
  });

  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    try {
      setLoading(true);
      const data = await api.get('/academic-calendar');
      setEntries(data);
    } catch (err) {
      console.error('Error fetching calendar entries:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/academic-calendar', form);
      setShowModal(false);
      setForm({
        name: '',
        start_date: '',
        end_date: '',
        type: 'holiday',
        description: ''
      });
      fetchEntries();
    } catch (err) {
      alert('Error creating entry');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this calendar entry?')) return;
    try {
      await api.delete(`/academic-calendar/${id}`);
      fetchEntries();
    } catch (err) {
      alert('Error deleting entry');
    }
  };

  const getTypeBadgeClass = (type: string) => {
    switch (type) {
      case 'holiday': return 'badge-danger';
      case 'event': return 'badge-primary';
      case 'exam': return 'badge-warning';
      case 'vacation': return 'badge-info';
      default: return 'badge-secondary';
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <Layout>
      <PageGuidance
        title="School Calendar"
        description="Use this page to track and schedule school events, exams, meetings, and holidays."
        steps={["View scheduled activities in a calendar monthly layout.","Double-click a date to add a new school event, holiday, or meeting.","Filter by category to view only exams, holidays, or events."]}
      />
      <div className="page-header">
        <div>
          <h2>Academic Calendar</h2>
          <p className="academic-calendar-text-1">
            Manage holidays, events, exam days, and vacations
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} /> Add Entry
        </button>
      </div>

      <div className="card">
        {loading ? (
          <p>Loading calendar...</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Dates</th>
                <th>Description</th>
                <th className="academic-calendar-th-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td>
                    <strong>{entry.name}</strong>
                  </td>
                  <td>
                    <span className={`badge ${getTypeBadgeClass(entry.type)}`}>
                      {entry.type.toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <div className="academic-calendar-row-3">
                      <CalendarIcon size={14} className="text-muted" />
                      <span>
                        {formatDate(entry.start_date)}
                        {entry.end_date !== entry.start_date && ` - ${formatDate(entry.end_date)}`}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className="academic-calendar-span-4">
                      {entry.description || '-'}
                    </span>
                  </td>
                  <td className="academic-calendar-td-5">
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(entry.id)}>
                      <Trash2 size={14} /> Delete
                    </button>
                  </td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr>
                  <td colSpan={5} className="academic-calendar-td-6">
                    <CalendarIcon size={32} className="academic-calendar-CalendarIcon-7"  />
                    <p className="academic-calendar-text-8">No academic calendar entries found.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Add New Calendar Entry</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Entry Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Independence Day, Mid-Term Exam"
                  required
                />
              </div>
              <div className="form-group">
                <label>Type</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as any })}
                  required
                >
                  <option value="holiday">Holiday</option>
                  <option value="event">Event</option>
                  <option value="exam">Exam Day</option>
                  <option value="vacation">Vacation</option>
                </select>
              </div>
              <div className="academic-calendar-grid-9">
                <div className="form-group">
                  <label>Start Date</label>
                  <input
                    type="date"
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>End Date</label>
                  <input
                    type="date"
                    value={form.end_date}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief details or remarks..." rows={3} className="academic-calendar-textarea-10"  />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
