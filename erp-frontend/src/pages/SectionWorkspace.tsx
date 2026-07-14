import './SectionWorkspace.css';
import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import {
  BookOpen, Users, Calendar, Clock, BarChart2, Bell, FolderOpen,
  Settings, Activity, Plus, ArrowLeft, Upload, Trash2, CheckCircle2,
  AlertTriangle, IndianRupee, MapPin, Search, Edit2, Archive,
  MessageSquare, ClipboardCheck, Play, ArrowRight, UserCheck, Shield, HelpCircle, FileText, RefreshCw
} from 'lucide-react';
import { PageGuidance } from '../components/PageGuidance';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  roll_number: string | null;
  admission_number: string;
  email: string | null;
  semester?: number;
}

interface TimetableItem {
  id: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  subject_name: string;
  teacher_name: string;
}

export default function SectionWorkspace() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const activeTab = searchParams.get('tab') || 'students';

  // Section Details
  const [section, setSection] = useState<any>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [timetable, setTimetable] = useState<TimetableItem[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [allTeachers, setAllTeachers] = useState<any[]>([]);
  const [allSubjects, setAllSubjects] = useState<any[]>([]);
  const [allocations, setAllocations] = useState<any[]>([]);
  const [attendanceReport, setAttendanceReport] = useState<any[]>([]);
  const [attendanceSessions, setAttendanceSessions] = useState<any[]>([]);
  const [feeRecords, setFeeRecords] = useState<any[]>([]);

  // Loading States
  const [loading, setLoading] = useState(true);
  const [institutionType, setInstitutionType] = useState<string>('school');

  // Settings Modal Form State
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    name: '',
    room: '',
    capacity: 40,
    class_teacher_id: '',
  });

  // Client-Side Filters
  const [studentsSearch, setStudentsSearch] = useState('');
  const [studentsFilterRisk, setStudentsFilterRisk] = useState(false);

  const getProgramLabel = () => institutionType === 'school' ? 'Class' : 'Program';

  const setActiveTab = (tab: string) => {
    setSearchParams({ tab });
  };

  // Redirect legacy tabs (overview, announcements, documents, timeline, reports) to students tab
  useEffect(() => {
    const legacyTabs = ['overview', 'announcements', 'documents', 'timeline', 'reports'];
    if (legacyTabs.includes(activeTab)) {
      setActiveTab('students');
    }
  }, [activeTab]);

  useEffect(() => {
    fetchWorkspaceData();
  }, [id]);

  const fetchWorkspaceData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Section main details
      const sectionData = await api.get(`/sections/${id}`);
      setSection(sectionData);

      // Pre-fill settings form
      setSettingsForm({
        name: sectionData.name,
        room: sectionData.room || '',
        capacity: sectionData.capacity || 40,
        class_teacher_id: sectionData.class_teacher_id || '',
      });

      // 2. Fetch Institution config
      if (user?.institution_id) {
        const inst = await api.get(`/institutions/${user.institution_id}`);
        if (inst && inst.institution_type) {
          setInstitutionType(inst.institution_type);
        }
      }

      // 3. Fetch basic related listings for KPIs
      const [studentsData, timetableData, attendanceRep, allFeeRecs, examsData, teachersData, subjectsData, attSessions, allocationsData] = await Promise.all([
        api.get(`/students?section_id=${id}`).catch(() => []),
        api.get(`/weekly-timetable?section_id=${id}`).catch(() => []),
        api.get(`/attendance/reports/students?section_id=${id}`).catch(() => []),
        api.get(`/fees/student-records`).catch(() => []),
        api.get(`/exams`).catch(() => []),
        api.get(`/teachers`).catch(() => []),
        api.get(`/subjects`).catch(() => []),
        api.get(`/attendance/sessions?section_id=${id}`).catch(() => []),
        api.get(`/teaching-allocations?section_id=${id}`).catch(() => [])
      ]);

      setStudents(studentsData || []);
      setTimetable(timetableData || []);
      setAttendanceReport(attendanceRep || []);
      setExams(examsData || []);
      setAllTeachers(teachersData || []);
      setAllSubjects(subjectsData || []);
      setAttendanceSessions(attSessions || []);
      setAllocations(allocationsData || []);

      // Filter fee records in memory for this section's students
      const studentIds = (studentsData || []).map((s: any) => s.id);
      const filteredFees = (allFeeRecs || []).filter((f: any) => studentIds.includes(f.student_id));
      setFeeRecords(filteredFees);

    } catch (err) {
      console.error('Failed to retrieve section workspace details', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put(`/sections/${id}`, settingsForm);
      setShowSettingsModal(false);
      fetchWorkspaceData();
    } catch (err: any) {
      alert(err.message || 'Failed to update section settings.');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <RefreshCw size={24} className="spin" style={{ marginBottom: '1rem' }} />
          <p>Loading class workspace...</p>
        </div>
      </Layout>
    );
  }

  if (!section) {
    return (
      <Layout>
        <div style={{ padding: '3rem', textAlign: 'center' }}>
          <AlertTriangle size={48} color="var(--danger)" style={{ marginBottom: '1rem' }} />
          <h3>Section Not Found</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>The requested class or section records could not be retrieved.</p>
          <Link to="/classes" className="btn btn-primary">
            <ArrowLeft size={16} /> Back to Sections List
          </Link>
        </div>
      </Layout>
    );
  }

  // --- STATS COMPUTATION ---
  const activeStudentsCount = students.length;
  
  // Attendance Rate
  const totalSessionsCount = attendanceReport.reduce((acc, r) => acc + (r.total_sessions || 0), 0);
  const presentCount = attendanceReport.reduce((acc, r) => acc + (r.present_count || 0) + (r.late_count || 0), 0);
  const attendancePercentage = totalSessionsCount > 0 
    ? Math.round((presentCount / totalSessionsCount) * 100) 
    : 95;

  // Upcoming Exams
  const filteredExams = exams.filter(e => 
    e.course_id === section.course_id && 
    e.academic_year_id === section.academic_year_id &&
    e.is_active === 1
  );
  const upcomingExamsCount = filteredExams.filter(e => new Date(e.end_date) >= new Date()).length;

  const riskThreshold = 75.0;
  const atRiskStudents = attendanceReport
    .filter(r => {
      const studentSessions = r.total_sessions || 0;
      if (studentSessions === 0) return false;
      const pct = ((r.present_count || 0) + (r.late_count || 0)) / studentSessions * 100;
      return pct < riskThreshold;
    })
    .map(r => r.student_id);

  return (
    <Layout>
      <PageGuidance
        title="Class Workspace"
        description="View roster details, track attendance, check schedules, and manage exam details for this class."
        steps={[
          "Select the students tab to view current roster.",
          "Check mapped subjects and teaching staff assignments.",
          "Track daily attendance marking or weekly timetable setup."
        ]}
      />

      {/* Header */}
      <div className="section-workspace-row-9" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Link to="/classes" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }} className="hover-underline">
              <ArrowLeft size={14} /> All Classes
            </Link>
            <span style={{ color: 'var(--text-muted)' }}>•</span>
            <span style={{ display: 'inline-block', padding: '0.125rem 0.625rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', backgroundColor: section.is_active ? 'var(--success-soft)' : 'var(--danger-soft)', color: section.is_active ? 'var(--success)' : 'var(--danger)' }}>
              {section.is_active ? 'Active Workspace' : 'Archived'}
            </span>
          </div>

          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-main)' }}>
            Class {section.name}
            <span style={{ color: 'var(--text-muted)', fontSize: '1rem', fontWeight: '400' }}>
              ({section.academic_year_name})
            </span>
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            {section.course_name} • {getProgramLabel()} Level
          </p>
        </div>

        <button className="btn btn-secondary" onClick={() => setShowSettingsModal(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
          <Settings size={15} /> Class Settings
        </button>
      </div>

      {/* Summary Card */}
      <div className="card summary-card" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.5rem', background: 'var(--bg-card)', borderLeft: '4px solid var(--primary)', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '1.15rem', fontWeight: '700', color: 'var(--text-main)' }}>{section.name} Summary</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
              Location: {section.room || 'No Room Mapped'} • Advisor: {section.class_teacher_name || 'Unassigned'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700', letterSpacing: '0.05em' }}>Students</div>
              <div style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-main)' }}>{activeStudentsCount}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700', letterSpacing: '0.05em' }}>Teachers</div>
              <div style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-main)' }}>
                {Array.from(new Set(allocations.map(a => a.teacher_id))).length}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700', letterSpacing: '0.05em' }}>Subjects</div>
              <div style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-main)' }}>
                {allSubjects.filter(s => s.course_id === section.course_id).length}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700', letterSpacing: '0.05em' }}>Avg Attendance</div>
              <div style={{ fontSize: '1.15rem', fontWeight: '800', color: attendancePercentage >= riskThreshold ? 'var(--success)' : 'var(--danger)' }}>
                {attendancePercentage}%
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700', letterSpacing: '0.05em' }}>Upcoming Exams</div>
              <div style={{ fontSize: '1.15rem', fontWeight: '800', color: upcomingExamsCount > 0 ? 'var(--warning)' : 'var(--text-main)' }}>
                {upcomingExamsCount}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions Panel */}
      <div className="card quick-actions-panel" style={{ padding: '0.75rem 1rem', marginBottom: '1.5rem', background: 'var(--bg-subtle)', display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-secondary)', marginRight: '0.5rem', letterSpacing: '0.05em' }}>Quick Actions:</span>
        <button className="btn btn-secondary" onClick={() => navigate(`/students?showAdd=true&section_id=${id}`)} style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', height: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
          <Plus size={13} /> Enroll Student
        </button>
        <button className="btn btn-secondary" onClick={() => navigate(`/attendance?section_id=${id}`)} style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', height: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
          <ClipboardCheck size={13} /> Mark Attendance
        </button>
        <button className="btn btn-secondary" onClick={() => { setActiveTab('timetable'); navigate('?tab=timetable'); }} style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', height: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
          <Calendar size={13} /> View Timetable
        </button>
        <button className="btn btn-secondary" onClick={() => navigate(`/homework`)} style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', height: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
          <BookOpen size={13} /> Assign Homework
        </button>
      </div>

      {/* Workspace Navigation Tabs */}
      <div className="section-workspace-tabs" style={{ display: 'flex', gap: '1.5rem', borderBottom: '1px solid var(--border)', marginBottom: '1.5rem' }}>
        {[
          { tab: 'students', label: `Students Roster (${activeStudentsCount})`, icon: Users },
          { tab: 'subjects', label: 'Curriculum Subjects', icon: BookOpen },
          { tab: 'teachers', label: 'Instructors & Staff', icon: UserCheck },
          { tab: 'timetable', label: 'Class Timetable', icon: Calendar },
          { tab: 'attendance', label: 'Daily Attendance', icon: ClipboardCheck },
          { tab: 'exams', label: `Scheduled Exams (${upcomingExamsCount})`, icon: FileText }
        ].map(t => {
          const Icon = t.icon;
          const isActive = activeTab === t.tab;
          return (
            <button
              key={t.tab}
              type="button"
              onClick={() => setActiveTab(t.tab)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 0.25rem',
                border: 'none',
                background: 'none',
                borderBottom: isActive ? '3px solid var(--primary)' : '3px solid transparent',
                color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: isActive ? 700 : 400,
                cursor: 'pointer',
                fontSize: '0.9rem',
                transition: 'all 0.2s ease'
              }}
            >
              <Icon size={15} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      <div className="section-workspace-tab-content">
        
        {/* 1. STUDENTS ROSTER TAB */}
        {activeTab === 'students' && (
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0.35rem 0.65rem', width: '320px' }}>
                <Search size={15} style={{ color: 'var(--text-secondary)', marginRight: '0.5rem' }} />
                <input
                  type="text"
                  placeholder="Search students by name or roll no..."
                  value={studentsSearch}
                  onChange={e => setStudentsSearch(e.target.value)}
                  style={{ border: 'none', background: 'none', outline: 'none', width: '100%', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={studentsFilterRisk} 
                    onChange={e => setStudentsFilterRisk(e.target.checked)} 
                  />
                  <span>Show Students At Attendance Risk Only (&lt; 75%)</span>
                </label>
              </div>
            </div>

            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ textAlign: 'left', padding: '0.5rem' }}>Roll No.</th>
                  <th style={{ textAlign: 'left', padding: '0.5rem' }}>Student Name</th>
                  <th style={{ textAlign: 'left', padding: '0.5rem' }}>Admission No.</th>
                  <th style={{ textAlign: 'left', padding: '0.5rem' }}>Attendance Rate</th>
                  <th style={{ textAlign: 'left', padding: '0.5rem' }}>Fee Status</th>
                  <th style={{ textAlign: 'right', padding: '0.5rem' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {students
                  .filter(s => {
                    const name = `${s.first_name} ${s.last_name}`.toLowerCase();
                    const searchMatch = name.includes(studentsSearch.toLowerCase()) || 
                      (s.roll_number?.toLowerCase() || '').includes(studentsSearch.toLowerCase()) ||
                      s.admission_number.toLowerCase().includes(studentsSearch.toLowerCase());
                    
                    if (studentsFilterRisk) {
                      return searchMatch && atRiskStudents.includes(s.id);
                    }
                    return searchMatch;
                  })
                  .map(s => {
                    const studentRep = attendanceReport.find(r => r.student_id === s.id);
                    const studentSessions = studentRep?.total_sessions || 0;
                    const studentPresent = (studentRep?.present_count || 0) + (studentRep?.late_count || 0);
                    const studentPct = studentSessions > 0 ? Math.round((studentPresent / studentSessions) * 100) : 95;

                    const recordsForStudent = feeRecords.filter(f => f.student_id === s.id);
                    const hasUnpaid = recordsForStudent.some(f => f.status !== 'PAID');

                    return (
                      <tr key={s.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '0.65rem 0.5rem' }}>{s.roll_number || 'N/A'}</td>
                        <td style={{ padding: '0.65rem 0.5rem' }}>
                          <Link to={`/students/${s.id}`} style={{ fontWeight: '600', color: 'var(--primary)' }} className="hover-underline">
                            {s.first_name} {s.last_name}
                          </Link>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{s.email || 'No email mapped'}</div>
                        </td>
                        <td style={{ padding: '0.65rem 0.5rem' }}><code>{s.admission_number}</code></td>
                        <td style={{ padding: '0.65rem 0.5rem' }}>
                          <span style={{ fontWeight: '700', color: studentPct < riskThreshold ? 'var(--danger)' : 'var(--success)' }}>
                            {studentPct}%
                          </span>
                        </td>
                        <td style={{ padding: '0.65rem 0.5rem' }}>
                          <span className={`badge badge-${hasUnpaid ? 'warning' : 'success'}`} style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}>
                            {hasUnpaid ? 'Unpaid' : 'Paid'}
                          </span>
                        </td>
                        <td style={{ padding: '0.65rem 0.5rem', textAlign: 'right' }}>
                          <Link to={`/students/${s.id}`} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', height: 'auto' }}>
                            View Profile
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                {students.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                      No students enrolled in this section.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* 2. SUBJECTS TAB (VIEW-ONLY) */}
        {activeTab === 'subjects' && (
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--primary-soft)', border: '1px solid var(--primary-border)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: '500' }}>
                ℹ️ Subject assignments are managed centrally. Edit allocations under academic setup.
              </span>
              <Link to="/academic-setup?tab=assignments" style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--primary)' }} className="hover-underline">
                Go to Subject Assignments →
              </Link>
            </div>

            <h4 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-main)', marginBottom: '1rem' }}>Mapped Curriculum Subjects</h4>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
              {allSubjects
                .filter(sub => sub.course_id === section.course_id)
                .map(sub => {
                  const alloc = allocations.find(a => a.subject_id === sub.id && a.section_id === id);
                  const teacher = alloc ? allTeachers.find(t => t.id === alloc.teacher_id) : null;
                  const teacherName = teacher ? `${teacher.first_name} ${teacher.last_name}` : 'Unassigned';

                  return (
                    <div key={sub.id} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '1rem', background: 'var(--bg-subtle)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span style={{ fontWeight: '700', color: 'var(--text-main)', fontSize: '0.9rem' }}>{sub.subject_name}</span>
                        <span className="badge" style={{ fontSize: '0.7rem' }}>{sub.subject_code}</span>
                      </div>
                      <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.75rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Instructor:</span>
                          <span style={{ fontWeight: '600', color: teacher ? 'var(--text-main)' : 'var(--text-muted)' }}>{teacherName}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Periods/Week:</span>
                          <span style={{ fontWeight: '600' }}>{sub.weekly_hours || 4} Periods</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              {allSubjects.filter(sub => sub.course_id === section.course_id).length === 0 && (
                <div style={{ color: 'var(--text-secondary)', padding: '1rem 0' }}>No subjects defined for this curriculum grade.</div>
              )}
            </div>
          </div>
        )}

        {/* 3. TEACHERS TAB (VIEW-ONLY) */}
        {activeTab === 'teachers' && (
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--primary-soft)', border: '1px solid var(--primary-border)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: '500' }}>
                ℹ️ Class teaching staff assignments are managed centrally.
              </span>
              <Link to="/academic-setup?tab=assignments" style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--primary)' }} className="hover-underline">
                Go to Subject Assignments →
              </Link>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: '600', color: 'var(--text-main)', marginBottom: '0.75rem' }}>Class Teacher Advisor</h4>
                {section.class_teacher_name ? (
                  <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '1rem', display: 'flex', gap: '1rem', alignItems: 'center', background: 'var(--bg-subtle)' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700' }}>
                      {section.class_teacher_name.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontWeight: '700', color: 'var(--text-main)' }}>{section.class_teacher_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Primary Advisor & Roster Lead</div>
                    </div>
                  </div>
                ) : (
                  <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No Advisor mapped.
                  </div>
                )}
              </div>

              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: '600', color: 'var(--text-main)', marginBottom: '0.75rem' }}>Subject Instructors</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {(() => {
                    const uniqueTeacherIds = Array.from(new Set(allocations.map(a => a.teacher_id)));
                    return uniqueTeacherIds.map(tId => {
                      const teacher = allTeachers.find(t => t.id === tId);
                      if (!teacher) return null;
                      
                      const teacherAllocations = allocations.filter(a => a.teacher_id === tId && a.section_id === id);
                      const subjectNames = teacherAllocations.map(a => {
                        const sub = allSubjects.find(s => s.id === a.subject_id);
                        return sub?.subject_name;
                      }).filter(Boolean).join(', ');

                      return (
                        <div key={tId} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0.75rem 1rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-subtle)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '0.85rem' }}>
                            {teacher.first_name.charAt(0)}
                          </div>
                          <div>
                            <div style={{ fontWeight: '600', color: 'var(--text-main)', fontSize: '0.85rem' }}>{teacher.first_name} {teacher.last_name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Teaches: {subjectNames}</div>
                          </div>
                        </div>
                      );
                    }).filter(Boolean);
                  })()}
                  {allocations.length === 0 && (
                    <div style={{ color: 'var(--text-secondary)' }}>No instructors assigned to this class section.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. TIMETABLE TAB */}
        {activeTab === 'timetable' && (
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-main)' }}>Weekly Timetable Schedule</h4>
              <Link to="/timetable" className="btn btn-secondary" style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', height: 'auto' }}>
                Open Timetable Editor
              </Link>
            </div>

            <div style={{ overflowX: 'auto' }}>
              {timetable.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-secondary)' }}>
                  <Calendar size={32} style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }} />
                  <p>No timetable entries scheduled for this class section.</p>
                </div>
              ) : (
                <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <th style={{ textAlign: 'left', padding: '0.5rem' }}>Day</th>
                      <th style={{ textAlign: 'left', padding: '0.5rem' }}>Slot Time</th>
                      <th style={{ textAlign: 'left', padding: '0.5rem' }}>Subject</th>
                      <th style={{ textAlign: 'left', padding: '0.5rem' }}>Instructor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => {
                      const dayEntries = timetable.filter(t => t.day_of_week === day);
                      if (dayEntries.length === 0) return null;
                      return dayEntries.map((entry, index) => (
                        <tr key={entry.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          {index === 0 && (
                            <td rowSpan={dayEntries.length} style={{ padding: '0.65rem 0.5rem', fontWeight: '700', background: 'var(--bg-subtle)', verticalAlign: 'top', width: '100px' }}>
                              {day}
                            </td>
                          )}
                          <td style={{ padding: '0.65rem 0.5rem' }}><code>{entry.start_time} - {entry.end_time}</code></td>
                          <td style={{ padding: '0.65rem 0.5rem', fontWeight: '600' }}>{entry.subject_name}</td>
                          <td style={{ padding: '0.65rem 0.5rem' }}>{entry.teacher_name}</td>
                        </tr>
                      ));
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* 5. ATTENDANCE TAB */}
        {activeTab === 'attendance' && (
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-main)' }}>Attendance Register sessions</h4>
              <button className="btn btn-primary" onClick={() => navigate(`/attendance?section_id=${id}`)}>
                Mark Daily Attendance
              </button>
            </div>

            {attendanceSessions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-secondary)' }}>
                <ClipboardCheck size={32} style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }} />
                <p>No attendance records logged for this class yet.</p>
              </div>
            ) : (
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ textAlign: 'left', padding: '0.5rem' }}>Session Date</th>
                    <th style={{ textAlign: 'left', padding: '0.5rem' }}>Marked By</th>
                    <th style={{ textAlign: 'left', padding: '0.5rem' }}>Subject Mapped</th>
                    <th style={{ textAlign: 'center', padding: '0.5rem', width: '150px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceSessions.map(session => (
                    <tr key={session.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.65rem 0.5rem', fontWeight: '500' }}>{new Date(session.session_date).toLocaleDateString()}</td>
                      <td style={{ padding: '0.65rem 0.5rem' }}>{session.marked_by_name || 'Staff Advisor'}</td>
                      <td style={{ padding: '0.65rem 0.5rem' }}>{session.subject_name || 'General Attendance'}</td>
                      <td style={{ padding: '0.65rem 0.5rem', textAlign: 'center' }}>
                        <span className="badge badge-success" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}>
                          ✓ Marked
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* 6. EXAMS TAB */}
        {activeTab === 'exams' && (
          <div className="card" style={{ padding: '1.25rem' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-main)', marginBottom: '1.25rem' }}>Scheduled Class Examinations</h4>
            
            {filteredExams.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-secondary)' }}>
                <FileText size={32} style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }} />
                <p>No active exams scheduled for this class section.</p>
              </div>
            ) : (
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ textAlign: 'left', padding: '0.5rem' }}>Exam Name</th>
                    <th style={{ textAlign: 'left', padding: '0.5rem' }}>Term / Description</th>
                    <th style={{ textAlign: 'left', padding: '0.5rem' }}>Subject Mapped</th>
                    <th style={{ textAlign: 'left', padding: '0.5rem' }}>Dates</th>
                    <th style={{ textAlign: 'right', padding: '0.5rem' }}>Max Marks</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExams.map(exam => (
                    <tr key={exam.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.65rem 0.5rem', fontWeight: '600', color: 'var(--text-main)' }}>{exam.name}</td>
                      <td style={{ padding: '0.65rem 0.5rem', color: 'var(--text-secondary)' }}>{exam.term || 'General Assessment'}</td>
                      <td style={{ padding: '0.65rem 0.5rem' }}>{allSubjects.find(s => s.id === exam.subject_id)?.subject_name || 'All Subjects'}</td>
                      <td style={{ padding: '0.65rem 0.5rem' }}><code>{new Date(exam.start_date).toLocaleDateString()} - {new Date(exam.end_date).toLocaleDateString()}</code></td>
                      <td style={{ padding: '0.65rem 0.5rem', textAlign: 'right', fontWeight: '700' }}>{exam.max_marks || 100}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* --- CLASS SETTINGS MODAL --- */}
      {showSettingsModal && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.40)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card modal-content" style={{ width: '440px', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '1.25rem' }}>Edit Class Configuration</h3>
            <form onSubmit={handleUpdateSettings} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-secondary)' }}>Section Name *</label>
                <input 
                  type="text" 
                  value={settingsForm.name} 
                  onChange={e => setSettingsForm({ ...settingsForm, name: e.target.value })} 
                  className="input"
                  required 
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-secondary)' }}>Classroom Location</label>
                  <input 
                    type="text" 
                    value={settingsForm.room} 
                    onChange={e => setSettingsForm({ ...settingsForm, room: e.target.value })} 
                    className="input"
                    placeholder="e.g. Block C-302"
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-secondary)' }}>Max Capacity *</label>
                  <input 
                    type="number" 
                    value={settingsForm.capacity} 
                    onChange={e => setSettingsForm({ ...settingsForm, capacity: parseInt(e.target.value) || 0 })} 
                    className="input"
                    required 
                    min="1"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-secondary)' }}>Class Teacher / Advisor</label>
                <select 
                  value={settingsForm.class_teacher_id} 
                  onChange={e => setSettingsForm({ ...settingsForm, class_teacher_id: e.target.value })}
                  className="input"
                >
                  <option value="">-- Assign Class Teacher (Optional) --</option>
                  {allTeachers.map(t => (
                    <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowSettingsModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Save Settings</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </Layout>
  );
}
