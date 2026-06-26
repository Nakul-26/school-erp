import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { api } from '../services/api';
import { useSearchParams } from 'react-router-dom';
import { Plus, Trash2, Calendar, ClipboardCheck, ArrowLeft, Check, X, AlertTriangle, HelpCircle, Clock } from 'lucide-react';

interface AttendanceSession {
  id: string;
  section_id: string;
  subject_id: string;
  teacher_id: string;
  slot_id: string | null;
  date: string;
  section_name?: string;
  subject_name?: string;
  subject_code?: string;
  teacher_name?: string;
  slot_name?: string;
}

interface StudentAttendanceRecord {
  student_id: string;
  first_name: string;
  last_name: string;
  roll_number: string | null;
  admission_number: string;
  attendance_id: string | null;
  status: 'present' | 'absent' | 'late' | 'excused' | null;
  remarks: string | null;
}

export default function Attendance() {
  const [searchParams] = useSearchParams();
  const querySectionId = searchParams.get('section_id');

  const [view, setView] = useState<'list' | 'new' | 'mark'>('list');
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [slots, setSlots] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<AttendanceSession | null>(null);
  const [studentRecords, setStudentRecords] = useState<StudentAttendanceRecord[]>([]);
  
  const [sessionForm, setSessionForm] = useState({
    section_id: '',
    subject_id: '',
    teacher_id: '',
    slot_id: '',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchMetadataAndSessions();
  }, []);

  const fetchMetadataAndSessions = async () => {
    try {
      setLoading(true);
      const [sessionsData, sectionsData, subjectsData, teachersData, slotsData] = await Promise.all([
        api.get('/attendance/sessions'),
        api.get('/sections'),
        api.get('/subjects'),
        api.get('/teachers'),
        api.get('/timetable-slots')
      ]);
      
      setSessions(sessionsData);
      setSections(sectionsData);
      setSubjects(subjectsData);
      setTeachers(teachersData);
      setSlots(slotsData);
      
      const initialSectionId = querySectionId || (sectionsData.length > 0 ? sectionsData[0].id : '');
      
      setSessionForm(f => ({
        ...f,
        section_id: initialSectionId,
        subject_id: subjectsData.length > 0 ? subjectsData[0].id : '',
        teacher_id: teachersData.length > 0 ? teachersData[0].id : '',
        slot_id: slotsData.length > 0 ? slotsData[0].id : ''
      }));

      if (querySectionId) {
        setView('new');
      }
    } catch (err) {
      console.error('Error fetching metadata:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSessions = async () => {
    try {
      const data = await api.get('/attendance/sessions');
      setSessions(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleStartSession = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { id } = await api.post('/attendance/sessions', sessionForm);
      const createdSession: AttendanceSession = {
        id,
        section_id: sessionForm.section_id,
        subject_id: sessionForm.subject_id,
        teacher_id: sessionForm.teacher_id,
        slot_id: sessionForm.slot_id || null,
        date: sessionForm.date || '',
        section_name: sections.find(s => s.id === sessionForm.section_id)?.name,
        subject_name: subjects.find(s => s.id === sessionForm.subject_id)?.subject_name,
        subject_code: subjects.find(s => s.id === sessionForm.subject_id)?.subject_code,
        teacher_name: teachers.find(t => t.id === sessionForm.teacher_id)?.first_name,
        slot_name: slots.find(s => s.id === sessionForm.slot_id)?.name
      };
      
      await fetchSessions();
      handleOpenMarking(createdSession);
    } catch (err) {
      alert('Error creating session');
    }
  };

  const handleOpenMarking = async (session: AttendanceSession) => {
    try {
      setLoading(true);
      setSelectedSession(session);
      const data = await api.get(`/attendance/sessions/${session.id}/attendance`);
      
      // Initialize unmarked students as 'present' by default
      const initialized = data.map((r: any) => ({
        ...r,
        status: r.status || 'present'
      }));
      
      setStudentRecords(initialized);
      setView('mark');
    } catch (err) {
      alert('Error fetching student list');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkStatus = (studentId: string, status: 'present' | 'absent' | 'late' | 'excused') => {
    setStudentRecords(prev => prev.map(rec => 
      rec.student_id === studentId ? { ...rec, status } : rec
    ));
  };

  const handleRemarksChange = (studentId: string, remarks: string) => {
    setStudentRecords(prev => prev.map(rec => 
      rec.student_id === studentId ? { ...rec, remarks } : rec
    ));
  };

  const handleSaveAttendance = async () => {
    if (!selectedSession) return;
    try {
      setLoading(true);
      const payload = studentRecords.map(rec => ({
        student_id: rec.student_id,
        status: rec.status,
        remarks: rec.remarks
      }));
      await api.post(`/attendance/sessions/${selectedSession.id}/attendance`, payload);
      alert('Attendance saved successfully!');
      setView('list');
      setSelectedSession(null);
      fetchSessions();
    } catch (err) {
      alert('Error saving attendance records');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this attendance session and all its records?')) return;
    try {
      await api.delete(`/attendance/sessions/${id}`);
      fetchSessions();
    } catch (err) {
      alert('Error deleting session');
    }
  };

  return (
    <Layout>
      {view === 'list' && (
        <>
          <div className="page-header">
            <div>
              <h2>Attendance Sessions</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                Track daily attendance sessions and student marksheets
              </p>
            </div>
            <button className="btn btn-primary" onClick={() => setView('new')}>
              <Plus size={18} /> Start Session
            </button>
          </div>

          <div className="card">
            {loading ? <p>Loading sessions...</p> : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Class / Section</th>
                    <th>Subject</th>
                    <th>Teacher</th>
                    <th>Slot</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((sess) => (
                    <tr key={sess.id} style={{ cursor: 'pointer' }} onClick={() => handleOpenMarking(sess)}>
                      <td><strong>{sess.date}</strong></td>
                      <td>{sess.section_name || 'Unknown'}</td>
                      <td>
                        <strong>{sess.subject_code}</strong> - {sess.subject_name}
                      </td>
                      <td>{sess.teacher_name}</td>
                      <td>{sess.slot_name || 'Ad-hoc'}</td>
                      <td style={{ textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <button className="btn btn-sm btn-primary" onClick={() => handleOpenMarking(sess)}>
                            <ClipboardCheck size={14} /> Open
                          </button>
                          <button className="btn btn-sm btn-danger" onClick={(e) => handleDeleteSession(sess.id, e)}>
                            <Trash2 size={14} /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {sessions.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '3rem' }}>
                        <ClipboardCheck size={32} style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }} />
                        <p style={{ color: 'var(--text-muted)' }}>No attendance sessions started yet.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {view === 'new' && (
        <>
          <div className="page-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button className="btn btn-secondary" style={{ padding: '0.5rem' }} onClick={() => setView('list')}>
                <ArrowLeft size={18} />
              </button>
              <div>
                <h2>Start Attendance Session</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Select the section and timing details</p>
              </div>
            </div>
          </div>

          <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
            <form onSubmit={handleStartSession}>
              <div className="form-group">
                <label>Date</label>
                <input
                  type="date"
                  value={sessionForm.date}
                  onChange={(e) => setSessionForm({ ...sessionForm, date: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Class/Section</label>
                <select
                  value={sessionForm.section_id}
                  onChange={(e) => setSessionForm({ ...sessionForm, section_id: e.target.value })}
                  required
                >
                  {sections.map(s => <option key={s.id} value={s.id}>{s.name} (Year {s.year_number})</option>)}
                </select>
              </div>

              <div className="form-group">
                <label>Subject</label>
                <select
                  value={sessionForm.subject_id}
                  onChange={(e) => setSessionForm({ ...sessionForm, subject_id: e.target.value })}
                  required
                >
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.subject_name} ({s.subject_code})</option>)}
                </select>
              </div>

              <div className="form-group">
                <label>Teacher</label>
                <select
                  value={sessionForm.teacher_id}
                  onChange={(e) => setSessionForm({ ...sessionForm, teacher_id: e.target.value })}
                  required
                >
                  {teachers.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label>Timetable Slot (Optional)</label>
                <select
                  value={sessionForm.slot_id}
                  onChange={(e) => setSessionForm({ ...sessionForm, slot_id: e.target.value })}
                >
                  <option value="">-- Ad-hoc Session --</option>
                  {slots.map(s => <option key={s.id} value={s.id}>{s.name} ({s.start_time} - {s.end_time})</option>)}
                </select>
              </div>

              <div className="modal-actions" style={{ marginTop: '2rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setView('list')}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Start & Mark Attendance
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {view === 'mark' && selectedSession && (
        <>
          <div className="page-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button className="btn btn-secondary" style={{ padding: '0.5rem' }} onClick={() => { setView('list'); setSelectedSession(null); }}>
                <ArrowLeft size={18} />
              </button>
              <div>
                <h2>Mark Student Attendance</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  {selectedSession.date} | {selectedSession.section_name} | {selectedSession.subject_code} ({selectedSession.slot_name || 'Ad-hoc'})
                </p>
              </div>
            </div>
            <button className="btn btn-primary" onClick={handleSaveAttendance} disabled={loading}>
              Save Attendance
            </button>
          </div>

          <div className="card">
            {loading ? <p>Loading student list...</p> : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Roll Number</th>
                    <th>Student Name</th>
                    <th>Status</th>
                    <th style={{ width: '300px' }}>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {studentRecords.map((rec) => (
                    <tr key={rec.student_id}>
                      <td><strong>{rec.roll_number || '-'}</strong></td>
                      <td>{rec.first_name} {rec.last_name}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          <button
                            type="button"
                            className={`btn btn-sm ${rec.status === 'present' ? 'btn-success' : 'btn-secondary'}`}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', opacity: rec.status === 'present' ? 1 : 0.6 }}
                            onClick={() => handleMarkStatus(rec.student_id, 'present')}
                          >
                            <Check size={12} /> Present
                          </button>
                          <button
                            type="button"
                            className={`btn btn-sm ${rec.status === 'absent' ? 'btn-danger' : 'btn-secondary'}`}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', opacity: rec.status === 'absent' ? 1 : 0.6 }}
                            onClick={() => handleMarkStatus(rec.student_id, 'absent')}
                          >
                            <X size={12} /> Absent
                          </button>
                          <button
                            type="button"
                            className={`btn btn-sm ${rec.status === 'late' ? 'btn-warning' : 'btn-secondary'}`}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', opacity: rec.status === 'late' ? 1 : 0.6 }}
                            onClick={() => handleMarkStatus(rec.student_id, 'late')}
                          >
                            <Clock size={12} /> Late
                          </button>
                          <button
                            type="button"
                            className={`btn btn-sm ${rec.status === 'excused' ? 'btn-secondary' : 'btn-secondary'}`}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              backgroundColor: rec.status === 'excused' ? '#64748b' : '',
                              color: rec.status === 'excused' ? '#fff' : '',
                              opacity: rec.status === 'excused' ? 1 : 0.6
                            }}
                            onClick={() => handleMarkStatus(rec.student_id, 'excused')}
                          >
                            <HelpCircle size={12} /> Excused
                          </button>
                        </div>
                      </td>
                      <td>
                        <input
                          type="text"
                          value={rec.remarks || ''}
                          onChange={(e) => handleRemarksChange(rec.student_id, e.target.value)}
                          placeholder="e.g. medical leave"
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
                  {studentRecords.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}>
                        No students enrolled in this section. Enroll students before marking attendance.
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
