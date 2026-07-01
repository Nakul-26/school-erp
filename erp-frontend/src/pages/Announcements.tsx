import React, { useEffect, useState } from 'react';
import { PageGuidance } from '../components/PageGuidance';
import Layout from '../components/Layout';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Megaphone, Plus, Trash2, Calendar, Users, Eye, Paperclip, AlertCircle, FileText } from 'lucide-react';

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

const CATEGORIES = ['All', 'General', 'Academic', 'Holiday', 'Event', 'Urgent'];

export default function Announcements() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  
  const [form, setForm] = useState({
    title: '',
    content: '',
    category: 'General',
    attachmentUrl: '',
    attachmentName: '',
    visible_to_students: true,
    visible_to_teachers: true,
    visible_to_parents: true
  });

  const userRoles = user?.roles || (user?.role ? [user.role] : []);
  const canPublish = userRoles.some(r => 
    ['super_admin', 'Super Admin', 'admin', 'Admin', 'Principal', 'HOD', 'hod', 'Teacher', 'teacher', 'Accountant', 'accountant'].includes(r)
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

  const getParsedContent = (content: string) => {
    try {
      if (content.trim().startsWith('{') && content.trim().endsWith('}')) {
        const parsed = JSON.parse(content);
        return {
          text: parsed.text || '',
          category: parsed.category || 'General',
          attachmentUrl: parsed.attachmentUrl || '',
          attachmentName: parsed.attachmentName || ''
        };
      }
    } catch (e) {
      // fallback
    }
    return {
      text: content,
      category: 'General',
      attachmentUrl: '',
      attachmentName: ''
    };
  };

  const getCategoryBadge = (category: string) => {
    switch (category.toLowerCase()) {
      case 'urgent': return { bg: '#fee2e2', color: '#991b1b', label: 'Urgent' };
      case 'holiday': return { bg: '#fef3c7', color: '#92400e', label: 'Holiday' };
      case 'event': return { bg: '#d1fae5', color: '#065f46', label: 'Event' };
      case 'academic': return { bg: '#e0e7ff', color: '#3730a3', label: 'Academic' };
      default: return { bg: '#f1f5f9', color: '#475569', label: 'General' };
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.content) return alert('Title and content are required');

    try {
      setSaving(true);
      
      const serializedContent = JSON.stringify({
        text: form.content,
        category: form.category,
        attachmentUrl: form.attachmentUrl,
        attachmentName: form.attachmentName || (form.attachmentUrl ? 'View Attachment' : '')
      });

      const payload = {
        title: form.title,
        content: serializedContent,
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
        category: 'General',
        attachmentUrl: '',
        attachmentName: '',
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

  const filteredAnnouncements = announcements.filter(a => {
    if (selectedCategory === 'All') return true;
    const parsed = getParsedContent(a.content);
    return parsed.category.toLowerCase() === selectedCategory.toLowerCase();
  });

  return (
    <Layout>
      <PageGuidance
        title="Notice Board Circulars"
        description="Use this page to write and broadcast official circulars and notice board announcements to students, teachers, or parents with categories and attachment links."
        steps={["Click \"New Circular Notice\" to open the editor.","Select a category (Holiday, Academic, Event, etc.) and add optional attachments.","Filter existing notices using the category tabs at the top."]}
      />
      <div className="page-header">
        <div>
          <h2>Notice Board & Circulars</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Broadcasting important institution notices, official circulars, and holiday events
          </p>
        </div>
        {canPublish && (
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={18} /> New Circular Notice
          </button>
        )}
      </div>

      {/* Category Tabs */}
      <div className="page-tabs" style={{ marginBottom: '1.5rem' }}>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            className={`page-tab ${selectedCategory === cat ? 'active' : ''}`}
            onClick={() => setSelectedCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="announcements-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {loading ? <p>Loading notices...</p> : filteredAnnouncements.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <Megaphone size={40} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
            <h3 style={{ color: 'var(--text-main)', marginBottom: '0.5rem' }}>No Notices Found</h3>
            <p style={{ color: 'var(--text-muted)' }}>There are no recent announcements broadcasted in this category.</p>
          </div>
        ) : (
          filteredAnnouncements.map((a) => {
            const parsed = getParsedContent(a.content);
            const badge = getCategoryBadge(parsed.category);
            return (
              <div key={a.id} className="card" style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <span className="badge" style={{ backgroundColor: badge.bg, color: badge.color, fontWeight: 700 }}>
                        {badge.label}
                      </span>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>{a.title}</h3>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.5rem', alignItems: 'center' }}>
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
                      title="Delete notice"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
                <p style={{ whiteSpace: 'pre-wrap', color: '#334155', lineHeight: '1.6', fontSize: '0.95rem', margin: 0 }}>{parsed.text}</p>
                
                {parsed.attachmentUrl && (
                  <div style={{ borderTop: '1px dashed var(--border)', paddingTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <Paperclip size={14} style={{ color: 'var(--primary)' }} />
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Attachment:</span>
                    <a 
                      href={parsed.attachmentUrl} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      style={{ fontSize: '0.825rem', color: 'var(--primary)', fontWeight: 600, textDecoration: 'underline' }}
                    >
                      {parsed.attachmentName || 'View Circular File / PDF'}
                    </a>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {showModal && (
        <div className="modal">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <h3>Create Official Circular Notice</h3>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label>Notice Title</label>
                <input
                  type="text"
                  placeholder="e.g. Mid-Term Examination Schedule / Eid Holiday Notice"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label>Circular Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem' }}
                  >
                    <option value="General">General Notice</option>
                    <option value="Academic">Academic / Syllabus / Exams</option>
                    <option value="Holiday">Holidays & Closures</option>
                    <option value="Event">School Events & Sports</option>
                    <option value="Urgent">Urgent / Emergency Alert</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Content Description</label>
                <textarea
                  placeholder="Write the detailed circular announcement context here..."
                  rows={5}
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  required
                  style={{ fontFamily: 'inherit', padding: '0.75rem', fontSize: '0.875rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Attachment URL (Optional)</label>
                  <input
                    type="text"
                    placeholder="https://example.com/circular.pdf"
                    value={form.attachmentUrl}
                    onChange={(e) => setForm({ ...form, attachmentUrl: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Attachment Display Name (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Exam Schedule PDF"
                    value={form.attachmentName}
                    onChange={(e) => setForm({ ...form, attachmentName: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group" style={{ gap: '1rem', marginTop: '1rem' }}>
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

              <div className="modal-actions" style={{ marginTop: '2rem' }}>
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
