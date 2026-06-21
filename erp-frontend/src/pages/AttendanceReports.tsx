import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { api } from '../services/api';
import { ClipboardCheck, FileSpreadsheet, Percent, Users, AlertTriangle } from 'lucide-react';

interface StudentAttendanceReportRow {
  student_id: string;
  first_name: string;
  last_name: string;
  roll_number: string | null;
  admission_number: string;
  total_sessions: number;
  present_count: number;
  absent_count: number;
  late_count: number;
  excused_count: number;
}

export default function AttendanceReports() {
  const [sections, setSections] = useState<any[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const [report, setReport] = useState<StudentAttendanceReportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    fetchSections();
  }, []);

  useEffect(() => {
    if (selectedSectionId) {
      fetchReport();
    } else {
      setReport([]);
    }
  }, [selectedSectionId]);

  const fetchSections = async () => {
    try {
      const data = await api.get('/sections');
      setSections(data);
      if (data.length > 0) {
        setSelectedSectionId(data[0].id);
      }
    } catch (err) {
      console.error('Error fetching sections:', err);
    } finally {
      setInitialLoading(false);
    }
  };

  const fetchReport = async () => {
    try {
      setLoading(true);
      const data = await api.get(`/attendance/reports/students?section_id=${selectedSectionId}`);
      setReport(data);
    } catch (err) {
      console.error('Error fetching attendance report:', err);
    } finally {
      setLoading(false);
    }
  };

  // Helper calculations
  const totalStudents = report.length;
  const classAverage = totalStudents > 0 
    ? report.reduce((acc, curr) => {
        const totalMarked = curr.total_sessions;
        const pct = totalMarked > 0 ? (curr.present_count / totalMarked) * 100 : 100;
        return acc + pct;
      }, 0) / totalStudents
    : 0;

  const lowAttendanceCount = report.filter(curr => {
    const totalMarked = curr.total_sessions;
    const pct = totalMarked > 0 ? (curr.present_count / totalMarked) * 100 : 100;
    return pct < 75;
  }).length;

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h2>Student Attendance Reports</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Analyze attendance metrics and identify low-attendance risk groups
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {initialLoading ? <p>Loading...</p> : (
            <div className="form-group" style={{ margin: 0, flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
              <label style={{ whiteSpace: 'nowrap' }}>Select Class / Section:</label>
              <select
                value={selectedSectionId}
                onChange={(e) => setSelectedSectionId(e.target.value)}
                style={{ width: 'auto', padding: '0.5rem 1.5rem' }}
              >
                <option value="">-- Select Section --</option>
                {sections.map(s => <option key={s.id} value={s.id}>{s.name} (Year {s.year_number})</option>)}
              </select>
            </div>
          )}
        </div>
      </div>

      {selectedSectionId && report.length > 0 && (
        <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          <div className="stat-card card">
            <div className="icon" style={{ background: '#e6f7ff', color: '#1890ff', width: '50px', height: '50px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Users size={24} /></div>
            <div className="info">
              <h3 style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>Total Students</h3>
              <div className="value" style={{ fontSize: '1.5rem', fontWeight: 'bold', marginTop: '0.25rem' }}>{totalStudents}</div>
            </div>
          </div>
          <div className="stat-card card">
            <div className="icon" style={{ background: '#f6ffed', color: '#52c41a', width: '50px', height: '50px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Percent size={24} /></div>
            <div className="info">
              <h3 style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>Class Average</h3>
              <div className="value" style={{ fontSize: '1.5rem', fontWeight: 'bold', marginTop: '0.25rem' }}>{classAverage.toFixed(1)}%</div>
            </div>
          </div>
          <div className="stat-card card">
            <div className="icon" style={{ background: '#fff1f0', color: '#f5222d', width: '50px', height: '50px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><AlertTriangle size={24} /></div>
            <div className="info">
              <h3 style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>Below 75% Limit</h3>
              <div className="value" style={{ fontSize: '1.5rem', fontWeight: 'bold', marginTop: '0.25rem', color: '#f5222d' }}>{lowAttendanceCount} students</div>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        {loading ? <p>Loading report data...</p> : !selectedSectionId ? (
          <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            Please select a section to view the attendance report.
          </p>
        ) : report.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            No enrollment or session data found for this class.
          </p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Roll Number</th>
                <th>Student Name</th>
                <th>Admission No</th>
                <th>Conducted</th>
                <th>Present</th>
                <th>Absent</th>
                <th>Late</th>
                <th>Excused</th>
                <th>Attendance %</th>
              </tr>
            </thead>
            <tbody>
              {report.map((row) => {
                const percentage = row.total_sessions > 0 ? (row.present_count / row.total_sessions) * 100 : 100;
                let badgeClass = 'badge-success';
                let progressColor = 'var(--success)';
                if (percentage < 75) {
                  badgeClass = 'badge-danger';
                  progressColor = 'var(--danger)';
                } else if (percentage < 85) {
                  badgeClass = 'badge-warning';
                  progressColor = 'var(--warning)';
                }

                return (
                  <tr key={row.student_id}>
                    <td><strong>{row.roll_number || '-'}</strong></td>
                    <td>{row.first_name} {row.last_name}</td>
                    <td>{row.admission_number}</td>
                    <td>{row.total_sessions}</td>
                    <td>{row.present_count}</td>
                    <td>{row.absent_count}</td>
                    <td>{row.late_count}</td>
                    <td>{row.excused_count}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: '80px', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${percentage}%`, height: '100%', background: progressColor }} />
                        </div>
                        <span className={`badge ${badgeClass}`}>
                          {percentage.toFixed(1)}%
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
