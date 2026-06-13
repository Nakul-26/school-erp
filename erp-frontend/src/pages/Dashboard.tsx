import Layout from '../components/Layout'

export default function Dashboard() {
  const userStr = localStorage.getItem('erp_user')
  const user = userStr ? JSON.parse(userStr) : null

  return (
    <Layout>
      <div className="card">
        <h1>Dashboard</h1>
        {user && (
          <div style={{ marginTop: '1rem' }}>
            <p>Welcome, <strong>{user.email}</strong>!</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '2rem' }}>
              <div className="card" style={{ border: '1px solid #eee', boxShadow: 'none' }}>
                <h3>Total Students</h3>
                <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>1</p>
              </div>
              <div className="card" style={{ border: '1px solid #eee', boxShadow: 'none' }}>
                <h3>Active Batches</h3>
                <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>1</p>
              </div>
              <div className="card" style={{ border: '1px solid #eee', boxShadow: 'none' }}>
                <h3>Attendance Today</h3>
                <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>0%</p>
              </div>
            </div>
          </div>
        )}
        <button 
          className="btn" 
          style={{ marginTop: '2rem' }}
          onClick={() => {
            localStorage.removeItem('erp_token')
            localStorage.removeItem('erp_user')
            window.location.href = '/login'
          }}
        >
          Logout
        </button>
      </div>
    </Layout>
  )
}
