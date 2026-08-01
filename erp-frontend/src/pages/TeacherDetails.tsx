import './TeacherDetails.css';
import React, { useEffect, useState } from 'react';
import { PageGuidance } from '../components/PageGuidance';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import {
  Plus, Calendar, Clock, FileText, User,
  ArrowLeft, Award, Activity, CheckCircle, Users, BookOpen, AlertTriangle, Settings, RefreshCw, HelpCircle,
  Clipboard, Download,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../contexts/ConfirmDialogContext';
import { hasAnyPermission, hasAnyRole } from '../utils/accessControl';

import { teacherDetailsService } from './teacherDetails/teacherDetailsService';
import { OverviewTab } from './teacherDetails/components/OverviewTab';
import { SubjectsTab } from './teacherDetails/components/SubjectsTab';
import { ClassesTab } from './teacherDetails/components/ClassesTab';
import { TimetableTab } from './teacherDetails/components/TimetableTab';
import { WorkloadTab } from './teacherDetails/components/WorkloadTab';
import { LeaveTab } from './teacherDetails/components/LeaveTab';
import { PayrollTab } from './teacherDetails/components/PayrollTab';
import { DocumentsTab } from './teacherDetails/components/DocumentsTab';
import { TimelineTab } from './teacherDetails/components/TimelineTab';
import { ApplyLeaveModal } from './teacherDetails/components/ApplyLeaveModal';
import { EditProfileModal } from './teacherDetails/components/EditProfileModal';
import { CreateLoginModal } from './teacherDetails/components/CreateLoginModal';
import { AddTimelineEventModal } from './teacherDetails/components/AddTimelineEventModal';
import { PayslipPreviewModal } from './teacherDetails/components/PayslipPreviewModal';

export default function TeacherDetails() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { success: toastSuccess, error: toastError, info: toastInfo } = useToast();
  const confirm = useConfirm();
  const userPermissions = user?.permissions || [];
  const roles = user?.roles || (user?.role ? [user.role] : []);
  const isTeacherRole = hasAnyRole(roles, ['Teacher', 'teacher']);
  const isAdmin = hasAnyRole(roles, ['admin', 'super_admin', 'Principal']);
  const isTeacherManager = hasAnyRole(roles, ['admin', 'super_admin', 'Principal', 'HOD']);
  const canEditTeacher = hasAnyPermission(userPermissions, ['teacher.edit']) || isAdmin;
  const canManageLogin = hasAnyPermission(userPermissions, ['teacher.create']) || isAdmin;
  const canManageTeacherDocs = canEditTeacher;
  const canWriteTimeline = canEditTeacher;
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [timelineForm, setTimelineForm] = useState({ title: '', desc: '' });

  const activeTab = searchParams.get('tab') || 'overview';

  // Core States
  const [teacher, setTeacher] = useState<any>(null);
  const isSelfTeacherProfile = Boolean(teacher && isTeacherRole && teacher.user_id === user?.id);
  const canApplyLeave = isSelfTeacherProfile;
  const canViewPayroll = hasAnyPermission(userPermissions, ['payroll.view', 'finance.access']) || isAdmin || isSelfTeacherProfile;
  const canViewTeacherDocs = isTeacherManager || isSelfTeacherProfile;
  const [assignments, setAssignments] = useState<any[]>([]);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [timetableSlots, setTimetableSlots] = useState<any[]>([]);
  const [timetableEntries, setTimetableEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [institutionType, setInstitutionType] = useState<string>('school');
  const [departments, setDepartments] = useState<any[]>([]);

  // Leaves & Payroll States
  const [leaveBalances, setLeaveBalances] = useState<any[]>([]);
  const [leaveApplications, setLeaveApplications] = useState<any[]>([]);
  const [salaryStructure, setSalaryStructure] = useState<any>(null);
  const [payslips, setPayslips] = useState<any[]>([]);
  const [selectedPayslip, setSelectedPayslip] = useState<any | null>(null);
  const [showSlipModal, setShowSlipModal] = useState(false);

  // Custom Redesign States (Phase 9/10 Polish)
  const [teacherDocs, setTeacherDocs] = useState<any[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<any[]>([]);
  const [showHelp, setShowHelp] = useState(false);

  const fetchDocumentsAndTimeline = async (canReadDocsAndTimeline: boolean, canSeedTimeline: boolean) => {
    if (!id) return;
    try {
      // 1. Fetch documents
      const initialDocs = [
        { id: 'resume', label: 'Resume / Curriculum Vitae', fileName: '', status: 'PENDING', date: '', backendId: '' },
        { id: 'degree', label: 'Post-Graduate Degree Certificate', fileName: '', status: 'PENDING', date: '', backendId: '' },
        { id: 'pan', label: 'PAN Card Cardholder Copy', fileName: '', status: 'PENDING', date: '', backendId: '' },
        { id: 'aadhar', label: 'Aadhar Card Copy (UIDAI)', fileName: '', status: 'PENDING', date: '', backendId: '' },
        { id: 'joining_letter', label: 'Official Institution Joining Letter', fileName: '', status: 'PENDING', date: '', backendId: '' },
        { id: 'contract', label: 'Annual Employment Contract Agreement', fileName: '', status: 'PENDING', date: '', backendId: '' },
        { id: 'experience_certs', label: 'Previous Experience Certificates', fileName: '', status: 'PENDING', date: '', backendId: '' },
      ];

      if (!canReadDocsAndTimeline) {
        setTeacherDocs(initialDocs);
        setTimelineEvents([]);
        return;
      }

      const docs = await teacherDetailsService.getDocuments(id);
      const mergedDocs = initialDocs.map(requiredDoc => {
        const match = docs.find((d: any) => d.folder === requiredDoc.label);
        if (match) {
          return {
            ...requiredDoc,
            fileName: match.name,
            status: 'UPLOADED',
            date: match.created_at,
            backendId: match.id
          };
        }
        return requiredDoc;
      });

      const extraDocs = docs
        .filter((d: any) => !initialDocs.some(req => req.label === d.folder))
        .map((d: any) => ({
          id: d.id,
          label: d.folder || 'Other',
          fileName: d.name,
          status: 'UPLOADED',
          date: d.created_at,
          backendId: d.id
        }));

      setTeacherDocs([...mergedDocs, ...extraDocs]);

      // 2. Fetch timeline events (stored as JSON in notes)
      const notes = await teacherDetailsService.getNotes(id);
      const events = notes.map((n: any) => {
        let title = n.content;
        let desc = '';
        try {
          const parsed = JSON.parse(n.content);
          title = parsed.title;
          desc = parsed.desc;
        } catch (e) {
          // Fallback if not JSON
        }
        return {
          id: n.id,
          title,
          desc,
          date: n.created_at
        };
      });

      // If no notes, load default initial timeline events
      if (events.length === 0) {
        const initialTimeline = [
          { id: '1', title: 'Profile Created', desc: 'Teacher user profile initiated and synchronized.', date: '2026-06-01 10:00' },
          { id: '2', title: 'Joining Letter Signed', desc: 'Joining letter document uploaded and archived.', date: '2026-06-02 11:30' },
          { id: '3', title: 'Salary Structure Configured', desc: 'Monthly basic and allowances structural configuration applied.', date: '2026-06-15 14:00' },
          { id: '4', title: 'Subject Mappings Created', desc: 'Curriculum allocations assigned in Academic Setup.', date: '2026-07-07 09:15' },
          { id: '5', title: 'Applied Leave Request', desc: 'Leave application submitted for approval.', date: '2026-07-12 16:30' }
        ];
        // Populate backend with initial timeline events in background so it's persisted
        if (canSeedTimeline) {
          for (const evt of initialTimeline) {
            teacherDetailsService.addNote(id, JSON.stringify({ title: evt.title, desc: evt.desc }));
          }
        }
        setTimelineEvents(initialTimeline);
      } else {
        setTimelineEvents(events);
      }

    } catch (err) {
      console.error('Failed to load documents/notes:', err);
    }
  };

  // Apply Leave Modal
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    leave_type_id: '',
    from_date: '',
    to_date: '',
    days_count: 1,
    reason: ''
  });
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const [submittingLeave, setSubmittingLeave] = useState(false);

  // Edit Profile / Login Account modal states
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

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [creatingLogin, setCreatingLogin] = useState(false);

  const getProgramLabel = () => institutionType === 'school' ? 'Class' : 'Program';

  const setActiveTab = (tab: string) => {
    setSearchParams({ tab });
  };

  // Redirect legacy tabs to overview
  useEffect(() => {
    const legacyTabs = ['assignments', 'notes'];
    if (legacyTabs.includes(activeTab)) {
      setActiveTab('overview');
    }
  }, [activeTab]);

  useEffect(() => {
    if (
      (activeTab === 'payroll' && !canViewPayroll) ||
      (activeTab === 'documents' && !canViewTeacherDocs) ||
      (activeTab === 'leave' && !canApplyLeave && !isTeacherManager) ||
      (activeTab === 'timeline' && !canViewTeacherDocs)
    ) {
      setActiveTab('overview');
    }
  }, [activeTab, canViewPayroll, canViewTeacherDocs, canApplyLeave, isTeacherManager]);

  useEffect(() => {
    fetchData();
  }, [id, isTeacherManager, isTeacherRole, isAdmin, canWriteTimeline]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (!id) return;
      const [
        teacherData, assignmentsData, yearsData, programsData,
        sectionsData, subjectsData, slotsData, timetableData,
        departmentsData
      ] = await Promise.all([
        teacherDetailsService.getTeacher(id),
        teacherDetailsService.getAssignments(id),
        teacherDetailsService.getAcademicYears(),
        teacherDetailsService.getPrograms(),
        teacherDetailsService.getSections(),
        teacherDetailsService.getSubjects(),
        teacherDetailsService.getTimetableSlots(),
        teacherDetailsService.getWeeklyTimetable(id),
        teacherDetailsService.getDepartments(),
      ]);

      setTeacher(teacherData);
      setAssignments(assignmentsData || []);
      setAcademicYears(yearsData || []);
      setPrograms(programsData || []);
      setSections(sectionsData || []);
      setSubjects(subjectsData || []);
      setTimetableSlots(slotsData || []);
      setTimetableEntries(timetableData || []);
      setDepartments(departmentsData || []);

      if (teacherData) {
        setEditForm({
          first_name: teacherData.first_name || '',
          middle_name: teacherData.middle_name || '',
          last_name: teacherData.last_name || '',
          email: teacherData.email || '',
          phone: teacherData.phone || '',
          employee_id: teacherData.employee_id || '',
          department: teacherData.department || '',
          designation: teacherData.designation || '',
          joining_date: teacherData.joining_date || '',
          qualification: teacherData.qualification || '',
          experience: teacherData.experience || '',
          status: teacherData.status || 'ACTIVE'
        });
      }

      if (user?.institution_id) {
        const inst = await teacherDetailsService.getInstitution(user.institution_id);
        if (inst && inst.institution_type) {
          setInstitutionType(inst.institution_type);
        }
      }

      const defaultYear = yearsData.find((y: any) => y.is_current)?.id || yearsData[0]?.id || '';
      const isSelfTeacherData = Boolean(teacherData && isTeacherRole && teacherData.user_id === user?.id);
      const canReadPayrollData = hasAnyPermission(userPermissions, ['payroll.view', 'finance.access']) || isAdmin || isSelfTeacherData;
      const canReadDocsAndTimeline = isTeacherManager || isSelfTeacherData;
      const canReadLeaveData = isTeacherManager || isSelfTeacherData;

      const [balancesData, leaveAppsData, salaryData, payslipsData, leaveTypesData] = await Promise.all([
        defaultYear && canReadLeaveData
          ? (isSelfTeacherData ? teacherDetailsService.getMyLeaveBalances(defaultYear) : teacherDetailsService.getLeaveBalances(defaultYear))
          : Promise.resolve([]),
        canReadLeaveData
          ? (isSelfTeacherData ? teacherDetailsService.getMyLeaveApplications() : teacherDetailsService.getLeaveApplicationsForTeacher(id))
          : Promise.resolve([]),
        canReadPayrollData ? teacherDetailsService.getSalaryStructure(id) : Promise.resolve(null),
        canReadPayrollData ? teacherDetailsService.getPayslips(id) : Promise.resolve([]),
        teacherDetailsService.getLeaveTypes()
      ]);

      setLeaveBalances(balancesData || []);
      setLeaveApplications(leaveAppsData || []);
      setSalaryStructure(salaryData);
      setPayslips(payslipsData || []);
      setLeaveTypes(leaveTypesData || []);

      if (leaveTypesData && leaveTypesData.length > 0) {
        setLeaveForm(prev => ({ ...prev, leave_type_id: leaveTypesData[0].id }));
      }

      await fetchDocumentsAndTimeline(canReadDocsAndTimeline, canWriteTimeline);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditTeacher) {
      toastError('You do not have permission to edit teacher profiles.');
      return;
    }
    try {
      await teacherDetailsService.updateTeacher(id!, editForm);
      setShowEditModal(false);
      toastSuccess('Profile updated successfully!');
      fetchData();
    } catch (err: any) {
      toastError(err.message || 'Error updating teacher profile');
    }
  };

  const handleToggleStatus = async () => {
    if (!teacher) return;
    if (!canEditTeacher) {
      toastError('You do not have permission to change teacher status.');
      return;
    }
    const newStatus = teacher.status === 'ACTIVE' ? 'RESIGNED' : 'ACTIVE';
    if (!await confirm(`Are you sure you want to change this teacher's status to ${newStatus}?`)) return;
    try {
      await teacherDetailsService.updateTeacher(id!, {
        ...teacher,
        status: newStatus
      });
      toastSuccess(`Teacher status updated to ${newStatus}`);
      fetchData();
    } catch (err) {
      toastError('Failed to update status');
    }
  };

  const handleCreateLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageLogin) {
      toastError('You do not have permission to link teacher login accounts.');
      return;
    }
    try {
      setCreatingLogin(true);
      const userRes = await teacherDetailsService.createUser({
        name: `${teacher.first_name} ${teacher.last_name}`.trim(),
        username: loginUsername.trim(),
        email: loginEmail.trim(),
        password: loginPassword.trim(),
        roles: ['teacher']
      });

      const newUserId = userRes.id;
      if (!newUserId) throw new Error('Failed to create login user profile');

      await teacherDetailsService.updateTeacher(id!, {
        ...teacher,
        user_id: newUserId
      });

      toastSuccess('Login account created and linked successfully!');
      setShowLoginModal(false);
      fetchData();
    } catch (err: any) {
      toastError(err.message || 'Error creating login account');
    } finally {
      setCreatingLogin(false);
    }
  };

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canApplyLeave) {
      toastError('Leave applications must be submitted from your own teacher profile.');
      return;
    }
    setSubmittingLeave(true);
    try {
      const defaultYear = academicYears.find((y: any) => y.is_current)?.id || academicYears[0]?.id || '';
      await teacherDetailsService.applyLeave({
        ...leaveForm,
        teacher_id: id,
        academic_year_id: defaultYear
      });
      toastSuccess('Leave application submitted successfully!');
      setShowLeaveModal(false);
      setLeaveForm({ leave_type_id: leaveTypes[0]?.id || '', from_date: '', to_date: '', days_count: 1, reason: '' });
      fetchData();
    } catch (err: any) {
      toastError(err.message || 'Failed to apply for leave');
    } finally {
      setSubmittingLeave(false);
    }
  };

  const handleTimelineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWriteTimeline) {
      toastError('You do not have permission to add teacher timeline events.');
      return;
    }
    if (!timelineForm.title.trim() || !timelineForm.desc.trim()) return;

    try {
      const payload = JSON.stringify({
        title: timelineForm.title.trim(),
        desc: timelineForm.desc.trim()
      });

      await teacherDetailsService.addNote(id!, payload);
      await fetchDocumentsAndTimeline(canViewTeacherDocs, canWriteTimeline);
      setShowTimelineModal(false);
      toastSuccess('Timeline event added successfully!');
    } catch (err: any) {
      toastError(err.message || 'Failed to add timeline event');
    }
  };

  const handleDownloadDocument = (doc: any) => {
    if (!canViewTeacherDocs) {
      toastError('You do not have permission to download teacher documents.');
      return;
    }
    if (!doc.backendId) return;
    // Session cookie is attached automatically on this top-level navigation.
    const downloadUrl = teacherDetailsService.downloadDocumentUrl(id!, doc.backendId);
    window.open(downloadUrl, '_blank');
  };

  const handleDeleteDocument = async (doc: any) => {
    if (!canManageTeacherDocs) {
      toastError('You do not have permission to delete teacher documents.');
      return;
    }
    if (!await confirm({ message: `Are you sure you want to delete this document: ${doc.label}?`, danger: true, confirmLabel: 'Delete' })) return;
    if (!doc.backendId) return;
    try {
      await teacherDetailsService.deleteDocument(id!, doc.backendId);
      toastSuccess(`${doc.label} deleted successfully`);
      await fetchDocumentsAndTimeline(canViewTeacherDocs, canWriteTimeline);
    } catch (err: any) {
      toastError(err.message || 'Failed to delete document.');
    }
  };

  const handleUploadDocument = (docId: string, label: string) => {
    if (!canManageTeacherDocs) {
      toastError('You do not have permission to upload teacher documents.');
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const formData = new FormData();
      formData.append('file', file);
      formData.append('document_type', label);

      try {
        toastInfo(`Uploading ${file.name}...`);
        await teacherDetailsService.uploadDocument(id!, formData);
        toastSuccess(`${label} uploaded successfully!`);
        await fetchDocumentsAndTimeline(canViewTeacherDocs, canWriteTimeline);
      } catch (err: any) {
        toastError(err.message || 'Failed to upload document.');
      }
    };
    input.click();
  };

  if (loading) {
    return (
      <Layout>
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <RefreshCw size={24} className="spin" style={{ marginBottom: '1rem' }} />
          <p>Loading teacher workspace details...</p>
        </div>
      </Layout>
    );
  }

  if (!teacher) {
    return (
      <Layout>
        <div style={{ padding: '3rem', textAlign: 'center' }}>
          <AlertTriangle size={48} color="var(--danger)" style={{ marginBottom: '1rem' }} />
          <h3>Teacher Not Found</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>The requested teacher record could not be retrieved.</p>
          <Link to="/teachers" className="btn btn-primary">
            <ArrowLeft size={16} /> Back to Teachers Directory
          </Link>
        </div>
      </Layout>
    );
  }

  if (isTeacherRole && !isSelfTeacherProfile) {
    return (
      <Layout>
        <div style={{ padding: '3rem', textAlign: 'center' }}>
          <AlertTriangle size={48} style={{ color: 'var(--danger)', marginBottom: '1rem' }} />
          <h3>Unauthorized Access</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>You do not have permission to view other staff workspaces.</p>
          <Link to="/dashboard" className="btn btn-primary">
            <ArrowLeft size={16} /> Back to Dashboard
          </Link>
        </div>
      </Layout>
    );
  }

  // Workload computation
  const currentYearId = academicYears.find((y: any) => y.is_current)?.id || '';
  const activeYearAssignments = assignments.filter((a: any) => !currentYearId || a.academic_year_id === currentYearId);
  const totalAllocatedPeriods = activeYearAssignments.reduce((acc: number, a: any) => {
    return acc + (a.classes_per_week || 4);
  }, 0);
  const isOverloaded = totalAllocatedPeriods > 24;

  // Leave computation
  const teacherBalances = leaveBalances.filter(b => b.teacher_id === id);

  // Payroll / Salary computation
  const basicSalary = salaryStructure?.basic_salary || 0;
  const hra = salaryStructure?.hra || 0;
  const da = salaryStructure?.da || 0;
  const allowances = salaryStructure?.other_allowances || 0;
  const grossSalary = basicSalary + hra + da + allowances;

  // Dynamic Today's Info calculations
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayDay = daysOfWeek[new Date().getDay()];
  const todayClassesCount = timetableEntries.filter(e => e.day_of_week === todayDay).length;

  const getNextClassInfo = () => {
    const todayEntries = timetableEntries.filter(e => e.day_of_week === todayDay);

    // Sort today's classes by slot start time
    const sorted = todayEntries.sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));

    // Get current time in HH:MM format
    const now = new Date();
    const currentStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const next = sorted.find(e => (e.start_time || '') > currentStr);
    if (next) {
      return `${next.start_time} - ${next.subject_name}`;
    }

    // Get tomorrow's first class if any
    const tomorrowDay = daysOfWeek[(new Date().getDay() + 1) % 7];
    const tomorrowEntries = timetableEntries.filter(e => e.day_of_week === tomorrowDay);
    if (tomorrowEntries.length > 0) {
      const firstTomorrow = tomorrowEntries.sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''))[0];
      return `Tomorrow ${firstTomorrow.start_time} ${firstTomorrow.subject_name}`;
    }

    return 'None scheduled';
  };
  const nextClassStr = getNextClassInfo();
  const pendingLeaveCount = leaveApplications.filter(l => l.status === 'PENDING').length;

  return (
    <Layout>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.5rem' }}>
        <button
          className="btn btn-sm btn-outline"
          onClick={() => setShowHelp(!showHelp)}
          style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', height: 'auto' }}
        >
          <HelpCircle size={12} /> {showHelp ? 'Hide Workspace Guide' : 'Show Workspace Guide'}
        </button>
      </div>

      {showHelp && (
        <PageGuidance
          title="Teacher Workspace"
          description="View teacher details, check schedules, analyze workload, track leave records, and manage payslips."
          steps={[
            "Inspect contact details, qualifications, and employment logs.",
            "Check classroom assignments or weekly scheduler grid.",
            "Track payroll salary structure details and download payslips."
          ]}
        />
      )}

      {/* Header */}
      <div className="teacher-profile-header-card card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Link to="/teachers" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }} className="hover-underline">
                <ArrowLeft size={14} /> Teachers Directory
              </Link>
              <span style={{ color: 'var(--text-muted)' }}>•</span>
              <span style={{ display: 'inline-block', padding: '0.125rem 0.625rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', backgroundColor: teacher.status === 'ACTIVE' ? 'var(--success-soft)' : 'var(--danger-soft)', color: teacher.status === 'ACTIVE' ? 'var(--success)' : 'var(--danger)' }}>
                {teacher.status || 'ACTIVE'}
              </span>
            </div>

            <h2 style={{ fontSize: '1.65rem', fontWeight: '800', color: 'var(--text-main)', margin: '0.25rem 0' }}>
              {teacher.first_name} {teacher.last_name}
            </h2>

            {/* Metadata Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem', marginTop: '0.75rem', fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
              <div><strong>Employee ID:</strong> <code>{teacher.employee_id || 'N/A'}</code></div>
              <div><strong>Department:</strong> {teacher.department || 'General'}</div>
              <div><strong>Designation:</strong> {teacher.designation || 'Staff Teacher'}</div>
              <div><strong>Employment Type:</strong> Full-Time</div>
              <div><strong>Reporting To:</strong> Principal</div>
              <div><strong>Joined:</strong> {teacher.joining_date ? new Date(teacher.joining_date).toLocaleDateString() : 'N/A'}</div>
              <div style={{ gridColumn: 'span 2' }}><strong>Qualification:</strong> {teacher.qualification || 'B.Ed / Graduate'}</div>
            </div>
          </div>

          {(canEditTeacher || canManageLogin) && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {canEditTeacher && (
                <button className="btn btn-secondary" onClick={handleToggleStatus}>
                  Change Status
                </button>
              )}
              {canManageLogin && !teacher.user_id && (
                <button className="btn btn-secondary" onClick={() => setShowLoginModal(true)}>
                  Link User Login
                </button>
              )}
              {canEditTeacher && (
                <button className="btn btn-secondary" onClick={() => setShowEditModal(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Settings size={15} /> Edit Profile
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Summary Card with Today's Information */}
      <div className="card summary-card" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.5rem', background: 'var(--bg-card)', borderLeft: '4px solid var(--primary)', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.25rem' }}>
          <div>
            <div style={{ fontSize: '1.15rem', fontWeight: '700', color: 'var(--text-main)' }}>Today's Status Overview</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
              Real-time daily schedule indicators &bull; {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700', letterSpacing: '0.05em' }}>Today's Classes</div>
              <div style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-main)' }}>{todayClassesCount} Lectures</div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700', letterSpacing: '0.05em' }}>Next Class</div>
              <div style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--primary)' }}>{nextClassStr}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700', letterSpacing: '0.05em' }}>Current Load</div>
              <div style={{ fontSize: '1.15rem', fontWeight: '800', color: isOverloaded ? 'var(--danger)' : 'var(--text-main)' }}>
                {totalAllocatedPeriods} / 24 periods
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700', letterSpacing: '0.05em' }}>Pending Leave</div>
              <div style={{ fontSize: '1.15rem', fontWeight: '800', color: pendingLeaveCount > 0 ? 'var(--warning)' : 'var(--success)' }}>
                {pendingLeaveCount} Requests
              </div>
            </div>
            {canViewPayroll && (
              <div>
                <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700', letterSpacing: '0.05em' }}>Net Salary (Gross)</div>
                <div style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-main)' }}>
                  ₹{grossSalary.toLocaleString()}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Role-based Quick Actions Panel */}
      <div className="card quick-actions-panel" style={{ padding: '0.75rem 1rem', marginBottom: '1.5rem', background: 'var(--bg-subtle)', display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-secondary)', marginRight: '0.5rem', letterSpacing: '0.05em' }}>Quick Actions:</span>
        {isTeacherManager ? (
          <>
            {canEditTeacher && (
              <button className="btn btn-secondary" onClick={() => setShowEditModal(true)} style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', height: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                <Settings size={13} /> Edit Teacher
              </button>
            )}
            <button className="btn btn-secondary" onClick={() => navigate('/academic-setup?tab=assignments')} style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', height: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
              <Settings size={13} /> Assign Subject
            </button>
            <button className="btn btn-secondary" onClick={() => { setActiveTab('timetable'); }} style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', height: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
              <Calendar size={13} /> View Timetable
            </button>
            {canViewPayroll && (
              <button className="btn btn-secondary" onClick={() => navigate('/finance?tab=payroll')} style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', height: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                <FileText size={13} /> Generate Payslip
              </button>
            )}
          </>
        ) : (
          <>
            <button className="btn btn-secondary" onClick={() => navigate('/attendance')} style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', height: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
              <CheckCircle size={13} /> Mark Attendance
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/exams')} style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', height: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
              <Award size={13} /> Enter Marks
            </button>
            <button className="btn btn-secondary" onClick={() => { setActiveTab('timetable'); }} style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', height: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
              <Calendar size={13} /> Today's Timetable
            </button>
            {canApplyLeave && (
              <button className="btn btn-secondary" onClick={() => setShowLeaveModal(true)} style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', height: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                <Plus size={13} /> Apply Leave
              </button>
            )}
            {canViewPayroll && (
              <button className="btn btn-secondary" onClick={() => { setActiveTab('payroll'); }} style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', height: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                <Download size={13} /> Download Payslip
              </button>
            )}
          </>
        )}
      </div>

      {/* Workspace Navigation Tabs */}
      <div className="teacher-workspace-tabs">
        {[
          { tab: 'overview', label: 'Profile Overview', icon: User },
          { tab: 'subjects', label: 'Taught Subjects', icon: BookOpen },
          { tab: 'classes', label: `Assigned Classes`, icon: Users },
          { tab: 'timetable', label: 'Work Timetable', icon: Calendar },
          { tab: 'workload', label: 'Teacher Workload', icon: Activity },
          { tab: 'leave', label: 'Leaves Register', icon: Clipboard, show: canApplyLeave || isTeacherManager },
          { tab: 'payroll', label: 'Payroll & Payslips', icon: FileText, show: canViewPayroll },
          { tab: 'documents', label: 'HR Documents', icon: FileText, show: canViewTeacherDocs },
          { tab: 'timeline', label: 'Action Timeline', icon: Clock, show: canViewTeacherDocs }
        ].filter(t => t.show !== false).map(t => {
          const Icon = t.icon;
          const isActive = activeTab === t.tab;
          return (
            <button
              key={t.tab}
              type="button"
              onClick={() => setActiveTab(t.tab)}
              className={`teacher-workspace-tab-btn${isActive ? ' is-active' : ''}`}
            >
              <Icon size={15} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      <div className="teacher-workspace-tab-content">
        {activeTab === 'overview' && (
          <OverviewTab teacher={teacher} canManageLogin={canManageLogin} onProvisionLogin={() => setShowLoginModal(true)} />
        )}

        {activeTab === 'subjects' && (
          <SubjectsTab
            activeYearAssignments={activeYearAssignments}
            subjects={subjects}
            programs={programs}
            getProgramLabel={getProgramLabel}
          />
        )}

        {activeTab === 'classes' && (
          <ClassesTab activeYearAssignments={activeYearAssignments} sections={sections} subjects={subjects} />
        )}

        {activeTab === 'timetable' && (
          <TimetableTab timetableSlots={timetableSlots} timetableEntries={timetableEntries} />
        )}

        {activeTab === 'workload' && (
          <WorkloadTab
            activeYearAssignments={activeYearAssignments}
            subjects={subjects}
            sections={sections}
            totalAllocatedPeriods={totalAllocatedPeriods}
            isOverloaded={isOverloaded}
          />
        )}

        {activeTab === 'leave' && (canApplyLeave || isTeacherManager) && (
          <LeaveTab
            teacherBalances={teacherBalances}
            leaveApplications={leaveApplications}
            canApplyLeave={canApplyLeave}
            onApplyLeave={() => setShowLeaveModal(true)}
          />
        )}

        {activeTab === 'payroll' && canViewPayroll && (
          <PayrollTab
            salaryStructure={salaryStructure}
            basicSalary={basicSalary}
            da={da}
            hra={hra}
            allowances={allowances}
            grossSalary={grossSalary}
            payslips={payslips}
            isAdmin={isAdmin}
            onConfigureSalary={() => navigate('/finance?tab=salary-structures')}
            onViewPayslip={(slip) => { setSelectedPayslip(slip); setShowSlipModal(true); }}
          />
        )}

        {activeTab === 'documents' && canViewTeacherDocs && (
          <DocumentsTab
            teacherDocs={teacherDocs}
            canManageTeacherDocs={canManageTeacherDocs}
            onDownload={handleDownloadDocument}
            onDelete={handleDeleteDocument}
            onUpload={handleUploadDocument}
          />
        )}

        {activeTab === 'timeline' && canViewTeacherDocs && (
          <TimelineTab
            timelineEvents={timelineEvents}
            canWriteTimeline={canWriteTimeline}
            onAddEvent={() => { setTimelineForm({ title: '', desc: '' }); setShowTimelineModal(true); }}
          />
        )}
      </div>

      <ApplyLeaveModal
        show={showLeaveModal && canApplyLeave}
        leaveTypes={leaveTypes}
        form={leaveForm}
        setForm={setLeaveForm}
        submitting={submittingLeave}
        onClose={() => setShowLeaveModal(false)}
        onSubmit={handleApplyLeave}
      />

      <EditProfileModal
        show={showEditModal && canEditTeacher}
        editTab={editTab}
        setEditTab={setEditTab}
        form={editForm}
        setForm={setEditForm}
        departments={departments}
        onClose={() => setShowEditModal(false)}
        onSubmit={handleEditSubmit}
      />

      <CreateLoginModal
        show={showLoginModal && canManageLogin}
        username={loginUsername}
        setUsername={setLoginUsername}
        email={loginEmail}
        setEmail={setLoginEmail}
        password={loginPassword}
        setPassword={setLoginPassword}
        creating={creatingLogin}
        onClose={() => setShowLoginModal(false)}
        onSubmit={handleCreateLogin}
      />

      <AddTimelineEventModal
        show={showTimelineModal && canWriteTimeline}
        form={timelineForm}
        setForm={setTimelineForm}
        onClose={() => setShowTimelineModal(false)}
        onSubmit={handleTimelineSubmit}
      />

      <PayslipPreviewModal
        show={showSlipModal && !!selectedPayslip && canViewPayroll}
        payslip={selectedPayslip}
        institutionName={(user as any)?.institution_name}
        onClose={() => { setShowSlipModal(false); setSelectedPayslip(null); }}
      />
    </Layout>
  );
}
