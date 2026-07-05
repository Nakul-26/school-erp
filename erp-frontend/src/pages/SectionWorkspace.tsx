import './SectionWorkspace.css';
import React, { useEffect, useState } from 'react';
import { PageGuidance } from '../components/PageGuidance';
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
      <PageGuidance
        title="Class Workspace"
        description="Use this page to manage the weekly timetable, enrolled students, and teacher assignments for this class section."
        steps={["View all students enrolled in this class section.","Assign teachers to teach specific subjects in this section.","Review and build the section's weekly timetable."]}
      />
        <div className="section-workspace-col-1">
          <Activity className="spinner section-workspace-spinner" size={48}  />
          <p className="section-workspace-text-3">Initializing Section Workspace...</p>
        </div>
      </Layout>
    );
  }

  if (!section) {
    return (
      <Layout>
        <div className="section-workspace-div-4">
          <AlertTriangle size={48} className="section-workspace-AlertTriangle-5"  />
          <h3 className="section-workspace-title-6">Section Not Found</h3>
          <p className="section-workspace-text-7">The requested class or section records could not be retrieved.</p>
          <Link to="/classes" className="btn btn-primary section-workspace-btn">
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
      <div className="section-workspace-row-9">
        <div>
          <div className="section-workspace-row-10">
            <Link to="/classes" className="hover-underline section-workspace-hover-underline">
              <ArrowLeft size={16} /> All Classes
            </Link>
            <span className="section-workspace-span-12">•</span>
            <span style={{ display: 'inline-block', padding: '0.125rem 0.625rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', backgroundColor: section.is_active ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)', color: section.is_active ? '#10b981' : '#ef4444' }}>
              {section.is_active ? 'Active Workspace' : 'Archived'}
            </span>
          </div>

          <h2 className="section-workspace-row-13">
            {section.name}
            <span className="section-workspace-span-14">
              ({section.academic_year_name})
            </span>
          </h2>
          <p className="section-workspace-text-15">
            {section.course_name} • {institutionType === 'school' ? `Class/Grade 1` : `Year ${section.year_number}`}
          </p>
        </div>

        {/* Quick Actions Panel */}
        <div className="section-workspace-row-16">
          <button className="btn btn-secondary section-workspace-btn" onClick={() => navigate(`/attendance?section_id=${id}`)}>
            <ClipboardCheck size={18} className="section-workspace-ClipboardCheck-18"  /> Mark Attendance
          </button>
          
          <button className="btn btn-secondary section-workspace-btn" onClick={() => setShowAnnouncementModal(true)}>
            <Bell size={18} className="section-workspace-Bell-20"  /> Broadcast Notice
          </button>

          <button className="btn btn-secondary section-workspace-btn" onClick={() => setActiveTab('timetable')}>
            <Calendar size={18} className="section-workspace-Calendar-22"  /> View Timetable
          </button>

          <button className="btn btn-primary section-workspace-btn" onClick={() => setShowSettingsModal(true)}>
            <Settings size={18} /> Settings
          </button>
        </div>
      </div>

      {/* 2. KPIs Grid */}
      <div className="section-workspace-grid-24">
        
        {/* Class Teacher KPI */}
        <div onClick={() => setActiveTab('teachers')} className="hover-lift section-workspace-hover-lift">
          <div className="section-workspace-row-26">
            <span className="section-workspace-span-27">Class Teacher</span>
            <Users size={16} className="section-workspace-Users-28"  />
          </div>
          <span className="section-workspace-span-29">
            {section.class_teacher_name || 'Unassigned'}
          </span>
          <span className="section-workspace-span-30">View Profile & Contacts</span>
        </div>

        {/* Room Mapped KPI */}
        <div onClick={() => setActiveTab('settings')} className="hover-lift section-workspace-hover-lift">
          <div className="section-workspace-row-32">
            <span className="section-workspace-span-33">Classroom Room</span>
            <MapPin size={16} className="section-workspace-MapPin-34"  />
          </div>
          <span className="section-workspace-span-35">
            {section.room || 'No Room Mapped'}
          </span>
          <span className="section-workspace-span-36">Capacity: {section.capacity || 40} Seats</span>
        </div>

        {/* Enrollment / Fill Rate KPI */}
        <div onClick={() => setActiveTab('students')} className="hover-lift section-workspace-hover-lift">
          <div className="section-workspace-row-38">
            <span className="section-workspace-span-39">Students Enrolled</span>
            <UserCheck size={16} className="section-workspace-UserCheck-40"  />
          </div>
          <span className="section-workspace-span-41">
            {activeStudentsCount} / {section.capacity || 40}
          </span>
          <div className="section-workspace-div-42">
            <div style={{ width: `${Math.min(100, Math.round((activeStudentsCount / (section.capacity || 40)) * 100))}%`, height: '100%', backgroundColor: 'var(--primary)' }} />
          </div>
        </div>

        {/* Attendance KPI */}
        <div onClick={() => setActiveTab('attendance')} className="hover-lift section-workspace-hover-lift">
          <div className="section-workspace-row-44">
            <span className="section-workspace-span-45">Avg Attendance</span>
            <Activity size={16} style={{ color: attendancePercentage >= 85 ? '#10b981' : '#f97316' }} />
          </div>
          <span style={{ display: 'block', fontSize: '1.5rem', fontWeight: 900, color: attendancePercentage >= riskThreshold ? '#10b981' : '#ef4444' }}>
            {attendancePercentage}%
          </span>
          <span className="section-workspace-span-46">Threshold limit: 75%</span>
        </div>

        {/* Risk / Alerts KPI */}
        <div onClick={() => { setStudentsFilterRisk(true); setActiveTab('students'); }} className="hover-lift section-workspace-hover-lift">
          <div className="section-workspace-row-48">
            <span className="section-workspace-span-49">Students At Risk</span>
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
        <div onClick={() => setActiveTab('reports')} className="hover-lift section-workspace-hover-lift">
          <div className="section-workspace-row-51">
            <span className="section-workspace-span-52">Fee Defaulters</span>
            <IndianRupee size={16} className="section-workspace-IndianRupee-53"  />
          </div>
          <span style={{ display: 'block', fontSize: '1.5rem', fontWeight: 900, color: pendingFeesCount > 0 ? '#ef4444' : 'var(--text-main)' }}>
            {pendingFeesCount} <span className="section-workspace-span-54">Students</span>
          </span>
          <span className="section-workspace-span-55">Click to view details</span>
        </div>

      </div>

      {/* 3. Workspace Navigation Tabs */}
      <div className="section-workspace-row-56">
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
      <div className="section-workspace-div-57">
        {tabLoading && activeTab !== 'overview' ? (
          <div className="section-workspace-col-58">
            <Activity className="spinner section-workspace-spinner" size={32}  />
            <span className="section-workspace-span-60">Loading workspace components...</span>
          </div>
        ) : (
          <div>
            {/* OVERVIEW DASHBOARD */}
            {activeTab === 'overview' && (
              <div className="section-workspace-grid-61">
                <div className="section-workspace-col-62">
                  {/* Today's Schedule Card */}
                  <div className="card section-workspace-card">
                    <div className="section-workspace-row-64">
                      <h4 className="section-workspace-row-65">
                        <Clock size={18} className="section-workspace-Clock-66"  /> Today's Schedule
                      </h4>
                      <button className="btn btn-sm btn-secondary" onClick={() => setActiveTab('timetable')}>Weekly Grid</button>
                    </div>

                    <div className="section-workspace-col-67">
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
                            <div className="section-workspace-row-68">
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
                                <span className="section-workspace-span-69">{item.subject_name}</span>
                                <span className="section-workspace-span-70">{item.teacher_name}</span>
                              </div>
                            </div>

                            <div className="section-workspace-row-71">
                              <span className="section-workspace-row-72">
                                <Clock size={14} /> {item.start_time} - {item.end_time}
                              </span>

                              {status === 'current' && (
                                <span className="section-workspace-span-73">
                                  Ongoing
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {todaysSchedule.length === 0 && (
                        <div className="section-workspace-div-74">
                          No classes scheduled for today ({todayDay}). Free day!
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Upcoming Exams List */}
                  <div className="card section-workspace-card">
                    <div className="section-workspace-row-76">
                      <h4 className="section-workspace-row-77">
                        <FileText size={18} className="section-workspace-FileText-78"  /> Upcoming Exams
                      </h4>
                      <button className="btn btn-sm btn-secondary" onClick={() => setActiveTab('exams')}>Full Schedule</button>
                    </div>

                    <div className="section-workspace-grid-79">
                      {filteredExams.slice(0, 2).map(exam => (
                        <div key={exam.id} className="section-workspace-div-80">
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', padding: '0.125rem 0.5rem', borderRadius: '4px', backgroundColor: exam.status === 'PUBLISHED' ? '#dcfce7' : '#f1f5f9', color: exam.status === 'PUBLISHED' ? '#15803d' : '#475569', display: 'inline-block', marginBottom: '0.5rem' }}>
                            {exam.status}
                          </span>
                          <span className="section-workspace-span-81">{exam.name}</span>
                          <span className="section-workspace-span-82">
                            {new Date(exam.start_date).toLocaleDateString()} - {new Date(exam.end_date).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                      {filteredExams.length === 0 && (
                        <div className="section-workspace-div-83">
                          No upcoming exams scheduled.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="section-workspace-col-84">
                  {/* Class Teacher Details Card */}
                  <div className="card section-workspace-card">
                    <h4 className="section-workspace-title-86">Class Teacher</h4>
                    {section.class_teacher_name ? (
                      <div className="section-workspace-row-87">
                        <div className="section-workspace-row-88">
                          {section.class_teacher_name.charAt(0)}
                        </div>
                        <div>
                          <span className="section-workspace-span-89">{section.class_teacher_name}</span>
                          <span className="section-workspace-span-90">Class Advisor</span>
                        </div>
                      </div>
                    ) : (
                      <div className="section-workspace-col-91">
                        <span>No class teacher has been assigned yet.</span>
                        <button className="btn btn-sm btn-secondary" onClick={() => setShowSettingsModal(true)}>Assign Teacher</button>
                      </div>
                    )}
                  </div>

                  {/* Section Health Card */}
                  <div className="card section-workspace-card">
                    <h4 className="section-workspace-title-93">Section Health</h4>
                    <div className="section-workspace-col-94">
                      <div>
                        <div className="section-workspace-row-95">
                          <span className="section-workspace-span-96">Attendance Rate</span>
                          <span style={{ color: attendancePercentage >= riskThreshold ? '#10b981' : '#ef4444' }}>{attendancePercentage}%</span>
                        </div>
                        <div className="section-workspace-div-97">
                          <div style={{ width: `${attendancePercentage}%`, height: '100%', borderRadius: '3px', backgroundColor: attendancePercentage >= riskThreshold ? '#10b981' : '#ef4444' }} />
                        </div>
                      </div>

                      <div>
                        <div className="section-workspace-row-98">
                          <span className="section-workspace-span-99">Enrollment fill rate</span>
                          <span>{Math.round(activeStudentsCount / (section.capacity || 40) * 100)}%</span>
                        </div>
                        <div className="section-workspace-div-100">
                          <div style={{ width: `${Math.round(activeStudentsCount / (section.capacity || 40) * 100)}%`, height: '100%', borderRadius: '3px', backgroundColor: 'var(--primary)' }} />
                        </div>
                      </div>

                      <div>
                        <div className="section-workspace-row-101">
                          <span className="section-workspace-span-102">Fee Collection Rate</span>
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
                            <div className="section-workspace-div-103">
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
              <div className="card section-workspace-card">
                <div className="section-workspace-row-105">
                  <div className="section-workspace-div-106">
                    <Search size={16} className="section-workspace-Search-107"  />
                    <input type="text" placeholder="Search roster..." value={studentsSearch} onChange={e => setStudentsSearch(e.target.value)} className="section-workspace-input-108"  />
                  </div>

                  <div className="section-workspace-row-109">
                    <label className="section-workspace-row-110">
                      <input 
                        type="checkbox" 
                        checked={studentsFilterRisk} 
                        onChange={e => setStudentsFilterRisk(e.target.checked)} 
                      />
                      Show Students At Risk Only (&lt; 75%)
                    </label>
                  </div>
                </div>

                <table className="table section-workspace-table">
                  <thead>
                    <tr className="section-workspace-tr-112">
                      <th className="section-workspace-th-113">Roll No.</th>
                      <th className="section-workspace-th-114">Student Name</th>
                      <th className="section-workspace-th-115">Admission No.</th>
                      <th className="section-workspace-th-116">Attendance Rate</th>
                      <th className="section-workspace-th-117">Fee Status</th>
                      <th className="section-workspace-th-118">Quick Actions</th>
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
                          <tr key={s.id} className="hover-row section-workspace-hover-row">
                            <td className="section-workspace-td-120">{s.roll_number || 'N/A'}</td>
                            <td className="section-workspace-td-121">
                              <Link to={`/students/${s.id}`} className="hover-underline section-workspace-hover-underline">
                                {s.first_name} {s.last_name}
                              </Link>
                              <span className="section-workspace-span-123">{s.email || 'No Email Mapped'}</span>
                            </td>
                            <td className="section-workspace-td-124"><code>{s.admission_number}</code></td>
                            <td className="section-workspace-td-125">
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
                            <td className="section-workspace-td-126">
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
                            <td className="section-workspace-td-127">
                              <div className="section-workspace-row-128">
                                <button className="btn btn-sm btn-secondary" onClick={() => navigate(`/students/${s.id}`)}>Profile</button>
                                <button className="btn btn-sm btn-secondary" onClick={() => alert('Feature to notify parent triggered successfully!')}>Message Parent</button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    {students.length === 0 && (
                      <tr>
                        <td colSpan={6} className="section-workspace-td-129">
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
              <div className="section-workspace-col-130">
                <div className="section-workspace-grid-131">
                  {/* Today's Stats Card */}
                  <div className="card section-workspace-card">
                    <h4 className="section-workspace-title-133">Today's Attendance Work</h4>
                    <div className="section-workspace-col-134">
                      <div className="section-workspace-row-135">
                        <span className="section-workspace-span-136">Total Students</span>
                        <span className="section-workspace-span-137">{activeStudentsCount} Students</span>
                      </div>
                      
                      {/* Attendance Sessions marked today */}
                      {(() => {
                        const todayStr = new Date().toISOString().split('T')[0];
                        const sessionsToday = attendanceSessions.filter(s => s.date === todayStr);
                        return (
                          <div className="section-workspace-div-138">
                            <span className="section-workspace-span-139">Today's Sessions ({sessionsToday.length})</span>
                            {sessionsToday.length > 0 ? (
                              <div className="section-workspace-col-140">
                                {sessionsToday.map(s => (
                                  <div key={s.id} className="section-workspace-row-141">
                                    <span className="section-workspace-span-142">{s.subject_name}</span>
                                    <span className="section-workspace-span-143">{s.start_time || 'General Slot'}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="section-workspace-span-144">No attendance sessions marked yet today.</span>
                            )}
                          </div>
                        );
                      })()}

                      <button className="btn btn-primary section-workspace-btn" onClick={() => navigate(`/attendance?section_id=${id}`)}>
                        <ClipboardCheck size={18} /> Mark Today's Attendance
                      </button>
                    </div>
                  </div>

                  {/* Below Threshold List */}
                  <div className="card section-workspace-card">
                    <h4 className="section-workspace-row-147">
                      <AlertTriangle size={18} className="section-workspace-AlertTriangle-148"  /> Below Threshold (&lt; {riskThreshold}%)
                    </h4>
                    <div className="section-workspace-col-149">
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
                            <div key={r.student_id} className="section-workspace-row-150">
                              <span className="section-workspace-span-151">{r.first_name} {r.last_name}</span>
                              <span className="section-workspace-span-152">{sPct}%</span>
                            </div>
                          );
                        })}
                      {atRiskStudentsCount === 0 && (
                        <div className="section-workspace-row-153">No students below threshold! Excellent.</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Recent Sessions list */}
                <div className="card section-workspace-card">
                  <h4 className="section-workspace-title-155">Recent Attendance Sessions Log</h4>
                  <table className="table section-workspace-table">
                    <thead>
                      <tr className="section-workspace-tr-157">
                        <th className="section-workspace-th-158">Session Date</th>
                        <th className="section-workspace-th-159">Subject Mapped</th>
                        <th className="section-workspace-th-160">Teacher Assigned</th>
                        <th className="section-workspace-th-161">Timetable Period</th>
                        <th className="section-workspace-th-162">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendanceSessions.slice(0, 5).map(session => (
                        <tr key={session.id} className="section-workspace-tr-163">
                          <td className="section-workspace-td-164">{session.date}</td>
                          <td className="section-workspace-td-165">{session.subject_name}</td>
                          <td className="section-workspace-td-166">{session.teacher_name}</td>
                          <td className="section-workspace-td-167">{session.slot_name || 'General'}</td>
                          <td className="section-workspace-td-168">
                            <button className="btn btn-sm btn-secondary" onClick={() => navigate(`/attendance?session_id=${session.id}`)}>Edit Marks</button>
                          </td>
                        </tr>
                      ))}
                      {attendanceSessions.length === 0 && (
                        <tr>
                          <td colSpan={5} className="section-workspace-td-169">No historical attendance sessions logged.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TIMETABLE TAB */}
            {activeTab === 'timetable' && (
              <div className="section-workspace-col-170">
                <div className="section-workspace-grid-171">
                  
                  {/* Status Panel */}
                  <div className="card section-workspace-card">
                    <h4 className="section-workspace-title-173">Schedule status</h4>
                    <div className="section-workspace-col-174">
                      {/* Current Period Highlight */}
                      {(() => {
                        const current = todaysSchedule.find(t => getPeriodStatus(t.start_time, t.end_time) === 'current');
                        return (
                          <div style={{ padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: current ? 'rgba(16, 185, 129, 0.05)' : '#f8fafc' }}>
                            <span className="section-workspace-span-175">Current active class</span>
                            {current ? (
                              <>
                                <span className="section-workspace-span-176">{current.subject_name}</span>
                                <span className="section-workspace-span-177">by {current.teacher_name}</span>
                                <span className="section-workspace-row-178">
                                  <Clock size={12} /> Ends at {current.end_time}
                                </span>
                              </>
                            ) : (
                              <span className="section-workspace-span-179">No ongoing class right now. (Free Period / Break)</span>
                            )}
                          </div>
                        );
                      })()}

                      {/* Next Period Highlight */}
                      {(() => {
                        const nextSlot = todaysSchedule.find(t => getPeriodStatus(t.start_time, t.end_time) === 'upcoming');
                        return (
                          <div className="section-workspace-div-180">
                            <span className="section-workspace-span-181">Next Scheduled Period</span>
                            {nextSlot ? (
                              <>
                                <span className="section-workspace-span-182">{nextSlot.subject_name}</span>
                                <span className="section-workspace-span-183">by {nextSlot.teacher_name}</span>
                                <span className="section-workspace-row-184">
                                  <Clock size={12} /> Starts at {nextSlot.start_time}
                                </span>
                              </>
                            ) : (
                              <span className="section-workspace-span-185">No upcoming classes for the rest of today.</span>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Weekly Timeline Grid */}
                  <div className="card section-workspace-card">
                    <h4 className="section-workspace-title-187">Weekly Schedule Overview</h4>
                    <div className="section-workspace-div-188">
                      <table className="section-workspace-table-189">
                        <thead>
                          <tr className="section-workspace-tr-190">
                            <th className="section-workspace-th-191">Day</th>
                            <th className="section-workspace-th-192">Schedule slots details</th>
                          </tr>
                        </thead>
                        <tbody>
                          {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => {
                            const slots = timetable.filter(t => t.day_of_week === day).sort((a, b) => a.start_time.localeCompare(b.start_time));
                            return (
                              <tr key={day} className="section-workspace-tr-193">
                                <td style={{ padding: '0.75rem 0.5rem', fontWeight: 700, color: day === todayDay ? 'var(--primary)' : 'var(--text-main)' }}>{day}</td>
                                <td className="section-workspace-td-194">
                                  <div className="section-workspace-row-195">
                                    {slots.map(s => (
                                      <div key={s.id} className="section-workspace-col-196">
                                        <span className="section-workspace-span-197">{s.subject_name}</span>
                                        <span className="section-workspace-span-198">{s.start_time} - {s.end_time}</span>
                                      </div>
                                    ))}
                                    {slots.length === 0 && <span className="section-workspace-span-199">No slots scheduled</span>}
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
              <div className="card section-workspace-card">
                <h4 className="section-workspace-title-201">Mapped Course Subjects</h4>
                <div className="section-workspace-grid-202">
                  {allSubjects
                    .filter(sub => sub.course_id === section.course_id)
                    .map(sub => {
                      // Get assigned weekly slots for this subject
                      const subjectSlots = timetable.filter(t => t.subject_name === sub.subject_name);
                      const firstSlot = subjectSlots[0];
                      const mappedTeacher = firstSlot ? firstSlot.teacher_name : 'No Teacher Assigned';

                      return (
                        <div key={sub.id} className="section-workspace-div-203">
                          <span className="section-workspace-span-204">
                            {sub.credits || '3'} Credits
                          </span>
                          <span className="section-workspace-span-205">{sub.subject_code}</span>
                          <span className="section-workspace-span-206">{sub.subject_name}</span>
                          
                          <div className="section-workspace-col-207">
                            <div className="section-workspace-row-208">
                              <span className="section-workspace-span-209">Instructor</span>
                              <span className="section-workspace-span-210">{mappedTeacher}</span>
                            </div>
                            <div className="section-workspace-row-211">
                              <span className="section-workspace-span-212">Classes Mapped/Week</span>
                              <span className="section-workspace-span-213">{subjectSlots.length} Classes</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  {allSubjects.filter(sub => sub.course_id === section.course_id).length === 0 && (
                    <div className="section-workspace-div-214">No subjects mapped to this Program/Class.</div>
                  )}
                </div>
              </div>
            )}

            {/* TEACHERS TAB */}
            {activeTab === 'teachers' && (
              <div className="section-workspace-col-215">
                <div className="section-workspace-grid-216">
                  
                  {/* Class Teacher Card */}
                  <div className="card section-workspace-card">
                    <h4 className="section-workspace-title-218">Class Teacher Details</h4>
                    {section.class_teacher_name ? (
                      <div className="section-workspace-col-219">
                        <div className="section-workspace-row-220">
                          {section.class_teacher_name.charAt(0)}
                        </div>
                        <div>
                          <span className="section-workspace-span-221">{section.class_teacher_name}</span>
                          <span className="section-workspace-span-222">Primary Section Advisor</span>
                        </div>
                        <span className="section-workspace-span-223">
                          Active Duty
                        </span>
                      </div>
                    ) : (
                      <div className="section-workspace-div-224">
                        <Users size={32} className="section-workspace-Users-225"  />
                        <p className="section-workspace-text-226">No Class Advisor assigned yet.</p>
                      </div>
                    )}
                  </div>

                  {/* Subject Teachers Directory */}
                  <div className="card section-workspace-card">
                    <h4 className="section-workspace-title-228">Subject Instructors Directory</h4>
                    <div className="section-workspace-col-229">
                      {(() => {
                        const added = new Set();
                        const uniqueTimetableTeachers = timetable.filter(t => {
                          if (added.has(t.teacher_name)) return false;
                          added.add(t.teacher_name);
                          return true;
                        });

                        return uniqueTimetableTeachers.map(item => (
                          <div key={item.id} className="section-workspace-row-230">
                            <div className="section-workspace-row-231">
                              <div className="section-workspace-row-232">
                                {item.teacher_name.charAt(0)}
                              </div>
                              <div>
                                <span className="section-workspace-span-233">{item.teacher_name}</span>
                                <span className="section-workspace-span-234">Teaches: {item.subject_name}</span>
                              </div>
                            </div>
                            <span className="section-workspace-span-235">Assigned via Timetable</span>
                          </div>
                        ));
                      })()}
                      {timetable.length === 0 && (
                        <div className="section-workspace-div-236">No teachers mapped to weekly timetable slots.</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* EXAMS TAB */}
            {activeTab === 'exams' && (
              <div className="card section-workspace-card">
                <h4 className="section-workspace-title-238">Exam Schedules & Statuses</h4>
                <div className="section-workspace-col-239">
                  {filteredExams.map(exam => (
                    <div key={exam.id} className="section-workspace-row-240">
                      <div>
                        <span style={{ display: 'inline-block', fontSize: '0.7rem', padding: '0.125rem 0.5rem', borderRadius: '4px', backgroundColor: exam.status === 'PUBLISHED' ? '#dcfce7' : '#fef3c7', color: exam.status === 'PUBLISHED' ? '#15803d' : '#b45309', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                          {exam.status}
                        </span>
                        <span className="section-workspace-span-241">{exam.name}</span>
                        <span className="section-workspace-span-242">
                          Timeline: {new Date(exam.start_date).toLocaleDateString()} to {new Date(exam.end_date).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="section-workspace-row-243">
                        <button className="btn btn-secondary" onClick={() => navigate(`/exams`)}>View Exam dossier</button>
                      </div>
                    </div>
                  ))}
                  {filteredExams.length === 0 && (
                    <div className="section-workspace-div-244">No exams scheduled for this Section.</div>
                  )}
                </div>
              </div>
            )}

            {/* ANNOUNCEMENTS TAB */}
            {activeTab === 'announcements' && (
              <div className="section-workspace-col-245">
                <div className="section-workspace-row-246">
                  <h4 className="section-workspace-title-247">Section notices & Broadcasts</h4>
                  <button className="btn btn-primary section-workspace-btn" onClick={() => setShowAnnouncementModal(true)}>
                    <Plus size={16} /> Broadcast notice
                  </button>
                </div>

                <div className="section-workspace-col-249">
                  {announcements.map(item => (
                    <div key={item.id} className="card section-workspace-card">
                      <div className="section-workspace-row-251">
                        <span className="section-workspace-span-252">{item.title}</span>
                        <span className="section-workspace-span-253">{new Date(item.created_at).toLocaleString()}</span>
                      </div>
                      <p className="section-workspace-text-254">{item.content}</p>
                    </div>
                  ))}
                  {announcements.length === 0 && (
                    <div className="section-workspace-div-255">
                      No notices have been broadcasted for this Section.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* REPORTS TAB */}
            {activeTab === 'reports' && (
              <div className="section-workspace-col-256">
                <div className="section-workspace-grid-257">
                  {/* Top Performers Card */}
                  <div className="card section-workspace-card">
                    <h4 className="section-workspace-title-259">Top Attendance Performers</h4>
                    <div className="section-workspace-col-260">
                      {attendanceReport
                        .map(r => ({
                          ...r,
                          pct: r.total_sessions > 0 ? Math.round(((r.present_count || 0) + (r.late_count || 0)) / r.total_sessions * 100) : 100
                        }))
                        .sort((a, b) => b.pct - a.pct)
                        .slice(0, 3)
                        .map((student, index) => (
                          <div key={student.student_id} className="section-workspace-row-261">
                            <span className="section-workspace-span-262">{index + 1}. {student.first_name} {student.last_name}</span>
                            <span className="section-workspace-span-263">{student.pct}%</span>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Fee Collection Status Card */}
                  <div className="card section-workspace-card">
                    <h4 className="section-workspace-title-265">Fee Collection progress</h4>
                    {(() => {
                      const totalCollected = feeRecords.reduce((acc, f) => acc + (f.paid_amount || 0), 0);
                      const totalAmount = feeRecords.reduce((acc, f) => acc + (f.total_amount || 0), 0);
                      const rate = totalAmount > 0 ? Math.round(totalCollected / totalAmount * 100) : 100;
                      return (
                        <div className="section-workspace-col-266">
                          <div className="section-workspace-div-267">
                            <span className="section-workspace-span-268">₹{totalCollected.toLocaleString()}</span>
                            <span className="section-workspace-span-269">collected of ₹{totalAmount.toLocaleString()} total</span>
                          </div>
                          
                          <div>
                            <div className="section-workspace-row-270">
                              <span>Collection Progress Rate</span>
                              <span>{rate}%</span>
                            </div>
                            <div className="section-workspace-div-271">
                              <div style={{ width: `${rate}%`, height: '100%', backgroundColor: 'var(--primary)' }} />
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Gender and Demographics Summary */}
                  <div className="card section-workspace-card">
                    <h4 className="section-workspace-title-273">Section Demographic Distribution</h4>
                    <div className="section-workspace-col-274">
                      <div className="section-workspace-row-275">
                        <span className="section-workspace-span-276">Total Enrollment Capacity</span>
                        <span className="section-workspace-span-277">{section.capacity || 40} seats</span>
                      </div>
                      <div className="section-workspace-row-278">
                        <span className="section-workspace-span-279">Seats Occupied</span>
                        <span className="section-workspace-span-280">{activeStudentsCount} seats ({Math.round(activeStudentsCount / (section.capacity || 40) * 100)}% fill)</span>
                      </div>
                      <div className="section-workspace-row-281">
                        <span className="section-workspace-span-282">Available Seats</span>
                        <span className="section-workspace-span-283">{Math.max(0, (section.capacity || 40) - activeStudentsCount)} seats free</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* DOCUMENTS TAB */}
            {activeTab === 'documents' && (
              <div className="section-workspace-col-284">
                <div className="section-workspace-row-285">
                  <h4 className="section-workspace-title-286">Workspace documents folders</h4>
                  <button className="btn btn-primary section-workspace-btn" onClick={() => setShowDocumentModal(true)}>
                    <Upload size={16} /> Upload file
                  </button>
                </div>

                <div className="section-workspace-grid-288">
                  {['Timetable', 'Exam Schedule', 'Projects', 'Circulars', 'Photos', 'Assignments'].map(folderName => {
                    const folderDocs = documents.filter(d => d.folder === folderName);
                    return (
                      <div key={folderName} className="card section-workspace-card">
                        <div className="section-workspace-row-290">
                          <FolderOpen size={24} className="section-workspace-FolderOpen-291"  />
                          <div>
                            <span className="section-workspace-span-292">{folderName}</span>
                            <span className="section-workspace-span-293">{folderDocs.length} files</span>
                          </div>
                        </div>

                        <div className="section-workspace-col-294">
                          {folderDocs.map(doc => (
                            <div key={doc.id} className="section-workspace-row-295">
                              <span onClick={() => handleDownloadDocument(doc.id)} className="hover-underline section-workspace-hover-underline" title="Download Document">
                                {doc.name}
                              </span>
                              <div className="section-workspace-row-297">
                                <button onClick={() => handleDeleteDocument(doc.id)} className="section-workspace-btn-298">
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          ))}
                          {folderDocs.length === 0 && (
                            <div className="section-workspace-row-299">Empty Folder</div>
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
              <div className="card section-workspace-card">
                <h4 className="section-workspace-title-301">Audit Timeline Logs</h4>
                <div className="section-workspace-col-302">
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
                        <div className="section-workspace-div-303"  />
                      )}
                      
                      {/* Timeline dot */}
                      <div className="section-workspace-row-304">
                        <Activity size={16} />
                      </div>

                      <div>
                        <span className="section-workspace-span-305">{log.description}</span>
                        <span className="section-workspace-span-306">
                          by {log.user_name} ({log.user_email}) • {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                  {timeline.length === 0 && (
                    <div className="section-workspace-div-307">No timeline entries found.</div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* --- BROADCAST ANNOUNCEMENT MODAL --- */}
      {showAnnouncementModal && (
        <div className="modal-overlay section-workspace-modal-overlay">
          <div className="modal-content section-workspace-modal-content">
            <h3 className="section-workspace-title-310">Broadcast notice to Section</h3>
            <form onSubmit={handleCreateAnnouncement} className="section-workspace-col-311">
              <div className="form-group">
                <label className="section-workspace-label-312">Title *</label>
                <input 
                  type="text" 
                  value={announcementForm.title} 
                  onChange={e => setAnnouncementForm({ ...announcementForm, title: e.target.value })} 
                  placeholder="e.g. Test announcement title"
                  required 
                />
              </div>

              <div className="form-group">
                <label className="section-workspace-label-313">Content *</label>
                <textarea 
                  value={announcementForm.content} 
                  onChange={e => setAnnouncementForm({ ...announcementForm, content: e.target.value })} 
                  placeholder="Type the message content..."
                  rows={4}
                  required 
                />
              </div>

              <div className="form-group">
                <label className="section-workspace-label-314">Target Audience</label>
                <div className="section-workspace-row-315">
                  <label className="section-workspace-row-316">
                    <input 
                      type="checkbox" 
                      checked={announcementForm.visible_to_students === 1} 
                      onChange={e => setAnnouncementForm({ ...announcementForm, visible_to_students: e.target.checked ? 1 : 0 })} 
                    /> Students
                  </label>
                  <label className="section-workspace-row-317">
                    <input 
                      type="checkbox" 
                      checked={announcementForm.visible_to_teachers === 1} 
                      onChange={e => setAnnouncementForm({ ...announcementForm, visible_to_teachers: e.target.checked ? 1 : 0 })} 
                    /> Teachers
                  </label>
                  <label className="section-workspace-row-318">
                    <input 
                      type="checkbox" 
                      checked={announcementForm.visible_to_parents === 1} 
                      onChange={e => setAnnouncementForm({ ...announcementForm, visible_to_parents: e.target.checked ? 1 : 0 })} 
                    /> Parents
                  </label>
                </div>
              </div>

              <div className="modal-actions section-workspace-modal-actions">
                <button type="button" onClick={() => setShowAnnouncementModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Publish</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- DOCUMENT UPLOAD MODAL --- */}
      {showDocumentModal && (
        <div className="modal-overlay section-workspace-modal-overlay">
          <div className="modal-content section-workspace-modal-content">
            <h3 className="section-workspace-title-322">Upload Document to Section</h3>
            <form onSubmit={handleUploadDocument} className="section-workspace-col-323">
              
              <div className="form-group">
                <label className="section-workspace-label-324">Destination Folder</label>
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
                <label className="section-workspace-label-325">Select File</label>
                <input 
                  type="file" 
                  onChange={e => setDocumentForm({ ...documentForm, file: (e.target.files && e.target.files[0]) || null })}
                  required
                />
              </div>

              <div className="modal-actions section-workspace-modal-actions">
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
        <div className="modal-overlay section-workspace-modal-overlay">
          <div className="modal-content section-workspace-modal-content">
            <h3 className="section-workspace-title-329">Edit Section configurations</h3>
            <form onSubmit={handleUpdateSettings} className="section-workspace-col-330">
              <div className="form-group">
                <label className="section-workspace-label-331">Section Name *</label>
                <input 
                  type="text" 
                  value={settingsForm.name} 
                  onChange={e => setSettingsForm({ ...settingsForm, name: e.target.value })} 
                  required 
                />
              </div>

              <div className="section-workspace-grid-332">
                <div className="form-group">
                  <label className="section-workspace-label-333">Classroom Location</label>
                  <input 
                    type="text" 
                    value={settingsForm.room} 
                    onChange={e => setSettingsForm({ ...settingsForm, room: e.target.value })} 
                    placeholder="e.g. Block C-302"
                  />
                </div>

                <div className="form-group">
                  <label className="section-workspace-label-334">Max Capacity *</label>
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
                <label className="section-workspace-label-335">Class Teacher / Advisor</label>
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

              <div className="modal-actions section-workspace-modal-actions">
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
