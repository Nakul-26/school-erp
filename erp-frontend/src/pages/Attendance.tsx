import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { Check, X, Clock, FileBarChart } from 'lucide-react'

interface Section {
  id: number;
  name: string;
  course_name: string;
}

interface Student {
  id: number;
  name: string;
  roll_number: string;
  status: 'present' | 'absent' | 'late' | 'excused' | null;
}

interface AttendanceStat {
  student_id: number;
  name: string;
  roll_number: string;
  total_days: number;
  present_days: number;
  percentage: string;
}

export default function Attendance() {
  const [activeTab, setActiveTab] = useState<'mark' | 'reports'>('mark')
  const [sections, setSections] = useState<Section[]>([])
  const [sectionId, setSectionId] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [students, setStudents] = useState<Student[]>([])
  const [stats, setStats] = useState<AttendanceStat[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchSections()
  }, [])

  useEffect(() => {
    if (sectionId) {
      if (activeTab === 'mark') fetchAttendance()
      else fetchStats()
    }
  }, [sectionId, date, activeTab])

  const fetchSections = async () => {
    const res = await fetch('/students/sections', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('erp_token')}` }
    })
    const data = await res.json()
    setSections(data.sections)
    if (data.sections.length > 0) setSectionId(data.sections[0].id.toString())
  }

  const fetchAttendance = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/attendance?section_id=${sectionId}&date=${date}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('erp_token')}` }
      })
      const data = await res.json()
      setStudents(data.students)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/attendance/stats?section_id=${sectionId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('erp_token')}` }
      })
      const data = await res.json()
      setStats(data.stats)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = (studentId: number, status: 'present' | 'absent' | 'late' | 'excused') => {
    setStudents(prev => prev.map(s => s.id === studentId ? { ...s, status } : s))
  }

  const handleBulkSave = async () => {
    setSaving(true)
    try {
      const records = students.map(s => ({ student_id: s.id, status: s.status || 'present' }))
      const res = await fetch('/attendance/bulk', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('erp_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ section_id: parseInt(sectionId), date, records })
      })
      if (res.ok) alert('Attendance saved successfully')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Layout>
      <div className="page-header">
        <h1>Attendance Tracking</h1>
      </div>

      <div className="tabs" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', borderBottom: '1px solid #ddd' }}>
        <button 
          onClick={() => setActiveTab('mark')}
          style={{ padding: '0.75rem 1rem', border: 'none', background: 'none', borderBottom: activeTab === 'mark' ? '2px solid var(--primary)' : 'none', cursor: 'pointer', fontWeight: activeTab === 'mark' ? 'bold' : 'normal' }}
        >
          Mark Daily Attendance
        </button>
        <button 
          onClick={() => setActiveTab('reports')}
          style={{ padding: '0.75rem 1rem', border: 'none', background: 'none', borderBottom: activeTab === 'reports' ? '2px solid var(--primary)' : 'none', cursor: 'pointer', fontWeight: activeTab === 'reports' ? 'bold' : 'normal' }}
        >
          Attendance Reports
        </button>
      </div>

      <div className="filters card">
        <div className="input-group" style={{ width: '300px', marginBottom: 0 }}>
          <label>Select Section</label>
          <select value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
            {sections.map(s => <option key={s.id} value={s.id}>{s.course_name} - {s.name}</option>)}
          </select>
        </div>
        {activeTab === 'mark' && (
          <div className="input-group" style={{ width: '200px', marginBottom: 0 }}>
            <label>Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        )}
      </div>

      <div className="card">
        {loading ? <p>Loading...</p> : (
          <>
            {activeTab === 'mark' ? (
              <>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Roll No</th>
                      <th>Student Name</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map(s => (
                      <tr key={s.id}>
                        <td>{s.roll_number}</td>
                        <td>{s.name}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button 
                              className={`btn btn-sm ${s.status === 'present' ? 'btn-success' : 'btn-outline'}`}
                              onClick={() => handleStatusChange(s.id, 'present')}
                            >
                              <Check size={16} /> Present
                            </button>
                            <button 
                              className={`btn btn-sm ${s.status === 'absent' ? 'btn-danger' : 'btn-outline'}`}
                              onClick={() => handleStatusChange(s.id, 'absent')}
                            >
                              <X size={16} /> Absent
                            </button>
                            <button 
                              className={`btn btn-sm ${s.status === 'late' ? 'btn-warning' : 'btn-outline'}`}
                              onClick={() => handleStatusChange(s.id, 'late')}
                            >
                              <Clock size={16} /> Late
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
                  <button className="btn btn-primary" onClick={handleBulkSave} disabled={saving}>
                    {saving ? 'Saving...' : 'Save Daily Attendance'}
                  </button>
                </div>
              </>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Roll No</th>
                    <th>Student Name</th>
                    <th>Total Days</th>
                    <th>Days Present</th>
                    <th>Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.map(s => (
                    <tr key={s.student_id}>
                      <td>{s.roll_number}</td>
                      <td>{s.name}</td>
                      <td>{s.total_days}</td>
                      <td>{s.present_days}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <strong>{s.percentage}%</strong>
                          <div style={{ flex: 1, height: '8px', background: '#eee', borderRadius: '4px', maxWidth: '100px' }}>
                            <div style={{ height: '100%', background: parseFloat(s.percentage) < 75 ? 'var(--danger)' : 'var(--success)', width: `${s.percentage}%`, borderRadius: '4px' }}></div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>
    </Layout>
  )
}
