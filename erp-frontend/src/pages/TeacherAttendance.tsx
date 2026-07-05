import './TeacherAttendance.css';
import React, { useEffect, useState } from 'react';
import { PageGuidance } from '../components/PageGuidance';
import Layout from '../components/Layout';
import { api } from '../services/api';
import { ArrowLeft, Check, X, Clock, HelpCircle, Calendar, UserCheck } from 'lucide-react';

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

export default function TeacherAttendance() {
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0] || '');
  const [teachers, setTeachers] = useState<TeacherAttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTeacherAttendance();
  }, [date]);

  const fetchTeacherAttendance = async () => {
    try {
      setLoading(true);
      const data = await api.get(`/teacher-attendance?date=${date}`);
      
      // Initialize unmarked teachers as 'present' by default
      const initialized = data.map((t: any) => ({
        ...t,
        status: t.status || 'present'
      }));
      setTeachers(initialized);
    } catch (err) {
      console.error('Error fetching teacher attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkStatus = (teacherId: string, status: 'present' | 'absent' | 'half_day' | 'on_leave') => {
    setTeachers(prev => prev.map(rec => 
      rec.teacher_id === teacherId ? { ...rec, status } : rec
    ));
  };

  const handleRemarksChange = (teacherId: string, remarks: string) => {
    setTeachers(prev => prev.map(rec => 
      rec.teacher_id === teacherId ? { ...rec, remarks } : rec
    ));
  };

  const handleSaveAttendance = async () => {
    try {
      setSaving(true);
      const payload = {
        date,
        records: teachers.map(rec => ({
          teacher_id: rec.teacher_id,
          status: rec.status,
          remarks: rec.remarks
        }))
      };
      await api.post('/teacher-attendance', payload);
      alert('Teacher attendance saved successfully!');
      fetchTeacherAttendance();
    } catch (err) {
      alert('Error saving teacher attendance');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <PageGuidance
        title="Staff Attendance"
        description="Use this page to record daily attendance logs for teachers and school staff."
        steps={["Select the date.","Mark each staff member as Present, Absent, Half Day, or On Leave.","Click Save to log daily staff attendance."]}
      />
      <div className="page-header">
        <div>
          <h2>Teacher Attendance</h2>
          <p className="teacher-attendance-text-1">
            Mark and update daily attendance logs for academic staff
          </p>
        </div>
        <div className="teacher-attendance-row-2">
          <div className="form-group teacher-attendance-form-group">
            <label className="teacher-attendance-label-4"><Calendar size={18} /> Select Date:</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="teacher-attendance-input-5"  />
          </div>
          <button className="btn btn-primary" onClick={handleSaveAttendance} disabled={loading || saving}>
            {saving ? 'Saving...' : 'Save Attendance'}
          </button>
        </div>
      </div>

      <div className="card">
        {loading ? <p>Loading staff list...</p> : (
          <table className="table">
            <thead>
              <tr>
                <th>Emp ID</th>
                <th>Teacher Name</th>
                <th>Department</th>
                <th>Designation</th>
                <th>Status</th>
                <th className="teacher-attendance-th-6">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {teachers.map((rec) => (
                <tr key={rec.teacher_id}>
                  <td><strong>{rec.employee_id}</strong></td>
                  <td>{rec.first_name} {rec.last_name}</td>
                  <td>{rec.department || '-'}</td>
                  <td>{rec.designation || '-'}</td>
                  <td>
                    <div className="teacher-attendance-row-7">
                      <button type="button" className={`btn btn-sm ${rec.status === 'present' ? 'btn-success' : 'btn-outline'} teacher-attendance-row-8`} onClick={() => handleMarkStatus(rec.teacher_id, 'present')}>
                        <Check size={12} /> Present
                      </button>
                      <button type="button" className={`btn btn-sm ${rec.status === 'absent' ? 'btn-danger' : 'btn-outline'} teacher-attendance-row-9`} onClick={() => handleMarkStatus(rec.teacher_id, 'absent')}>
                        <X size={12} /> Absent
                      </button>
                      <button type="button" className={`btn btn-sm ${rec.status === 'half_day' ? 'btn-warning' : 'btn-outline'} teacher-attendance-row-10`} onClick={() => handleMarkStatus(rec.teacher_id, 'half_day')}>
                        <Clock size={12} /> Half Day
                      </button>
                      <button
                        type="button"
                        className={`btn btn-sm ${rec.status === 'on_leave' ? 'btn-secondary' : 'btn-outline'}`}
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '0.25rem', 
                          padding: '0.4rem 0.6rem',
                          backgroundColor: rec.status === 'on_leave' ? '#64748b' : '',
                          color: rec.status === 'on_leave' ? '#fff' : ''
                        }}
                        onClick={() => handleMarkStatus(rec.teacher_id, 'on_leave')}
                      >
                        <HelpCircle size={12} /> On Leave
                      </button>
                    </div>
                  </td>
                  <td>
                    <input type="text" value={rec.remarks || ''} onChange={(e) => handleRemarksChange(rec.teacher_id, e.target.value)} placeholder="e.g. sick leave" className="teacher-attendance-input-11"  />
                  </td>
                </tr>
              ))}
              {teachers.length === 0 && (
                <tr>
                  <td colSpan={6} className="teacher-attendance-td-12">
                    <UserCheck size={32} className="teacher-attendance-UserCheck-13"  />
                    <p className="teacher-attendance-text-14">No teachers registered in the system yet.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  );
}
