import './Alumni.css';
import React, { useEffect, useState } from 'react';
import { PageGuidance } from '../components/PageGuidance';
import Layout from '../components/Layout';
import { api } from '../services/api';
import { Plus, GraduationCap, Building, Briefcase, Mail, Calendar, Trash2 } from 'lucide-react';
import SkeletonLoader from '../components/SkeletonLoader';
import EmptyState from '../components/EmptyState';

interface Alumnus {
  id: string;
  first_name: string;
  last_name: string;
  graduation_year: number;
  current_status: 'Higher Studies' | 'Employed' | 'Self-Employed' | 'Unemployed' | 'Other' | null;
  institution: string | null;
  contact: string | null;
}

interface AlumniEvent {
  id: string;
  name: string;
  event_type: 'reunion' | 'webinar' | 'fundraiser' | 'mentorship' | 'other';
  start_date: string;
  end_date: string | null;
  location: string | null;
  description: string | null;
  going_count: number;
}

export default function Alumni() {
  const [activeTab, setActiveTab] = useState<'directory' | 'events'>('directory');
  const [alumni, setAlumni] = useState<Alumnus[]>([]);
  const [events, setEvents] = useState<AlumniEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [eventForm, setEventForm] = useState({ name: '', event_type: 'reunion', start_date: '', end_date: '', location: '', description: '' });

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    graduation_year: new Date().getFullYear() - 1,
    current_status: 'Higher Studies' as const,
    institution: '',
    contact: '',
  });

  const fetchAlumni = async () => {
    try {
      setLoading(true);
      const [alumniData, eventsData] = await Promise.all([
        api.get('/alumni'),
        api.get('/alumni/events'),
      ]);
      setAlumni(alumniData);
      setEvents(eventsData);
    } catch (err) {
      console.error('Error fetching alumni records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlumni();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this alumnus record?')) return;
    try {
      await api.delete(`/alumni/${id}`);
      fetchAlumni();
    } catch (err: any) {
      alert(err.message || 'Failed to remove alumnus record.');
    }
  };

  const resetEventForm = () => setEventForm({ name: '', event_type: 'reunion', start_date: '', end_date: '', location: '', description: '' });

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventForm.name || !eventForm.start_date) {
      return alert('Event name and start date are required.');
    }
    try {
      setSaving(true);
      await api.post('/alumni/events', eventForm);
      setShowEventModal(false);
      resetEventForm();
      fetchAlumni();
    } catch (err: any) {
      alert(err.message || 'Failed to create event.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!confirm('Delete this alumni event?')) return;
    try {
      await api.delete(`/alumni/events/${id}`);
      fetchAlumni();
    } catch (err: any) {
      alert(err.message || 'Failed to delete event.');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.first_name || !form.last_name || !form.graduation_year) {
      return alert('First Name, Last Name and Graduation Year are required.');
    }

    try {
      setSaving(true);
      await api.post('/alumni', {
        ...form,
        graduation_year: Number(form.graduation_year)
      });
      setShowAddModal(false);
      resetForm();
      alert('Alumnus record added.');
      fetchAlumni();
    } catch (err: any) {
      alert(err.message || 'Failed to add alumnus.');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setForm({
      first_name: '',
      last_name: '',
      graduation_year: new Date().getFullYear() - 1,
      current_status: 'Higher Studies',
      institution: '',
      contact: '',
    });
  };

  // Stats calculation
  const totalAlumni = alumni.length;
  const inHigherEd = alumni.filter(a => a.current_status === 'Higher Studies').length;
  const employed = alumni.filter(a => a.current_status === 'Employed' || a.current_status === 'Self-Employed').length;
  
  const higherEdPct = totalAlumni > 0 ? Math.round((inHigherEd / totalAlumni) * 100) : 0;
  const employedPct = totalAlumni > 0 ? Math.round((employed / totalAlumni) * 100) : 0;

  return (
    <Layout>
      <PageGuidance
        title="Alumni Directory"
        description="Track the professional development and academic journeys of graduated student alumni. Generate enrollment metrics and maintain graduate relations."
        steps={[
          'Add graduated students manually or import final-year rosters.',
          'Log career pathways (higher education universities, company designations).',
          'Search graduates by batch year or employment status.'
        ]}
      />

      <div className="page-header">
        <div>
          <h2>Alumni Database</h2>
          <p className="alumni-text-1">
            Graduate tracking, carrier pathways, and batch lists
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {activeTab === 'events' ? (
            <button className="btn btn-primary alumni-btn" onClick={() => setShowEventModal(true)}>
              <Plus size={18} /> New Event
            </button>
          ) : (
            <button className="btn btn-primary alumni-btn" onClick={() => setShowAddModal(true)}>
              <Plus size={18} /> Add Alumnus
            </button>
          )}
        </div>
      </div>

      <div className="page-tabs" style={{ marginBottom: '1.5rem' }}>
        <button className={`page-tab ${activeTab === 'directory' ? 'active' : ''}`} onClick={() => setActiveTab('directory')}>
          Directory ({alumni.length})
        </button>
        <button className={`page-tab ${activeTab === 'events' ? 'active' : ''}`} onClick={() => setActiveTab('events')}>
          Events ({events.length})
        </button>
      </div>

      {activeTab === 'directory' && (
      <>
      {/* Stats Summary cards */}
      <div className="alumni-grid-3">
        <div className="card alumni-card">
          <div className="alumni-div-5">
            <GraduationCap size={24} />
          </div>
          <div>
            <div className="alumni-div-6">{totalAlumni}</div>
            <div className="alumni-div-7">Total Graduates Tracked</div>
          </div>
        </div>

        <div className="card alumni-card">
          <div className="alumni-div-9">
            <Building size={24} />
          </div>
          <div>
            <div className="alumni-div-10">{higherEdPct}%</div>
            <div className="alumni-div-11">In Higher Education</div>
          </div>
        </div>

        <div className="card alumni-card">
          <div className="alumni-div-13">
            <Briefcase size={24} />
          </div>
          <div>
            <div className="alumni-div-14">{employedPct}%</div>
            <div className="alumni-div-15">Employed or Startup</div>
          </div>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <SkeletonLoader type="table" rows={5} cols={6} />
        ) : alumni.length === 0 ? (
          <EmptyState
            title="Alumni Directory is Empty"
            description="No graduate records found. Start adding alumni to compile the school's graduation yearbook."
            icon={GraduationCap}
            action={{
              label: "Add Alumnus",
              onClick: () => setShowAddModal(true)
            }}
          />
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Graduate Name</th>
                  <th>Graduation Year</th>
                  <th>Career Status</th>
                  <th>Current University / Company</th>
                  <th>Contact Details</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {alumni.map((a) => (
                  <tr key={a.id}>
                    <td><strong>{a.first_name} {a.last_name}</strong></td>
                    <td><strong>Class of {a.graduation_year}</strong></td>
                    <td>
                      <span className="badge badge-primary">{a.current_status || 'Other'}</span>
                    </td>
                    <td>
                      <div className="alumni-row-16">
                        <Building size={12} className="alumni-Building-17"  />
                        <span>{a.institution || '—'}</span>
                      </div>
                    </td>
                    <td>
                      {a.contact ? (
                        <div className="alumni-row-18">
                          <Mail size={12} className="alumni-Mail-19"  />
                          <span>{a.contact}</span>
                        </div>
                      ) : (
                        <span className="alumni-span-20">No contact</span>
                      )}
                    </td>
                    <td>
                      <button className="btn btn-sm btn-outline" onClick={() => handleDelete(a.id)} title="Remove alumnus record">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </>
      )}

      {activeTab === 'events' && (
        <div className="card">
          {loading ? (
            <SkeletonLoader type="table" rows={4} cols={5} />
          ) : events.length === 0 ? (
            <EmptyState
              title="No Alumni Events Yet"
              description="Create reunions, webinars, fundraisers, or mentorship sessions to keep alumni engaged."
              icon={Calendar}
              action={{ label: 'New Event', onClick: () => setShowEventModal(true) }}
            />
          ) : (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Event</th>
                    <th>Type</th>
                    <th>Date</th>
                    <th>Location</th>
                    <th>Interested/Going</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {events.map(ev => (
                    <tr key={ev.id}>
                      <td><strong>{ev.name}</strong>{ev.description && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{ev.description}</div>}</td>
                      <td><span className="badge badge-primary">{ev.event_type}</span></td>
                      <td>{new Date(ev.start_date).toLocaleDateString()}{ev.end_date ? ` – ${new Date(ev.end_date).toLocaleDateString()}` : ''}</td>
                      <td>{ev.location || '—'}</td>
                      <td>{ev.going_count}</td>
                      <td>
                        <button className="btn btn-sm btn-outline" onClick={() => handleDeleteEvent(ev.id)} title="Delete event">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add Alumnus Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal alumni-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Record Graduate Alumnus</h3>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body alumni-modal-body">
                <div className="form-group">
                  <label>First Name *</label>
                  <input
                    required
                    value={form.first_name}
                    onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
                    placeholder="First name"
                  />
                </div>
                <div className="form-group">
                  <label>Last Name *</label>
                  <input
                    required
                    value={form.last_name}
                    onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
                    placeholder="Last name"
                  />
                </div>
                <div className="form-group">
                  <label>Graduation Year *</label>
                  <input
                    type="number"
                    required
                    value={form.graduation_year}
                    onChange={e => setForm(f => ({ ...f, graduation_year: Number(e.target.value) }))}
                  />
                </div>
                <div className="form-group">
                  <label>Current Pathway *</label>
                  <select
                    value={form.current_status}
                    onChange={e => setForm(f => ({ ...f, current_status: e.target.value as any }))}
                  >
                    <option>Higher Studies</option>
                    <option>Employed</option>
                    <option>Self-Employed</option>
                    <option>Unemployed</option>
                    <option>Other</option>
                  </select>
                </div>
                <div className="form-group alumni-form-group">
                  <label>Current Institution / Corporate Employer</label>
                  <input
                    value={form.institution}
                    onChange={e => setForm(f => ({ ...f, institution: e.target.value }))}
                    placeholder="e.g. Stanford University, Google India"
                  />
                </div>
                <div className="form-group alumni-form-group">
                  <label>Contact Email / Phone</label>
                  <input
                    value={form.contact}
                    onChange={e => setForm(f => ({ ...f, contact: e.target.value }))}
                    placeholder="e.g. email@example.com"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Creating...' : 'Create Alumnus'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Event Modal */}
      {showEventModal && (
        <div className="modal-overlay" onClick={() => setShowEventModal(false)}>
          <div className="modal alumni-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Create Alumni Event</h3>
              <button className="modal-close" onClick={() => setShowEventModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreateEvent}>
              <div className="modal-body alumni-modal-body">
                <div className="form-group">
                  <label>Event Name *</label>
                  <input required value={eventForm.name} onChange={e => setEventForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Class of 2020 Reunion" />
                </div>
                <div className="form-group">
                  <label>Event Type</label>
                  <select value={eventForm.event_type} onChange={e => setEventForm(f => ({ ...f, event_type: e.target.value }))}>
                    <option value="reunion">Reunion</option>
                    <option value="webinar">Webinar</option>
                    <option value="fundraiser">Fundraiser</option>
                    <option value="mentorship">Mentorship Session</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Start Date *</label>
                  <input type="date" required value={eventForm.start_date} onChange={e => setEventForm(f => ({ ...f, start_date: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>End Date (Optional)</label>
                  <input type="date" value={eventForm.end_date} onChange={e => setEventForm(f => ({ ...f, end_date: e.target.value }))} />
                </div>
                <div className="form-group alumni-form-group">
                  <label>Location</label>
                  <input value={eventForm.location} onChange={e => setEventForm(f => ({ ...f, location: e.target.value }))} placeholder="e.g. Main Auditorium / Zoom" />
                </div>
                <div className="form-group alumni-form-group">
                  <label>Description</label>
                  <textarea value={eventForm.description} onChange={e => setEventForm(f => ({ ...f, description: e.target.value }))} rows={3} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowEventModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Creating...' : 'Create Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
