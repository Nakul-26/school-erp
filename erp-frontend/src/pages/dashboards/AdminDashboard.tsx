import './AdminDashboard.css';
import React from 'react';
import { Link } from 'react-router-dom';
import { Users, Clock, IndianRupee, Award, CheckCircle } from 'lucide-react';

interface AdminDashboardProps {
  stats: any;
}

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
};

export default function AdminDashboard({ stats }: AdminDashboardProps) {
  return (
    <div className="portal-dashboard">

      return (
        <div style={{ background: "red", color: "white", padding: 50 }}>
          ADMIN DASHBOARD TEST
        </div>
      );
      
      {/* Setup Checklist */}
      {(!(stats?.totalStudents) || !(stats?.totalTeachers)) && (
        <div className="setup-checklist admin-dashboard-setup-checklist">
          <div className="setup-checklist-header">
            <div className="setup-checklist-icon">
              <CheckCircle size={20} />
            </div>
            <div>
              <div className="setup-checklist-title">Get your school set up</div>
              <div className="setup-checklist-subtitle">Complete these steps to start using all features</div>
            </div>
          </div>
          <div className="setup-checklist-steps">
            {([
              { label: 'School Profile', desc: 'Add your school name and basic info', to: '/institution-setup', done: true },
              { label: 'Set Up School Year', desc: 'Create the current academic year', to: '/academic-years', done: !!(stats?.upcomingExams > 0 || stats?.totalStudents > 0) },
              { label: 'Add Classes & Subjects', desc: 'Define classes, sections, and subjects', to: '/classes', done: false },
              { label: 'Add Teachers', desc: 'Invite your teaching staff', to: '/teachers', done: !!(stats?.totalTeachers > 0) },
              { label: 'Admit First Students', desc: 'Add students and assign them to classes', to: '/students', done: !!(stats?.totalStudents > 0) },
            ] as { label: string; desc: string; to: string; done: boolean }[]).map((step, i) => (
              <Link key={i} to={step.to} className={`setup-step${step.done ? ' setup-step-done' : ''}`}>
                <div className={`setup-step-icon ${step.done ? 'setup-step-icon-done' : 'setup-step-icon-pending'}`}>
                  {step.done ? '\u2713' : (i + 1)}
                </div>
                <div className="setup-step-body">
                  <div className="setup-step-label">{step.label}</div>
                  <div className="setup-step-desc">{step.desc}</div>
                </div>
                {!step.done && <div className="setup-step-cta">Start →</div>}
              </Link>
            ))}
          </div>
        </div>
      )}
      <div className="stats-grid">
        <div className="stat-card card">
          <div className="icon admin-dashboard-icon">
            <Users size={24} />
          </div>
          <div className="info">
            <h3>Total Students</h3>
            <div className="value">{stats?.totalStudents || 0}</div>
          </div>
        </div>
        
        <div className="stat-card card">
          <div className="icon admin-dashboard-icon">
            <Users size={24} />
          </div>
          <div className="info">
            <h3>Total Teachers</h3>
            <div className="value">{stats?.totalTeachers || 0}</div>
          </div>
        </div>
        
        <div className="stat-card card">
          <div className="icon admin-dashboard-icon">
            <Clock size={24} />
          </div>
          <div className="info">
            <h3>Overall Attendance</h3>
            <div className="value">{stats?.overallAttendance || 0}%</div>
          </div>
        </div>
        
        <div className="stat-card card">
          <div className="icon admin-dashboard-icon">
            <IndianRupee size={24} />
          </div>
          <div className="info">
            <h3>Fee Collection</h3>
            <div className="value">{formatCurrency(stats?.feeCollection || 0)}</div>
          </div>
        </div>

        <div className="stat-card card">
          <div className="icon admin-dashboard-icon">
            <Award size={24} />
          </div>
          <div className="info">
            <h3>Upcoming Exams</h3>
            <div className="value">{stats?.upcomingExams || 0}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
