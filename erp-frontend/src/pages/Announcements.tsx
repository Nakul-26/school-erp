import React, { useEffect, useState } from 'react';
import { PageGuidance } from '../components/PageGuidance';
import Layout from '../components/Layout';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Megaphone, Plus, Trash2, Calendar, Users, Eye } from 'lucide-react';

interface Announcement {
  id: string;
  title: string;
  content: string;
  visible_to_students: number;
  visible_to_teachers: number;
  visible_to_parents: number;
  created_at: string;
  created_by?: string;
}

export default function Announcements() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [form, setForm] = useState({
    title: '',
    content: '',
    visible_to_students: true,
    visible_to_teachers: true,
    visible_to_parents: true
  });

  const userRoles = user?.roles || (user?.role ? [user.role] : []);
  const canPublish = userRoles.some(r => 
    ['super_admin', 'Super Admin', 'admin', 'Admin', 'Principal', 'HOD', 'hod', 'Teacher', 'teacher'].includes(r)
  );

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const data = await api.get('/announcements');
      setAnnouncements(data);
    } catch (err) {
      console.error('Error fetching announcements:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.content) return alert('Title and content are required');

    try {
      setSaving(true);
      const payload = {
        title: form.title,
        content: form.content,
        visible_to_students: form.visible_to_students ? 1 : 0,
        visible_to_teachers: form.visible_to_teachers ? 1 : 0,
        visible_to_parents: form.visible_to_parents ? 1 : 0
      };

      await api.post('/announcements', payload);
      alert('Announcement published successfully!');
      setShowModal(false);
      setForm({
        title: '',
        content: '',
        visible_to_students: true,
        visible_to_teachers: true,
        visible_to_parents: true
      });
      fetchAnnouncements();
    } catch (err) {
      alert('Error creating announcement');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;
    try {
      await api.delete(`/announcements/${id}`);
      fetchAnnouncements();
    } catch (err) {
      alert('Error deleting announcement');
    }
  };

  return (
    <Layout>
      <PageGuidance
        title="Announcements"
        description="Use this page to write and post notice board announcements for students, teachers, or parents."
        steps={["Click \"Create Announcement\" to write a new notice.","Select whether to show it to students, teachers, or parents.","Manage, edit, or delete existing announcements."]}
      />
      <div className="page-header">
        <div>
          <h2>Announcements & Broadcasts</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Broadcasting important institution notices and holiday calendars
          </p>
        </div>
        {canPublish && (
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={18} /> New Notice
          </button>
        )}
      </div>

      <div className="announcements-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {loading ? <p>Loading notices...</p> : announcements.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <Megaphone size={40} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
            <h3 style={{ color: 'var(--text-main)', marginBottom: '0.5rem' }}>No Notice Found</h3>
            <p style={{ color: 'var(--text-muted)' }}>There are no recent announcements broadcasted for you.</p>
          </div>
        ) : (
          announcements.map((a) => (
            <div key={a.id} className="card" style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--text-main)' }}>{a.title}</h3>
                  <div style={{ display: 'flex', gap: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.25rem', alignItems: 'center' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Calendar size={14} />
                      {new Date(a.created_at).toLocaleDateString(undefined, { dateStyle: 'long' })}
                    </span>
                    {canPublish && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Eye size={14} /> Visible to: 
                        {a.visible_to_students === 1 && <span className="badge badge-success">Students</span>}
                        {a.visible_to_teachers === 1 && <span className="badge badge-warning">Teachers</span>}
                        {a.visible_to_parents === 1 && <span className="badge badge-secondary">Parents</span>}
                      </span>
                    )}
                  </div>
                </div>
                {canPublish && (
                  <button 
                    className="btn btn-outline" 
                    style={{ color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.2)', padding: '0.5rem' }} 
                    onClick={() => handleDelete(a.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
              <p style={{ whiteSpace: 'pre-wrap', color: '#334155', lineHeight: '1.6', fontSize: '0.95rem' }}>{a.content}</p>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="modal">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <h3>Create Announcement</h3>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label>Notice Title</label>
                <input
                  type="text"
                  placeholder="e.g. Tomorrow is a Holiday / Exam Postponed"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Content Description</label>
                <textarea
                  placeholder="Write the detailed announcement context here..."
                  rows={6}
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  required
                  style={{ fontFamily: 'inherit', padding: '0.75rem', fontSize: '0.875rem' }}
                />
              </div>

              <div className="form-group" style={{ gap: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Users size={16} /> Target Audience</label>
                <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={form.visible_to_students}
                      onChange={(e) => setForm({ ...form, visible_to_students: e.target.checked })}
                      style={{ width: 'auto' }}
                    />
                    Students
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={form.visible_to_teachers}
                      onChange={(e) => setForm({ ...form, visible_to_teachers: e.target.checked })}
                      style={{ width: 'auto' }}
                    />
                    Teachers
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={form.visible_to_parents}
                      onChange={(e) => setForm({ ...form, visible_to_parents: e.target.checked })}
                      style={{ width: 'auto' }}
                    />
                    Parents
                  </label>
                </div>
              </div>

              <div className="modal-actions" style={{ marginTop: '2.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Publishing...' : 'Publish Notice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
