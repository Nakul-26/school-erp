import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import {
  BookOpen, Users, Calendar, Clock, BarChart2, Bell, FolderOpen,
  Settings, Activity, Plus, ArrowLeft, Upload, Trash2, CheckCircle2,
  AlertTriangle, IndianRupee, MapPin, Search, Edit2, Archive,
  MessageSquare, ClipboardCheck, Play, ArrowRight, UserCheck, Shield, HelpCircle, FileText
} from 'lucide-react';

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

interface SectionDocument {
  id: string;
  name: string;
  folder: string;
  file_key: string;
  file_size: number;
  uploaded_by: string;
  uploaded_at: string;
}

interface AuditLog {
  id: string;
  user_name: string;
  user_email: string;
  action: string;
  description: string;
  timestamp: string;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  visible_to_students: number;
  visible_to_teachers: number;
  visible_to_parents: number;
  created_at: string;
}

export default function SectionWorkspace() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const activeTab = searchParams.get('tab') || 'overview';

  // Section Details
  const [section, setSection] = useState<any>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [timetable, setTimetable] = useState<TimetableItem[]>([]);
  const [documents, setDocuments] = useState<SectionDocument[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [timeline, setTimeline] = useState<AuditLog[]>([]);
  const [attendanceReport, setAttendanceReport] = useState<any[]>([]);
  const [feeRecords, setFeeRecords] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [allTeachers, setAllTeachers] = useState<any[]>([]);
  const [allSubjects, setAllSubjects] = useState<any[]>([]);
  const [attendanceSessions, setAttendanceSessions] = useState<any[]>([]);

  // Loading States
  const [loading, setLoading] = useState(true);
  const [tabLoading, setTabLoading] = useState(false);
  const [institutionType, setInstitutionType] = useState<string>('college');

  // Modal / Form States
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [announcementForm, setAnnouncementForm] = useState({
    title: '',
    content: '',
    visible_to_students: 1,
    visible_to_teachers: 1,
    visible_to_parents: 1,
  });

  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [documentForm, setDocumentForm] = useState({
    folder: 'Assignments',
    file: null as File | null
  });
  const [uploadingDoc, setUploadingDoc] = useState(false);

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

  useEffect(() => {
    fetchWorkspaceData();
  }, [id]);

  useEffect(() => {
    if (section) {
      fetchTabSpecificData();
    }
  }, [activeTab, section]);

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
      const [studentsData, timetableData, attendanceRep, allFeeRecs, examsData, teachersData, subjectsData, attSessions] = await Promise.all([
        api.get(`/students?section_id=${id}`).catch(() => []),
        api.get(`/weekly-timetable?section_id=${id}`).catch(() => []),
        api.get(`/attendance/reports/students?section_id=${id}`).catch(() => []),
        api.get(`/fees/student-records`).catch(() => []),
        api.get(`/exams`).catch(() => []),
        api.get(`/teachers`).catch(() => []),
        api.get(`/subjects`).catch(() => []),
        api.get(`/attendance/sessions?section_id=${id}`).catch(() => [])
      ]);

      setStudents(studentsData || []);
      setTimetable(timetableData || []);
      setAttendanceReport(attendanceRep || []);
      setExams(examsData || []);
      setAllTeachers(teachersData || []);
      setAllSubjects(subjectsData || []);
      setAttendanceSessions(attSessions || []);

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

  const fetchTabSpecificData = async () => {
    setTabLoading(true);
    try {
      if (activeTab === 'documents') {
        const docs = await api.get(`/sections/${id}/documents`).catch(() => []);
        setDocuments(docs);
      } else if (activeTab === 'timeline') {
        const logs = await api.get(`/sections/${id}/timeline`).catch(() => []);
        setTimeline(logs);
      } else if (activeTab === 'announcements') {
        const notices = await api.get(`/announcements?section_id=${id}`).catch(() => []);
        setAnnouncements(notices);
      }
    } catch (err) {
      console.error('Error fetching tab data:', err);
    } finally {
      setTabLoading(false);
    }
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...announcementForm,
        section_id: id
      };
      await api.post('/announcements', payload);
      setShowAnnouncementModal(false);
      setAnnouncementForm({
        title: '',
        content: '',
        visible_to_students: 1,
        visible_to_teachers: 1,
        visible_to_parents: 1,
      });
      fetchTabSpecificData();
    } catch (err: any) {
      alert(err.message || 'Error publishing announcement');
    }
  };

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!documentForm.file) {
      alert('Please select a file to upload');
      return;
    }
    setUploadingDoc(true);
    try {
      const formData = new FormData();
      formData.append('file', documentForm.file);
      formData.append('folder', documentForm.folder);

      await api.post(`/sections/${id}/documents/upload`, formData);
      setShowDocumentModal(false);
      setDocumentForm({ folder: 'Assignments', file: null });
      fetchTabSpecificData();
    } catch (err: any) {
      alert(err.message || 'Error uploading document');
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm('Are you sure you want to permanently delete this document?')) return;
    try {
      await api.delete(`/sections/${id}/documents/${docId}`);
      fetchTabSpecificData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete document');
    }
  };

  const handleDownloadDocument = (docId: string) => {
    const baseURL = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:8787' : '');
    window.open(`${baseURL}/sections/${id}/documents/${docId}/download`, '_blank');
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put(`/sections/${id}`, settingsForm);
      setShowSettingsModal(false);
      fetchWorkspaceData();
    } catch (err: any) {
      alert(err.message || 'Failed to update section settings');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '1rem' }}>
          <Activity className="spinner" size={48} style={{ color: 'var(--primary)' }} />
          <p style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Initializing Section Workspace...</p>
        </div>
      </Layout>
    );
  }

  if (!section) {
    return (
      <Layout>
        <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <AlertTriangle size={48} style={{ color: '#ef4444', marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)' }}>Section Not Found</h3>
          <p style={{ color: 'var(--text-muted)', margin: '0.5rem 0 1.5rem 0' }}>The requested class or section records could not be retrieved.</p>
          <Link to="/classes" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <ArrowLeft size={16} /> Back to Sections List
          </Link>
        </div>
      </Layout>
    );
  }

  // --- STATS COMPUTATION ---
  const activeStudentsCount = students.length;
  
  // 1. Attendance %
  const totalSessionsCount = attendanceReport.reduce((acc, r) => acc + (r.total_sessions || 0), 0);
  const presentCount = attendanceReport.reduce((acc, r) => acc + (r.present_count || 0) + (r.late_count || 0), 0);
  const attendancePercentage = totalSessionsCount > 0 
    ? Math.round((presentCount / totalSessionsCount) * 100) 
    : 95; // Mock/default value if no sessions exist

  // 2. Upcoming Exams (filtered to section's course & semester/year)
  const filteredExams = exams.filter(e => 
    e.course_id === section.course_id && 
    e.academic_year_id === section.academic_year_id &&
    e.is_active === 1
  );
  const upcomingExamsCount = filteredExams.filter(e => new Date(e.end_date) >= new Date()).length;

  // 3. Today's Classes
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayDay = days[new Date().getDay()];
  const todaysSchedule = timetable
    .filter(t => t.day_of_week === todayDay)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));
  const todaysClassesCount = todaysSchedule.length;

  // 4. Pending Fees
  const studentsWithPendingFees = Array.from(new Set(
    feeRecords
      .filter(f => f.status !== 'PAID')
      .map(f => f.student_id)
  ));
  const pendingFeesCount = studentsWithPendingFees.length;

  // 5. Students At Risk (Attendance < 75%)
  const riskThreshold = 75.0;
  const atRiskStudents = attendanceReport
    .filter(r => {
      const studentSessions = r.total_sessions || 0;
      if (studentSessions === 0) return false;
      const pct = ((r.present_count || 0) + (r.late_count || 0)) / studentSessions * 100;
      return pct < riskThreshold;
    })
    .map(r => r.student_id);
  const atRiskStudentsCount = atRiskStudents.length;

  // Today's classes timeline slots helper
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const getPeriodStatus = (startTime: string, endTime: string) => {
    const parseTime = (t: string) => {
      const parts = t.split(':').map(Number);
      const h = parts[0] || 0;
      const m = parts[1] || 0;
      return h * 60 + m;
    };
    const start = parseTime(startTime);
    const end = parseTime(endTime);

    if (currentMinutes >= start && currentMinutes <= end) return 'current';
    if (currentMinutes < start) return 'upcoming';
    return 'completed';
  };

  return (
    <Layout>
      {/* 1. Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <Link to="/classes" style={{ color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem', textDecoration: 'none', fontWeight: 500 }} className="hover-underline">
              <ArrowLeft size={16} /> All Classes
            </Link>
            <span style={{ color: 'var(--border)' }}>•</span>
            <span style={{ display: 'inline-block', padding: '0.125rem 0.625rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', backgroundColor: section.is_active ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)', color: section.is_active ? '#10b981' : '#ef4444' }}>
              {section.is_active ? 'Active Workspace' : 'Archived'}
            </span>
          </div>

          <h2 style={{ fontSize: '2.25rem', fontWeight: 900, color: 'var(--text-main)', margin: 0, letterSpacing: '-0.025em', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {section.name}
            <span style={{ fontSize: '1.125rem', fontWeight: 500, color: 'var(--text-muted)' }}>
              ({section.academic_year_name})
            </span>
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.975rem', marginTop: '0.35rem', fontWeight: 500 }}>
            {section.course_name} • {institutionType === 'school' ? `Class/Grade 1` : `Year ${section.year_number}`}
          </p>
        </div>

        {/* Quick Actions Panel */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button 
            className="btn btn-secondary" 
            onClick={() => navigate(`/attendance?section_id=${id}`)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, padding: '0.625rem 1.125rem', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)' }}
          >
            <ClipboardCheck size={18} style={{ color: 'var(--primary)' }} /> Mark Attendance
          </button>
          
          <button 
            className="btn btn-secondary" 
            onClick={() => setShowAnnouncementModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, padding: '0.625rem 1.125rem', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)' }}
          >
            <Bell size={18} style={{ color: 'var(--primary)' }} /> Broadcast Notice
          </button>

          <button 
            className="btn btn-secondary" 
            onClick={() => setActiveTab('timetable')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, padding: '0.625rem 1.125rem', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)' }}
          >
            <Calendar size={18} style={{ color: 'var(--primary)' }} /> View Timetable
          </button>

          <button 
            className="btn btn-primary" 
            onClick={() => setShowSettingsModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, padding: '0.625rem 1.125rem', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)' }}
          >
            <Settings size={18} /> Settings
          </button>
        </div>
      </div>

      {/* 2. KPIs Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        
        {/* Class Teacher KPI */}
        <div 
          onClick={() => setActiveTab('teachers')}
          style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', boxShadow: 'var(--shadow-sm)', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}
          className="hover-lift"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800 }}>Class Teacher</span>
            <Users size={16} style={{ color: 'var(--text-muted)' }} />
          </div>
          <span style={{ display: 'block', fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-main)' }}>
            {section.class_teacher_name || 'Unassigned'}
          </span>
          <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600, marginTop: '0.25rem' }}>View Profile & Contacts</span>
        </div>

        {/* Room Mapped KPI */}
        <div 
          onClick={() => setActiveTab('settings')}
          style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', boxShadow: 'var(--shadow-sm)', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}
          className="hover-lift"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800 }}>Classroom Room</span>
            <MapPin size={16} style={{ color: 'var(--text-muted)' }} />
          </div>
          <span style={{ display: 'block', fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-main)' }}>
            {section.room || 'No Room Mapped'}
          </span>
          <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Capacity: {section.capacity || 40} Seats</span>
        </div>

        {/* Enrollment / Fill Rate KPI */}
        <div 
          onClick={() => setActiveTab('students')}
          style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', boxShadow: 'var(--shadow-sm)', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}
          className="hover-lift"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800 }}>Students Enrolled</span>
            <UserCheck size={16} style={{ color: 'var(--text-muted)' }} />
          </div>
          <span style={{ display: 'block', fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-main)' }}>
            {activeStudentsCount} / {section.capacity || 40}
          </span>
          <div style={{ width: '100%', height: '4px', backgroundColor: '#e2e8f0', borderRadius: '2px', overflow: 'hidden', marginTop: '0.5rem' }}>
            <div style={{ width: `${Math.min(100, Math.round((activeStudentsCount / (section.capacity || 40)) * 100))}%`, height: '100%', backgroundColor: 'var(--primary)' }} />
          </div>
        </div>

        {/* Attendance KPI */}
        <div 
          onClick={() => setActiveTab('attendance')}
          style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', boxShadow: 'var(--shadow-sm)', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}
          className="hover-lift"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800 }}>Avg Attendance</span>
            <Activity size={16} style={{ color: attendancePercentage >= 85 ? '#10b981' : '#f97316' }} />
          </div>
          <span style={{ display: 'block', fontSize: '1.5rem', fontWeight: 900, color: attendancePercentage >= riskThreshold ? '#10b981' : '#ef4444' }}>
            {attendancePercentage}%
          </span>
          <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Threshold limit: 75%</span>
        </div>

        {/* Risk / Alerts KPI */}
        <div 
          onClick={() => {
            setStudentsFilterRisk(true);
            setActiveTab('students');
          }}
          style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', boxShadow: 'var(--shadow-sm)', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}
          className="hover-lift"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800 }}>Students At Risk</span>
            <AlertTriangle size={16} style={{ color: atRiskStudentsCount > 0 ? '#ef4444' : 'var(--text-muted)' }} />
          </div>
          <span style={{ display: 'block', fontSize: '1.5rem', fontWeight: 900, color: atRiskStudentsCount > 0 ? '#ef4444' : 'var(--text-main)' }}>
            {atRiskStudentsCount}
          </span>
          <span style={{ display: 'block', fontSize: '0.75rem', color: atRiskStudentsCount > 0 ? '#b91c1c' : 'var(--text-muted)', fontWeight: atRiskStudentsCount > 0 ? 600 : 500, marginTop: '0.25rem' }}>
            {atRiskStudentsCount > 0 ? 'Click to see roster' : 'All students safe'}
          </span>
        </div>

        {/* Fees Pending KPI */}
        <div 
          onClick={() => setActiveTab('reports')}
          style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', boxShadow: 'var(--shadow-sm)', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}
          className="hover-lift"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800 }}>Fee Defaulters</span>
            <IndianRupee size={16} style={{ color: 'var(--text-muted)' }} />
          </div>
          <span style={{ display: 'block', fontSize: '1.5rem', fontWeight: 900, color: pendingFeesCount > 0 ? '#ef4444' : 'var(--text-main)' }}>
            {pendingFeesCount} <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-muted)' }}>Students</span>
          </span>
          <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Click to view details</span>
        </div>

      </div>

      {/* 3. Workspace Navigation Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '1.5rem', gap: '1.5rem', overflowX: 'auto', scrollbarWidth: 'none', height: '48px', alignItems: 'center' }}>
        {[
          { tab: 'overview', label: 'Dashboard', icon: Activity },
          { tab: 'students', label: `Roster (${activeStudentsCount})`, icon: Users },
          { tab: 'attendance', label: 'Attendance', icon: ClipboardCheck },
          { tab: 'timetable', label: 'Timetable', icon: Calendar },
          { tab: 'subjects', label: 'Subjects', icon: BookOpen },
          { tab: 'teachers', label: 'Teachers', icon: Users },
          { tab: 'exams', label: `Exams (${upcomingExamsCount})`, icon: FileText },
          { tab: 'announcements', label: 'Notices', icon: Bell },
          { tab: 'reports', label: 'Analytics', icon: BarChart2 },
          { tab: 'documents', label: 'Documents', icon: FolderOpen },
          { tab: 'timeline', label: 'Timeline', icon: Clock }
        ].map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.tab}
              type="button"
              onClick={() => setActiveTab(t.tab)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 0.25rem',
                border: 'none',
                background: 'none',
                borderBottom: activeTab === t.tab ? '3px solid var(--primary)' : '3px solid transparent',
                color: activeTab === t.tab ? 'var(--primary)' : 'var(--text-muted)',
                fontWeight: activeTab === t.tab ? 700 : 500,
                cursor: 'pointer',
                fontSize: '0.9rem',
                whiteSpace: 'nowrap',
                height: '100%',
                transition: 'border-bottom-color 0.2s, color 0.2s'
              }}
            >
              <Icon size={16} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* 4. Tab Contents */}
      <div style={{ minHeight: '400px' }}>
        {tabLoading && activeTab !== 'overview' ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem', gap: '1rem' }}>
            <Activity className="spinner" size={32} style={{ color: 'var(--primary)' }} />
            <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading workspace components...</span>
          </div>
        ) : (
          <div>
            {/* OVERVIEW DASHBOARD */}
            {activeTab === 'overview' && (
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {/* Today's Schedule Card */}
                  <div className="card" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                      <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Clock size={18} style={{ color: 'var(--primary)' }} /> Today's Schedule
                      </h4>
                      <button className="btn btn-sm btn-secondary" onClick={() => setActiveTab('timetable')}>Weekly Grid</button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {todaysSchedule.map((item, index) => {
                        const status = getPeriodStatus(item.start_time, item.end_time);
                        return (
                          <div 
                            key={item.id} 
                            style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'space-between', 
                              padding: '1rem', 
                              borderRadius: 'var(--radius-md)', 
                              border: '1px solid var(--border)',
                              backgroundColor: status === 'current' ? 'rgba(59, 130, 246, 0.04)' : 'var(--bg-surface)',
                              borderColor: status === 'current' ? 'var(--primary)' : 'var(--border)',
                              borderLeft: status === 'current' ? '4px solid var(--primary)' : '1px solid var(--border)'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                              <div style={{ 
                                padding: '0.35rem 0.75rem', 
                                borderRadius: 'var(--radius-sm)', 
                                backgroundColor: status === 'current' ? 'var(--primary)' : '#f1f5f9',
                                color: status === 'current' ? '#ffffff' : '#475569',
                                fontSize: '0.75rem', 
                                fontWeight: 700 
                              }}>
                                Period {index + 1}
                              </div>
                              <div>
                                <span style={{ fontWeight: 700, color: 'var(--text-main)', display: 'block', fontSize: '0.95rem' }}>{item.subject_name}</span>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.teacher_name}</span>
                              </div>
                            </div>

                            <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                <Clock size={14} /> {item.start_time} - {item.end_time}
                              </span>

                              {status === 'current' && (
                                <span style={{ fontSize: '0.7rem', padding: '0.125rem 0.5rem', borderRadius: '4px', backgroundColor: '#dcfce7', color: '#15803d', fontWeight: 700, textTransform: 'uppercase' }}>
                                  Ongoing
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {todaysSchedule.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                          No classes scheduled for today ({todayDay}). Free day!
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Upcoming Exams List */}
                  <div className="card" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                      <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FileText size={18} style={{ color: 'var(--primary)' }} /> Upcoming Exams
                      </h4>
                      <button className="btn btn-sm btn-secondary" onClick={() => setActiveTab('exams')}>Full Schedule</button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
                      {filteredExams.slice(0, 2).map(exam => (
                        <div key={exam.id} style={{ border: '1px solid var(--border)', padding: '1rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-surface)' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', padding: '0.125rem 0.5rem', borderRadius: '4px', backgroundColor: exam.status === 'PUBLISHED' ? '#dcfce7' : '#f1f5f9', color: exam.status === 'PUBLISHED' ? '#15803d' : '#475569', display: 'inline-block', marginBottom: '0.5rem' }}>
                            {exam.status}
                          </span>
                          <span style={{ display: 'block', fontWeight: 800, color: 'var(--text-main)', fontSize: '1rem', marginBottom: '0.25rem' }}>{exam.name}</span>
                          <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {new Date(exam.start_date).toLocaleDateString()} - {new Date(exam.end_date).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                      {filteredExams.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                          No upcoming exams scheduled.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {/* Class Teacher Details Card */}
                  <div className="card" style={{ padding: '1.5rem', backgroundColor: 'var(--bg-surface)' }}>
                    <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '1rem' }}>Class Teacher</h4>
                    {section.class_teacher_name ? (
                      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '9999px', backgroundColor: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', fontSize: '1.25rem', fontWeight: 800 }}>
                          {section.class_teacher_name.charAt(0)}
                        </div>
                        <div>
                          <span style={{ display: 'block', fontWeight: 700, color: 'var(--text-main)' }}>{section.class_teacher_name}</span>
                          <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Class Advisor</span>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        <span>No class teacher has been assigned yet.</span>
                        <button className="btn btn-sm btn-secondary" onClick={() => setShowSettingsModal(true)}>Assign Teacher</button>
                      </div>
                    )}
                  </div>

                  {/* Section Health Card */}
                  <div className="card" style={{ padding: '1.5rem' }}>
                    <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '1rem' }}>Section Health</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Attendance Rate</span>
                          <span style={{ color: attendancePercentage >= riskThreshold ? '#10b981' : '#ef4444' }}>{attendancePercentage}%</span>
                        </div>
                        <div style={{ width: '100%', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px' }}>
                          <div style={{ width: `${attendancePercentage}%`, height: '100%', borderRadius: '3px', backgroundColor: attendancePercentage >= riskThreshold ? '#10b981' : '#ef4444' }} />
                        </div>
                      </div>

                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Enrollment fill rate</span>
                          <span>{Math.round(activeStudentsCount / (section.capacity || 40) * 100)}%</span>
                        </div>
                        <div style={{ width: '100%', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px' }}>
                          <div style={{ width: `${Math.round(activeStudentsCount / (section.capacity || 40) * 100)}%`, height: '100%', borderRadius: '3px', backgroundColor: 'var(--primary)' }} />
                        </div>
                      </div>

                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Fee Collection Rate</span>
                          {(() => {
                            const totalCollected = feeRecords.reduce((acc, f) => acc + (f.paid_amount || 0), 0);
                            const totalAmount = feeRecords.reduce((acc, f) => acc + (f.total_amount || 0), 0);
                            const rate = totalAmount > 0 ? Math.round(totalCollected / totalAmount * 100) : 100;
                            return (
                              <>
                                <span>{rate}%</span>
                              </>
                            );
                          })()}
                        </div>
                        {(() => {
                          const totalCollected = feeRecords.reduce((acc, f) => acc + (f.paid_amount || 0), 0);
                          const totalAmount = feeRecords.reduce((acc, f) => acc + (f.total_amount || 0), 0);
                          const rate = totalAmount > 0 ? Math.round(totalCollected / totalAmount * 100) : 100;
                          return (
                            <div style={{ width: '100%', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px' }}>
                              <div style={{ width: `${rate}%`, height: '100%', borderRadius: '3px', backgroundColor: '#8b5cf6' }} />
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STUDENTS TAB */}
            {activeTab === 'students' && (
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
                  <div style={{ position: 'relative', width: '300px' }}>
                    <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input 
                      type="text" 
                      placeholder="Search roster..." 
                      value={studentsSearch} 
                      onChange={e => setStudentsSearch(e.target.value)} 
                      style={{ paddingLeft: '2.25rem', width: '100%' }}
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                      <input 
                        type="checkbox" 
                        checked={studentsFilterRisk} 
                        onChange={e => setStudentsFilterRisk(e.target.checked)} 
                      />
                      Show Students At Risk Only (&lt; 75%)
                    </label>
                  </div>
                </div>

                <table className="table" style={{ width: '100%' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'rgba(248, 250, 252, 0.5)' }}>
                      <th style={{ textAlign: 'left', padding: '1rem' }}>Roll No.</th>
                      <th style={{ textAlign: 'left', padding: '1rem' }}>Student Name</th>
                      <th style={{ textAlign: 'left', padding: '1rem' }}>Admission No.</th>
                      <th style={{ textAlign: 'center', padding: '1rem' }}>Attendance Rate</th>
                      <th style={{ textAlign: 'center', padding: '1rem' }}>Fee Status</th>
                      <th style={{ textAlign: 'right', padding: '1rem' }}>Quick Actions</th>
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
                        // Calculate student attendance
                        const studentRep = attendanceReport.find(r => r.student_id === s.id);
                        const studentSessions = studentRep?.total_sessions || 0;
                        const studentPresent = (studentRep?.present_count || 0) + (studentRep?.late_count || 0);
                        const studentPct = studentSessions > 0 ? Math.round((studentPresent / studentSessions) * 100) : 95;

                        // Calculate fee status
                        const recordsForStudent = feeRecords.filter(f => f.student_id === s.id);
                        const hasUnpaid = recordsForStudent.some(f => f.status !== 'PAID');

                        return (
                          <tr key={s.id} style={{ borderBottom: '1px solid var(--border)' }} className="hover-row">
                            <td style={{ padding: '1rem', fontWeight: 600 }}>{s.roll_number || 'N/A'}</td>
                            <td style={{ padding: '1rem' }}>
                              <Link to={`/students/${s.id}`} style={{ fontWeight: 700, color: 'var(--primary)', textDecoration: 'none' }} className="hover-underline">
                                {s.first_name} {s.last_name}
                              </Link>
                              <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.email || 'No Email Mapped'}</span>
                            </td>
                            <td style={{ padding: '1rem' }}><code>{s.admission_number}</code></td>
                            <td style={{ padding: '1rem', textAlign: 'center' }}>
                              <span style={{
                                fontWeight: 700,
                                color: studentPct < riskThreshold ? '#ef4444' : '#10b981',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem'
                              }}>
                                {studentPct}%
                                {studentPct < riskThreshold && <AlertTriangle size={12} />}
                              </span>
                            </td>
                            <td style={{ padding: '1rem', textAlign: 'center' }}>
                              <span style={{
                                display: 'inline-block',
                                padding: '0.25rem 0.5rem',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                backgroundColor: hasUnpaid ? '#fef3c7' : '#dcfce7',
                                color: hasUnpaid ? '#b45309' : '#15803d'
                              }}>
                                {hasUnpaid ? 'Unpaid' : 'Paid'}
                              </span>
                            </td>
                            <td style={{ padding: '1rem', textAlign: 'right' }}>
                              <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                                <button className="btn btn-sm btn-secondary" onClick={() => navigate(`/students/${s.id}`)}>Profile</button>
                                <button className="btn btn-sm btn-secondary" onClick={() => alert('Feature to notify parent triggered successfully!')}>Message Parent</button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    {students.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                          No students are currently enrolled in this section.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* ATTENDANCE TAB */}
            {activeTab === 'attendance' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                  {/* Today's Stats Card */}
                  <div className="card" style={{ padding: '1.5rem' }}>
                    <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '1.25rem' }}>Today's Attendance Work</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Total Students</span>
                        <span style={{ fontWeight: 700 }}>{activeStudentsCount} Students</span>
                      </div>
                      
                      {/* Attendance Sessions marked today */}
                      {(() => {
                        const todayStr = new Date().toISOString().split('T')[0];
                        const sessionsToday = attendanceSessions.filter(s => s.date === todayStr);
                        return (
                          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
                            <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Today's Sessions ({sessionsToday.length})</span>
                            {sessionsToday.length > 0 ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {sessionsToday.map(s => (
                                  <div key={s.id} style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', padding: '0.4rem', backgroundColor: '#f8fafc', borderRadius: '4px' }}>
                                    <span style={{ fontWeight: 600 }}>{s.subject_name}</span>
                                    <span style={{ color: 'var(--text-muted)' }}>{s.start_time || 'General Slot'}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span style={{ fontSize: '0.8rem', color: '#c2410c', fontWeight: 600 }}>No attendance sessions marked yet today.</span>
                            )}
                          </div>
                        );
                      })()}

                      <button className="btn btn-primary" onClick={() => navigate(`/attendance?section_id=${id}`)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center', width: '100%', marginTop: '0.5rem' }}>
                        <ClipboardCheck size={18} /> Mark Today's Attendance
                      </button>
                    </div>
                  </div>

                  {/* Below Threshold List */}
                  <div className="card" style={{ padding: '1.5rem' }}>
                    <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <AlertTriangle size={18} style={{ color: '#ef4444' }} /> Below Threshold (&lt; {riskThreshold}%)
                    </h4>
                    <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {attendanceReport
                        .filter(r => {
                          const sSessions = r.total_sessions || 0;
                          if (sSessions === 0) return false;
                          const pct = ((r.present_count || 0) + (r.late_count || 0)) / sSessions * 100;
                          return pct < riskThreshold;
                        })
                        .map(r => {
                          const sPct = Math.round(((r.present_count || 0) + (r.late_count || 0)) / r.total_sessions * 100);
                          return (
                            <div key={r.student_id} style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '6px' }}>
                              <span style={{ fontWeight: 650, fontSize: '0.85rem' }}>{r.first_name} {r.last_name}</span>
                              <span style={{ color: '#ef4444', fontWeight: 700, fontSize: '0.85rem' }}>{sPct}%</span>
                            </div>
                          );
                        })}
                      {atRiskStudentsCount === 0 && (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '1rem' }}>No students below threshold! Excellent.</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Recent Sessions list */}
                <div className="card" style={{ padding: '1.5rem' }}>
                  <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '1rem' }}>Recent Attendance Sessions Log</h4>
                  <table className="table" style={{ width: '100%' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'rgba(248, 250, 252, 0.5)' }}>
                        <th style={{ textAlign: 'left', padding: '0.75rem' }}>Session Date</th>
                        <th style={{ textAlign: 'left', padding: '0.75rem' }}>Subject Mapped</th>
                        <th style={{ textAlign: 'left', padding: '0.75rem' }}>Teacher Assigned</th>
                        <th style={{ textAlign: 'center', padding: '0.75rem' }}>Timetable Period</th>
                        <th style={{ textAlign: 'right', padding: '0.75rem' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendanceSessions.slice(0, 5).map(session => (
                        <tr key={session.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '0.75rem', fontWeight: 600 }}>{session.date}</td>
                          <td style={{ padding: '0.75rem' }}>{session.subject_name}</td>
                          <td style={{ padding: '0.75rem' }}>{session.teacher_name}</td>
                          <td style={{ padding: '0.75rem', textAlign: 'center' }}>{session.slot_name || 'General'}</td>
                          <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                            <button className="btn btn-sm btn-secondary" onClick={() => navigate(`/attendance?session_id=${session.id}`)}>Edit Marks</button>
                          </td>
                        </tr>
                      ))}
                      {attendanceSessions.length === 0 && (
                        <tr>
                          <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No historical attendance sessions logged.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TIMETABLE TAB */}
            {activeTab === 'timetable' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem' }}>
                  
                  {/* Status Panel */}
                  <div className="card" style={{ padding: '1.5rem' }}>
                    <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '1.25rem' }}>Schedule status</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {/* Current Period Highlight */}
                      {(() => {
                        const current = todaysSchedule.find(t => getPeriodStatus(t.start_time, t.end_time) === 'current');
                        return (
                          <div style={{ padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: current ? 'rgba(16, 185, 129, 0.05)' : '#f8fafc' }}>
                            <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.25rem' }}>Current active class</span>
                            {current ? (
                              <>
                                <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-main)', display: 'block' }}>{current.subject_name}</span>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.125rem' }}>by {current.teacher_name}</span>
                                <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.5rem' }}>
                                  <Clock size={12} /> Ends at {current.end_time}
                                </span>
                              </>
                            ) : (
                              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>No ongoing class right now. (Free Period / Break)</span>
                            )}
                          </div>
                        );
                      })()}

                      {/* Next Period Highlight */}
                      {(() => {
                        const nextSlot = todaysSchedule.find(t => getPeriodStatus(t.start_time, t.end_time) === 'upcoming');
                        return (
                          <div style={{ padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: '#f8fafc' }}>
                            <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.25rem' }}>Next Scheduled Period</span>
                            {nextSlot ? (
                              <>
                                <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-main)', display: 'block' }}>{nextSlot.subject_name}</span>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.125rem' }}>by {nextSlot.teacher_name}</span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.5rem' }}>
                                  <Clock size={12} /> Starts at {nextSlot.start_time}
                                </span>
                              </>
                            ) : (
                              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>No upcoming classes for the rest of today.</span>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Weekly Timeline Grid */}
                  <div className="card" style={{ padding: '1.5rem' }}>
                    <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '1.25rem' }}>Weekly Schedule Overview</h4>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--border)' }}>
                            <th style={{ textAlign: 'left', padding: '0.5rem', color: 'var(--text-muted)' }}>Day</th>
                            <th style={{ textAlign: 'left', padding: '0.5rem', color: 'var(--text-muted)' }}>Schedule slots details</th>
                          </tr>
                        </thead>
                        <tbody>
                          {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => {
                            const slots = timetable.filter(t => t.day_of_week === day).sort((a, b) => a.start_time.localeCompare(b.start_time));
                            return (
                              <tr key={day} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '0.75rem 0.5rem', fontWeight: 700, color: day === todayDay ? 'var(--primary)' : 'var(--text-main)' }}>{day}</td>
                                <td style={{ padding: '0.75rem 0.5rem' }}>
                                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    {slots.map(s => (
                                      <div key={s.id} style={{ padding: '0.4rem 0.625rem', borderRadius: '4px', border: '1px solid var(--border)', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
                                        <span style={{ fontWeight: 650, color: 'var(--text-main)' }}>{s.subject_name}</span>
                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{s.start_time} - {s.end_time}</span>
                                      </div>
                                    ))}
                                    {slots.length === 0 && <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No slots scheduled</span>}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SUBJECTS TAB */}
            {activeTab === 'subjects' && (
              <div className="card" style={{ padding: '1.5rem' }}>
                <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '1.25rem' }}>Mapped Course Subjects</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                  {allSubjects
                    .filter(sub => sub.course_id === section.course_id)
                    .map(sub => {
                      // Get assigned weekly slots for this subject
                      const subjectSlots = timetable.filter(t => t.subject_name === sub.subject_name);
                      const firstSlot = subjectSlots[0];
                      const mappedTeacher = firstSlot ? firstSlot.teacher_name : 'No Teacher Assigned';

                      return (
                        <div key={sub.id} style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '1.25rem', backgroundColor: 'var(--bg-surface)' }}>
                          <span style={{ float: 'right', fontSize: '0.75rem', fontWeight: 700, padding: '0.125rem 0.5rem', borderRadius: '4px', backgroundColor: '#e0f2fe', color: '#0369a1' }}>
                            {sub.credits || '3'} Credits
                          </span>
                          <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>{sub.subject_code}</span>
                          <span style={{ display: 'block', fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', margin: '0.25rem 0 0.75rem 0' }}>{sub.subject_name}</span>
                          
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem', fontSize: '0.85rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: 'var(--text-muted)' }}>Instructor</span>
                              <span style={{ fontWeight: 600 }}>{mappedTeacher}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: 'var(--text-muted)' }}>Classes Mapped/Week</span>
                              <span style={{ fontWeight: 600 }}>{subjectSlots.length} Classes</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  {allSubjects.filter(sub => sub.course_id === section.course_id).length === 0 && (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No subjects mapped to this Program/Class.</div>
                  )}
                </div>
              </div>
            )}

            {/* TEACHERS TAB */}
            {activeTab === 'teachers' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem' }}>
                  
                  {/* Class Teacher Card */}
                  <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', alignSelf: 'flex-start' }}>
                    <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '1.25rem' }}>Class Teacher Details</h4>
                    {section.class_teacher_name ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '0.75rem' }}>
                        <div style={{ width: '72px', height: '72px', borderRadius: '9999px', backgroundColor: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 800 }}>
                          {section.class_teacher_name.charAt(0)}
                        </div>
                        <div>
                          <span style={{ fontWeight: 800, fontSize: '1.25rem', color: 'var(--text-main)', display: 'block' }}>{section.class_teacher_name}</span>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block' }}>Primary Section Advisor</span>
                        </div>
                        <span style={{ display: 'inline-block', fontSize: '0.8rem', padding: '0.25rem 0.75rem', borderRadius: '9999px', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', fontWeight: 700 }}>
                          Active Duty
                        </span>
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1.5rem 0' }}>
                        <Users size={32} style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }} />
                        <p style={{ margin: 0, fontSize: '0.9rem' }}>No Class Advisor assigned yet.</p>
                      </div>
                    )}
                  </div>

                  {/* Subject Teachers Directory */}
                  <div className="card" style={{ padding: '1.5rem' }}>
                    <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '1.25rem' }}>Subject Instructors Directory</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {(() => {
                        const added = new Set();
                        const uniqueTimetableTeachers = timetable.filter(t => {
                          if (added.has(t.teacher_name)) return false;
                          added.add(t.teacher_name);
                          return true;
                        });

                        return uniqueTimetableTeachers.map(item => (
                          <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', border: '1px solid var(--border)', borderRadius: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                              <div style={{ width: '36px', height: '36px', borderRadius: '9999px', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                                {item.teacher_name.charAt(0)}
                              </div>
                              <div>
                                <span style={{ fontWeight: 700, color: 'var(--text-main)', display: 'block', fontSize: '0.95rem' }}>{item.teacher_name}</span>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Teaches: {item.subject_name}</span>
                              </div>
                            </div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)' }}>Assigned via Timetable</span>
                          </div>
                        ));
                      })()}
                      {timetable.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No teachers mapped to weekly timetable slots.</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* EXAMS TAB */}
            {activeTab === 'exams' && (
              <div className="card" style={{ padding: '1.5rem' }}>
                <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '1.25rem' }}>Exam Schedules & Statuses</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {filteredExams.map(exam => (
                    <div key={exam.id} style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '1.25rem', display: 'flex', justifyItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                      <div>
                        <span style={{ display: 'inline-block', fontSize: '0.7rem', padding: '0.125rem 0.5rem', borderRadius: '4px', backgroundColor: exam.status === 'PUBLISHED' ? '#dcfce7' : '#fef3c7', color: exam.status === 'PUBLISHED' ? '#15803d' : '#b45309', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                          {exam.status}
                        </span>
                        <span style={{ display: 'block', fontWeight: 800, fontSize: '1.15rem', color: 'var(--text-main)' }}>{exam.name}</span>
                        <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                          Timeline: {new Date(exam.start_date).toLocaleDateString()} to {new Date(exam.end_date).toLocaleDateString()}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <button className="btn btn-secondary" onClick={() => navigate(`/exams`)}>View Exam dossier</button>
                      </div>
                    </div>
                  ))}
                  {filteredExams.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No exams scheduled for this Section.</div>
                  )}
                </div>
              </div>
            )}

            {/* ANNOUNCEMENTS TAB */}
            {activeTab === 'announcements' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)' }}>Section notices & Broadcasts</h4>
                  <button className="btn btn-primary" onClick={() => setShowAnnouncementModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Plus size={16} /> Broadcast notice
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {announcements.map(item => (
                    <div key={item.id} className="card" style={{ padding: '1.25rem', backgroundColor: 'var(--bg-surface)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-main)' }}>{item.title}</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(item.created_at).toLocaleString()}</span>
                      </div>
                      <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', margin: 0, lineHeight: 1.5 }}>{item.content}</p>
                    </div>
                  ))}
                  {announcements.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '3rem', border: '1px dashed var(--border)', borderRadius: '8px', color: 'var(--text-muted)' }}>
                      No notices have been broadcasted for this Section.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* REPORTS TAB */}
            {activeTab === 'reports' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
                  {/* Top Performers Card */}
                  <div className="card" style={{ padding: '1.5rem' }}>
                    <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '1.25rem' }}>Top Attendance Performers</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {attendanceReport
                        .map(r => ({
                          ...r,
                          pct: r.total_sessions > 0 ? Math.round(((r.present_count || 0) + (r.late_count || 0)) / r.total_sessions * 100) : 100
                        }))
                        .sort((a, b) => b.pct - a.pct)
                        .slice(0, 3)
                        .map((student, index) => (
                          <div key={student.student_id} style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', padding: '0.625rem', border: '1px solid var(--border)', borderRadius: '6px' }}>
                            <span style={{ fontWeight: 650, fontSize: '0.85rem' }}>{index + 1}. {student.first_name} {student.last_name}</span>
                            <span style={{ color: '#10b981', fontWeight: 700, fontSize: '0.85rem' }}>{student.pct}%</span>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Fee Collection Status Card */}
                  <div className="card" style={{ padding: '1.5rem' }}>
                    <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '1.25rem' }}>Fee Collection progress</h4>
                    {(() => {
                      const totalCollected = feeRecords.reduce((acc, f) => acc + (f.paid_amount || 0), 0);
                      const totalAmount = feeRecords.reduce((acc, f) => acc + (f.total_amount || 0), 0);
                      const rate = totalAmount > 0 ? Math.round(totalCollected / totalAmount * 100) : 100;
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                            <span style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--primary)' }}>₹{totalCollected.toLocaleString()}</span>
                            <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)' }}>collected of ₹{totalAmount.toLocaleString()} total</span>
                          </div>
                          
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                              <span>Collection Progress Rate</span>
                              <span>{rate}%</span>
                            </div>
                            <div style={{ width: '100%', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                              <div style={{ width: `${rate}%`, height: '100%', backgroundColor: 'var(--primary)' }} />
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Gender and Demographics Summary */}
                  <div className="card" style={{ padding: '1.5rem' }}>
                    <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '1.25rem' }}>Section Demographic Distribution</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Total Enrollment Capacity</span>
                        <span style={{ fontWeight: 700 }}>{section.capacity || 40} seats</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Seats Occupied</span>
                        <span style={{ fontWeight: 700 }}>{activeStudentsCount} seats ({Math.round(activeStudentsCount / (section.capacity || 40) * 100)}% fill)</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Available Seats</span>
                        <span style={{ fontWeight: 700, color: '#10b981' }}>{Math.max(0, (section.capacity || 40) - activeStudentsCount)} seats free</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* DOCUMENTS TAB */}
            {activeTab === 'documents' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)' }}>Workspace documents folders</h4>
                  <button className="btn btn-primary" onClick={() => setShowDocumentModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Upload size={16} /> Upload file
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
                  {['Timetable', 'Exam Schedule', 'Projects', 'Circulars', 'Photos', 'Assignments'].map(folderName => {
                    const folderDocs = documents.filter(d => d.folder === folderName);
                    return (
                      <div key={folderName} className="card" style={{ padding: '1.25rem', border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                          <FolderOpen size={24} style={{ color: 'var(--primary)' }} />
                          <div>
                            <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-main)', display: 'block' }}>{folderName}</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{folderDocs.length} files</span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '180px', overflowY: 'auto' }}>
                          {folderDocs.map(doc => (
                            <div key={doc.id} style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', padding: '0.4rem', backgroundColor: '#f8fafc', borderRadius: '4px', fontSize: '0.8rem' }}>
                              <span 
                                onClick={() => handleDownloadDocument(doc.id)} 
                                style={{ fontWeight: 600, color: 'var(--primary)', cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}
                                className="hover-underline"
                                title="Download Document"
                              >
                                {doc.name}
                              </span>
                              <div style={{ display: 'flex', gap: '0.25rem' }}>
                                <button onClick={() => handleDeleteDocument(doc.id)} style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.1rem' }}>
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          ))}
                          {folderDocs.length === 0 && (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontStyle: 'italic', textAlign: 'center', padding: '1rem 0' }}>Empty Folder</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TIMELINE TAB */}
            {activeTab === 'timeline' && (
              <div className="card" style={{ padding: '1.5rem' }}>
                <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '1.25rem' }}>Audit Timeline Logs</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative' }}>
                  {timeline.map((log, index) => (
                    <div 
                      key={log.id} 
                      style={{ 
                        display: 'flex', 
                        gap: '1rem', 
                        position: 'relative',
                        paddingBottom: index === timeline.length - 1 ? 0 : '1.5rem'
                      }}
                    >
                      {/* Vertical line connector */}
                      {index !== timeline.length - 1 && (
                        <div style={{ position: 'absolute', left: '16px', top: '32px', bottom: 0, width: '2px', backgroundColor: '#e2e8f0' }} />
                      )}
                      
                      {/* Timeline dot */}
                      <div style={{ width: '32px', height: '32px', borderRadius: '9999px', backgroundColor: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Activity size={16} />
                      </div>

                      <div>
                        <span style={{ display: 'block', fontWeight: 750, color: 'var(--text-main)', fontSize: '0.95rem' }}>{log.description}</span>
                        <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                          by {log.user_name} ({log.user_email}) • {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                  {timeline.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No timeline entries found.</div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* --- BROADCAST ANNOUNCEMENT MODAL --- */}
      {showAnnouncementModal && (
        <div className="modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.45)', zIndex: 1000 }}>
          <div className="modal-content" style={{ backgroundColor: '#ffffff', borderRadius: 'var(--radius-lg)', maxWidth: '480px', width: '100%', padding: '2rem', boxShadow: 'var(--shadow-lg)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '1.25rem' }}>Broadcast notice to Section</h3>
            <form onSubmit={handleCreateAnnouncement} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.35rem', display: 'block' }}>Title *</label>
                <input 
                  type="text" 
                  value={announcementForm.title} 
                  onChange={e => setAnnouncementForm({ ...announcementForm, title: e.target.value })} 
                  placeholder="e.g. Test announcement title"
                  required 
                />
              </div>

              <div className="form-group">
                <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.35rem', display: 'block' }}>Content *</label>
                <textarea 
                  value={announcementForm.content} 
                  onChange={e => setAnnouncementForm({ ...announcementForm, content: e.target.value })} 
                  placeholder="Type the message content..."
                  rows={4}
                  required 
                />
              </div>

              <div className="form-group">
                <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.5rem', display: 'block' }}>Target Audience</label>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <label style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <input 
                      type="checkbox" 
                      checked={announcementForm.visible_to_students === 1} 
                      onChange={e => setAnnouncementForm({ ...announcementForm, visible_to_students: e.target.checked ? 1 : 0 })} 
                    /> Students
                  </label>
                  <label style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <input 
                      type="checkbox" 
                      checked={announcementForm.visible_to_teachers === 1} 
                      onChange={e => setAnnouncementForm({ ...announcementForm, visible_to_teachers: e.target.checked ? 1 : 0 })} 
                    /> Teachers
                  </label>
                  <label style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <input 
                      type="checkbox" 
                      checked={announcementForm.visible_to_parents === 1} 
                      onChange={e => setAnnouncementForm({ ...announcementForm, visible_to_parents: e.target.checked ? 1 : 0 })} 
                    /> Parents
                  </label>
                </div>
              </div>

              <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowAnnouncementModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Publish</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- DOCUMENT UPLOAD MODAL --- */}
      {showDocumentModal && (
        <div className="modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.45)', zIndex: 1000 }}>
          <div className="modal-content" style={{ backgroundColor: '#ffffff', borderRadius: 'var(--radius-lg)', maxWidth: '480px', width: '100%', padding: '2rem', boxShadow: 'var(--shadow-lg)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '1.25rem' }}>Upload Document to Section</h3>
            <form onSubmit={handleUploadDocument} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              <div className="form-group">
                <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.35rem', display: 'block' }}>Destination Folder</label>
                <select 
                  value={documentForm.folder} 
                  onChange={e => setDocumentForm({ ...documentForm, folder: e.target.value })}
                >
                  <option value="Timetable">Timetable</option>
                  <option value="Exam Schedule">Exam Schedule</option>
                  <option value="Projects">Projects</option>
                  <option value="Circulars">Circulars</option>
                  <option value="Photos">Photos</option>
                  <option value="Assignments">Assignments</option>
                </select>
              </div>

              <div className="form-group">
                <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.35rem', display: 'block' }}>Select File</label>
                <input 
                  type="file" 
                  onChange={e => setDocumentForm({ ...documentForm, file: (e.target.files && e.target.files[0]) || null })}
                  required
                />
              </div>

              <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowDocumentModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={uploadingDoc}>
                  {uploadingDoc ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- SETTINGS MODAL --- */}
      {showSettingsModal && (
        <div className="modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.45)', zIndex: 1000 }}>
          <div className="modal-content" style={{ backgroundColor: '#ffffff', borderRadius: 'var(--radius-lg)', maxWidth: '480px', width: '100%', padding: '2rem', boxShadow: 'var(--shadow-lg)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '1.25rem' }}>Edit Section configurations</h3>
            <form onSubmit={handleUpdateSettings} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.35rem', display: 'block' }}>Section Name *</label>
                <input 
                  type="text" 
                  value={settingsForm.name} 
                  onChange={e => setSettingsForm({ ...settingsForm, name: e.target.value })} 
                  required 
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.35rem', display: 'block' }}>Classroom Location</label>
                  <input 
                    type="text" 
                    value={settingsForm.room} 
                    onChange={e => setSettingsForm({ ...settingsForm, room: e.target.value })} 
                    placeholder="e.g. Block C-302"
                  />
                </div>

                <div className="form-group">
                  <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.35rem', display: 'block' }}>Max Capacity *</label>
                  <input 
                    type="number" 
                    value={settingsForm.capacity} 
                    onChange={e => setSettingsForm({ ...settingsForm, capacity: parseInt(e.target.value) || 0 })} 
                    required 
                    min="1"
                  />
                </div>
              </div>

              <div className="form-group">
                <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.35rem', display: 'block' }}>Class Teacher / Advisor</label>
                <select 
                  value={settingsForm.class_teacher_id} 
                  onChange={e => setSettingsForm({ ...settingsForm, class_teacher_id: e.target.value })}
                >
                  <option value="">-- Assign Class Teacher (Optional) --</option>
                  {allTeachers.map(t => (
                    <option key={t.id} value={t.id}>{t.first_name} {t.last_name} ({t.employee_id || 'No ID'})</option>
                  ))}
                </select>
              </div>

              <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
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
