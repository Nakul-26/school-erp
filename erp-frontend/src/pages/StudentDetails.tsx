import './StudentDetails.css';
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

  // Transport allocation state
  const [transportRoutes, setTransportRoutes] = useState<any[]>([]);
  const [allocation, setAllocation] = useState<any>(null);
  const [transportForm, setTransportForm] = useState({ route_id: '', pickup_point: '' });
  const [submittingTransport, setSubmittingTransport] = useState(false);
  const [showTransportModal, setShowTransportModal] = useState(false);

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
        attendanceData, ledgerData, paymentsData, documentsData, notesData,
        routesData, allocationsData
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
        api.get(`/students/${id}/notes`).catch(() => []),
        api.get('/transport/routes').catch(() => []),
        api.get('/transport/allocations').catch(() => [])
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
      setTransportRoutes(routesData || []);

      const stuAllocation = (allocationsData || []).find((a: any) => a.student_id === id);
      setAllocation(stuAllocation || null);
      if (stuAllocation) {
        setTransportForm({
          route_id: stuAllocation.route_id || '',
          pickup_point: stuAllocation.pickup_point || ''
        });
      } else {
        setTransportForm({ route_id: '', pickup_point: '' });
      }

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

  const handleTransportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transportForm.route_id) return;
    try {
      setSubmittingTransport(true);
      await api.post('/transport/allocations', {
        student_id: id,
        route_id: transportForm.route_id,
        pickup_point: transportForm.pickup_point
      });
      
      const allocationsData = await api.get('/transport/allocations').catch(() => []);
      const stuAllocation = (allocationsData || []).find((a: any) => a.student_id === id);
      setAllocation(stuAllocation || null);
      setShowTransportModal(false);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Error saving transport route assignment');
    } finally {
      setSubmittingTransport(false);
    }
  };

  const handleRemoveTransport = async () => {
    if (!confirm('Are you sure you want to remove this student from the transport route?')) return;
    try {
      setSubmittingTransport(true);
      await api.delete(`/transport/allocations/${id}`);
      setAllocation(null);
      setTransportForm({ route_id: '', pickup_point: '' });
      setShowTransportModal(false);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Error removing transport route assignment');
    } finally {
      setSubmittingTransport(false);
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
      /><p className="student-details-text-1">Loading student profile...</p></Layout>;
  if (!student) return <Layout><p className="student-details-text-2">Student profile not found.</p></Layout>;

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
      <div className="student-details-div-3">
        <Link to="/students" className="student-details-row-4">
          <ArrowLeft size={16} /> Back to Student Hub
        </Link>
      </div>

      {/* Redesigned Student Profile Header Banner (Premium Sidebar Columns Format) */}
      <div className="card student-profile-card">
        {/* Left Column: Big Avatar */}
        <div className="student-details-col-6">
          <div className="student-details-row-7" style={{ padding: 0, overflow: 'hidden' }}>
            {student.photo ? (
              <img 
                src={student.photo.startsWith('data:image') || student.photo.startsWith('/api') || student.photo.startsWith('http')
                  ? student.photo 
                  : `/api/students/photo/${student.id}`} 
                alt="Student Photo" 
                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} 
              />
            ) : (
              '👤'
            )}
          </div>
          <span className={`badge badge-${student.status === 'ACTIVE' ? 'success' : student.status === 'GRADUATED' ? 'success' : 'secondary'} student-details-span-8`}>
            {student.status}
          </span>
        </div>

        {/* Right Column: Dynamic Profile Metadata Grid */}
        <div className="student-details-div-9">
          <h2 className="student-details-title-10">
            {student.first_name} {student.middle_name ? student.middle_name + ' ' : ''}{student.last_name}
          </h2>
          
          <div className="student-details-grid-11">
            <div>
              <span className="student-details-span-12">Admission No</span>
              <strong className="student-details-strong-13">{student.admission_number}</strong>
            </div>
            <div>
              <span className="student-details-span-14">Roll No</span>
              <strong className="student-details-strong-15">{student.roll_number || 'N/A'}</strong>
            </div>
            <div>
              <span className="student-details-span-16">{getProgramLabel()}</span>
              <strong className="student-details-strong-17">{student.program_name || 'Unassigned'}</strong>
            </div>
            <div>
              <span className="student-details-span-18">Section</span>
              <strong className="student-details-strong-19">{student.section_name || 'Unassigned'}</strong>
            </div>
            <div>
              <span className="student-details-span-20">Academic Year</span>
              <strong className="student-details-strong-21">{student.academic_year_name || 'N/A'}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Redesigned Profile Tabs Header */}
      <div className="tabs student-details-tabs">
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
      <div className="card student-tab-content-card">
        
        {/* OVERVIEW PANEL */}
        {activeTab === 'overview' && (
          <div>
            <h3 className="student-details-title-24">Personal Information</h3>
            <div className="student-details-grid-25">
              <div>
                <label className="student-details-label-26">First Name</label>
                <span className="student-details-span-27">{student.first_name}</span>
              </div>
              {student.middle_name && (
                <div>
                  <label className="student-details-label-28">Middle Name</label>
                  <span className="student-details-span-29">{student.middle_name}</span>
                </div>
              )}
              <div>
                <label className="student-details-label-30">Last Name</label>
                <span className="student-details-span-31">{student.last_name}</span>
              </div>
              <div>
                <label className="student-details-label-32">Admission No</label>
                <span className="student-details-span-33">{student.admission_number}</span>
              </div>
              <div>
                <label className="student-details-label-34">Roll No</label>
                <span className="student-details-span-35">{student.roll_number || '-'}</span>
              </div>
              <div>
                <label className="student-details-label-36">Email Address</label>
                <span className="student-details-span-37">{student.email || '-'}</span>
              </div>
              <div>
                <label className="student-details-label-38">Phone Number</label>
                <span className="student-details-span-39">{student.phone || '-'}</span>
              </div>
              <div>
                <label className="student-details-label-40">Gender</label>
                <span className="student-details-span-41">{student.gender || '-'}</span>
              </div>
              <div>
                <label className="student-details-label-42">Date of Birth</label>
                <span className="student-details-span-43">{student.date_of_birth || '-'}</span>
              </div>
              <div>
                <label className="student-details-label-44">Admission Date</label>
                <span className="student-details-span-45">{student.admission_date || '-'}</span>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label className="student-details-label-44">Address</label>
                <span className="student-details-span-45" style={{ fontWeight: '500' }}>{student.address || '-'}</span>
              </div>
            </div>
          </div>
        )}

        {/* ACADEMIC HISTORY PANEL */}
        {activeTab === 'academic' && (
          <div>
            <div className="student-details-row-46">
              <h3 className="student-details-title-47">Academic Enrollment Hub</h3>
            </div>

            {/* Current Enrollment Status Card */}
            {enrollments.length > 0 ? (
              <div className="student-details-grid-48">
                <div>
                  <h4 className="student-details-row-49">
                    <GraduationCap size={18} className="student-details-GraduationCap-50"  /> Current Enrollment Status
                  </h4>
                  <div className="student-details-grid-51">
                    <div>
                      <span className="student-details-span-52">Academic Year</span>
                      <strong className="student-details-strong-53">
                        {academicYears.find(y => y.id === enrollments[0].academic_year_id)?.name || 'N/A'}
                      </strong>
                    </div>
                    <div>
                      <span className="student-details-span-54">{getProgramLabel()}</span>
                      <strong className="student-details-strong-55">
                        {programs.find(p => p.id === enrollments[0].course_id)?.name || 'N/A'}
                      </strong>
                    </div>
                    <div>
                      <span className="student-details-span-56">Section</span>
                      <strong className="student-details-strong-57">
                        {sections.find(s => s.id === enrollments[0].section_id)?.name || 'N/A'}
                      </strong>
                    </div>
                    {institutionType !== 'school' && (
                      <div>
                        <span className="student-details-span-58">Semester</span>
                        <strong className="student-details-strong-59">
                          Semester {enrollments[0].semester || 1}
                        </strong>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Actions group */}
                <div className="student-details-col-60">
                  <button className="btn btn-primary btn-sm student-details-btn" onClick={() => { const currentEnroll = enrollments[0]; setTransferForm({ academic_year_id: currentEnroll.academic_year_id || '', course_id: currentEnroll.course_id || '', section_id: currentEnroll.section_id || '', semester: currentEnroll.semester || 1 }); setShowTransferModal(true); }}>
                    Transfer Student
                  </button>
                  <button className="btn btn-outline btn-sm student-details-btn" onClick={() => { const currentEnroll = enrollments[0]; setPromoteForm({ academic_year_id: currentEnroll.academic_year_id || '', course_id: currentEnroll.course_id || '', section_id: currentEnroll.section_id || '', semester: (currentEnroll.semester || 1) + 1 }); setShowPromoteModal(true); }}>
                    Promote Student
                  </button>
                  <button className="btn btn-secondary btn-sm student-details-btn" onClick={() => { const currentEnroll = enrollments[0]; setChangeSectionForm({ section_id: currentEnroll.section_id || '' }); setShowChangeSectionModal(true); }}>
                    Change Section
                  </button>
                </div>
              </div>
            ) : (
              <div className="student-details-div-64">
                <p className="student-details-text-65">This student is not enrolled in any academic year/class.</p>
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
              <h4 className="student-details-title-66">
                Enrollment Logs & History
              </h4>
              <div className="student-details-div-67">
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
                        <td colSpan={5} className="student-details-td-68">
                          No enrollment history has been recorded for this student.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Transport Route Section */}
            <div className="student-details-div-69">
              <div className="student-details-row-70">
                <div>
                  <h4 className="student-details-title-71">
                    🚌 Transport Route Assignment
                  </h4>
                  <p className="student-details-text-72">
                    Manage bus routing and pick-up/drop-off settings for this student profile.
                  </p>
                </div>
                <button 
                  className="btn btn-outline btn-sm"
                  onClick={() => setShowTransportModal(true)}
                >
                  {allocation ? 'Change Bus Route' : 'Assign Bus Route'}
                </button>
              </div>

              {allocation ? (
                <div className="student-details-grid-73">
                  <div>
                    <span className="student-details-span-74">Assigned Route</span>
                    <strong className="student-details-strong-75">{allocation.route_name || 'Route Details'}</strong>
                  </div>
                  <div>
                    <span className="student-details-span-76">Vehicle Number</span>
                    <strong className="student-details-strong-77">{allocation.vehicle_number || 'N/A'}</strong>
                  </div>
                  <div>
                    <span className="student-details-span-78">Pickup / Drop point</span>
                    <strong className="student-details-strong-79">{allocation.pickup_point || 'Not specified'}</strong>
                  </div>
                  <div>
                    <span className="student-details-span-80">Monthly Fare</span>
                    <strong className="student-details-strong-81">₹{allocation.monthly_charge || 0}</strong>
                  </div>
                </div>
              ) : (
                <div className="student-details-div-82">
                  This student is not currently assigned to any transport route.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ATTENDANCE PANEL */}
        {activeTab === 'attendance' && (
          <div>
            <h3 className="student-details-title-83">Attendance Performance</h3>
            
            {attendanceInfo && attendanceInfo.total > 0 ? (
              <div>
                {/* KPI Summary Block */}
                <div className="student-details-grid-84">
                  <div className="student-details-div-85">
                    <span className="student-details-span-86">Attendance Rate</span>
                    <strong style={{ fontSize: '1.75rem', color: attendanceInfo.percentage >= 75 ? '#10b981' : '#f59e0b' }}>
                      {attendanceInfo.percentage}%
                    </strong>
                  </div>
                  <div className="student-details-div-87">
                    <span className="student-details-span-88">Classes Attended</span>
                    <strong className="student-details-strong-89">
                      {attendanceInfo.present}
                    </strong>
                  </div>
                  <div className="student-details-div-90">
                    <span className="student-details-span-91">Total Sessions</span>
                    <strong className="student-details-strong-92">
                      {attendanceInfo.total}
                    </strong>
                  </div>
                </div>

                {/* Detailed Logs Table */}
                <h4 className="student-details-title-93">Detailed Session Records</h4>
                <div className="student-details-div-94">
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
                <div className="student-details-grid-95">
                  <div className="student-details-div-96">
                    <span className="student-details-span-97">Attendance Rate</span>
                    <strong className="student-details-strong-98">--</strong>
                  </div>
                  <div className="student-details-div-99">
                    <span className="student-details-span-100">Classes Attended</span>
                    <strong className="student-details-strong-101">0</strong>
                  </div>
                  <div className="student-details-div-102">
                    <span className="student-details-span-103">Total Sessions</span>
                    <strong className="student-details-strong-104">0</strong>
                  </div>
                </div>
                <div className="student-details-div-105">
                  <p className="student-details-text-106">No attendance data available yet.</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* RESULTS PANEL */}
        {activeTab === 'results' && (
          <div>
            <h3 className="student-details-title-107">Exam Performance</h3>
            {studentExams.length === 0 ? (
              <p className="student-details-text-108">No examinations recorded for this student.</p>
            ) : (
              <div>
                <div className="form-group student-details-form-group">
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
                    <div className="student-details-grid-110">
                      <div>
                        <span className="student-details-span-111">Total Marks Obtained</span>
                        <strong className="student-details-strong-112">{detailedResult.total_obtained} / {detailedResult.total_max}</strong>
                      </div>
                      <div>
                        <span className="student-details-span-113">Aggregated Percentage</span>
                        <strong className="student-details-strong-114">{detailedResult.percentage}%</strong>
                      </div>
                      <div>
                        <span className="student-details-span-115">Grade</span>
                        <strong className="student-details-strong-116">{detailedResult.grade}</strong>
                      </div>
                      <div>
                        <span className="student-details-span-117">Result Status</span>
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
                  <p className="student-details-text-118">No evaluation records entered for this student in the selected exam.</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* FEES PANEL */}
        {activeTab === 'fees' && (
          <div>
            <h3 className="student-details-title-119">Financial Fee Ledger</h3>
            
            {/* KPI Summary Block */}
            <div className="student-details-grid-120">
              <div className="student-details-div-121">
                <span className="student-details-span-122">Assigned Charges</span>
                <strong className="student-details-strong-123">
                  ₹{totalAssignedFees.toLocaleString('en-IN')}
                </strong>
              </div>
              <div className="student-details-div-124">
                <span className="student-details-span-125">Total Paid Amount</span>
                <strong className="student-details-strong-126">
                  ₹{totalPaidFees.toLocaleString('en-IN')}
                </strong>
              </div>
              <div className="student-details-div-127">
                <span className="student-details-span-128">Pending Balance Due</span>
                <strong style={{ fontSize: '1.5rem', color: remainingFeeDue > 0 ? '#ef4444' : '#10b981' }}>
                  ₹{remainingFeeDue.toLocaleString('en-IN')}
                </strong>
              </div>
            </div>

            {/* Fee structure logs */}
            <h4 className="student-details-title-129">Bill Ledger Items</h4>
            <div className="student-details-div-130">
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
                      <td colSpan={6} className="student-details-td-131">No ledger charges assigned.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Payment history */}
            <h4 className="student-details-title-132">Payment Transactions</h4>
            <div className="student-details-div-133">
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
                      <td colSpan={6} className="student-details-td-134">No transaction records found.</td>
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
            <h3 className="student-details-title-135">Student Milestones Timeline</h3>
            
            <div className="student-details-col-136">
              {/* Vertical line indicator */}
              <div className="student-details-div-137"  />
              
              {timelineItems.map((item, index) => (
                <div key={index} className="student-details-col-138">
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
                  
                  <h5 className="student-details-row-139">
                    {item.title}
                    {item.completed ? (
                      <span className="student-details-span-140">Completed</span>
                    ) : (
                      <span className="student-details-span-141">Pending</span>
                    )}
                  </h5>
                  <p className="student-details-text-142">
                    {item.description}
                  </p>
                  {item.date && (
                    <span className="student-details-span-143">
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
            <div className="student-details-row-144">
              <h3 className="student-details-title-145">Student Health Profile</h3>
              {!showHealthEdit && (
                <button className="btn btn-sm btn-outline" onClick={() => setShowHealthEdit(true)}>
                  Edit Health Card
                </button>
              )}
            </div>

            {showHealthEdit ? (
              <form onSubmit={handleHealthSave} className="student-details-form-146">
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

                <div className="student-details-row-147">
                  <button type="submit" className="btn btn-primary btn-sm" disabled={savingHealth}>
                    {savingHealth ? 'Saving...' : 'Save Health Card'}
                  </button>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowHealthEdit(false)}>
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="student-details-grid-148">
                <div className="student-details-div-149">
                  <span className="student-details-span-150">Blood Group</span>
                  <strong style={{ fontSize: '1.1rem', color: student.blood_group ? '#ef4444' : 'var(--text-muted)' }}>
                    {student.blood_group || 'Not Specified'}
                  </strong>
                </div>
                <div className="student-details-div-151">
                  <span className="student-details-span-152">Emergency Contact</span>
                  <strong className="student-details-strong-153">
                    {student.emergency_contact || 'None registered'}
                  </strong>
                </div>
                <div className="student-details-div-154">
                  <span className="student-details-span-155">Medical Conditions</span>
                  <p className="student-details-text-156">
                    {student.medical_conditions || 'No known chronic medical conditions.'}
                  </p>
                </div>
                <div className="student-details-div-157">
                  <span className="student-details-span-158">Known Allergies</span>
                  <p className="student-details-text-159">
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
            <h3 className="student-details-title-160">Internal Student Notes</h3>
            
            {/* Note creation form */}
            <form onSubmit={handleAddNote} className="student-details-form-161">
              <div className="form-group student-details-form-group">
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
            <div className="student-details-col-163">
              {notes.map(note => (
                <div key={note.id} className="student-details-col-164">
                  <p className="student-details-text-165">
                    {note.content}
                  </p>
                  <div className="student-details-row-166">
                    <span>Author: <strong>{note.author_name}</strong></span>
                    <span>Posted: {note.created_at?.split('.')[0] || note.created_at}</span>
                  </div>
                  <button onClick={() => handleDeleteNote(note.id)} className="student-details-btn-167" onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'} onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              {notes.length === 0 && (
                <div className="student-details-div-168">
                  <p className="student-details-text-169">No internal notes recorded for this student.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* DOCUMENTS VAULT PANEL */}
        {activeTab === 'documents' && (
          <div>
            <div className="student-details-row-170">
              <h3 className="student-details-title-171">Digital Documents Vault</h3>
              <button className="btn btn-sm btn-primary" onClick={() => setShowUploadModal(true)}>
                <Upload size={14} /> Upload Document
              </button>
            </div>

            {documents.length > 0 ? (
              <div className="student-details-grid-172">
                {documents.map(doc => (
                  <div key={doc.id} className="student-details-row-173">
                    <div className="student-details-row-174" onClick={() => handleDownloadDoc(doc)}>
                      DOC
                    </div>
                    <div className="student-details-div-175" onClick={() => handleDownloadDoc(doc)}>
                      <h5 className="student-details-title-176" title={doc.name}>
                        {doc.name}
                      </h5>
                      <p className="student-details-text-177">
                        {doc.document_type} • {(doc.file_size / 1024).toFixed(1)} KB
                      </p>
                      <p className="student-details-text-178">
                        Uploaded: {doc.uploaded_at?.split(' ')[0]}
                      </p>
                    </div>
                    <button onClick={() => handleDocDelete(doc.id)} className="student-details-btn-179" onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'} onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="student-details-div-180">
                <p className="student-details-text-181">No documents uploaded yet.</p>
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
            <div className="student-details-row-182">
              <h3 className="student-details-title-183">Family and Guardians</h3>
            </div>
            
            <div className="student-details-grid-184">
              {guardians.map(g => (
                <div key={g.id} className="card student-guardian-card">
                  <div className="student-details-row-186">
                    <span className="student-details-span-187">Primary Guardian</span>
                    <span className="badge badge-success student-details-badge">Active</span>
                  </div>
                  <div>
                    <span className="student-details-span-189">Name</span>
                    <strong className="student-details-strong-190">{g.name}</strong>
                  </div>
                  <div>
                    <span className="student-details-span-191">Relationship</span>
                    <span className="student-details-span-192">{g.relationship}</span>
                  </div>
                  <div>
                    <span className="student-details-span-193">Phone</span>
                    <span className="student-details-row-194">
                      <Phone size={12} className="student-details-Phone-195"  /> {g.phone || '-'}
                    </span>
                  </div>
                  <div>
                    <span className="student-details-span-196">Email</span>
                    <span className="student-details-row-197">
                      <Mail size={12} className="student-details-Mail-198"  /> {g.email || '-'}
                    </span>
                  </div>
                </div>
              ))}
              {guardians.length === 0 && (
                <div className="student-details-div-199">
                  <p className="student-details-text-200">No parents/guardians registered.</p>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Real Upload Document Modal */}
      {showUploadModal && (
        <div className="modal student-details-modal">
          <div className="modal-content student-details-modal-content">
            <h3 className="student-details-title-203">Upload Student Document</h3>
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

              <div className="form-group student-details-form-group">
                <label>Choose File *</label>
                <input required type="file" onChange={e => { const files = e.target.files; if (files && files[0]) { setSelectedFile(files[0]); } else { setSelectedFile(null); } }} className="student-details-input-205"  />
              </div>

              <div className="modal-actions student-details-modal-actions">
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
        <div className="modal student-details-modal">
          <div className="modal-content student-details-modal-content">
            <h3 className="student-details-title-209">Transfer Student</h3>
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

              <div className="form-group student-details-form-group">
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

              <div className="form-group student-details-form-group">
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
                  <span className="student-details-span-212">
                    ⚠️ No sections available for this configuration. Please set up sections first.
                  </span>
                )}
              </div>

              {institutionType !== 'school' && (
                <div className="form-group student-details-form-group">
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

              <div className="modal-actions student-details-modal-actions">
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
        <div className="modal student-details-modal">
          <div className="modal-content student-details-modal-content">
            <h3 className="student-details-title-217">Promote Student</h3>
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

              <div className="form-group student-details-form-group">
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

              <div className="form-group student-details-form-group">
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
                  <span className="student-details-span-220">
                    ⚠️ No sections available for this configuration. Please set up sections first.
                  </span>
                )}
              </div>

              {institutionType !== 'school' && (
                <div className="form-group student-details-form-group">
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

              <div className="modal-actions student-details-modal-actions">
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
        <div className="modal student-details-modal">
          <div className="modal-content student-details-modal-content">
            <h3 className="student-details-title-225">Change Section</h3>
            <form onSubmit={handleChangeSectionSubmit}>
              
              <div className="student-details-div-226">
                <div className="student-details-div-227">Current {getProgramLabel()}</div>
                <strong className="student-details-strong-228">
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
                  <span className="student-details-span-229">
                    ⚠️ No other sections available for this class.
                  </span>
                )}
              </div>

              <div className="modal-actions student-details-modal-actions">
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

      {/* Assign Transport Route Modal */}
      {showTransportModal && (
        <div className="modal student-details-modal">
          <div className="modal-content student-details-modal-content">
            <h3 className="student-details-title-233">
              {allocation ? 'Change Transport Route' : 'Assign Transport Route'}
            </h3>
            <form onSubmit={handleTransportSubmit}>
              
              <div className="form-group">
                <label>Select Transport Route *</label>
                <select 
                  value={transportForm.route_id} 
                  onChange={e => setTransportForm({ ...transportForm, route_id: e.target.value })}
                  required
                >
                  <option value="">-- Choose Route --</option>
                  {transportRoutes.map(route => (
                    <option key={route.id} value={route.id}>
                      {route.route_name} (₹{route.monthly_charge}/mo, {route.vehicle_number})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group student-details-form-group">
                <label>Pickup / Drop Point Name (Optional)</label>
                <input 
                  type="text" 
                  value={transportForm.pickup_point} 
                  onChange={e => setTransportForm({ ...transportForm, pickup_point: e.target.value })}
                  placeholder="e.g. Main Gate, Sector 15 Cross"
                />
              </div>

              <div className="modal-actions student-details-modal-actions">
                {allocation ? (
                  <button type="button" onClick={handleRemoveTransport} className="btn btn-danger student-details-btn" disabled={submittingTransport}>
                    Remove Route
                  </button>
                ) : <div />}
                
                <div className="student-details-row-237">
                  <button 
                    type="button" 
                    onClick={() => setShowTransportModal(false)} 
                    className="btn btn-secondary"
                    disabled={submittingTransport}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={submittingTransport}
                  >
                    {submittingTransport ? 'Saving...' : 'Save Assignment'}
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
