import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { Plus, Search, Filter } from 'lucide-react'

interface Student {
  student_id: number;
  roll_number: string;
  admission_number: string;
  status: string;
  name: string;
  email: string;
  phone: string;
  section_name: string;
  year: number;
  academic_year: string;
  course_name: string;
}

interface Section {
  id: number;
  name: string;
  year: number;
  academic_year: string;
  course_name: string;
}

export default function Students() {
  const [students, setStudents] = useState<Student[]>([])
  const [sections, setSections] = useState<Section[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [search, setSearch] = useState('')
  const [sectionId, setSectionId] = useState('')

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: 'password123',
    roll_number: '',
    section_id: '',
    phone: '',
  })

  useEffect(() => {
    fetchData()
  }, [sectionId])

  const fetchData = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('erp_token')
      const headers = { 'Authorization': `Bearer ${token}` }
      
      const secRes = await fetch('/students/sections', { headers })
      const secData = await secRes.json()
      setSections(secData.sections)

      const query = new URLSearchParams()
      if (sectionId) query.append('section_id', sectionId)
      if (search) query.append('search', search)

      const stuRes = await fetch(`/students?${query.toString()}`, { headers })
      const stuData = await stuRes.json()
      setStudents(stuData.students)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch('/students', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('erp_token')}`
        },
        body: JSON.stringify({
          ...formData,
          section_id: formData.section_id ? parseInt(formData.section_id) : undefined
        })
      })
      if (res.ok) {
        setShowAddModal(false)
        fetchData()
        setFormData({ name: '', email: '', password: 'password123', roll_number: '', section_id: '', phone: '' })
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to add student')
      }
    } catch (err) {
      alert('Error adding student')
    }
  }

  return (
    <Layout>
      <div className="page-header">
        <h1>Students</h1>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={18} /> Add Student
        </button>
      </div>

      <div className="filters card">
        <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#666' }} />
            <input 
              type="text" 
              placeholder="Search by name or roll number..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyUp={(e) => e.key === 'Enter' && fetchData()}
              style={{ paddingLeft: '35px' }}
            />
          </div>
        </div>
        <div className="input-group" style={{ width: '250px', marginBottom: 0 }}>
          <select value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
            <option value="">All Sections</option>
            {sections.map(s => (
              <option key={s.id} value={s.id}>{s.course_name} - {s.name} ({s.academic_year})</option>
            ))}
          </select>
        </div>
        <button className="btn" onClick={fetchData}>Filter</button>
      </div>
      
      <div className="card">
        {loading ? (
          <p>Loading students...</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Roll No</th>
                <th>Name</th>
                <th>Course / Section</th>
                <th>Email</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {students.map(s => (
                <tr key={s.student_id}>
                  <td><strong>{s.roll_number}</strong></td>
                  <td>{s.name}</td>
                  <td>
                    <div style={{ fontSize: '0.875rem' }}>{s.course_name || 'Unassigned'}</div>
                    <div style={{ fontSize: '0.75rem', color: '#666' }}>{s.section_name ? `${s.section_name} (${s.academic_year})` : '-'}</div>
                  </td>
                  <td>{s.email}</td>
                  <td>
                    <span className={`badge badge-${s.status === 'active' ? 'success' : 'secondary'}`}>
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))}
              {students.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>No students found.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Add New Student</h3>
            <form onSubmit={handleAddStudent}>
              <div className="input-group">
                <label>Full Name</label>
                <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="input-group">
                <label>Email Address</label>
                <input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
              <div className="input-group">
                <label>Roll Number</label>
                <input required value={formData.roll_number} onChange={e => setFormData({...formData, roll_number: e.target.value})} />
              </div>
              <div className="input-group">
                <label>Section (Optional)</label>
                <select value={formData.section_id} onChange={e => setFormData({...formData, section_id: e.target.value})}>
                  <option value="">Not Assigned</option>
                  {sections.map(s => (
                    <option key={s.id} value={s.id}>{s.course_name} - {s.name}</option>
                  ))}
                </select>
              </div>
              <div className="input-group">
                <label>Phone (Optional)</label>
                <input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Student</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  )
}
