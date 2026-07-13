import './TeacherDetails.css';
import React, { useEffect, useState } from 'react';
import { PageGuidance } from '../components/PageGuidance';
import { useParams, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { api } from '../services/api';
import { 
  Plus, Calendar, Clock, MessageSquare, FileText, User, 
  Trash2, Upload, ArrowLeft, Download, Award, Briefcase, GraduationCap
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function TeacherDetails() {
  const { id } = useParams<{ id: string }>();
  const [teacher, setTeacher] = useState<any>(null);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [timetableSlots, setTimetableSlots] = useState<any[]>([]);
  const [timetableEntries, setTimetableEntries] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [workload, setWorkload] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Notes state
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  // Document upload state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [newDocType, setNewDocType] = useState('Degree Certificate');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Subject assignment state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigningSubject, setAssigningSubject] = useState(false);
  const [assignForm, setAssignForm] = useState({
    academic_year_id: '',
    course_id: '',
    section_id: '',
    subject_id: ''
  });

  // Institution & Terminology States
  const { user } = useAuth();
  const [institutionType, setInstitutionType] = useState<string>('college');

  const getProgramLabel = () => institutionType === 'school' ? 'Class' : 'Program';

  // Departments list for Edit modal
  const [departments, setDepartments] = useState<any[]>([]);

  // Create Login Account modal states
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [creatingLogin, setCreatingLogin] = useState(false);

  // Edit Profile modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTab, setEditTab] = useState<'personal' | 'professional' | 'account'>('personal');
  const [editForm, setEditForm] = useState<any>({
    first_name: '',
    middle_name: '',
    last_name: '',
    email: '',
    phone: '',
    employee_id: '',
    department: '',
    designation: '',
    joining_date: '',
    qualification: '',
    experience: '',
    status: 'ACTIVE'
  });

  // Open Edit Modal
  const handleEditClick = () => {
    if (!teacher) return;
    setEditForm({
      first_name: teacher.first_name || '',
      middle_name: teacher.middle_name || '',
      last_name: teacher.last_name || '',
      email: teacher.email || '',
      phone: teacher.phone || '',
      employee_id: teacher.employee_id || '',
      department: teacher.department || '',
      designation: teacher.designation || '',
      joining_date: teacher.joining_date || '',
      qualification: teacher.qualification || '',
      experience: teacher.experience || '',
      status: teacher.status || 'ACTIVE'
    });
    setEditTab('personal');
    setShowEditModal(true);
  };

  // Submit Edit Form
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put(`/teachers/${id}`, editForm);
      setShowEditModal(false);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Error updating teacher');
    }
  };

  // Quick toggle ACTIVE status
  const handleToggleStatus = async () => {
    if (!teacher) return;
    const newStatus = teacher.status === 'ACTIVE' ? 'RESIGNED' : 'ACTIVE';
    if (!confirm(`Are you sure you want to change this teacher's status to ${newStatus}?`)) return;
    try {
      await api.put(`/teachers/${id}`, {
        ...teacher,
        status: newStatus
      });
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Failed to update status');
    }
  };

  // Create login user handler
  const handleCreateLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUsername.trim() || !loginEmail.trim() || !loginPassword.trim()) {
      alert('Please fill out all fields.');
      return;
    }

    try {
      setCreatingLogin(true);
      const userRes = await api.post('/users', {
        name: `${teacher.first_name} ${teacher.middle_name ? teacher.middle_name + ' ' : ''}${teacher.last_name}`.trim(),
        username: loginUsername.trim(),
        email: loginEmail.trim(),
        password: loginPassword.trim(),
        phone: teacher.phone || '',
        roles: ['teacher']
      });

      const newUserId = userRes.id;
      if (!newUserId) {
        throw new Error('Failed to create user login profile');
      }

      await api.put(`/teachers/${id}`, {
        ...teacher,
        user_id: newUserId
      });

      alert('Login account created and linked successfully!');
      setShowLoginModal(false);
      fetchData();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Error creating login account');
    } finally {
      setCreatingLogin(false);
    }
  };

  const handleAssignSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignForm.academic_year_id || !assignForm.course_id || !assignForm.section_id || !assignForm.subject_id) {
      alert('Please select all assignment options (Year, Program, Section, and Subject).');
      return;
    }
    
    try {
      setAssigningSubject(true);
      await api.post('/teacher-assignments', {
        teacher_id: id,
        subject_id: assignForm.subject_id,
        course_id: assignForm.course_id,
        section_id: assignForm.section_id,
        academic_year_id: assignForm.academic_year_id
      });
      
      const updatedAssignments = await api.get(`/teacher-assignments/teacher/${id}`).catch(() => []);
      setAssignments(updatedAssignments);
      
      const workloadReport = await api.get('/teachers/reports/workload').catch(() => []);
      const teacherWorkload = (workloadReport || []).find((w: any) => w.teacher_id === id);
      setWorkload(teacherWorkload || null);

      setShowAssignModal(false);
      setAssignForm(prev => ({
        ...prev,
        section_id: '',
        subject_id: ''
      }));
    } catch (err: any) {
      console.error(err);
      alert(`Failed to assign subject: ${err.message || 'Error occurred'}`);
    } finally {
      setAssigningSubject(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [
        teacherData, assignmentsData, yearsData, programsData, 
        sectionsData, subjectsData, slotsData, timetableData, 
        notesData, documentsData, workloadReport, departmentsData
      ] = await Promise.all([
        api.get(`/teachers/${id}`).catch((err) => {
          console.error("Failed to load teacher:", err);
          return null;
        }),
        api.get(`/teacher-assignments/teacher/${id}`).catch(() => []),
        api.get('/academic-years').catch(() => []),
        api.get('/programs').catch(() => []),
        api.get('/sections').catch(() => []),
        api.get('/subjects').catch(() => []),
        api.get('/timetable-slots').catch(() => []),
        api.get(`/weekly-timetable?teacher_id=${id}`).catch(() => []),
        api.get(`/teachers/${id}/notes`).catch(() => []),
        api.get(`/teachers/${id}/documents`).catch(() => []),
        api.get('/teachers/reports/workload').catch(() => []),
        api.get('/departments').catch(() => [])
      ]);
      setTeacher(teacherData);
      setAssignments(assignmentsData);
      setAcademicYears(yearsData);
      setPrograms(programsData);
      setSections(sectionsData);
      setSubjects(subjectsData);
      setTimetableSlots(slotsData || []);
      setTimetableEntries(timetableData || []);
      setNotes(notesData || []);
      setDocuments(documentsData || []);
      setDepartments(departmentsData || []);
      
      const teacherWorkload = (workloadReport || []).find((w: any) => w.teacher_id === id);
      setWorkload(teacherWorkload || null);

      const defaultYear = yearsData.find((y: any) => y.is_current)?.id || yearsData[0]?.id || '';
      const defaultProg = programsData[0]?.id || '';
      setAssignForm({
        academic_year_id: defaultYear,
        course_id: defaultProg,
        section_id: '',
        subject_id: ''
      });

      if (user?.institution_id) {
        const inst = await api.get(`/institutions/${user.institution_id}`);
        if (inst && inst.institution_type) {
          setInstitutionType(inst.institution_type);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Notes actions
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    try {
      setAddingNote(true);
      await api.post(`/teachers/${id}/notes`, { content: newNote });
      setNewNote('');
      const updatedNotes = await api.get(`/teachers/${id}/notes`);
      setNotes(updatedNotes || []);
    } catch (err) {
      console.error(err);
      alert('Failed to add note');
    } finally {
      setAddingNote(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return;
    try {
      await api.delete(`/teachers/${id}/notes/${noteId}`);
      setNotes(notes.filter(n => n.id !== noteId));
    } catch (err) {
      console.error(err);
      alert('Failed to delete note');
    }
  };

  // Documents actions
  const handleDocUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      alert('Please select a file to upload');
      return;
    }

    try {
      setUploadingDoc(true);
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('document_type', newDocType);

      await api.upload(`/teachers/${id}/documents/upload`, formData);
      
      // Refresh documents
      const docs = await api.get(`/teachers/${id}/documents`);
      setDocuments(docs || []);
      
      setSelectedFile(null);
      setShowUploadModal(false);
    } catch (err: any) {
      console.error(err);
      alert(`Error uploading document: ${err.message}`);
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleDownloadDoc = async (doc: any) => {
    try {
      const token = localStorage.getItem('erp_token');
      const BASE_URL = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:8787' : '');
      
      const response = await fetch(`${BASE_URL}/teachers/${id}/documents/${doc.id}/download`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Failed to download document');
    }
  };

  const handleDocDelete = async (docId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    try {
      await api.delete(`/teachers/${id}/documents/${docId}`);
      setDocuments(documents.filter(d => d.id !== docId));
    } catch (err) {
      console.error(err);
      alert('Failed to delete document');
    }
  };

  if (loading) return <Layout>
      <PageGuidance
        title="Staff Profile"
        description="Use this page to view a teacher's personal files, assigned classes, and leaves."
        steps={["Inspect contact information and employment details.","Check the subjects and classes this teacher is assigned to teach.","Review their attendance record and leave history."]}
      /><p className="teacher-details-text-1">Loading teacher profile...</p></Layout>;
  if (!teacher) return <Layout><p className="teacher-details-text-2">Teacher profile not found.</p></Layout>;

  // Timeline building
  const timelineItems = [
    {
      title: 'Joined Institution',
      description: `Registered as teacher with Employee ID: ${teacher.employee_id}`,
      date: teacher.joining_date || teacher.created_at?.split(' ')[0],
      completed: true
    },
    teacher.qualification ? {
      title: 'Academic Qualifications Listed',
      description: `Credentials: ${teacher.qualification} with ${teacher.experience || '0'} years of experience.`,
      date: teacher.joining_date || teacher.created_at?.split(' ')[0],
      completed: true
    } : null,
    teacher.department ? {
      title: 'Department Assigned',
      description: `Assigned to the ${teacher.department} department as ${teacher.designation || 'Faculty'}.`,
      date: teacher.joining_date || null,
      completed: true
    } : null,
    assignments.length > 0 ? {
      title: 'Subject Assignments Registered',
      description: `Assigned to teach ${assignments.length} sections/classes.`,
      date: assignments[0]?.created_at?.split('T')[0] || null,
      completed: true
    } : null,
    timetableEntries.length > 0 ? {
      title: 'Timetable Schedule Configured',
      description: `Assigned a weekly schedule of ${timetableEntries.length} periods.`,
      date: timetableEntries[0]?.created_at?.split('T')[0] || null,
      completed: true
    } : null
  ].filter(Boolean) as any[];

  // Onboarding Setup Checklist Calculations
  const checklistItems = [
    { label: 'Personal Details', done: true },
    { label: 'Department', done: !!teacher.department, actionName: 'Assign Department' },
    { label: 'Login Account', done: !!teacher.user_id, actionName: 'Create Login' },
    { label: 'Subject Assignment', done: assignments.length > 0, actionName: 'Assign Subjects' },
    { label: 'Timetable', done: timetableEntries.length > 0, actionName: 'Assign Timetable' },
    { label: 'Documents', done: documents.length > 0, actionName: 'Upload Documents' }
  ];

  const completedCount = checklistItems.filter(item => item.done).length;
  const completionPercentage = Math.round((completedCount / checklistItems.length) * 100);

  const remaining = checklistItems
    .filter(item => !item.done)
    .map(item => item.actionName || item.label);

  const handleContinueSetup = () => {
    if (!teacher.user_id) {
      setLoginUsername(teacher.email?.split('@')[0] || `${teacher.first_name.toLowerCase()}${teacher.last_name.toLowerCase()}`);
      setLoginEmail(teacher.email || '');
      setLoginPassword('Teacher@123');
      setShowLoginModal(true);
    } else if (!teacher.department) {
      handleEditClick();
      setEditTab('professional');
    } else if (assignments.length === 0) {
      setActiveTab('assignments');
      setShowAssignModal(true);
    } else if (timetableEntries.length === 0) {
      setActiveTab('timetable');
    } else if (documents.length === 0) {
      setActiveTab('documents');
      setShowUploadModal(true);
    }
  };

  return (
    <Layout>
      {/* Back button */}
      <div className="teacher-details-div-3">
        <Link to="/teachers" className="teacher-details-row-4">
          <ArrowLeft size={16} /> Back to Teacher Directory
        </Link>
      </div>

      {/* Completion Banner */}
      {completionPercentage < 100 && (
        <div className="teacher-details-row-5">
          <div className="teacher-details-row-6">
            <span className="teacher-details-span-7">⚠️</span>
            <div>
              <strong className="teacher-details-strong-8">This teacher profile isn't fully configured ({completionPercentage}% completed)</strong>
              <span className="teacher-details-span-9">
                Remaining: {remaining.join(' • ')}
              </span>
            </div>
          </div>
          <button onClick={handleContinueSetup} className="btn btn-sm btn-primary teacher-details-btn">
            Continue Setup
          </button>
        </div>
      )}

      {/* LinkedIn Style Profile Banner Card */}
      <div className="card teacher-profile-card">
        {/* Decorative Top Banner Stripe */}
        <div className="teacher-details-div-12"></div>

        <div className="teacher-details-row-13">
          {/* Left Block: Avatar and Status Badge */}
          <div className="teacher-details-col-14">
            <div className="teacher-details-row-15">
              👨‍🏫
            </div>
            <span className={`badge badge-${teacher.status === 'ACTIVE' ? 'success' : 'secondary'} teacher-details-span-16`}>
              {teacher.status}
            </span>
          </div>

          {/* Right Block: Content Details Grid */}
          <div className="teacher-details-col-17">
            <div>
              <h2 className="teacher-details-title-18">
                {teacher.first_name} {teacher.middle_name ? teacher.middle_name + ' ' : ''}{teacher.last_name}
              </h2>
              <div className="teacher-details-div-19">
                {teacher.designation || 'Faculty Member'}
              </div>
              <div className="teacher-details-div-20">
                🏢 {teacher.department || 'General Department'}
              </div>
            </div>

            <div className="teacher-details-grid-21">
              <div>
                <span className="teacher-details-span-22">Employee ID</span>
                <strong className="teacher-details-strong-23">{teacher.employee_id}</strong>
              </div>
              <div>
                <span className="teacher-details-span-24">Joined Date</span>
                <strong className="teacher-details-strong-25">{teacher.joining_date || 'N/A'}</strong>
              </div>
              <div>
                <span className="teacher-details-span-26">Phone Number</span>
                <strong className="teacher-details-strong-27">{teacher.phone || 'N/A'}</strong>
              </div>
              <div>
                <span className="teacher-details-span-28">Email Address</span>
                <strong className="teacher-details-strong-29">{teacher.email || 'N/A'}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Onboarding Setup Progress Card */}
      <div className="card teacher-onboarding-card">
        <div className="teacher-details-row-31">
          {/* Progress Circle & Text */}
          <div className="teacher-details-row-32">
            <div 
              className="teacher-checklist-circle"
              style={{ background: `conic-gradient(var(--primary) ${completionPercentage}%, #f1f5f9 ${completionPercentage}%)` }}
            >
              <span className="teacher-details-span-33">{completionPercentage}%</span>
            </div>
            <div>
              <h4 className="teacher-details-title-34">Onboarding Checklist</h4>
              <p className="teacher-details-text-35">Configure all details to complete onboarding</p>
            </div>
          </div>

          {/* Checklist Items */}
          <div className="teacher-details-row-36">
            {checklistItems.map((item, idx) => (
              <div 
                key={idx} 
                className={`teacher-checklist-item ${item.done ? 'is-done' : 'is-pending'}`}
                onClick={() => {
                  if (!item.done) {
                    if (item.label === 'Department') {
                      handleEditClick();
                      setEditTab('professional');
                    } else if (item.label === 'Login Account') {
                      setLoginUsername(teacher.email?.split('@')[0] || `${teacher.first_name.toLowerCase()}${teacher.last_name.toLowerCase()}`);
                      setLoginEmail(teacher.email || '');
                      setLoginPassword('Teacher@123');
                      setShowLoginModal(true);
                    } else if (item.label === 'Subject Assignment') {
                      setActiveTab('assignments');
                      setShowAssignModal(true);
                    } else if (item.label === 'Timetable') {
                      setActiveTab('timetable');
                    } else if (item.label === 'Documents') {
                      setActiveTab('documents');
                      setShowUploadModal(true);
                    }
                  }
                }}
              >
                {item.done ? (
                  <span className="teacher-details-span-37">✓</span>
                ) : (
                  <span className="teacher-details-span-38">○</span>
                )}
                <span className="teacher-checklist-item-label" title={item.done ? '' : `Click to configure ${item.label}`}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions Row */}
      <div className="card teacher-quick-actions-card">
        <strong className="teacher-details-strong-40">Quick Actions:</strong>
        <button className="btn btn-sm btn-outline" onClick={handleEditClick}>Edit Profile</button>
        <button className="btn btn-sm btn-outline" onClick={() => { setActiveTab('assignments'); setShowAssignModal(true); }}>Assign Subject</button>
        <Link to={`/weekly-timetable`} className="btn btn-sm btn-outline teacher-details-btn">Assign Timetable</Link>
        <button className="btn btn-sm btn-outline" onClick={() => { setActiveTab('documents'); setShowUploadModal(true); }}>Upload Document</button>
        <button 
          className={`btn btn-sm ${teacher.status === 'ACTIVE' ? 'btn-outline-danger' : 'btn-primary'}`} 
          onClick={handleToggleStatus}
        >
          {teacher.status === 'ACTIVE' ? 'Deactivate Teacher' : 'Activate Teacher'}
        </button>
      </div>

      {/* Teacher Workload Dashboard (Instant KPI Summary Block) */}
      <div className="teacher-details-grid-42">
        
        {/* Assigned Subjects */}
        <div onClick={() => { setActiveTab('assignments'); setShowAssignModal(true); }} className="card teacher-kpi-card" onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }} onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}>
          <div>
            <span className="teacher-details-span-44">Assigned Subjects</span>
            <strong className="teacher-details-strong-45">
              {workload?.subjects_count || [...new Set(assignments.map(a => a.subject_id))].length} Subjects
            </strong>
          </div>
          <div className="teacher-details-row-46">
            Assign →
          </div>
        </div>

        {/* Assigned Sections */}
        <div onClick={() => { setActiveTab('assignments'); setShowAssignModal(true); }} className="card teacher-kpi-card" onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }} onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}>
          <div>
            <span className="teacher-details-span-48">Assigned Sections</span>
            <strong className="teacher-details-strong-49">
              {workload?.sections_count || [...new Set(assignments.map(a => a.section_id))].length} Sections
            </strong>
          </div>
          <div className="teacher-details-row-50">
            Assign →
          </div>
        </div>

        {/* Classes Scheduled/Week */}
        <div onClick={() => setActiveTab('timetable')} className="card teacher-kpi-card" onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }} onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}>
          <div>
            <span className="teacher-details-span-52">Classes Scheduled/Week</span>
            <strong className="teacher-details-strong-53">
              {teacher.periods_count || timetableEntries.length} Classes / Week
            </strong>
          </div>
          <div className="teacher-details-row-54">
            View Schedule →
          </div>
        </div>

        {/* Total Students Taught */}
        <div onClick={() => setActiveTab('assignments')} className="card teacher-kpi-card" onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }} onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}>
          <div>
            <span className="teacher-details-span-56">Students Taught</span>
            <strong className="teacher-details-strong-57">
              {teacher.students_count || 0} Students
            </strong>
          </div>
          <div className="teacher-details-row-58">
            View Sections →
          </div>
        </div>

        {/* Attendance Rate */}
        <div onClick={() => setActiveTab('timeline')} className="card teacher-kpi-card" onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }} onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}>
          <div>
            <span className="teacher-details-span-60">Attendance Rate</span>
            {workload && workload.total_attendance_days > 0 ? (
              <strong className="teacher-details-strong-61">
                {Math.round(((workload.present_days + workload.half_day_days * 0.5) / workload.total_attendance_days) * 100)}%
              </strong>
            ) : (
              <strong className="teacher-details-strong-62">--</strong>
            )}
          </div>
          <div className="teacher-details-row-63">
            View History →
          </div>
        </div>

      </div>

      {/* Profile Tabs Header */}
      <div className="tabs teacher-details-tabs">
        {[
          { id: 'overview', label: 'Overview', icon: User },
          { id: 'assignments', label: 'Subject Assignments', icon: Briefcase },
          { id: 'timetable', label: 'Timetable Schedule', icon: Clock },
          { id: 'timeline', label: 'Timeline Logs', icon: Calendar },
          { id: 'notes', label: 'Internal Notes', icon: MessageSquare },
          { id: 'documents', label: 'Documents Vault', icon: FileText }
        ].map(t => {
          const Icon = t.icon;
          const isSelected = activeTab === t.id;
          return (
            <button 
              key={t.id}
              className={`teacher-details-tab-btn ${isSelected ? 'is-active' : ''}`} 
              onClick={() => setActiveTab(t.id)}
            >
              <Icon size={15} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div className="card teacher-tab-panel-card">
        
        {/* OVERVIEW PANEL */}
        {activeTab === 'overview' && (
          <div>
            <h3 className="teacher-details-title-66">General Information</h3>
            <div className="teacher-details-grid-67">
              <div>
                <label className="teacher-details-label-68">Employee ID</label>
                <span className="teacher-details-span-69">{teacher.employee_id}</span>
              </div>
              <div>
                <label className="teacher-details-label-70">Email Address</label>
                <span className="teacher-details-span-71">{teacher.email || '-'}</span>
              </div>
              <div>
                <label className="teacher-details-label-72">Phone Number</label>
                <span className="teacher-details-span-73">{teacher.phone || '-'}</span>
              </div>
              <div>
                <label className="teacher-details-label-74">Department</label>
                <span className="teacher-details-span-75">{teacher.department || '-'}</span>
              </div>
              <div>
                <label className="teacher-details-label-76">Designation</label>
                <span className="teacher-details-span-77">{teacher.designation || '-'}</span>
              </div>
              <div>
                <label className="teacher-details-label-78">Joining Date</label>
                <span className="teacher-details-span-79">{teacher.joining_date || '-'}</span>
              </div>
              <div>
                <label className="teacher-details-label-80">Qualification</label>
                <span className="teacher-details-span-81">{teacher.qualification || '-'}</span>
              </div>
              <div>
                <label className="teacher-details-label-82">Experience (Years)</label>
                <span className="teacher-details-span-83">{teacher.experience || '-'}</span>
              </div>
            </div>
          </div>
        )}

        {/* SUBJECT ASSIGNMENTS PANEL */}
        {activeTab === 'assignments' && (
          <div>
            <div className="teacher-details-row-84">
              <h3 className="teacher-details-title-85">Subject Assignments</h3>
              <button className="btn btn-sm btn-primary" onClick={() => setShowAssignModal(true)}>
                Assign Subject
              </button>
            </div>
            {assignments.length > 0 ? (
              <div className="teacher-details-div-86">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Academic Year</th>
                      <th>{getProgramLabel()}</th>
                      <th>Section</th>
                      <th>Subject</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignments.map(a => (
                      <tr key={a.id}>
                        <td>{academicYears.find(y => y.id === a.academic_year_id)?.name || 'Unknown'}</td>
                        <td>{programs.find(p => p.id === a.course_id)?.name || 'Unknown'}</td>
                        <td>{sections.find(s => s.id === a.section_id)?.name || 'Unknown'}</td>
                        <td>{subjects.find(s => s.id === a.subject_id)?.subject_name || 'Unknown'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="teacher-details-col-87">
                <span className="teacher-details-span-88">📚</span>
                <p className="teacher-details-text-89">No subjects assigned yet.</p>
                <button className="btn btn-outline btn-sm teacher-details-btn" onClick={() => setShowAssignModal(true)}>
                  Assign Subject
                </button>
              </div>
            )}
          </div>
        )}

        {/* TIMETABLE SCHEDULE PANEL */}
        {activeTab === 'timetable' && (
          <div>
            <h3 className="teacher-details-title-91">Weekly Class Timetable</h3>
            {timetableSlots.length === 0 ? (
              <div className="teacher-details-col-92">
                <span className="teacher-details-span-93">📅</span>
                <p className="teacher-details-text-94">No timetable has been created yet.</p>
                <Link to="/weekly-timetable" className="btn btn-outline btn-sm teacher-details-btn">
                  Open Timetable
                </Link>
              </div>
            ) : (
              <div className="teacher-details-div-96">
                <table className="table teacher-details-table">
                  <thead>
                    <tr>
                      <th className="teacher-details-th-98">Time Slot</th>
                      {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => (
                        <th key={day} className="teacher-details-th-99">{day}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {timetableSlots
                      .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''))
                      .map(slot => (
                        <tr key={slot.id}>
                          <td className="teacher-details-td-100">
                            <div className="teacher-details-div-101">{slot.name}</div>
                            <div className="teacher-details-div-102">{slot.start_time} - {slot.end_time}</div>
                          </td>
                          {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => {
                            const entry = timetableEntries.find(e => e.slot_id === slot.id && e.day_of_week === day);
                            return (
                              <td 
                                key={day} 
                                className={`teacher-timetable-cell ${entry ? 'has-entry' : ''}`}
                              >
                                {entry ? (
                                  <div className="teacher-details-div-103">
                                    <strong className="teacher-details-strong-104">{entry.subject_name}</strong>
                                    <span className="teacher-details-span-105">
                                      {getProgramLabel()}: {entry.section_name}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="teacher-details-span-106">-</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TIMELINE PANEL */}
        {activeTab === 'timeline' && (
          <div>
            <h3 className="teacher-details-title-107">Teacher Professional Timeline</h3>
            
            <div className="teacher-details-col-108">
              {/* Vertical line indicator */}
              <div className="teacher-details-div-109"  />
              
              {timelineItems.map((item, index) => (
                <div key={index} className="teacher-details-col-110">
                  {/* Dot */}
                  <div className="teacher-details-div-111"  />
                  
                  <h5 className="teacher-details-row-112">
                    {item.title}
                    <span className="teacher-details-span-113">Active</span>
                  </h5>
                  <p className="teacher-details-text-114">
                    {item.description}
                  </p>
                  {item.date && (
                    <span className="teacher-details-span-115">
                      Date: {item.date}
                    </span>
                  )}
                </div>
              ))}
              {timelineItems.length === 0 && (
                <div className="teacher-details-col-116">
                  <span className="teacher-details-span-117">🕒</span>
                  <p className="teacher-details-text-118">No activity timeline logs recorded yet.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* NOTES PANEL */}
        {activeTab === 'notes' && (
          <div>
            <h3 className="teacher-details-title-119">Internal Performance & Admin Notes</h3>
            
            {/* Note creation form */}
            <form onSubmit={handleAddNote} className="teacher-details-form-120">
              <div className="form-group teacher-details-form-group">
                <textarea 
                  id="teacher-note-textarea"
                  value={newNote} 
                  onChange={e => setNewNote(e.target.value)} 
                  placeholder="Record training recommendations, parent complaints, performance metrics, or promotional observations here..."
                  rows={3} 
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary btn-sm" disabled={addingNote}>
                {addingNote ? 'Adding...' : 'Post Internal Note'}
              </button>
            </form>

            {/* Notes list */}
            <div className="teacher-details-col-122">
              {notes.map(note => (
                <div key={note.id} className="teacher-details-col-123">
                  <p className="teacher-details-text-124">
                    {note.content}
                  </p>
                  <div className="teacher-details-row-125">
                    <span>Author: <strong>{note.author_name}</strong></span>
                    <span>Posted: {note.created_at?.split('.')[0] || note.created_at}</span>
                  </div>
                  <button onClick={() => handleDeleteNote(note.id)} className="teacher-details-btn-126" onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'} onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              {notes.length === 0 && (
                <div className="teacher-details-col-127">
                  <span className="teacher-details-span-128">📝</span>
                  <p className="teacher-details-text-129">No notes recorded.</p>
                  <button type="button" className="btn btn-outline btn-sm teacher-details-btn" onClick={() => document.getElementById('teacher-note-textarea')?.focus()}>
                    Add First Note
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* DOCUMENTS VAULT PANEL */}
        {activeTab === 'documents' && (
          <div>
            <div className="teacher-details-row-131">
              <h3 className="teacher-details-title-132">Digital Documents Vault</h3>
              <button className="btn btn-sm btn-primary" onClick={() => setShowUploadModal(true)}>
                <Upload size={14} /> Upload Document
              </button>
            </div>

            {documents.length > 0 ? (
              <div className="teacher-details-grid-133">
                {documents.map(doc => (
                  <div key={doc.id} className="teacher-details-row-134">
                    <div className="teacher-details-row-135" onClick={() => handleDownloadDoc(doc)}>
                      DOC
                    </div>
                    <div className="teacher-details-div-136" onClick={() => handleDownloadDoc(doc)}>
                      <h5 className="teacher-details-title-137" title={doc.name}>
                        {doc.name}
                      </h5>
                      <p className="teacher-details-text-138">
                        {doc.document_type} • {(doc.file_size / 1024).toFixed(1)} KB
                      </p>
                      <p className="teacher-details-text-139">
                        Uploaded: {doc.uploaded_at?.split(' ')[0]}
                      </p>
                    </div>
                    <button onClick={() => handleDocDelete(doc.id)} className="teacher-details-btn-140" onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'} onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="teacher-details-col-141">
                <span className="teacher-details-span-142">📁</span>
                <p className="teacher-details-text-143">No documents uploaded.</p>
                <button className="btn btn-outline btn-sm teacher-details-btn" onClick={() => setShowUploadModal(true)}>
                  <Upload size={14} /> Upload Document
                </button>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Upload Document Modal */}
      {showUploadModal && (
        <div className="modal teacher-details-modal">
          <div className="modal-content teacher-details-modal-content">
            <h3 className="teacher-details-title-147">Upload Teacher Document</h3>
            <form onSubmit={handleDocUploadSubmit}>
              
              <div className="form-group">
                <label>Document Type *</label>
                <select value={newDocType} onChange={e => setNewDocType(e.target.value)}>
                  <option value="Degree Certificate">Degree Certificate</option>
                  <option value="Identity Proof (Aadhaar/PAN)">Identity Proof (Aadhaar/PAN)</option>
                  <option value="Experience Certificate">Experience Certificate</option>
                  <option value="Joining Letter">Joining Letter</option>
                  <option value="Other">Other Document</option>
                </select>
              </div>

              <div className="form-group teacher-details-form-group">
                <label>Choose File *</label>
                <input required type="file" onChange={e => { const files = e.target.files; if (files && files[0]) { setSelectedFile(files[0]); } else { setSelectedFile(null); } }} className="teacher-details-input-149"  />
              </div>

              <div className="modal-actions teacher-details-modal-actions">
                <button type="button" onClick={() => { setShowUploadModal(false); setSelectedFile(null); }} className="btn btn-secondary" disabled={uploadingDoc}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={uploadingDoc || !selectedFile}>
                  {uploadingDoc ? 'Uploading...' : 'Upload File'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Subject Assignment Modal */}
      {showAssignModal && (
        <div className="modal teacher-details-modal">
          <div className="modal-content teacher-details-modal-content">
            <h3 className="teacher-details-title-153">Assign Subject to Teacher</h3>
            <form onSubmit={handleAssignSubject}>
              <div className="form-group teacher-details-form-group">
                <label>Academic Year</label>
                <select 
                  required
                  value={assignForm.academic_year_id} 
                  onChange={e => setAssignForm({...assignForm, academic_year_id: e.target.value})}
                >
                  <option value="">-- Choose Academic Year --</option>
                  {academicYears.map(y => (
                    <option key={y.id} value={y.id}>{y.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group teacher-details-form-group">
                <label>{getProgramLabel()}</label>
                <select 
                  required
                  value={assignForm.course_id} 
                  onChange={e => setAssignForm({...assignForm, course_id: e.target.value, section_id: '', subject_id: ''})}
                >
                  <option value="">-- Choose {getProgramLabel()} --</option>
                  {programs.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group teacher-details-form-group">
                <label>Section</label>
                <select 
                  required
                  value={assignForm.section_id} 
                  onChange={e => setAssignForm({...assignForm, section_id: e.target.value})}
                >
                  <option value="">-- Choose Section --</option>
                  {sections
                    .filter(s => s.course_id === assignForm.course_id)
                    .map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                </select>
              </div>

              <div className="form-group teacher-details-form-group">
                <label>Subject</label>
                <select 
                  required
                  value={assignForm.subject_id} 
                  onChange={e => setAssignForm({...assignForm, subject_id: e.target.value})}
                >
                  <option value="">-- Choose Subject --</option>
                  {subjects
                    .filter(s => s.course_id === assignForm.course_id)
                    .map(s => (
                      <option key={s.id} value={s.id}>{s.subject_name}</option>
                    ))}
                </select>
              </div>

              <div className="modal-actions teacher-details-modal-actions">
                <button type="button" onClick={() => setShowAssignModal(false)} className="btn btn-secondary" disabled={assigningSubject}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={assigningSubject}>
                  {assigningSubject ? 'Assigning...' : 'Assign Subject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Login Account Modal */}
      {showLoginModal && (
        <div className="modal teacher-details-modal">
          <div className="modal-content teacher-details-modal-content">
            <h3 className="teacher-details-title-161">Create Login Account</h3>
            <form onSubmit={handleCreateLogin}>
              
              <div className="form-group">
                <label>Username *</label>
                <input 
                  required 
                  type="text" 
                  value={loginUsername} 
                  onChange={e => setLoginUsername(e.target.value)} 
                  placeholder="e.g. jsmith"
                />
              </div>

              <div className="form-group teacher-details-form-group">
                <label>Email Address *</label>
                <input 
                  required 
                  type="email" 
                  value={loginEmail} 
                  onChange={e => setLoginEmail(e.target.value)} 
                  placeholder="e.g. john@school.com"
                />
              </div>

              <div className="form-group teacher-details-form-group">
                <label>Temporary Password *</label>
                <input 
                  required 
                  type="text" 
                  value={loginPassword} 
                  onChange={e => setLoginPassword(e.target.value)} 
                  placeholder="Temporary password"
                />
              </div>

              <div className="teacher-details-div-164">
                <strong>Role:</strong> Teacher (This account will automatically link to this teacher profile).
              </div>

              <div className="modal-actions teacher-details-modal-actions">
                <button type="button" onClick={() => setShowLoginModal(false)} className="btn btn-secondary" disabled={creatingLogin}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={creatingLogin}>
                  {creatingLogin ? 'Creating Account...' : 'Create Login'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal (Tabbed Layout) */}
      {showEditModal && editForm && (
        <div className="modal teacher-details-modal">
          <div className="modal-content teacher-details-modal-content">
            <h3 className="teacher-details-title-168">Edit Teacher Profile</h3>
            
            {/* Tabs */}
            <div className="teacher-details-row-169">
              {['personal', 'professional', 'account'].map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setEditTab(t as any)}
                  className={`teacher-edit-tab-btn ${editTab === t ? 'is-active' : ''}`}
                >
                  {t}
                </button>
              ))}
            </div>

            <form onSubmit={handleEditSubmit}>
              {/* TAB 1: Personal */}
              {editTab === 'personal' && (
                <div className="teacher-details-col-170">
                  <div className="teacher-details-grid-171">
                    <div className="form-group">
                      <label>First Name *</label>
                      <input required type="text" value={editForm.first_name} onChange={e => setEditForm({...editForm, first_name: e.target.value})} />
                    </div>
                    <div className="form-group">
                      <label>Middle Name</label>
                      <input type="text" value={editForm.middle_name} onChange={e => setEditForm({...editForm, middle_name: e.target.value})} />
                    </div>
                    <div className="form-group">
                      <label>Last Name *</label>
                      <input required type="text" value={editForm.last_name} onChange={e => setEditForm({...editForm, last_name: e.target.value})} />
                    </div>
                  </div>
                  <div className="teacher-details-grid-172">
                    <div className="form-group">
                      <label>Email *</label>
                      <input required type="email" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} />
                    </div>
                    <div className="form-group">
                      <label>Phone</label>
                      <input type="text" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: Professional */}
              {editTab === 'professional' && (
                <div className="teacher-details-col-173">
                  <div className="teacher-details-grid-174">
                    <div className="form-group">
                      <label>Employee ID *</label>
                      <input required type="text" value={editForm.employee_id} onChange={e => setEditForm({...editForm, employee_id: e.target.value})} />
                    </div>
                    <div className="form-group">
                      <label>Department *</label>
                      <select 
                        required 
                        value={editForm.department} 
                        onChange={e => setEditForm({...editForm, department: e.target.value})}
                      >
                        <option value="">-- Choose Department --</option>
                        {departments.map(d => (
                          <option key={d.id} value={d.name}>{d.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="teacher-details-grid-175">
                    <div className="form-group">
                      <label>Designation</label>
                      <input type="text" value={editForm.designation} onChange={e => setEditForm({...editForm, designation: e.target.value})} />
                    </div>
                    <div className="form-group">
                      <label>Joining Date</label>
                      <input type="date" value={editForm.joining_date} onChange={e => setEditForm({...editForm, joining_date: e.target.value})} />
                    </div>
                  </div>
                  <div className="teacher-details-grid-176">
                    <div className="form-group">
                      <label>Qualification</label>
                      <input type="text" value={editForm.qualification} onChange={e => setEditForm({...editForm, qualification: e.target.value})} />
                    </div>
                    <div className="form-group">
                      <label>Experience (Years)</label>
                      <input type="text" value={editForm.experience} onChange={e => setEditForm({...editForm, experience: e.target.value})} />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: Account Status */}
              {editTab === 'account' && (
                <div className="teacher-details-col-177">
                  <div className="form-group">
                    <label>Account Status</label>
                    <select value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value})}>
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="ON_LEAVE">ON LEAVE</option>
                      <option value="RESIGNED">RESIGNED</option>
                      <option value="RETIRED">RETIRED</option>
                    </select>
                  </div>
                  <div className="teacher-details-div-178">
                    <strong>Administrative Note:</strong> Account credential resets and login profile adjustments must be performed through the general Users Directory access control configurations.
                  </div>
                </div>
              )}

              {/* Modal Actions */}
              <div className="modal-actions teacher-details-modal-actions">
                <button type="button" onClick={() => setShowEditModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </Layout>
  );
}
