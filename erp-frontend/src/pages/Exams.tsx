import { useEffect, useState } from 'react'
import Layout from '../components/Layout'

interface Exam {
  id: string
  name: string
  date: string
  batch_id: string
}

export default function Exams() {
  const [exams, setExams] = useState<Exam[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchExams()
  }, [])

  const fetchExams = async () => {
    try {
      const token = localStorage.getItem('erp_token')
      const res = await fetch('/api/exams', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      setExams(data)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>Exams</h2>
          <button className="btn btn-primary">+ Create Exam</button>
        </div>
        {loading ? <p>Loading...</p> : (
          <table>
            <thead>
              <tr>
                <th>Exam Name</th>
                <th>Date</th>
                <th>Batch</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {exams.map(e => (
                <tr key={e.id}>
                  <td>{e.name}</td>
                  <td>{e.date}</td>
                  <td>{e.batch_id}</td>
                  <td>
                    <button className="btn" style={{ padding: '0.25rem 0.5rem' }}>Enter Marks</button>
                  </td>
                </tr>
              ))}
              {exams.length === 0 && (
                <tr><td colSpan={4} style={{ textAlign: 'center' }}>No exams scheduled.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  )
}
