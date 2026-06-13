import { useEffect, useState } from 'react'
import Layout from '../components/Layout'

interface Student {
  id: string
  first_name: string
  last_name: string
  enrollment_number: string
  batch_id: string
}

export default function Students() {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStudents()
  }, [])

  const fetchStudents = async () => {
    try {
      const token = localStorage.getItem('erp_token')
      const res = await fetch('/api/students', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await res.json()
      setStudents(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>Students</h2>
          <button className="btn btn-primary">+ Add Student</button>
        </div>
        
        {loading ? (
          <p>Loading...</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Enrollment</th>
                <th>Name</th>
                <th>Batch</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map(s => (
                <tr key={s.id}>
                  <td>{s.enrollment_number}</td>
                  <td>{s.first_name} {s.last_name}</td>
                  <td>{s.batch_id}</td>
                  <td>
                    <button className="btn" style={{ padding: '0.25rem 0.5rem' }}>Edit</button>
                  </td>
                </tr>
              ))}
              {students.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center' }}>No students found.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  )
}
