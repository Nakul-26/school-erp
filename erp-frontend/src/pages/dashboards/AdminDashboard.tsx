import './AdminDashboard.css';
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Clock, IndianRupee, Award, CheckCircle, BellRing, BellOff } from 'lucide-react';
import { api } from '../../services/api';

interface AdminDashboardProps {
  stats: any;
}

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
};

export default function AdminDashboard({ stats }: AdminDashboardProps) {
  const [adoption, setAdoption] = useState<{ students: any; parents: any } | null>(null);

  useEffect(() => {
    api.get('/notifications/push/adoption')
      .then(data => setAdoption(data))
      .catch(() => setAdoption(null));
  }, []);

  const renderAdoptionBar = (label: string, enabled: number, total: number) => {
    const pct = total > 0 ? Math.round((enabled / total) * 100) : 0;
    return (
      <div style={{ marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.3rem' }}>
          <span style={{ fontWeight: '600' }}>{label}</span>
          <span style={{ color: 'var(--text-secondary)' }}>{enabled}/{total} ({pct}%)</span>
        </div>
        <div style={{ background: 'var(--bg-subtle)', borderRadius: '4px', height: '8px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: pct >= 60 ? '#22c55e' : pct >= 30 ? '#f59e0b' : '#ef4444', borderRadius: '4px', transition: 'width 0.5s ease' }} />
        </div>
      </div>
    );
  };

  return (
    <div className="portal-dashboard">
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
          <div className="icon admin-dashboard-icon-students">
            <Users size={24} />
          </div>
          <div className="info">
            <h3>Total Students</h3>
            <div className="value">{stats?.totalStudents || 0}</div>
          </div>
        </div>
        
        <div className="stat-card card">
          <div className="icon admin-dashboard-icon-teachers">
            <Users size={24} />
          </div>
          <div className="info">
            <h3>Total Teachers</h3>
            <div className="value">{stats?.totalTeachers || 0}</div>
          </div>
        </div>
        
        <div className="stat-card card">
          <div className="icon admin-dashboard-icon-attendance">
            <Clock size={24} />
          </div>
          <div className="info">
            <h3>Overall Attendance</h3>
            <div className="value">{stats?.overallAttendance || 0}%</div>
          </div>
        </div>
        
        <div className="stat-card card">
          <div className="icon admin-dashboard-icon-fees">
            <IndianRupee size={24} />
          </div>
          <div className="info">
            <h3>Fee Collection</h3>
            <div className="value">{formatCurrency(stats?.feeCollection || 0)}</div>
          </div>
        </div>

        <div className="stat-card card">
          <div className="icon admin-dashboard-icon-exams">
            <Award size={24} />
          </div>
          <div className="info">
            <h3>Upcoming Exams</h3>
            <div className="value">{stats?.upcomingExams || 0}</div>
          </div>
        </div>
      </div>

      {/* Notification Adoption Panel */}
      {adoption && (
        <div className="card" style={{ padding: '1.25rem', marginTop: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <BellRing size={18} style={{ color: 'var(--primary)' }} />
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '700' }}>Push Notification Adoption</h3>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 1rem 0' }}>
            How many students and parents have enabled push notifications on their devices.
          </p>
          {renderAdoptionBar('Students', adoption.students.enabled, adoption.students.total)}
          {renderAdoptionBar('Parents / Guardians', adoption.parents.enabled, adoption.parents.total)}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <BellRing size={12} style={{ color: '#22c55e' }} /> Students enabled: {adoption.students.enabled}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <BellOff size={12} style={{ color: '#ef4444' }} /> Students disabled: {adoption.students.disabled}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <BellRing size={12} style={{ color: '#22c55e' }} /> Parents enabled: {adoption.parents.enabled}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <BellOff size={12} style={{ color: '#ef4444' }} /> Parents disabled: {adoption.parents.disabled}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
