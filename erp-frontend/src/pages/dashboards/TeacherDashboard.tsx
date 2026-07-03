import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Users, Award, FileSpreadsheet } from 'lucide-react';

interface TeacherDashboardProps {
  stats: any;
}

export default function TeacherDashboard({ stats }: TeacherDashboardProps) {
  return (
    <div className="portal-dashboard">
      <div className="stats-grid">
        <div className="stat-card card">
          <div className="icon" style={{ background: 'rgba(79, 70, 229, 0.1)', color: 'var(--primary)' }}>
            <Calendar size={24} />
          </div>
          <div className="info">
            <h3>Classes Today</h3>
            <div className="value">{stats?.classesToday || 0}</div>
          </div>
        </div>
        
        <div className="stat-card card">
          <div className="icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' }}>
            <Users size={24} />
          </div>
          <div className="info">
            <h3>My Students</h3>
            <div className="value">{stats?.totalStudents || 0}</div>
          </div>
        </div>
        
        <div className="stat-card card">
          <div className="icon" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)' }}>
            <Award size={24} />
          </div>
          <div className="info">
            <h3>Pending Marks Entry</h3>
            <div className="value">{stats?.pendingMarks || 0}</div>
          </div>
        </div>
      </div>

      <div className="teacher-actions card" style={{ marginTop: '2rem' }}>
        <h3>Quick Controls</h3>
        <div className="quick-actions-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
          <Link to="/attendance" className="action-btn" style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '1.5rem',
            background: '#f8fafc',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-main)',
            textDecoration: 'none',
            transition: 'all 0.2s'
          }}>
            <FileSpreadsheet size={24} style={{ color: 'var(--primary)' }} />
            <span style={{ fontWeight: 600 }}>Mark Student Attendance</span>
          </Link>
          <Link to="/exams" className="action-btn" style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '1.5rem',
            background: '#f8fafc',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-main)',
            textDecoration: 'none',
            transition: 'all 0.2s'
          }}>
            <Award size={24} style={{ color: 'var(--success)' }} />
            <span style={{ fontWeight: 600 }}>Enter Exam Marks</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
