import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { Bell, Megaphone, Send, Mail } from 'lucide-react'

interface Announcement {
  id: number;
  title: string;
  content: string;
  target_role: string;
  created_at: string;
}

export default function Notifications() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    target_role: 'all',
    send_email: false
  })

  const user = JSON.parse(localStorage.getItem('erp_user') || '{}')
  const isAdmin = user.role === 'admin'

  useEffect(() => {
    fetchAnnouncements()
  }, [])

  const fetchAnnouncements = async () => {
    try {
      const res = await fetch('/comms/announcements', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('erp_token')}` }
      })
      const data = await res.json()
      setAnnouncements(data.announcements)
    } finally {
      setLoading(false)
    }
  }

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch('/comms/announcements', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('erp_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })
      if (res.ok) {
        setShowModal(false)
        fetchAnnouncements()
        setFormData({ title: '', content: '', target_role: 'all', send_email: false })
      }
    } catch (err) {
      alert('Error broadcasting announcement')
    }
  }

  return (
    <Layout>
      <div className="page-header">
        <h1>Communications</h1>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Megaphone size={18} /> New Announcement
          </button>
        )}
      </div>

      <div className="card">
        <h2>Announcements</h2>
        {loading ? <p>Loading...</p> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
            {announcements.map(a => (
              <div key={a.id} className="announcement-card card">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <h3 style={{ margin: 0 }}>{a.title}</h3>
                  <small style={{ color: '#888' }}>{new Date(a.created_at).toLocaleString()}</small>
                </div>
                <div style={{ marginBottom: '1rem', color: '#444', lineHeight: '1.5' }}>{a.content}</div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <span className="badge badge-secondary" style={{ textTransform: 'capitalize' }}>
                    Target: {a.target_role}
                  </span>
                </div>
              </div>
            ))}
            {announcements.length === 0 && (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#999' }}>
                <Bell size={48} style={{ opacity: 0.1, marginBottom: '1rem' }} />
                <p>No announcements found.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>New Announcement</h3>
            <form onSubmit={handleBroadcast}>
              <div className="input-group">
                <label>Title</label>
                <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="e.g., Semester Exam Schedule" />
              </div>
              <div className="input-group">
                <label>Content</label>
                <textarea 
                  required 
                  rows={4} 
                  value={formData.content} 
                  onChange={e => setFormData({...formData, content: e.target.value})}
                  placeholder="Type your message here..."
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #ddd' }}
                />
              </div>
              <div className="input-group">
                <label>Target Audience</label>
                <select value={formData.target_role} onChange={e => setFormData({...formData, target_role: e.target.value})}>
                  <option value="all">All Users</option>
                  <option value="student">Students Only</option>
                  <option value="teacher">Teachers Only</option>
                  <option value="parent">Parents Only</option>
                </select>
              </div>
              <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input 
                  type="checkbox" 
                  id="sendEmail" 
                  checked={formData.send_email} 
                  onChange={e => setFormData({...formData, send_email: e.target.checked})} 
                />
                <label htmlFor="sendEmail" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Mail size={16} /> Send Email via Resend
                </label>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">
                  <Send size={18} /> Broadcast
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .announcement-card {
          border: 1px solid #eee;
          box-shadow: none;
          transition: transform 0.2s;
        }
        .announcement-card:hover {
          transform: translateY(-2px);
          border-color: var(--primary);
        }
      `}</style>
    </Layout>
  )
}
