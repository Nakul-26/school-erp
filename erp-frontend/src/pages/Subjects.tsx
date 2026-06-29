import React, { useEffect, useState } from 'react';
import { PageGuidance } from '../components/PageGuidance';
import { useNavigate, useLocation } from 'react-router-dom';
import Layout from '../components/Layout';
import WorkspaceShell from '../components/WorkspaceShell';
import type { BreadcrumbItem, KPIProps, HealthCheckItem } from '../components/WorkspaceShell';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { 
  Eye, 
  Trash2,
  BookOpen, 
  Users, 
  Calendar, 
  Clock, 
  Activity, 
  Plus, 
  Search, 
  Edit2, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  PlusCircle, 
  Trash, 
  Check, 
  RotateCcw,
  Sparkles,
  HelpCircle,
  TrendingUp,
  Sliders,
  History
} from 'lucide-react';

interface WizardRow {
  key: string;
  section_id: string;
  subject_id: string;
  teacher_id: string;
  theory_hours: number;
  practical_hours: number;
  tutorial_hours: number;
  mentoring_hours: number;
  admin_hours: number;
  primary_teacher: boolean;
  remarks: string;
}

export default function Subjects() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  // Page access check
  const roles = user?.roles || (user?.role ? [user.role] : []);
  const isAdminOrHOD = roles.some(r => ['admin', 'super_admin', 'Principal', 'HOD', 'Super Admin'].includes(r));

  // Top level tabs state
  const [mainTab, setMainTab] = useState<'subjects-list' | 'subject-assignments'>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('tab') === 'assignments' ? 'subject-assignments' : 'subjects-list';
  });

  // Keep tab state in sync with URL search params reactively
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab') === 'assignments' ? 'subject-assignments' : 'subjects-list';
    if (tabParam !== mainTab) {
      setMainTab(tabParam);
    }
  }, [location.search]);

  const handleMainTabChange = (tab: 'subjects-list' | 'subject-assignments') => {
    setMainTab(tab);
    if (tab === 'subject-assignments') {
      navigate('?tab=assignments', { replace: true });
    } else {
      navigate('?', { replace: true });
    }
  };

  // Shared States (Loaded in a single unified call)
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);

  // Loading States
  const [loading, setLoading] = useState(true);
  const [loadingData, setLoadingData] = useState(true);
  const [institutionType, setInstitutionType] = useState<string>('college');
  const [institutionTypeLoaded, setInstitutionTypeLoaded] = useState<boolean>(false);

  // Tab 1: Subjects List Modal and Form States
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [subjectForm, setSubjectForm] = useState({ 
    subject_name: '', 
    subject_code: '', 
    credits: 3, 
    semester: 1, 
    course_id: '' 
  });

  // Tab 2: Subject Assignments Filters and Tab States
  const [selectedYearId, setSelectedYearId] = useState<string>('');
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');
  const [selectedProgId, setSelectedProgId] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [searchText, setSearchText] = useState<string>('');
  const [activeAssignmentTab, setActiveAssignmentTab] = useState<string>('overview');

  // Tab 2: Core Data States
  const [allocations, setAllocations] = useState<any[]>([]);
  const [dashboardStats, setDashboardStats] = useState<any>({
    activeAllocations: 0,
    healthyTeachers: 0,
    overloadedTeachers: 0,
    unallocatedSubjects: 0,
    conflicts: 0
  });
  const [conflictsList, setConflictsList] = useState<any[]>([]);
  const [timelineLogs, setTimelineLogs] = useState<any[]>([]);
  const [teacherLoads, setTeacherLoads] = useState<any[]>([]);

  // Tab 2: Modal Form States
  const [showAllocationFormModal, setShowAllocationFormModal] = useState<boolean>(false);
  const [editingAllocationId, setEditingAllocationId] = useState<string | null>(null);
  const [allocationFormError, setAllocationFormError] = useState<string | null>(null);
  const [allocationFormWarning, setAllocationFormWarning] = useState<string | null>(null);
  const [allocationForm, setAllocationForm] = useState({
    teacher_id: '',
    section_id: '',
    subject_id: '',
    theory_hours: 4,
    practical_hours: 0,
    tutorial_hours: 0,
    mentoring_hours: 0,
    admin_hours: 0,
    primary_teacher: true,
    remarks: '',
    status: 'Active'
  });

  // Tab 2: Bulk Wizard States
  const [wizardRows, setWizardRows] = useState<WizardRow[]>([]);
  const [bulkPreview, setBulkPreview] = useState<{
    success: boolean;
    errors: string[];
    warnings: string[];
    total_allocations: number;
  } | null>(null);
  const [bulkLoading, setBulkLoading] = useState<boolean>(false);

  const getProgramLabel = () => institutionType === 'school' ? 'Class' : 'Program';

  // Unified Initial Data Fetch
  useEffect(() => {
    fetchMetadata();
  }, []);

  const fetchMetadata = async () => {
    setLoading(true);
    try {
      const [years, depts, progs, secs, subs, techs] = await Promise.all([
        api.get('/academic-years').catch(() => []),
        api.get('/departments').catch(() => []),
        api.get('/programs').catch(() => []),
        api.get('/sections').catch(() => []),
        api.get('/subjects').catch(() => []),
        api.get('/teachers').catch(() => [])
      ]);

      setAcademicYears(years || []);
      setDepartments(depts || []);
      setPrograms(progs || []);
      setSections(secs || []);
      setSubjects(subs || []);
      setTeachers(techs || []);

      if (years && years.length > 0) {
        const activeYear = years.find((y: any) => y.is_active === 1) || years[0];
        setSelectedYearId(activeYear.id);
      }

      if (progs && progs.length > 0) {
        setSubjectForm(f => ({ ...f, course_id: progs[0].id }));
      }

      if (user?.institution_id && !institutionTypeLoaded) {
        const inst = await api.get(`/institutions/${user.institution_id}`);
        if (inst && inst.institution_type) {
          setInstitutionType(inst.institution_type);
        }
        setInstitutionTypeLoaded(true);
      }
    } catch (err) {
      console.error('Failed to load metadata', err);
    } finally {
      setLoading(false);
    }
  };

  // Helper to fetch subjects only (for fast refresh when adding/deleting subjects)
  const fetchSubjectsOnly = async () => {
    try {
      const subs = await api.get('/subjects');
      setSubjects(subs || []);
    } catch (err) {
      console.error('Failed to refresh subjects', err);
    }
  };

  // Fetch Page Core Data on Year/Filter change
  useEffect(() => {
    if (selectedYearId && mainTab === 'subject-assignments') {
      fetchDashboardAndAllocations();
    }
  }, [selectedYearId, selectedDeptId, selectedProgId, activeAssignmentTab, mainTab, teachers]);

  const fetchDashboardAndAllocations = async () => {
    setLoadingData(true);
    try {
      // 1. Fetch dashboard stats
      const stats = await api.get(`/teaching-allocations/dashboard?academic_year_id=${selectedYearId}`);
      setDashboardStats(stats);

      // 2. Fetch list of allocations (filtered by selected year, department, program)
      let listPath = `/teaching-allocations?academic_year_id=${selectedYearId}`;
      if (selectedDeptId) listPath += `&department_id=${selectedDeptId}`;
      if (selectedProgId) listPath += `&program_id=${selectedProgId}`;
      const listData = await api.get(listPath);
      setAllocations(listData || []);

      // 3. Tab specific loads
      if (activeAssignmentTab === 'conflicts') {
        const conflicts = await api.get(`/teaching-allocations/conflicts?academic_year_id=${selectedYearId}`);
        setConflictsList(conflicts || []);
      } else if (activeAssignmentTab === 'load') {
        // Calculate workload aggregates for all teachers
        const loads = await Promise.all(
          teachers.map(async (t) => {
            try {
              const loadData = await api.get(`/teaching-allocations/load/${t.id}?academic_year_id=${selectedYearId}`);
              return { teacher: t, load: loadData };
            } catch {
              return { teacher: t, load: { total_hours: 0, detail: [] } };
            }
          })
        );
        setTeacherLoads(loads);
      } else if (activeAssignmentTab === 'timeline') {
        const logs = await api.get('/audit-logs?module=teaching_allocations').catch(() => []);
        setTimelineLogs(logs || []);
      }
    } catch (err) {
      console.error('Failed to fetch allocation workspace data', err);
    } finally {
      setLoadingData(false);
    }
  };

  // Client-side search and status filtering
  const filteredAllocations = allocations.filter(item => {
    const statusMatch = selectedStatus === 'All' || item.status === selectedStatus;
    const teacherName = item.teacher_name?.toLowerCase() || '';
    const subjectName = item.subject_name?.toLowerCase() || '';
    const subjectCode = item.subject_code?.toLowerCase() || '';
    const sectionName = item.section_name?.toLowerCase() || '';
    const searchLower = searchText.toLowerCase();
    const textMatch = !searchText || 
      teacherName.includes(searchLower) ||
      subjectName.includes(searchLower) ||
      subjectCode.includes(searchLower) ||
      sectionName.includes(searchLower);

    return statusMatch && textMatch;
  });

  // Breadcrumbs setup
  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'Academic Setup', to: '/dashboard' },
    { label: 'Subjects & Assignments' }
  ];

  // System Health Indicator Details
  const getHealthStatus = () => {
    if (dashboardStats.conflicts > 3) {
      return {
        status: 'critical' as const,
        message: `High risk: Detected ${dashboardStats.conflicts} active allocation conflicts or teacher overloads in the current semester.`
      };
    } else if (dashboardStats.conflicts > 0 || dashboardStats.unallocatedSubjects > 0) {
      return {
        status: 'warning' as const,
        message: `Outstanding tasks: We have ${dashboardStats.unallocatedSubjects} subjects missing teachers and ${dashboardStats.conflicts} workload conflicts.`
      };
    }
    return {
      status: 'healthy' as const,
      message: 'All courses and sections are fully allocated, teacher loads are balanced.'
    };
  };

  const healthCheckChecks: HealthCheckItem[] = [
    {
      label: 'Balanced Teacher Workload',
      passed: dashboardStats.overloadedTeachers === 0,
      message: dashboardStats.overloadedTeachers > 0 
        ? `${dashboardStats.overloadedTeachers} faculty members exceed the recommended maximum 24 hours per week.` 
        : 'All teachers are below the maximum workload threshold.',
      cta: {
        label: 'View Load Bar Chart',
        onClick: () => setActiveAssignmentTab('load')
      }
    },
    {
      label: 'Fully Mapped Curriculum',
      passed: dashboardStats.unallocatedSubjects === 0,
      message: dashboardStats.unallocatedSubjects > 0 
        ? `${dashboardStats.unallocatedSubjects} subjects currently do not have any teaching assignments.` 
        : 'Every subject has at least one allocated teacher.',
      cta: {
        label: 'View Conflicts',
        onClick: () => setActiveAssignmentTab('conflicts')
      }
    },
    {
      label: 'No Duplicate Mappings',
      passed: (conflictsList.filter(c => c.type === 'error').length === 0),
      message: conflictsList.filter(c => c.type === 'error').length > 0
        ? `Detected duplicates or inactive mappings. Clean assignments required.`
        : 'No double-booking or reference clashes found.',
      cta: {
        label: 'Resolve Clashes',
        onClick: () => setActiveAssignmentTab('conflicts')
      }
    }
  ];

  // KPIs definition
  const kpis: KPIProps[] = [
    {
      label: 'Active Allocations',
      value: dashboardStats.activeAllocations,
      color: 'primary',
      description: 'Active teacher assignments',
      onClick: () => {
        setActiveAssignmentTab('overview');
        setSelectedStatus('Active');
      }
    },
    {
      label: 'Balanced Load Staff',
      value: dashboardStats.healthyTeachers,
      color: 'success',
      description: 'Teachers below max threshold',
      onClick: () => setActiveAssignmentTab('load')
    },
    {
      label: 'Overloaded Teachers',
      value: dashboardStats.overloadedTeachers,
      color: dashboardStats.overloadedTeachers > 0 ? 'danger' : 'success',
      description: 'Hours > 24 weekly limit',
      icon: dashboardStats.overloadedTeachers > 0 ? <AlertTriangle size={18} /> : null,
      onClick: () => setActiveAssignmentTab('load')
    },
    {
      label: 'Unassigned Subjects',
      value: dashboardStats.unallocatedSubjects,
      color: dashboardStats.unallocatedSubjects > 0 ? 'warning' : 'success',
      description: 'Subjects without faculty',
      onClick: () => setActiveAssignmentTab('conflicts')
    },
    {
      label: 'Active Warnings / Errors',
      value: dashboardStats.conflicts,
      color: dashboardStats.conflicts > 0 ? 'danger' : 'success',
      description: 'System-generated alerts',
      onClick: () => setActiveAssignmentTab('conflicts')
    }
  ];

  // Subject Actions
  const handleSubjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        subject_name: subjectForm.subject_name,
        subject_code: institutionType === 'school' 
          ? subjectForm.subject_name.toUpperCase().substring(0, 3) + Math.floor(100 + Math.random() * 900)
          : subjectForm.subject_code,
        semester: institutionType === 'school' ? 1 : subjectForm.semester,
        credits: institutionType === 'school' ? 0 : subjectForm.credits,
        course_id: subjectForm.course_id
      };
      await api.post('/subjects', payload);
      setShowSubjectModal(false);
      setSubjectForm({ 
        subject_name: '', 
        subject_code: '', 
        credits: 3, 
        semester: 1, 
        course_id: programs[0]?.id || '' 
      });
      fetchSubjectsOnly();
    } catch (err) {
      alert('Error creating subject');
    }
  };

  const handleSubjectDelete = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    try {
      await api.delete(`/subjects/${id}`);
      fetchSubjectsOnly();
    } catch (err) {
      alert('Error deleting');
    }
  };

  // Single Allocation Handlers
  const handleOpenCreateModal = () => {
    setEditingAllocationId(null);
    setAllocationFormError(null);
    setAllocationFormWarning(null);
    setAllocationForm({
      teacher_id: teachers[0]?.id || '',
      section_id: sections[0]?.id || '',
      subject_id: subjects[0]?.id || '',
      theory_hours: 4,
      practical_hours: 0,
      tutorial_hours: 0,
      mentoring_hours: 0,
      admin_hours: 0,
      primary_teacher: true,
      remarks: '',
      status: 'Active'
    });
    setShowAllocationFormModal(true);
  };

  const handleOpenEditModal = (alloc: any) => {
    setEditingAllocationId(alloc.id);
    setAllocationFormError(null);
    setAllocationFormWarning(null);
    setAllocationForm({
      teacher_id: alloc.teacher_id,
      section_id: alloc.section_id,
      subject_id: alloc.subject_id,
      theory_hours: alloc.theory_hours ?? 4,
      practical_hours: alloc.practical_hours ?? 0,
      tutorial_hours: alloc.tutorial_hours ?? 0,
      mentoring_hours: alloc.mentoring_hours ?? 0,
      admin_hours: alloc.admin_hours ?? 0,
      primary_teacher: alloc.primary_teacher === 1,
      remarks: alloc.remarks || '',
      status: alloc.status || 'Active'
    });
    setShowAllocationFormModal(true);
  };

  const handleSaveAllocationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAllocationFormError(null);
    setAllocationFormWarning(null);

    const section = sections.find(s => s.id === allocationForm.section_id);
    const subject = subjects.find(s => s.id === allocationForm.subject_id);
    const program = programs.find(p => p.id === section?.course_id);

    if (!section || !subject) {
      setAllocationFormError('Please select a valid section and subject.');
      return;
    }

    const payload = {
      ...allocationForm,
      academic_year_id: selectedYearId,
      department_id: program?.department_id || '',
      program_id: program?.id || '',
      semester: subject.semester || 1,
      year_number: section.year_number || Math.ceil((subject.semester || 1) / 2),
      primary_teacher: allocationForm.primary_teacher ? 1 : 0
    };

    try {
      if (editingAllocationId) {
        await api.put(`/teaching-allocations/${editingAllocationId}`, payload);
      } else {
        const response = await api.post('/teaching-allocations', payload);
        if (response.warning) {
          alert(response.warning);
        }
      }
      setShowAllocationFormModal(false);
      fetchDashboardAndAllocations();
    } catch (err: any) {
      setAllocationFormError(err.message || 'Saving allocation failed.');
    }
  };

  const handleDeleteAllocation = async (id: string) => {
    if (!confirm('Are you sure you want to remove this teaching assignment? This legacy assignment will be soft-deleted.')) return;
    try {
      await api.delete(`/teaching-allocations/${id}`);
      fetchDashboardAndAllocations();
    } catch (err: any) {
      alert(err.message || 'Error deleting allocation.');
    }
  };

  // Bulk Wizard Handlers
  const handleAddWizardRow = () => {
    const newRow: WizardRow = {
      key: Math.random().toString(36).substring(7),
      section_id: sections[0]?.id || '',
      subject_id: subjects.find(s => s.course_id === sections[0]?.course_id)?.id || subjects[0]?.id || '',
      teacher_id: teachers[0]?.id || '',
      theory_hours: 4,
      practical_hours: 0,
      tutorial_hours: 0,
      mentoring_hours: 0,
      admin_hours: 0,
      primary_teacher: true,
      remarks: ''
    };
    setWizardRows([...wizardRows, newRow]);
  };

  const handleUpdateWizardRow = (idx: number, fields: Partial<WizardRow>) => {
    const updated = [...wizardRows];
    
    if (fields.section_id) {
      const targetSec = sections.find(s => s.id === fields.section_id);
      if (targetSec) {
        const validSubjects = subjects.filter(s => s.course_id === targetSec.course_id);
        if (validSubjects.length > 0) {
          fields.subject_id = validSubjects[0].id;
        }
      }
    }

    const row = updated[idx];
    if (row) {
      updated[idx] = { ...row, ...fields };
    }
    setWizardRows(updated);
  };

  const handleRemoveWizardRow = (idx: number) => {
    const updated = [...wizardRows];
    updated.splice(idx, 1);
    setWizardRows(updated);
  };

  const handleBulkPreviewSubmit = async () => {
    if (wizardRows.length === 0) {
      alert('Please add at least one row to preview.');
      return;
    }
    setBulkLoading(true);
    setBulkPreview(null);

    const allocationsPayload = wizardRows.map(row => {
      const section = sections.find(s => s.id === row.section_id);
      const subject = subjects.find(s => s.id === row.subject_id);
      const program = programs.find(p => p.id === section?.course_id);

      return {
        teacher_id: row.teacher_id,
        section_id: row.section_id,
        subject_id: row.subject_id,
        department_id: program?.department_id || '',
        program_id: program?.id || '',
        semester: subject?.semester || 1,
        year_number: section?.year_number || Math.ceil((subject?.semester || 1) / 2),
        theory_hours: Number(row.theory_hours),
        practical_hours: Number(row.practical_hours),
        tutorial_hours: Number(row.tutorial_hours),
        mentoring_hours: Number(row.mentoring_hours),
        admin_hours: Number(row.admin_hours),
        primary_teacher: row.primary_teacher ? 1 : 0,
        remarks: row.remarks
      };
    });

    try {
      const result = await api.post('/teaching-allocations/bulk', {
        academic_year_id: selectedYearId,
        preview: true,
        allocations: allocationsPayload
      });
      setBulkPreview(result);
    } catch (err: any) {
      alert(err.message || 'Bulk preview validation failed.');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkCommitSubmit = async () => {
    if (wizardRows.length === 0) return;
    setBulkLoading(true);

    const allocationsPayload = wizardRows.map(row => {
      const section = sections.find(s => s.id === row.section_id);
      const subject = subjects.find(s => s.id === row.subject_id);
      const program = programs.find(p => p.id === section?.course_id);

      return {
        teacher_id: row.teacher_id,
        section_id: row.section_id,
        subject_id: row.subject_id,
        department_id: program?.department_id || '',
        program_id: program?.id || '',
        semester: subject?.semester || 1,
        year_number: section?.year_number || Math.ceil((subject?.semester || 1) / 2),
        theory_hours: Number(row.theory_hours),
        practical_hours: Number(row.practical_hours),
        tutorial_hours: Number(row.tutorial_hours),
        mentoring_hours: Number(row.mentoring_hours),
        admin_hours: Number(row.admin_hours),
        primary_teacher: row.primary_teacher ? 1 : 0,
        remarks: row.remarks
      };
    });

    try {
      const result = await api.post('/teaching-allocations/bulk', {
        academic_year_id: selectedYearId,
        preview: false,
        allocations: allocationsPayload
      });
      if (result.success) {
        alert(`Successfully allocated ${result.committed_count} assignments!`);
        setWizardRows([]);
        setBulkPreview(null);
        setActiveAssignmentTab('overview');
        fetchDashboardAndAllocations();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to commit allocations.');
    } finally {
      setBulkLoading(false);
    }
  };

  const getSubjectsForSection = (sectionId: string) => {
    const sec = sections.find(s => s.id === sectionId);
    if (!sec) return subjects;
    return subjects.filter(s => s.course_id === sec.course_id);
  };

  return (
    <Layout>
      {mainTab === 'subjects-list' ? (
        <PageGuidance
          title="Subjects"
          description="Use this page to manage the list of all subjects taught in the school."
          steps={[
            "Click \"Add Subject\" to create a new subject (e.g., Mathematics).",
            "Choose the grade level where this subject is taught.",
            "Enter the subject code and mark weightage details."
          ]}
        />
      ) : (
        <PageGuidance
          title="Teacher Allocations"
          description="Use this page to assign teachers to their respective subjects across class sections."
          steps={[
            "Find the class section and subject from the list.",
            "Select a teacher's name from the dropdown to assign them.",
            "View and manage all subject assignments for the school year."
          ]}
        />
      )}

      <div className="page-header">
        <div>
          <h2>Subjects & Assignments</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Manage subject curriculum and teacher classroom assignments.
          </p>
        </div>
        {mainTab === 'subjects-list' && (
          <button className="btn btn-primary" onClick={() => {
            setSubjectForm({ subject_name: '', subject_code: '', credits: 3, semester: 1, course_id: programs[0]?.id || '' });
            setShowSubjectModal(true);
          }}>Add Subject</button>
        )}
      </div>

      <div className="page-tabs" style={{ marginBottom: '1.5rem' }}>
        <button
          className={`page-tab${mainTab === 'subjects-list' ? ' active' : ''}`}
          onClick={() => handleMainTabChange('subjects-list')}
        >
          Subjects List
        </button>
        <button
          className={`page-tab${mainTab === 'subject-assignments' ? ' active' : ''}`}
          onClick={() => handleMainTabChange('subject-assignments')}
        >
          Subject Assignments
        </button>
      </div>

      {mainTab === 'subjects-list' ? (
        <div className="card" style={{ overflowX: 'auto' }}>
          {loading ? <p>Loading...</p> : (
            <table className="table">
              <thead>
                <tr>
                  {institutionType !== 'school' && <th>Code</th>}
                  <th>Name</th>
                  {institutionType !== 'school' && <th>Semester</th>}
                  {institutionType !== 'school' && <th>Credits</th>}
                  <th>{getProgramLabel()}</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {subjects.map(subject => (
                  <tr key={subject.id}>
                    {institutionType !== 'school' && <td style={{ fontFamily: 'monospace' }}>{subject.subject_code}</td>}
                    <td>
                      <span 
                        onClick={() => navigate(`/subjects/${subject.id}`)}
                        style={{ fontWeight: 700, color: 'var(--primary)', cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        {subject.subject_name}
                      </span>
                    </td>
                    {institutionType !== 'school' && <td>{subject.semester}</td>}
                    {institutionType !== 'school' && <td>{subject.credits}</td>}
                    <td>{programs.find(p => p.id === subject.course_id)?.name || 'Unknown'}</td>
                    <td>
                      <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                        <button className="btn btn-sm btn-secondary" onClick={() => navigate(`/subjects/${subject.id}`)} title="Open Subject Workspace" style={{ padding: '0.35rem' }}>
                          <Eye size={14} />
                        </button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleSubjectDelete(subject.id)} title="Delete Subject" style={{ padding: '0.35rem' }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {subjects.length === 0 && (
                  <tr>
                    <td colSpan={institutionType === 'school' ? 3 : 6} style={{ textAlign: 'center' }}>No subjects found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <WorkspaceShell
          title="Academic Allocation Hub"
          breadcrumbs={breadcrumbs}
          statusBadge={{ label: 'Active Semesters', type: 'success' }}
          health={{ ...getHealthStatus(), checks: healthCheckChecks }}
          kpis={kpis}
          tabs={[
            { id: 'overview', label: 'Overview roster', icon: <BookOpen size={16} /> },
            { id: 'load', label: 'Teacher Load', icon: <Activity size={16} />, ...(dashboardStats.overloadedTeachers > 0 ? { count: dashboardStats.overloadedTeachers } : {}) },
            { id: 'conflicts', label: 'Conflict Center', icon: <AlertTriangle size={16} />, ...(dashboardStats.conflicts > 0 ? { count: dashboardStats.conflicts } : {}) },
            ...(isAdminOrHOD ? [{ id: 'wizard', label: 'Bulk Wizard', icon: <Sparkles size={16} /> }] : []),
            { id: 'timeline', label: 'Timeline & Logs', icon: <History size={16} /> }
          ]}
          activeTab={activeAssignmentTab}
          onTabChange={(tab) => {
            setActiveAssignmentTab(tab);
            setBulkPreview(null);
          }}
          loading={loading}
          actions={
            isAdminOrHOD && (
              <button className="btn btn-primary" onClick={handleOpenCreateModal}>
                <Plus size={16} /> New Allocation
              </button>
            )
          }
        >
          {activeAssignmentTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="card filters" style={{ padding: '1rem', minHeight: 'fit-content' }}>
                <div className="search-container">
                  <Search size={18} />
                  <input 
                    type="text" 
                    placeholder="Search teacher, subject, section..." 
                    value={searchText} 
                    onChange={e => setSearchText(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', flex: 1, justifyContent: 'flex-end' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Academic Year</label>
                    <select 
                      style={{ padding: '0.45rem 1.5rem 0.45rem 0.75rem', width: 'auto' }} 
                      value={selectedYearId} 
                      onChange={e => setSelectedYearId(e.target.value)}
                    >
                      {academicYears.map(y => (
                        <option key={y.id} value={y.id}>{y.name} {y.is_active === 1 ? '(Active)' : ''}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Department</label>
                    <select 
                      style={{ padding: '0.45rem 1.5rem 0.45rem 0.75rem', width: 'auto' }}
                      value={selectedDeptId}
                      onChange={e => setSelectedDeptId(e.target.value)}
                    >
                      <option value="">All Departments</option>
                      {departments.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Course/Program</label>
                    <select 
                      style={{ padding: '0.45rem 1.5rem 0.45rem 0.75rem', width: 'auto' }}
                      value={selectedProgId}
                      onChange={e => setSelectedProgId(e.target.value)}
                    >
                      <option value="">All Programs</option>
                      {programs.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Status</label>
                    <select 
                      style={{ padding: '0.45rem 1.5rem 0.45rem 0.75rem', width: 'auto' }}
                      value={selectedStatus}
                      onChange={e => setSelectedStatus(e.target.value)}
                    >
                      <option value="All">All Statuses</option>
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="card" style={{ padding: 0 }}>
                {loadingData ? (
                  <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Loading allocations list...
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table" style={{ margin: 0 }}>
                      <thead>
                        <tr>
                          <th>Teacher</th>
                          <th>Subject</th>
                          <th>Section</th>
                          <th>Program & Dept</th>
                          <th>Classes/Hr</th>
                          <th>Primary</th>
                          <th>Status</th>
                          {isAdminOrHOD && <th style={{ textAlign: 'right' }}>Actions</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAllocations.map(alloc => (
                          <tr key={alloc.id}>
                            <td>
                              <span 
                                onClick={() => navigate(`/teachers/${alloc.teacher_id}`)}
                                style={{ fontWeight: 700, color: 'var(--primary)', cursor: 'pointer', textDecoration: 'underline' }}
                              >
                                {alloc.teacher_name}
                              </span>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Emp ID: {alloc.teacher_employee_id}</div>
                            </td>
                            <td>
                              <span 
                                onClick={() => navigate(`/subjects/${alloc.subject_id}`)}
                                style={{ fontWeight: 700, color: 'var(--primary)', cursor: 'pointer', textDecoration: 'underline' }}
                              >
                                {alloc.subject_name}
                              </span>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Code: {alloc.subject_code}</div>
                            </td>
                            <td>
                              <span 
                                onClick={() => navigate(`/classes/${alloc.section_id}`)}
                                style={{ fontWeight: 700, color: 'var(--primary)', cursor: 'pointer', textDecoration: 'underline' }}
                              >
                                {alloc.section_name}
                              </span>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Semester: {alloc.semester}</div>
                            </td>
                            <td>
                              <div style={{ fontWeight: 500 }}>{alloc.program_name}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{alloc.department_name}</div>
                            </td>
                            <td>
                              <div style={{ fontWeight: 600 }}>{alloc.classes_per_week} classes/wk</div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                Th:{alloc.theory_hours} | Pr:{alloc.practical_hours} | Tu:{alloc.tutorial_hours}
                              </div>
                            </td>
                            <td>
                              <span className={`badge ${alloc.primary_teacher === 1 ? 'badge-info' : 'badge-secondary'}`}>
                                {alloc.primary_teacher === 1 ? 'Primary' : 'Assistant'}
                              </span>
                            </td>
                            <td>
                              <span className={`badge ${alloc.status === 'Active' ? 'badge-success' : 'badge-danger'}`}>
                                {alloc.status}
                              </span>
                            </td>
                            {isAdminOrHOD && (
                              <td style={{ textAlign: 'right' }}>
                                <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                                  <button 
                                    className="btn btn-sm btn-secondary" 
                                    onClick={() => handleOpenEditModal(alloc)}
                                    title="Edit assignment"
                                    style={{ padding: '0.35rem' }}
                                  >
                                    <Edit2 size={13} />
                                  </button>
                                  <button 
                                    className="btn btn-sm btn-danger" 
                                    onClick={() => handleDeleteAllocation(alloc.id)}
                                    title="Remove assignment"
                                    style={{ padding: '0.35rem' }}
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        ))}
                        {filteredAllocations.length === 0 && (
                          <tr>
                            <td colSpan={isAdminOrHOD ? 8 : 7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                              No allocations found matching the filters.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeAssignmentTab === 'load' && (
            <div className="card" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 800, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <TrendingUp size={20} className="text-primary" /> Teacher Hours Load Distribution
              </h3>

              {loadingData ? (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Calculating teacher workloads...</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {teacherLoads.map(({ teacher, load }) => {
                    const total = load.total_hours;
                    const isOverloaded = total > 24;
                    const isPeak = total >= 18 && total <= 24;
                    const isHealthy = total > 0 && total < 18;

                    let progressColor = 'var(--primary)';
                    let statusText = 'Free';
                    let statusBadgeClass = 'badge-secondary';

                    if (isOverloaded) {
                      progressColor = 'var(--danger)';
                      statusText = 'Overloaded';
                      statusBadgeClass = 'badge-danger';
                    } else if (isPeak) {
                      progressColor = 'var(--warning)';
                      statusText = 'Peak Load';
                      statusBadgeClass = 'badge-warning';
                    } else if (isHealthy) {
                      progressColor = 'var(--success)';
                      statusText = 'Healthy';
                      statusBadgeClass = 'badge-success';
                    }

                    const progressPercent = Math.min((total / 24) * 100, 100);

                    return (
                      <div 
                        key={teacher.id} 
                        className="card kpi-clickable" 
                        style={{ padding: '1.25rem', border: '1px solid var(--border)', background: 'var(--bg-card)' }}
                        onClick={() => navigate(`/teachers/${teacher.id}`)}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.75rem' }}>
                          <div>
                            <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)' }}>{teacher.name}</h4>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{teacher.designation} • Dept: {teacher.department}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span className={`badge ${statusBadgeClass}`}>{statusText}</span>
                            <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>{total} / 24 Hours</span>
                          </div>
                        </div>

                        <div style={{ width: '100%', height: '10px', backgroundColor: '#f1f5f9', borderRadius: '9999px', overflow: 'hidden', marginBottom: '0.5rem' }}>
                          <div 
                            style={{ 
                              width: `${progressPercent}%`, 
                              height: '100%', 
                              backgroundColor: progressColor, 
                              borderRadius: '9999px',
                              transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)' 
                            }} 
                          />
                        </div>

                        {total > 0 && (
                          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {load.detail?.map((det: any, dIdx: number) => (
                              <span key={dIdx} style={{ background: '#f8fafc', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid var(--border)' }}>
                                <strong>{det.subject_name}</strong> ({det.section_name}): {det.hours} hrs
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeAssignmentTab === 'conflicts' && (
            <div className="card" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 800, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertTriangle size={20} className="text-warning" /> Conflict Center & Validation Rules
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                We automatically audit all allocations inside the active semester. Below are active system issues, warnings, and unallocated gaps that require immediate resolution.
              </p>

              {loadingData ? (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Checking validation logs...</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {conflictsList.map((conflict, idx) => {
                    const isError = conflict.type === 'error';
                    return (
                      <div 
                        key={idx} 
                        className="card" 
                        style={{ 
                          padding: '1.25rem', 
                          borderLeft: `4px solid ${isError ? 'var(--danger)' : 'var(--warning)'}`,
                          background: 'var(--bg-card)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '1rem'
                        }}
                      >
                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', flex: 1 }}>
                          <span style={{ marginTop: '0.15rem' }}>
                            {isError ? <AlertCircle className="text-danger" size={18} /> : <AlertTriangle className="text-warning" size={18} />}
                          </span>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-main)' }}>
                              {isError ? 'System Error Clashing' : 'System Workload Warning'}
                            </div>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>{conflict.message}</p>
                          </div>
                        </div>

                        {isAdminOrHOD && (
                          <div>
                            {conflict.action_type === 'ASSIGN_TEACHER' && (
                              <button 
                                className="btn btn-outline btn-sm"
                                onClick={() => {
                                  setEditingAllocationId(null);
                                  setAllocationForm({
                                    teacher_id: teachers[0]?.id || '',
                                    section_id: sections[0]?.id || '',
                                    subject_id: conflict.record_id || subjects[0]?.id || '',
                                    theory_hours: 4,
                                    practical_hours: 0,
                                    tutorial_hours: 0,
                                    mentoring_hours: 0,
                                    admin_hours: 0,
                                    primary_teacher: true,
                                    remarks: 'Auto-resolved from Conflict Center',
                                    status: 'Active'
                                  });
                                  setShowAllocationFormModal(true);
                                }}
                              >
                                Assign Teacher
                              </button>
                            )}
                            {conflict.action_type === 'RESOLVE_DUPLICATE' && (
                              <button 
                                className="btn btn-danger btn-sm"
                                onClick={() => handleDeleteAllocation(conflict.record_id)}
                              >
                                Remove Clash
                              </button>
                            )}
                            {conflict.action_type === 'REMOVE_ALLOCATION' && (
                              <button 
                                className="btn btn-danger btn-sm"
                                onClick={() => handleDeleteAllocation(conflict.record_id)}
                              >
                                Delete Reference
                              </button>
                            )}
                            {conflict.action_type === 'REDUCE_LOAD' && (
                              <button 
                                className="btn btn-outline btn-sm"
                                onClick={() => {
                                  const matchingAlloc = allocations.find(a => a.teacher_id === conflict.record_id);
                                  if (matchingAlloc) {
                                    handleOpenEditModal(matchingAlloc);
                                  } else {
                                    setActiveAssignmentTab('load');
                                  }
                                }}
                              >
                                Reduce Load
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {conflictsList.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '3rem', border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)' }}>
                      <CheckCircle2 className="text-success" size={32} style={{ margin: '0 auto 0.75rem' }} />
                      <p style={{ fontWeight: 600, color: 'var(--text-main)' }}>Zero Conflicts Detected</p>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>The database is clean, all references are healthy.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeAssignmentTab === 'wizard' && isAdminOrHOD && (
            <div className="card" style={{ padding: '1.5rem', overflow: 'visible' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Sparkles size={20} className="text-primary" /> Bulk Allocation Spreadsheet Wizard
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Speed up configuration by mapping Section ↔ Subject ↔ Teacher directly in a grid.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn btn-outline" onClick={handleAddWizardRow}>
                    <PlusCircle size={16} /> Add Assignment Row
                  </button>
                  {wizardRows.length > 0 && (
                    <button className="btn btn-secondary" onClick={() => setWizardRows([])}>
                      <RotateCcw size={16} /> Reset
                    </button>
                  )}
                </div>
              </div>

              {wizardRows.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem 1.5rem', border: '2px dashed var(--border)', borderRadius: 'var(--radius-md)', background: '#f8fafc' }}>
                  <Sparkles className="text-primary" size={36} style={{ margin: '0 auto 1rem', opacity: 0.7 }} />
                  <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>Spreadsheet Empty</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '400px', margin: '0.25rem auto 1.25rem' }}>
                    Add rows to write allocations. Select class section, and we will automatically filter available subjects based on course program curriculum.
                  </p>
                  <button className="btn btn-primary" onClick={handleAddWizardRow}>
                    Add First Row
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div className="wizard-table-container">
                    <table className="wizard-table">
                      <thead>
                        <tr>
                          <th style={{ width: '22%' }}>Section</th>
                          <th style={{ width: '24%' }}>Subject</th>
                          <th style={{ width: '24%' }}>Teacher</th>
                          <th style={{ width: '8%', textAlign: 'center' }}>Theory Hrs</th>
                          <th style={{ width: '8%', textAlign: 'center' }}>Pract Hrs</th>
                          <th style={{ width: '8%', textAlign: 'center' }}>Tut Hrs</th>
                          <th style={{ width: '6%', textAlign: 'center' }}>Primary</th>
                          <th style={{ width: '6%', textAlign: 'center' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {wizardRows.map((row, idx) => {
                          const rowSubjects = getSubjectsForSection(row.section_id);
                          return (
                            <tr key={row.key}>
                              <td>
                                <select 
                                  className="wizard-select"
                                  value={row.section_id}
                                  onChange={e => handleUpdateWizardRow(idx, { section_id: e.target.value })}
                                >
                                  {sections.map(s => (
                                    <option key={s.id} value={s.id}>{s.name} (Year {s.year_number})</option>
                                  ))}
                                </select>
                              </td>
                              <td>
                                <select 
                                  className="wizard-select"
                                  value={row.subject_id}
                                  onChange={e => handleUpdateWizardRow(idx, { subject_id: e.target.value })}
                                >
                                  {rowSubjects.map(sub => (
                                    <option key={sub.id} value={sub.id}>{sub.subject_name} ({sub.subject_code})</option>
                                  ))}
                                  {rowSubjects.length === 0 && (
                                    <option value="">No subjects in Section Program</option>
                                  )}
                                </select>
                              </td>
                              <td>
                                <select 
                                  className="wizard-select"
                                  value={row.teacher_id}
                                  onChange={e => handleUpdateWizardRow(idx, { teacher_id: e.target.value })}
                                >
                                  {teachers.map(t => (
                                    <option key={t.id} value={t.id}>{t.name} (Emp ID: {t.employee_id})</option>
                                  ))}
                                </select>
                              </td>
                              <td>
                                <input 
                                  type="number" 
                                  className="wizard-input-hours"
                                  value={row.theory_hours}
                                  onChange={e => handleUpdateWizardRow(idx, { theory_hours: Math.max(0, Number(e.target.value)) })}
                                  min={0}
                                />
                              </td>
                              <td>
                                <input 
                                  type="number" 
                                  className="wizard-input-hours"
                                  value={row.practical_hours}
                                  onChange={e => handleUpdateWizardRow(idx, { practical_hours: Math.max(0, Number(e.target.value)) })}
                                  min={0}
                                />
                              </td>
                              <td>
                                <input 
                                  type="number" 
                                  className="wizard-input-hours"
                                  value={row.tutorial_hours}
                                  onChange={e => handleUpdateWizardRow(idx, { tutorial_hours: Math.max(0, Number(e.target.value)) })}
                                  min={0}
                                />
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <input 
                                  type="checkbox" 
                                  checked={row.primary_teacher}
                                  onChange={e => handleUpdateWizardRow(idx, { primary_teacher: e.target.checked })}
                                  style={{ transform: 'scale(1.25)', cursor: 'pointer' }}
                                />
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <button 
                                  className="btn btn-sm btn-outline btn-danger" 
                                  onClick={() => handleRemoveWizardRow(idx)}
                                  style={{ padding: '0.35rem' }}
                                >
                                  <Trash size={14} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <button 
                        className="btn btn-primary"
                        onClick={handleBulkPreviewSubmit}
                        disabled={bulkLoading}
                      >
                        {bulkLoading ? 'Validating...' : 'Validate & Preview allocations'}
                      </button>
                      
                      {bulkPreview && bulkPreview.errors.length === 0 && (
                        <button 
                          className="btn btn-success"
                          style={{ background: 'var(--success)', color: '#ffffff' }}
                          onClick={handleBulkCommitSubmit}
                          disabled={bulkLoading}
                        >
                          Commit allocations to DB
                        </button>
                      )}
                    </div>

                    {bulkPreview && (
                      <div 
                        className="card" 
                        style={{ 
                          padding: '1.25rem', 
                          border: '1px solid var(--border)',
                          borderLeft: `4px solid ${bulkPreview.errors.length > 0 ? 'var(--danger)' : 'var(--success)'}` 
                        }}
                      >
                        <h4 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {bulkPreview.errors.length > 0 ? <AlertCircle className="text-danger" size={16} /> : <CheckCircle2 className="text-success" size={16} />}
                          Validation Report: {bulkPreview.errors.length > 0 ? 'Failed' : 'Success'} ({bulkPreview.total_allocations} allocations)
                        </h4>

                        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', margin: '0.5rem 0' }}>
                          <span className="badge badge-success">✓ {bulkPreview.total_allocations} Verified</span>
                          <span className={`badge ${bulkPreview.errors.length > 0 ? 'badge-danger' : 'badge-secondary'}`}>
                            ✗ {bulkPreview.errors.length} Errors
                          </span>
                          <span className={`badge ${bulkPreview.warnings.length > 0 ? 'badge-warning' : 'badge-secondary'}`}>
                            ⚠ {bulkPreview.warnings.length} Warnings
                          </span>
                        </div>

                        {bulkPreview.errors.length > 0 && (
                          <div style={{ marginTop: '0.75rem' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--danger)' }}>Blocking Errors (Must resolve to commit):</span>
                            <ul style={{ paddingLeft: '1.25rem', marginTop: '0.25rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                              {bulkPreview.errors.map((e, idx) => <li key={idx}>{e}</li>)}
                            </ul>
                          </div>
                        )}

                        {bulkPreview.warnings.length > 0 && (
                          <div style={{ marginTop: '0.75rem' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--warning)' }}>Warnings (Allowed to commit):</span>
                            <ul style={{ paddingLeft: '1.25rem', marginTop: '0.25rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                              {bulkPreview.warnings.map((w, idx) => <li key={idx}>{w}</li>)}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeAssignmentTab === 'timeline' && (
            <div className="card" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 800, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <History size={20} className="text-primary" /> Teaching Allocations Audit Trail
              </h3>

              {loadingData ? (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Loading timeline records...</p>
              ) : (
                <div className="timeline-list">
                  {timelineLogs.map((log) => (
                    <div key={log.id} className="timeline-item">
                      <span className="timeline-marker" />
                      <div className="timeline-item-header">
                        <span className="timeline-item-title">{log.action.replace(/_/g, ' ')}</span>
                        <span className="timeline-item-time">{new Date(log.timestamp).toLocaleString()}</span>
                      </div>
                      <p className="timeline-item-desc">{log.description}</p>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                        Performed by: {log.user_name} ({log.user_email})
                      </div>
                    </div>
                  ))}
                  {timelineLogs.length === 0 && (
                    <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                      No audit records logged for teaching allocations yet.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </WorkspaceShell>
      )}

      {/* MODALS — TAB 1: SUBJECTS */}
      {showSubjectModal && (
        <div className="modal">
          <div className="modal-content" style={{ maxWidth: '440px' }}>
            <h3>Add Subject</h3>
            <form onSubmit={handleSubjectSubmit} style={{ marginTop: '1.25rem' }}>
              {institutionType !== 'school' && (
                <div className="form-group">
                  <label>Subject Code (e.g., CS301)</label>
                  <input type="text" value={subjectForm.subject_code} onChange={e => setSubjectForm({...subjectForm, subject_code: e.target.value})} required />
                </div>
              )}
              <div className="form-group">
                <label>Subject Name (e.g., Mathematics)</label>
                <input type="text" value={subjectForm.subject_name} onChange={e => setSubjectForm({...subjectForm, subject_name: e.target.value})} required />
              </div>
              {institutionType !== 'school' && (
                <>
                  <div className="form-group">
                    <label>Semester</label>
                    <input type="number" value={subjectForm.semester} onChange={e => setSubjectForm({...subjectForm, semester: parseInt(e.target.value) || 1})} required min="1" />
                  </div>
                  <div className="form-group">
                    <label>Credits</label>
                    <input type="number" value={subjectForm.credits} onChange={e => setSubjectForm({...subjectForm, credits: parseInt(e.target.value) || 0})} required min="0" />
                  </div>
                </>
              )}
              <div className="form-group">
                <label>{getProgramLabel()}</label>
                <select value={subjectForm.course_id} onChange={e => setSubjectForm({...subjectForm, course_id: e.target.value})} required>
                  {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowSubjectModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODALS — TAB 2: SUBJECT ASSIGNMENTS */}
      {showAllocationFormModal && (
        <div className="modal">
          <div className="modal-content" style={{ maxWidth: '520px' }}>
            <h3>{editingAllocationId ? 'Edit Teaching Assignment' : 'New Teaching Allocation'}</h3>
            
            <form onSubmit={handleSaveAllocationSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              <div className="form-group">
                <label>Class Section</label>
                <select 
                  value={allocationForm.section_id}
                  onChange={e => {
                    const secId = e.target.value;
                    const secSubjects = getSubjectsForSection(secId);
                    setAllocationForm({
                      ...allocationForm,
                      section_id: secId,
                      subject_id: secSubjects[0]?.id || allocationForm.subject_id
                    });
                  }}
                  disabled={!!editingAllocationId}
                  required
                >
                  {sections.map(s => (
                    <option key={s.id} value={s.id}>{s.name} (Year {s.year_number})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Subject</label>
                <select 
                  value={allocationForm.subject_id}
                  onChange={e => setAllocationForm({ ...allocationForm, subject_id: e.target.value })}
                  disabled={!!editingAllocationId}
                  required
                >
                  {getSubjectsForSection(allocationForm.section_id).map(sub => (
                    <option key={sub.id} value={sub.id}>{sub.subject_name} ({sub.subject_code})</option>
                  ))}
                  {getSubjectsForSection(allocationForm.section_id).length === 0 && (
                    <option value="">No subjects matched for this class program</option>
                  )}
                </select>
              </div>

              <div className="form-group">
                <label>Teacher</label>
                <select 
                  value={allocationForm.teacher_id}
                  onChange={e => setAllocationForm({ ...allocationForm, teacher_id: e.target.value })}
                  required
                >
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.name} (Emp ID: {t.employee_id})</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label>Theory Hrs/Wk</label>
                  <input 
                    type="number" 
                    value={allocationForm.theory_hours}
                    onChange={e => setAllocationForm({ ...allocationForm, theory_hours: Math.max(0, Number(e.target.value)) })}
                    min={0}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Practical Hrs/Wk</label>
                  <input 
                    type="number" 
                    value={allocationForm.practical_hours}
                    onChange={e => setAllocationForm({ ...allocationForm, practical_hours: Math.max(0, Number(e.target.value)) })}
                    min={0}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Tutorial Hrs/Wk</label>
                  <input 
                    type="number" 
                    value={allocationForm.tutorial_hours}
                    onChange={e => setAllocationForm({ ...allocationForm, tutorial_hours: Math.max(0, Number(e.target.value)) })}
                    min={0}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label>Mentoring Hrs/Wk</label>
                  <input 
                    type="number" 
                    value={allocationForm.mentoring_hours}
                    onChange={e => setAllocationForm({ ...allocationForm, mentoring_hours: Math.max(0, Number(e.target.value)) })}
                    min={0}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Admin Hrs/Wk</label>
                  <input 
                    type="number" 
                    value={allocationForm.admin_hours}
                    onChange={e => setAllocationForm({ ...allocationForm, admin_hours: Math.max(0, Number(e.target.value)) })}
                    min={0}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.5rem 0' }}>
                <input 
                  type="checkbox" 
                  id="primary_teacher"
                  checked={allocationForm.primary_teacher}
                  onChange={e => setAllocationForm({ ...allocationForm, primary_teacher: e.target.checked })}
                  style={{ transform: 'scale(1.25)', cursor: 'pointer' }}
                />
                <label htmlFor="primary_teacher" style={{ fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>
                  Assign as Primary Faculty for this Class
                </label>
              </div>

              <div className="form-group">
                <label>Remarks</label>
                <textarea 
                  value={allocationForm.remarks}
                  onChange={e => setAllocationForm({ ...allocationForm, remarks: e.target.value })}
                  placeholder="Notes, room numbers or special timetable rules..."
                  rows={2}
                />
              </div>

              {editingAllocationId && (
                <div className="form-group">
                  <label>Allocation Status</label>
                  <select 
                    value={allocationForm.status}
                    onChange={e => setAllocationForm({ ...allocationForm, status: e.target.value })}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              )}

              {allocationFormError && (
                <div style={{ color: 'var(--danger)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <AlertCircle size={14} /> {allocationFormError}
                </div>
              )}

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAllocationFormModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingAllocationId ? 'Save Changes' : 'Create Allocation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
