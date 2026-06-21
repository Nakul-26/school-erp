import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { api } from '../services/api';
import { Users, FileBarChart, BookOpen, Clock, Calendar } from 'lucide-react';

interface TeacherWorkloadRow {
  teacher_id: string;
  first_name: string;
  last_name: string;
  employee_id: string;
  designation: string;
  department: string;
  subjects_count: number;
  sections_count: number;
  classes_conducted: number;
  total_attendance_days: number;
  present_days: number;
  half_day_days: number;
  on_leave_days: number;
  absent_days: number;
}

export default function TeacherReports() {
  const [report, setReport] = useState<TeacherWorkloadRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReport();
  }, []);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const data = await api.get('/teachers/reports/workload');
      setReport(data);
    } catch (err) {
      console.error('Error fetching teacher report:', err);
    } finally {
      setLoading(false);
    }
  };

  // Aggregates
  const totalTeachersCount = report.length;
  const avgClassesConducted = totalTeachersCount > 0
    ? report.reduce((acc, curr) => acc + curr.classes_conducted, 0) / totalTeachersCount
    : 0;
  
  const avgAttendance = totalTeachersCount > 0
    ? report.reduce((acc, curr) => {
        const total = curr.total_attendance_days;
        const pct = total > 0 ? ((curr.present_days + curr.half_day_days * 0.5) / total) * 100 : 100;
        return acc + pct;
      }, 0) / totalTeachersCount
    : 100;

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h2>Teacher Workload & Attendance Reports</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Overview of academic workloads, subjects/classes assignments, and faculty attendance
          </p>
        </div>
      </div>

      {!loading && report.length > 0 && (
        <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          <div className="stat-card card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem' }}>
            <div className="icon" style={{ background: '#e6f7ff', color: '#1890ff', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Users size={24} /></div>
            <div className="info">
              <h3 style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>Total Faculty</h3>
              <div className="value" style={{ fontSize: '1.5rem', fontWeight: 'bold', marginTop: '0.25rem' }}>{totalTeachersCount}</div>
            </div>
          </div>
          <div className="stat-card card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem' }}>
            <div className="icon" style={{ background: '#f6ffed', color: '#52c41a', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><BookOpen size={24} /></div>
            <div className="info">
              <h3 style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>Avg Classes Conducted</h3>
              <div className="value" style={{ fontSize: '1.5rem', fontWeight: 'bold', marginTop: '0.25rem' }}>{avgClassesConducted.toFixed(1)} lectures</div>
            </div>
          </div>
          <div className="stat-card card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem' }}>
            <div className="icon" style={{ background: '#fff7e6', color: '#fa8c16', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Clock size={24} /></div>
            <div className="info">
              <h3 style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>Faculty Avg Attendance</h3>
              <div className="value" style={{ fontSize: '1.5rem', fontWeight: 'bold', marginTop: '0.25rem' }}>{avgAttendance.toFixed(1)}%</div>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        {loading ? <p>Loading workload report...</p> : report.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            No teachers or assignment data found.
          </p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Emp ID</th>
                <th>Teacher Name</th>
                <th>Department</th>
                <th>Designation</th>
                <th>Subjects</th>
                <th>Sections</th>
                <th>Lectures Conducted</th>
                <th>Days Logged</th>
                <th>Attendance %</th>
              </tr>
            </thead>
            <tbody>
              {report.map((row) => {
                const total = row.total_attendance_days;
                const percentage = total > 0 ? ((row.present_days + row.half_day_days * 0.5) / total) * 100 : 100;
                let badgeClass = 'badge-success';
                let progressColor = 'var(--success)';
                
                if (percentage < 75) {
                  badgeClass = 'badge-danger';
                  progressColor = 'var(--danger)';
                } else if (percentage < 90) {
                  badgeClass = 'badge-warning';
                  progressColor = 'var(--warning)';
                }

                return (
                  <tr key={row.teacher_id}>
                    <td><strong>{row.employee_id}</strong></td>
                    <td>{row.first_name} {row.last_name}</td>
                    <td>{row.department || '-'}</td>
                    <td>{row.designation || '-'}</td>
                    <td><span className="badge badge-secondary">{row.subjects_count}</span></td>
                    <td><span className="badge badge-secondary">{row.sections_count}</span></td>
                    <td><strong>{row.classes_conducted} lectures</strong></td>
                    <td>{row.total_attendance_days} days</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: '80px', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${percentage}%`, height: '100%', background: progressColor }} />
                        </div>
                        <span className={`badge ${badgeClass}`}>
                          {total > 0 ? `${percentage.toFixed(1)}%` : 'No logs'}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  );
}
