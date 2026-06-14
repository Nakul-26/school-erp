import Layout from '../components/Layout'
import { Info } from 'lucide-react'

export default function Attendance() {
  return (
    <Layout>
      <div className="page-header">
        <h1>Attendance Tracking</h1>
      </div>
      <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
        <Info size={48} style={{ color: 'var(--primary)', marginBottom: '1rem', opacity: 0.5 }} />
        <h3>Module Under Construction</h3>
        <p style={{ color: '#666', maxWidth: '400px', margin: '0.5rem auto' }}>
          We are currently refactoring the Attendance module to support the new multi-tenant foundation. 
          This feature will be available in the next sprint.
        </p>
      </div>
    </Layout>
  )
}
