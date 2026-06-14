import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { GraduationCap, Save, FileText } from 'lucide-react'

interface Exam {
  id: number;
  name: string;
  academic_year: string;
  course_id: number;
}

interface Subject {
  id: number;
  name: string;
  code: string;
}

interface MarkRecord {
  student_id: number;
  student_name: string;
  roll_number: string;
  marks_obtained: number;
  max_marks: number;
  grade: string;
}

export default function Exams() {
  const [exams, setExams] = useState<Exam[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [selectedExam, setSelectedExam] = useState<number | null>(null)
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null)
  const [marks, setMarks] = useState<MarkRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchExams()
  }, [])

  useEffect(() => {
    if (selectedExam) {
      const exam = exams.find(e => e.id === selectedExam)
      if (exam) fetchSubjects(exam.course_id)
    }
  }, [selectedExam])

  useEffect(() => {
    if (selectedExam && selectedSubject) {
      fetchMarks()
    }
  }, [selectedExam, selectedSubject])

  const fetchExams = async () => {
    const res = await fetch('/exams', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('erp_token')}` }
    })
    const data = await res.json()
    setExams(data.exams)
  }

  const fetchSubjects = async (courseId: number) => {
    const res = await fetch(`/subjects?course_id=${courseId}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('erp_token')}` }
    })
    const data = await res.json()
    setSubjects(data.subjects)
  }

  const fetchMarks = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/exams/${selectedExam}/marks?subject_id=${selectedSubject}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('erp_token')}` }
      })
      const data = await res.json()
      
      if (data.marks.length > 0) {
        setMarks(data.marks)
      } else {
        // Fetch students for this course to initialize marks
        const exam = exams.find(e => e.id === selectedExam)
        const stuRes = await fetch(`/students`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('erp_token')}` }
        })
        const stuData = await stuRes.json()
        setMarks(stuData.students.map((s: any) => ({
          student_id: s.student_id,
          student_name: s.name,
          roll_number: s.roll_number,
          marks_obtained: 0,
          max_marks: 100,
          grade: ''
        })))
      }
    } finally {
      setLoading(false)
    }
  }

  const handleMarkChange = (studentId: number, field: keyof MarkRecord, value: any) => {
    setMarks(prev => prev.map(m => m.student_id === studentId ? { ...m, [field]: value } : m))
  }

  const handleSaveMarks = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/exams/${selectedExam}/marks`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('erp_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subject_id: selectedSubject,
          records: marks
        })
      })
      if (res.ok) alert('Marks saved successfully')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Layout>
      <div className="page-header">
        <h1>Exams & Marks Entry</h1>
      </div>

      <div className="filters card">
        <div className="input-group" style={{ width: '300px', marginBottom: 0 }}>
          <label>Select Exam</label>
          <select value={selectedExam || ''} onChange={(e) => setSelectedExam(parseInt(e.target.value))}>
            <option value="">Choose Exam</option>
            {exams.map(e => <option key={e.id} value={e.id}>{e.name} ({e.academic_year})</option>)}
          </select>
        </div>
        {selectedExam && (
          <div className="input-group" style={{ width: '300px', marginBottom: 0 }}>
            <label>Select Subject</label>
            <select value={selectedSubject || ''} onChange={(e) => setSelectedSubject(parseInt(e.target.value))}>
              <option value="">Choose Subject</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
            </select>
          </div>
        )}
      </div>

      <div className="card">
        {!selectedExam || !selectedSubject ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>
            <GraduationCap size={48} style={{ marginBottom: '1rem', opacity: 0.2 }} />
            <p>Please select an exam and subject to enter marks.</p>
          </div>
        ) : loading ? <p>Loading marks entry sheet...</p> : (
          <>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Roll No</th>
                  <th>Student Name</th>
                  <th style={{ width: '150px' }}>Marks Obtained</th>
                  <th style={{ width: '150px' }}>Max Marks</th>
                  <th style={{ width: '100px' }}>Grade</th>
                </tr>
              </thead>
              <tbody>
                {marks.map(m => (
                  <tr key={m.student_id}>
                    <td>{m.roll_number}</td>
                    <td>{m.student_name}</td>
                    <td>
                      <input 
                        type="number" 
                        value={m.marks_obtained} 
                        onChange={(e) => handleMarkChange(m.student_id, 'marks_obtained', parseFloat(e.target.value))}
                        style={{ width: '100%', padding: '0.4rem' }}
                      />
                    </td>
                    <td>
                      <input 
                        type="number" 
                        value={m.max_marks} 
                        onChange={(e) => handleMarkChange(m.student_id, 'max_marks', parseFloat(e.target.value))}
                        style={{ width: '100%', padding: '0.4rem' }}
                      />
                    </td>
                    <td>
                      <input 
                        type="text" 
                        value={m.grade} 
                        onChange={(e) => handleMarkChange(m.student_id, 'grade', e.target.value)}
                        placeholder="A+"
                        style={{ width: '100%', padding: '0.4rem' }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
              <button className="btn btn-primary" onClick={handleSaveMarks} disabled={saving}>
                <Save size={18} style={{ marginRight: '0.5rem' }} />
                {saving ? 'Saving...' : 'Save Marks'}
              </button>
            </div>
          </>
        )}
      </div>
    </Layout>
  )
}
