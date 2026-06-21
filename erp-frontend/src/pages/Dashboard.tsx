import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { 
  Users, 
  BookOpen, 
  Clock, 
  TrendingUp, 
  LogOut, 
  Award, 
  Megaphone, 
  Bell, 
  Calendar, 
  IndianRupee, 
  AlertTriangle, 
  CheckCircle,
  AlertCircle,
  FileSpreadsheet
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { user, logout } = useAuth();
  
  // Dashboard data states
  const [stats, setStats] = useState<any>(null);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Parent state for active child
  const [selectedChildIndex, setSelectedChildIndex] = useState(0);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch stats, announcements, and notifications in parallel
      const [statsData, annData, notifData] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/announcements').catch(() => []),
        api.get('/notifications').catch(() => [])
      ]);
      
      setStats(statsData);
      setAnnouncements(annData);
      setNotifications(notifData);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to load dashboard overview.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  const renderAdminDashboard = () => {
    return (
      <div className="portal-dashboard">
        <div className="stats-grid">
          <div className="stat-card card">
            <div className="icon" style={{ background: 'rgba(79, 70, 229, 0.1)', color: 'var(--primary)' }}>
              <Users size={24} />
            </div>
            <div className="info">
              <h3>Total Students</h3>
              <div className="value">{stats?.totalStudents || 0}</div>
            </div>
          </div>
          
          <div className="stat-card card">
            <div className="icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' }}>
              <Users size={24} />
            </div>
            <div className="info">
              <h3>Total Teachers</h3>
              <div className="value">{stats?.totalTeachers || 0}</div>
            </div>
          </div>
          
          <div className="stat-card card">
            <div className="icon" style={{ background: 'rgba(245, 185, 11, 0.1)', color: 'var(--warning)' }}>
              <Clock size={24} />
            </div>
            <div className="info">
              <h3>Overall Attendance</h3>
              <div className="value">{stats?.overallAttendance || 0}%</div>
            </div>
          </div>
          
          <div className="stat-card card">
            <div className="icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' }}>
              <IndianRupee size={24} />
            </div>
            <div className="info">
              <h3>Fee Collection</h3>
              <div className="value">{formatCurrency(stats?.feeCollection || 0)}</div>
            </div>
          </div>

          <div className="stat-card card">
            <div className="icon" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)' }}>
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
  };

  const renderTeacherDashboard = () => {
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
          <div className="quick-actions-grid">
            <Link to="/attendance" className="action-btn">
              <FileSpreadsheet size={20} />
              <span>Mark Student Attendance</span>
            </Link>
            <Link to="/exams" className="action-btn">
              <Award size={20} />
              <span>Enter Exam Marks</span>
            </Link>
          </div>
        </div>
      </div>
    );
  };

  const renderStudentDashboard = () => {
    const sInfo = stats?.studentInfo;
    const att = stats?.attendance;
    const fees = stats?.fees;
    const results = stats?.results || [];

    return (
      <div className="portal-dashboard student-portal">
        <div className="stats-grid">
          {/* Attendance Overview */}
          <div className="stat-card card">
            <div className="icon" style={{ background: 'rgba(79, 70, 229, 0.1)', color: 'var(--primary)' }}>
              <Clock size={24} />
            </div>
            <div className="info">
              <h3>Attendance %</h3>
              <div className="value">{att?.percentage || 0}%</div>
              <span className="sub-text">{att?.present || 0} of {att?.total || 0} sessions present</span>
            </div>
          </div>

          {/* Dues Status */}
          <div className="stat-card card">
            <div className="icon" style={{ 
              background: (fees?.due > 0) ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', 
              color: (fees?.due > 0) ? 'var(--danger)' : 'var(--success)' 
            }}>
              <IndianRupee size={24} />
            </div>
            <div className="info">
              <h3>Outstanding Dues</h3>
              <div className="value">{formatCurrency(fees?.due || 0)}</div>
              <span className="sub-text">Paid: {formatCurrency(fees?.paid || 0)} / Total: {formatCurrency(fees?.total || 0)}</span>
            </div>
          </div>
        </div>

        {/* Exam Results Summary */}
        <div className="card dashboard-section" style={{ marginTop: '2rem' }}>
          <h3>Latest Exam Results</h3>
          {results.length === 0 ? (
            <p className="no-data">No exam results published yet.</p>
          ) : (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Exam</th>
                    <th>Subject</th>
                    <th>Marks</th>
                    <th>Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r: any, idx: number) => {
                    const percentage = Math.round((r.marks_obtained / r.max_marks) * 100);
                    return (
                      <tr key={idx}>
                        <td><strong>{r.exam_name}</strong></td>
                        <td>{r.subject_name}</td>
                        <td>{r.marks_obtained} / {r.max_marks}</td>
                        <td>
                          <span className={`badge ${percentage >= 40 ? 'badge-success' : 'badge-danger'}`}>
                            {percentage}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderParentDashboard = () => {
    const children = stats?.children || [];
    if (children.length === 0) {
      return (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <AlertCircle size={48} style={{ color: 'var(--secondary)', marginBottom: '1rem' }} />
          <h3>No Children Linked</h3>
          <p>Please contact your institution administration to link your parent account with your children.</p>
        </div>
      );
    }

    const activeChild = children[selectedChildIndex];
    const results = activeChild?.results || [];

    return (
      <div className="portal-dashboard parent-portal">
        {/* Child Selector Tabs */}
        {children.length > 1 && (
          <div className="child-selector">
            {children.map((child: any, idx: number) => (
              <button
                key={child.student_id}
                className={`child-tab ${selectedChildIndex === idx ? 'active' : ''}`}
                onClick={() => setSelectedChildIndex(idx)}
              >
                {child.name}
              </button>
            ))}
          </div>
        )}

        <div className="selected-child-overview">
          <div className="welcome-section card" style={{ background: '#f1f5f9', color: 'var(--text-main)', marginBottom: '2rem' }}>
            <h4>Overview for: <strong>{activeChild.name}</strong></h4>
            <p>Roll No: {activeChild.roll_number || 'N/A'} | Relationship: {activeChild.relationship}</p>
          </div>

          <div className="stats-grid">
            {/* Child Attendance */}
            <div className="stat-card card">
              <div className="icon" style={{ background: 'rgba(79, 70, 229, 0.1)', color: 'var(--primary)' }}>
                <Clock size={24} />
              </div>
              <div className="info">
                <h3>Attendance %</h3>
                <div className="value">{activeChild.attendance?.percentage || 0}%</div>
                <span className="sub-text">
                  Present: {activeChild.attendance?.present} of {activeChild.attendance?.total} classes
                </span>
              </div>
            </div>

            {/* Child Fees Status */}
            <div className="stat-card card">
              <div className="icon" style={{ 
                background: (activeChild.fees?.due > 0) ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', 
                color: (activeChild.fees?.due > 0) ? 'var(--danger)' : 'var(--success)' 
              }}>
                <IndianRupee size={24} />
              </div>
              <div className="info">
                <h3>Outstanding Fees</h3>
                <div className="value">{formatCurrency(activeChild.fees?.due || 0)}</div>
                <span className="sub-text">
                  Paid: {formatCurrency(activeChild.fees?.paid || 0)} / Total: {formatCurrency(activeChild.fees?.total || 0)}
                </span>
              </div>
            </div>
          </div>

          {/* Child Results Table */}
          <div className="card dashboard-section" style={{ marginTop: '2rem' }}>
            <h3>Academic Performance (Latest Results)</h3>
            {results.length === 0 ? (
              <p className="no-data">No results published yet for this student.</p>
            ) : (
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Exam</th>
                      <th>Subject</th>
                      <th>Marks</th>
                      <th>Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r: any, idx: number) => {
                      const percentage = Math.round((r.marks_obtained / r.max_marks) * 100);
                      return (
                        <tr key={idx}>
                          <td><strong>{r.exam_name}</strong></td>
                          <td>{r.subject_name}</td>
                          <td>{r.marks_obtained} / {r.max_marks}</td>
                          <td>
                            <span className={`badge ${percentage >= 40 ? 'badge-success' : 'badge-danger'}`}>
                              {percentage}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const getPortalRoleLabel = () => {
    if (stats?.role === 'admin') return 'Administrator';
    if (stats?.role === 'teacher') return 'Teaching Faculty';
    if (stats?.role === 'student') return 'Student Portal';
    if (stats?.role === 'parent') return 'Parent/Guardian Portal';
    return user?.role || 'User';
  };

  return (
    <Layout>
      <div className="page-header">
        <h1>Dashboard Overview</h1>
        <button className="btn btn-outline" onClick={logout}>
          <LogOut size={18} /> Logout
        </button>
      </div>

      {loading ? (
        <div className="loading-state">
          <p>Analyzing statistics & loading portal details...</p>
        </div>
      ) : error ? (
        <div className="alert alert-danger" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      ) : (
        <>
          <div className="welcome-section card" style={{ background: 'var(--primary-gradient)', color: 'white', marginBottom: '2rem' }}>
            <h2>Welcome back, {user?.name || user?.email}!</h2>
            <p>You are viewing the <strong>{getPortalRoleLabel()}</strong> panel. Here is your summary checklist for today.</p>
          </div>

          {/* Render Portal Dashboard View */}
          {stats?.role === 'admin' && renderAdminDashboard()}
          {stats?.role === 'teacher' && renderTeacherDashboard()}
          {stats?.role === 'student' && renderStudentDashboard()}
          {stats?.role === 'parent' && renderParentDashboard()}

          {/* General Bottom Section: Announcements & Notifications */}
          <div className="dashboard-grid" style={{ marginTop: '2.5rem' }}>
            {/* Announcements Card */}
            <div className="card dashboard-card-full">
              <div className="card-header-icon">
                <Megaphone className="header-icon" style={{ color: 'var(--primary)' }} />
                <h3>Latest Announcements</h3>
              </div>
              {announcements.length === 0 ? (
                <p className="no-data">No active announcements for your role.</p>
              ) : (
                <div className="announcements-list">
                  {announcements.slice(0, 5).map((ann: any) => (
                    <div key={ann.id} className="announcement-item">
                      <div className="ann-title">
                        <h4>{ann.title}</h4>
                        <span className="ann-date">{new Date(ann.created_at).toLocaleDateString()}</span>
                      </div>
                      <p>{ann.content}</p>
                    </div>
                  ))}
                  {announcements.length > 5 && (
                    <Link to="/announcements" className="view-all-link">
                      View all announcements &rarr;
                    </Link>
                  )}
                </div>
              )}
            </div>

            {/* Notifications Card */}
            <div className="card dashboard-card-full">
              <div className="card-header-icon">
                <Bell className="header-icon" style={{ color: 'var(--warning)' }} />
                <h3>Notifications</h3>
              </div>
              {notifications.length === 0 ? (
                <p className="no-data">No unread notifications.</p>
              ) : (
                <div className="notifications-list">
                  {notifications.slice(0, 5).map((notif: any) => (
                    <div key={notif.id} className={`notification-item ${notif.is_read ? 'read' : 'unread'}`}>
                      <div className="notif-content">
                        <strong>{notif.title}</strong>
                        <p>{notif.message}</p>
                      </div>
                      <span className="notif-date">{new Date(notif.created_at).toLocaleDateString()}</span>
                    </div>
                  ))}
                  {notifications.length > 5 && (
                    <Link to="/notifications" className="view-all-link">
                      View all notifications &rarr;
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <style>{`
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 1.5rem;
        }
        .stat-card {
          display: flex;
          align-items: center;
          gap: 1.25rem;
          padding: 1.5rem;
        }
        .stat-card .icon {
          width: 48px;
          height: 48px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .stat-card .info h3 {
          margin: 0;
          font-size: 0.825rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-muted);
        }
        .stat-card .info .value {
          font-size: 1.5rem;
          font-weight: 800;
          margin-top: 0.25rem;
          color: var(--text-main);
        }
        .stat-card .info .sub-text {
          font-size: 0.725rem;
          color: var(--text-muted);
          display: block;
          margin-top: 0.15rem;
        }
        .loading-state {
          padding: 4rem;
          text-align: center;
          color: var(--text-muted);
        }
        .dashboard-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
          gap: 2rem;
        }
        .card-header-icon {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1.25rem;
          border-bottom: 1px solid var(--border);
          padding-bottom: 0.75rem;
        }
        .card-header-icon h3 {
          font-size: 1rem;
          font-weight: 700;
          margin: 0;
        }
        .header-icon {
          width: 20px;
          height: 20px;
        }
        .announcements-list, .notifications-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .announcement-item, .notification-item {
          padding: 1rem;
          border-radius: var(--radius-sm);
          background: #f8fafc;
          border-left: 3px solid var(--primary);
        }
        .notification-item.read {
          opacity: 0.7;
          border-left-color: var(--secondary);
        }
        .ann-title {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.5rem;
        }
        .ann-title h4 {
          font-size: 0.9rem;
          font-weight: 700;
          margin: 0;
        }
        .ann-date, .notif-date {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        .announcement-item p, .notif-content p {
          font-size: 0.825rem;
          color: var(--text-muted);
          margin-top: 0.25rem;
          line-height: 1.4;
        }
        .view-all-link {
          text-align: center;
          font-size: 0.825rem;
          color: var(--primary);
          text-decoration: none;
          font-weight: 600;
          margin-top: 0.5rem;
        }
        .no-data {
          color: var(--text-muted);
          font-size: 0.875rem;
          text-align: center;
          padding: 2rem 0;
        }
        .quick-actions-grid {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
        }
        .action-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.25rem;
          border-radius: var(--radius-sm);
          background: #f1f5f9;
          color: var(--text-main);
          text-decoration: none;
          font-weight: 600;
          font-size: 0.875rem;
          transition: all 0.2s;
          border: 1px solid var(--border);
        }
        .action-btn:hover {
          background: var(--primary);
          color: white;
          border-color: var(--primary);
        }
        .child-selector {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
          border-bottom: 1px solid var(--border);
          padding-bottom: 0.75rem;
        }
        .child-tab {
          padding: 0.5rem 1rem;
          border-radius: 20px;
          border: 1px solid var(--border);
          background: white;
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-muted);
          transition: all 0.2s;
        }
        .child-tab.active {
          background: var(--primary);
          color: white;
          border-color: var(--primary);
        }
        .table-responsive {
          margin-top: 1rem;
          overflow-x: auto;
        }
        .table {
          width: 100%;
          border-collapse: collapse;
        }
        .table th, .table td {
          padding: 0.75rem 1rem;
          text-align: left;
          font-size: 0.875rem;
          border-bottom: 1px solid var(--border);
        }
        .table th {
          font-weight: 600;
          color: var(--text-muted);
        }
      `}</style>
    </Layout>
  );
}
