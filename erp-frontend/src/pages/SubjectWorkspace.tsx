import './SubjectWorkspace.css';
import React, { useEffect, useState } from 'react';
import { PageGuidance } from '../components/PageGuidance';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import {
  BookOpen, Users, Calendar, Clock, BarChart2, FolderOpen, Settings, Activity, Plus, ArrowLeft,
  Upload, Trash2, CheckCircle2, AlertTriangle, Search, HelpCircle, FileText, Check, X, Clipboard,
  TrendingUp, Award, Layers, ShieldAlert, Sparkles, BookMarked, UserCheck, RefreshCw
} from 'lucide-react';

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

interface AuditLog {
  id: string;
  action: string;
  description: string;
  timestamp: string;
  user_name: string;
  user_email: string;
}

interface EnrolledStudent {
  id: string;
  first_name: string;
  last_name: string;
  roll_no: string | null;
  admission_no: string;
  section_id: string;
  section_name: string;
  total_classes: number;
  present_classes: number;
  attendance_percent: number | null;
  marks_avg: number | null;
  exams: any[];
}

export default function SubjectWorkspace() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const activeTab = searchParams.get('tab') || 'overview';

  // State Management
  const [subject, setSubject] = useState<any>(null);
  const [teaching, setTeaching] = useState<any[]>([]);
  const [students, setStudents] = useState<EnrolledStudent[]>([]);
  const [lessonPlans, setLessonPlans] = useState<LessonPlanItem[]>([]);
  const [assessments, setAssessments] = useState<AssessmentItem[]>([]);
  const [documents, setDocuments] = useState<SubjectDocument[]>([]);
  const [timeline, setTimeline] = useState<AuditLog[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  
  // Loading & Error States
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [institutionType, setInstitutionType] = useState<string>('college');

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
    assessment_type: 'assignment', // 'quiz', 'assignment', 'internal_test', 'lab_eval', 'project', 'final_exam'
    max_marks: 100,
    weightage_percent: 10,
    due_date: ''
  });

  const [showDocModal, setShowDocModal] = useState(false);
  const [docForm, setDocForm] = useState({
    folder: 'Lecture Notes', // 'Syllabus', 'Lecture Notes', 'Assignments', 'Question Papers', 'Reference Books', 'Videos', 'Previous Year Papers'
    file: null as File | null
  });

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

  // Client-Side Search / Filters
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [selectedSectionFilter, setSelectedSectionFilter] = useState('');
  const [lowAttendanceFilter, setLowAttendanceFilter] = useState(false);

  const getProgramLabel = () => institutionType === 'school' ? 'Class' : 'Program';
  const getProgramsLabel = () => institutionType === 'school' ? 'Classes' : 'Programs';
  
  const handleTabChange = (tab: string) => {
    setSearchParams({ tab });
  };

  useEffect(() => {
    fetchSubjectData();
  }, [id]);

  useEffect(() => {
    if (subject) {
      fetchTabSpecificData();
    }
  }, [activeTab, subject]);

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

      // Pre-load KPIs/basic listings
      const [teachingData, studentsData, lessonData, assessmentData, docsData] = await Promise.all([
        api.get(`/subjects/${id}/teaching`).catch(() => []),
        api.get(`/subjects/${id}/students`).catch(() => []),
        api.get(`/subjects/${id}/lesson-plan`).catch(() => []),
        api.get(`/subjects/${id}/assessments`).catch(() => []),
        api.get(`/subjects/${id}/documents`).catch(() => [])
      ]);

      setTeaching(teachingData);
      setStudents(studentsData);
      setLessonPlans(lessonData);
      setAssessments(assessmentData);
      setDocuments(docsData);
    } catch (err) {
      console.error('Failed to load Subject Workspace details', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTabSpecificData = async () => {
    try {
      if (activeTab === 'timeline') {
        const logs = await api.get(`/subjects/${id}/timeline`);
        setTimeline(logs);
      } else if (activeTab === 'documents') {
        const docs = await api.get(`/subjects/${id}/documents`);
        setDocuments(docs);
      } else if (activeTab === 'lesson-plan') {
        const lessonData = await api.get(`/subjects/${id}/lesson-plan`);
        setLessonPlans(lessonData);
      } else if (activeTab === 'assessments') {
        const assessmentData = await api.get(`/subjects/${id}/assessments`);
        setAssessments(assessmentData);
      } else if (activeTab === 'students') {
        const studentsData = await api.get(`/subjects/${id}/students`);
        setStudents(studentsData);
      } else if (activeTab === 'teaching') {
        const teachingData = await api.get(`/subjects/${id}/teaching`);
        setTeaching(teachingData);
      }
    } catch (e) {
      console.error('Failed to reload tab specific data', e);
    }
  };

  // Syllabus Completion Calculator
  const totalPlannedHours = lessonPlans.reduce((acc, curr) => acc + curr.planned_hours, 0);
  const totalCompletedHours = lessonPlans.reduce((acc, curr) => acc + (curr.completed_hours || 0), 0);
  const syllabusPercent = totalPlannedHours > 0 ? Math.round((totalCompletedHours / totalPlannedHours) * 100) : 0;
  const completedTopicsCount = lessonPlans.filter(p => p.status === 'completed').length;
  
  // Health Calculations
  const hasFaculty = teaching.length > 0;
  const hasSections = teaching.length > 0;
  const hasAssessments = assessments.length > 0;
  const hasResources = documents.length > 0;
  const hasLessonPlan = lessonPlans.length > 0;

  let healthStatus: 'healthy' | 'warning' | 'critical' = 'healthy';
  let healthScore = 100;
  
  if (!hasFaculty) { healthScore -= 40; healthStatus = 'critical'; }
  if (!hasSections) { healthScore -= 30; if (healthStatus !== 'critical') healthStatus = 'warning'; }
  if (!hasLessonPlan) { healthScore -= 10; if (healthStatus === 'healthy') healthStatus = 'warning'; }
  if (!hasAssessments) { healthScore -= 10; if (healthStatus === 'healthy') healthStatus = 'warning'; }
  if (syllabusPercent < 30 && hasLessonPlan) { healthScore -= 10; if (healthStatus === 'healthy') healthStatus = 'warning'; }

  // Action Handlers
  const handleAddLessonPlanTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post(`/subjects/${id}/lesson-plan`, lessonPlanForm);
      setShowLessonPlanModal(false);
      setLessonPlanForm({ unit_number: 'Unit 1', topic_title: '', topic_description: '', planned_hours: 3 });
      fetchTabSpecificData();
    } catch (err: any) {
      alert(err.message || 'Error adding topic');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateTopicStatus = async (topicId: string, status: 'pending' | 'in_progress' | 'completed', plannedHours: number) => {
    try {
      await api.patch(`/subjects/${id}/lesson-plan/${topicId}`, { 
        status,
        completed_hours: status === 'completed' ? plannedHours : 0 
      });
      fetchTabSpecificData();
    } catch (err: any) {
      alert(err.message || 'Error updating status');
    }
  };

  const handleDeleteTopic = async (topicId: string) => {
    if (!confirm('Are you sure you want to delete this syllabus topic?')) return;
    try {
      await api.delete(`/subjects/${id}/lesson-plan/${topicId}`);
      fetchTabSpecificData();
    } catch (err: any) {
      alert(err.message || 'Error deleting topic');
    }
  };

  const handleAddAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post(`/subjects/${id}/assessments`, assessmentForm);
      setShowAssessmentModal(false);
      setAssessmentForm({ name: '', assessment_type: 'assignment', max_marks: 100, weightage_percent: 10, due_date: '' });
      fetchTabSpecificData();
    } catch (err: any) {
      alert(err.message || 'Error adding assessment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAssessment = async (assessmentId: string) => {
    if (!confirm('Are you sure you want to delete this assessment?')) return;
    try {
      await api.delete(`/subjects/${id}/assessments/${assessmentId}`);
      fetchTabSpecificData();
    } catch (err: any) {
      alert(err.message || 'Error deleting assessment');
    }
  };

  const handleDocUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docForm.file) return alert('Please select a file to upload');
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('file', docForm.file);
      formData.append('folder', docForm.folder);
      
      await api.post(`/subjects/${id}/documents/upload`, formData);
      setShowDocModal(false);
      setDocForm({ folder: 'Lecture Notes', file: null });
      fetchTabSpecificData();
    } catch (err: any) {
      alert(err.message || 'Failed to upload document');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDocDelete = async (docId: string) => {
    if (!confirm('Are you sure you want to delete this resource file?')) return;
    try {
      await api.delete(`/subjects/${id}/documents/${docId}`);
      fetchTabSpecificData();
    } catch (err: any) {
      alert(err.message || 'Error deleting file');
    }
  };

  const handleDocDownload = (docId: string) => {
    const baseURL = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:8787' : '');
    window.open(`${baseURL}/subjects/${id}/documents/${docId}/download`, '_blank');
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.put(`/subjects/${id}`, settingsForm);
      setShowSettingsModal(false);
      fetchSubjectData();
    } catch (err: any) {
      alert(err.message || 'Failed to update subject settings');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSubject = async () => {
    if (!confirm('CRITICAL ACTION: Are you sure you want to completely delete this Subject? This will remove all syllabus, lesson plans, and assignments.')) return;
    try {
      await api.delete(`/subjects/${id}`);
      navigate('/subjects');
    } catch (err: any) {
      alert(err.message || 'Failed to delete subject');
    }
  };

  // Student filtering logic
  const filteredStudents = students.filter(student => {
    const fullName = `${student.first_name} ${student.last_name}`.toLowerCase();
    const query = studentSearchQuery.toLowerCase();
    const matchesSearch = fullName.includes(query) || 
                          student.admission_no.toLowerCase().includes(query) || 
                          (student.roll_no || '').toLowerCase().includes(query);
    const matchesSection = selectedSectionFilter === '' || student.section_id === selectedSectionFilter;
    const matchesLowAttendance = !lowAttendanceFilter || (student.attendance_percent !== null && student.attendance_percent < 75);
    return matchesSearch && matchesSection && matchesLowAttendance;
  });

  const getDistinctSections = () => {
    const sections: any[] = [];
    students.forEach(s => {
      if (!sections.some(sec => sec.id === s.section_id)) {
        sections.push({ id: s.section_id, name: s.section_name });
      }
    });
    return sections;
  };

  if (loading) {
    return (
      <Layout>
      <PageGuidance
        title="Subject Portal"
        description="Use this page to manage syllabus documents, teaching notes, and exam schedules for a subject."
        steps={["Upload notes, syllabus files, or worksheets for students.","Track teacher allocations and lesson schedules.","Create assessments and view student performance lists."]}
      />
        <div className="subject-workspace-col-1">
          <div className="animate-pulse subject-workspace-animate-pulse"></div>
          <div className="animate-pulse subject-workspace-animate-pulse"></div>
          <div className="subject-workspace-grid-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="animate-pulse subject-workspace-animate-pulse"></div>)}
          </div>
        </div>
      </Layout>
    );
  }

  if (!subject) {
    return (
      <Layout>
        <div className="subject-workspace-div-6">
          <ShieldAlert size={48} className="subject-workspace-ShieldAlert-7"  />
          <h3>Subject Not Found</h3>
          <p className="subject-workspace-text-8">The subject you are trying to view does not exist or you do not have permission.</p>
          <button className="btn btn-outline subject-workspace-btn" onClick={() => navigate('/subjects')}>
            <ArrowLeft size={16} /> Back to Subjects
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* 1. Hero Header */}
      <div className="subject-workspace-col-10">
        <div className="subject-workspace-row-11">
          <span className="subject-workspace-span-12" onClick={() => navigate('/subjects')}>Subjects</span>
          <span>&gt;</span>
          <span className="subject-workspace-span-13">{subject.subject_code}</span>
        </div>
        
        <div className="page-header subject-workspace-page-header">
          <div>
            <h2 className="subject-workspace-row-15">
              {subject.subject_name}
              <span className="badge badge-secondary subject-workspace-badge">{subject.subject_code}</span>
            </h2>
            <p className="subject-workspace-text-17">
              {getProgramLabel()}: <strong>{subject.course_name || 'Not Mapped'}</strong> &bull; Semester {subject.semester} &bull; Credits: {subject.credits} &bull; Department: {subject.department || subject.department_name || 'N/A'} &bull; Type: {subject.theory_lab || 'Theory'} &bull; Elective: {subject.is_elective === 1 ? 'Yes' : 'No'} &bull; Weekly Hours: {subject.weekly_hours ?? 4} &bull; Status: {subject.status || 'ACTIVE'}
            </p>
          </div>
          <div className="subject-workspace-row-18">
            <button className="btn btn-outline" onClick={() => navigate('/subjects')}>
              <ArrowLeft size={16} /> Back
            </button>
            {(user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'Principal') && (
              <button className="btn btn-primary" onClick={() => setShowSettingsModal(true)}>
                <Settings size={16} /> Settings
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Health Banner */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1.25rem', marginBottom: '1.5rem', borderLeft: `5px solid ${healthStatus === 'critical' ? '#ef4444' : healthStatus === 'warning' ? '#f59e0b' : '#10b981'}` }}>
        <div className="subject-workspace-row-19">
          <div className="subject-workspace-row-20">
            <Activity size={18} style={{ color: healthStatus === 'critical' ? '#ef4444' : healthStatus === 'warning' ? '#f59e0b' : '#10b981' }} />
            <span className="subject-workspace-span-21">
              Workspace Health: {healthStatus === 'critical' ? '🔴 Critical Action Required' : healthStatus === 'warning' ? '🟡 Attention Required' : '🟢 Fully Functional'}
            </span>
          </div>
          <span className="subject-workspace-span-22">Score: {healthScore}/100</span>
        </div>
        
        <div className="subject-workspace-grid-23">
          <div className="subject-workspace-row-24">
            {hasFaculty ? <CheckCircle2 size={16} color="#10b981" /> : <AlertTriangle size={16} color="#ef4444" />}
            <span style={{ color: hasFaculty ? 'var(--text-main)' : 'var(--text-muted)' }}>Assigned Faculty</span>
          </div>
          <div className="subject-workspace-row-25">
            {hasSections ? <CheckCircle2 size={16} color="#10b981" /> : <AlertTriangle size={16} color="#ef4444" />}
            <span style={{ color: hasSections ? 'var(--text-main)' : 'var(--text-muted)' }}>Sections Mapped</span>
          </div>
          <div className="subject-workspace-row-26">
            {hasLessonPlan ? (syllabusPercent >= 70 ? <CheckCircle2 size={16} color="#10b981" /> : <CheckCircle2 size={16} color="#f59e0b" />) : <AlertTriangle size={16} color="#ef4444" />}
            <span style={{ color: hasLessonPlan ? 'var(--text-main)' : 'var(--text-muted)' }}>
              Lesson Plan ({hasLessonPlan ? `${syllabusPercent}% complete` : 'Not Set'})
            </span>
          </div>
          <div className="subject-workspace-row-27">
            {hasAssessments ? <CheckCircle2 size={16} color="#10b981" /> : <AlertTriangle size={16} color="#ef4444" />}
            <span style={{ color: hasAssessments ? 'var(--text-main)' : 'var(--text-muted)' }}>Assessments Configured</span>
          </div>
        </div>
      </div>

      {/* 3. KPI Stats Grid */}
      <div className="stats-grid subject-workspace-stats-grid">
        <div className="card stat-card subject-workspace-card">
          <div className="subject-workspace-div-30">
            <Users size={22} />
          </div>
          <div>
            <span className="subject-workspace-span-31">Enrolled Students</span>
            <span className="subject-workspace-span-32">{students.length}</span>
          </div>
        </div>

        <div className="card stat-card subject-workspace-card">
          <div className="subject-workspace-div-34">
            <Layers size={22} />
          </div>
          <div>
            <span className="subject-workspace-span-35">Mapped Sections</span>
            <span className="subject-workspace-span-36">{Array.from(new Set(teaching.map(t => t.section_id))).length}</span>
          </div>
        </div>

        <div className="card stat-card subject-workspace-card">
          <div className="subject-workspace-div-38">
            <BookMarked size={22} />
          </div>
          <div>
            <span className="subject-workspace-span-39">Syllabus Complete</span>
            <span className="subject-workspace-span-40">{syllabusPercent}%</span>
          </div>
        </div>

        <div className="card stat-card subject-workspace-card">
          <div className="subject-workspace-div-42">
            <FolderOpen size={22} />
          </div>
          <div>
            <span className="subject-workspace-span-43">Resources Count</span>
            <span className="subject-workspace-span-44">{documents.length}</span>
          </div>
        </div>
      </div>

      {/* 4. Tab Navigation */}
      <div className="tabs subject-workspace-tabs">
        {[
          { id: 'overview', label: 'Overview', icon: <BookOpen size={16} /> },
          { id: 'teaching', label: 'Teaching', icon: <UserCheck size={16} /> },
          { id: 'students', label: 'Students', icon: <Users size={16} /> },
          { id: 'lesson-plan', label: 'Lesson Plan', icon: <Clipboard size={16} /> },
          { id: 'assessments', label: 'Assessments', icon: <Award size={16} /> },
          { id: 'resources', label: 'Resources', icon: <FolderOpen size={16} /> },
          { id: 'analytics', label: 'Analytics', icon: <BarChart2 size={16} /> },
          { id: 'timeline', label: 'Timeline', icon: <Activity size={16} /> }
        ].map(tab => (
          <button key={tab.id} className={`${ activeTab === tab.id ? 'active' : '' } subject-workspace-row-46`} onClick={() => handleTabChange(tab.id)}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* 5. Tab Content rendering */}
      <div className="subject-workspace-div-47">
        
        {/* --- OVERVIEW TAB --- */}
        {activeTab === 'overview' && (
          <div className="subject-workspace-grid-48">
            <div className="subject-workspace-col-49">
              <div className="card subject-workspace-card">
                <h3 className="subject-workspace-row-51">
                  <BookOpen size={18} color="var(--primary)" /> Academic Context & Description
                </h3>
                <table className="table subject-workspace-table">
                  <tbody>
                    <tr>
                      <td className="subject-workspace-td-53">Subject Name</td>
                      <td className="subject-workspace-td-54">{subject.subject_name}</td>
                    </tr>
                    <tr>
                      <td className="subject-workspace-td-55">Subject Code</td>
                      <td className="subject-workspace-td-56">{subject.subject_code}</td>
                    </tr>
                    <tr>
                      <td className="subject-workspace-td-57">Department Mapped</td>
                      <td className="subject-workspace-td-58">{subject.department_name || 'N/A'}</td>
                    </tr>
                    <tr>
                      <td className="subject-workspace-td-59">{getProgramLabel()} Association</td>
                      <td className="subject-workspace-td-60">{subject.course_name}</td>
                    </tr>
                    <tr>
                      <td className="subject-workspace-td-61">Credits Value</td>
                      <td className="subject-workspace-td-62"><span className="badge badge-info">{subject.credits} Credits</span></td>
                    </tr>
                    <tr>
                      <td className="subject-workspace-td-63">Curriculum Duration</td>
                      <td className="subject-workspace-td-64">Semester {subject.semester}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="card subject-workspace-card">
                <h3 className="subject-workspace-row-66">
                  <TrendingUp size={18} color="var(--primary)" /> Delivery Progress Summary
                </h3>
                <div className="subject-workspace-row-67">
                  <div className="subject-workspace-row-68">
                    <span className="subject-workspace-span-69">{syllabusPercent}%</span>
                  </div>
                  <div>
                    <h4 className="subject-workspace-title-70">Syllabus Coverage Progress</h4>
                    <p className="subject-workspace-text-71">
                      {completedTopicsCount} of {lessonPlans.length} syllabus topics completed. {totalCompletedHours} lecture hours delivered out of {totalPlannedHours} hours planned.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="subject-workspace-col-72">
              <div className="card subject-workspace-card">
                <h3 className="subject-workspace-title-74">Related Workspaces</h3>
                <div className="subject-workspace-col-75">
                  {subject.department_id && (
                    <div className="subject-workspace-row-76">
                      <span className="subject-workspace-span-77">Department</span>
                      <span className="subject-workspace-span-78" onClick={() => navigate('/departments')}>
                        {subject.department_name}
                      </span>
                    </div>
                  )}
                  <div className="subject-workspace-row-79">
                    <span className="subject-workspace-span-80">{getProgramLabel()}</span>
                    <span className="subject-workspace-span-81" onClick={() => navigate('/programs')}>
                      {subject.course_name}
                    </span>
                  </div>
                  <div className="subject-workspace-row-82">
                    <span className="subject-workspace-span-83">Assigned Faculty</span>
                    <span className="badge badge-secondary subject-workspace-badge">{teaching.length} staff</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- TEACHING TAB --- */}
        {activeTab === 'teaching' && (
          <div className="card subject-workspace-card">
            <h3 className="subject-workspace-title-86">Faculty & Section Mappings</h3>
            <table className="table">
              <thead>
                <tr>
                  <th>Teacher</th>
                  <th>Section</th>
                  <th>Academic Year</th>
                  <th>Role</th>
                </tr>
              </thead>
              <tbody>
                {teaching.map(t => (
                  <tr key={t.id}>
                    <td>
                      <div>
                        <strong>{t.teacher_name}</strong>
                        <span className="subject-workspace-span-87">ID: {t.teacher_employee_id || 'N/A'}</span>
                      </div>
                    </td>
                    <td>
                      <span className="subject-workspace-span-88" onClick={() => navigate(`/classes/${t.section_id}`)}>
                        {t.section_name}
                      </span>
                    </td>
                    <td>{t.academic_year_name}</td>
                    <td>Primary Instructor</td>
                  </tr>
                ))}
                {teaching.length === 0 && (
                  <tr>
                    <td colSpan={4} className="subject-workspace-td-89">No teachers or sections mapped to this subject. Assign them in Section / Weekly Timetable settings.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* --- STUDENTS TAB --- */}
        {activeTab === 'students' && (
          <div className="card subject-workspace-card">
            <div className="subject-workspace-row-91">
              <h3 className="subject-workspace-title-92">Enrolled Student Roster</h3>
              
              <div className="filters subject-workspace-filters">
                <div className="search-container subject-workspace-search-container">
                  <Search size={16} />
                  <input
                    type="text"
                    placeholder="Search by name or roll number..."
                    value={studentSearchQuery}
                    onChange={(e) => setStudentSearchQuery(e.target.value)}
                  />
                </div>
                
                <select value={selectedSectionFilter} onChange={(e) => setSelectedSectionFilter(e.target.value)} className="subject-workspace-select-95">
                  <option value="">All Sections</option>
                  {getDistinctSections().map(sec => (
                    <option key={sec.id} value={sec.id}>{sec.name}</option>
                  ))}
                </select>

                <label className="subject-workspace-row-96">
                  <input type="checkbox" checked={lowAttendanceFilter} onChange={(e) => setLowAttendanceFilter(e.target.checked)} />
                  Attendance &lt; 75%
                </label>
              </div>
            </div>

            <table className="table">
              <thead>
                <tr>
                  <th>Roll No</th>
                  <th>Name</th>
                  <th>Section</th>
                  <th>Attendance %</th>
                  <th>Marks Avg</th>
                  <th>Status Warning</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map(student => {
                  const isLowAttendance = student.attendance_percent !== null && student.attendance_percent < 75;
                  const isLowMarks = student.marks_avg !== null && student.marks_avg < 40;
                  return (
                    <tr key={student.id}>
                      <td className="subject-workspace-td-97">{student.roll_no || student.admission_no}</td>
                      <td>
                        <strong>{student.first_name} {student.last_name}</strong>
                      </td>
                      <td>{student.section_name}</td>
                      <td>
                        <span style={{ fontWeight: 700, color: isLowAttendance ? '#ef4444' : '#16a34a' }}>
                          {student.attendance_percent !== null ? `${student.attendance_percent}%` : 'N/A'}
                        </span>
                        <span className="subject-workspace-span-98">
                          ({student.present_classes}/{student.total_classes} classes)
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, color: isLowMarks ? '#ef4444' : 'var(--text-main)' }}>
                          {student.marks_avg !== null ? `${student.marks_avg}%` : 'N/A'}
                        </span>
                      </td>
                      <td>
                        {isLowAttendance && <span className="badge badge-danger subject-workspace-badge">Low Attendance</span>}
                        {isLowMarks && <span className="badge badge-danger">Poor Grades</span>}
                        {!isLowAttendance && !isLowMarks && <span className="badge badge-success">On Track</span>}
                      </td>
                    </tr>
                  );
                })}
                {filteredStudents.length === 0 && (
                  <tr>
                    <td colSpan={6} className="subject-workspace-td-100">No students match the criteria.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* --- LESSON PLAN TAB --- */}
        {activeTab === 'lesson-plan' && (
          <div className="card subject-workspace-card">
            <div className="subject-workspace-row-102">
              <div>
                <h3 className="subject-workspace-title-103">Course Curriculum & Lesson Plan</h3>
                <p className="subject-workspace-text-104">
                  Track units, chapters, planned teaching hours, and delivery completion status.
                </p>
              </div>
              {(user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'Principal' || user?.role === 'Teacher') && (
                <button className="btn btn-primary" onClick={() => setShowLessonPlanModal(true)}>
                  <Plus size={16} /> Add Topic
                </button>
              )}
            </div>

            <table className="table">
              <thead>
                <tr>
                  <th>Unit/Chapter</th>
                  <th>Topic & Description</th>
                  <th>Planned Hours</th>
                  <th>Status</th>
                  <th>Completed At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {lessonPlans.map(topic => (
                  <tr key={topic.id}>
                    <td className="subject-workspace-td-105">{topic.unit_number}</td>
                    <td>
                      <div>
                        <strong>{topic.topic_title}</strong>
                        {topic.topic_description && <span className="subject-workspace-span-106">{topic.topic_description}</span>}
                      </div>
                    </td>
                    <td>{topic.planned_hours} Hrs</td>
                    <td>
                      <span className={`badge ${topic.status === 'completed' ? 'badge-success' : topic.status === 'in_progress' ? 'badge-warning' : 'badge-secondary'}`}>
                        {topic.status === 'completed' ? 'Completed' : topic.status === 'in_progress' ? 'In Progress' : 'Pending'}
                      </span>
                    </td>
                    <td>{topic.completed_at || '--'}</td>
                    <td>
                      <div className="subject-workspace-row-107">
                        {topic.status !== 'completed' && (
                          <button className="btn btn-sm btn-secondary subject-workspace-btn" onClick={() => handleUpdateTopicStatus(topic.id, 'completed', topic.planned_hours)}>
                            <Check size={14} /> Complete
                          </button>
                        )}
                        {topic.status === 'completed' && (
                          <button className="btn btn-sm btn-outline subject-workspace-btn" onClick={() => handleUpdateTopicStatus(topic.id, 'pending', 0)}>
                            Reopen
                          </button>
                        )}
                        {(user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'Principal' || user?.role === 'Teacher') && (
                          <button className="btn btn-sm btn-danger subject-workspace-btn" onClick={() => handleDeleteTopic(topic.id)}>
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {lessonPlans.length === 0 && (
                  <tr>
                    <td colSpan={6} className="subject-workspace-td-111">No syllabus items defined. Click Add Topic to set up your syllabus structure.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* --- ASSESSMENTS TAB --- */}
        {activeTab === 'assessments' && (
          <div className="card subject-workspace-card">
            <div className="subject-workspace-row-113">
              <div>
                <h3 className="subject-workspace-title-114">Subject Assessments Map</h3>
                <p className="subject-workspace-text-115">
                  Define tests, assignments, projects, and final exam weightages.
                </p>
              </div>
              {(user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'Principal' || user?.role === 'Teacher') && (
                <button className="btn btn-primary" onClick={() => setShowAssessmentModal(true)}>
                  <Plus size={16} /> New Assessment
                </button>
              )}
            </div>

            <table className="table">
              <thead>
                <tr>
                  <th>Assessment Name</th>
                  <th>Type</th>
                  <th>Max Marks</th>
                  <th>Weightage %</th>
                  <th>Due Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {assessments.map(item => (
                  <tr key={item.id}>
                    <td><strong>{item.name}</strong></td>
                    <td className="subject-workspace-td-116">{item.assessment_type.replace('_', ' ')}</td>
                    <td>{item.max_marks} Marks</td>
                    <td><span className="badge badge-info">{item.weightage_percent}%</span></td>
                    <td>{item.due_date || 'N/A'}</td>
                    <td>
                      {(user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'Principal' || user?.role === 'Teacher') && (
                        <button className="btn btn-sm btn-danger subject-workspace-btn" onClick={() => handleDeleteAssessment(item.id)}>
                          <Trash2 size={13} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {assessments.length === 0 && (
                  <tr>
                    <td colSpan={6} className="subject-workspace-td-118">No assessments configured for this subject.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* --- RESOURCES TAB --- */}
        {activeTab === 'resources' && (
          <div className="card subject-workspace-card">
            <div className="subject-workspace-row-120">
              <div>
                <h3 className="subject-workspace-title-121">Course Resources & Study Materials</h3>
                <p className="subject-workspace-text-122">
                  Upload syllabi, slides, previous year papers, and assignment sheets.
                </p>
              </div>
              <button className="btn btn-primary" onClick={() => setShowDocModal(true)}>
                <Upload size={16} /> Upload Material
              </button>
            </div>

            <table className="table">
              <thead>
                <tr>
                  <th>File Name</th>
                  <th>Folder Category</th>
                  <th>Size</th>
                  <th>Uploaded Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.map(doc => (
                  <tr key={doc.id}>
                    <td>
                      <div className="subject-workspace-row-123">
                        <FileText size={16} color="var(--primary)" />
                        <strong>{doc.name}</strong>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-secondary">{doc.folder}</span>
                    </td>
                    <td>{Math.round(doc.file_size / 1024)} KB</td>
                    <td>{new Date(doc.created_at).toLocaleDateString()}</td>
                    <td>
                      <div className="subject-workspace-row-124">
                        <button className="btn btn-sm btn-outline subject-workspace-btn" onClick={() => handleDocDownload(doc.id)}>
                          Download
                        </button>
                        <button className="btn btn-sm btn-danger subject-workspace-btn" onClick={() => handleDocDelete(doc.id)}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {documents.length === 0 && (
                  <tr>
                    <td colSpan={5} className="subject-workspace-td-127">No resources uploaded yet. Click Upload Material to add resources.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* --- ANALYTICS TAB --- */}
        {activeTab === 'analytics' && (
          <div className="subject-workspace-grid-128">
            <div className="card subject-workspace-card">
              <h3 className="subject-workspace-row-130">
                <Users size={18} color="var(--primary)" /> Attendance Warnings
              </h3>
              <p className="subject-workspace-text-131">Students with attendance levels below the mandated 75% threshold:</p>
              
              <div className="subject-workspace-col-132">
                {students.filter(s => s.attendance_percent !== null && s.attendance_percent < 75).map(s => (
                  <div key={s.id} className="subject-workspace-row-133">
                    <span>{s.first_name} {s.last_name} ({s.section_name})</span>
                    <span className="subject-workspace-span-134">{s.attendance_percent}%</span>
                  </div>
                ))}
                {students.filter(s => s.attendance_percent !== null && s.attendance_percent < 75).length === 0 && (
                  <p className="subject-workspace-text-135">🟢 Great job! All students are above the 75% attendance threshold.</p>
                )}
              </div>
            </div>

            <div className="card subject-workspace-card">
              <h3 className="subject-workspace-row-137">
                <Award size={18} color="var(--primary)" /> Grades Overview
              </h3>
              <p className="subject-workspace-text-138">Students struggling with low grades (average marks &lt; 40%):</p>
              
              <div className="subject-workspace-col-139">
                {students.filter(s => s.marks_avg !== null && s.marks_avg < 40).map(s => (
                  <div key={s.id} className="subject-workspace-row-140">
                    <span>{s.first_name} {s.last_name} ({s.section_name})</span>
                    <span className="subject-workspace-span-141">{s.marks_avg}%</span>
                  </div>
                ))}
                {students.filter(s => s.marks_avg !== null && s.marks_avg < 40).length === 0 && (
                  <p className="subject-workspace-text-142">🟢 All students are performing satisfactorily in active evaluations.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* --- TIMELINE TAB --- */}
        {activeTab === 'timeline' && (
          <div className="card subject-workspace-card">
            <h3 className="subject-workspace-title-144">Subject Timeline & History</h3>
            <div className="subject-workspace-col-145">
              {timeline.map(log => (
                <div key={log.id} className="subject-workspace-row-146">
                  <div className="subject-workspace-div-147">
                    {new Date(log.timestamp).toLocaleString()}
                  </div>
                  <div>
                    <div className="subject-workspace-div-148">{log.description}</div>
                    <div className="subject-workspace-div-149">
                      By: <strong>{log.user_name}</strong> ({log.user_email}) &bull; Action: <span className="badge badge-secondary subject-workspace-badge">{log.action}</span>
                    </div>
                  </div>
                </div>
              ))}
              {timeline.length === 0 && (
                <p className="subject-workspace-text-151">No audit history records available for this subject.</p>
              )}
            </div>
          </div>
        )}

      </div>

      {/* --- ADD LESSON PLAN TOPIC MODAL --- */}
      {showLessonPlanModal && (
        <div className="modal">
          <div className="modal-content">
            <h3>Add Syllabus Topic</h3>
            <form onSubmit={handleAddLessonPlanTopic}>
              <div className="form-group">
                <label>Unit/Chapter Number (e.g. Unit I)</label>
                <input type="text" value={lessonPlanForm.unit_number} onChange={e => setLessonPlanForm({...lessonPlanForm, unit_number: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Topic Title</label>
                <input type="text" placeholder="e.g. Relational Data Model" value={lessonPlanForm.topic_title} onChange={e => setLessonPlanForm({...lessonPlanForm, topic_title: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Topic Description (Optional)</label>
                <textarea rows={3} placeholder="Describe curriculum coverage..." value={lessonPlanForm.topic_description} onChange={e => setLessonPlanForm({...lessonPlanForm, topic_description: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Planned Teaching Hours</label>
                <input type="number" min="1" value={lessonPlanForm.planned_hours} onChange={e => setLessonPlanForm({...lessonPlanForm, planned_hours: parseInt(e.target.value) || 1})} required />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowLessonPlanModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save Topic'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ADD ASSESSMENT MODAL --- */}
      {showAssessmentModal && (
        <div className="modal">
          <div className="modal-content">
            <h3>Configure Assessment</h3>
            <form onSubmit={handleAddAssessment}>
              <div className="form-group">
                <label>Assessment Name</label>
                <input type="text" placeholder="e.g. Assignment 2" value={assessmentForm.name} onChange={e => setAssessmentForm({...assessmentForm, name: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Evaluation Type</label>
                <select value={assessmentForm.assessment_type} onChange={e => setAssessmentForm({...assessmentForm, assessment_type: e.target.value})}>
                  <option value="quiz">Quiz</option>
                  <option value="assignment">Assignment</option>
                  <option value="internal_test">Internal Test</option>
                  <option value="lab_eval">Lab Evaluation</option>
                  <option value="project">Project</option>
                  <option value="final_exam">Final Exam</option>
                </select>
              </div>
              <div className="form-group">
                <label>Max Marks</label>
                <input type="number" min="1" value={assessmentForm.max_marks} onChange={e => setAssessmentForm({...assessmentForm, max_marks: parseInt(e.target.value) || 100})} required />
              </div>
              <div className="form-group">
                <label>Weightage Percentage (%)</label>
                <input type="number" min="0" max="100" value={assessmentForm.weightage_percent} onChange={e => setAssessmentForm({...assessmentForm, weightage_percent: parseInt(e.target.value) || 0})} required />
              </div>
              <div className="form-group">
                <label>Due/Test Date</label>
                <input type="date" value={assessmentForm.due_date} onChange={e => setAssessmentForm({...assessmentForm, due_date: e.target.value})} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAssessmentModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create Evaluation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- RESOURCE UPLOAD MODAL --- */}
      {showDocModal && (
        <div className="modal">
          <div className="modal-content">
            <h3>Upload Study Material</h3>
            <form onSubmit={handleDocUpload}>
              <div className="form-group">
                <label>Category Folder</label>
                <select value={docForm.folder} onChange={e => setDocForm({...docForm, folder: e.target.value})}>
                  <option value="Syllabus">Syllabus</option>
                  <option value="Lecture Notes">Lecture Notes</option>
                  <option value="Assignments">Assignments</option>
                  <option value="Question Papers">Question Papers</option>
                  <option value="Reference Books">Reference Books</option>
                  <option value="Videos">Videos</option>
                  <option value="Previous Year Papers">Previous Year Papers</option>
                </select>
              </div>
              <div className="form-group">
                <label>Select File</label>
                <input type="file" onChange={e => setDocForm({...docForm, file: (e.target.files && e.target.files[0]) || null})} required />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowDocModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- SUBJECT SETTINGS / EDIT MODAL --- */}
      {showSettingsModal && (
        <div className="modal">
          <div className="modal-content">
            <h3>Edit Subject Settings</h3>
            <form onSubmit={handleSaveSettings}>
              <div className="form-group">
                <label>Subject Name</label>
                <input type="text" value={settingsForm.subject_name} onChange={e => setSettingsForm({...settingsForm, subject_name: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Subject Code</label>
                <input type="text" value={settingsForm.subject_code} onChange={e => setSettingsForm({...settingsForm, subject_code: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Credits Count</label>
                <input type="number" min="0" value={settingsForm.credits} onChange={e => setSettingsForm({...settingsForm, credits: parseInt(e.target.value) || 0})} required />
              </div>
              <div className="form-group">
                <label>Semester Number</label>
                <input type="number" min="1" value={settingsForm.semester} onChange={e => setSettingsForm({...settingsForm, semester: parseInt(e.target.value) || 1})} required />
              </div>
              <div className="form-group">
                <label>Program Association</label>
                <select value={settingsForm.course_id} onChange={e => setSettingsForm({...settingsForm, course_id: e.target.value})} required>
                  {programs.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Type (Theory/Lab)</label>
                <select value={settingsForm.theory_lab} onChange={e => setSettingsForm({...settingsForm, theory_lab: e.target.value})} required>
                  <option value="Theory">Theory</option>
                  <option value="Lab">Lab</option>
                </select>
              </div>
              <div className="form-group">
                <label>Elective Subject</label>
                <select value={settingsForm.is_elective} onChange={e => setSettingsForm({...settingsForm, is_elective: parseInt(e.target.value) || 0})} required>
                  <option value={0}>No</option>
                  <option value={1}>Yes</option>
                </select>
              </div>
              <div className="form-group">
                <label>Weekly Hours</label>
                <input type="number" min="0" value={settingsForm.weekly_hours} onChange={e => setSettingsForm({...settingsForm, weekly_hours: parseInt(e.target.value) || 0})} required />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select value={settingsForm.status} onChange={e => setSettingsForm({...settingsForm, status: e.target.value})} required>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>
              <div className="form-group">
                <label>Department</label>
                <input type="text" value={settingsForm.department} onChange={e => setSettingsForm({...settingsForm, department: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea value={settingsForm.description} onChange={e => setSettingsForm({...settingsForm, description: e.target.value})} rows={3} />
              </div>
              <div className="subject-workspace-row-152">
                <button type="button" className="btn btn-danger" onClick={handleDeleteSubject}>Delete Subject</button>
                <div className="subject-workspace-row-153">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowSettingsModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? 'Saving...' : 'Save Settings'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
