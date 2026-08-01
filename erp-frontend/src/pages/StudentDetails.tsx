import './StudentDetails.css';
import React, { useEffect, useState } from 'react';
import { PageGuidance } from '../components/PageGuidance';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { getAuthenticatedUrl } from '../services/api';
import {
  Calendar, GraduationCap, FileText, User,
  TrendingUp, IndianRupee, Clock, ArrowLeft, Heart, MessageSquare
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useConfirm } from '../contexts/ConfirmDialogContext';
import { hasAnyPermission, hasAnyRole } from '../utils/accessControl';

import { studentDetailsService } from './studentDetails/studentDetailsService';
import { OverviewTab } from './studentDetails/components/OverviewTab';
import { AcademicTab } from './studentDetails/components/AcademicTab';
import { AttendanceTab } from './studentDetails/components/AttendanceTab';
import { ResultsTab } from './studentDetails/components/ResultsTab';
import { FeesTab } from './studentDetails/components/FeesTab';
import { TimelineTab } from './studentDetails/components/TimelineTab';
import { HealthTab } from './studentDetails/components/HealthTab';
import { NotesTab } from './studentDetails/components/NotesTab';
import { DocumentsTab } from './studentDetails/components/DocumentsTab';
import { GuardiansTab } from './studentDetails/components/GuardiansTab';
import { UploadDocumentModal } from './studentDetails/components/UploadDocumentModal';
import { TransferStudentModal } from './studentDetails/components/TransferStudentModal';
import { PromoteStudentModal } from './studentDetails/components/PromoteStudentModal';
import { ChangeSectionModal } from './studentDetails/components/ChangeSectionModal';
import { TransportModal } from './studentDetails/components/TransportModal';

export default function StudentDetails() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';
  const confirm = useConfirm();

  const [student, setStudent] = useState<any>(null);
  const [guardians, setGuardians] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);

  // Institution & Terminology States
  const { user } = useAuth();
  const userPermissions = user?.permissions || [];
  const userRoles = user?.roles || (user?.role ? [user.role] : []);
  const canEditStudent = hasAnyPermission(userPermissions, ['student.edit']) || hasAnyRole(userRoles, ['admin', 'super_admin', 'Principal', 'HOD']);
  const canViewFees = hasAnyPermission(userPermissions, ['fees.view', 'fee.view', 'finance.access']) || hasAnyRole(userRoles, ['admin', 'super_admin', 'Principal', 'HOD', 'Accountant']);
  const canManageDocs = canEditStudent;
  const canWriteNotes = canEditStudent;
  const [institutionType, setInstitutionType] = useState<string>('college');

  const getProgramLabel = () => institutionType === 'school' ? 'Class' : 'Program';

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
    medical_notes: ''
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
    if (
      (activeTab === 'fees' && !canViewFees) ||
      (activeTab === 'notes' && !canWriteNotes) ||
      (activeTab === 'documents' && !canManageDocs)
    ) {
      setActiveTab('overview');
    }
  }, [activeTab, canViewFees, canWriteNotes, canManageDocs]);

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
      const data = await studentDetailsService.getStudentExamResults(id!);
      setStudentExams(data);
      const firstExam = data[0];
      if (firstExam) {
        setSelectedExamId(firstExam.id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDetailedResult = async () => {
    try {
      setLoadingResult(true);
      const data = await studentDetailsService.getDetailedResult(id!, selectedExamId);
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
  }, [id, canViewFees, canManageDocs, canWriteNotes]);

  const fetchData = async () => {
    try {
      const [
        studentData, guardiansData, enrollmentsData, yearsData, programsData, sectionsData,
        attendanceData, ledgerData, paymentsData, documentsData, notesData,
        routesData, allocationsData
      ] = await Promise.all([
        studentDetailsService.getStudent(id!),
        studentDetailsService.getGuardians(id!),
        studentDetailsService.getEnrollments(id!),
        studentDetailsService.getAcademicYears(),
        studentDetailsService.getPrograms(),
        studentDetailsService.getSections(),
        studentDetailsService.getAttendance(id!),
        canViewFees ? studentDetailsService.getLedger(id!) : Promise.resolve([]),
        canViewFees ? studentDetailsService.getPayments(id!) : Promise.resolve([]),
        canManageDocs ? studentDetailsService.getDocuments(id!) : Promise.resolve([]),
        canWriteNotes ? studentDetailsService.getNotes(id!) : Promise.resolve([]),
        studentDetailsService.getTransportRoutes(),
        studentDetailsService.getTransportAllocations()
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
        medical_notes: studentData.medical_notes || ''
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
        const inst = await studentDetailsService.getInstitution(user.institution_id);
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
    if (!canWriteNotes) {
      alert('You do not have permission to add student notes.');
      return;
    }
    if (!newNote.trim()) return;
    try {
      setAddingNote(true);
      await studentDetailsService.addNote(id!, newNote);
      setNewNote('');
      const updatedNotes = await studentDetailsService.getNotes(id!);
      setNotes(updatedNotes || []);
    } catch (err) {
      console.error(err);
      alert('Failed to add note');
    } finally {
      setAddingNote(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!canWriteNotes) {
      alert('You do not have permission to delete student notes.');
      return;
    }
    if (!await confirm('Are you sure you want to delete this note?')) return;
    try {
      await studentDetailsService.deleteNote(id!, noteId);
      setNotes(notes.filter(n => n.id !== noteId));
    } catch (err) {
      console.error(err);
      alert('Failed to delete note');
    }
  };

  const handleTransportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditStudent) {
      alert('You do not have permission to manage student transport assignments.');
      return;
    }
    if (!transportForm.route_id) return;
    try {
      setSubmittingTransport(true);
      await studentDetailsService.createTransportAllocation({
        student_id: id,
        route_id: transportForm.route_id,
        pickup_point: transportForm.pickup_point
      });

      const allocationsData = await studentDetailsService.getTransportAllocations();
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
    if (!canEditStudent) {
      alert('You do not have permission to manage student transport assignments.');
      return;
    }
    if (!await confirm('Are you sure you want to remove this student from the transport route?')) return;
    try {
      setSubmittingTransport(true);
      await studentDetailsService.deleteTransportAllocation(id!);
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
    if (!canManageDocs) {
      alert('You do not have permission to upload student documents.');
      return;
    }
    if (!selectedFile) {
      alert('Please select a file to upload');
      return;
    }

    try {
      setUploadingDoc(true);
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('document_type', newDocType);

      await studentDetailsService.uploadDocument(id!, formData);

      // Refresh documents
      const docs = await studentDetailsService.getDocuments(id!);
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
      const response = await studentDetailsService.downloadDocument(id!, doc.id);
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
    if (!canManageDocs) {
      alert('You do not have permission to delete student documents.');
      return;
    }
    if (!await confirm('Are you sure you want to delete this document?')) return;
    try {
      await studentDetailsService.deleteDocument(id!, docId);
      setDocuments(documents.filter(d => d.id !== docId));
    } catch (err) {
      console.error(err);
      alert('Failed to delete document');
    }
  };

  // Health Card actions
  const handleHealthSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditStudent) {
      alert('You do not have permission to edit student health details.');
      return;
    }
    try {
      setSavingHealth(true);
      await studentDetailsService.updateStudent(id!, healthForm);
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
    if (!canEditStudent) {
      alert('You do not have permission to update student enrollment.');
      return;
    }
    try {
      setLoading(true);
      await studentDetailsService.updateStudent(id!, {
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
    if (!canEditStudent) {
      alert('You do not have permission to update student enrollment.');
      return;
    }
    try {
      setLoading(true);
      await studentDetailsService.updateStudent(id!, {
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
    if (!canEditStudent) {
      alert('You do not have permission to update student enrollment.');
      return;
    }
    try {
      setLoading(true);
      const currentEnroll = enrollments[0];
      if (!currentEnroll) {
        alert('No active enrollment to change section for.');
        return;
      }
      await studentDetailsService.updateStudent(id!, {
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

  const visibleTabs = [
    { id: 'overview', label: 'Overview', icon: User },
    { id: 'academic', label: 'Academic', icon: GraduationCap },
    { id: 'attendance', label: 'Attendance', icon: Clock },
    { id: 'results', label: 'Results', icon: TrendingUp },
    { id: 'fees', label: 'Fees', icon: IndianRupee, show: canViewFees },
    { id: 'timeline', label: 'Timeline', icon: Calendar },
    { id: 'health', label: 'Health Card', icon: Heart },
    { id: 'notes', label: 'Notes', icon: MessageSquare, show: canWriteNotes },
    { id: 'documents', label: 'Documents', icon: FileText, show: canManageDocs },
    { id: 'guardians', label: 'Guardians', icon: User }
  ].filter(tab => tab.show !== false);

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
          <div className="student-details-row-7">
            {student.photo ? (
              <img
                src={getAuthenticatedUrl(
                  student.photo.startsWith('data:image') || student.photo.startsWith('/api') || student.photo.startsWith('http')
                    ? student.photo
                    : `/api/students/photo/${student.id}`
                )}
                alt="Student Photo"
                className="student-details-avatar-img"
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
        {visibleTabs.map(t => {
          const Icon = t.icon;
          const isSelected = activeTab === t.id;
          return (
            <button
              key={t.id}
              className={`student-details-tab-btn ${isSelected ? 'is-selected' : ''}`}
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

        {activeTab === 'overview' && <OverviewTab student={student} />}

        {activeTab === 'academic' && (
          <AcademicTab
            student={student}
            enrollments={enrollments}
            academicYears={academicYears}
            programs={programs}
            sections={sections}
            institutionType={institutionType}
            getProgramLabel={getProgramLabel}
            canEditStudent={canEditStudent}
            allocation={allocation}
            onOpenTransfer={() => {
              const currentEnroll = enrollments[0];
              setTransferForm({ academic_year_id: currentEnroll.academic_year_id || '', course_id: currentEnroll.course_id || '', section_id: currentEnroll.section_id || '', semester: currentEnroll.semester || 1 });
              setShowTransferModal(true);
            }}
            onOpenPromote={() => {
              const currentEnroll = enrollments[0];
              setPromoteForm({ academic_year_id: currentEnroll.academic_year_id || '', course_id: currentEnroll.course_id || '', section_id: currentEnroll.section_id || '', semester: (currentEnroll.semester || 1) + 1 });
              setShowPromoteModal(true);
            }}
            onOpenChangeSection={() => {
              const currentEnroll = enrollments[0];
              setChangeSectionForm({ section_id: currentEnroll.section_id || '' });
              setShowChangeSectionModal(true);
            }}
            onOpenEnroll={() => {
              setTransferForm({
                academic_year_id: academicYears[0]?.id || '',
                course_id: programs[0]?.id || '',
                section_id: '',
                semester: 1
              });
              setShowTransferModal(true);
            }}
            onOpenTransport={() => setShowTransportModal(true)}
          />
        )}

        {activeTab === 'attendance' && <AttendanceTab attendanceInfo={attendanceInfo} />}

        {activeTab === 'results' && (
          <ResultsTab
            studentExams={studentExams}
            selectedExamId={selectedExamId}
            setSelectedExamId={setSelectedExamId}
            loadingResult={loadingResult}
            detailedResult={detailedResult}
          />
        )}

        {activeTab === 'fees' && canViewFees && (
          <FeesTab
            ledger={ledger}
            payments={payments}
            totalAssignedFees={totalAssignedFees}
            totalPaidFees={totalPaidFees}
            remainingFeeDue={remainingFeeDue}
          />
        )}

        {activeTab === 'timeline' && <TimelineTab timelineItems={timelineItems} />}

        {activeTab === 'health' && (
          <HealthTab
            student={student}
            canEditStudent={canEditStudent}
            showHealthEdit={showHealthEdit}
            setShowHealthEdit={setShowHealthEdit}
            healthForm={healthForm}
            setHealthForm={setHealthForm}
            savingHealth={savingHealth}
            onSave={handleHealthSave}
          />
        )}

        {activeTab === 'notes' && canWriteNotes && (
          <NotesTab
            notes={notes}
            newNote={newNote}
            setNewNote={setNewNote}
            addingNote={addingNote}
            canWriteNotes={canWriteNotes}
            onAddNote={handleAddNote}
            onDeleteNote={handleDeleteNote}
          />
        )}

        {activeTab === 'documents' && canManageDocs && (
          <DocumentsTab
            documents={documents}
            canManageDocs={canManageDocs}
            onUploadClick={() => setShowUploadModal(true)}
            onDownload={handleDownloadDoc}
            onDelete={handleDocDelete}
          />
        )}

        {activeTab === 'guardians' && <GuardiansTab guardians={guardians} />}

      </div>

      <UploadDocumentModal
        show={showUploadModal && canManageDocs}
        docType={newDocType}
        setDocType={setNewDocType}
        selectedFile={selectedFile}
        setSelectedFile={setSelectedFile}
        uploading={uploadingDoc}
        onClose={() => { setShowUploadModal(false); setSelectedFile(null); }}
        onSubmit={handleDocUploadSubmit}
      />

      <TransferStudentModal
        show={showTransferModal && canEditStudent}
        form={transferForm}
        onFieldChange={handleTransferFieldChange}
        setForm={setTransferForm}
        academicYears={academicYears}
        programs={programs}
        sections={sections}
        institutionType={institutionType}
        getProgramLabel={getProgramLabel}
        onClose={() => setShowTransferModal(false)}
        onSubmit={handleTransferSubmit}
      />

      <PromoteStudentModal
        show={showPromoteModal && canEditStudent}
        form={promoteForm}
        onFieldChange={handlePromoteFieldChange}
        setForm={setPromoteForm}
        academicYears={academicYears}
        programs={programs}
        sections={sections}
        institutionType={institutionType}
        getProgramLabel={getProgramLabel}
        onClose={() => setShowPromoteModal(false)}
        onSubmit={handlePromoteSubmit}
      />

      <ChangeSectionModal
        show={showChangeSectionModal && canEditStudent && enrollments.length > 0}
        currentEnrollment={enrollments[0]}
        programs={programs}
        sections={sections}
        getProgramLabel={getProgramLabel}
        form={changeSectionForm}
        setForm={setChangeSectionForm}
        onClose={() => setShowChangeSectionModal(false)}
        onSubmit={handleChangeSectionSubmit}
      />

      <TransportModal
        show={showTransportModal && canEditStudent}
        allocation={allocation}
        transportRoutes={transportRoutes}
        form={transportForm}
        setForm={setTransportForm}
        submitting={submittingTransport}
        onClose={() => setShowTransportModal(false)}
        onSubmit={handleTransportSubmit}
        onRemove={handleRemoveTransport}
      />
    </Layout>
  );
}
