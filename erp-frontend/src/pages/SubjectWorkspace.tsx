import './SubjectWorkspace.css';
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import {
  BookOpen, Users, Calendar, Clock, FolderOpen, Settings, Activity, Plus, ArrowLeft,
  Upload, Trash2, CheckCircle2, AlertTriangle, Search, FileText, Check, X, Clipboard,
  TrendingUp, Award, Layers, Sparkles, BookMarked, UserCheck, RefreshCw
} from 'lucide-react';
import { PageGuidance } from '../components/PageGuidance';

interface LessonPlanItem {
  id: string;
  unit_number: string;
  topic_title: string;
  topic_description: string;
  planned_hours: number;
  completed_hours: number;
  status: 'pending' | 'in_progress' | 'completed';
  completed_at: string | null;
}

interface AssessmentItem {
  id: string;
  name: string;
  assessment_type: string;
  max_marks: number;
  weightage_percent: number;
  due_date: string | null;
}

interface SubjectDocument {
  id: string;
  name: string;
  folder: string;
  file_key: string;
  file_size: number;
  uploaded_by: string;
  created_at: string;
}

export default function SubjectWorkspace() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const activeTab = searchParams.get('tab') || 'teachers';

  // State Management
  const [subject, setSubject] = useState<any>(null);
  const [teaching, setTeaching] = useState<any[]>([]);
  const [lessonPlans, setLessonPlans] = useState<LessonPlanItem[]>([]);
  const [assessments, setAssessments] = useState<AssessmentItem[]>([]);
  const [documents, setDocuments] = useState<SubjectDocument[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  
  // Loading & Error States
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [institutionType, setInstitutionType] = useState<string>('school');

  // Modals & Form States
  const [showLessonPlanModal, setShowLessonPlanModal] = useState(false);
  const [lessonPlanForm, setLessonPlanForm] = useState({
    unit_number: 'Unit 1',
    topic_title: '',
    topic_description: '',
    planned_hours: 3
  });

  const [showAssessmentModal, setShowAssessmentModal] = useState(false);
  const [assessmentForm, setAssessmentForm] = useState({
    name: '',
    assessment_type: 'Exam',
    max_marks: 100,
    weightage_percent: 20,
    due_date: ''
  });

  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [documentForm, setDocumentForm] = useState({
    folder: 'Lecture Notes',
    file: null as File | null
  });
  const [uploadingDoc, setUploadingDoc] = useState(false);

  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    subject_name: '',
    subject_code: '',
    credits: 3,
    semester: 1,
    course_id: '',
    is_elective: 0,
    status: 'ACTIVE',
    description: '',
    theory_lab: 'Theory',
    department: '',
    weekly_hours: 4
  });

  const getProgramLabel = () => institutionType === 'school' ? 'Class' : 'Program';
  const getProgramsLabel = () => institutionType === 'school' ? 'Classes' : 'Programs';
  
  const handleTabChange = (tab: string) => {
    setSearchParams({ tab });
  };

  // Redirect legacy tabs to teachers tab
  useEffect(() => {
    const legacyTabs = ['overview', 'teaching', 'students', 'assessments', 'analytics', 'timeline'];
    if (legacyTabs.includes(activeTab)) {
      handleTabChange('teachers');
    }
  }, [activeTab]);

  useEffect(() => {
    fetchSubjectData();
  }, [id]);

  const fetchSubjectData = async () => {
    setLoading(true);
    try {
      const subjectData = await api.get(`/subjects/${id}`);
      setSubject(subjectData);

      setSettingsForm({
        subject_name: subjectData.subject_name,
        subject_code: subjectData.subject_code || '',
        credits: subjectData.credits ?? 3,
        semester: subjectData.semester ?? 1,
        course_id: subjectData.course_id || '',
        is_elective: subjectData.is_elective ?? 0,
        status: subjectData.status || 'ACTIVE',
        description: subjectData.description || '',
        theory_lab: subjectData.theory_lab || 'Theory',
        department: subjectData.department || '',
        weekly_hours: subjectData.weekly_hours ?? 4
      });

      if (user?.institution_id) {
        const inst = await api.get(`/institutions/${user.institution_id}`);
        if (inst && inst.institution_type) {
          setInstitutionType(inst.institution_type);
        }
      }

      // Fetch programs list for edit settings dropdown
      const programsData = await api.get('/programs').catch(() => []);
      setPrograms(programsData);

      // Pre-load listings
      const [teachingData, lessonData, assessmentData, docsData] = await Promise.all([
        api.get(`/subjects/${id}/teaching`).catch(() => []),
        api.get(`/subjects/${id}/lesson-plan`).catch(() => []),
        api.get(`/subjects/${id}/assessments`).catch(() => []),
        api.get(`/subjects/${id}/documents`).catch(() => [])
      ]);

      setTeaching(teachingData || []);
      setLessonPlans(lessonData || []);
      setAssessments(assessmentData || []);
      setDocuments(docsData || []);
    } catch (err) {
      console.error('Failed to load Subject Workspace details', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.put(`/subjects/${id}`, settingsForm);
      setShowSettingsModal(false);
      fetchSubjectData();
    } catch (err: any) {
      alert(err.message || 'Failed to update subject settings.');
    } finally {
      setSubmitting(false);
    }
  };

  // Lesson Plan handlers
  const handleAddLessonPlanTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post(`/subjects/${id}/lesson-plan`, lessonPlanForm);
      setShowLessonPlanModal(false);
      setLessonPlanForm({ unit_number: 'Unit 1', topic_title: '', topic_description: '', planned_hours: 3 });
      
      const updated = await api.get(`/subjects/${id}/lesson-plan`);
      setLessonPlans(updated || []);
    } catch (err: any) {
      alert(err.message || 'Failed to create unit topic.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleTopicStatus = async (topicId: string, currentStatus: string) => {
    try {
      const nextStatus = currentStatus === 'completed' ? 'pending' : 'completed';
      await api.put(`/subjects/${id}/lesson-plan/${topicId}`, {
        status: nextStatus,
        completed_at: nextStatus === 'completed' ? new Date().toISOString() : null
      });
      const updated = await api.get(`/subjects/${id}/lesson-plan`);
      setLessonPlans(updated || []);
    } catch (err: any) {
      alert(err.message || 'Failed to toggle status.');
    }
  };

  const handleDeleteTopic = async (topicId: string) => {
    if (!confirm('Are you sure you want to delete this topic?')) return;
    try {
      await api.delete(`/subjects/${id}/lesson-plan/${topicId}`);
      const updated = await api.get(`/subjects/${id}/lesson-plan`);
      setLessonPlans(updated || []);
    } catch (err: any) {
      alert(err.message || 'Failed to delete topic.');
    }
  };

  // Assessment handlers
  const handleAddAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post(`/subjects/${id}/assessments`, assessmentForm);
      setShowAssessmentModal(false);
      setAssessmentForm({ name: '', assessment_type: 'Exam', max_marks: 100, weightage_percent: 20, due_date: '' });
      
      const updated = await api.get(`/subjects/${id}/assessments`);
      setAssessments(updated || []);
    } catch (err: any) {
      alert(err.message || 'Failed to create assessment.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAssessment = async (assessId: string) => {
    if (!confirm('Are you sure you want to delete this exam/assessment?')) return;
    try {
      await api.delete(`/subjects/${id}/assessments/${assessId}`);
      const updated = await api.get(`/subjects/${id}/assessments`);
      setAssessments(updated || []);
    } catch (err: any) {
      alert(err.message || 'Failed to delete assessment.');
    }
  };

  // Documents handlers
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
      formData.append('name', documentForm.file.name);
      formData.append('folder', documentForm.folder);

      const res = await api.upload(`/subjects/${id}/documents/upload`, formData);
      setShowDocumentModal(false);
      setDocumentForm({ folder: 'Lecture Notes', file: null });

      const updated = await api.get(`/subjects/${id}/documents`);
      setDocuments(updated || []);
    } catch (err: any) {
      alert(err.message || 'File upload failed.');
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    try {
      await api.delete(`/subjects/${id}/documents/${docId}`);
      const updated = await api.get(`/subjects/${id}/documents`);
      setDocuments(updated || []);
    } catch (err: any) {
      alert(err.message || 'Error deleting file.');
    }
  };

  const handleDownloadDocument = async (docId: string) => {
    try {
      const response = await api.get(`/subjects/${id}/documents/${docId}`);
      if (response && response.download_url) {
        window.open(response.download_url, '_blank');
      } else {
        alert('File download url could not be generated.');
      }
    } catch (err) {
      alert('Failed to trigger download.');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <RefreshCw size={24} className="spin" style={{ marginBottom: '1rem' }} />
          <p>Loading subject workspace...</p>
        </div>
      </Layout>
    );
  }

  if (!subject) {
    return (
      <Layout>
        <div style={{ padding: '3rem', textAlign: 'center' }}>
          <AlertTriangle size={48} color="var(--danger)" style={{ marginBottom: '1rem' }} />
          <h3>Subject Not Found</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>The requested subject records could not be retrieved.</p>
          <Link to="/subjects" className="btn btn-primary">
            <ArrowLeft size={16} /> Back to Subjects Directory
          </Link>
        </div>
      </Layout>
    );
  }

  // Workload and summary computations
  const uniqueTeachersCount = Array.from(new Set(teaching.map(t => t.teacher_id))).length;
  const uniqueSectionsCount = Array.from(new Set(teaching.map(t => t.section_id))).length;
  const totalWeeklyPeriods = uniqueSectionsCount * (subject.weekly_hours || 4);

  // Lesson Plan coverage computation
  const totalPlannedHours = lessonPlans.reduce((acc, curr) => acc + curr.planned_hours, 0);
  const totalCompletedHours = lessonPlans.reduce((acc, curr) => acc + (curr.completed_hours || 0), 0);
  const syllabusPercent = totalPlannedHours > 0 ? Math.round((totalCompletedHours / totalPlannedHours) * 100) : 0;
  const completedTopicsCount = lessonPlans.filter(p => p.status === 'completed').length;

  // Upcoming Exams
  const upcomingExamsCount = assessments.filter(a => a.due_date && new Date(a.due_date) >= new Date()).length;

  return (
    <Layout>
      <PageGuidance
        title="Subject Workspace"
        description="View assigned faculty, syllabus completion rates, lesson plans, class resources, and scheduled tests."
        steps={[
          "Select the Lesson Plan tab to track units delivery.",
          "Check resources to download or upload study materials.",
          "Exams tab shows tests details mapped for this subject."
        ]}
      />

      {/* Hero Header */}
      <div className="subject-workspace-col-10" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Link to="/subjects" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }} className="hover-underline">
              <ArrowLeft size={14} /> Subjects
            </Link>
            <span style={{ color: 'var(--text-muted)' }}>•</span>
            <span className="badge" style={{ fontSize: '0.75rem' }}>{subject.subject_code}</span>
          </div>

          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-main)' }}>
            {subject.subject_name}
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Grade Association: {subject.course_name} • Credits: {subject.credits}
          </p>
        </div>

        <button className="btn btn-secondary" onClick={() => setShowSettingsModal(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
          <Settings size={15} /> Subject Settings
        </button>
      </div>

      {/* Summary Card */}
      <div className="card summary-card" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.5rem', background: 'var(--bg-card)', borderLeft: '4px solid var(--primary)', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '1.15rem', fontWeight: '700', color: 'var(--text-main)' }}>{subject.subject_name} Metrics</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
              Type: {subject.theory_lab || 'Theory'} • Code: {subject.subject_code}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '2.5rem', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700', letterSpacing: '0.05em' }}>Teachers</div>
              <div style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-main)' }}>{uniqueTeachersCount}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700', letterSpacing: '0.05em' }}>Mapped Classes</div>
              <div style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-main)' }}>{uniqueSectionsCount}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700', letterSpacing: '0.05em' }}>Total Periods/Wk</div>
              <div style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-main)' }}>{totalWeeklyPeriods}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700', letterSpacing: '0.05em' }}>Lesson Plan</div>
              <div style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--success)' }}>{syllabusPercent}%</div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700', letterSpacing: '0.05em' }}>Upcoming Exams</div>
              <div style={{ fontSize: '1.15rem', fontWeight: '800', color: upcomingExamsCount > 0 ? 'var(--warning)' : 'var(--text-main)' }}>{upcomingExamsCount}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions Panel */}
      <div className="card quick-actions-panel" style={{ padding: '0.75rem 1rem', marginBottom: '1.5rem', background: 'var(--bg-subtle)', display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-secondary)', marginRight: '0.5rem', letterSpacing: '0.05em' }}>Quick Actions:</span>
        <button className="btn btn-secondary" onClick={() => { handleTabChange('lesson_plan'); navigate('?tab=lesson_plan'); setShowLessonPlanModal(true); }} style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', height: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
          <Plus size={13} /> Add Lesson Plan Topic
        </button>
        <button className="btn btn-secondary" onClick={() => { handleTabChange('resources'); navigate('?tab=resources'); setShowDocumentModal(true); }} style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', height: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
          <Upload size={13} /> Upload Resource File
        </button>
        <button className="btn btn-secondary" onClick={() => { handleTabChange('exams'); navigate('?tab=exams'); setShowAssessmentModal(true); }} style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', height: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
          <Plus size={13} /> Create Exam / Test
        </button>
        <button className="btn btn-secondary" onClick={() => navigate('/timetable')} style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', height: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
          <Calendar size={13} /> View Timetable Grid
        </button>
      </div>

      {/* Workspace Navigation Tabs */}
      <div className="subject-workspace-tabs" style={{ display: 'flex', gap: '1.5rem', borderBottom: '1px solid var(--border)', marginBottom: '1.5rem' }}>
        {[
          { tab: 'teachers', label: 'Faculty Instructors', icon: UserCheck },
          { tab: 'classes', label: `Class Sections (${uniqueSectionsCount})`, icon: Layers },
          { tab: 'weekly_periods', label: 'Weekly Periods Config', icon: Clock },
          { tab: 'lesson_plan', label: `Lesson Plan (${syllabusPercent}% Done)`, icon: Clipboard },
          { tab: 'resources', label: `Resources Library (${documents.length})`, icon: FolderOpen },
          { tab: 'exams', label: 'Exams & Assessments', icon: Award }
        ].map(t => {
          const Icon = t.icon;
          const isActive = activeTab === t.tab;
          return (
            <button
              key={t.tab}
              type="button"
              onClick={() => handleTabChange(t.tab)}
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
      <div className="subject-workspace-tab-content">
        
        {/* 1. TEACHERS TAB (VIEW-ONLY) */}
        {activeTab === 'teachers' && (
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--primary-soft)', border: '1px solid var(--primary-border)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: '500' }}>
                ℹ️ Teacher allocations are managed centrally.
              </span>
              <Link to="/academic-setup?tab=assignments" style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--primary)' }} className="hover-underline">
                Go to Subject Assignments →
              </Link>
            </div>

            <h4 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-main)', marginBottom: '1rem' }}>Faculty Mapped to this Subject</h4>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
              {(() => {
                const uniqueTeacherIds = Array.from(new Set(teaching.map(t => t.teacher_id)));
                return uniqueTeacherIds.map(tId => {
                  const mappings = teaching.filter(t => t.teacher_id === tId);
                  const firstMapping = mappings[0];
                  const sectionsList = mappings.map(m => m.section_name).join(', ');

                  return (
                    <div key={tId} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'center', background: 'var(--bg-subtle)' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700' }}>
                        {firstMapping.teacher_name.charAt(0)}
                      </div>
                      <div>
                        <div style={{ fontWeight: '700', color: 'var(--text-main)', fontSize: '0.9rem' }}>{firstMapping.teacher_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Classes: {sectionsList}</div>
                      </div>
                    </div>
                  );
                });
              })()}
              {teaching.length === 0 && (
                <div style={{ color: 'var(--text-secondary)', gridColumn: 'span 3', textAlign: 'center', padding: '2rem' }}>No teachers assigned to this subject.</div>
              )}
            </div>
          </div>
        )}

        {/* 2. CLASSES TAB (VIEW-ONLY) */}
        {activeTab === 'classes' && (
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--primary-soft)', border: '1px solid var(--primary-border)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: '500' }}>
                ℹ️ Mapped classes are managed centrally.
              </span>
              <Link to="/academic-setup?tab=assignments" style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--primary)' }} className="hover-underline">
                Go to Subject Assignments →
              </Link>
            </div>

            <h4 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-main)', marginBottom: '1rem' }}>Active Class Section Mappings</h4>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
              {teaching.map(item => (
                <div key={item.id} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '1rem', background: 'var(--bg-subtle)' }}>
                  <div style={{ fontWeight: '700', color: 'var(--text-main)', fontSize: '0.95rem', marginBottom: '0.5rem' }}>Section {item.section_name}</div>
                  <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    <div>Teacher: <strong style={{ color: 'var(--text-main)' }}>{item.teacher_name}</strong></div>
                    <div>Year: {item.academic_year_name}</div>
                  </div>
                </div>
              ))}
              {teaching.length === 0 && (
                <div style={{ color: 'var(--text-secondary)', gridColumn: 'span 3', textAlign: 'center', padding: '2rem' }}>No class section maps found.</div>
              )}
            </div>
          </div>
        )}

        {/* 3. WEEKLY PERIODS TAB */}
        {activeTab === 'weekly_periods' && (
          <div className="card" style={{ padding: '1.25rem' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-main)', marginBottom: '1rem' }}>Weekly periods details</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div>
                <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-secondary)' }}>Weekly Periods Mapped</td>
                      <td style={{ padding: '0.75rem 0.5rem', fontWeight: '700' }}>{subject.weekly_hours ?? 4} periods / week</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-secondary)' }}>Credits value</td>
                      <td style={{ padding: '0.75rem 0.5rem', fontWeight: '700' }}>{subject.credits ?? 3} credits</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-secondary)' }}>Theory / Lab</td>
                      <td style={{ padding: '0.75rem 0.5rem', fontWeight: '700' }}>{subject.theory_lab || 'Theory'}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-secondary)' }}>Association Level</td>
                      <td style={{ padding: '0.75rem 0.5rem', fontWeight: '700' }}>{subject.course_name} (Semester {subject.semester})</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div>
                <h5 style={{ fontWeight: '600', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Subject Description</h5>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                  {subject.description || 'No description has been mapped for this subject.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 4. LESSON PLAN TAB */}
        {activeTab === 'lesson_plan' && (
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-main)' }}>Subject Lesson Delivery Plan</h4>
              <button className="btn btn-primary" onClick={() => setShowLessonPlanModal(true)}>
                <Plus size={15} /> Add Topic
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {lessonPlans.map(item => {
                const isCompleted = item.status === 'completed';
                return (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: isCompleted ? 'var(--success-soft)' : 'var(--bg-card)' }}>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                      <button
                        type="button"
                        onClick={() => handleToggleTopicStatus(item.id, item.status)}
                        style={{ border: 'none', background: 'none', cursor: 'pointer', color: isCompleted ? 'var(--success)' : 'var(--text-muted)' }}
                      >
                        <CheckCircle2 size={20} />
                      </button>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '0.85rem', color: 'var(--text-main)', textDecoration: isCompleted ? 'line-through' : 'none' }}>
                          [{item.unit_number}] {item.topic_title}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                          {item.topic_description} • Hours planned: {item.planned_hours} hrs
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteTopic(item.id)}
                      style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--danger)', padding: '0.25rem' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                );
              })}
              {lessonPlans.length === 0 && (
                <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-secondary)' }}>No topics set up in lesson plan yet.</div>
              )}
            </div>
          </div>
        )}

        {/* 5. RESOURCES TAB */}
        {activeTab === 'resources' && (
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-main)' }}>Study Materials & Resources</h4>
              <button className="btn btn-primary" onClick={() => setShowDocumentModal(true)}>
                <Upload size={15} /> Upload File
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
              {['Lecture Notes', 'Assignments', 'Syllabus', 'Past Papers'].map(folder => {
                const folderDocs = documents.filter(d => d.folder === folder);
                return (
                  <div key={folder} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                      <FolderOpen size={18} style={{ color: 'var(--primary)' }} />
                      <strong style={{ fontSize: '0.85rem' }}>{folder}</strong>
                      <span className="badge" style={{ marginLeft: 'auto', fontSize: '0.7rem' }}>{folderDocs.length}</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {folderDocs.map(doc => (
                        <div key={doc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                          <span onClick={() => handleDownloadDocument(doc.id)} style={{ cursor: 'pointer', color: 'var(--primary)' }} className="hover-underline">
                            {doc.name}
                          </span>
                          <button onClick={() => handleDeleteDocument(doc.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--danger)' }}>
                            <Trash2 size={11} />
                          </button>
                        </div>
                      ))}
                      {folderDocs.length === 0 && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Empty folder</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 6. EXAMS & ASSESSMENTS TAB */}
        {activeTab === 'exams' && (
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-main)' }}>Exams & Assessment Tasks</h4>
              <button className="btn btn-primary" onClick={() => setShowAssessmentModal(true)}>
                <Plus size={15} /> Create Exam
              </button>
            </div>

            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ textAlign: 'left', padding: '0.5rem' }}>Name</th>
                  <th style={{ textAlign: 'left', padding: '0.5rem' }}>Type</th>
                  <th style={{ textAlign: 'left', padding: '0.5rem' }}>Max Marks</th>
                  <th style={{ textAlign: 'left', padding: '0.5rem' }}>Weightage</th>
                  <th style={{ textAlign: 'left', padding: '0.5rem' }}>Due Date</th>
                  <th style={{ textAlign: 'right', padding: '0.5rem', width: '80px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {assessments.map(exam => (
                  <tr key={exam.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '0.65rem 0.5rem', fontWeight: '600' }}>{exam.name}</td>
                    <td style={{ padding: '0.65rem 0.5rem' }}>{exam.assessment_type}</td>
                    <td style={{ padding: '0.65rem 0.5rem' }}>{exam.max_marks} marks</td>
                    <td style={{ padding: '0.65rem 0.5rem' }}>{exam.weightage_percent}%</td>
                    <td style={{ padding: '0.65rem 0.5rem' }}><code>{exam.due_date ? new Date(exam.due_date).toLocaleDateString() : 'N/A'}</code></td>
                    <td style={{ padding: '0.65rem 0.5rem', textAlign: 'right' }}>
                      <button className="btn btn-danger" style={{ padding: '0.2rem 0.4rem', height: 'auto' }} onClick={() => handleDeleteAssessment(exam.id)}>
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
                {assessments.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No exams configured.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- ADD LESSON PLAN TOPIC MODAL --- */}
      {showLessonPlanModal && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.40)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card modal-content" style={{ width: '420px', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '1rem' }}>Add lesson plan topic</h3>
            <form onSubmit={handleAddLessonPlanTopic} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-secondary)' }}>Unit Name</label>
                <input 
                  type="text" 
                  value={lessonPlanForm.unit_number} 
                  onChange={e => setLessonPlanForm({ ...lessonPlanForm, unit_number: e.target.value })} 
                  className="input"
                  placeholder="e.g. Unit 1"
                  required 
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-secondary)' }}>Topic Title</label>
                <input 
                  type="text" 
                  value={lessonPlanForm.topic_title} 
                  onChange={e => setLessonPlanForm({ ...lessonPlanForm, topic_title: e.target.value })} 
                  className="input"
                  placeholder="e.g. Equations and Variables"
                  required 
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-secondary)' }}>Topic Description</label>
                <textarea 
                  value={lessonPlanForm.topic_description} 
                  onChange={e => setLessonPlanForm({ ...lessonPlanForm, topic_description: e.target.value })} 
                  className="input"
                  placeholder="Topic details..."
                  rows={3}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-secondary)' }}>Planned lecture hours</label>
                <input 
                  type="number" 
                  value={lessonPlanForm.planned_hours} 
                  onChange={e => setLessonPlanForm({ ...lessonPlanForm, planned_hours: parseInt(e.target.value) || 3 })} 
                  className="input"
                  min="1"
                  required 
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowLessonPlanModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Save Topic'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ADD ASSESSMENT/EXAM MODAL --- */}
      {showAssessmentModal && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.40)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card modal-content" style={{ width: '420px', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '1rem' }}>Create Exam / Assessment</h3>
            <form onSubmit={handleAddAssessment} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-secondary)' }}>Assessment Name *</label>
                <input 
                  type="text" 
                  value={assessmentForm.name} 
                  onChange={e => setAssessmentForm({ ...assessmentForm, name: e.target.value })} 
                  className="input"
                  placeholder="e.g. Midterm Examination"
                  required 
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-secondary)' }}>Type</label>
                  <select 
                    value={assessmentForm.assessment_type} 
                    onChange={e => setAssessmentForm({ ...assessmentForm, assessment_type: e.target.value })}
                    className="input"
                  >
                    <option value="Exam">Exam</option>
                    <option value="Quiz">Quiz</option>
                    <option value="Assignment">Assignment</option>
                    <option value="Practical">Practical</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-secondary)' }}>Max Marks *</label>
                  <input 
                    type="number" 
                    value={assessmentForm.max_marks} 
                    onChange={e => setAssessmentForm({ ...assessmentForm, max_marks: parseInt(e.target.value) || 100 })} 
                    className="input"
                    required 
                    min="1"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-secondary)' }}>Weightage (%) *</label>
                  <input 
                    type="number" 
                    value={assessmentForm.weightage_percent} 
                    onChange={e => setAssessmentForm({ ...assessmentForm, weightage_percent: parseInt(e.target.value) || 20 })} 
                    className="input"
                    required 
                    min="1"
                    max="100"
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-secondary)' }}>Due Date</label>
                  <input 
                    type="date" 
                    value={assessmentForm.due_date} 
                    onChange={e => setAssessmentForm({ ...assessmentForm, due_date: e.target.value })} 
                    className="input"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowAssessmentModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- UPLOAD RESOURCE MODAL --- */}
      {showDocumentModal && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.40)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card modal-content" style={{ width: '400px', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '1rem' }}>Upload Study Resource</h3>
            <form onSubmit={handleUploadDocument} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-secondary)' }}>Resource Category</label>
                <select 
                  value={documentForm.folder} 
                  onChange={e => setDocumentForm({ ...documentForm, folder: e.target.value })}
                  className="input"
                >
                  <option value="Lecture Notes">Lecture Notes</option>
                  <option value="Assignments">Assignments</option>
                  <option value="Syllabus">Syllabus</option>
                  <option value="Past Papers">Past Papers</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-secondary)' }}>Select File</label>
                <input 
                  type="file" 
                  onChange={e => setDocumentForm({ ...documentForm, file: (e.target.files && e.target.files[0]) || null })}
                  className="input"
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowDocumentModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={uploadingDoc}>
                  {uploadingDoc ? 'Uploading...' : 'Upload File'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- SUBJECT SETTINGS MODAL --- */}
      {showSettingsModal && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.40)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card modal-content" style={{ width: '480px', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '1.25rem' }}>Subject Configurations</h3>
            <form onSubmit={handleUpdateSettings} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', gridColumn: 'span 2' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-secondary)' }}>Subject Name *</label>
                <input 
                  type="text" 
                  value={settingsForm.subject_name} 
                  onChange={e => setSettingsForm({ ...settingsForm, subject_name: e.target.value })} 
                  className="input"
                  required 
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-secondary)' }}>Subject Code *</label>
                <input 
                  type="text" 
                  value={settingsForm.subject_code} 
                  onChange={e => setSettingsForm({ ...settingsForm, subject_code: e.target.value })} 
                  className="input"
                  required 
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-secondary)' }}>Class / Grade *</label>
                <select 
                  value={settingsForm.course_id} 
                  onChange={e => setSettingsForm({ ...settingsForm, course_id: e.target.value })}
                  className="input"
                  required
                >
                  {programs.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-secondary)' }}>Weekly Periods *</label>
                <input 
                  type="number" 
                  value={settingsForm.weekly_hours} 
                  onChange={e => setSettingsForm({ ...settingsForm, weekly_hours: parseInt(e.target.value) || 4 })} 
                  className="input"
                  required 
                  min="1"
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-secondary)' }}>Credits *</label>
                <input 
                  type="number" 
                  value={settingsForm.credits} 
                  onChange={e => setSettingsForm({ ...settingsForm, credits: parseInt(e.target.value) || 3 })} 
                  className="input"
                  required 
                  min="1"
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-secondary)' }}>Theory / Lab</label>
                <select 
                  value={settingsForm.theory_lab} 
                  onChange={e => setSettingsForm({ ...settingsForm, theory_lab: e.target.value })}
                  className="input"
                >
                  <option value="Theory">Theory</option>
                  <option value="Lab">Lab</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-secondary)' }}>Is Elective?</label>
                <select 
                  value={settingsForm.is_elective} 
                  onChange={e => setSettingsForm({ ...settingsForm, is_elective: parseInt(e.target.value) || 0 })}
                  className="input"
                >
                  <option value="0">No (Core)</option>
                  <option value="1">Yes (Elective)</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', gridColumn: 'span 2' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-secondary)' }}>Description</label>
                <textarea 
                  value={settingsForm.description} 
                  onChange={e => setSettingsForm({ ...settingsForm, description: e.target.value })} 
                  className="input"
                  rows={2}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', gridColumn: 'span 2', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowSettingsModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save Configurations'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </Layout>
  );
}
