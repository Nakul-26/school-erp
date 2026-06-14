import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { Plus, BookOpen, Layers, BookCheck } from 'lucide-react'

interface Course {
  id: number;
  name: string;
  duration_years: number;
}

interface Section {
  id: number;
  course_id: number;
  name: string;
  year: number;
  academic_year: string;
  course_name?: string;
}

interface Subject {
  id: number;
  name: string;
  code: string;
  course_id: number;
  semester?: number;
}

export default function Classes() {
  const [activeTab, setActiveTab] = useState<'courses' | 'sections' | 'subjects'>('courses')
  const [courses, setCourses] = useState<Course[]>([])
  const [sections, setSections] = useState<Section[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(false)
  
  const [showModal, setShowModal] = useState(false)
  const [courseForm, setCourseForm] = useState({ name: '', duration_years: 3 })
  const [sectionForm, setSectionForm] = useState({ course_id: '', name: '', year: 1, academic_year: '2024-25' })
  const [subjectForm, setSubjectForm] = useState({ course_id: '', name: '', code: '', semester: 1 })

  useEffect(() => {
    fetchData()
  }, [activeTab])

  const fetchData = async () => {
    setLoading(true)
    const token = localStorage.getItem('erp_token')
    const headers = { 'Authorization': `Bearer ${token}` }
    
    try {
      if (activeTab === 'courses') {
        const res = await fetch('/students/courses', { headers })
        const data = await res.json()
        setCourses(data.courses)
      } else if (activeTab === 'sections') {
        const res = await fetch('/students/sections', { headers })
        const data = await res.json()
        setSections(data.sections)
        // Also fetch courses for the dropdown
        const cRes = await fetch('/students/courses', { headers })
        const cData = await cRes.json()
        setCourses(cData.courses)
      } else {
        const res = await fetch('/subjects', { headers })
        const data = await res.json()
        setSubjects(data.subjects)
        // Also fetch courses for the dropdown
        const cRes = await fetch('/students/courses', { headers })
        const cData = await cRes.json()
        setCourses(cData.courses)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await fetch('/students/courses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('erp_token')}` },
      body: JSON.stringify(courseForm)
    })
    if (res.ok) { setShowModal(false); fetchData(); }
  }

  const handleAddSection = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await fetch('/students/sections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('erp_token')}` },
      body: JSON.stringify({ ...sectionForm, course_id: parseInt(sectionForm.course_id) })
    })
    if (res.ok) { setShowModal(false); fetchData(); }
  }

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await fetch('/subjects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('erp_token')}` },
      body: JSON.stringify({ ...subjectForm, course_id: parseInt(subjectForm.course_id) })
    })
    if (res.ok) { setShowModal(false); fetchData(); }
  }

  return (
    <Layout>
      <div className="page-header">
        <h1>Manage Classes & Courses</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} /> Add {activeTab === 'courses' ? 'Course' : activeTab === 'sections' ? 'Section' : 'Subject'}
        </button>
      </div>

      <div className="tabs" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', borderBottom: '1px solid #ddd' }}>
        <button 
          onClick={() => setActiveTab('courses')}
          className={`tab-btn ${activeTab === 'courses' ? 'active' : ''}`}
        >
          Courses
        </button>
        <button 
          onClick={() => setActiveTab('sections')}
          className={`tab-btn ${activeTab === 'sections' ? 'active' : ''}`}
        >
          Sections (Classes)
        </button>
        <button 
          onClick={() => setActiveTab('subjects')}
          className={`tab-btn ${activeTab === 'subjects' ? 'active' : ''}`}
        >
          Subjects
        </button>
      </div>

      <div className="card">
        {loading ? <p>Loading...</p> : (
          <>
            {activeTab === 'courses' && (
              <table className="data-table">
                <thead><tr><th>Course Name</th><th>Duration (Years)</th></tr></thead>
                <tbody>
                  {courses.map(c => <tr key={c.id}><td>{c.name}</td><td>{c.duration_years} Years</td></tr>)}
                </tbody>
              </table>
            )}

            {activeTab === 'sections' && (
              <table className="data-table">
                <thead><tr><th>Section Name</th><th>Course</th><th>Year</th><th>Academic Year</th></tr></thead>
                <tbody>
                  {sections.map(s => <tr key={s.id}><td>{s.name}</td><td>{s.course_name}</td><td>Year {s.year}</td><td>{s.academic_year}</td></tr>)}
                </tbody>
              </table>
            )}

            {activeTab === 'subjects' && (
              <table className="data-table">
                <thead><tr><th>Subject Name</th><th>Code</th><th>Course</th><th>Semester</th></tr></thead>
                <tbody>
                  {subjects.map(s => <tr key={s.id}><td>{s.name}</td><td>{s.code}</td><td>{courses.find(c => c.id === s.course_id)?.name || s.course_id}</td><td>Sem {s.semester}</td></tr>)}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Add New {activeTab === 'courses' ? 'Course' : activeTab === 'sections' ? 'Section' : 'Subject'}</h3>
            {activeTab === 'courses' && (
              <form onSubmit={handleAddCourse}>
                <div className="input-group">
                  <label>Course Name</label>
                  <input required value={courseForm.name} onChange={e => setCourseForm({...courseForm, name: e.target.value})} placeholder="e.g., Computer Science" />
                </div>
                <div className="input-group">
                  <label>Duration (Years)</label>
                  <input type="number" required value={courseForm.duration_years} onChange={e => setCourseForm({...courseForm, duration_years: parseInt(e.target.value)})} />
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Save Course</button>
                </div>
              </form>
            )}

            {activeTab === 'sections' && (
              <form onSubmit={handleAddSection}>
                <div className="input-group">
                  <label>Section Name</label>
                  <input required value={sectionForm.name} onChange={e => setSectionForm({...sectionForm, name: e.target.value})} placeholder="e.g., Section A" />
                </div>
                <div className="input-group">
                  <label>Course</label>
                  <select required value={sectionForm.course_id} onChange={e => setSectionForm({...sectionForm, course_id: e.target.value})}>
                    <option value="">Select Course</option>
                    {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="input-group">
                  <label>Year</label>
                  <input type="number" required value={sectionForm.year} onChange={e => setSectionForm({...sectionForm, year: parseInt(e.target.value)})} />
                </div>
                <div className="input-group">
                  <label>Academic Year</label>
                  <input required value={sectionForm.academic_year} onChange={e => setSectionForm({...sectionForm, academic_year: e.target.value})} placeholder="2024-25" />
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Save Section</button>
                </div>
              </form>
            )}

            {activeTab === 'subjects' && (
              <form onSubmit={handleAddSubject}>
                <div className="input-group">
                  <label>Subject Name</label>
                  <input required value={subjectForm.name} onChange={e => setSubjectForm({...subjectForm, name: e.target.value})} />
                </div>
                <div className="input-group">
                  <label>Subject Code</label>
                  <input required value={subjectForm.code} onChange={e => setSubjectForm({...subjectForm, code: e.target.value})} placeholder="CS101" />
                </div>
                <div className="input-group">
                  <label>Course</label>
                  <select required value={subjectForm.course_id} onChange={e => setSubjectForm({...subjectForm, course_id: e.target.value})}>
                    <option value="">Select Course</option>
                    {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="input-group">
                  <label>Semester</label>
                  <input type="number" required value={subjectForm.semester} onChange={e => setSubjectForm({...subjectForm, semester: parseInt(e.target.value)})} />
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Save Subject</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <style>{`
        .tab-btn {
          padding: 0.75rem 1rem;
          border: none;
          background: none;
          cursor: pointer;
          font-weight: 500;
          color: #666;
        }
        .tab-btn.active {
          border-bottom: 2px solid var(--primary);
          color: var(--primary);
        }
      `}</style>
    </Layout>
  )
}
