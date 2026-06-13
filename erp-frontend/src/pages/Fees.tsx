import { useEffect, useState } from 'react'
import Layout from '../components/Layout'

interface Fee {
  id: string
  name: string
  amount_due: number
  due_date: string
  status: string
  first_name: string
  last_name: string
  enrollment_number: string
}

export default function Fees() {
  const [fees, setFees] = useState<Fee[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchFees()
  }, [])

  const fetchFees = async () => {
    try {
      const token = localStorage.getItem('erp_token')
      const res = await fetch('/api/fees', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      setFees(data)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout>
      <div className="card">
        <h2>Fee Management</h2>
        {loading ? <p>Loading...</p> : (
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>Fee Name</th>
                <th>Amount</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {fees.map(f => (
                <tr key={f.id}>
                  <td>{f.first_name} {f.last_name} ({f.enrollment_number})</td>
                  <td>{f.name}</td>
                  <td>${f.amount_due}</td>
                  <td>{f.due_date}</td>
                  <td>
                    <span style={{ 
                      padding: '0.25rem 0.5rem', 
                      borderRadius: '4px', 
                      fontSize: '0.75rem',
                      background: f.status === 'PAID' ? '#e6fffa' : '#fff5f5',
                      color: f.status === 'PAID' ? '#2c7a7b' : '#c53030'
                    }}>
                      {f.status}
                    </span>
                  </td>
                  <td>
                    <button className="btn" style={{ padding: '0.25rem 0.5rem' }}>Record Payment</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  )
}
