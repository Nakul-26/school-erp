import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { api } from '../services/api';
import { Plus, Trash2, Calendar, ClipboardCheck, ArrowLeft, Check, X, ShieldAlert, Award, FileSpreadsheet, Layers } from 'lucide-react';

interface Exam {
  id: string;
  name: string;
  academic_year_id: string;
  course_id: string;
  semester: number;
  start_date: string;
  end_date: string;
  status: 'DRAFT' | 'PUBLISHED' | 'COMPLETED';
  academic_year_name?: string;
  course_name?: string;
  course_code?: string;
}

interface ExamSubject {
  id: string;
  exam_id: string;
  subject_id: string;
  exam_date: string | null;
  start_time: string | null;
  end_time: string | null;
  max_marks: number;
  min_marks: number;
  subject_name?: string;
  subject_code?: string;
}

interface StudentMarkRecord {
  student_id: string;
  student_name: string;
  roll_number: string | null;
  admission_number: string;
  mark_id: string | null;
  marks_obtained: number | null | '';
  max_marks: number | null;
  remarks: string | null;
}

export default function Exams() {
  const [view, setView] = useState<'list' | 'subjects' | 'marks' | 'results'>('list');
  const [exams, setExams] = useState<Exam[]>([]);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [allSubjects, setAllSubjects] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [selectedExamSubject, setSelectedExamSubject] = useState<ExamSubject | null>(null);
  
  // Modals & sublists
  const [examSubjects, setExamSubjects] = useState<ExamSubject[]>([]);
  const [studentMarks, setStudentMarks] = useState<StudentMarkRecord[]>([]);
  const [examResults, setExamResults] = useState<any[]>([]);
  
  const [showExamModal, setShowExamModal] = useState(false);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  
  // Forms
  const [examForm, setExamForm] = useState({
    name: '',
    academic_year_id: '',
    course_id: '',
    semester: 1,
    start_date: '',
    end_date: '',
    status: 'DRAFT' as const
  });
  
  const [subjectForm, setSubjectForm] = useState({
    subject_id: '',
    exam_date: '',
    start_time: '',
    end_time: '',
    max_marks: 100,
    min_marks: 40
  });

  useEffect(() => {
    fetchMetadataAndExams();
  }, []);

  const fetchMetadataAndExams = async () => {
    try {
      setLoading(true);
      const [examsData, yearsData, programsData, subjectsData] = await Promise.all([
        api.get('/exams'),
        api.get('/academic-years'),
        api.get('/programs'),
        api.get('/subjects')
      ]);
      
      setExams(examsData);
      setAcademicYears(yearsData);
      setPrograms(programsData);
      setAllSubjects(subjectsData);
      
      if (yearsData.length > 0) {
        const currentYear = yearsData.find((y: any) => y.is_current) || yearsData[0];
        setExamForm(f => ({ ...f, academic_year_id: currentYear.id }));
      }
      if (programsData.length > 0) setExamForm(f => ({ ...f, course_id: programsData[0].id }));
      if (subjectsData.length > 0) setSubjectForm(f => ({ ...f, subject_id: subjectsData[0].id }));
    } catch (err) {
      console.error('Error fetching metadata:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchExams = async () => {
    try {
      const data = await api.get('/exams');
      setExams(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/exams', examForm);
      setShowExamModal(false);
      setExamForm(f => ({ ...f, name: '', start_date: '', end_date: '' }));
      fetchExams();
    } catch (err) {
      alert('Error creating exam event');
    }
  };

  const handleStatusChange = async (exam: Exam, status: 'DRAFT' | 'PUBLISHED' | 'COMPLETED') => {
    try {
      await api.put(`/exams/${exam.id}`, { status });
      fetchExams();
    } catch (err) {
      alert('Error updating status');
    }
  };

  const handleDeleteExam = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this exam event and all related mark records?')) return;
    try {
      await api.delete(`/exams/${id}`);
      fetchExams();
    } catch (err) {
      alert('Error deleting exam event');
    }
  };

  // --- EXAM SUBJECTS CONTROLLER ---
  const handleOpenSubjects = async (exam: Exam) => {
    try {
      setLoading(true);
      setSelectedExam(exam);
      const data = await api.get(`/exams/${exam.id}/subjects`);
      setExamSubjects(data);
      setView('subjects');
    } catch (err) {
      alert('Error loading exam subjects');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExam) return;
    try {
      await api.post(`/exams/${selectedExam.id}/subjects`, subjectForm);
      setShowSubjectModal(false);
      
      // Reload subjects
      const data = await api.get(`/exams/${selectedExam.id}/subjects`);
      setExamSubjects(data);
    } catch (err) {
      alert('Error adding subject. It might already be added.');
    }
  };

  const handleRemoveSubject = async (examSubjectId: string) => {
    if (!confirm('Remove this subject from the exam?')) return;
    try {
      await api.delete(`/exams/subjects/${examSubjectId}`);
      if (selectedExam) {
        const data = await api.get(`/exams/${selectedExam.id}/subjects`);
        setExamSubjects(data);
      }
    } catch (err) {
      alert('Error removing subject');
    }
  };

  // --- MARKS SPREADSHEET CONTROLLER ---
  const handleOpenMarksheet = async (examSub: ExamSubject) => {
    try {
      setLoading(true);
      setSelectedExamSubject(examSub);
      const data = await api.get(`/exams/subjects/${examSub.id}/marks`);
      
      // Default unset grades to max marks reference
      const initialized = data.map((r: any) => ({
        ...r,
        marks_obtained: r.marks_obtained !== null ? Number(r.marks_obtained) : '',
        max_marks: r.max_marks !== null ? Number(r.max_marks) : examSub.max_marks
      }));
      setStudentMarks(initialized);
      setView('marks');
    } catch (err) {
      alert('Error loading marksheet. Ensure students are enrolled.');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkChange = (studentId: string, value: string) => {
    const num = value === '' ? '' : Number(value);
    setStudentMarks(prev => prev.map(rec => 
      rec.student_id === studentId ? { ...rec, marks_obtained: num } : rec
    ));
  };

  const handleRemarksChange = (studentId: string, remarks: string) => {
    setStudentMarks(prev => prev.map(rec => 
      rec.student_id === studentId ? { ...rec, remarks } : rec
    ));
  };

  const handleSaveMarks = async () => {
    if (!selectedExamSubject) return;
    try {
      setLoading(true);
      for (const rec of studentMarks) {
        if (rec.marks_obtained !== null && rec.marks_obtained !== '') {
          if (rec.marks_obtained < 0 || rec.marks_obtained > (rec.max_marks || selectedExamSubject.max_marks)) {
            alert(`Error: Marks for student ${rec.student_name} must be between 0 and ${rec.max_marks || selectedExamSubject.max_marks}`);
            setLoading(false);
            return;
          }
        }
      }

      const payload = studentMarks.map(rec => ({
        student_id: rec.student_id,
        marks_obtained: rec.marks_obtained === '' || rec.marks_obtained === null ? 0 : Number(rec.marks_obtained),
        max_marks: rec.max_marks || selectedExamSubject.max_marks,
        remarks: rec.remarks
      }));

      await api.post(`/exams/subjects/${selectedExamSubject.id}/marks`, payload);
      alert('Marks saved successfully!');
      if (selectedExam) {
        handleOpenSubjects(selectedExam);
      }
    } catch (err) {
      alert('Error saving student marks');
    } finally {
      setLoading(false);
    }
  };

  // --- RESULTS OVERVIEW CONTROLLER ---
  const handleOpenResults = async (exam: Exam) => {
    try {
      setLoading(true);
      setSelectedExam(exam);
      const data = await api.get(`/exams/${exam.id}/results`);
      setExamResults(data);
      setView('results');
    } catch (err) {
      alert('Error loading results sheet');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'badge-secondary';
      case 'PUBLISHED': return 'badge-primary';
      case 'COMPLETED': return 'badge-success';
      default: return 'badge-secondary';
    }
  };

  return (
    <Layout>
      {view === 'list' && (
        <>
          <div className="page-header">
            <div>
              <h2>Exams Configuration</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                Track exam events, configure schedules, and aggregate grade metrics
              </p>
            </div>
            <button className="btn btn-primary" onClick={() => setShowExamModal(true)}>
              <Plus size={18} /> Add Exam Event
            </button>
          </div>

          <div className="card">
            {loading ? <p>Loading exams...</p> : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Exam Name</th>
                    <th>Academic Year</th>
                    <th>Program</th>
                    <th>Sem</th>
                    <th>Schedule</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {exams.map((ex) => (
                    <tr key={ex.id}>
                      <td><strong>{ex.name}</strong></td>
                      <td>{ex.academic_year_name}</td>
                      <td>{ex.course_name}</td>
                      <td>Sem {ex.semester}</td>
                      <td>{ex.start_date} to {ex.end_date}</td>
                      <td>
                        <span className={`badge ${getStatusBadge(ex.status)}`}>
                          {ex.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <button className="btn btn-sm btn-primary" onClick={() => handleOpenSubjects(ex)}>
                            <Layers size={12} /> Subjects
                          </button>
                          <button className="btn btn-sm btn-success" onClick={() => handleOpenResults(ex)}>
                            <Award size={12} /> Results
                          </button>
                          
                          <select 
                            value={ex.status} 
                            onChange={(e) => handleStatusChange(ex, e.target.value as any)}
                            style={{ padding: '0.2rem', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid var(--border)' }}
                          >
                            <option value="DRAFT">DRAFT</option>
                            <option value="PUBLISHED">PUBLISHED</option>
                            <option value="COMPLETED">COMPLETED</option>
                          </select>

                          <button className="btn btn-sm btn-danger" onClick={(e) => handleDeleteExam(ex.id, e)}>
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {exams.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '3rem' }}>
                        <ClipboardCheck size={32} style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }} />
                        <p style={{ color: 'var(--text-muted)' }}>No exam events scheduled yet.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          {showExamModal && (
            <div className="modal-overlay">
              <div className="modal-content">
                <h3>Add New Exam Event</h3>
                <form onSubmit={handleCreateExam}>
                  <div className="form-group">
                    <label>Exam Name (e.g. Mid Semester Exam, Lab Finals)</label>
                    <input
                      type="text"
                      value={examForm.name}
                      onChange={(e) => setExamForm({ ...examForm, name: e.target.value })}
                      placeholder="e.g. Mid Semester 1"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Academic Year</label>
                    <select
                      value={examForm.academic_year_id}
                      onChange={(e) => setExamForm({ ...examForm, academic_year_id: e.target.value })}
                      required
                    >
                      {academicYears.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Program / Course</label>
                    <select
                      value={examForm.course_id}
                      onChange={(e) => setExamForm({ ...examForm, course_id: e.target.value })}
                      required
                    >
                      {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Semester</label>
                    <input
                      type="number"
                      value={examForm.semester}
                      onChange={(e) => setExamForm({ ...examForm, semester: parseInt(e.target.value) || 1 })}
                      required
                      min={1}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label>Start Date</label>
                      <input
                        type="date"
                        value={examForm.start_date}
                        onChange={(e) => setExamForm({ ...examForm, start_date: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>End Date</label>
                      <input
                        type="date"
                        value={examForm.end_date}
                        onChange={(e) => setExamForm({ ...examForm, end_date: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="modal-actions">
                    <button type="button" onClick={() => setShowExamModal(false)} className="btn btn-secondary">
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">
                      Create Exam
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      )}

      {view === 'subjects' && selectedExam && (
        <>
          <div className="page-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button className="btn btn-secondary" style={{ padding: '0.5rem' }} onClick={() => setView('list')}>
                <ArrowLeft size={18} />
              </button>
              <div>
                <h2>Exam Subjects Configuration</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  {selectedExam.name} | Sem {selectedExam.semester} | {selectedExam.course_name}
                </p>
              </div>
            </div>
            <button className="btn btn-primary" onClick={() => setShowSubjectModal(true)}>
              <Plus size={18} /> Add Subject to Exam
            </button>
          </div>

          <div className="card">
            {loading ? <p>Loading subjects...</p> : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Subject Code</th>
                    <th>Subject Name</th>
                    <th>Date</th>
                    <th>Timings</th>
                    <th>Max Marks</th>
                    <th>Passing Marks</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {examSubjects.map((es) => (
                    <tr key={es.id}>
                      <td><strong>{es.subject_code}</strong></td>
                      <td>{es.subject_name}</td>
                      <td>{es.exam_date || '-'}</td>
                      <td>{es.start_time && es.end_time ? `${es.start_time} - ${es.end_time}` : '-'}</td>
                      <td><strong>{es.max_marks}</strong></td>
                      <td>{es.min_marks}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <button className="btn btn-sm btn-primary" onClick={() => handleOpenMarksheet(es)}>
                            <FileSpreadsheet size={12} /> Enter Marks
                          </button>
                          <button className="btn btn-sm btn-danger" onClick={() => handleRemoveSubject(es.id)}>
                            <Trash2 size={12} /> Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {examSubjects.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '3rem' }}>
                        <p style={{ color: 'var(--text-muted)' }}>No subjects mapped to this exam event yet.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          {showSubjectModal && (
            <div className="modal-overlay">
              <div className="modal-content">
                <h3>Add Subject to Exam</h3>
                <form onSubmit={handleAddSubject}>
                  <div className="form-group">
                    <label>Select Subject</label>
                    <select
                      value={subjectForm.subject_id}
                      onChange={(e) => setSubjectForm({ ...subjectForm, subject_id: e.target.value })}
                      required
                    >
                      {allSubjects
                        .filter(s => s.course_id === selectedExam.course_id && s.semester === selectedExam.semester)
                        .map(s => <option key={s.id} value={s.id}>{s.subject_name} ({s.subject_code})</option>)
                      }
                      {allSubjects.filter(s => s.course_id === selectedExam.course_id && s.semester === selectedExam.semester).length === 0 && (
                        <option value="">No subjects match this course/semester</option>
                      )}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Exam Date</label>
                    <input
                      type="date"
                      value={subjectForm.exam_date}
                      onChange={(e) => setSubjectForm({ ...subjectForm, exam_date: e.target.value })}
                      required
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label>Start Time (HH:MM)</label>
                      <input
                        type="time"
                        value={subjectForm.start_time}
                        onChange={(e) => setSubjectForm({ ...subjectForm, start_time: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>End Time (HH:MM)</label>
                      <input
                        type="time"
                        value={subjectForm.end_time}
                        onChange={(e) => setSubjectForm({ ...subjectForm, end_time: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label>Max Marks</label>
                      <input
                        type="number"
                        value={subjectForm.max_marks}
                        onChange={(e) => setSubjectForm({ ...subjectForm, max_marks: parseFloat(e.target.value) || 100 })}
                        required
                        min={1}
                      />
                    </div>
                    <div className="form-group">
                      <label>Passing Marks</label>
                      <input
                        type="number"
                        value={subjectForm.min_marks}
                        onChange={(e) => setSubjectForm({ ...subjectForm, min_marks: parseFloat(e.target.value) || 40 })}
                        required
                        min={0}
                      />
                    </div>
                  </div>

                  <div className="modal-actions">
                    <button type="button" onClick={() => setShowSubjectModal(false)} className="btn btn-secondary">
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={allSubjects.filter(s => s.course_id === selectedExam.course_id && s.semester === selectedExam.semester).length === 0}>
                      Add Subject
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      )}

      {view === 'marks' && selectedExam && selectedExamSubject && (
        <>
          <div className="page-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button className="btn btn-secondary" style={{ padding: '0.5rem' }} onClick={() => handleOpenSubjects(selectedExam)}>
                <ArrowLeft size={18} />
              </button>
              <div>
                <h2>Marks Entry Sheet</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  {selectedExam.name} | {selectedExamSubject.subject_code} - {selectedExamSubject.subject_name} (Max Marks: {selectedExamSubject.max_marks})
                </p>
              </div>
            </div>
            <button className="btn btn-primary" onClick={handleSaveMarks} disabled={loading}>
              Save Marks Sheet
            </button>
          </div>

          <div className="card">
            {loading ? <p>Loading student marksheet...</p> : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Roll Number</th>
                    <th>Student Name</th>
                    <th style={{ width: '200px' }}>Marks Obtained</th>
                    <th>Max Marks</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {studentMarks.map((rec) => (
                    <tr key={rec.student_id}>
                      <td><strong>{rec.roll_number || '-'}</strong></td>
                      <td>{rec.student_name}</td>
                      <td>
                        <input
                          type="number"
                          value={rec.marks_obtained ?? ''}
                          onChange={(e) => handleMarkChange(rec.student_id, e.target.value)}
                          placeholder="Marks obtained"
                          max={selectedExamSubject.max_marks}
                          min={0}
                          style={{
                            width: '100%',
                            padding: '0.5rem',
                            borderRadius: '4px',
                            border: '1px solid var(--border)',
                            fontWeight: 700
                          }}
                        />
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>{selectedExamSubject.max_marks}</span>
                      </td>
                      <td>
                        <input
                          type="text"
                          value={rec.remarks || ''}
                          onChange={(e) => handleRemarksChange(rec.student_id, e.target.value)}
                          placeholder="e.g. Medical leave, Absent"
                          style={{
                            width: '100%',
                            padding: '0.5rem',
                            borderRadius: '4px',
                            border: '1px solid var(--border)'
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                  {studentMarks.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>
                        No eligible students found enrolled in this program/semester.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {view === 'results' && selectedExam && (
        <>
          <div className="page-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button className="btn btn-secondary" style={{ padding: '0.5rem' }} onClick={() => setView('list')}>
                <ArrowLeft size={18} />
              </button>
              <div>
                <h2>Exam Results Grid</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  {selectedExam.name} | Sem {selectedExam.semester} | {selectedExam.course_name}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            {loading ? <p>Loading results overview...</p> : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Roll Number</th>
                    <th>Student Name</th>
                    <th>Aggregate Marks</th>
                    <th>Percentage</th>
                    <th>Calculated Grade</th>
                    <th>Result Card</th>
                  </tr>
                </thead>
                <tbody>
                  {examResults.map((res) => (
                    <tr key={res.student_id}>
                      <td><strong>{res.roll_number || '-'}</strong></td>
                      <td>{res.student_name}</td>
                      <td><strong>{res.total_obtained} / {res.total_max}</strong></td>
                      <td>{res.percentage}%</td>
                      <td>
                        <span style={{ fontWeight: 800, color: res.grade === 'F' ? 'var(--danger)' : 'var(--text-main)' }}>
                          {res.grade}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${res.result === 'PASS' ? 'badge-success' : 'badge-danger'}`} style={{ padding: '0.25rem 0.5rem' }}>
                          {res.result}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {examResults.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '3rem' }}>
                        <p style={{ color: 'var(--text-muted)' }}>No marks have been graded for this exam event yet.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </Layout>
  );
}
