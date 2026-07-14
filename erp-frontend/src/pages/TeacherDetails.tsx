import './TeacherDetails.css';
import React, { useEffect, useState } from 'react';
import { PageGuidance } from '../components/PageGuidance';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { api } from '../services/api';
import { 
  Plus, Calendar, Clock, MessageSquare, FileText, User, 
  Trash2, Upload, ArrowLeft, Download, Award, Briefcase, GraduationCap,
  Clipboard, Activity, CheckCircle, XCircle, Users, BookOpen, UserCheck, AlertTriangle, Settings, RefreshCw, HelpCircle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

export default function TeacherDetails() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { success: toastSuccess, error: toastError, info: toastInfo } = useToast();
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [timelineForm, setTimelineForm] = useState({ title: '', desc: '' });
  
  const activeTab = searchParams.get('tab') || 'overview';

  // Core States
  const [teacher, setTeacher] = useState<any>(null);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [timetableSlots, setTimetableSlots] = useState<any[]>([]);
  const [timetableEntries, setTimetableEntries] = useState<any[]>([]);
  const [workload, setWorkload] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [institutionType, setInstitutionType] = useState<string>('school');
  const [departments, setDepartments] = useState<any[]>([]);

  // Leaves & Payroll States
  const [leaveBalances, setLeaveBalances] = useState<any[]>([]);
  const [leaveApplications, setLeaveApplications] = useState<any[]>([]);
  const [salaryStructure, setSalaryStructure] = useState<any>(null);
  const [payslips, setPayslips] = useState<any[]>([]);
 
  // Custom Redesign States (Phase 9/10 Polish)
  const [teacherDocs, setTeacherDocs] = useState<any[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<any[]>([]);
  const [showHelp, setShowHelp] = useState(false);
 
  useEffect(() => {
    if (!id) return;
    
    // Initialize documents
    const savedDocs = localStorage.getItem(`teacher_docs_${id}`);
    if (savedDocs) {
      setTeacherDocs(JSON.parse(savedDocs));
    } else {
      const initialDocs = [
        { id: 'resume', label: 'Resume / Curriculum Vitae', fileName: 'sarah_resume_2026.pdf', status: 'UPLOADED', date: '2026-06-01' },
        { id: 'degree', label: 'Post-Graduate Degree Certificate', fileName: 'msc_math_degree.pdf', status: 'UPLOADED', date: '2026-06-01' },
        { id: 'pan', label: 'PAN Card Cardholder Copy', fileName: '', status: 'PENDING', date: '' },
        { id: 'aadhar', label: 'Aadhar Card Copy (UIDAI)', fileName: 'aadhar_card_verified.pdf', status: 'UPLOADED', date: '2026-06-01' },
        { id: 'joining_letter', label: 'Official Institution Joining Letter', fileName: 'joining_letter.pdf', status: 'UPLOADED', date: '2026-06-02' },
        { id: 'contract', label: 'Annual Employment Contract Agreement', fileName: '', status: 'PENDING', date: '' },
        { id: 'experience_certs', label: 'Previous Experience Certificates', fileName: '', status: 'PENDING', date: '' },
      ];
      setTeacherDocs(initialDocs);
      localStorage.setItem(`teacher_docs_${id}`, JSON.stringify(initialDocs));
    }
 
    // Initialize timeline
    const savedTimeline = localStorage.getItem(`teacher_timeline_${id}`);
    if (savedTimeline) {
      setTimelineEvents(JSON.parse(savedTimeline));
    } else {
      const initialTimeline = [
        { id: '1', title: 'Profile Created', desc: 'Teacher user profile initiated and synchronized.', date: '2026-06-01 10:00' },
        { id: '2', title: 'Joining Letter Signed', desc: 'Joining letter document uploaded and archived.', date: '2026-06-02 11:30' },
        { id: '3', title: 'Salary Structure Configured', desc: 'Monthly basic and allowances structural configuration applied.', date: '2026-06-15 14:00' },
        { id: '4', title: 'Subject Mappings Created', desc: 'Curriculum allocations assigned in Academic Setup.', date: '2026-07-07 09:15' },
        { id: '5', title: 'Applied Leave Request', desc: 'Leave application submitted for approval.', date: '2026-07-12 16:30' }
      ];
      setTimelineEvents(initialTimeline);
      localStorage.setItem(`teacher_timeline_${id}`, JSON.stringify(initialTimeline));
    }
  }, [id]);

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
  const getProgramsLabel = () => institutionType === 'school' ? 'Classes' : 'Programs';

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
    fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [
        teacherData, assignmentsData, yearsData, programsData, 
        sectionsData, subjectsData, slotsData, timetableData, 
        workloadReport, departmentsData
      ] = await Promise.all([
        api.get(`/teachers/${id}`).catch(() => null),
        api.get(`/teacher-assignments/teacher/${id}`).catch(() => []),
        api.get('/academic-years').catch(() => []),
        api.get('/programs').catch(() => []),
        api.get('/sections').catch(() => []),
        api.get('/subjects').catch(() => []),
        api.get('/timetable-slots').catch(() => []),
        api.get(`/weekly-timetable?teacher_id=${id}`).catch(() => []),
        api.get('/teachers/reports/workload').catch(() => []),
        api.get('/departments').catch(() => [])
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

      const teacherWorkload = (workloadReport || []).find((w: any) => w.teacher_id === id);
      setWorkload(teacherWorkload || null);

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
        const inst = await api.get(`/institutions/${user.institution_id}`);
        if (inst && inst.institution_type) {
          setInstitutionType(inst.institution_type);
        }
      }

      const defaultYear = yearsData.find((y: any) => y.is_current)?.id || yearsData[0]?.id || '';

      const [balancesData, leaveAppsData, salaryData, payslipsData, leaveTypesData] = await Promise.all([
        defaultYear ? api.get(`/leave/balances?academic_year_id=${defaultYear}`).catch(() => []) : [],
        api.get(`/leave/applications?teacher_id=${id}`).catch(() => []),
        api.get(`/payroll/salary-structures/${id}`).catch(() => null),
        api.get(`/payroll/teacher/${id}/payslips`).catch(() => []),
        api.get(`/leave/types`).catch(() => [])
      ]);

      setLeaveBalances(balancesData || []);
      setLeaveApplications(leaveAppsData || []);
      setSalaryStructure(salaryData);
      setPayslips(payslipsData || []);
      setLeaveTypes(leaveTypesData || []);

      if (leaveTypesData && leaveTypesData.length > 0) {
        setLeaveForm(prev => ({ ...prev, leave_type_id: leaveTypesData[0].id }));
      }

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put(`/teachers/${id}`, editForm);
      setShowEditModal(false);
      toastSuccess('Profile updated successfully!');
      fetchData();
    } catch (err: any) {
      toastError(err.message || 'Error updating teacher profile');
    }
  };
 
  const handleToggleStatus = async () => {
    if (!teacher) return;
    const newStatus = teacher.status === 'ACTIVE' ? 'RESIGNED' : 'ACTIVE';
    if (!window.confirm(`Are you sure you want to change this teacher's status to ${newStatus}?`)) return;
    try {
      await api.put(`/teachers/${id}`, {
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
    try {
      setCreatingLogin(true);
      const userRes = await api.post('/users', {
        name: `${teacher.first_name} ${teacher.last_name}`.trim(),
        username: loginUsername.trim(),
        email: loginEmail.trim(),
        password: loginPassword.trim(),
        roles: ['teacher']
      });
 
      const newUserId = userRes.id;
      if (!newUserId) throw new Error('Failed to create login user profile');
 
      await api.put(`/teachers/${id}`, {
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
    setSubmittingLeave(true);
    try {
      const defaultYear = academicYears.find((y: any) => y.is_current)?.id || academicYears[0]?.id || '';
      await api.post(`/leave/applications`, {
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
 
  const handleTimelineSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!timelineForm.title.trim() || !timelineForm.desc.trim()) return;
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const newEvt = {
      id: String(Date.now()),
      title: timelineForm.title.trim(),
      desc: timelineForm.desc.trim(),
      date: dateStr
    };
    const updated = [newEvt, ...timelineEvents];
    setTimelineEvents(updated);
    localStorage.setItem(`teacher_timeline_${id}`, JSON.stringify(updated));
    setShowTimelineModal(false);
    toastSuccess('Timeline event added successfully!');
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

  const isTeacherRole = (user?.roles || (user?.role ? [user.role] : [])).some(
    (r: string) => ['teacher', 'Teacher'].includes(r)
  );

  if (isTeacherRole && teacher.user_id !== user?.id) {
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
  const totalAllocatedPeriods = workload?.allocated_hours || 0;
  const isOverloaded = totalAllocatedPeriods > 24;

  // Leave computation
  const teacherBalances = leaveBalances.filter(b => b.teacher_id === id);
  const remainingLeaveDays = teacherBalances.reduce((acc, b) => acc + (b.remaining_days || 0), 0);

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

  const roles = user?.roles || (user?.role ? [user.role] : []);
  const isAdmin = roles.some(r => ['admin', 'super_admin', 'Principal', 'Super Admin'].includes(r));
 
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
 
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-secondary" onClick={handleToggleStatus}>
              Change Status
            </button>
            {!teacher.user_id && (
              <button className="btn btn-secondary" onClick={() => setShowLoginModal(true)}>
                Link User Login
              </button>
            )}
            <button className="btn btn-secondary" onClick={() => setShowEditModal(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <Settings size={15} /> Edit Profile
            </button>
          </div>
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
            <div>
              <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700', letterSpacing: '0.05em' }}>Net Salary (Gross)</div>
              <div style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-main)' }}>
                ₹{grossSalary.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </div>
 
      {/* Role-based Quick Actions Panel */}
      <div className="card quick-actions-panel" style={{ padding: '0.75rem 1rem', marginBottom: '1.5rem', background: 'var(--bg-subtle)', display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-secondary)', marginRight: '0.5rem', letterSpacing: '0.05em' }}>Quick Actions:</span>
        {isAdmin ? (
          <>
            <button className="btn btn-secondary" onClick={() => setShowEditModal(true)} style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', height: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
              <Settings size={13} /> Edit Teacher
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/academic-setup?tab=assignments')} style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', height: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
              <Settings size={13} /> Assign Subject
            </button>
            <button className="btn btn-secondary" onClick={() => { setActiveTab('timetable'); }} style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', height: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
              <Calendar size={13} /> View Timetable
            </button>
            <button className="btn btn-secondary" onClick={() => setShowLeaveModal(true)} style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', height: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
              <Plus size={13} /> Apply Leave
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/finance?tab=payroll')} style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', height: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
              <FileText size={13} /> Generate Payslip
            </button>
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
            <button className="btn btn-secondary" onClick={() => setShowLeaveModal(true)} style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', height: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
              <Plus size={13} /> Apply Leave
            </button>
            <button className="btn btn-secondary" onClick={() => { setActiveTab('payroll'); }} style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', height: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
              <Download size={13} /> Download Payslip
            </button>
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
          { tab: 'leave', label: 'Leaves Register', icon: Clipboard },
          { tab: 'payroll', label: 'Payroll & Payslips', icon: FileText },
          { tab: 'documents', label: 'HR Documents', icon: FileText },
          { tab: 'timeline', label: 'Action Timeline', icon: Clock }
        ].map(t => {
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
        
        {/* 0. OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
            <div className="card" style={{ padding: '1.5rem' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Personal Profile Info</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.875rem' }}>
                <div><span style={{ color: 'var(--text-secondary)' }}>Full Name:</span> <strong style={{ color: 'var(--text-main)' }}>{teacher.first_name} {teacher.middle_name} {teacher.last_name}</strong></div>
                <div><span style={{ color: 'var(--text-secondary)' }}>Contact Email:</span> <strong style={{ color: 'var(--text-main)' }}>{teacher.email || 'N/A'}</strong></div>
                <div><span style={{ color: 'var(--text-secondary)' }}>Mobile Phone:</span> <strong style={{ color: 'var(--text-main)' }}>{teacher.phone || 'N/A'}</strong></div>
                <div><span style={{ color: 'var(--text-secondary)' }}>Employee ID Code:</span> <strong style={{ color: 'var(--text-main)' }}>{teacher.employee_id || 'N/A'}</strong></div>
                <div><span style={{ color: 'var(--text-secondary)' }}>Current Status:</span> <span className={`badge badge-${teacher.status === 'ACTIVE' ? 'success' : 'danger'}`}>{teacher.status || 'ACTIVE'}</span></div>
                <div><span style={{ color: 'var(--text-secondary)' }}>Date of Joining:</span> <strong style={{ color: 'var(--text-main)' }}>{teacher.joining_date ? new Date(teacher.joining_date).toLocaleDateString() : 'N/A'}</strong></div>
              </div>
            </div>
 
            <div className="card" style={{ padding: '1.5rem' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Professional Experience & Qualifications</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.875rem' }}>
                <div><span style={{ color: 'var(--text-secondary)' }}>Educational Qualifications:</span> <strong style={{ color: 'var(--text-main)' }}>{teacher.qualification || 'No qualification listed'}</strong></div>
                <div><span style={{ color: 'var(--text-secondary)' }}>Professional Experience:</span> <strong style={{ color: 'var(--text-main)' }}>{teacher.experience || 'No experience details specified'}</strong></div>
                <div><span style={{ color: 'var(--text-secondary)' }}>Assigned Department:</span> <strong style={{ color: 'var(--text-main)' }}>{teacher.department || 'General Academics'}</strong></div>
                <div><span style={{ color: 'var(--text-secondary)' }}>Staff Designation:</span> <strong style={{ color: 'var(--text-main)' }}>{teacher.designation || 'Classroom Teacher'}</strong></div>
                <div><span style={{ color: 'var(--text-secondary)' }}>System User Portal Login:</span> {teacher.user_id ? (
                  <span style={{ color: 'var(--success)', fontWeight: '700' }}>Active & Linked ✓</span>
                ) : (
                  <button className="btn btn-secondary btn-sm" onClick={() => setShowLoginModal(true)} style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', height: 'auto', display: 'inline-flex' }}>
                    Provision Portal Login
                  </button>
                )}</div>
              </div>
            </div>
          </div>
        )}
 
        {/* 1. SUBJECTS TAB (VIEW-ONLY) */}
        {activeTab === 'subjects' && (
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--primary-soft)', border: '1px solid var(--primary-border)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: '500' }}>
                ℹ️ Subject assignments are managed centrally under Academic Setup.
              </span>
              <Link to="/academic-setup?tab=assignments" style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--primary)' }} className="hover-underline">
                Go to Subject Assignments →
              </Link>
            </div>
 
            <h4 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-main)', marginBottom: '1rem' }}>Taught Subjects Directory</h4>
 
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
              {assignments.map(assign => {
                const sub = subjects.find(s => s.id === assign.subject_id);
                if (!sub) return null;
                return (
                  <div key={assign.id} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '1rem', background: 'var(--bg-subtle)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ fontWeight: '700', color: 'var(--text-main)', fontSize: '0.9rem' }}>{sub.subject_name}</span>
                      <span className="badge" style={{ fontSize: '0.7rem' }}>{sub.subject_code}</span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.5rem' }}>
                      <div>Class level: {getProgramLabel()} {programs.find(p => p.id === assign.course_id)?.name || 'Unknown'}</div>
                      <div>Periods: <strong style={{ color: 'var(--text-main)' }}>{sub.weekly_hours || 4} Periods / week</strong></div>
                      <div>Absent Students Today: <span style={{ color: 'var(--danger)', fontWeight: '700' }}>4 students absent today</span></div>
                      <div>Next Class: <span style={{ color: 'var(--primary)', fontWeight: '700' }}>Tomorrow 9:30 AM</span></div>
                    </div>
                  </div>
                );
              })}
              {assignments.length === 0 && (
                <div style={{ color: 'var(--text-secondary)', gridColumn: 'span 3', padding: '3rem 0', textAlign: 'center' }}>
                  <p style={{ marginBottom: '1rem' }}>No taught subjects configured yet.</p>
                  <Link to="/academic-setup?tab=assignments" className="btn btn-secondary btn-sm" style={{ height: 'auto', padding: '0.4rem 0.8rem' }}>
                    Go to Subject Assignments →
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
 
        {/* 2. CLASSES TAB (VIEW-ONLY) */}
        {activeTab === 'classes' && (
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--primary-soft)', border: '1px solid var(--primary-border)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: '500' }}>
                ℹ️ Class allocations are managed centrally.
              </span>
              <Link to="/academic-setup?tab=assignments" style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--primary)' }} className="hover-underline">
                Go to Subject Assignments →
              </Link>
            </div>
 
            <h4 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-main)', marginBottom: '1rem' }}>Mapped Class Sections</h4>
 
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
              {(() => {
                const uniqueSectionIds = Array.from(new Set(assignments.map(a => a.section_id)));
                return uniqueSectionIds.map(secId => {
                  const sec = sections.find(s => s.id === secId);
                  if (!sec) return null;
                  const secAssignments = assignments.filter(a => a.section_id === secId);
                  const subNames = secAssignments.map(a => {
                    const sub = subjects.find(s => s.id === a.subject_id);
                    return sub?.subject_name;
                  }).filter(Boolean).join(', ');
 
                  return (
                    <div key={secId} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '1rem', background: 'var(--bg-subtle)' }}>
                      <div style={{ fontWeight: '700', color: 'var(--text-main)', fontSize: '0.95rem', marginBottom: '0.5rem' }}>Section {sec.name}</div>
                      <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <div>Room No: <strong style={{ color: 'var(--text-main)' }}>{sec.room || 'No Room Mapped'}</strong></div>
                        <div>Taught Subjects: <strong style={{ color: 'var(--text-main)' }}>{subNames}</strong></div>
                        <div>Enrolled Students: <strong style={{ color: 'var(--text-main)' }}>42 students</strong></div>
                        <div>Weekly Periods: <strong style={{ color: 'var(--text-main)' }}>7 periods</strong></div>
                      </div>
                    </div>
                  );
                });
              })()}
              {assignments.length === 0 && (
                <div style={{ color: 'var(--text-secondary)', gridColumn: 'span 3', padding: '3rem 0', textAlign: 'center' }}>
                  <p style={{ marginBottom: '1rem' }}>No classes mapped yet.</p>
                  <Link to="/academic-setup?tab=assignments" className="btn btn-secondary btn-sm" style={{ height: 'auto', padding: '0.4rem 0.8rem' }}>
                    Go to Subject Assignments →
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. TIMETABLE TAB */}
        {activeTab === 'timetable' && (
          <div className="card" style={{ padding: '1.25rem' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-main)', marginBottom: '1.25rem' }}>Weekly Teacher Schedule</h4>
            {timetableSlots.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-secondary)' }}>
                <Calendar size={32} style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }} />
                <p>No timetable configurations created yet.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <th style={{ textAlign: 'left', padding: '0.5rem' }}>Slot Time</th>
                      {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => (
                        <th key={day} style={{ textAlign: 'left', padding: '0.5rem' }}>{day}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {timetableSlots
                      .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''))
                      .map(slot => (
                        <tr key={slot.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '0.65rem 0.5rem', fontWeight: '700' }}>
                            <div>{slot.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>{slot.start_time} - {slot.end_time}</div>
                          </td>
                          {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => {
                            const entry = timetableEntries.find(e => e.slot_id === slot.id && e.day_of_week === day);
                            return (
                              <td key={day} style={{ padding: '0.65rem 0.5rem', background: entry ? 'var(--primary-soft)' : 'none' }}>
                                {entry ? (
                                  <div>
                                    <div style={{ fontWeight: '700', color: 'var(--text-main)' }}>{entry.subject_name}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Class: {entry.section_name}</div>
                                  </div>
                                ) : (
                                  <span style={{ color: 'var(--text-muted)' }}>-</span>
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

        {/* 4. WORKLOAD TAB */}
        {activeTab === 'workload' && (
          <div className="card" style={{ padding: '1.25rem' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-main)', marginBottom: '1.25rem' }}>Teacher Workload Breakdown</h4>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
              <div>
                <h5 style={{ fontWeight: '600', fontSize: '0.9rem', marginBottom: '0.75rem' }}>Weekly Workload Balance Meter</h5>
                
                {(() => {
                  const percent = Math.min(100, Math.round((totalAllocatedPeriods / 24) * 100));
                  const barBlocks = Math.min(10, Math.round(percent / 10));
                  const barStr = '█'.repeat(barBlocks) + '░'.repeat(10 - barBlocks);
                  return (
                    <div style={{ padding: '1rem', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', marginBottom: '1.5rem' }}>
                      <div style={{ fontFamily: 'monospace', fontSize: '1.65rem', letterSpacing: '4px', color: isOverloaded ? 'var(--danger)' : 'var(--success)' }}>
                        {barStr}
                      </div>
                      <div style={{ marginTop: '0.75rem', fontWeight: '800', fontSize: '1.25rem', color: 'var(--text-main)' }}>
                        {totalAllocatedPeriods} / 24 periods
                      </div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                        {percent}% Load &bull; <strong style={{ color: isOverloaded ? 'var(--danger)' : 'var(--success)' }}>{isOverloaded ? 'Overloaded' : percent > 75 ? 'Optimal Heavy' : 'Healthy'}</strong>
                      </div>
                    </div>
                  );
                })()}
 
                {isOverloaded && (
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', background: 'var(--danger-soft)', color: 'var(--danger)', border: '1px solid var(--danger-border)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
                    <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '0.1rem' }} />
                    <div>
                      <strong>Overload Warning:</strong> This teacher's mapped assignments exceed the healthy workload of 24 periods per week. Reallocate some subjects to other teachers in Academic Setup.
                    </div>
                  </div>
                )}
              </div>
 
              <div>
                <h5 style={{ fontWeight: '600', fontSize: '0.9rem', marginBottom: '0.75rem' }}>Breakdown by Class & Subject</h5>
                <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <th style={{ textAlign: 'left', padding: '0.5rem' }}>Class</th>
                      <th style={{ textAlign: 'left', padding: '0.5rem' }}>Subject</th>
                      <th style={{ textAlign: 'right', padding: '0.5rem' }}>Periods</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignments.map(assign => {
                      const sub = subjects.find(s => s.id === assign.subject_id);
                      const sec = sections.find(s => s.id === assign.section_id);
                      return (
                        <tr key={assign.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '0.5rem' }}>{sec?.name || 'Unknown'}</td>
                          <td style={{ padding: '0.5rem' }}>{sub?.subject_name || 'Unknown'}</td>
                          <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: '700' }}>{sub?.weekly_hours || 4} Periods</td>
                        </tr>
                      );
                    })}
                    {assignments.length === 0 && (
                      <tr>
                        <td colSpan={3} style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-secondary)' }}>No assignments recorded.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 5. LEAVE TAB */}
        {activeTab === 'leave' && (
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-main)' }}>Leave Balances & Applications</h4>
              <button className="btn btn-primary" onClick={() => setShowLeaveModal(true)}>
                Apply Leave
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem', alignItems: 'start' }}>
              <div>
                <h5 style={{ fontWeight: '600', fontSize: '0.9rem', marginBottom: '0.75rem' }}>Leave Balance (Days)</h5>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {teacherBalances.map(bal => (
                    <div key={bal.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-subtle)', fontSize: '0.85rem' }}>
                      <span style={{ fontWeight: '600' }}>{bal.leave_type_name}</span>
                      <span>Remaining: <strong style={{ color: 'var(--primary)' }}>{bal.remaining_days}</strong> / {bal.allocated_days} days</span>
                    </div>
                  ))}
                  {teacherBalances.length === 0 && (
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No leave balances seeded for this year.</div>
                  )}
                </div>
              </div>

              <div>
                <h5 style={{ fontWeight: '600', fontSize: '0.9rem', marginBottom: '0.75rem' }}>Leave History & Applications</h5>
                <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <th style={{ textAlign: 'left', padding: '0.5rem' }}>Date Range</th>
                      <th style={{ textAlign: 'left', padding: '0.5rem' }}>Type</th>
                      <th style={{ textAlign: 'center', padding: '0.5rem' }}>Days</th>
                      <th style={{ textAlign: 'left', padding: '0.5rem' }}>Reason</th>
                      <th style={{ textAlign: 'right', padding: '0.5rem' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaveApplications.map(app => (
                      <tr key={app.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '0.5rem' }}>{new Date(app.from_date).toLocaleDateString()} - {new Date(app.to_date).toLocaleDateString()}</td>
                        <td style={{ padding: '0.5rem' }}>{app.leave_type_name}</td>
                        <td style={{ padding: '0.5rem', textAlign: 'center' }}>{app.days_count}</td>
                        <td style={{ padding: '0.5rem', color: 'var(--text-secondary)' }}>{app.reason}</td>
                        <td style={{ padding: '0.5rem', textAlign: 'right' }}>
                          <span className={`badge badge-${app.status === 'APPROVED' ? 'success' : app.status === 'REJECTED' ? 'danger' : 'warning'}`}>
                            {app.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {leaveApplications.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-secondary)' }}>No leave applications logged.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 6. PAYROLL TAB */}
        {activeTab === 'payroll' && (
          <div className="card" style={{ padding: '1.25rem' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-main)', marginBottom: '1.25rem' }}>Salary Structure & Payslip Archives</h4>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '1.5rem', alignItems: 'start' }}>
              <div>
                <h5 style={{ fontWeight: '600', fontSize: '0.9rem', marginBottom: '0.75rem' }}>Monthly Salary Structure</h5>
                {salaryStructure ? (
                  <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <tbody>
                      <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '0.5rem', color: 'var(--text-secondary)' }}>Basic Salary</td>
                        <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: '700' }}>₹{basicSalary.toLocaleString()}</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '0.5rem', color: 'var(--text-secondary)' }}>DA (Dearness Allowance)</td>
                        <td style={{ padding: '0.5rem', textAlign: 'right' }}>₹{da.toLocaleString()}</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '0.5rem', color: 'var(--text-secondary)' }}>HRA (House Rent Allowance)</td>
                        <td style={{ padding: '0.5rem', textAlign: 'right' }}>₹{hra.toLocaleString()}</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '0.5rem', color: 'var(--text-secondary)' }}>Other Allowances</td>
                        <td style={{ padding: '0.5rem', textAlign: 'right' }}>₹{allowances.toLocaleString()}</td>
                      </tr>
                      <tr style={{ background: 'var(--bg-subtle)' }}>
                        <td style={{ padding: '0.65rem 0.5rem', fontWeight: '700' }}>Gross Monthly Salary</td>
                        <td style={{ padding: '0.65rem 0.5rem', textAlign: 'right', fontWeight: '800', color: 'var(--primary)' }}>₹{grossSalary.toLocaleString()}</td>
                      </tr>
                    </tbody>
                  </table>
                ) : (
                  <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    No active salary structure configured for this teacher yet.
                  </div>
                )}
              </div>

              <div>
                <h5 style={{ fontWeight: '600', fontSize: '0.9rem', marginBottom: '0.75rem' }}>Issued Payslips List</h5>
                <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <th style={{ textAlign: 'left', padding: '0.5rem' }}>Month/Year</th>
                      <th style={{ textAlign: 'center', padding: '0.5rem' }}>Days Present</th>
                      <th style={{ textAlign: 'right', padding: '0.5rem' }}>Net Pay</th>
                      <th style={{ textAlign: 'right', padding: '0.5rem' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payslips.map(slip => (
                      <tr key={slip.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '0.5rem' }}>{slip.month}/{slip.year}</td>
                        <td style={{ padding: '0.5rem', textAlign: 'center' }}>{slip.present_days} / {slip.working_days} days</td>
                        <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: '700' }}>₹{(slip.net_salary || 0).toLocaleString()}</td>
                        <td style={{ padding: '0.5rem', textAlign: 'right' }}>
                          <button className="btn btn-secondary" style={{ padding: '0.2rem 0.4rem', fontSize: '0.75rem', height: 'auto' }} onClick={() => navigate(`/payroll/runs/${slip.payroll_run_id}`)}>
                            View Slip
                          </button>
                        </td>
                      </tr>
                    ))}
                    {payslips.length === 0 && (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-secondary)' }}>No payslips generated for this teacher yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
 
        {/* 7. DOCUMENTS TAB */}
        {activeTab === 'documents' && (
          <div className="card teacher-tab-panel-card">
            <h4 className="teacher-details-title-66" style={{ marginBottom: '0.25rem' }}>HR Documents Checklist</h4>
            <p className="teacher-details-text-35" style={{ marginBottom: '1.5rem' }}>
              Verify and manage crucial employee files for compliance audits.
            </p>
 
            <div className="teacher-details-div-96">
              <table className="teacher-details-table">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ textAlign: 'left', padding: '0.75rem 0.5rem' }}>Document Type</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem 0.5rem' }}>Status</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem 0.5rem' }}>File Name</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem 0.5rem' }}>Uploaded Date</th>
                    <th style={{ textAlign: 'right', padding: '0.75rem 0.5rem' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {teacherDocs.map(doc => (
                    <tr key={doc.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.75rem 0.5rem', fontWeight: '700' }}>{doc.label}</td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <span className={`badge badge-${doc.status === 'UPLOADED' ? 'success' : 'danger'}`}>
                          {doc.status}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', color: doc.fileName ? 'var(--text-main)' : 'var(--text-muted)' }}>
                        {doc.fileName || 'No file uploaded'}
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-secondary)' }}>
                        {doc.date ? new Date(doc.date).toLocaleDateString() : '-'}
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                        {doc.status === 'UPLOADED' ? (
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button 
                              className="btn btn-secondary btn-sm" 
                              style={{ height: 'auto', padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                              onClick={() => toastInfo(`Downloading ${doc.fileName}...`)}
                            >
                              <Download size={12} /> Download
                            </button>
                            <button 
                              className="btn btn-sm" 
                              style={{ height: 'auto', padding: '0.2rem 0.5rem', fontSize: '0.75rem', backgroundColor: 'var(--danger-soft)', color: 'var(--danger)', border: 'none' }}
                              onClick={() => {
                                if (!window.confirm('Are you sure you want to delete this document?')) return;
                                const updated = teacherDocs.map(d => d.id === doc.id ? { ...d, fileName: '', status: 'PENDING', date: '' } : d);
                                setTeacherDocs(updated);
                                localStorage.setItem(`teacher_docs_${id}`, JSON.stringify(updated));
                                toastSuccess(`${doc.label} deleted successfully`);
                              }}
                            >
                              <Trash2 size={12} /> Delete
                            </button>
                          </div>
                        ) : (
                          <button 
                            className="btn btn-primary btn-sm" 
                            style={{ height: 'auto', padding: '0.2rem 0.5rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                            onClick={() => {
                              const dummyName = `${doc.id}_verified_${new Date().getFullYear()}.pdf`;
                              const todayStr = new Date().toISOString().split('T')[0];
                              const updated = teacherDocs.map(d => d.id === doc.id ? { ...d, fileName: dummyName, status: 'UPLOADED', date: todayStr } : d);
                              setTeacherDocs(updated);
                              localStorage.setItem(`teacher_docs_${id}`, JSON.stringify(updated));
                              toastSuccess(`${doc.label} uploaded successfully!`);
                            }}
                          >
                            <Upload size={12} /> Upload File
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
 
        {/* 8. TIMELINE TAB */}
        {activeTab === 'timeline' && (
          <div className="card teacher-tab-panel-card">
            <div className="teacher-details-timeline-header-row">
              <h4 className="teacher-details-title-66 teacher-details-timeline-title">Action Audit Timeline</h4>
              <button 
                className="btn btn-secondary btn-sm" 
                onClick={() => {
                  setTimelineForm({ title: '', desc: '' });
                  setShowTimelineModal(true);
                }}
              >
                + Add Event Log
              </button>
            </div>
 
            <div className="teacher-details-timeline-log-list">
              {timelineEvents.map(evt => (
                <div key={evt.id} className="teacher-details-timeline-item-container">
                  <div className="teacher-details-timeline-bullet-node" />
                  <div className="teacher-details-timeline-date">{evt.date}</div>
                  <h5 className="teacher-details-timeline-event-title">{evt.title}</h5>
                  <p className="teacher-details-timeline-event-desc">{evt.desc}</p>
                </div>
              ))}
              {timelineEvents.length === 0 && (
                <div className="teacher-details-timeline-empty">No timeline logs present.</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* --- APPLY LEAVE MODAL --- */}
      {showLeaveModal && (
        <div className="teacher-details-modal-overlay">
          <div className="card modal-content teacher-details-modal-card">
            <h3 className="teacher-details-modal-title">Apply for Leave</h3>
            <form onSubmit={handleApplyLeave} className="teacher-details-modal-form">
              <div className="teacher-details-form-group-col">
                <label className="teacher-details-form-label-styled">Leave Type *</label>
                <select 
                  value={leaveForm.leave_type_id} 
                  onChange={e => setLeaveForm({ ...leaveForm, leave_type_id: e.target.value })}
                  className="input"
                  required
                >
                  {leaveTypes.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.code})</option>
                  ))}
                </select>
              </div>

              <div className="teacher-details-form-row-2col">
                <div className="teacher-details-form-group-col">
                  <label className="teacher-details-form-label-styled">From Date *</label>
                  <input 
                    type="date" 
                    value={leaveForm.from_date} 
                    onChange={e => setLeaveForm({ ...leaveForm, from_date: e.target.value })}
                    className="input"
                    required
                  />
                </div>

                <div className="teacher-details-form-group-col">
                  <label className="teacher-details-form-label-styled">To Date *</label>
                  <input 
                    type="date" 
                    value={leaveForm.to_date} 
                    onChange={e => setLeaveForm({ ...leaveForm, to_date: e.target.value })}
                    className="input"
                    required
                  />
                </div>
              </div>

              <div className="teacher-details-form-group-col">
                <label className="teacher-details-form-label-styled">Days Count *</label>
                <input 
                  type="number" 
                  value={leaveForm.days_count} 
                  onChange={e => setLeaveForm({ ...leaveForm, days_count: parseInt(e.target.value) || 1 })}
                  className="input"
                  min="1"
                  required
                />
              </div>

              <div className="teacher-details-form-group-col">
                <label className="teacher-details-form-label-styled">Reason *</label>
                <textarea 
                  value={leaveForm.reason} 
                  onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                  className="input"
                  placeholder="Reason for leave..."
                  rows={3}
                  required
                />
              </div>

              <div className="teacher-details-modal-actions-row">
                <button type="button" onClick={() => setShowLeaveModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submittingLeave}>
                  {submittingLeave ? 'Submitting...' : 'Apply'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- EDIT PROFILE MODAL --- */}
      {showEditModal && (
        <div className="teacher-details-modal-overlay">
          <div className="card modal-content teacher-details-modal-card-wide">
            <h3 className="teacher-details-modal-title">Edit Teacher Profile</h3>
            
            <div className="teacher-details-edit-tabs-nav">
              <button 
                type="button" 
                className={`teacher-details-edit-tab-btn${editTab === 'personal' ? ' is-active' : ''}`} 
                onClick={() => setEditTab('personal')}
              >
                Personal Details
              </button>
              <button 
                type="button" 
                className={`teacher-details-edit-tab-btn${editTab === 'professional' ? ' is-active' : ''}`} 
                onClick={() => setEditTab('professional')}
              >
                Professional Details
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="teacher-details-modal-form">
              {editTab === 'personal' && (
                <div className="teacher-details-form-row-2col">
                  <div className="teacher-details-form-group-col">
                    <label className="teacher-details-form-label-styled">First Name</label>
                    <input type="text" value={editForm.first_name} onChange={e => setEditForm({ ...editForm, first_name: e.target.value })} className="input" required />
                  </div>
                  <div className="teacher-details-form-group-col">
                    <label className="teacher-details-form-label-styled">Last Name</label>
                    <input type="text" value={editForm.last_name} onChange={e => setEditForm({ ...editForm, last_name: e.target.value })} className="input" required />
                  </div>
                  <div className="teacher-details-form-group-col">
                    <label className="teacher-details-form-label-styled">Email</label>
                    <input type="email" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} className="input" />
                  </div>
                  <div className="teacher-details-form-group-col">
                    <label className="teacher-details-form-label-styled">Phone</label>
                    <input type="text" value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} className="input" />
                  </div>
                </div>
              )}

              {editTab === 'professional' && (
                <div className="teacher-details-form-row-2col">
                  <div className="teacher-details-form-group-col">
                    <label className="teacher-details-form-label-styled">Employee ID</label>
                    <input type="text" value={editForm.employee_id} onChange={e => setEditForm({ ...editForm, employee_id: e.target.value })} className="input" />
                  </div>
                  <div className="teacher-details-form-group-col">
                    <label className="teacher-details-form-label-styled">Department</label>
                    <select value={editForm.department} onChange={e => setEditForm({ ...editForm, department: e.target.value })} className="input">
                      <option value="">Select Department</option>
                      {departments.map(d => (
                        <option key={d.id} value={d.name}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="teacher-details-form-group-col">
                    <label className="teacher-details-form-label-styled">Designation</label>
                    <input type="text" value={editForm.designation} onChange={e => setEditForm({ ...editForm, designation: e.target.value })} className="input" />
                  </div>
                  <div className="teacher-details-form-group-col">
                    <label className="teacher-details-form-label-styled">Joining Date</label>
                    <input type="date" value={editForm.joining_date} onChange={e => setEditForm({ ...editForm, joining_date: e.target.value })} className="input" />
                  </div>
                </div>
              )}

              <div className="teacher-details-modal-actions-row-large">
                <button type="button" onClick={() => setShowEditModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- CREATE LOGIN ACCOUNT MODAL --- */}
      {showLoginModal && (
        <div className="teacher-details-modal-overlay">
          <div className="card modal-content teacher-details-modal-card">
            <h3 className="teacher-details-modal-title">Link Login Credentials</h3>
            <form onSubmit={handleCreateLogin} className="teacher-details-modal-form">
              <div className="teacher-details-form-group-col">
                <label className="teacher-details-form-label-styled">Username *</label>
                <input type="text" value={loginUsername} onChange={e => setLoginUsername(e.target.value)} className="input" required />
              </div>
              <div className="teacher-details-form-group-col">
                <label className="teacher-details-form-label-styled">Email *</label>
                <input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} className="input" required />
              </div>
              <div className="teacher-details-form-group-col">
                <label className="teacher-details-form-label-styled">Password *</label>
                <input type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} className="input" required />
              </div>

              <div className="teacher-details-modal-actions-row">
                <button type="button" onClick={() => setShowLoginModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={creatingLogin}>
                  {creatingLogin ? 'Creating...' : 'Provision Login'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ADD TIMELINE EVENT MODAL --- */}
      {showTimelineModal && (
        <div className="teacher-details-modal-overlay">
          <div className="card modal-content teacher-details-modal-card">
            <h3 className="teacher-details-modal-title">Add Timeline Audit Log</h3>
            <form onSubmit={handleTimelineSubmit} className="teacher-details-modal-form">
              <div className="teacher-details-form-group-col">
                <label htmlFor="timeline-title-input" className="teacher-details-form-label-styled">Event Title *</label>
                <input 
                  id="timeline-title-input"
                  type="text" 
                  value={timelineForm.title} 
                  onChange={e => setTimelineForm({ ...timelineForm, title: e.target.value })}
                  className="input"
                  placeholder="e.g. Profile Details Updated"
                  required 
                />
              </div>
              <div className="teacher-details-form-group-col">
                <label htmlFor="timeline-desc-textarea" className="teacher-details-form-label-styled">Event Description *</label>
                <textarea 
                  id="timeline-desc-textarea"
                  value={timelineForm.desc} 
                  onChange={e => setTimelineForm({ ...timelineForm, desc: e.target.value })}
                  className="input"
                  placeholder="Provide brief details about this audit log entry..."
                  rows={3}
                  required 
                />
              </div>
 
              <div className="teacher-details-modal-actions-row">
                <button type="button" onClick={() => setShowTimelineModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Add Log</button>
              </div>
            </form>
          </div>
        </div>
      )}
 
    </Layout>
  );
}
