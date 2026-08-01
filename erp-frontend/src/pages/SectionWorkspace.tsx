import './SectionWorkspace.css';
import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { hasAnyPermission, hasAnyRole } from '../utils/accessControl';
import {
  BookOpen, Users, Calendar, Settings, Plus, ArrowLeft,
  AlertTriangle, ClipboardCheck, UserCheck, FileText, RefreshCw
} from 'lucide-react';
import { PageGuidance } from '../components/PageGuidance';

import { sectionWorkspaceService } from './sectionWorkspace/sectionWorkspaceService';
import { StudentsTab } from './sectionWorkspace/components/StudentsTab';
import { SubjectsTab } from './sectionWorkspace/components/SubjectsTab';
import { TeachersTab } from './sectionWorkspace/components/TeachersTab';
import { TimetableTab } from './sectionWorkspace/components/TimetableTab';
import { AttendanceTab } from './sectionWorkspace/components/AttendanceTab';
import { ExamsTab } from './sectionWorkspace/components/ExamsTab';
import { SettingsModal } from './sectionWorkspace/components/SettingsModal';
import type { Student, TimetableItem, SectionSettingsForm } from './sectionWorkspace/sectionWorkspace.types';

export default function SectionWorkspace() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const userRoles = user?.roles || (user?.role ? [user.role] : []);
  const userPermissions = user?.permissions || [];
  const canManageAcademic = hasAnyPermission(userPermissions, ['academic.manage']) ||
    hasAnyRole(userRoles, ['admin', 'super_admin', 'Principal', 'HOD']);
  const canCreateStudent = hasAnyPermission(userPermissions, ['student.create']) || canManageAcademic;
  const canMarkAttendance = hasAnyPermission(userPermissions, ['attendance.mark']) ||
    canManageAcademic ||
    hasAnyRole(userRoles, ['Teacher']);
  const canAssignHomework = canManageAcademic || hasAnyRole(userRoles, ['Teacher']);

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
  const [settingsForm, setSettingsForm] = useState<SectionSettingsForm>({
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
      if (!id) return;
      // 1. Fetch Section main details
      const sectionData = await sectionWorkspaceService.getSection(id);
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
        const inst = await sectionWorkspaceService.getInstitution(user.institution_id);
        if (inst && inst.institution_type) {
          setInstitutionType(inst.institution_type);
        }
      }

      // 3. Fetch basic related listings for KPIs
      const [studentsData, timetableData, attendanceRep, allFeeRecs, examsData, teachersData, subjectsData, attSessions, allocationsData] = await Promise.all([
        sectionWorkspaceService.getStudents(id),
        sectionWorkspaceService.getWeeklyTimetable(id),
        sectionWorkspaceService.getStudentAttendanceReport(id),
        sectionWorkspaceService.getFeeRecords(),
        sectionWorkspaceService.getExams(),
        sectionWorkspaceService.getTeachers(),
        sectionWorkspaceService.getSubjects(),
        sectionWorkspaceService.getAttendanceSessions(id),
        sectionWorkspaceService.getTeachingAllocations(id),
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
      if (!id) return;
      await sectionWorkspaceService.updateSection(id, settingsForm);
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

        {canManageAcademic && (
          <button className="btn btn-secondary" onClick={() => setShowSettingsModal(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <Settings size={15} /> Class Settings
          </button>
        )}
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
        {canCreateStudent && (
          <button className="btn btn-secondary" onClick={() => navigate(`/students?showAdd=true&section_id=${id}`)} style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', height: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
            <Plus size={13} /> Enroll Student
          </button>
        )}
        {canMarkAttendance && (
          <button className="btn btn-secondary" onClick={() => navigate(`/attendance?section_id=${id}`)} style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', height: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
            <ClipboardCheck size={13} /> Mark Attendance
          </button>
        )}
        <button className="btn btn-secondary" onClick={() => { setActiveTab('timetable'); navigate('?tab=timetable'); }} style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', height: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
          <Calendar size={13} /> View Timetable
        </button>
        {canAssignHomework && (
          <button className="btn btn-secondary" onClick={() => navigate(`/homework`)} style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', height: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
            <BookOpen size={13} /> Assign Homework
          </button>
        )}
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
        {activeTab === 'students' && (
          <StudentsTab
            students={students}
            attendanceReport={attendanceReport}
            feeRecords={feeRecords}
            atRiskStudents={atRiskStudents}
            riskThreshold={riskThreshold}
            studentsSearch={studentsSearch}
            setStudentsSearch={setStudentsSearch}
            studentsFilterRisk={studentsFilterRisk}
            setStudentsFilterRisk={setStudentsFilterRisk}
          />
        )}

        {activeTab === 'subjects' && (
          <SubjectsTab
            section={section}
            allSubjects={allSubjects}
            allTeachers={allTeachers}
            allocations={allocations}
            sectionId={id}
            canManageAcademic={canManageAcademic}
          />
        )}

        {activeTab === 'teachers' && (
          <TeachersTab
            section={section}
            allTeachers={allTeachers}
            allSubjects={allSubjects}
            allocations={allocations}
            sectionId={id}
            canManageAcademic={canManageAcademic}
          />
        )}

        {activeTab === 'timetable' && (
          <TimetableTab timetable={timetable} canManageAcademic={canManageAcademic} />
        )}

        {activeTab === 'attendance' && (
          <AttendanceTab
            attendanceSessions={attendanceSessions}
            canMarkAttendance={canMarkAttendance}
            onMarkAttendance={() => navigate(`/attendance?section_id=${id}`)}
          />
        )}

        {activeTab === 'exams' && (
          <ExamsTab filteredExams={filteredExams} allSubjects={allSubjects} />
        )}
      </div>

      <SettingsModal
        show={showSettingsModal && canManageAcademic}
        form={settingsForm}
        setForm={setSettingsForm}
        allTeachers={allTeachers}
        onClose={() => setShowSettingsModal(false)}
        onSubmit={handleUpdateSettings}
      />

    </Layout>
  );
}
