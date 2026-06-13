import { useEffect, useState } from 'react'
import Layout from '../components/Layout'

interface Student {
  id: string
  first_name: string
  last_name: string
  enrollment_number: string
}

interface Subject {
  id: string
  name: string
  code: string
}

export default function Attendance() {
  const [students, setStudents] = useState<Student[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [selectedSubject, setSelectedSubject] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [attendance, setAttendance] = useState<Record<string, 'PRESENT' | 'ABSENT'>>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchSubjects()
  }, [])

  const fetchSubjects = async () => {
    const token = localStorage.getItem('erp_token')
    const res = await fetch('/api/subjects', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    const data = await res.json()
    setSubjects(data)
    if (data.length > 0) setSelectedSubject(data[0].id)
  }

  const fetchStudents = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('erp_token')
      const res = await fetch('/api/students', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      setStudents(data)
      // Initialize attendance
      const initial: Record<string, 'PRESENT' | 'ABSENT'> = {}
      data.forEach((s: Student) => initial[s.id] = 'PRESENT')
      setAttendance(initial)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const token = localStorage.getItem('erp_token')
      const user = JSON.parse(localStorage.getItem('erp_user') || '{}')
      
      const records = Object.entries(attendance).map(([studentId, status]) => ({
        studentId,
        status
      }))

      await fetch('/api/attendance/bulk', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          date,
          subjectId: selectedSubject,
          teacherId: user.id,
          records
        })
      })
      alert('Attendance saved!')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Layout>
      <div className="card">
        <h2>Mark Attendance</h2>
        <div style={{ display: 'flex', gap: '1rem', margin: '1rem 0' }}>
          <div className="input-group">
            <label>Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="input-group">
            <label>Subject</label>
            <select 
              value={selectedSubject} 
              onChange={(e) => setSelectedSubject(e.target.value)}
              style={{ padding: '0.75rem', borderRadius: '4px', border: '1px solid #ddd', width: '200px' }}
            >
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
            </select>
          </div>
          <div style={{ alignSelf: 'flex-end', marginBottom: '1rem' }}>
            <button className="btn btn-primary" onClick={fetchStudents} disabled={loading}>
              {loading ? 'Loading...' : 'Fetch Students'}
            </button>
          </div>
        </div>

        {students.length > 0 && (
          <>
            <table>
              <thead>
                <tr>
                  <th>Enrollment</th>
                  <th>Name</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {students.map(s => (
                  <tr key={s.id}>
                    <td>{s.enrollment_number}</td>
                    <td>{s.first_name} {s.last_name}</td>
                    <td>
                      <select 
                        value={attendance[s.id]} 
                        onChange={(e) => setAttendance({...attendance, [s.id]: e.target.value as any})}
                        style={{ padding: '0.4rem' }}
                      >
                        <option value="PRESENT">Present</option>
                        <option value="ABSENT">Absent</option>
                        <option value="LATE">Late</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ marginTop: '1rem', textAlign: 'right' }}>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Attendance'}
              </button>
            </div>
          </>
        )}
      </div>
    </Layout>
  )
}
