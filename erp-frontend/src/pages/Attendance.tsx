import './Attendance.css';
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { PageGuidance } from '../components/PageGuidance';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { 
  Plus, Trash2, Calendar, ClipboardCheck, ArrowLeft, 
  Check, X, AlertTriangle, HelpCircle, Clock, UserCheck
} from 'lucide-react';
import SkeletonLoader from '../components/SkeletonLoader';
import EmptyState from '../components/EmptyState';

// --- INTERFACES ---
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

interface TeacherAttendanceRecord {
  teacher_id: string;
  first_name: string;
  last_name: string;
  employee_id: string;
  designation: string;
  department: string;
  attendance_id: string | null;
  status: 'present' | 'absent' | 'half_day' | 'on_leave' | null;
  remarks: string | null;
}

export default function Attendance() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const querySectionId = searchParams.get('section_id');
  const queryTab = searchParams.get('tab');

  const roles = user?.roles || (user?.role ? [user.role] : []);
  const canManageTeachers = roles.some(r => ['super_admin', 'Admin', 'admin', 'Principal', 'HOD', 'hod'].includes(r));

  // Determine active tab: students vs teachers
  const [activeTab, setActiveTab] = useState<'students' | 'teachers'>(
    (queryTab === 'teachers' && canManageTeachers) ? 'teachers' : 'students'
  );

  const handleTabChange = (tab: 'students' | 'teachers') => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  // --- TAB 1: STUDENT ATTENDANCE STATES ---
  const [stdView, setStdView] = useState<'list' | 'new' | 'mark'>('list');
  const [stdSessions, setStdSessions] = useState<AttendanceSession[]>([]);
  const [stdSections, setStdSections] = useState<any[]>([]);
  const [stdSubjects, setStdSubjects] = useState<any[]>([]);
  const [stdTeachers, setStdTeachers] = useState<any[]>([]);
  const [stdSlots, setStdSlots] = useState<any[]>([]);
  const [stdLoading, setStdLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<AttendanceSession | null>(null);
  const [studentRecords, setStudentRecords] = useState<StudentAttendanceRecord[]>([]);
  const [sessionForm, setSessionForm] = useState({
    section_id: '',
    subject_id: '',
    teacher_id: '',
    slot_id: '',
    date: new Date().toISOString().split('T')[0]
  });

  // --- TAB 2: TEACHER ATTENDANCE STATES ---
  const [tchrDate, setTchrDate] = useState<string>(new Date().toISOString().split('T')[0] || '');
  const [tchrRecords, setTchrRecords] = useState<TeacherAttendanceRecord[]>([]);
  const [tchrLoading, setTchrLoading] = useState(true);
  const [tchrSaving, setTchrSaving] = useState(false);

  // --- LIFECYCLE INITIALIZATION ---
  useEffect(() => {
    if (activeTab === 'students') {
      fetchStudentMetadataAndSessions();
    } else if (activeTab === 'teachers') {
      fetchTeacherAttendance();
    }
  }, [activeTab, tchrDate]);

  // --- STUDENT ATTENDANCE FUNCTIONS ---
  const fetchStudentMetadataAndSessions = async () => {
    try {
      setStdLoading(true);
      const [sessionsData, sectionsData, subjectsData, teachersData, slotsData] = await Promise.all([
        api.get('/attendance/sessions'),
        api.get('/sections'),
        api.get('/subjects'),
        api.get('/teachers'),
        api.get('/timetable-slots')
      ]);
      
      setStdSessions(sessionsData || []);
      setStdSections(sectionsData || []);
      setStdSubjects(subjectsData || []);
      setStdTeachers(teachersData || []);
      setStdSlots(slotsData || []);
      
      const initialSectionId = querySectionId || (sectionsData.length > 0 ? sectionsData[0].id : '');
      
      setSessionForm(f => ({
        ...f,
        section_id: initialSectionId,
        subject_id: subjectsData.length > 0 ? subjectsData[0].id : '',
        teacher_id: teachersData.length > 0 ? teachersData[0].id : '',
        slot_id: slotsData.length > 0 ? slotsData[0].id : ''
      }));

      if (querySectionId) {
        setStdView('new');
      }
    } catch (err) {
      console.error('Error fetching student metadata:', err);
    } finally {
      setStdLoading(false);
    }
  };

  const fetchStdSessionsOnly = async () => {
    try {
      const data = await api.get('/attendance/sessions');
      setStdSessions(data || []);
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
        section_name: stdSections.find(s => s.id === sessionForm.section_id)?.name,
        subject_name: stdSubjects.find(s => s.id === sessionForm.subject_id)?.subject_name,
        subject_code: stdSubjects.find(s => s.id === sessionForm.subject_id)?.subject_code,
        teacher_name: stdTeachers.find(t => t.id === sessionForm.teacher_id)?.first_name,
        slot_name: stdSlots.find(s => s.id === sessionForm.slot_id)?.name
      };
      
      await fetchStdSessionsOnly();
      handleOpenMarking(createdSession);
    } catch (err) {
      alert('Error creating session');
    }
  };

  const handleOpenMarking = async (session: AttendanceSession) => {
    try {
      setStdLoading(true);
      setSelectedSession(session);
      const data = await api.get(`/attendance/sessions/${session.id}/attendance`);
      const initialized = data.map((r: any) => ({
        ...r,
        status: r.status || 'present'
      }));
      setStudentRecords(initialized);
      setStdView('mark');
    } catch (err) {
      alert('Error fetching student list');
    } finally {
      setStdLoading(false);
    }
  };

  const handleMarkStudentStatus = (studentId: string, status: 'present' | 'absent' | 'late' | 'excused') => {
    setStudentRecords(prev => prev.map(rec => 
      rec.student_id === studentId ? { ...rec, status } : rec
    ));
  };

  const handleStudentRemarksChange = (studentId: string, remarks: string) => {
    setStudentRecords(prev => prev.map(rec => 
      rec.student_id === studentId ? { ...rec, remarks } : rec
    ));
  };

  const handleSaveStudentAttendance = async () => {
    if (!selectedSession) return;
    try {
      setStdLoading(true);
      const payload = studentRecords.map(rec => ({
        student_id: rec.student_id,
        status: rec.status,
        remarks: rec.remarks
      }));
      await api.post(`/attendance/sessions/${selectedSession.id}/attendance`, payload);
      alert('Attendance saved successfully!');
      setStdView('list');
      setSelectedSession(null);
      fetchStdSessionsOnly();
    } catch (err) {
      alert('Error saving attendance records');
    } finally {
      setStdLoading(false);
    }
  };

  const handleDeleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this session and all its records?')) return;
    try {
      await api.delete(`/attendance/sessions/${id}`);
      fetchStdSessionsOnly();
    } catch (err) {
      alert('Error deleting session');
    }
  };

  // --- TEACHER ATTENDANCE FUNCTIONS ---
  const fetchTeacherAttendance = async () => {
    try {
      setTchrLoading(true);
      const data = await api.get(`/teacher-attendance?date=${tchrDate}`);
      const initialized = data.map((t: any) => ({
        ...t,
        status: t.status || 'present'
      }));
      setTchrRecords(initialized);
    } catch (err) {
      console.error('Error fetching teacher attendance:', err);
    } finally {
      setTchrLoading(false);
    }
  };

  const handleMarkTeacherStatus = (teacherId: string, status: 'present' | 'absent' | 'half_day' | 'on_leave') => {
    setTchrRecords(prev => prev.map(rec => 
      rec.teacher_id === teacherId ? { ...rec, status } : rec
    ));
  };

  const handleTeacherRemarksChange = (teacherId: string, remarks: string) => {
    setTchrRecords(prev => prev.map(rec => 
      rec.teacher_id === teacherId ? { ...rec, remarks } : rec
    ));
  };

  const handleSaveTeacherAttendance = async () => {
    try {
      setTchrSaving(true);
      const payload = tchrRecords.map(t => ({
        teacher_id: t.teacher_id,
        status: t.status,
        remarks: t.remarks
      }));
      await api.post('/teacher-attendance', {
        date: tchrDate,
        records: payload
      });
      alert('Teacher attendance registers saved successfully!');
      fetchTeacherAttendance();
    } catch (err: any) {
      alert(err.message || 'Error saving teacher attendance registers');
    } finally {
      setTchrSaving(false);
    }
  };

  // --- RENDERING TABS ---
  const renderStudentAttendance = () => {
    if (stdView === 'list') {
      return (
        <>
          <div className="page-header attendance-session-list-header">
            <div>
              <h3>Daily Class Registers</h3>
              <p className="attendance-text-2">Track and manage active class registers</p>
            </div>
            <button className="btn btn-primary" onClick={() => setStdView('new')}>
              <Plus size={16} /> Start Class Session
            </button>
          </div>

          <div className="card">
            {stdLoading ? (
              <SkeletonLoader type="table" rows={4} cols={6} />
            ) : stdSessions.length === 0 ? (
              <EmptyState
                title="No Attendance Registers Created"
                description="Start a new class period or ad-hoc session to begin logging student attendance registers."
                icon={ClipboardCheck}
                action={{
                  label: "Start Class Session",
                  onClick: () => setStdView('new')
                }}
              />
            ) : (
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Class / Section</th>
                      <th>Subject</th>
                      <th>Teacher</th>
                      <th>Period Slot</th>
                      <th className="attendance-th-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stdSessions.map((sess) => (
                      <tr key={sess.id} className="attendance-tr-4" onClick={() => handleOpenMarking(sess)}>
                        <td><strong>{sess.date}</strong></td>
                        <td>{sess.section_name || 'Unknown'}</td>
                        <td><strong>{sess.subject_code}</strong> - {sess.subject_name}</td>
                        <td>{sess.teacher_name}</td>
                        <td>{sess.slot_name || 'Ad-hoc'}</td>
                        <td className="attendance-td-5" onClick={e => e.stopPropagation()}>
                          <div className="attendance-row-6">
                            <button className="btn btn-sm btn-primary" onClick={() => handleOpenMarking(sess)}>
                              Open Register
                            </button>
                            <button className="btn btn-sm btn-outline btn-danger" onClick={(e) => handleDeleteSession(sess.id, e)}>
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      );
    }

    if (stdView === 'new') {
      return (
        <>
          <div className="page-header attendance-session-form-header">
            <div className="attendance-row-8">
              <button className="btn btn-secondary attendance-btn" onClick={() => setStdView('list')}>
                <ArrowLeft size={18} />
              </button>
              <div>
                <h3>Create Class Register</h3>
                <p className="attendance-text-10">Start a session to mark class attendance</p>
              </div>
            </div>
          </div>

          <div className="card attendance-card">
            <form onSubmit={handleStartSession}>
              <div className="form-group">
                <label>Attendance Date</label>
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
                  {stdSections.map(s => <option key={s.id} value={s.id}>{s.name} (Grade/Year {s.year_number})</option>)}
                </select>
              </div>

              <div className="form-group">
                <label>Subject</label>
                <select
                  value={sessionForm.subject_id}
                  onChange={(e) => setSessionForm({ ...sessionForm, subject_id: e.target.value })}
                  required
                >
                  {stdSubjects.map(s => <option key={s.id} value={s.id}>{s.subject_name} ({s.subject_code})</option>)}
                </select>
              </div>

              <div className="form-group">
                <label>Teacher</label>
                <select
                  value={sessionForm.teacher_id}
                  onChange={(e) => setSessionForm({ ...sessionForm, teacher_id: e.target.value })}
                  required
                >
                  {stdTeachers.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label>Class Period (Optional)</label>
                <select
                  value={sessionForm.slot_id}
                  onChange={(e) => setSessionForm({ ...sessionForm, slot_id: e.target.value })}
                >
                  <option value="">-- Ad-hoc / Free Period --</option>
                  {stdSlots.map(s => <option key={s.id} value={s.id}>{s.name} ({s.start_time} - {s.end_time})</option>)}
                </select>
              </div>

              <div className="modal-actions attendance-modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setStdView('list')}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Start Session
                </button>
              </div>
            </form>
          </div>
        </>
      );
    }

    if (stdView === 'mark' && selectedSession) {
      return (
        <>
          <div className="page-header attendance-marking-header">
            <div className="attendance-row-14">
              <button className="btn btn-secondary attendance-btn" onClick={() => { setStdView('list'); setSelectedSession(null); }}>
                <ArrowLeft size={18} />
              </button>
              <div>
                <h3>Mark Class Roll: {selectedSession.section_name}</h3>
                <p className="attendance-text-16">
                  {selectedSession.date} | {selectedSession.subject_code} · {selectedSession.subject_name}
                </p>
              </div>
            </div>
            <button className="btn btn-primary" onClick={handleSaveStudentAttendance} disabled={stdLoading}>
              Save Register
            </button>
          </div>

          <div className="card">
            {stdLoading ? (
              <SkeletonLoader type="table" rows={6} cols={4} />
            ) : (
              <>
                <div className="table-responsive attendance-table-desktop">
                  <table className="table">
                    <thead>
                      <tr>
                        <th className="attendance-th-17">Roll No</th>
                        <th>Student</th>
                        <th>Status Marks</th>
                        <th>Reason Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentRecords.map((rec) => (
                        <tr key={rec.student_id}>
                          <td><strong>{rec.roll_number || '-'}</strong></td>
                          <td>{rec.first_name} {rec.last_name}</td>
                          <td>
                            <div className="attendance-row-18">
                              <button
                                type="button"
                                className={`btn btn-sm ${rec.status === 'present' ? 'btn-success' : 'btn-secondary'}`}
                                style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', opacity: rec.status === 'present' ? 1 : 0.65 }}
                                onClick={() => handleMarkStudentStatus(rec.student_id, 'present')}
                              >
                                Present
                              </button>
                              <button
                                type="button"
                                className={`btn btn-sm ${rec.status === 'absent' ? 'btn-danger' : 'btn-secondary'}`}
                                style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', opacity: rec.status === 'absent' ? 1 : 0.65 }}
                                onClick={() => handleMarkStudentStatus(rec.student_id, 'absent')}
                              >
                                Absent
                              </button>
                              <button
                                type="button"
                                className={`btn btn-sm ${rec.status === 'late' ? 'btn-warning' : 'btn-secondary'}`}
                                style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', opacity: rec.status === 'late' ? 1 : 0.65 }}
                                onClick={() => handleMarkStudentStatus(rec.student_id, 'late')}
                              >
                                Late
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-secondary"
                                style={{
                                  padding: '0.3rem 0.6rem', fontSize: '0.75rem',
                                  backgroundColor: rec.status === 'excused' ? '#64748b' : '',
                                  color: rec.status === 'excused' ? '#fff' : '',
                                  opacity: rec.status === 'excused' ? 1 : 0.65
                                }}
                                onClick={() => handleMarkStudentStatus(rec.student_id, 'excused')}
                              >
                                Excused
                              </button>
                            </div>
                          </td>
                          <td>
                            <input type="text" value={rec.remarks || ''} onChange={(e) => handleStudentRemarksChange(rec.student_id, e.target.value)} placeholder="e.g. sick leave" className="attendance-input-19"  />
                          </td>
                        </tr>
                      ))}
                      {studentRecords.length === 0 && (
                        <tr>
                          <td colSpan={4} className="attendance-td-20">
                            No students found. Add student enrollments first.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="attendance-mobile-cards">
                  {studentRecords.map((rec) => (
                    <div key={rec.student_id} className="card attendance-mobile-card">
                      <div className="attendance-row-22">
                        <div>
                          <span className="attendance-span-23">Roll No: {rec.roll_number || '-'}</span>
                          <h4 className="attendance-title-24">{rec.first_name} {rec.last_name}</h4>
                        </div>
                        <div>
                          <span className={`badge ${ rec.status === 'present' ? 'badge-success' : rec.status === 'absent' ? 'badge-danger' : rec.status === 'late' ? 'badge-warning' : 'badge-secondary' } attendance-span-25`}>
                            {rec.status}
                          </span>
                        </div>
                      </div>

                      <div className="attendance-grid-26">
                        <button
                          type="button"
                          className={`btn btn-sm ${rec.status === 'present' ? 'btn-success' : 'btn-secondary'}`}
                          style={{ padding: '0.4rem 0.25rem', fontSize: '0.72rem', opacity: rec.status === 'present' ? 1 : 0.65 }}
                          onClick={() => handleMarkStudentStatus(rec.student_id, 'present')}
                        >
                          Present
                        </button>
                        <button
                          type="button"
                          className={`btn btn-sm ${rec.status === 'absent' ? 'btn-danger' : 'btn-secondary'}`}
                          style={{ padding: '0.4rem 0.25rem', fontSize: '0.72rem', opacity: rec.status === 'absent' ? 1 : 0.65 }}
                          onClick={() => handleMarkStudentStatus(rec.student_id, 'absent')}
                        >
                          Absent
                        </button>
                        <button
                          type="button"
                          className={`btn btn-sm ${rec.status === 'late' ? 'btn-warning' : 'btn-secondary'}`}
                          style={{ padding: '0.4rem 0.25rem', fontSize: '0.72rem', opacity: rec.status === 'late' ? 1 : 0.65 }}
                          onClick={() => handleMarkStudentStatus(rec.student_id, 'late')}
                        >
                          Late
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-secondary"
                          style={{
                            padding: '0.4rem 0.25rem', fontSize: '0.72rem',
                            backgroundColor: rec.status === 'excused' ? '#64748b' : '',
                            color: rec.status === 'excused' ? '#fff' : '',
                            opacity: rec.status === 'excused' ? 1 : 0.65
                          }}
                          onClick={() => handleMarkStudentStatus(rec.student_id, 'excused')}
                        >
                          Excused
                        </button>
                      </div>

                      <div>
                        <input type="text" value={rec.remarks || ''} onChange={(e) => handleStudentRemarksChange(rec.student_id, e.target.value)} placeholder="Add remarks (e.g. sick leave)" className="attendance-input-27"  />
                      </div>
                    </div>
                  ))}
                  {studentRecords.length === 0 && (
                    <p className="attendance-text-28">No students found.</p>
                  )}
                </div>
              </>
            )}
          </div>
        </>
      );
    }
  };

  const renderTeacherAttendance = () => {
    return (
      <>
        <div className="page-header teacher-attendance-header">
          <div>
            <h3>Staff Attendance Registers</h3>
            <p className="attendance-text-30">Mark and verify institutional staff attendance logs</p>
          </div>
          
          <div className="attendance-row-31">
            <input type="date" value={tchrDate} onChange={(e) => setTchrDate(e.target.value)} className="attendance-input-32"  />
            <button className="btn btn-primary" onClick={handleSaveTeacherAttendance} disabled={tchrSaving || tchrLoading}>
              {tchrSaving ? 'Saving...' : 'Save Registers'}
            </button>
          </div>
        </div>

        <div className="card">
          {tchrLoading ? (
            <SkeletonLoader type="table" rows={6} cols={5} />
          ) : (
            <>
              <div className="table-responsive attendance-table-desktop">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Emp ID</th>
                      <th>Teacher Name</th>
                      <th>Dept & Designation</th>
                      <th>Status</th>
                      <th>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tchrRecords.map((t) => (
                      <tr key={t.teacher_id}>
                        <td><strong>{t.employee_id}</strong></td>
                        <td>{t.first_name} {t.last_name}</td>
                        <td>
                          <span className="attendance-span-33">{t.department}</span>
                          <span className="attendance-span-34">{t.designation}</span>
                        </td>
                        <td>
                          <div className="attendance-row-35">
                            <button
                              type="button"
                              className={`btn btn-sm ${t.status === 'present' ? 'btn-success' : 'btn-secondary'}`}
                              style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', opacity: t.status === 'present' ? 1 : 0.65 }}
                              onClick={() => handleMarkTeacherStatus(t.teacher_id, 'present')}
                            >
                              Present
                            </button>
                            <button
                              type="button"
                              className={`btn btn-sm ${t.status === 'absent' ? 'btn-danger' : 'btn-secondary'}`}
                              style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', opacity: t.status === 'absent' ? 1 : 0.65 }}
                              onClick={() => handleMarkTeacherStatus(t.teacher_id, 'absent')}
                            >
                              Absent
                            </button>
                            <button
                              type="button"
                              className={`btn btn-sm ${t.status === 'half_day' ? 'btn-warning' : 'btn-secondary'}`}
                              style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', opacity: t.status === 'half_day' ? 1 : 0.65 }}
                              onClick={() => handleMarkTeacherStatus(t.teacher_id, 'half_day')}
                            >
                              Half Day
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-secondary"
                              style={{
                                padding: '0.3rem 0.6rem', fontSize: '0.75rem',
                                backgroundColor: t.status === 'on_leave' ? '#64748b' : '',
                                color: t.status === 'on_leave' ? '#fff' : '',
                                opacity: t.status === 'on_leave' ? 1 : 0.65
                              }}
                              onClick={() => handleMarkTeacherStatus(t.teacher_id, 'on_leave')}
                            >
                              On Leave
                            </button>
                          </div>
                        </td>
                        <td>
                          <input type="text" value={t.remarks || ''} onChange={(e) => handleTeacherRemarksChange(t.teacher_id, e.target.value)} placeholder="Add comments..." className="attendance-input-36"  />
                        </td>
                      </tr>
                    ))}
                    {tchrRecords.length === 0 && (
                      <tr>
                        <td colSpan={5} className="attendance-td-37">
                          <UserCheck size={32} className="attendance-UserCheck-38"  />
                          No active teachers found in the directory.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="attendance-mobile-cards">
                {tchrRecords.map((t) => (
                  <div key={t.teacher_id} className="card attendance-mobile-card">
                    <div className="attendance-row-40">
                      <div>
                        <span className="attendance-span-41">ID: {t.employee_id}</span>
                        <h4 className="attendance-title-42">{t.first_name} {t.last_name}</h4>
                        <span className="attendance-span-43">{t.department} · {t.designation}</span>
                      </div>
                      <div>
                        <span className={`badge ${ t.status === 'present' ? 'badge-success' : t.status === 'absent' ? 'badge-danger' : t.status === 'half_day' ? 'badge-warning' : 'badge-secondary' } attendance-span-44`}>
                          {t.status}
                        </span>
                      </div>
                    </div>

                    <div className="attendance-grid-45">
                      <button
                        type="button"
                        className={`btn btn-sm ${t.status === 'present' ? 'btn-success' : 'btn-secondary'}`}
                        style={{ padding: '0.4rem 0.25rem', fontSize: '0.72rem', opacity: t.status === 'present' ? 1 : 0.65 }}
                        onClick={() => handleMarkTeacherStatus(t.teacher_id, 'present')}
                      >
                        Present
                      </button>
                      <button
                        type="button"
                        className={`btn btn-sm ${t.status === 'absent' ? 'btn-danger' : 'btn-secondary'}`}
                        style={{ padding: '0.4rem 0.25rem', fontSize: '0.72rem', opacity: t.status === 'absent' ? 1 : 0.65 }}
                        onClick={() => handleMarkTeacherStatus(t.teacher_id, 'absent')}
                      >
                        Absent
                      </button>
                      <button
                        type="button"
                        className={`btn btn-sm ${t.status === 'half_day' ? 'btn-warning' : 'btn-secondary'}`}
                        style={{ padding: '0.4rem 0.25rem', fontSize: '0.72rem', opacity: t.status === 'half_day' ? 1 : 0.65 }}
                        onClick={() => handleMarkTeacherStatus(t.teacher_id, 'half_day')}
                      >
                        Half Day
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-secondary"
                        style={{
                          padding: '0.4rem 0.25rem', fontSize: '0.72rem',
                          backgroundColor: t.status === 'on_leave' ? '#64748b' : '',
                          color: t.status === 'on_leave' ? '#fff' : '',
                          opacity: t.status === 'on_leave' ? 1 : 0.65
                        }}
                        onClick={() => handleMarkTeacherStatus(t.teacher_id, 'on_leave')}
                      >
                        Leave
                      </button>
                    </div>

                    <div>
                      <input type="text" value={t.remarks || ''} onChange={(e) => handleTeacherRemarksChange(t.teacher_id, e.target.value)} placeholder="Add remarks..." className="attendance-input-46"  />
                    </div>
                  </div>
                ))}
                {tchrRecords.length === 0 && (
                  <p className="attendance-text-47">No teachers found.</p>
                )}
              </div>
            </>
          )}
        </div>
      </>
    );
  };

  return (
    <Layout>
      <PageGuidance
        title="Institutional Attendance Registry"
        description="Daily registry workspace for tracking student and staff attendances. Set daily class registers, log teacher check-ins, record sick leaves/excuses, and sync balances."
        steps={[
          "Select Student Attendance to create or open specific subject-class period registers.",
          "Mark individual status pins (Present, Absent, Late) and save the registers.",
          "Switch to Staff Attendance to log check-in structures for teaching staff."
        ]}
      />

      <div className="page-header attendance-root-header">
        <div>
          <h2>Attendance Register</h2>
          <p className="attendance-text-49">
            Verify daily attendance sessions for students and institutional teaching staff
          </p>
        </div>
      </div>

      {/* PILL TABS switcher */}
      {canManageTeachers && (
        <div className="page-tabs">
          <button
            className={`page-tab ${activeTab === 'students' ? 'active' : ''}`}
            onClick={() => handleTabChange('students')}
          >
            Student Attendance
          </button>
          <button
            className={`page-tab ${activeTab === 'teachers' ? 'active' : ''}`}
            onClick={() => handleTabChange('teachers')}
          >
            Teacher Attendance
          </button>
        </div>
      )}

      {/* RENDER ACTIVE TAB */}
      {activeTab === 'students' && renderStudentAttendance()}
      {activeTab === 'teachers' && renderTeacherAttendance()}
    </Layout>
  );
}
