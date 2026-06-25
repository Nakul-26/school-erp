import React, { useEffect, useState } from 'react';
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

  if (loading) return <Layout><p style={{ textAlign: 'center', padding: '3rem' }}>Loading teacher profile...</p></Layout>;
  if (!teacher) return <Layout><p style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Teacher profile not found.</p></Layout>;

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
      <div style={{ marginBottom: '1rem' }}>
        <Link to="/teachers" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none', color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 600 }}>
          <ArrowLeft size={16} /> Back to Teacher Directory
        </Link>
      </div>

      {/* Completion Banner */}
      {completionPercentage < 100 && (
        <div style={{ 
          padding: '1rem 1.5rem', 
          backgroundColor: '#fffbeb', 
          border: '1px solid #fef3c7', 
          borderRadius: 'var(--radius-md)', 
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          flexWrap: 'wrap',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.25rem' }}>⚠️</span>
            <div>
              <strong style={{ color: '#92400e', fontSize: '0.9rem', display: 'block' }}>This teacher profile isn't fully configured ({completionPercentage}% completed)</strong>
              <span style={{ fontSize: '0.8rem', color: '#b45309' }}>
                Remaining: {remaining.join(' • ')}
              </span>
            </div>
          </div>
          <button 
            onClick={handleContinueSetup} 
            className="btn btn-sm btn-primary"
            style={{ backgroundColor: '#d97706', borderColor: '#d97706', color: '#ffffff' }}
          >
            Continue Setup
          </button>
        </div>
      )}

      {/* LinkedIn Style Profile Banner Card */}
      <div className="card" style={{ 
        padding: 0, 
        borderRadius: 'var(--radius-lg)', 
        border: '1px solid var(--border)', 
        background: 'linear-gradient(to bottom, #f8fafc 0%, #ffffff 100%)',
        boxShadow: 'var(--shadow-sm)',
        marginBottom: '2rem',
        position: 'relative',
        overflow: 'hidden',
        minHeight: 'fit-content'
      }}>
        {/* Decorative Top Banner Stripe */}
        <div style={{ 
          height: '140px', 
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', 
          borderTopLeftRadius: '15px', 
          borderTopRightRadius: '15px' 
        }}></div>

        <div style={{ display: 'flex', gap: '2rem', position: 'relative', zIndex: 1, padding: '0 2.5rem 2.5rem 2.5rem', flexWrap: 'wrap' }}>
          {/* Left Block: Avatar and Status Badge */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', alignSelf: 'flex-start', marginTop: '-70px', zIndex: 2 }}>
            <div style={{ 
              width: '120px', 
              height: '120px', 
              borderRadius: '50%', 
              background: '#ffffff', 
              border: '4px solid #ffffff',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              fontSize: '3.5rem',
              fontWeight: 'bold',
              overflow: 'hidden'
            }}>
              👨‍🏫
            </div>
            <span className={`badge badge-${teacher.status === 'ACTIVE' ? 'success' : 'secondary'}`} style={{ 
              fontSize: '0.75rem', 
              padding: '0.25rem 0.85rem', 
              borderRadius: '20px', 
              fontWeight: 700,
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
            }}>
              {teacher.status}
            </span>
          </div>

          {/* Right Block: Content Details Grid */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingTop: '1.5rem', minWidth: '280px' }}>
            <div>
              <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 0.25rem 0' }}>
                {teacher.first_name} {teacher.middle_name ? teacher.middle_name + ' ' : ''}{teacher.last_name}
              </h2>
              <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--primary)', marginBottom: '0.25rem' }}>
                {teacher.designation || 'Faculty Member'}
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                🏢 {teacher.department || 'General Department'}
              </div>
            </div>

            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
              gap: '1.25rem',
              borderTop: '1px solid #e2e8f0',
              paddingTop: '1.25rem',
              marginTop: '0.5rem'
            }}>
              <div>
                <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Employee ID</span>
                <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>{teacher.employee_id}</strong>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Joined Date</span>
                <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>{teacher.joining_date || 'N/A'}</strong>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Phone Number</span>
                <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>{teacher.phone || 'N/A'}</strong>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Email Address</span>
                <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)', wordBreak: 'break-all' }}>{teacher.email || 'N/A'}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Onboarding Setup Progress Card */}
      <div className="card" style={{ 
        padding: '1.5rem 2rem', 
        marginBottom: '2rem', 
        backgroundColor: '#ffffff',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-sm)',
        minHeight: 'fit-content'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
          {/* Progress Circle & Text */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ 
              width: '56px', 
              height: '56px', 
              borderRadius: '50%', 
              background: `conic-gradient(var(--primary) ${completionPercentage}%, #f1f5f9 ${completionPercentage}%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'inset 0 0 0 6px #ffffff',
              fontSize: '0.9rem',
              fontWeight: 800,
              color: 'var(--text-main)',
              position: 'relative'
            }}>
              <span style={{ position: 'absolute', zIndex: 1 }}>{completionPercentage}%</span>
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)' }}>Onboarding Checklist</h4>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Configure all details to complete onboarding</p>
            </div>
          </div>

          {/* Checklist Items */}
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', flex: 1, justifyContent: 'flex-end' }}>
            {checklistItems.map((item, idx) => (
              <div 
                key={idx} 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.4rem', 
                  fontSize: '0.85rem',
                  color: item.done ? 'var(--text-main)' : 'var(--text-muted)',
                  cursor: item.done ? 'default' : 'pointer'
                }}
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
                  <span style={{ color: '#10b981', fontWeight: 'bold' }}>✓</span>
                ) : (
                  <span style={{ color: '#94a3b8' }}>○</span>
                )}
                <span style={{ 
                  fontWeight: item.done ? 600 : 500,
                  textDecoration: item.done ? 'none' : 'underline',
                  textDecorationStyle: 'dotted'
                }} title={item.done ? '' : `Click to configure ${item.label}`}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions Row */}
      <div className="card" style={{ 
        padding: '1rem 1.5rem', 
        marginBottom: '2rem', 
        display: 'flex', 
        gap: '0.75rem', 
        flexWrap: 'wrap', 
        alignItems: 'center',
        backgroundColor: '#ffffff',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)',
        minHeight: 'fit-content'
      }}>
        <strong style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginRight: '0.5rem' }}>Quick Actions:</strong>
        <button className="btn btn-sm btn-outline" onClick={handleEditClick}>Edit Profile</button>
        <button className="btn btn-sm btn-outline" onClick={() => { setActiveTab('assignments'); setShowAssignModal(true); }}>Assign Subject</button>
        <Link to={`/weekly-timetable`} className="btn btn-sm btn-outline" style={{ display: 'inline-flex', alignItems: 'center' }}>Assign Timetable</Link>
        <button className="btn btn-sm btn-outline" onClick={() => { setActiveTab('documents'); setShowUploadModal(true); }}>Upload Document</button>
        <button 
          className={`btn btn-sm ${teacher.status === 'ACTIVE' ? 'btn-outline-danger' : 'btn-primary'}`} 
          onClick={handleToggleStatus}
        >
          {teacher.status === 'ACTIVE' ? 'Deactivate Teacher' : 'Activate Teacher'}
        </button>
      </div>

      {/* Teacher Workload Dashboard (Instant KPI Summary Block) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        
        {/* Assigned Subjects */}
        <div 
          onClick={() => { setActiveTab('assignments'); setShowAssignModal(true); }}
          className="card"
          style={{ 
            padding: '1.25rem', 
            backgroundColor: '#ffffff', 
            border: '1px solid var(--border)', 
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-sm)',
            cursor: 'pointer',
            transition: 'all 0.2s ease-in-out',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '120px'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = 'var(--shadow-md)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'none';
            e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
          }}
        >
          <div>
            <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Assigned Subjects</span>
            <strong style={{ fontSize: '1.5rem', color: 'var(--text-main)' }}>
              {workload?.subjects_count || [...new Set(assignments.map(a => a.subject_id))].length} Subjects
            </strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 700 }}>
            Assign →
          </div>
        </div>

        {/* Assigned Sections */}
        <div 
          onClick={() => { setActiveTab('assignments'); setShowAssignModal(true); }}
          className="card"
          style={{ 
            padding: '1.25rem', 
            backgroundColor: '#ffffff', 
            border: '1px solid var(--border)', 
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-sm)',
            cursor: 'pointer',
            transition: 'all 0.2s ease-in-out',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '120px'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = 'var(--shadow-md)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'none';
            e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
          }}
        >
          <div>
            <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Assigned Sections</span>
            <strong style={{ fontSize: '1.5rem', color: 'var(--text-main)' }}>
              {workload?.sections_count || [...new Set(assignments.map(a => a.section_id))].length} Sections
            </strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 700 }}>
            Assign →
          </div>
        </div>

        {/* Classes Scheduled/Week */}
        <div 
          onClick={() => setActiveTab('timetable')}
          className="card"
          style={{ 
            padding: '1.25rem', 
            backgroundColor: '#ffffff', 
            border: '1px solid var(--border)', 
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-sm)',
            cursor: 'pointer',
            transition: 'all 0.2s ease-in-out',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '120px'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = 'var(--shadow-md)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'none';
            e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
          }}
        >
          <div>
            <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Classes Scheduled/Week</span>
            <strong style={{ fontSize: '1.5rem', color: 'var(--primary)' }}>
              {teacher.periods_count || timetableEntries.length} Classes / Week
            </strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 700 }}>
            View Schedule →
          </div>
        </div>

        {/* Total Students Taught */}
        <div 
          onClick={() => setActiveTab('assignments')}
          className="card"
          style={{ 
            padding: '1.25rem', 
            backgroundColor: '#ffffff', 
            border: '1px solid var(--border)', 
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-sm)',
            cursor: 'pointer',
            transition: 'all 0.2s ease-in-out',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '120px'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = 'var(--shadow-md)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'none';
            e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
          }}
        >
          <div>
            <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Students Taught</span>
            <strong style={{ fontSize: '1.5rem', color: 'var(--text-main)' }}>
              {teacher.students_count || 0} Students
            </strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 700 }}>
            View Sections →
          </div>
        </div>

        {/* Attendance Rate */}
        <div 
          onClick={() => setActiveTab('timeline')}
          className="card"
          style={{ 
            padding: '1.25rem', 
            backgroundColor: '#ffffff', 
            border: '1px solid var(--border)', 
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-sm)',
            cursor: 'pointer',
            transition: 'all 0.2s ease-in-out',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '120px'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = 'var(--shadow-md)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'none';
            e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
          }}
        >
          <div>
            <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Attendance Rate</span>
            {workload && workload.total_attendance_days > 0 ? (
              <strong style={{ fontSize: '1.75rem', color: '#10b981' }}>
                {Math.round(((workload.present_days + workload.half_day_days * 0.5) / workload.total_attendance_days) * 100)}%
              </strong>
            ) : (
              <strong style={{ fontSize: '1.75rem', color: 'var(--text-muted)' }}>--</strong>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 700 }}>
            View History →
          </div>
        </div>

      </div>

      {/* Profile Tabs Header */}
      <div className="tabs" style={{ 
        display: 'flex', 
        gap: '0.5rem', 
        borderBottom: '1px solid #e2e8f0', 
        marginBottom: '1.5rem', 
        overflowX: 'auto', 
        height: '52px',
        flexShrink: 0,
        scrollbarWidth: 'none' 
      }}>
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
              style={{ 
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                minHeight: '48px',
                height: '48px',
                padding: '12px 20px', 
                border: 'none', 
                background: 'none', 
                cursor: 'pointer', 
                borderBottom: isSelected ? '3px solid var(--primary)' : '3px solid transparent', 
                color: isSelected ? 'var(--primary)' : '#64748b', 
                fontWeight: isSelected ? '700' : '500',
                fontSize: '0.875rem',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                transition: 'all 0.15s ease-in-out'
              }} 
              onClick={() => setActiveTab(t.id)}
            >
              <Icon size={15} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div className="card" style={{ padding: '2rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', minHeight: '350px' }}>
        
        {/* OVERVIEW PANEL */}
        {activeTab === 'overview' && (
          <div>
            <h3 style={{ marginBottom: '1.5rem', fontWeight: 800, fontSize: '1.2rem', color: 'var(--text-main)' }}>General Information</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '2rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '0.4rem' }}>Employee ID</label>
                <span style={{ fontWeight: '600', color: 'var(--text-main)', fontSize: '0.95rem' }}>{teacher.employee_id}</span>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '0.4rem' }}>Email Address</label>
                <span style={{ fontWeight: '600', color: 'var(--text-main)', fontSize: '0.95rem' }}>{teacher.email || '-'}</span>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '0.4rem' }}>Phone Number</label>
                <span style={{ fontWeight: '600', color: 'var(--text-main)', fontSize: '0.95rem' }}>{teacher.phone || '-'}</span>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '0.4rem' }}>Department</label>
                <span style={{ fontWeight: '600', color: 'var(--text-main)', fontSize: '0.95rem' }}>{teacher.department || '-'}</span>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '0.4rem' }}>Designation</label>
                <span style={{ fontWeight: '600', color: 'var(--text-main)', fontSize: '0.95rem' }}>{teacher.designation || '-'}</span>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '0.4rem' }}>Joining Date</label>
                <span style={{ fontWeight: '600', color: 'var(--text-main)', fontSize: '0.95rem' }}>{teacher.joining_date || '-'}</span>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '0.4rem' }}>Qualification</label>
                <span style={{ fontWeight: '600', color: 'var(--text-main)', fontSize: '0.95rem' }}>{teacher.qualification || '-'}</span>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '0.4rem' }}>Experience (Years)</label>
                <span style={{ fontWeight: '600', color: 'var(--text-main)', fontSize: '0.95rem' }}>{teacher.experience || '-'}</span>
              </div>
            </div>
          </div>
        )}

        {/* SUBJECT ASSIGNMENTS PANEL */}
        {activeTab === 'assignments' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--text-main)' }}>Subject Assignments</h3>
              <button className="btn btn-sm btn-primary" onClick={() => setShowAssignModal(true)}>
                Assign Subject
              </button>
            </div>
            {assignments.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
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
              <div style={{ textAlign: 'center', padding: '3rem', border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '2.5rem' }}>📚</span>
                <p style={{ color: 'var(--text-muted)', margin: 0, fontWeight: 500 }}>No subjects assigned yet.</p>
                <button className="btn btn-outline btn-sm" style={{ marginTop: '0.5rem' }} onClick={() => setShowAssignModal(true)}>
                  Assign Subject
                </button>
              </div>
            )}
          </div>
        )}

        {/* TIMETABLE SCHEDULE PANEL */}
        {activeTab === 'timetable' && (
          <div>
            <h3 style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--text-main)', marginBottom: '1.5rem' }}>Weekly Class Timetable</h3>
            {timetableSlots.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '2.5rem' }}>📅</span>
                <p style={{ color: 'var(--text-muted)', margin: 0, fontWeight: 500 }}>No timetable has been created yet.</p>
                <Link to="/weekly-timetable" className="btn btn-outline btn-sm" style={{ marginTop: '0.5rem' }}>
                  Open Timetable
                </Link>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="table" style={{ borderCollapse: 'collapse', width: '100%', minWidth: '800px' }}>
                  <thead>
                    <tr>
                      <th style={{ border: '1px solid var(--border)', padding: '0.75rem', backgroundColor: '#f8fafc', width: '150px' }}>Time Slot</th>
                      {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => (
                        <th key={day} style={{ border: '1px solid var(--border)', padding: '0.75rem', backgroundColor: '#f8fafc', textAlign: 'center' }}>{day}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {timetableSlots
                      .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''))
                      .map(slot => (
                        <tr key={slot.id}>
                          <td style={{ border: '1px solid var(--border)', padding: '0.75rem', fontWeight: 'bold', fontSize: '0.85rem' }}>
                            <div style={{ color: 'var(--text-main)' }}>{slot.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>{slot.start_time} - {slot.end_time}</div>
                          </td>
                          {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => {
                            const entry = timetableEntries.find(e => e.slot_id === slot.id && e.day_of_week === day);
                            return (
                              <td 
                                key={day} 
                                style={{ 
                                  border: '1px solid var(--border)', 
                                  padding: '0.75rem', 
                                  textAlign: 'center', 
                                  backgroundColor: entry ? '#f0fdf4' : 'transparent',
                                  verticalAlign: 'middle'
                                }}
                              >
                                {entry ? (
                                  <div style={{ fontSize: '0.85rem' }}>
                                    <strong style={{ color: '#166534', display: 'block' }}>{entry.subject_name}</strong>
                                    <span style={{ fontSize: '0.75rem', color: '#15803d', display: 'block', marginTop: '0.15rem' }}>
                                      {getProgramLabel()}: {entry.section_name}
                                    </span>
                                  </div>
                                ) : (
                                  <span style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>-</span>
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
            <h3 style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--text-main)', marginBottom: '1.5rem' }}>Teacher Professional Timeline</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', position: 'relative', paddingLeft: '2rem', gap: '2rem', marginTop: '1rem' }}>
              {/* Vertical line indicator */}
              <div style={{ position: 'absolute', left: '7px', top: '10px', bottom: '10px', width: '2px', backgroundColor: '#e2e8f0' }} />
              
              {timelineItems.map((item, index) => (
                <div key={index} style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  {/* Dot */}
                  <div style={{ 
                    position: 'absolute', 
                    left: '-2rem', 
                    marginLeft: '-3px',
                    top: '4px',
                    width: '16px', 
                    height: '16px', 
                    borderRadius: '50%', 
                    backgroundColor: '#0d9488', 
                    border: '3px solid #ffffff',
                    boxShadow: '0 0 0 1px #e2e8f0',
                    zIndex: 2
                  }} />
                  
                  <h5 style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {item.title}
                    <span style={{ fontSize: '0.7rem', color: '#0d9488', backgroundColor: '#ccfbf1', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>Active</span>
                  </h5>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                    {item.description}
                  </p>
                  {item.date && (
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)' }}>
                      Date: {item.date}
                    </span>
                  )}
                </div>
              ))}
              {timelineItems.length === 0 && (
                <div style={{ textAlign: 'center', padding: '3rem', border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '2.5rem' }}>🕒</span>
                  <p style={{ color: 'var(--text-muted)', margin: 0, fontWeight: 500 }}>No activity timeline logs recorded yet.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* NOTES PANEL */}
        {activeTab === 'notes' && (
          <div>
            <h3 style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--text-main)', marginBottom: '1.5rem' }}>Internal Performance & Admin Notes</h3>
            
            {/* Note creation form */}
            <form onSubmit={handleAddNote} style={{ marginBottom: '2rem' }}>
              <div className="form-group" style={{ marginBottom: '0.75rem' }}>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {notes.map(note => (
                <div key={note.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '1.25rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', backgroundColor: '#f8fafc', position: 'relative' }}>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-main)', whiteSpace: 'pre-line', paddingRight: '2rem' }}>
                    {note.content}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', borderTop: '1px solid #e2e8f0', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
                    <span>Author: <strong>{note.author_name}</strong></span>
                    <span>Posted: {note.created_at?.split('.')[0] || note.created_at}</span>
                  </div>
                  <button 
                    onClick={() => handleDeleteNote(note.id)} 
                    style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', border: 'none', background: 'transparent', color: '#94a3b8', cursor: 'pointer', padding: '0.2rem' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'}
                    onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              {notes.length === 0 && (
                <div style={{ textAlign: 'center', padding: '3rem', border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '2.5rem' }}>📝</span>
                  <p style={{ color: 'var(--text-muted)', margin: 0, fontWeight: 500 }}>No notes recorded.</p>
                  <button type="button" className="btn btn-outline btn-sm" style={{ marginTop: '0.5rem' }} onClick={() => document.getElementById('teacher-note-textarea')?.focus()}>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--text-main)' }}>Digital Documents Vault</h3>
              <button className="btn btn-sm btn-primary" onClick={() => setShowUploadModal(true)}>
                <Upload size={14} /> Upload Document
              </button>
            </div>

            {documents.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                {documents.map(doc => (
                  <div key={doc.id} style={{ display: 'flex', border: '1px solid var(--border)', padding: '1.25rem', borderRadius: 'var(--radius-md)', gap: '1rem', backgroundColor: 'var(--bg-main)', position: 'relative' }}>
                    <div style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#e2e8f0', color: '#475569', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer' }} onClick={() => handleDownloadDoc(doc)}>
                      DOC
                    </div>
                    <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => handleDownloadDoc(doc)}>
                      <h5 style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: '0 0 0.25rem' }} title={doc.name}>
                        {doc.name}
                      </h5>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                        {doc.document_type} • {(doc.file_size / 1024).toFixed(1)} KB
                      </p>
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>
                        Uploaded: {doc.uploaded_at?.split(' ')[0]}
                      </p>
                    </div>
                    <button 
                      onClick={() => handleDocDelete(doc.id)} 
                      style={{ position: 'absolute', top: '1rem', right: '1rem', border: 'none', background: 'transparent', color: '#94a3b8', cursor: 'pointer', padding: '0.2rem' }}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'}
                      onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem', border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '2.5rem' }}>📁</span>
                <p style={{ color: 'var(--text-muted)', margin: 0, fontWeight: 500 }}>No documents uploaded.</p>
                <button className="btn btn-outline btn-sm" style={{ marginTop: '0.5rem' }} onClick={() => setShowUploadModal(true)}>
                  <Upload size={14} /> Upload Document
                </button>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Upload Document Modal */}
      {showUploadModal && (
        <div className="modal" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.45)', zIndex: 1000, padding: '1rem' }}>
          <div className="modal-content" style={{ backgroundColor: '#ffffff', borderRadius: 'var(--radius-lg)', maxWidth: '440px', width: '100%', padding: '2rem', boxShadow: 'var(--shadow-lg)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.25rem', color: 'var(--text-main)' }}>Upload Teacher Document</h3>
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

              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label>Choose File *</label>
                <input 
                  required 
                  type="file" 
                  onChange={e => {
                    const files = e.target.files;
                    if (files && files[0]) {
                      setSelectedFile(files[0]);
                    } else {
                      setSelectedFile(null);
                    }
                  }} 
                  style={{ border: 'none', padding: 0 }}
                />
              </div>

              <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '2rem' }}>
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
        <div className="modal" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.45)', zIndex: 1000, padding: '1rem', overflowY: 'auto' }}>
          <div className="modal-content" style={{ backgroundColor: '#ffffff', borderRadius: 'var(--radius-lg)', maxWidth: '500px', width: '100%', padding: '2rem', boxShadow: 'var(--shadow-lg)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.5rem', color: 'var(--text-main)' }}>Assign Subject to Teacher</h3>
            <form onSubmit={handleAssignSubject}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
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

              <div className="form-group" style={{ marginBottom: '1rem' }}>
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

              <div className="form-group" style={{ marginBottom: '1rem' }}>
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

              <div className="form-group" style={{ marginBottom: '1rem' }}>
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

              <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '2rem' }}>
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
        <div className="modal" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.45)', zIndex: 1000, padding: '1rem' }}>
          <div className="modal-content" style={{ backgroundColor: '#ffffff', borderRadius: 'var(--radius-lg)', maxWidth: '440px', width: '100%', padding: '2rem', boxShadow: 'var(--shadow-lg)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.25rem', color: 'var(--text-main)' }}>Create Login Account</h3>
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

              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label>Email Address *</label>
                <input 
                  required 
                  type="email" 
                  value={loginEmail} 
                  onChange={e => setLoginEmail(e.target.value)} 
                  placeholder="e.g. john@school.com"
                />
              </div>

              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label>Temporary Password *</label>
                <input 
                  required 
                  type="text" 
                  value={loginPassword} 
                  onChange={e => setLoginPassword(e.target.value)} 
                  placeholder="Temporary password"
                />
              </div>

              <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#f1f5f9', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <strong>Role:</strong> Teacher (This account will automatically link to this teacher profile).
              </div>

              <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '2rem' }}>
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
        <div className="modal" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.45)', zIndex: 1000, padding: '1rem', overflowY: 'auto' }}>
          <div className="modal-content" style={{ backgroundColor: '#ffffff', borderRadius: 'var(--radius-lg)', maxWidth: '680px', width: '100%', padding: '2rem', boxShadow: 'var(--shadow-lg)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.5rem', color: 'var(--text-main)' }}>Edit Teacher Profile</h3>
            
            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '1.5rem', gap: '1rem', overflowX: 'auto', scrollbarWidth: 'none' }}>
              {['personal', 'professional', 'account'].map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setEditTab(t as any)}
                  style={{
                    padding: '0.5rem 1rem',
                    border: 'none',
                    background: 'none',
                    borderBottom: editTab === t ? '2px solid var(--primary)' : '2px solid transparent',
                    color: editTab === t ? 'var(--primary)' : '#64748b',
                    fontWeight: editTab === t ? 700 : 500,
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {t}
                </button>
              ))}
            </div>

            <form onSubmit={handleEditSubmit}>
              {/* TAB 1: Personal */}
              {editTab === 'personal' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
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
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
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
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label>Designation</label>
                      <input type="text" value={editForm.designation} onChange={e => setEditForm({...editForm, designation: e.target.value})} />
                    </div>
                    <div className="form-group">
                      <label>Joining Date</label>
                      <input type="date" value={editForm.joining_date} onChange={e => setEditForm({...editForm, joining_date: e.target.value})} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="form-group">
                    <label>Account Status</label>
                    <select value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value})}>
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="ON_LEAVE">ON LEAVE</option>
                      <option value="RESIGNED">RESIGNED</option>
                      <option value="RETIRED">RETIRED</option>
                    </select>
                  </div>
                  <div style={{ padding: '1rem', backgroundColor: '#f1f5f9', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    <strong>Administrative Note:</strong> Account credential resets and login profile adjustments must be performed through the general Users Directory access control configurations.
                  </div>
                </div>
              )}

              {/* Modal Actions */}
              <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '2rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
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
