import React, { useEffect, useState } from 'react';
import { PageGuidance } from '../components/PageGuidance';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { api } from '../services/api';
import { 
  Plus, 
  Search, 
  Eye, 
  Edit2, 
  Edit3,
  Archive, 
  RefreshCw, 
  Calendar, 
  Users, 
  SlidersHorizontal, 
  Info, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  MapPin,
  Trash2,
  Shield,
  BookOpen,
  Check,
  X
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Classes() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Tab control: 'sections' (Class Sections) or 'programs' (Courses / Programs)
  const activeMainTab = searchParams.get('tab') === 'courses' ? 'programs' : 'sections';

  const setActiveMainTab = (tab: 'sections' | 'programs') => {
    setSearchParams({ tab: tab === 'programs' ? 'courses' : 'sections' });
  };

  // Shared Data States
  const [classes, setClasses] = useState<any[]>([]); // sections for the current filter
  const [allSections, setAllSections] = useState<any[]>([]); // all sections for details mapping
  const [years, setYears] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);

  // Terminology & Auth States
  const { user } = useAuth();
  const [institutionType, setInstitutionType] = useState<string>('college');

  // Terminology helpers
  const getProgramLabel = () => institutionType === 'school' ? 'Class' : 'Program';
  const getProgramsLabel = () => institutionType === 'school' ? 'Classes' : 'Programs';
  const getSectionTitle = () => institutionType === 'school' ? 'Sections' : 'Classes & Sections';

  // ----------------------------------------------------
  // TAB 1: SECTION STATE & FILTERS
  // ----------------------------------------------------
  const [sectionSearchQuery, setSectionSearchQuery] = useState('');
  const [sectionFilterYear, setSectionFilterYear] = useState('');
  const [sectionFilterProgram, setSectionFilterProgram] = useState('');
  const [sectionFilterStatus, setSectionFilterStatus] = useState('1'); // '1' = active, '0' = archived

  // Section Modals & Forms
  const [showSectionFormModal, setShowSectionFormModal] = useState(false);
  const [editingSection, setEditingSection] = useState<any>(null);
  const [sectionForm, setSectionForm] = useState({ 
    name: '', 
    year_number: 1, 
    academic_year_id: '', 
    course_id: '', 
    capacity: 40, 
    room: '', 
    class_teacher_id: '' 
  });

  const [showSectionDetailModal, setShowSectionDetailModal] = useState(false);
  const [selectedSection, setSelectedSection] = useState<any>(null);
  const [sectionDetailTab, setSectionDetailTab] = useState<'info' | 'roster' | 'timetable' | 'timeline'>('info');

  const [sectionStudents, setSectionStudents] = useState<any[]>([]);
  const [sectionTimetable, setSectionTimetable] = useState<any[]>([]);
  const [sectionLogs, setSectionLogs] = useState<any[]>([]);
  const [sectionDetailLoading, setSectionDetailLoading] = useState(false);

  // ----------------------------------------------------
  // TAB 2: PROGRAM STATE & FILTERS
  // ----------------------------------------------------
  const [programSearchQuery, setProgramSearchQuery] = useState('');
  const [programStatusFilter, setProgramStatusFilter] = useState<'ACTIVE' | 'ARCHIVED' | 'ALL'>('ACTIVE');
  const [programDeptFilter, setProgramDeptFilter] = useState<string>('ALL');

  // Program Modals & Forms
  const [showAddProgramModal, setShowAddProgramModal] = useState(false);
  const [showEditProgramModal, setShowEditProgramModal] = useState(false);
  const [showProgramDetailModal, setShowProgramDetailModal] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<any>(null);
  const [programDetailTab, setProgramDetailTab] = useState<'info' | 'syllabus' | 'sections' | 'timeline'>('info');

  const [addProgramForm, setAddProgramForm] = useState({ 
    name: '', 
    course_code: '', 
    duration_years: 1, 
    department_id: '', 
    semester_enabled: 0, 
    credit_system_enabled: 0, 
    electives_enabled: 0, 
    description: '' 
  });
  const [editProgramForm, setEditProgramForm] = useState({ 
    id: '', 
    name: '', 
    course_code: '', 
    duration_years: 1, 
    department_id: '', 
    semester_enabled: 0, 
    credit_system_enabled: 0, 
    electives_enabled: 0, 
    description: '' 
  });

  // ----------------------------------------------------
  // UNIFIED FETCH DATA
  // ----------------------------------------------------
  useEffect(() => {
    fetchData();
  }, [sectionFilterYear, sectionFilterProgram, sectionFilterStatus]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Build filter params for sections
      const params: Record<string, string> = {};
      if (sectionFilterYear) params.academic_year_id = sectionFilterYear;
      if (sectionFilterProgram) params.course_id = sectionFilterProgram;
      if (sectionFilterStatus) params.is_active = sectionFilterStatus;
      const queryStr = new URLSearchParams(params).toString();

      // Fetch all required data in a single unified block
      const [
        sectionsData,      // filtered sections for table
        allSectionsData,   // all sections for programs detail
        programsData,      // all programs (including archived)
        yearsData,         // academic years
        teachersData,      // teachers
        departmentsData,   // departments
        subjectsData       // subjects
      ] = await Promise.all([
        api.get(`/sections?${queryStr}`),
        api.get('/sections').catch(() => []),
        api.get('/programs?include_archived=true'),
        api.get('/academic-years'),
        api.get('/teachers').catch(() => []),
        api.get('/departments').catch(() => []),
        api.get('/subjects').catch(() => [])
      ]);

      setClasses(sectionsData || []);
      setAllSections(allSectionsData || []);
      setPrograms(programsData || []);
      setYears(yearsData || []);
      setTeachers(teachersData || []);
      setDepartments(departmentsData || []);
      setSubjects(subjectsData || []);

      // Terminology/Institution fetch
      if (user?.institution_id) {
        const inst = await api.get(`/institutions/${user.institution_id}`);
        if (inst && inst.institution_type) {
          setInstitutionType(inst.institution_type);
          
          setAddProgramForm(f => ({
            ...f,
            duration_years: inst.institution_type === 'school' ? 1 : 4
          }));
        }
      }

      // Initialize defaults for section form if needed
      setSectionForm(f => {
        const updated = { ...f };
        if (yearsData.length > 0 && !updated.academic_year_id) {
          updated.academic_year_id = yearsData[0].id;
        }
        if (programsData.length > 0 && !updated.course_id) {
          const activePrograms = programsData.filter((p: any) => p.is_active === 1);
          if (activePrograms.length > 0) {
            updated.course_id = activePrograms[0].id;
          } else {
            updated.course_id = programsData[0].id;
          }
        }
        return updated;
      });

    } catch (err) {
      console.error('Error fetching unified ERP data:', err);
    } finally {
      setLoading(false);
    }
  };

  // ----------------------------------------------------
  // SECTIONS ACTIONS (TAB 1)
  // ----------------------------------------------------
  const handleOpenSectionDetails = async (section: any) => {
    setSelectedSection(section);
    setSectionDetailTab('info');
    setShowSectionDetailModal(true);
    setSectionDetailLoading(true);
    try {
      const [studentsData, timetableData, logsData] = await Promise.all([
        api.get(`/students?section_id=${section.id}`).catch(() => []),
        api.get(`/weekly-timetable?section_id=${section.id}`).catch(() => []),
        api.get(`/audit-logs?module=sections&record_id=${section.id}`).catch(() => ({ data: [] }))
      ]);
      setSectionStudents(studentsData || []);
      setSectionTimetable(timetableData || []);
      setSectionLogs(logsData?.data || []);
    } catch (err) {
      console.error('Error fetching details', err);
    } finally {
      setSectionDetailLoading(false);
    }
  };

  const handleOpenCreateSection = () => {
    setEditingSection(null);
    setSectionForm({
      name: '',
      year_number: 1,
      academic_year_id: years[0]?.id || '',
      course_id: programs.filter(p => p.is_active === 1)[0]?.id || programs[0]?.id || '',
      capacity: 40,
      room: '',
      class_teacher_id: ''
    });
    setShowSectionFormModal(true);
  };

  const handleOpenEditSection = (section: any) => {
    setEditingSection(section);
    setSectionForm({
      name: section.name,
      year_number: section.year_number,
      academic_year_id: section.academic_year_id,
      course_id: section.course_id,
      capacity: section.capacity || 40,
      room: section.room || '',
      class_teacher_id: section.class_teacher_id || ''
    });
    setShowSectionFormModal(true);
  };

  const handleSectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: sectionForm.name,
        academic_year_id: sectionForm.academic_year_id,
        course_id: sectionForm.course_id,
        year_number: institutionType === 'school' ? 1 : sectionForm.year_number,
        capacity: sectionForm.capacity ? parseInt(sectionForm.capacity.toString(), 10) : null,
        room: sectionForm.room || null,
        class_teacher_id: sectionForm.class_teacher_id || null
      };

      if (editingSection) {
        await api.put(`/sections/${editingSection.id}`, payload);
      } else {
        await api.post('/sections', payload);
      }
      
      setShowSectionFormModal(false);
      setEditingSection(null);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Error processing request');
    }
  };

  const handleToggleSectionStatus = async (section: any) => {
    const action = section.is_active ? 'archive' : 'restore';
    if (!confirm(`Are you sure you want to ${action} this section?`)) return;
    try {
      await api.put(`/sections/${section.id}`, { is_active: section.is_active ? 0 : 1 });
      fetchData();
    } catch (err: any) {
      alert(err.error || err.message || `Error attempting to ${action} section`);
    }
  };

  const handleDeleteSection = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this section? This action is irreversible.')) return;
    try {
      await api.delete(`/sections/${id}`);
      fetchData();
    } catch (err: any) {
      alert(err.error || err.message || 'Error deleting section');
    }
  };

  // ----------------------------------------------------
  // PROGRAMS ACTIONS (TAB 2)
  // ----------------------------------------------------
  const handleAddProgramSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const codeVal = addProgramForm.course_code.trim().toUpperCase();
    const nameVal = addProgramForm.name.trim();

    if (codeVal.length < 2) {
      alert('Code/Identifier must be at least 2 characters.');
      return;
    }
    if (nameVal.length < 3) {
      alert('Name must be at least 3 characters.');
      return;
    }

    try {
      const payload = {
        ...addProgramForm,
        course_code: codeVal,
        name: nameVal,
        duration_years: institutionType === 'school' ? 1 : addProgramForm.duration_years,
        department_id: addProgramForm.department_id || null
      };
      await api.post('/programs', payload);
      setShowAddProgramModal(false);
      setAddProgramForm({ 
        name: '', 
        course_code: '', 
        duration_years: institutionType === 'school' ? 1 : 4, 
        department_id: '', 
        semester_enabled: 0, 
        credit_system_enabled: 0, 
        electives_enabled: 0, 
        description: '' 
      });
      fetchData();
    } catch (err: any) {
      alert(err.message || `Error creating ${getProgramLabel().toLowerCase()}`);
    }
  };

  const handleEditProgramSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const codeVal = editProgramForm.course_code.trim().toUpperCase();
    const nameVal = editProgramForm.name.trim();

    if (codeVal.length < 2) {
      alert('Code/Identifier must be at least 2 characters.');
      return;
    }
    if (nameVal.length < 3) {
      alert('Name must be at least 3 characters.');
      return;
    }

    try {
      await api.put(`/programs/${editProgramForm.id}`, {
        name: nameVal,
        course_code: codeVal,
        duration_years: institutionType === 'school' ? 1 : editProgramForm.duration_years,
        department_id: editProgramForm.department_id || null,
        semester_enabled: editProgramForm.semester_enabled,
        credit_system_enabled: editProgramForm.credit_system_enabled,
        electives_enabled: editProgramForm.electives_enabled,
        description: editProgramForm.description
      });
      setShowEditProgramModal(false);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Error updating record');
    }
  };

  const handleArchiveProgram = async (id: string) => {
    if (!confirm(`Are you sure you want to archive this ${getProgramLabel().toLowerCase()}? (It will restrict future enrollments)`)) return;
    try {
      await api.delete(`/programs/${id}`);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Error archiving program');
    }
  };

  const handleRestoreProgram = async (id: string) => {
    try {
      await api.post(`/programs/${id}/restore`, {});
      fetchData();
      alert(`${getProgramLabel()} restored successfully.`);
    } catch (err: any) {
      alert(err.message || 'Error restoring program');
    }
  };

  const openEditProgramModal = (prog: any) => {
    setEditProgramForm({
      id: prog.id,
      name: prog.name,
      course_code: prog.course_code,
      duration_years: prog.duration_years || 1,
      department_id: prog.department_id || '',
      semester_enabled: prog.semester_enabled || 0,
      credit_system_enabled: prog.credit_system_enabled || 0,
      electives_enabled: prog.electives_enabled || 0,
      description: prog.description || ''
    });
    setShowEditProgramModal(true);
  };

  const openProgramDetailModal = (prog: any) => {
    setSelectedProgram(prog);
    setProgramDetailTab('info');
    setShowProgramDetailModal(true);
  };

  // Helper mappings
  const getDeptCode = (deptId: string) => {
    const dept = departments.find(d => d.id === deptId);
    return dept ? dept.code : '-';
  };

  const getTeacherName = (teacherId: string) => {
    const t = teachers.find(teach => teach.id === teacherId);
    return t ? `${t.first_name} ${t.last_name}` : 'Not Assigned';
  };

  // ----------------------------------------------------
  // FILTERED DATASETS (CLIENT-SIDE)
  // ----------------------------------------------------
  
  // Section filters (client-side text query)
  const filteredClasses = classes.filter(cls => {
    const searchLower = sectionSearchQuery.toLowerCase();
    const nameMatch = cls.name.toLowerCase().includes(searchLower);
    const roomMatch = cls.room ? cls.room.toLowerCase().includes(searchLower) : false;
    const teacherMatch = cls.class_teacher_name ? cls.class_teacher_name.toLowerCase().includes(searchLower) : false;
    const programMatch = cls.course_name ? cls.course_name.toLowerCase().includes(searchLower) : false;
    return nameMatch || roomMatch || teacherMatch || programMatch;
  });

  // Programs filters (client-side text, status, and dept)
  const displayedPrograms = programs.filter(prog => {
    const matchesSearch = prog.name.toLowerCase().includes(programSearchQuery.toLowerCase()) || 
                          prog.course_code.toLowerCase().includes(programSearchQuery.toLowerCase());
    
    const matchesStatus = programStatusFilter === 'ACTIVE' ? prog.is_active === 1 : 
                          programStatusFilter === 'ARCHIVED' ? prog.is_active === 0 : true;

    const matchesDept = programDeptFilter === 'ALL' ? true : prog.department_id === programDeptFilter;

    return matchesSearch && matchesStatus && matchesDept;
  });

  // ----------------------------------------------------
  // STATISTICS COMPUTATIONS
  // ----------------------------------------------------
  
  // Sections KPIs
  const activeSections = classes.filter(c => c.is_active === 1);
  const totalSectionsCount = activeSections.length;
  const sectionsWithoutTeacher = activeSections.filter(c => !c.class_teacher_id).length;
  const totalCapacity = activeSections.reduce((acc, c) => acc + (c.capacity || 0), 0);
  const avgCapacity = totalSectionsCount > 0 ? Math.round(totalCapacity / totalSectionsCount) : 0;
  const enrolledStudentsCount = activeSections.reduce((acc, c) => acc + (c.student_count || 0), 0);

  // Programs KPIs
  const activePrograms = programs.filter(p => p.is_active === 1);
  const totalProgramsCount = activePrograms.length;
  const semesterEnabledCount = activePrograms.filter(p => p.semester_enabled === 1).length;
  const creditSystemCount = activePrograms.filter(p => p.credit_system_enabled === 1).length;

  // Group subjects by semester for selected program details
  const detailSubjects = selectedProgram
    ? subjects.filter(s => s.course_id === selectedProgram.id)
    : [];

  const detailSections = selectedProgram
    ? allSections.filter(sec => sec.course_id === selectedProgram.id)
    : [];

  const groupedSubjects: { [key: string]: any[] } = {};
  if (selectedProgram) {
    detailSubjects.forEach(s => {
      const label = s.semester ? `Semester ${s.semester}` : 'Annual / Year-based';
      if (!groupedSubjects[label]) groupedSubjects[label] = [];
      groupedSubjects[label].push(s);
    });
  }

  return (
    <Layout>
      {/* 1. Dynamic Page Guidance */}
      {activeMainTab === 'sections' ? (
        <PageGuidance
          title="Class Sections"
          description="Use this page to set up individual class sections (e.g., Grade 10 A) for the school year."
          steps={[
            "Click \"Add Section\" to create a new class section.",
            "Select the grade, enter section name, and assign a class teacher.",
            "View the student capacity and classroom numbers."
          ]}
        />
      ) : (
        <PageGuidance
          title="Classes / Grades"
          description="Use this page to define grade levels like Grade 8, Grade 9, or Grade 10 in the school."
          steps={[
            "Click \"Add Grade\" to register a grade level.",
            "Enter the grade name and choose which department it belongs to.",
            "Assign passing marks and maximum limits for classes."
          ]}
        />
      )}

      {/* 2. Page Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>Classes & Sections</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Manage school courses, classes, sections, and classroom allocations.
          </p>
        </div>
        <div>
          {activeMainTab === 'sections' ? (
            <button className="btn btn-primary" onClick={handleOpenCreateSection} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
              <Plus size={18} /> Add {institutionType === 'school' ? 'Section' : 'Class/Section'}
            </button>
          ) : (
            <button className="btn btn-primary" onClick={() => setShowAddProgramModal(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
              <Plus size={18} /> Add {getProgramLabel()}
            </button>
          )}
        </div>
      </div>

      {/* 3. Pill Tabs Switcher */}
      <div style={{ 
        display: 'flex', 
        gap: '0.5rem', 
        backgroundColor: 'var(--bg-surface)', 
        padding: '0.35rem', 
        borderRadius: 'var(--radius-lg)', 
        border: '1px solid var(--border)', 
        width: 'fit-content', 
        marginBottom: '2rem',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <button 
          onClick={() => setActiveMainTab('sections')}
          style={{
            padding: '0.625rem 1.5rem',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: 700,
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            backgroundColor: activeMainTab === 'sections' ? 'var(--primary)' : 'transparent',
            color: activeMainTab === 'sections' ? '#ffffff' : 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: activeMainTab === 'sections' ? 'var(--shadow-sm)' : 'none'
          }}
        >
          <SlidersHorizontal size={16} />
          Class Sections
        </button>
        <button 
          onClick={() => setActiveMainTab('programs')}
          style={{
            padding: '0.625rem 1.5rem',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: 700,
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            backgroundColor: activeMainTab === 'programs' ? 'var(--primary)' : 'transparent',
            color: activeMainTab === 'programs' ? '#ffffff' : 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: activeMainTab === 'programs' ? 'var(--shadow-sm)' : 'none'
          }}
        >
          <BookOpen size={16} />
          Courses / Programs
        </button>
      </div>

      {/* 4. Tab 1: Class Sections Content */}
      {activeMainTab === 'sections' && (
        <>
          {/* KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', boxShadow: 'var(--shadow-sm)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
                <SlidersHorizontal size={24} />
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Total Sections</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>{totalSectionsCount}</span>
              </div>
            </div>

            <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', boxShadow: 'var(--shadow-sm)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', color: '#dc2626' }}>
                <AlertTriangle size={24} />
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>No Class Teacher</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>{sectionsWithoutTeacher}</span>
              </div>
            </div>

            <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', boxShadow: 'var(--shadow-sm)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', color: '#059669' }}>
                <Info size={24} />
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Avg Capacity</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>{avgCapacity}</span>
              </div>
            </div>

            <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', boxShadow: 'var(--shadow-sm)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(139, 92, 246, 0.1)', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', color: '#7c3aed' }}>
                <Users size={24} />
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Active Enrolled</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>{enrolledStudentsCount}</span>
              </div>
            </div>
          </div>

          {/* Filters Bar */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1rem', marginBottom: '1.5rem', alignItems: 'center' }}>
            <div style={{ flex: '1', minWidth: '240px', position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                value={sectionSearchQuery}
                onChange={e => setSectionSearchQuery(e.target.value)}
                placeholder="Search by section name, room, or teacher..." 
                style={{ paddingLeft: '2.5rem', width: '100%' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <select value={sectionFilterYear} onChange={e => setSectionFilterYear(e.target.value)} style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', backgroundColor: 'var(--bg-main)', fontSize: '0.875rem' }}>
                <option value="">All Academic Years</option>
                {years.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
              </select>

              <select value={sectionFilterProgram} onChange={e => setSectionFilterProgram(e.target.value)} style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', backgroundColor: 'var(--bg-main)', fontSize: '0.875rem' }}>
                <option value="">All {getProgramLabel()}s</option>
                {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>

              <select value={sectionFilterStatus} onChange={e => setSectionFilterStatus(e.target.value)} style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', backgroundColor: 'var(--bg-main)', fontSize: '0.875rem' }}>
                <option value="1">Active Only</option>
                <option value="0">Archived Only</option>
                <option value="">All Statuses</option>
              </select>
              
              <button className="btn btn-secondary" onClick={fetchData} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                <RefreshCw size={14} /> Sync
              </button>
            </div>
          </div>

          {/* Table Listing */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem', gap: '1rem' }}>
                <RefreshCw className="spinner" size={32} style={{ color: 'var(--primary)' }} />
                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading sections database...</span>
              </div>
            ) : (
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'rgba(248, 250, 252, 0.5)' }}>
                    <th style={{ textAlign: 'left', padding: '1rem' }}>Section details</th>
                    {institutionType !== 'school' && <th style={{ textAlign: 'left', padding: '1rem' }}>Year Level</th>}
                    <th style={{ textAlign: 'left', padding: '1rem' }}>{getProgramLabel()}</th>
                    <th style={{ textAlign: 'left', padding: '1rem' }}>Classroom / Room</th>
                    <th style={{ textAlign: 'left', padding: '1rem' }}>Capacity Status</th>
                    <th style={{ textAlign: 'left', padding: '1rem' }}>Class Teacher</th>
                    <th style={{ textAlign: 'center', padding: '1rem' }}>Status</th>
                    <th style={{ textAlign: 'right', padding: '1rem' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClasses.map(cls => {
                    const isOverfilled = (cls.student_count || 0) >= (cls.capacity || 40);
                    const percent = Math.min(100, Math.round(((cls.student_count || 0) / (cls.capacity || 40)) * 100));
                    
                    return (
                      <tr key={cls.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background-color 0.2s' }} className="hover-row">
                        <td style={{ padding: '1rem' }}>
                          <span 
                            onClick={() => navigate(`/classes/${cls.id}`)}
                            style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.95rem', cursor: 'pointer', textDecoration: 'underline' }}
                          >
                            {cls.name}
                          </span>
                          <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>{cls.academic_year_name || 'No Year'}</span>
                        </td>
                        {institutionType !== 'school' && (
                           <td style={{ padding: '1rem', color: 'var(--text-main)' }}>Year {cls.year_number}</td>
                        )}
                        <td style={{ padding: '1rem', color: 'var(--text-main)', fontWeight: 500 }}>
                          {cls.course_name || 'Unknown'}
                        </td>
                        <td style={{ padding: '1rem' }}>
                          {cls.room ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-main)', fontSize: '0.9rem' }}>
                              <MapPin size={14} style={{ color: 'var(--text-muted)' }} /> {cls.room}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Not Assigned</span>
                          )}
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', width: '130px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600 }}>
                              <span style={{ color: isOverfilled ? '#dc2626' : 'var(--text-main)' }}>{cls.student_count || 0} / {cls.capacity || 40}</span>
                              <span style={{ color: 'var(--text-muted)' }}>{percent}%</span>
                            </div>
                            <div style={{ width: '100%', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{ 
                                width: `${percent}%`, 
                                height: '100%', 
                                borderRadius: '3px', 
                                backgroundColor: percent > 100 ? '#ef4444' : percent >= 85 ? '#f97316' : '#10b981'
                              }} />
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          {cls.class_teacher_name ? (
                            <span style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.9rem' }}>{cls.class_teacher_name}</span>
                          ) : (
                            <span style={{ display: 'inline-block', padding: '0.125rem 0.5rem', borderRadius: 'var(--radius-sm)', backgroundColor: '#f1f5f9', color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>
                              Unassigned
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '0.25rem 0.625rem',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            backgroundColor: cls.is_active ? '#dcfce7' : '#fef3c7',
                            color: cls.is_active ? '#15803d' : '#b45309'
                          }}>
                            {cls.is_active ? 'Active' : 'Archived'}
                          </span>
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                            <button className="btn btn-sm btn-outline" onClick={() => handleOpenSectionDetails(cls)} title="View Section Dossier" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                              <Info size={12} /> Dossier
                            </button>
                            <button className="btn btn-sm btn-secondary" onClick={() => navigate(`/classes/${cls.id}`)} title="Open Section Workspace" style={{ padding: '0.35rem' }}>
                              <Eye size={14} />
                            </button>
                            <button className="btn btn-sm btn-secondary" onClick={() => handleOpenEditSection(cls)} title="Edit details" style={{ padding: '0.35rem' }}>
                              <Edit2 size={14} />
                            </button>
                            <button className="btn btn-sm btn-secondary" onClick={() => handleToggleSectionStatus(cls)} title={cls.is_active ? 'Archive section' : 'Restore section'} style={{ padding: '0.35rem' }}>
                              <Archive size={14} />
                            </button>
                            {!cls.is_active && (
                              <button className="btn btn-sm btn-danger" onClick={() => handleDeleteSection(cls.id)} title="Delete permanently" style={{ padding: '0.35rem' }}>
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredClasses.length === 0 && (
                    <tr>
                      <td colSpan={institutionType === 'school' ? 7 : 8} style={{ textAlign: 'center', padding: '4rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                          <Users size={32} style={{ color: 'var(--text-muted)' }} />
                          <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>No Classes or Sections Found</span>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Try clearing filters or search to broaden search boundaries.</span>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* 5. Tab 2: Courses / Programs Content */}
      {activeMainTab === 'programs' && (
        <>
          {/* KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.5rem', minHeight: '110px' }}>
              <div style={{ padding: '0.75rem', backgroundColor: '#e0e7ff', borderRadius: 'var(--radius-md)', color: 'var(--primary)' }}>
                <Shield size={24} />
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Total Active</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>{totalProgramsCount}</span>
              </div>
            </div>

            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.5rem', minHeight: '110px' }}>
              <div style={{ padding: '0.75rem', backgroundColor: '#ecfdf5', borderRadius: 'var(--radius-md)', color: '#059669' }}>
                <Calendar size={24} />
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Semester Based</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>{semesterEnabledCount}</span>
              </div>
            </div>

            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.5rem', minHeight: '110px' }}>
              <div style={{ padding: '0.75rem', backgroundColor: '#fffbeb', borderRadius: 'var(--radius-md)', color: '#d97706' }}>
                <BookOpen size={24} />
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Credit System</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>{creditSystemCount}</span>
              </div>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="card filters" style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem', padding: '1rem' }}>
            <div className="search-container" style={{ flex: '1 1 300px', display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid var(--border)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)' }}>
              <Search size={18} color="var(--text-muted)" />
              <input 
                type="text" 
                placeholder={`Search by ${getProgramLabel().toLowerCase()} name or code...`} 
                value={programSearchQuery}
                onChange={(e) => setProgramSearchQuery(e.target.value)}
                style={{ border: 'none', width: '100%', outline: 'none', background: 'transparent', fontSize: '0.875rem' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {institutionType !== 'school' && (
                <select 
                  value={programDeptFilter} 
                  onChange={(e) => setProgramDeptFilter(e.target.value)}
                  style={{ padding: '0.5rem 1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem', outline: 'none' }}
                >
                  <option value="ALL">All Departments</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              )}
              <select 
                value={programStatusFilter} 
                onChange={(e) => setProgramStatusFilter(e.target.value as any)}
                style={{ padding: '0.5rem 1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem', outline: 'none' }}
              >
                <option value="ACTIVE">Active Only</option>
                <option value="ARCHIVED">Archived Only</option>
                <option value="ALL">All Statuses</option>
              </select>
              <button className="btn btn-secondary" onClick={fetchData} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                <RefreshCw size={14} /> Sync
              </button>
            </div>
          </div>

          {/* Main Grid Table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {loading ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '1rem' }}>Code</th>
                      <th style={{ textAlign: 'left', padding: '1rem' }}>Name</th>
                      {institutionType !== 'school' && <th style={{ textAlign: 'left', padding: '1rem' }}>Department</th>}
                      {institutionType !== 'school' && <th style={{ textAlign: 'center', padding: '1rem' }}>Duration</th>}
                      <th style={{ textAlign: 'center', padding: '1rem' }}>Semesters</th>
                      <th style={{ textAlign: 'center', padding: '1rem' }}>Credits</th>
                      <th style={{ textAlign: 'center', padding: '1rem' }}>Status</th>
                      <th style={{ textAlign: 'right', padding: '1rem' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedPrograms.map(prog => (
                      <tr key={prog.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '1rem' }}>
                          <code style={{ fontSize: '0.9rem', fontWeight: 700, backgroundColor: '#f1f5f9', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)', color: 'var(--text-main)' }}>
                            {prog.course_code}
                          </code>
                        </td>
                        <td style={{ padding: '1rem', fontWeight: 600 }}>{prog.name}</td>
                        {institutionType !== 'school' && <td style={{ padding: '1rem' }}>{getDeptCode(prog.department_id)}</td>}
                        {institutionType !== 'school' && (
                          <td style={{ padding: '1rem', textAlign: 'center' }}>
                            {prog.duration_years} {prog.duration_years === 1 ? 'Year' : 'Years'}
                          </td>
                        )}
                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                          {prog.semester_enabled === 1 ? <Check size={16} color="var(--success)" style={{ margin: '0 auto' }} /> : <X size={16} color="var(--secondary)" style={{ margin: '0 auto' }} />}
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                          {prog.credit_system_enabled === 1 ? <Check size={16} color="var(--success)" style={{ margin: '0 auto' }} /> : <X size={16} color="var(--secondary)" style={{ margin: '0 auto' }} />}
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                          <span className={`badge badge-${prog.is_active === 1 ? 'success' : 'secondary'}`}>
                            {prog.is_active === 1 ? 'ACTIVE' : 'ARCHIVED'}
                          </span>
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button 
                              onClick={() => openProgramDetailModal(prog)} 
                              className="btn btn-sm btn-outline" 
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                            >
                              <Eye size={12} /> View
                            </button>
                            <button 
                              onClick={() => openEditProgramModal(prog)} 
                              className="btn btn-sm btn-secondary" 
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                            >
                              <Edit3 size={12} /> Edit
                            </button>
                            {prog.is_active === 1 ? (
                              <button 
                                onClick={() => handleArchiveProgram(prog.id)} 
                                className="btn btn-sm btn-outline-danger" 
                                style={{ color: 'var(--danger)', borderColor: 'var(--danger)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                              >
                                <Trash2 size={12} /> Archive
                              </button>
                            ) : (
                              <button 
                                onClick={() => handleRestoreProgram(prog.id)} 
                                className="btn btn-sm btn-outline-success" 
                                style={{ color: 'var(--success)', borderColor: 'var(--success)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                              >
                                <RefreshCw size={12} /> Restore
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {displayedPrograms.length === 0 && (
                      <tr>
                        <td colSpan={institutionType === 'school' ? 6 : 8} style={{ textAlign: 'center', padding: '3rem' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                            <Shield size={48} color="#cbd5e1" />
                            <h4 style={{ margin: 0, fontWeight: 700, color: 'var(--text-main)' }}>No {getProgramsLabel()} Found</h4>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Try adjusting filters or add a new {getProgramLabel().toLowerCase()}.</p>
                            <button className="btn btn-primary btn-sm" onClick={() => setShowAddProgramModal(true)} style={{ marginTop: '0.5rem' }}>
                              Add {getProgramLabel()}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ----------------------------------------------------
          MODALS SECTION
         ---------------------------------------------------- */}

      {/* Modal A: Add / Edit Section */}
      {showSectionFormModal && (
        <div className="modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.45)', zIndex: 1000 }}>
          <div className="modal-content" style={{ backgroundColor: '#ffffff', borderRadius: 'var(--radius-lg)', maxWidth: '480px', width: '100%', padding: '2rem', boxShadow: 'var(--shadow-lg)', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '1.25rem' }}>
              {editingSection ? `Edit Class/Section: ${editingSection.name}` : `Add New ${institutionType === 'school' ? 'Section' : 'Class/Section'}`}
            </h3>
            <form onSubmit={handleSectionSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.35rem', display: 'block' }}>Section Name *</label>
                <input 
                  type="text" 
                  value={sectionForm.name} 
                  onChange={e => setSectionForm({...sectionForm, name: e.target.value})} 
                  placeholder="e.g. Section A, Section B, A"
                  required 
                />
              </div>

              {institutionType !== 'school' && (
                <div className="form-group">
                  <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.35rem', display: 'block' }}>Year Level *</label>
                  <input 
                    type="number" 
                    value={sectionForm.year_number} 
                    onChange={e => setSectionForm({...sectionForm, year_number: parseInt(e.target.value, 10) || 1})} 
                    required 
                    min="1" 
                  />
                </div>
              )}

              <div className="form-group">
                <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.35rem', display: 'block' }}>{getProgramLabel()} *</label>
                <select value={sectionForm.course_id} onChange={e => setSectionForm({...sectionForm, course_id: e.target.value})} required>
                  {programs.map(p => {
                    if (p.is_active !== 1 && p.id !== sectionForm.course_id) return null;
                    return <option key={p.id} value={p.id}>{p.name}{p.is_active !== 1 ? ' (Archived)' : ''}</option>;
                  })}
                </select>
              </div>

              <div className="form-group">
                <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.35rem', display: 'block' }}>Academic Year *</label>
                <select value={sectionForm.academic_year_id} onChange={e => setSectionForm({...sectionForm, academic_year_id: e.target.value})} required>
                  {years.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.35rem', display: 'block' }}>Room / Location</label>
                  <input 
                    type="text" 
                    value={sectionForm.room} 
                    onChange={e => setSectionForm({...sectionForm, room: e.target.value})} 
                    placeholder="e.g. Room 302"
                  />
                </div>

                <div className="form-group">
                  <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.35rem', display: 'block' }}>Max Capacity *</label>
                  <input 
                    type="number" 
                    value={sectionForm.capacity} 
                    onChange={e => setSectionForm({...sectionForm, capacity: parseInt(e.target.value, 10) || 0})} 
                    required 
                    min="1"
                  />
                </div>
              </div>

              <div className="form-group">
                <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.35rem', display: 'block' }}>Class Teacher / Advisor</label>
                <select value={sectionForm.class_teacher_id} onChange={e => setSectionForm({...sectionForm, class_teacher_id: e.target.value})}>
                  <option value="">-- Assign Class Teacher (Optional) --</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.first_name} {t.last_name} ({t.employee_id || 'No ID'})</option>
                  ))}
                </select>
              </div>

              <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setShowSectionFormModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal B: Section Details Dossier Modal */}
      {showSectionDetailModal && selectedSection && (
        <div className="modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.45)', zIndex: 1000 }}>
          <div className="modal-content" style={{ backgroundColor: '#ffffff', borderRadius: 'var(--radius-lg)', maxWidth: '640px', width: '100%', padding: '2rem', boxShadow: 'var(--shadow-lg)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 850, color: 'var(--text-main)', margin: 0 }}>Section Dossier: {selectedSection.name}</h3>
                <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                  {selectedSection.course_name} • {selectedSection.academic_year_name}
                </span>
              </div>
              <button className="btn btn-secondary" onClick={() => setShowSectionDetailModal(false)}>Close Dossier</button>
            </div>

            {/* Tab Links */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '1.5rem', gap: '1rem', overflowX: 'auto', scrollbarWidth: 'none', height: '52px', alignItems: 'center' }}>
              {[
                { tab: 'info', label: 'Info & Analytics' },
                { tab: 'roster', label: `Student Roster (${sectionDetailLoading ? '...' : sectionStudents.length})` },
                { tab: 'timetable', label: `Timetable (${sectionDetailLoading ? '...' : sectionTimetable.length})` },
                { tab: 'timeline', label: 'Audit Timeline' }
              ].map(t => (
                <button
                  key={t.tab}
                  type="button"
                  onClick={() => setSectionDetailTab(t.tab as any)}
                  style={{
                    padding: '0.5rem 1rem',
                    border: 'none',
                    background: 'none',
                    borderBottom: sectionDetailTab === t.tab ? '2px solid var(--primary)' : '2px solid transparent',
                    color: sectionDetailTab === t.tab ? 'var(--primary)' : 'var(--text-muted)',
                    fontWeight: sectionDetailTab === t.tab ? 700 : 500,
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    whiteSpace: 'nowrap',
                    height: '100%'
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {sectionDetailLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem', gap: '1rem' }}>
                <RefreshCw className="spinner" size={24} style={{ color: 'var(--primary)' }} />
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Retrieving dossier logs...</span>
              </div>
            ) : (
              <div>
                {/* Tab 1: Info & Analytics */}
                {sectionDetailTab === 'info' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div style={{ backgroundColor: 'var(--bg-main)', border: '1px solid var(--border)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                        <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.25rem' }}>Classroom Location</span>
                        <span style={{ fontWeight: 650, color: 'var(--text-main)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                          <MapPin size={16} /> {selectedSection.room || 'No Room Assigned'}
                        </span>
                      </div>

                      <div style={{ backgroundColor: 'var(--bg-main)', border: '1px solid var(--border)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                        <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.25rem' }}>Class Teacher</span>
                        <span style={{ fontWeight: 650, color: 'var(--text-main)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Users size={16} /> {selectedSection.class_teacher_name || 'No Teacher Mapped'}
                        </span>
                      </div>
                    </div>

                    <div style={{ backgroundColor: 'var(--bg-main)', border: '1px solid var(--border)', padding: '1.25rem', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontWeight: 700 }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Section Enrollment Fill Rate</span>
                        <span style={{ color: 'var(--text-main)' }}>{selectedSection.student_count || 0} / {selectedSection.capacity || 40} Students</span>
                      </div>
                      
                      {(() => {
                        const count = selectedSection.student_count || 0;
                        const cap = selectedSection.capacity || 40;
                        const percent = Math.min(100, Math.round((count / cap) * 100));
                        return (
                          <div>
                            <div style={{ width: '100%', height: '12px', backgroundColor: '#e2e8f0', borderRadius: '6px', overflow: 'hidden', marginBottom: '0.5rem' }}>
                              <div style={{ 
                                width: `${percent}%`, 
                                height: '100%', 
                                borderRadius: '6px', 
                                backgroundColor: percent > 100 ? '#ef4444' : percent >= 85 ? '#f97316' : '#10b981'
                              }} />
                            </div>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              {percent >= 100 ? (
                                <><AlertTriangle size={14} style={{ color: '#ef4444' }} /> <span style={{ color: '#b91c1c', fontWeight: 600 }}>Capacity limit reached! Additional enrollments blocked.</span></>
                              ) : percent >= 85 ? (
                                <><AlertTriangle size={14} style={{ color: '#f97316' }} /> <span style={{ color: '#c2410c', fontWeight: 600 }}>Approaching max capacity limit.</span></>
                              ) : (
                                <><CheckCircle2 size={14} style={{ color: '#10b981' }} /> <span>Safe capacity level. Enrolling new students is allowed.</span></>
                              )}
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {/* Tab 2: Student Roster */}
                {sectionDetailTab === 'roster' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Enrolled Student Directory</span>
                      <span style={{ fontSize: '0.8rem', padding: '0.125rem 0.5rem', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontWeight: 600 }}>
                        {sectionStudents.length} Students
                      </span>
                    </div>

                    <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                      <table className="table" style={{ width: '100%', fontSize: '0.85rem' }}>
                        <thead>
                          <tr style={{ backgroundColor: 'var(--bg-main)', borderBottom: '1px solid var(--border)' }}>
                            <th style={{ textAlign: 'left', padding: '0.75rem' }}>Student ID</th>
                            <th style={{ textAlign: 'left', padding: '0.75rem' }}>Name</th>
                            <th style={{ textAlign: 'left', padding: '0.75rem' }}>Email</th>
                            <th style={{ textAlign: 'center', padding: '0.75rem' }}>Semester</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sectionStudents.map(student => (
                            <tr key={student.id} style={{ borderBottom: '1px solid var(--border)' }}>
                              <td style={{ padding: '0.75rem' }}><code>{student.student_id || student.id.substring(0,8)}</code></td>
                              <td style={{ padding: '0.75rem', fontWeight: 600, color: 'var(--text-main)' }}>{student.first_name} {student.last_name}</td>
                              <td style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>{student.email || 'N/A'}</td>
                              <td style={{ padding: '0.75rem', textAlign: 'center', color: 'var(--text-main)' }}>Semester {student.semester || '1'}</td>
                            </tr>
                          ))}
                          {sectionStudents.length === 0 && (
                            <tr>
                              <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                                No active students currently enrolled in this section.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Tab 3: Timetable */}
                {sectionDetailTab === 'timetable' && (
                  <div>
                    <h4 style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Weekly Class Schedule</h4>
                    <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                      <table className="table" style={{ width: '100%', fontSize: '0.85rem' }}>
                        <thead>
                          <tr style={{ backgroundColor: 'var(--bg-main)', borderBottom: '1px solid var(--border)' }}>
                            <th style={{ textAlign: 'left', padding: '0.75rem' }}>Day</th>
                            <th style={{ textAlign: 'left', padding: '0.75rem' }}>Period Time</th>
                            <th style={{ textAlign: 'left', padding: '0.75rem' }}>Subject</th>
                            <th style={{ textAlign: 'left', padding: '0.75rem' }}>Teacher</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sectionTimetable.map(item => (
                            <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                              <td style={{ padding: '0.75rem', fontWeight: 600 }}>{item.day_of_week}</td>
                              <td style={{ padding: '0.75rem' }}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                  <Clock size={12} /> {item.start_time} - {item.end_time}
                                </span>
                              </td>
                              <td style={{ padding: '0.75rem', color: 'var(--text-main)', fontWeight: 500 }}>{item.subject_name}</td>
                              <td style={{ padding: '0.75rem', color: 'var(--text-main)' }}>{item.teacher_name}</td>
                            </tr>
                          ))}
                          {sectionTimetable.length === 0 && (
                            <tr>
                              <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                                No timetable schedule entries assigned for this section.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Tab 4: Audit Timeline */}
                {sectionDetailTab === 'timeline' && (
                  <div>
                    <h4 style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Activity History Log</h4>
                    <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0.5rem' }}>
                      {sectionLogs.map((log: any) => (
                        <div key={log.id} style={{ borderLeft: '3px solid var(--primary)', paddingLeft: '1rem', display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
                          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>{log.description}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span>by {log.user_name} ({log.user_email})</span>
                            <span>•</span>
                            <span>{new Date(log.timestamp).toLocaleString()}</span>
                          </span>
                        </div>
                      ))}
                      {sectionLogs.length === 0 && (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '2rem' }}>
                          No audit activity logs recorded for this section.
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal C: Add Program */}
      {showAddProgramModal && (
        <div className="modal" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.45)', zIndex: 1000, padding: '1rem', overflowY: 'auto' }}>
          <div className="modal-content" style={{ backgroundColor: '#ffffff', borderRadius: 'var(--radius-lg)', maxWidth: '520px', width: '100%', padding: '2rem', boxShadow: 'var(--shadow-lg)' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '1.5rem', color: 'var(--text-main)' }}>Add New {getProgramLabel()}</h3>
            <form onSubmit={handleAddProgramSubmit}>
              <div className="form-group">
                <label style={{ fontWeight: 600 }}>Code / Identifier *</label>
                <input 
                  type="text" 
                  value={addProgramForm.course_code} 
                  onChange={e => setAddProgramForm({...addProgramForm, course_code: e.target.value})} 
                  placeholder={institutionType === 'school' ? 'e.g. GRADE-10' : 'e.g. BE-CSE'} 
                  required 
                />
              </div>
              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label style={{ fontWeight: 600 }}>Name *</label>
                <input 
                  type="text" 
                  value={addProgramForm.name} 
                  onChange={e => setAddProgramForm({...addProgramForm, name: e.target.value})} 
                  placeholder={institutionType === 'school' ? 'e.g. Grade 10 Standard' : 'e.g. B.E. Computer Science & Engineering'} 
                  required 
                />
              </div>

              {institutionType !== 'school' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                  <div className="form-group">
                    <label style={{ fontWeight: 600 }}>Department</label>
                    <select 
                      value={addProgramForm.department_id} 
                      onChange={e => setAddProgramForm({...addProgramForm, department_id: e.target.value})}
                      style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: '#ffffff', outline: 'none' }}
                    >
                      <option value="">-- Choose Department --</option>
                      {departments.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label style={{ fontWeight: 600 }}>Duration (Years)</label>
                    <input 
                      type="number" 
                      value={addProgramForm.duration_years} 
                      onChange={e => setAddProgramForm({...addProgramForm, duration_years: parseInt(e.target.value) || 4})} 
                      min="1" 
                      required 
                    />
                  </div>
                </div>
              )}

              {/* Toggles Panel */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.25rem', padding: '1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', backgroundColor: '#f8fafc' }}>
                <strong style={{ fontSize: '0.85rem', color: 'var(--text-main)', display: 'block', marginBottom: '0.25rem' }}>Academic Config Settings</strong>
                
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                  <input 
                    type="checkbox" 
                    checked={addProgramForm.semester_enabled === 1}
                    onChange={e => setAddProgramForm({...addProgramForm, semester_enabled: e.target.checked ? 1 : 0})}
                    style={{ accentColor: 'var(--primary)' }}
                  />
                  <span>Enable Semester System (Semi-annual exams and classes)</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                  <input 
                    type="checkbox" 
                    checked={addProgramForm.credit_system_enabled === 1}
                    onChange={e => setAddProgramForm({...addProgramForm, credit_system_enabled: e.target.checked ? 1 : 0})}
                    style={{ accentColor: 'var(--primary)' }}
                  />
                  <span>Enable Credits System (Subjects carry academic weight/credits)</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                  <input 
                    type="checkbox" 
                    checked={addProgramForm.electives_enabled === 1}
                    onChange={e => setAddProgramForm({...addProgramForm, electives_enabled: e.target.checked ? 1 : 0})}
                    style={{ accentColor: 'var(--primary)' }}
                  />
                  <span>Allow Elective Registrations (Students can opt for selective subjects)</span>
                </label>
              </div>

              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label style={{ fontWeight: 600 }}>Description</label>
                <textarea 
                  className="form-control" 
                  value={addProgramForm.description} 
                  onChange={e => setAddProgramForm({...addProgramForm, description: e.target.value})}
                  placeholder="Provide syllabus outline or descriptions..."
                  style={{ width: '100%', minHeight: '80px', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', outline: 'none' }}
                />
              </div>

              <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.75rem' }}>
                <button type="button" onClick={() => setShowAddProgramModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Save {getProgramLabel()}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal D: Edit Program */}
      {showEditProgramModal && (
        <div className="modal" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.45)', zIndex: 1000, padding: '1rem', overflowY: 'auto' }}>
          <div className="modal-content" style={{ backgroundColor: '#ffffff', borderRadius: 'var(--radius-lg)', maxWidth: '520px', width: '100%', padding: '2rem', boxShadow: 'var(--shadow-lg)' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '1.5rem', color: 'var(--text-main)' }}>Edit {getProgramLabel()}</h3>
            <form onSubmit={handleEditProgramSubmit}>
              <div className="form-group">
                <label style={{ fontWeight: 600 }}>Code / Identifier *</label>
                <input 
                  type="text" 
                  value={editProgramForm.course_code} 
                  onChange={e => setEditProgramForm({...editProgramForm, course_code: e.target.value})} 
                  required 
                />
              </div>
              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label style={{ fontWeight: 600 }}>Name *</label>
                <input 
                  type="text" 
                  value={editProgramForm.name} 
                  onChange={e => setEditProgramForm({...editProgramForm, name: e.target.value})} 
                  required 
                />
              </div>

              {institutionType !== 'school' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                  <div className="form-group">
                    <label style={{ fontWeight: 600 }}>Department</label>
                    <select 
                      value={editProgramForm.department_id} 
                      onChange={e => setEditProgramForm({...editProgramForm, department_id: e.target.value})}
                      style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: '#ffffff', outline: 'none' }}
                    >
                      <option value="">-- Choose Department --</option>
                      {departments.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label style={{ fontWeight: 600 }}>Duration (Years)</label>
                    <input 
                      type="number" 
                      value={editProgramForm.duration_years} 
                      onChange={e => setEditProgramForm({...editProgramForm, duration_years: parseInt(e.target.value) || 1})} 
                      min="1" 
                      required 
                    />
                  </div>
                </div>
              )}

              {/* Toggles Panel */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.25rem', padding: '1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', backgroundColor: '#f8fafc' }}>
                <strong style={{ fontSize: '0.85rem', color: 'var(--text-main)', display: 'block', marginBottom: '0.25rem' }}>Academic Config Settings</strong>
                
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                  <input 
                    type="checkbox" 
                    checked={editProgramForm.semester_enabled === 1}
                    onChange={e => setEditProgramForm({...editProgramForm, semester_enabled: e.target.checked ? 1 : 0})}
                    style={{ accentColor: 'var(--primary)' }}
                  />
                  <span>Enable Semester System</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                  <input 
                    type="checkbox" 
                    checked={editProgramForm.credit_system_enabled === 1}
                    onChange={e => setEditProgramForm({...editProgramForm, credit_system_enabled: e.target.checked ? 1 : 0})}
                    style={{ accentColor: 'var(--primary)' }}
                  />
                  <span>Enable Credits System</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                  <input 
                    type="checkbox" 
                    checked={editProgramForm.electives_enabled === 1}
                    onChange={e => setEditProgramForm({...editProgramForm, electives_enabled: e.target.checked ? 1 : 0})}
                    style={{ accentColor: 'var(--primary)' }}
                  />
                  <span>Allow Elective Registrations</span>
                </label>
              </div>

              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label style={{ fontWeight: 600 }}>Description</label>
                <textarea 
                  className="form-control" 
                  value={editProgramForm.description} 
                  onChange={e => setEditProgramForm({...editProgramForm, description: e.target.value})}
                  style={{ width: '100%', minHeight: '80px', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', outline: 'none' }}
                />
              </div>

              <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.75rem' }}>
                <button type="button" onClick={() => setShowEditProgramModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal E: Program Details Hub Modal */}
      {showProgramDetailModal && selectedProgram && (
        <div className="modal" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.45)', zIndex: 1000, padding: '1rem', overflowY: 'auto' }}>
          <div className="modal-content" style={{ backgroundColor: '#ffffff', borderRadius: 'var(--radius-lg)', maxWidth: '720px', width: '100%', padding: '2.5rem', boxShadow: 'var(--shadow-lg)' }}>
            
            {/* Modal Hero Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ width: '3.5rem', height: '3.5rem', borderRadius: '50%', backgroundColor: '#fffbeb', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
                🎓
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>{selectedProgram.name}</h3>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.15rem' }}>
                  Code: <code style={{ fontWeight: 700, color: 'var(--text-main)' }}>{selectedProgram.course_code}</code>
                </span>
              </div>
              <span className={`badge badge-${selectedProgram.is_active === 1 ? 'success' : 'secondary'}`} style={{ marginLeft: 'auto' }}>
                {selectedProgram.is_active === 1 ? 'ACTIVE' : 'ARCHIVED'}
              </span>
            </div>

            {/* Tabs Header */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '1.5rem', gap: '1rem', overflowX: 'auto', scrollbarWidth: 'none', height: '52px', alignItems: 'center' }}>
              {[
                { tab: 'info', label: 'Info Details' },
                { tab: 'syllabus', label: `Syllabus / Subjects (${detailSubjects.length})` },
                { tab: 'sections', label: `Class Sections (${detailSections.length})` },
                { tab: 'timeline', label: 'Timeline' }
              ].map(t => (
                <button
                  key={t.tab}
                  type="button"
                  onClick={() => setProgramDetailTab(t.tab as any)}
                  style={{
                    padding: '0.5rem 1rem',
                    border: 'none',
                    background: 'none',
                    borderBottom: programDetailTab === t.tab ? '2px solid var(--primary)' : '2px solid transparent',
                    color: programDetailTab === t.tab ? 'var(--primary)' : 'var(--text-muted)',
                    fontWeight: programDetailTab === t.tab ? 700 : 500,
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    whiteSpace: 'nowrap',
                    height: '100%'
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Tab 1: Info */}
            {programDetailTab === 'info' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.9rem' }}>
                <div style={{ backgroundColor: 'var(--bg-main)', border: '1px solid var(--border)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.25rem' }}>Description</span>
                  <p style={{ margin: 0, color: 'var(--text-main)' }}>{selectedProgram.description || 'No syllabus description provided.'}</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div style={{ backgroundColor: 'var(--bg-main)', border: '1px solid var(--border)', padding: '1.25rem', borderRadius: 'var(--radius-md)' }}>
                    <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>Curriculum Options</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Semesters Enforced:</span>
                        <strong style={{ color: selectedProgram.semester_enabled === 1 ? 'var(--success)' : 'var(--text-muted)' }}>
                          {selectedProgram.semester_enabled === 1 ? 'Yes' : 'No'}
                        </strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Credits System:</span>
                        <strong style={{ color: selectedProgram.credit_system_enabled === 1 ? 'var(--success)' : 'var(--text-muted)' }}>
                          {selectedProgram.credit_system_enabled === 1 ? 'Yes' : 'No'}
                        </strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Allows Electives:</span>
                        <strong style={{ color: selectedProgram.electives_enabled === 1 ? 'var(--success)' : 'var(--text-muted)' }}>
                          {selectedProgram.electives_enabled === 1 ? 'Yes' : 'No'}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ backgroundColor: 'var(--bg-main)', border: '1px solid var(--border)', padding: '0.85rem', borderRadius: 'var(--radius-md)' }}>
                      <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Department Mapped</span>
                      <span style={{ fontWeight: 650, fontSize: '0.85rem' }}>{getDeptCode(selectedProgram.department_id)}</span>
                    </div>
                    <div style={{ backgroundColor: 'var(--bg-main)', border: '1px solid var(--border)', padding: '0.85rem', borderRadius: 'var(--radius-md)' }}>
                      <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Duration Cycle</span>
                      <span style={{ fontWeight: 650, fontSize: '0.85rem' }}>{selectedProgram.duration_years} {selectedProgram.duration_years === 1 ? 'Year' : 'Years'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Syllabus / Subjects grouped */}
            {programDetailTab === 'syllabus' && (
              <div style={{ maxHeight: '250px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {Object.keys(groupedSubjects).map(term => (
                  <div key={term} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '1rem', backgroundColor: 'var(--bg-main)' }}>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.25rem' }}>
                      {term}
                    </h4>
                    <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)' }}>
                          <th style={{ textAlign: 'left', padding: '0.25rem' }}>Code</th>
                          <th style={{ textAlign: 'left', padding: '0.25rem' }}>Subject Name</th>
                          <th style={{ textAlign: 'center', padding: '0.25rem' }}>Credits</th>
                        </tr>
                      </thead>
                      <tbody>
                        {groupedSubjects[term]?.map((sub: any) => (
                          <tr key={sub.id} style={{ borderBottom: '1px dotted var(--border)' }}>
                            <td style={{ padding: '0.4rem 0.25rem' }}><code>{sub.subject_code}</code></td>
                            <td style={{ padding: '0.4rem 0.25rem', fontWeight: 600 }}>{sub.subject_name}</td>
                            <td style={{ padding: '0.4rem 0.25rem', textAlign: 'center' }}>{sub.credits || 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
                {detailSubjects.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    No subjects mapped to this curriculum layout.
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: Class Sections */}
            {programDetailTab === 'sections' && (
              <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                <table className="table" style={{ width: '100%', fontSize: '0.85rem' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '0.5rem' }}>Section</th>
                      <th style={{ textAlign: 'left', padding: '0.5rem' }}>Year / Sem Index</th>
                      <th style={{ textAlign: 'left', padding: '0.5rem' }}>Class Teacher</th>
                      <th style={{ textAlign: 'center', padding: '0.5rem' }}>Room</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailSections.map(sec => (
                      <tr key={sec.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '0.5rem', fontWeight: 600 }}>{sec.name}</td>
                        <td style={{ padding: '0.5rem' }}>Year {sec.year_number}</td>
                        <td style={{ padding: '0.5rem' }}>{getTeacherName(sec.class_teacher_id)}</td>
                        <td style={{ padding: '0.5rem', textAlign: 'center' }}>{sec.room || '-'}</td>
                      </tr>
                    ))}
                    {detailSections.length === 0 && (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                          No active sections provisioned for this program.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Tab 4: Timeline */}
            {programDetailTab === 'timeline' && (
              <div style={{ maxHeight: '250px', overflowY: 'auto', paddingLeft: '0.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', borderLeft: '2px solid var(--border)', padding: '0.5rem 0 0.5rem 1rem', position: 'relative' }}>
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '-1.45rem', top: '0.2rem', width: '0.75rem', height: '0.75rem', borderRadius: '50%', backgroundColor: 'var(--primary)', border: '2px solid #ffffff' }} />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>
                      {selectedProgram.created_at ? new Date(selectedProgram.created_at).toLocaleDateString() : 'N/A'}
                    </span>
                    <strong style={{ fontSize: '0.85rem', display: 'block', color: 'var(--text-main)', marginTop: '0.15rem' }}>Curriculum Registered</strong>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Record initialized in system database.</span>
                  </div>
                  
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '-1.45rem', top: '0.2rem', width: '0.75rem', height: '0.75rem', borderRadius: '50%', backgroundColor: '#cbd5e1', border: '2px solid #ffffff' }} />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Current Status</span>
                    <strong style={{ fontSize: '0.85rem', display: 'block', color: 'var(--text-main)', marginTop: '0.15rem' }}>
                      Status set to {selectedProgram.is_active === 1 ? 'ACTIVE' : 'ARCHIVED'}
                    </strong>
                  </div>
                </div>
              </div>
            )}

            {/* Close Actions */}
            <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
              <button type="button" onClick={() => setShowProgramDetailModal(false)} className="btn btn-secondary">Close Details</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
