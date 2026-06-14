import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { useAuth } from '../contexts/AuthContext'
import { Users, BookOpen, Clock, TrendingUp, LogOut } from 'lucide-react'

export default function Dashboard() {
  const [stats, setStats] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const { user, logout, token } = useAuth()

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const res = await fetch('/dashboard/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      setStats(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout>
      <div className="page-header">
        <h1>Dashboard</h1>
        <button className="btn btn-outline" onClick={logout}>
          <LogOut size={18} /> Logout
        </button>
      </div>

      <div className="welcome-section card" style={{ background: 'var(--primary)', color: 'white', marginBottom: '2rem' }}>
        <h2>Welcome back, {user?.name || user?.email}!</h2>
        <p>You are logged in as <strong>{user?.role}</strong>. Here is your overview for today.</p>
      </div>

      {loading ? <p>Loading overview...</p> : (
        <div className="stats-grid">
          {user?.role === 'admin' && (
            <>
              <div className="stat-card card">
                <div className="icon" style={{ background: '#e6f7ff', color: '#1890ff' }}><Users size={24} /></div>
                <div className="info">
                  <h3>Total Students</h3>
                  <div className="value">{stats.totalStudents}</div>
                </div>
              </div>
              <div className="stat-card card">
                <div className="icon" style={{ background: '#f6ffed', color: '#52c41a' }}><BookOpen size={24} /></div>
                <div className="info">
                  <h3>Total Teachers</h3>
                  <div className="value">{stats.totalTeachers}</div>
                </div>
              </div>
              <div className="stat-card card">
                <div className="icon" style={{ background: '#fff7e6', color: '#fa8c16' }}><TrendingUp size={24} /></div>
                <div className="info">
                  <h3>Total Sections</h3>
                  <div className="value">{stats.totalSections}</div>
                </div>
              </div>
            </>
          )}

          {user?.role === 'student' && (
            <>
              <div className="stat-card card">
                <div className="icon" style={{ background: '#f9f0ff', color: '#722ed1' }}><Clock size={24} /></div>
                <div className="info">
                  <h3>Attendance</h3>
                  <div className="value">{stats.attendancePercentage}%</div>
                </div>
              </div>
              <div className="stat-card card">
                <div className="icon" style={{ background: '#e6fffb', color: '#13c2c2' }}><TrendingUp size={24} /></div>
                <div className="info">
                  <h3>GPA / Grades</h3>
                  <div className="value">A+</div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <style>{`
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 1.5rem;
        }
        .stat-card {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          padding: 1.5rem;
        }
        .stat-card .icon {
          width: 50px;
          height: 50px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .stat-card .info h3 {
          margin: 0;
          font-size: 0.875rem;
          color: #666;
        }
        .stat-card .info .value {
          font-size: 1.5rem;
          font-weight: bold;
          margin-top: 0.25rem;
        }
      `}</style>
    </Layout>
  )
}
