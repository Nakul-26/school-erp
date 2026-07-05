import './TeacherDashboard.css';
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
          <div className="icon teacher-dashboard-icon">
            <Calendar size={24} />
          </div>
          <div className="info">
            <h3>Classes Today</h3>
            <div className="value">{stats?.classesToday || 0}</div>
          </div>
        </div>
        
        <div className="stat-card card">
          <div className="icon teacher-dashboard-icon">
            <Users size={24} />
          </div>
          <div className="info">
            <h3>My Students</h3>
            <div className="value">{stats?.totalStudents || 0}</div>
          </div>
        </div>
        
        <div className="stat-card card">
          <div className="icon teacher-dashboard-icon">
            <Award size={24} />
          </div>
          <div className="info">
            <h3>Pending Marks Entry</h3>
            <div className="value">{stats?.pendingMarks || 0}</div>
          </div>
        </div>
      </div>

      <div className="teacher-actions card teacher-dashboard-teacher-actions">
        <h3>Quick Controls</h3>
        <div className="quick-actions-grid teacher-dashboard-quick-actions-grid">
          <Link to="/attendance" className="action-btn teacher-dashboard-action-btn">
            <FileSpreadsheet size={24} className="teacher-dashboard-FileSpreadsheet-7"  />
            <span className="teacher-dashboard-span-8">Mark Student Attendance</span>
          </Link>
          <Link to="/exams" className="action-btn teacher-dashboard-action-btn">
            <Award size={24} className="teacher-dashboard-Award-10"  />
            <span className="teacher-dashboard-span-11">Enter Exam Marks</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
