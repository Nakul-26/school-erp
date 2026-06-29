import React, { useEffect, useState } from 'react';
import { PageGuidance } from '../components/PageGuidance';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { api } from '../services/api';
import { 
  Plus, Calendar, GraduationCap, FileText, User, 
  TrendingUp, IndianRupee, Clock, ArrowLeft, Upload, Trash2, 
  CheckCircle2, Heart, MessageSquare, ShieldAlert, Phone, Mail
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function StudentDetails() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';

  const [student, setStudent] = useState<any>(null);
  const [guardians, setGuardians] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);

  // Institution & Terminology States
  const { user } = useAuth();
  const [institutionType, setInstitutionType] = useState<string>('college');

  const getProgramLabel = () => institutionType === 'school' ? 'Class' : 'Program';
  const getProgramsLabel = () => institutionType === 'school' ? 'Classes' : 'Programs';
  
  // Custom states
  const [attendanceInfo, setAttendanceInfo] = useState<any>(null);
  const [ledger, setLedger] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  
  // Exams & Results states
  const [studentExams, setStudentExams] = useState<any[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [detailedResult, setDetailedResult] = useState<any>(null);
  const [loadingResult, setLoadingResult] = useState(false);

  // Document upload state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [newDocType, setNewDocType] = useState('Transfer Certificate');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Notes state
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  // Health Card Edit state
  const [showHealthEdit, setShowHealthEdit] = useState(false);
  const [savingHealth, setSavingHealth] = useState(false);
  const [healthForm, setHealthForm] = useState({
    blood_group: '',
    emergency_contact: '',
    medical_conditions: '',
    allergies: ''
  });

  // Enrollment Management modal states
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferForm, setTransferForm] = useState({ academic_year_id: '', course_id: '', section_id: '', semester: 1 });

  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [promoteForm, setPromoteForm] = useState({ academic_year_id: '', course_id: '', section_id: '', semester: 1 });

  const [showChangeSectionModal, setShowChangeSectionModal] = useState(false);
  const [changeSectionForm, setChangeSectionForm] = useState({ section_id: '' });

  const setActiveTab = (tab: string) => {
    setSearchParams({ tab });
  };

  useEffect(() => {
    if (activeTab === 'results') {
      fetchExams();
    }
  }, [activeTab]);

  useEffect(() => {
    if (selectedExamId) {
      fetchDetailedResult();
    } else {
      setDetailedResult(null);
    }
  }, [selectedExamId]);

  const fetchExams = async () => {
    try {
      const data = await api.get(`/exams/students/${id}/results`);
      setStudentExams(data);
      if (data.length > 0) {
        setSelectedExamId(data[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDetailedResult = async () => {
    try {
      setLoadingResult(true);
      const data = await api.get(`/exams/students/${id}/exams/${selectedExamId}/result`);
      setDetailedResult(data);
    } catch (err) {
      console.error(err);
      setDetailedResult(null);
    } finally {
      setLoadingResult(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [
        studentData, guardiansData, enrollmentsData, yearsData, programsData, sectionsData, 
        attendanceData, ledgerData, paymentsData, documentsData, notesData
      ] = await Promise.all([
        api.get(`/students/${id}`),
        api.get(`/guardians/student/${id}`),
        api.get(`/enrollments/student/${id}`),
        api.get('/academic-years'),
        api.get('/programs'),
        api.get('/sections'),
        api.get(`/attendance/student/${id}`).catch(() => null),
        api.get(`/fees/ledger/${id}`).catch(() => []),
        api.get(`/fees/payments?student_id=${id}`).catch(() => []),
        api.get(`/students/${id}/documents`).catch(() => []),
        api.get(`/students/${id}/notes`).catch(() => [])
      ]);
      
      setStudent(studentData);
      setGuardians(guardiansData);
      // Sort enrollments descending by created_at so the latest is first
      const sortedEnrollments = (enrollmentsData || []).sort((a: any, b: any) => 
        new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      );
      setEnrollments(sortedEnrollments);
      
      setAcademicYears(yearsData);
      setPrograms(programsData);
      setSections(sectionsData);
      setAttendanceInfo(attendanceData);
      setLedger(ledgerData || []);
      setPayments(paymentsData || []);
      setDocuments(documentsData || []);
      setNotes(notesData || []);

      // Populate health card form
      setHealthForm({
        blood_group: studentData.blood_group || '',
        emergency_contact: studentData.emergency_contact || '',
        medical_conditions: studentData.medical_conditions || '',
        allergies: studentData.allergies || ''
      });

      const currentEnroll = sortedEnrollments[0];
      if (currentEnroll) {
        setTransferForm({
          academic_year_id: currentEnroll.academic_year_id || '',
          course_id: currentEnroll.course_id || '',
          section_id: currentEnroll.section_id || '',
          semester: currentEnroll.semester || 1
        });
        setPromoteForm({
          academic_year_id: currentEnroll.academic_year_id || '',
          course_id: currentEnroll.course_id || '',
          section_id: currentEnroll.section_id || '',
          semester: (currentEnroll.semester || 1) + 1
        });
        setChangeSectionForm({
          section_id: currentEnroll.section_id || ''
        });
      }

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
      await api.post(`/students/${id}/notes`, { content: newNote });
      setNewNote('');
      const updatedNotes = await api.get(`/students/${id}/notes`);
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
      await api.delete(`/students/${id}/notes/${noteId}`);
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

      await api.upload(`/students/${id}/documents/upload`, formData);
      
      // Refresh documents
      const docs = await api.get(`/students/${id}/documents`);
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
      // Set API BASE URL
      const BASE_URL = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:8787' : '');
      
      const response = await fetch(`${BASE_URL}/students/${id}/documents/${doc.id}/download`, {
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
      await api.delete(`/students/${id}/documents/${docId}`);
      setDocuments(documents.filter(d => d.id !== docId));
    } catch (err) {
      console.error(err);
      alert('Failed to delete document');
    }
  };

  // Health Card actions
  const handleHealthSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingHealth(true);
      await api.put(`/students/${id}`, healthForm);
      setStudent({ ...student, ...healthForm });
      setShowHealthEdit(false);
    } catch (err) {
      console.error(err);
      alert('Failed to save health card');
    } finally {
      setSavingHealth(false);
    }
  };

  // Enrollment actions
  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await api.put(`/students/${id}`, {
        academic_year_id: transferForm.academic_year_id,
        course_id: transferForm.course_id,
        section_id: transferForm.section_id,
        semester: transferForm.semester
      });
      setShowTransferModal(false);
      await fetchData();
    } catch (err: any) {
      console.error(err);
      alert(`Transfer failed: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePromoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await api.put(`/students/${id}`, {
        academic_year_id: promoteForm.academic_year_id,
        course_id: promoteForm.course_id,
        section_id: promoteForm.section_id,
        semester: promoteForm.semester
      });
      setShowPromoteModal(false);
      await fetchData();
    } catch (err: any) {
      console.error(err);
      alert(`Promotion failed: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleChangeSectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const currentEnroll = enrollments[0];
      if (!currentEnroll) {
        alert('No active enrollment to change section for.');
        return;
      }
      await api.put(`/students/${id}`, {
        academic_year_id: currentEnroll.academic_year_id,
        course_id: currentEnroll.course_id,
        section_id: changeSectionForm.section_id,
        semester: currentEnroll.semester || 1
      });
      setShowChangeSectionModal(false);
      await fetchData();
    } catch (err: any) {
      console.error(err);
      alert(`Change Section failed: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTransferFieldChange = (field: string, value: any) => {
    const updatedForm = { ...transferForm, [field]: value };
    if (field === 'academic_year_id' || field === 'course_id') {
      const matchingSections = sections.filter(s => 
        s.academic_year_id === (field === 'academic_year_id' ? value : transferForm.academic_year_id) && 
        s.course_id === (field === 'course_id' ? value : transferForm.course_id)
      );
      updatedForm.section_id = matchingSections[0]?.id || '';
    }
    setTransferForm(updatedForm);
  };

  const handlePromoteFieldChange = (field: string, value: any) => {
    const updatedForm = { ...promoteForm, [field]: value };
    if (field === 'academic_year_id' || field === 'course_id') {
      const matchingSections = sections.filter(s => 
        s.academic_year_id === (field === 'academic_year_id' ? value : promoteForm.academic_year_id) && 
        s.course_id === (field === 'course_id' ? value : promoteForm.course_id)
      );
      updatedForm.section_id = matchingSections[0]?.id || '';
    }
    setPromoteForm(updatedForm);
  };

  if (loading) return <Layout>
      <PageGuidance
        title="Student Profile"
        description="Use this page to inspect a student's personal information, attendance record, and exam grades."
        steps={["Read personal details, contact info, and parent profiles.","Check their attendance percentage and detailed daily record.","Review report cards and outstanding school fees."]}
      /><p style={{ textAlign: 'center', padding: '3rem' }}>Loading student profile...</p></Layout>;
  if (!student) return <Layout><p style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Student profile not found.</p></Layout>;

  // Calculate fees statistics
  const totalAssignedFees = ledger.reduce((sum, item) => sum + (item.total_amount || 0), 0);
  const totalPaidFees = ledger.reduce((sum, item) => sum + (item.paid_amount || 0), 0);
  const remainingFeeDue = totalAssignedFees - totalPaidFees;

  // Build timeline milestones
  const firstAttendanceDate = attendanceInfo?.records?.[attendanceInfo.records.length - 1]?.date || null;
  const firstExamDate = detailedResult?.subjects?.[0]?.exam_date || null;

  const timelineItems = [
    {
      title: 'Student Admitted',
      description: `Student officially admitted under admission number ${student.admission_number}`,
      date: student.admission_date || student.created_at?.split(' ')[0],
      completed: true
    },
    {
      title: `Enrolled in ${student.program_name || getProgramLabel()}`,
      description: enrollments.length > 0 
        ? (institutionType === 'school'
            ? `Enrolled in Section: ${student.section_name || 'Section A'}`
            : `Enrolled in Section: ${student.section_name || 'Section A'} (Semester ${enrollments[0]?.semester || 1})`)
        : `${getProgramLabel()} enrollment pending`,
      date: enrollments[0]?.created_at?.split('T')[0] || student.admission_date || student.created_at?.split(' ')[0],
      completed: enrollments.length > 0
    },
    {
      title: 'Fee Structure Assigned',
      description: ledger.length > 0 
        ? `Financial ledger created. Assigned ${ledger.length} fee heads (Total ₹${totalAssignedFees.toLocaleString('en-IN')})`
        : 'No fee structures assigned yet',
      date: ledger[0]?.created_at?.split('T')[0] || enrollments[0]?.created_at?.split('T')[0] || null,
      completed: ledger.length > 0
    },
    {
      title: 'Attendance Started',
      description: attendanceInfo && attendanceInfo.total > 0
        ? `Daily class attendance sessions registered. Present/Total: ${attendanceInfo.present}/${attendanceInfo.total}`
        : 'No attendance records logged yet',
      date: firstAttendanceDate,
      completed: attendanceInfo && attendanceInfo.total > 0
    },
    {
      title: 'Exam Results Published',
      description: studentExams.length > 0
        ? `Academics evaluation recorded. Results published for ${studentExams.length} examination(s)`
        : 'No examinations evaluations graded yet',
      date: firstExamDate,
      completed: studentExams.length > 0
    }
  ];

  return (
    <Layout>
      {/* Back button */}
      <div style={{ marginBottom: '1rem' }}>
        <Link to="/students" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none', color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 600 }}>
          <ArrowLeft size={16} /> Back to Student Hub
        </Link>
      </div>

      {/* Redesigned Student Profile Header Banner (Premium Sidebar Columns Format) */}
      <div className="card" style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '2.5rem', padding: '2.5rem', alignItems: 'center', background: 'linear-gradient(to right, #f8fafc, #ffffff)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', marginBottom: '2rem', boxShadow: 'var(--shadow-sm)', flexWrap: 'wrap' }}>
        {/* Left Column: Big Avatar */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '96px', height: '96px', borderRadius: '50%', background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', fontWeight: 'bold', boxShadow: '0 8px 16px rgba(79, 70, 229, 0.15)' }}>
            👤
          </div>
          <span className={`badge badge-${student.status === 'ACTIVE' ? 'success' : student.status === 'GRADUATED' ? 'success' : 'secondary'}`} style={{ fontSize: '0.75rem', padding: '0.2rem 0.75rem' }}>
            {student.status}
          </span>
        </div>

        {/* Right Column: Dynamic Profile Metadata Grid */}
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '1.25rem', borderBottom: '2px solid #f1f5f9', paddingBottom: '0.5rem' }}>
            {student.first_name} {student.middle_name ? student.middle_name + ' ' : ''}{student.last_name}
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
            <div>
              <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Admission No</span>
              <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>{student.admission_number}</strong>
            </div>
            <div>
              <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Roll No</span>
              <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>{student.roll_number || 'N/A'}</strong>
            </div>
            <div>
              <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>{getProgramLabel()}</span>
              <strong style={{ fontSize: '0.95rem', color: 'var(--primary)' }}>{student.program_name || 'Unassigned'}</strong>
            </div>
            <div>
              <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Section</span>
              <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>{student.section_name || 'Unassigned'}</strong>
            </div>
            <div>
              <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Academic Year</span>
              <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>{student.academic_year_name || 'N/A'}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Redesigned Profile Tabs Header */}
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
          { id: 'academic', label: 'Academic', icon: GraduationCap },
          { id: 'attendance', label: 'Attendance', icon: Clock },
          { id: 'results', label: 'Results', icon: TrendingUp },
          { id: 'fees', label: 'Fees', icon: IndianRupee },
          { id: 'timeline', label: 'Timeline', icon: Calendar },
          { id: 'health', label: 'Health Card', icon: Heart },
          { id: 'notes', label: 'Notes', icon: MessageSquare },
          { id: 'documents', label: 'Documents', icon: FileText },
          { id: 'guardians', label: 'Guardians', icon: User }
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
            <h3 style={{ marginBottom: '1.5rem', fontWeight: 800, fontSize: '1.2rem', color: 'var(--text-main)' }}>Personal Information</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '2rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '0.4rem' }}>First Name</label>
                <span style={{ fontWeight: '600', color: 'var(--text-main)', fontSize: '0.95rem' }}>{student.first_name}</span>
              </div>
              {student.middle_name && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '0.4rem' }}>Middle Name</label>
                  <span style={{ fontWeight: '600', color: 'var(--text-main)', fontSize: '0.95rem' }}>{student.middle_name}</span>
                </div>
              )}
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '0.4rem' }}>Last Name</label>
                <span style={{ fontWeight: '600', color: 'var(--text-main)', fontSize: '0.95rem' }}>{student.last_name}</span>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '0.4rem' }}>Admission No</label>
                <span style={{ fontWeight: '700', color: 'var(--text-main)', fontSize: '0.95rem' }}>{student.admission_number}</span>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '0.4rem' }}>Roll No</label>
                <span style={{ fontWeight: '600', color: 'var(--text-main)', fontSize: '0.95rem' }}>{student.roll_number || '-'}</span>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '0.4rem' }}>Email Address</label>
                <span style={{ fontWeight: '600', color: 'var(--text-main)', fontSize: '0.95rem' }}>{student.email || '-'}</span>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '0.4rem' }}>Phone Number</label>
                <span style={{ fontWeight: '600', color: 'var(--text-main)', fontSize: '0.95rem' }}>{student.phone || '-'}</span>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '0.4rem' }}>Gender</label>
                <span style={{ fontWeight: '600', color: 'var(--text-main)', fontSize: '0.95rem' }}>{student.gender || '-'}</span>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '0.4rem' }}>Date of Birth</label>
                <span style={{ fontWeight: '600', color: 'var(--text-main)', fontSize: '0.95rem' }}>{student.date_of_birth || '-'}</span>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '0.4rem' }}>Admission Date</label>
                <span style={{ fontWeight: '600', color: 'var(--text-main)', fontSize: '0.95rem' }}>{student.admission_date || '-'}</span>
              </div>
            </div>
          </div>
        )}

        {/* ACADEMIC HISTORY PANEL */}
        {activeTab === 'academic' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--text-main)' }}>Academic Enrollment Hub</h3>
            </div>

            {/* Current Enrollment Status Card */}
            {enrollments.length > 0 ? (
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr auto', 
                gap: '1.5rem', 
                padding: '1.5rem', 
                background: 'linear-gradient(to right, #f8fafc, #ffffff)', 
                border: '1px solid var(--border)', 
                borderRadius: 'var(--radius-lg)', 
                marginBottom: '2rem',
                boxShadow: 'var(--shadow-sm)',
                alignItems: 'center'
              }}>
                <div>
                  <h4 style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-main)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <GraduationCap size={18} style={{ color: 'var(--primary)' }} /> Current Enrollment Status
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                    <div>
                      <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Academic Year</span>
                      <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>
                        {academicYears.find(y => y.id === enrollments[0].academic_year_id)?.name || 'N/A'}
                      </strong>
                    </div>
                    <div>
                      <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>{getProgramLabel()}</span>
                      <strong style={{ fontSize: '0.95rem', color: 'var(--primary)' }}>
                        {programs.find(p => p.id === enrollments[0].course_id)?.name || 'N/A'}
                      </strong>
                    </div>
                    <div>
                      <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Section</span>
                      <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>
                        {sections.find(s => s.id === enrollments[0].section_id)?.name || 'N/A'}
                      </strong>
                    </div>
                    {institutionType !== 'school' && (
                      <div>
                        <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Semester</span>
                        <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>
                          Semester {enrollments[0].semester || 1}
                        </strong>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Actions group */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: '180px' }}>
                  <button className="btn btn-primary btn-sm" style={{ width: '100%' }} onClick={() => {
                    const currentEnroll = enrollments[0];
                    setTransferForm({
                      academic_year_id: currentEnroll.academic_year_id || '',
                      course_id: currentEnroll.course_id || '',
                      section_id: currentEnroll.section_id || '',
                      semester: currentEnroll.semester || 1
                    });
                    setShowTransferModal(true);
                  }}>
                    Transfer Student
                  </button>
                  <button className="btn btn-outline btn-sm" style={{ width: '100%' }} onClick={() => {
                    const currentEnroll = enrollments[0];
                    setPromoteForm({
                      academic_year_id: currentEnroll.academic_year_id || '',
                      course_id: currentEnroll.course_id || '',
                      section_id: currentEnroll.section_id || '',
                      semester: (currentEnroll.semester || 1) + 1
                    });
                    setShowPromoteModal(true);
                  }}>
                    Promote Student
                  </button>
                  <button className="btn btn-secondary btn-sm" style={{ width: '100%' }} onClick={() => {
                    const currentEnroll = enrollments[0];
                    setChangeSectionForm({
                      section_id: currentEnroll.section_id || ''
                    });
                    setShowChangeSectionModal(true);
                  }}>
                    Change Section
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ 
                padding: '2rem', 
                border: '1px dashed var(--border)', 
                borderRadius: 'var(--radius-lg)', 
                textAlign: 'center',
                marginBottom: '2rem',
                color: 'var(--text-muted)'
              }}>
                <p style={{ marginBottom: '1rem' }}>This student is not enrolled in any academic year/class.</p>
                <button className="btn btn-primary btn-sm" onClick={() => {
                  setTransferForm({
                    academic_year_id: academicYears[0]?.id || '',
                    course_id: programs[0]?.id || '',
                    section_id: '',
                    semester: 1
                  });
                  setShowTransferModal(true);
                }}>
                  Enroll Student
                </button>
              </div>
            )}

            {/* History Table */}
            <div>
              <h4 style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-main)', marginBottom: '1rem' }}>
                Enrollment Logs & History
              </h4>
              <div style={{ overflowX: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Academic Year</th>
                      <th>{getProgramLabel()}</th>
                      <th>Section</th>
                      {institutionType !== 'school' && <th>Semester</th>}
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enrollments.map((e, idx) => (
                      <tr key={e.id}>
                        <td><strong>{academicYears.find(y => y.id === e.academic_year_id)?.name || 'Unknown'}</strong></td>
                        <td>{programs.find(p => p.id === e.course_id)?.name || 'Unknown'}</td>
                        <td>{sections.find(s => s.id === e.section_id)?.name || 'Unknown'}</td>
                        {institutionType !== 'school' && <td>Semester {e.semester || '1'}</td>}
                        <td>
                          {idx === 0 ? (
                            <span className="badge badge-success">Current</span>
                          ) : (
                            <span className="badge badge-secondary">Historic</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {enrollments.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                          No enrollment history has been recorded for this student.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ATTENDANCE PANEL */}
        {activeTab === 'attendance' && (
          <div>
            <h3 style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--text-main)', marginBottom: '1.5rem' }}>Attendance Performance</h3>
            
            {attendanceInfo && attendanceInfo.total > 0 ? (
              <div>
                {/* KPI Summary Block */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                  <div style={{ padding: '1.25rem', backgroundColor: '#f8fafc', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                    <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Attendance Rate</span>
                    <strong style={{ fontSize: '1.75rem', color: attendanceInfo.percentage >= 75 ? '#10b981' : '#f59e0b' }}>
                      {attendanceInfo.percentage}%
                    </strong>
                  </div>
                  <div style={{ padding: '1.25rem', backgroundColor: '#f8fafc', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                    <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Classes Attended</span>
                    <strong style={{ fontSize: '1.75rem', color: 'var(--text-main)' }}>
                      {attendanceInfo.present}
                    </strong>
                  </div>
                  <div style={{ padding: '1.25rem', backgroundColor: '#f8fafc', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                    <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Total Sessions</span>
                    <strong style={{ fontSize: '1.75rem', color: 'var(--text-main)' }}>
                      {attendanceInfo.total}
                    </strong>
                  </div>
                </div>

                {/* Detailed Logs Table */}
                <h4 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)', marginBottom: '1rem' }}>Detailed Session Records</h4>
                <div style={{ overflowX: 'auto' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Subject</th>
                        <th>Instructor</th>
                        <th>Attendance Status</th>
                        <th>Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendanceInfo.records?.map((record: any, index: number) => (
                        <tr key={index}>
                          <td><strong>{record.date}</strong></td>
                          <td>{record.subject_name}</td>
                          <td>{record.teacher_name}</td>
                          <td>
                            <span className={`badge badge-${record.status === 'present' || record.status === 'late' ? 'success' : 'danger'}`}>
                              {record.status}
                            </span>
                          </td>
                          <td>{record.remarks || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div>
                {/* Clean Attendance KPI fallback when 0 sessions logged */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                  <div style={{ padding: '1.25rem', backgroundColor: '#f8fafc', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                    <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Attendance Rate</span>
                    <strong style={{ fontSize: '1.75rem', color: 'var(--text-muted)' }}>--</strong>
                  </div>
                  <div style={{ padding: '1.25rem', backgroundColor: '#f8fafc', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                    <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Classes Attended</span>
                    <strong style={{ fontSize: '1.75rem', color: 'var(--text-main)' }}>0</strong>
                  </div>
                  <div style={{ padding: '1.25rem', backgroundColor: '#f8fafc', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                    <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Total Sessions</span>
                    <strong style={{ fontSize: '1.75rem', color: 'var(--text-main)' }}>0</strong>
                  </div>
                </div>
                <div style={{ textAlign: 'center', padding: '3rem', border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)' }}>
                  <p style={{ color: 'var(--text-muted)' }}>No attendance data available yet.</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* RESULTS PANEL */}
        {activeTab === 'results' && (
          <div>
            <h3 style={{ marginBottom: '1.5rem', fontWeight: 800, fontSize: '1.2rem', color: 'var(--text-main)' }}>Exam Performance</h3>
            {studentExams.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No examinations recorded for this student.</p>
            ) : (
              <div>
                <div className="form-group" style={{ maxWidth: '320px', marginBottom: '1.5rem' }}>
                  <label>Select Examination</label>
                  <select value={selectedExamId} onChange={e => setSelectedExamId(e.target.value)}>
                    {studentExams.map(ex => (
                      <option key={ex.id} value={ex.id}>{ex.name}</option>
                    ))}
                  </select>
                </div>

                {loadingResult ? (
                  <p>Fetching result card details...</p>
                ) : detailedResult ? (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem', padding: '1.25rem', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                      <div>
                        <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Total Marks Obtained</span>
                        <strong style={{ fontSize: '1.25rem', color: 'var(--text-main)' }}>{detailedResult.total_obtained} / {detailedResult.total_max}</strong>
                      </div>
                      <div>
                        <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Aggregated Percentage</span>
                        <strong style={{ fontSize: '1.25rem', color: 'var(--text-main)' }}>{detailedResult.percentage}%</strong>
                      </div>
                      <div>
                        <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Grade</span>
                        <strong style={{ fontSize: '1.25rem', color: 'var(--text-main)' }}>{detailedResult.grade}</strong>
                      </div>
                      <div>
                        <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.2rem' }}>Result Status</span>
                        <span className={`badge badge-${detailedResult.result === 'PASS' ? 'success' : 'danger'}`}>
                          {detailedResult.result}
                        </span>
                      </div>
                    </div>

                    <table className="table">
                      <thead>
                        <tr>
                          <th>Subject Code</th>
                          <th>Subject Name</th>
                          <th>Marks Obtained</th>
                          <th>Maximum Marks</th>
                          <th>Passing Threshold</th>
                          <th>Subject Status</th>
                          <th>Remarks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailedResult.subjects?.map((sub: any) => (
                          <tr key={sub.subject_id}>
                            <td><strong>{sub.subject_code}</strong></td>
                            <td>{sub.subject_name}</td>
                            <td><strong>{sub.marks_obtained}</strong></td>
                            <td>{sub.max_marks}</td>
                            <td>{sub.min_marks}</td>
                            <td>
                              <span className={`badge badge-${sub.status === 'PASS' ? 'success' : 'danger'}`}>
                                {sub.status}
                              </span>
                            </td>
                            <td>{sub.remarks || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No evaluation records entered for this student in the selected exam.</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* FEES PANEL */}
        {activeTab === 'fees' && (
          <div>
            <h3 style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--text-main)', marginBottom: '1.5rem' }}>Financial Fee Ledger</h3>
            
            {/* KPI Summary Block */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
              <div style={{ padding: '1.25rem', backgroundColor: '#f8fafc', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Assigned Charges</span>
                <strong style={{ fontSize: '1.5rem', color: 'var(--text-main)' }}>
                  ₹{totalAssignedFees.toLocaleString('en-IN')}
                </strong>
              </div>
              <div style={{ padding: '1.25rem', backgroundColor: '#f8fafc', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Total Paid Amount</span>
                <strong style={{ fontSize: '1.5rem', color: '#10b981' }}>
                  ₹{totalPaidFees.toLocaleString('en-IN')}
                </strong>
              </div>
              <div style={{ padding: '1.25rem', backgroundColor: '#f8fafc', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Pending Balance Due</span>
                <strong style={{ fontSize: '1.5rem', color: remainingFeeDue > 0 ? '#ef4444' : '#10b981' }}>
                  ₹{remainingFeeDue.toLocaleString('en-IN')}
                </strong>
              </div>
            </div>

            {/* Fee structure logs */}
            <h4 style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-main)', marginBottom: '1rem' }}>Bill Ledger Items</h4>
            <div style={{ overflowX: 'auto', marginBottom: '2rem' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Academic Year</th>
                    <th>Fee Type</th>
                    <th>Due Date</th>
                    <th>Total Amount</th>
                    <th>Paid Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.map(record => (
                    <tr key={record.id}>
                      <td><strong>{record.academic_year_name}</strong></td>
                      <td>{record.fee_type}</td>
                      <td>{record.due_date || '-'}</td>
                      <td><strong>₹{(record.total_amount || 0).toLocaleString('en-IN')}</strong></td>
                      <td>₹{(record.paid_amount || 0).toLocaleString('en-IN')}</td>
                      <td>
                        <span className={`badge badge-${record.status === 'PAID' ? 'success' : record.status === 'PARTIALLY_PAID' ? 'warning' : 'danger'}`}>
                          {record.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {ledger.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No ledger charges assigned.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Payment history */}
            <h4 style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-main)', marginBottom: '1rem' }}>Payment Transactions</h4>
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Receipt No</th>
                    <th>Date</th>
                    <th>Fee Head</th>
                    <th>Payment Method</th>
                    <th>Amount Collected</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map(payment => (
                    <tr key={payment.id}>
                      <td><strong>{payment.receipt_number || 'N/A'}</strong></td>
                      <td>{payment.payment_date}</td>
                      <td>{payment.fee_type}</td>
                      <td>{payment.payment_method}</td>
                      <td><strong>₹{(payment.amount || 0).toLocaleString('en-IN')}</strong></td>
                      <td><span className="badge badge-success">Completed</span></td>
                    </tr>
                  ))}
                  {payments.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No transaction records found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TIMELINE PANEL (NEW) */}
        {activeTab === 'timeline' && (
          <div>
            <h3 style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--text-main)', marginBottom: '1.5rem' }}>Student Milestones Timeline</h3>
            
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
                    backgroundColor: item.completed ? '#10b981' : '#cbd5e1', 
                    border: '3px solid #ffffff',
                    boxShadow: '0 0 0 1px #e2e8f0',
                    zIndex: 2
                  }} />
                  
                  <h5 style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {item.title}
                    {item.completed ? (
                      <span style={{ fontSize: '0.7rem', color: '#10b981', backgroundColor: '#d1fae5', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>Completed</span>
                    ) : (
                      <span style={{ fontSize: '0.7rem', color: '#64748b', backgroundColor: '#f1f5f9', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>Pending</span>
                    )}
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
            </div>
          </div>
        )}

        {/* HEALTH CARD PANEL (NEW) */}
        {activeTab === 'health' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--text-main)' }}>Student Health Profile</h3>
              {!showHealthEdit && (
                <button className="btn btn-sm btn-outline" onClick={() => setShowHealthEdit(true)}>
                  Edit Health Card
                </button>
              )}
            </div>

            {showHealthEdit ? (
              <form onSubmit={handleHealthSave} style={{ maxWidth: '480px' }}>
                <div className="form-group">
                  <label>Blood Group</label>
                  <select value={healthForm.blood_group} onChange={e => setHealthForm({...healthForm, blood_group: e.target.value})}>
                    <option value="">-- Choose Blood Group --</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Emergency Contact Phone</label>
                  <input type="text" value={healthForm.emergency_contact} onChange={e => setHealthForm({...healthForm, emergency_contact: e.target.value})} placeholder="e.g. +91 98765 43210 (Father)" />
                </div>
                <div className="form-group">
                  <label>Medical Conditions</label>
                  <textarea value={healthForm.medical_conditions} onChange={e => setHealthForm({...healthForm, medical_conditions: e.target.value})} placeholder="e.g. Asthma, none" rows={2} />
                </div>
                <div className="form-group">
                  <label>Allergies</label>
                  <textarea value={healthForm.allergies} onChange={e => setHealthForm({...healthForm, allergies: e.target.value})} placeholder="e.g. Peanuts, Penicillin, none" rows={2} />
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem' }}>
                  <button type="submit" className="btn btn-primary btn-sm" disabled={savingHealth}>
                    {savingHealth ? 'Saving...' : 'Save Health Card'}
                  </button>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowHealthEdit(false)}>
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.5rem' }}>
                <div style={{ padding: '1.25rem', backgroundColor: '#f8fafc', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                  <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.25rem' }}>Blood Group</span>
                  <strong style={{ fontSize: '1.1rem', color: student.blood_group ? '#ef4444' : 'var(--text-muted)' }}>
                    {student.blood_group || 'Not Specified'}
                  </strong>
                </div>
                <div style={{ padding: '1.25rem', backgroundColor: '#f8fafc', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                  <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.25rem' }}>Emergency Contact</span>
                  <strong style={{ fontSize: '1.1rem', color: 'var(--text-main)' }}>
                    {student.emergency_contact || 'None registered'}
                  </strong>
                </div>
                <div style={{ padding: '1.25rem', backgroundColor: '#f8fafc', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', gridColumn: 'span 2' }}>
                  <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.25rem' }}>Medical Conditions</span>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                    {student.medical_conditions || 'No known chronic medical conditions.'}
                  </p>
                </div>
                <div style={{ padding: '1.25rem', backgroundColor: '#f8fafc', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', gridColumn: 'span 2' }}>
                  <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.25rem' }}>Known Allergies</span>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                    {student.allergies || 'No known substance or food allergies reported.'}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* NOTES PANEL (NEW) */}
        {activeTab === 'notes' && (
          <div>
            <h3 style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--text-main)', marginBottom: '1.5rem' }}>Internal Student Notes</h3>
            
            {/* Note creation form */}
            <form onSubmit={handleAddNote} style={{ marginBottom: '2rem' }}>
              <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                <textarea 
                  value={newNote} 
                  onChange={e => setNewNote(e.target.value)} 
                  placeholder="Record parent meetings, disciplinary updates, or exceptional academic behavior notes here..."
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
                <div style={{ textAlign: 'center', padding: '2rem', border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)' }}>
                  <p style={{ color: 'var(--text-muted)', margin: 0 }}>No internal notes recorded for this student.</p>
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
              <div style={{ textAlign: 'center', padding: '3rem', border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)' }}>
                <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>No documents uploaded yet.</p>
                <button className="btn btn-outline btn-sm" onClick={() => setShowUploadModal(true)}>
                  <Upload size={14} /> Upload First Document
                </button>
              </div>
            )}
          </div>
        )}

        {/* GUARDIANS PANEL (REDESIGNED CARD LAYOUT) */}
        {activeTab === 'guardians' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--text-main)' }}>Family and Guardians</h3>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
              {guardians.map(g => (
                <div key={g.id} className="card" style={{ padding: '1.5rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase' }}>Primary Guardian</span>
                    <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>Active</span>
                  </div>
                  <div>
                    <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Name</span>
                    <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>{g.name}</strong>
                  </div>
                  <div>
                    <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Relationship</span>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>{g.relationship}</span>
                  </div>
                  <div>
                    <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Phone</span>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Phone size={12} style={{ color: 'var(--primary)' }} /> {g.phone || '-'}
                    </span>
                  </div>
                  <div>
                    <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Email</span>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.25rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      <Mail size={12} style={{ color: 'var(--primary)' }} /> {g.email || '-'}
                    </span>
                  </div>
                </div>
              ))}
              {guardians.length === 0 && (
                <div style={{ textAlign: 'center', padding: '3rem', border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)', gridColumn: '1 / -1' }}>
                  <p style={{ color: 'var(--text-muted)', margin: 0 }}>No parents/guardians registered.</p>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Real Upload Document Modal */}
      {showUploadModal && (
        <div className="modal" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.45)', zIndex: 1000, padding: '1rem' }}>
          <div className="modal-content" style={{ backgroundColor: '#ffffff', borderRadius: 'var(--radius-lg)', maxWidth: '440px', width: '100%', padding: '2rem', boxShadow: 'var(--shadow-lg)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.25rem', color: 'var(--text-main)' }}>Upload Student Document</h3>
            <form onSubmit={handleDocUploadSubmit}>
              
              <div className="form-group">
                <label>Document Type *</label>
                <select value={newDocType} onChange={e => setNewDocType(e.target.value)}>
                  <option value="Transfer Certificate">Transfer Certificate</option>
                  <option value="Birth Certificate">Birth Certificate</option>
                  <option value="High School Marksheet">High School Marksheet</option>
                  <option value="Identity Proof (Aadhaar/ID)">Identity Proof (Aadhaar/ID)</option>
                  <option value="Medical Record">Medical Record</option>
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

      {/* Transfer Student Modal */}
      {showTransferModal && (
        <div className="modal" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.45)', zIndex: 1000, padding: '1rem' }}>
          <div className="modal-content" style={{ backgroundColor: '#ffffff', borderRadius: 'var(--radius-lg)', maxWidth: '480px', width: '100%', padding: '2rem', boxShadow: 'var(--shadow-lg)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.25rem', color: 'var(--text-main)' }}>Transfer Student</h3>
            <form onSubmit={handleTransferSubmit}>
              
              <div className="form-group">
                <label>Academic Year *</label>
                <select 
                  value={transferForm.academic_year_id} 
                  onChange={e => handleTransferFieldChange('academic_year_id', e.target.value)}
                  required
                >
                  <option value="">-- Select Academic Year --</option>
                  {academicYears.map(ay => (
                    <option key={ay.id} value={ay.id}>{ay.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label>{getProgramLabel()} *</label>
                <select 
                  value={transferForm.course_id} 
                  onChange={e => handleTransferFieldChange('course_id', e.target.value)}
                  required
                >
                  <option value="">-- Select {getProgramLabel()} --</option>
                  {programs.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label>Section *</label>
                <select 
                  value={transferForm.section_id} 
                  onChange={e => setTransferForm({ ...transferForm, section_id: e.target.value })}
                  required
                >
                  <option value="">-- Select Section --</option>
                  {sections
                    .filter(s => s.academic_year_id === transferForm.academic_year_id && s.course_id === transferForm.course_id)
                    .map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                </select>
                {sections.filter(s => s.academic_year_id === transferForm.academic_year_id && s.course_id === transferForm.course_id).length === 0 && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: '0.25rem', display: 'block' }}>
                    ⚠️ No sections available for this configuration. Please set up sections first.
                  </span>
                )}
              </div>

              {institutionType !== 'school' && (
                <div className="form-group" style={{ marginTop: '1rem' }}>
                  <label>Semester *</label>
                  <input 
                    type="number" 
                    min={1} 
                    max={8} 
                    value={transferForm.semester} 
                    onChange={e => setTransferForm({ ...transferForm, semester: parseInt(e.target.value) || 1 })}
                    required
                  />
                </div>
              )}

              <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '2rem' }}>
                <button type="button" onClick={() => setShowTransferModal(false)} className="btn btn-secondary">Cancel</button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={!transferForm.academic_year_id || !transferForm.course_id || !transferForm.section_id}
                >
                  Transfer Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Promote Student Modal */}
      {showPromoteModal && (
        <div className="modal" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.45)', zIndex: 1000, padding: '1rem' }}>
          <div className="modal-content" style={{ backgroundColor: '#ffffff', borderRadius: 'var(--radius-lg)', maxWidth: '480px', width: '100%', padding: '2rem', boxShadow: 'var(--shadow-lg)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.25rem', color: 'var(--text-main)' }}>Promote Student</h3>
            <form onSubmit={handlePromoteSubmit}>
              
              <div className="form-group">
                <label>Target Academic Year *</label>
                <select 
                  value={promoteForm.academic_year_id} 
                  onChange={e => handlePromoteFieldChange('academic_year_id', e.target.value)}
                  required
                >
                  <option value="">-- Select Target Year --</option>
                  {academicYears.map(ay => (
                    <option key={ay.id} value={ay.id}>{ay.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label>Target {getProgramLabel()} *</label>
                <select 
                  value={promoteForm.course_id} 
                  onChange={e => handlePromoteFieldChange('course_id', e.target.value)}
                  required
                >
                  <option value="">-- Select Target {getProgramLabel()} --</option>
                  {programs.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label>Target Section *</label>
                <select 
                  value={promoteForm.section_id} 
                  onChange={e => setPromoteForm({ ...promoteForm, section_id: e.target.value })}
                  required
                >
                  <option value="">-- Select Target Section --</option>
                  {sections
                    .filter(s => s.academic_year_id === promoteForm.academic_year_id && s.course_id === promoteForm.course_id)
                    .map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                </select>
                {sections.filter(s => s.academic_year_id === promoteForm.academic_year_id && s.course_id === promoteForm.course_id).length === 0 && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: '0.25rem', display: 'block' }}>
                    ⚠️ No sections available for this configuration. Please set up sections first.
                  </span>
                )}
              </div>

              {institutionType !== 'school' && (
                <div className="form-group" style={{ marginTop: '1rem' }}>
                  <label>Target Semester *</label>
                  <input 
                    type="number" 
                    min={1} 
                    max={8} 
                    value={promoteForm.semester} 
                    onChange={e => setPromoteForm({ ...promoteForm, semester: parseInt(e.target.value) || 1 })}
                    required
                  />
                </div>
              )}

              <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '2rem' }}>
                <button type="button" onClick={() => setShowPromoteModal(false)} className="btn btn-secondary">Cancel</button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={!promoteForm.academic_year_id || !promoteForm.course_id || !promoteForm.section_id}
                >
                  Promote Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Section Modal */}
      {showChangeSectionModal && enrollments.length > 0 && (
        <div className="modal" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.45)', zIndex: 1000, padding: '1rem' }}>
          <div className="modal-content" style={{ backgroundColor: '#ffffff', borderRadius: 'var(--radius-lg)', maxWidth: '440px', width: '100%', padding: '2rem', boxShadow: 'var(--shadow-lg)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.25rem', color: 'var(--text-main)' }}>Change Section</h3>
            <form onSubmit={handleChangeSectionSubmit}>
              
              <div style={{ marginBottom: '1.25rem', padding: '0.75rem 1rem', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', fontSize: '0.875rem' }}>
                <div style={{ color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Current {getProgramLabel()}</div>
                <strong style={{ color: 'var(--text-main)' }}>
                  {programs.find(p => p.id === enrollments[0].course_id)?.name || 'Unknown'}
                </strong>
              </div>

              <div className="form-group">
                <label>New Section *</label>
                <select 
                  value={changeSectionForm.section_id} 
                  onChange={e => setChangeSectionForm({ section_id: e.target.value })}
                  required
                >
                  <option value="">-- Select Section --</option>
                  {sections
                    .filter(s => s.academic_year_id === enrollments[0].academic_year_id && s.course_id === enrollments[0].course_id)
                    .map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                </select>
                {sections.filter(s => s.academic_year_id === enrollments[0].academic_year_id && s.course_id === enrollments[0].course_id).length === 0 && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: '0.25rem', display: 'block' }}>
                    ⚠️ No other sections available for this class.
                  </span>
                )}
              </div>

              <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '2rem' }}>
                <button type="button" onClick={() => setShowChangeSectionModal(false)} className="btn btn-secondary">Cancel</button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={!changeSectionForm.section_id || changeSectionForm.section_id === enrollments[0].section_id}
                >
                  Change Section
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </Layout>
  );
}
