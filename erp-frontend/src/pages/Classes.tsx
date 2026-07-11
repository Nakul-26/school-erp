import './Classes.css';
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
      <div className="page-header classes-page-header">
        <div>
          <h2 className="classes-title-2">Classes & Sections</h2>
          <p className="classes-text-3">
            Manage school courses, classes, sections, and classroom allocations.
          </p>
        </div>
        <div>
          {activeMainTab === 'sections' ? (
            <button className="btn btn-primary classes-btn" onClick={handleOpenCreateSection}>
              <Plus size={18} /> Add {institutionType === 'school' ? 'Section' : 'Class/Section'}
            </button>
          ) : (
            <button className="btn btn-primary classes-btn" onClick={() => setShowAddProgramModal(true)}>
              <Plus size={18} /> Add {getProgramLabel()}
            </button>
          )}
        </div>
      </div>

      {/* 3. Pill Tabs Switcher */}
      <div className="classes-row-6">
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
          <div className="classes-grid-7">
            <div className="classes-row-8">
              <div className="classes-row-9">
                <SlidersHorizontal size={24} />
              </div>
              <div>
                <span className="classes-span-10">Total Sections</span>
                <span className="classes-span-11">{totalSectionsCount}</span>
              </div>
            </div>

            <div className="classes-row-12">
              <div className="classes-row-13">
                <AlertTriangle size={24} />
              </div>
              <div>
                <span className="classes-span-14">No Class Teacher</span>
                <span className="classes-span-15">{sectionsWithoutTeacher}</span>
              </div>
            </div>

            <div className="classes-row-16">
              <div className="classes-row-17">
                <Info size={24} />
              </div>
              <div>
                <span className="classes-span-18">Avg Capacity</span>
                <span className="classes-span-19">{avgCapacity}</span>
              </div>
            </div>

            <div className="classes-row-20">
              <div className="classes-row-21">
                <Users size={24} />
              </div>
              <div>
                <span className="classes-span-22">Active Enrolled</span>
                <span className="classes-span-23">{enrolledStudentsCount}</span>
              </div>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="classes-row-24">
            <div className="classes-div-25">
              <Search size={18} className="classes-Search-26"  />
              <input type="text" value={sectionSearchQuery} onChange={e => setSectionSearchQuery(e.target.value)} placeholder="Search by section name, room, or teacher..." className="classes-input-27"  />
            </div>

            <div className="classes-row-28">
              <select value={sectionFilterYear} onChange={e => setSectionFilterYear(e.target.value)} className="classes-select-29">
                <option value="">All Academic Years</option>
                {years.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
              </select>

              <select value={sectionFilterProgram} onChange={e => setSectionFilterProgram(e.target.value)} className="classes-select-30">
                <option value="">All {getProgramLabel()}s</option>
                {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>

              <select value={sectionFilterStatus} onChange={e => setSectionFilterStatus(e.target.value)} className="classes-select-31">
                <option value="1">Active Only</option>
                <option value="0">Archived Only</option>
                <option value="">All Statuses</option>
              </select>
              
              <button className="btn btn-secondary classes-btn" onClick={fetchData}>
                <RefreshCw size={14} /> Sync
              </button>
            </div>
          </div>

          {/* Table Listing */}
          <div className="card classes-section-table-card">
            {loading ? (
              <div className="classes-col-34">
                <RefreshCw className="spinner classes-spinner" size={32}  />
                <span className="classes-span-36">Loading sections database...</span>
              </div>
            ) : (
              <div className="classes-div-37">
                <table className="table classes-table">
                <thead>
                  <tr className="classes-tr-39">
                    <th className="classes-th-40">Section details</th>
                    {institutionType !== 'school' && <th className="classes-th-41">Year Level</th>}
                    <th className="classes-th-42">{getProgramLabel()}</th>
                    <th className="classes-th-43">Classroom / Room</th>
                    <th className="classes-th-44">Capacity Status</th>
                    <th className="classes-th-45">Class Teacher</th>
                    <th className="classes-th-46">Status</th>
                    <th className="classes-th-47">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClasses.map(cls => {
                    const isOverfilled = (cls.student_count || 0) >= (cls.capacity || 40);
                    const percent = Math.min(100, Math.round(((cls.student_count || 0) / (cls.capacity || 40)) * 100));
                    
                    return (
                      <tr key={cls.id} className="hover-row classes-hover-row">
                        <td className="classes-td-49">
                          <span onClick={() => navigate(`/classes/${cls.id}`)} className="classes-span-50">
                            {cls.name}
                          </span>
                          <span className="classes-span-51">{cls.academic_year_name || 'No Year'}</span>
                        </td>
                        {institutionType !== 'school' && (
                           <td className="classes-td-52">Year {cls.year_number}</td>
                        )}
                        <td className="classes-td-53">
                          {cls.course_name || 'Unknown'}
                        </td>
                        <td className="classes-td-54">
                          {cls.room ? (
                            <span className="classes-row-55">
                              <MapPin size={14} className="classes-MapPin-56"  /> {cls.room}
                            </span>
                          ) : (
                            <span className="classes-span-57">Not Assigned</span>
                          )}
                        </td>
                        <td className="classes-td-58">
                          <div className="classes-col-59">
                            <div className="classes-row-60">
                              <span style={{ color: isOverfilled ? '#dc2626' : 'var(--text-main)' }}>{cls.student_count || 0} / {cls.capacity || 40}</span>
                              <span className="classes-span-61">{percent}%</span>
                            </div>
                            <div className="classes-div-62">
                              <div style={{ 
                                width: `${percent}%`, 
                                height: '100%', 
                                borderRadius: '3px', 
                                backgroundColor: percent > 100 ? '#ef4444' : percent >= 85 ? '#f97316' : '#10b981'
                              }} />
                            </div>
                          </div>
                        </td>
                        <td className="classes-td-63">
                          {cls.class_teacher_name ? (
                            <span className="classes-span-64">{cls.class_teacher_name}</span>
                          ) : (
                            <span className="classes-span-65">
                              Unassigned
                            </span>
                          )}
                        </td>
                        <td className="classes-td-66">
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
                        <td className="classes-td-67">
                          <div className="classes-row-68">
                            <button className="btn btn-sm btn-outline classes-btn" onClick={() => handleOpenSectionDetails(cls)} title="View Section Dossier">
                              <Info size={12} /> Dossier
                            </button>
                            <button className="btn btn-sm btn-secondary classes-btn" onClick={() => navigate(`/classes/${cls.id}`)} title="Open Section Workspace">
                              <Eye size={14} />
                            </button>
                            <button className="btn btn-sm btn-secondary classes-btn" onClick={() => handleOpenEditSection(cls)} title="Edit details">
                              <Edit2 size={14} />
                            </button>
                            <button className="btn btn-sm btn-secondary classes-btn" onClick={() => handleToggleSectionStatus(cls)} title={cls.is_active ? 'Archive section' : 'Restore section'}>
                              <Archive size={14} />
                            </button>
                            {!cls.is_active && (
                              <button className="btn btn-sm btn-danger classes-btn" onClick={() => handleDeleteSection(cls.id)} title="Delete permanently">
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
                      <td colSpan={institutionType === 'school' ? 7 : 8} className="classes-td-74">
                        <div className="classes-col-75">
                          <Users size={32} className="classes-Users-76"  />
                          <span className="classes-span-77">No Classes or Sections Found</span>
                          <span className="classes-span-78">Try clearing filters or search to broaden search boundaries.</span>
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

      {/* 5. Tab 2: Courses / Programs Content */}
      {activeMainTab === 'programs' && (
        <>
          {/* KPI Cards */}
          <div className="classes-grid-79">
            <div className="card classes-program-kpi-card">
              <div className="classes-div-81">
                <Shield size={24} />
              </div>
              <div>
                <span className="classes-span-82">Total Active</span>
                <span className="classes-span-83">{totalProgramsCount}</span>
              </div>
            </div>

            <div className="card classes-program-kpi-card">
              <div className="classes-div-85">
                <Calendar size={24} />
              </div>
              <div>
                <span className="classes-span-86">Semester Based</span>
                <span className="classes-span-87">{semesterEnabledCount}</span>
              </div>
            </div>

            <div className="card classes-program-kpi-card">
              <div className="classes-div-89">
                <BookOpen size={24} />
              </div>
              <div>
                <span className="classes-span-90">Credit System</span>
                <span className="classes-span-91">{creditSystemCount}</span>
              </div>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="card filters classes-program-filters-card">
            <div className="search-container classes-search-container">
              <Search size={18} color="var(--text-muted)" />
              <input type="text" placeholder={`Search by ${getProgramLabel().toLowerCase()} name or code...`} value={programSearchQuery} onChange={(e) => setProgramSearchQuery(e.target.value)} className="classes-input-94"  />
            </div>
            <div className="classes-row-95">
              {institutionType !== 'school' && (
                <select value={programDeptFilter} onChange={(e) => setProgramDeptFilter(e.target.value)} className="classes-select-96">
                  <option value="ALL">All Departments</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              )}
              <select value={programStatusFilter} onChange={(e) => setProgramStatusFilter(e.target.value as any)} className="classes-select-97">
                <option value="ACTIVE">Active Only</option>
                <option value="ARCHIVED">Archived Only</option>
                <option value="ALL">All Statuses</option>
              </select>
              <button className="btn btn-secondary classes-btn" onClick={fetchData}>
                <RefreshCw size={14} /> Sync
              </button>
            </div>
          </div>

          {/* Main Grid Table */}
          <div className="card classes-program-table-card">
            {loading ? (
              <div className="classes-div-100">Loading...</div>
            ) : (
              <div className="classes-div-101">
                <table className="table classes-table">
                  <thead>
                    <tr>
                      <th className="classes-th-103">Code</th>
                      <th className="classes-th-104">Name</th>
                      {institutionType !== 'school' && <th className="classes-th-105">Department</th>}
                      {institutionType !== 'school' && <th className="classes-th-106">Duration</th>}
                      <th className="classes-th-107">Semesters</th>
                      <th className="classes-th-108">Credits</th>
                      <th className="classes-th-109">Status</th>
                      <th className="classes-th-110">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedPrograms.map(prog => (
                      <tr key={prog.id} className="classes-tr-111">
                        <td className="classes-td-112">
                          <code className="classes-code-113">
                            {prog.course_code}
                          </code>
                        </td>
                        <td className="classes-td-114">{prog.name}</td>
                        {institutionType !== 'school' && <td className="classes-td-115">{getDeptCode(prog.department_id)}</td>}
                        {institutionType !== 'school' && (
                          <td className="classes-td-116">
                            {prog.duration_years} {prog.duration_years === 1 ? 'Year' : 'Years'}
                          </td>
                        )}
                        <td className="classes-td-117">
                          {prog.semester_enabled === 1 ? <Check size={16} color="var(--success)" className="classes-Check-118"  /> : <X size={16} color="var(--secondary)" className="classes-X-119"  />}
                        </td>
                        <td className="classes-td-120">
                          {prog.credit_system_enabled === 1 ? <Check size={16} color="var(--success)" className="classes-Check-121"  /> : <X size={16} color="var(--secondary)" className="classes-X-122"  />}
                        </td>
                        <td className="classes-td-123">
                          <span className={`badge badge-${prog.is_active === 1 ? 'success' : 'secondary'}`}>
                            {prog.is_active === 1 ? 'ACTIVE' : 'ARCHIVED'}
                          </span>
                        </td>
                        <td className="classes-td-124">
                          <div className="classes-row-125">
                            <button onClick={() => openProgramDetailModal(prog)} className="btn btn-sm btn-outline classes-btn">
                              <Eye size={12} /> View
                            </button>
                            <button onClick={() => openEditProgramModal(prog)} className="btn btn-sm btn-secondary classes-btn">
                              <Edit3 size={12} /> Edit
                            </button>
                            {prog.is_active === 1 ? (
                              <button onClick={() => handleArchiveProgram(prog.id)} className="btn btn-sm btn-outline-danger classes-btn">
                                <Trash2 size={12} /> Archive
                              </button>
                            ) : (
                              <button onClick={() => handleRestoreProgram(prog.id)} className="btn btn-sm btn-outline-success classes-btn">
                                <RefreshCw size={12} /> Restore
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {displayedPrograms.length === 0 && (
                      <tr>
                        <td colSpan={institutionType === 'school' ? 6 : 8} className="classes-td-130">
                          <div className="classes-col-131">
                            <Shield size={48} color="#cbd5e1" />
                            <h4 className="classes-title-132">No {getProgramsLabel()} Found</h4>
                            <p className="classes-text-133">Try adjusting filters or add a new {getProgramLabel().toLowerCase()}.</p>
                            <button className="btn btn-primary btn-sm classes-btn" onClick={() => setShowAddProgramModal(true)}>
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
        <div className="modal-overlay classes-modal-overlay">
          <div className="modal-content classes-modal-content size-sm">
            <h3 className="classes-title-137">
              {editingSection ? `Edit Class/Section: ${editingSection.name}` : `Add New ${institutionType === 'school' ? 'Section' : 'Class/Section'}`}
            </h3>
            <form onSubmit={handleSectionSubmit} className="classes-col-138">
              <div className="form-group">
                <label className="classes-label-139">Section Name *</label>
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
                  <label className="classes-label-140">Year Level *</label>
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
                <label className="classes-label-141">{getProgramLabel()} *</label>
                <select value={sectionForm.course_id} onChange={e => setSectionForm({...sectionForm, course_id: e.target.value})} required>
                  {programs.map(p => {
                    if (p.is_active !== 1 && p.id !== sectionForm.course_id) return null;
                    return <option key={p.id} value={p.id}>{p.name}{p.is_active !== 1 ? ' (Archived)' : ''}</option>;
                  })}
                </select>
              </div>

              <div className="form-group">
                <label className="classes-label-142">Academic Year *</label>
                <select value={sectionForm.academic_year_id} onChange={e => setSectionForm({...sectionForm, academic_year_id: e.target.value})} required>
                  {years.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
                </select>
              </div>

              <div className="classes-grid-143">
                <div className="form-group">
                  <label className="classes-label-144">Room / Location</label>
                  <input 
                    type="text" 
                    value={sectionForm.room} 
                    onChange={e => setSectionForm({...sectionForm, room: e.target.value})} 
                    placeholder="e.g. Room 302"
                  />
                </div>

                <div className="form-group">
                  <label className="classes-label-145">Max Capacity *</label>
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
                <label className="classes-label-146">Class Teacher / Advisor</label>
                <select value={sectionForm.class_teacher_id} onChange={e => setSectionForm({...sectionForm, class_teacher_id: e.target.value})}>
                  <option value="">-- Assign Class Teacher (Optional) --</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.first_name} {t.last_name} ({t.employee_id || 'No ID'})</option>
                  ))}
                </select>
              </div>

              <div className="modal-actions classes-modal-actions">
                <button type="button" onClick={() => setShowSectionFormModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal B: Section Details Dossier Modal */}
      {showSectionDetailModal && selectedSection && (
        <div className="modal-overlay classes-modal-overlay">
          <div className="modal-content classes-modal-content size-md">
            <div className="classes-row-150">
              <div>
                <h3 className="classes-title-151">Section Dossier: {selectedSection.name}</h3>
                <span className="classes-span-152">
                  {selectedSection.course_name} • {selectedSection.academic_year_name}
                </span>
              </div>
              <button className="btn btn-secondary" onClick={() => setShowSectionDetailModal(false)}>Close Dossier</button>
            </div>

            {/* Tab Links */}
            <div className="classes-row-153">
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
              <div className="classes-col-154">
                <RefreshCw className="spinner classes-spinner" size={24}  />
                <span className="classes-span-156">Retrieving dossier logs...</span>
              </div>
            ) : (
              <div>
                {/* Tab 1: Info & Analytics */}
                {sectionDetailTab === 'info' && (
                  <div className="classes-col-157">
                    <div className="classes-grid-158">
                      <div className="classes-div-159">
                        <span className="classes-span-160">Classroom Location</span>
                        <span className="classes-row-161">
                          <MapPin size={16} /> {selectedSection.room || 'No Room Assigned'}
                        </span>
                      </div>

                      <div className="classes-div-162">
                        <span className="classes-span-163">Class Teacher</span>
                        <span className="classes-row-164">
                          <Users size={16} /> {selectedSection.class_teacher_name || 'No Teacher Mapped'}
                        </span>
                      </div>
                    </div>

                    <div className="classes-div-165">
                      <div className="classes-row-166">
                        <span className="classes-span-167">Section Enrollment Fill Rate</span>
                        <span className="classes-span-168">{selectedSection.student_count || 0} / {selectedSection.capacity || 40} Students</span>
                      </div>
                      
                      {(() => {
                        const count = selectedSection.student_count || 0;
                        const cap = selectedSection.capacity || 40;
                        const percent = Math.min(100, Math.round((count / cap) * 100));
                        return (
                          <div>
                            <div className="classes-div-169">
                              <div style={{ 
                                width: `${percent}%`, 
                                height: '100%', 
                                borderRadius: '6px', 
                                backgroundColor: percent > 100 ? '#ef4444' : percent >= 85 ? '#f97316' : '#10b981'
                              }} />
                            </div>
                            <span className="classes-row-170">
                              {percent >= 100 ? (
                                <><AlertTriangle size={14} className="classes-AlertTriangle-171"  /> <span className="classes-span-172">Capacity limit reached! Additional enrollments blocked.</span></>
                              ) : percent >= 85 ? (
                                <><AlertTriangle size={14} className="classes-AlertTriangle-173"  /> <span className="classes-span-174">Approaching max capacity limit.</span></>
                              ) : (
                                <><CheckCircle2 size={14} className="classes-CheckCircle2-175"  /> <span>Safe capacity level. Enrolling new students is allowed.</span></>
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
                    <div className="classes-row-176">
                      <span className="classes-span-177">Enrolled Student Directory</span>
                      <span className="classes-span-178">
                        {sectionStudents.length} Students
                      </span>
                    </div>

                    <div className="classes-div-179">
                      <table className="table classes-table">
                        <thead>
                          <tr className="classes-tr-181">
                            <th className="classes-th-182">Student ID</th>
                            <th className="classes-th-183">Name</th>
                            <th className="classes-th-184">Email</th>
                            <th className="classes-th-185">Semester</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sectionStudents.map(student => (
                            <tr key={student.id} className="classes-tr-186">
                              <td className="classes-td-187"><code>{student.student_id || student.id.substring(0,8)}</code></td>
                              <td className="classes-td-188">{student.first_name} {student.last_name}</td>
                              <td className="classes-td-189">{student.email || 'N/A'}</td>
                              <td className="classes-td-190">Semester {student.semester || '1'}</td>
                            </tr>
                          ))}
                          {sectionStudents.length === 0 && (
                            <tr>
                              <td colSpan={4} className="classes-td-191">
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
                    <h4 className="classes-title-192">Weekly Class Schedule</h4>
                    <div className="classes-div-193">
                      <table className="table classes-table">
                        <thead>
                          <tr className="classes-tr-195">
                            <th className="classes-th-196">Day</th>
                            <th className="classes-th-197">Period Time</th>
                            <th className="classes-th-198">Subject</th>
                            <th className="classes-th-199">Teacher</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sectionTimetable.map(item => (
                            <tr key={item.id} className="classes-tr-200">
                              <td className="classes-td-201">{item.day_of_week}</td>
                              <td className="classes-td-202">
                                <span className="classes-row-203">
                                  <Clock size={12} /> {item.start_time} - {item.end_time}
                                </span>
                              </td>
                              <td className="classes-td-204">{item.subject_name}</td>
                              <td className="classes-td-205">{item.teacher_name}</td>
                            </tr>
                          ))}
                          {sectionTimetable.length === 0 && (
                            <tr>
                              <td colSpan={4} className="classes-td-206">
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
                    <h4 className="classes-title-207">Activity History Log</h4>
                    <div className="classes-col-208">
                      {sectionLogs.map((log: any) => (
                        <div key={log.id} className="classes-col-209">
                          <span className="classes-span-210">{log.description}</span>
                          <span className="classes-row-211">
                            <span>by {log.user_name} ({log.user_email})</span>
                            <span>•</span>
                            <span>{new Date(log.timestamp).toLocaleString()}</span>
                          </span>
                        </div>
                      ))}
                      {sectionLogs.length === 0 && (
                        <span className="classes-span-212">
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
        <div className="modal classes-modal">
          <div className="modal-content classes-modal-content size-sm">
            <h3 className="classes-title-215">Add New {getProgramLabel()}</h3>
            <form onSubmit={handleAddProgramSubmit}>
              <div className="form-group">
                <label className="classes-label-216">Code / Identifier *</label>
                <input 
                  type="text" 
                  value={addProgramForm.course_code} 
                  onChange={e => setAddProgramForm({...addProgramForm, course_code: e.target.value})} 
                  placeholder={institutionType === 'school' ? 'e.g. GRADE-10' : 'e.g. BE-CSE'} 
                  required 
                />
              </div>
              <div className="form-group classes-form-group">
                <label className="classes-label-218">Name *</label>
                <input 
                  type="text" 
                  value={addProgramForm.name} 
                  onChange={e => setAddProgramForm({...addProgramForm, name: e.target.value})} 
                  placeholder={institutionType === 'school' ? 'e.g. Grade 10 Standard' : 'e.g. B.E. Computer Science & Engineering'} 
                  required 
                />
              </div>

              {institutionType !== 'school' && (
                <div className="classes-grid-219">
                  <div className="form-group">
                    <label className="classes-label-220">Department</label>
                    <select value={addProgramForm.department_id} onChange={e => setAddProgramForm({...addProgramForm, department_id: e.target.value})} className="classes-select-221">
                      <option value="">-- Choose Department --</option>
                      {departments.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="classes-label-222">Duration (Years)</label>
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
              <div className="classes-col-223">
                <strong className="classes-strong-224">Academic Config Settings</strong>
                
                <label className="classes-row-225">
                  <input type="checkbox" checked={addProgramForm.semester_enabled === 1} onChange={e => setAddProgramForm({...addProgramForm, semester_enabled: e.target.checked ? 1 : 0})} className="classes-input-226"  />
                  <span>Enable Semester System (Semi-annual exams and classes)</span>
                </label>

                <label className="classes-row-227">
                  <input type="checkbox" checked={addProgramForm.credit_system_enabled === 1} onChange={e => setAddProgramForm({...addProgramForm, credit_system_enabled: e.target.checked ? 1 : 0})} className="classes-input-228"  />
                  <span>Enable Credits System (Subjects carry academic weight/credits)</span>
                </label>

                <label className="classes-row-229">
                  <input type="checkbox" checked={addProgramForm.electives_enabled === 1} onChange={e => setAddProgramForm({...addProgramForm, electives_enabled: e.target.checked ? 1 : 0})} className="classes-input-230"  />
                  <span>Allow Elective Registrations (Students can opt for selective subjects)</span>
                </label>
              </div>

              <div className="form-group classes-form-group">
                <label className="classes-label-232">Description</label>
                <textarea className="form-control classes-form-control" value={addProgramForm.description} onChange={e => setAddProgramForm({...addProgramForm, description: e.target.value})} placeholder="Provide syllabus outline or descriptions..."  />
              </div>

              <div className="modal-actions classes-modal-actions">
                <button type="button" onClick={() => setShowAddProgramModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Save {getProgramLabel()}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal D: Edit Program */}
      {showEditProgramModal && (
        <div className="modal classes-modal">
          <div className="modal-content classes-modal-content size-sm">
            <h3 className="classes-title-237">Edit {getProgramLabel()}</h3>
            <form onSubmit={handleEditProgramSubmit}>
              <div className="form-group">
                <label className="classes-label-238">Code / Identifier *</label>
                <input 
                  type="text" 
                  value={editProgramForm.course_code} 
                  onChange={e => setEditProgramForm({...editProgramForm, course_code: e.target.value})} 
                  required 
                />
              </div>
              <div className="form-group classes-form-group">
                <label className="classes-label-240">Name *</label>
                <input 
                  type="text" 
                  value={editProgramForm.name} 
                  onChange={e => setEditProgramForm({...editProgramForm, name: e.target.value})} 
                  required 
                />
              </div>

              {institutionType !== 'school' && (
                <div className="classes-grid-241">
                  <div className="form-group">
                    <label className="classes-label-242">Department</label>
                    <select value={editProgramForm.department_id} onChange={e => setEditProgramForm({...editProgramForm, department_id: e.target.value})} className="classes-select-243">
                      <option value="">-- Choose Department --</option>
                      {departments.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="classes-label-244">Duration (Years)</label>
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
              <div className="classes-col-245">
                <strong className="classes-strong-246">Academic Config Settings</strong>
                
                <label className="classes-row-247">
                  <input type="checkbox" checked={editProgramForm.semester_enabled === 1} onChange={e => setEditProgramForm({...editProgramForm, semester_enabled: e.target.checked ? 1 : 0})} className="classes-input-248"  />
                  <span>Enable Semester System</span>
                </label>

                <label className="classes-row-249">
                  <input type="checkbox" checked={editProgramForm.credit_system_enabled === 1} onChange={e => setEditProgramForm({...editProgramForm, credit_system_enabled: e.target.checked ? 1 : 0})} className="classes-input-250"  />
                  <span>Enable Credits System</span>
                </label>

                <label className="classes-row-251">
                  <input type="checkbox" checked={editProgramForm.electives_enabled === 1} onChange={e => setEditProgramForm({...editProgramForm, electives_enabled: e.target.checked ? 1 : 0})} className="classes-input-252"  />
                  <span>Allow Elective Registrations</span>
                </label>
              </div>

              <div className="form-group classes-form-group">
                <label className="classes-label-254">Description</label>
                <textarea className="form-control classes-form-control" value={editProgramForm.description} onChange={e => setEditProgramForm({...editProgramForm, description: e.target.value})}  />
              </div>

              <div className="modal-actions classes-modal-actions">
                <button type="button" onClick={() => setShowEditProgramModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal E: Program Details Hub Modal */}
      {showProgramDetailModal && selectedProgram && (
        <div className="modal classes-modal">
          <div className="modal-content classes-modal-content size-lg">
            
            {/* Modal Hero Header */}
            <div className="classes-row-259">
              <div className="classes-row-260">
                🎓
              </div>
              <div>
                <h3 className="classes-title-261">{selectedProgram.name}</h3>
                <span className="classes-span-262">
                  Code: <code className="classes-code-263">{selectedProgram.course_code}</code>
                </span>
              </div>
              <span className={`badge badge-${selectedProgram.is_active === 1 ? 'success' : 'secondary'} classes-span-264`}>
                {selectedProgram.is_active === 1 ? 'ACTIVE' : 'ARCHIVED'}
              </span>
            </div>

            {/* Tabs Header */}
            <div className="classes-row-265">
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
              <div className="classes-col-266">
                <div className="classes-div-267">
                  <span className="classes-span-268">Description</span>
                  <p className="classes-text-269">{selectedProgram.description || 'No syllabus description provided.'}</p>
                </div>

                <div className="classes-grid-270">
                  <div className="classes-div-271">
                    <span className="classes-span-272">Curriculum Options</span>
                    <div className="classes-col-273">
                      <div className="classes-row-274">
                        <span>Semesters Enforced:</span>
                        <strong style={{ color: selectedProgram.semester_enabled === 1 ? 'var(--success)' : 'var(--text-muted)' }}>
                          {selectedProgram.semester_enabled === 1 ? 'Yes' : 'No'}
                        </strong>
                      </div>
                      <div className="classes-row-275">
                        <span>Credits System:</span>
                        <strong style={{ color: selectedProgram.credit_system_enabled === 1 ? 'var(--success)' : 'var(--text-muted)' }}>
                          {selectedProgram.credit_system_enabled === 1 ? 'Yes' : 'No'}
                        </strong>
                      </div>
                      <div className="classes-row-276">
                        <span>Allows Electives:</span>
                        <strong style={{ color: selectedProgram.electives_enabled === 1 ? 'var(--success)' : 'var(--text-muted)' }}>
                          {selectedProgram.electives_enabled === 1 ? 'Yes' : 'No'}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div className="classes-col-277">
                    <div className="classes-div-278">
                      <span className="classes-span-279">Department Mapped</span>
                      <span className="classes-span-280">{getDeptCode(selectedProgram.department_id)}</span>
                    </div>
                    <div className="classes-div-281">
                      <span className="classes-span-282">Duration Cycle</span>
                      <span className="classes-span-283">{selectedProgram.duration_years} {selectedProgram.duration_years === 1 ? 'Year' : 'Years'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Syllabus / Subjects grouped */}
            {programDetailTab === 'syllabus' && (
              <div className="classes-col-284">
                {Object.keys(groupedSubjects).map(term => (
                  <div key={term} className="classes-div-285">
                    <h4 className="classes-title-286">
                      {term}
                    </h4>
                    <table className="classes-table-287">
                      <thead>
                        <tr className="classes-tr-288">
                          <th className="classes-th-289">Code</th>
                          <th className="classes-th-290">Subject Name</th>
                          <th className="classes-th-291">Credits</th>
                        </tr>
                      </thead>
                      <tbody>
                        {groupedSubjects[term]?.map((sub: any) => (
                          <tr key={sub.id} className="classes-tr-292">
                            <td className="classes-td-293"><code>{sub.subject_code}</code></td>
                            <td className="classes-td-294">{sub.subject_name}</td>
                            <td className="classes-td-295">{sub.credits || 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
                {detailSubjects.length === 0 && (
                  <div className="classes-div-296">
                    No subjects mapped to this curriculum layout.
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: Class Sections */}
            {programDetailTab === 'sections' && (
              <div className="classes-div-297">
                <table className="table classes-table">
                  <thead>
                    <tr>
                      <th className="classes-th-299">Section</th>
                      <th className="classes-th-300">Year / Sem Index</th>
                      <th className="classes-th-301">Class Teacher</th>
                      <th className="classes-th-302">Room</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailSections.map(sec => (
                      <tr key={sec.id} className="classes-tr-303">
                        <td className="classes-td-304">{sec.name}</td>
                        <td className="classes-td-305">Year {sec.year_number}</td>
                        <td className="classes-td-306">{getTeacherName(sec.class_teacher_id)}</td>
                        <td className="classes-td-307">{sec.room || '-'}</td>
                      </tr>
                    ))}
                    {detailSections.length === 0 && (
                      <tr>
                        <td colSpan={4} className="classes-td-308">
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
              <div className="classes-div-309">
                <div className="classes-col-310">
                  <div className="classes-div-311">
                    <div className="classes-div-312"  />
                    <span className="classes-span-313">
                      {selectedProgram.created_at ? new Date(selectedProgram.created_at).toLocaleDateString() : 'N/A'}
                    </span>
                    <strong className="classes-strong-314">Curriculum Registered</strong>
                    <span className="classes-span-315">Record initialized in system database.</span>
                  </div>
                  
                  <div className="classes-div-316">
                    <div className="classes-div-317"  />
                    <span className="classes-span-318">Current Status</span>
                    <strong className="classes-strong-319">
                      Status set to {selectedProgram.is_active === 1 ? 'ACTIVE' : 'ARCHIVED'}
                    </strong>
                  </div>
                </div>
              </div>
            )}

            {/* Close Actions */}
            <div className="modal-actions classes-modal-actions">
              <button type="button" onClick={() => setShowProgramDetailModal(false)} className="btn btn-secondary">Close Details</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
