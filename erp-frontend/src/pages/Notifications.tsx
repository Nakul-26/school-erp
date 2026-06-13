import { useEffect, useState } from 'react'
import Layout from '../components/Layout'

interface Announcement {
  id: string
  title: string
  content: string
  created_at: string
}

export default function Notifications() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAnnouncements()
  }, [])

  const fetchAnnouncements = async () => {
    try {
      const token = localStorage.getItem('erp_token')
      const res = await fetch('/api/comms/announcements', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      setAnnouncements(data)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout>
      <div className="card">
        <h2>Announcements</h2>
        {loading ? <p>Loading...</p> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
            {announcements.map(a => (
              <div key={a.id} className="card" style={{ border: '1px solid #eee', boxShadow: 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <h3>{a.title}</h3>
                  <small style={{ color: '#888' }}>{new Date(a.created_at).toLocaleDateString()}</small>
                </div>
                <p>{a.content}</p>
              </div>
            ))}
            {announcements.length === 0 && (
              <p style={{ textAlign: 'center', color: '#888' }}>No announcements yet.</p>
            )}
          </div>
        )}
      </div>
    </Layout>
  )
}
