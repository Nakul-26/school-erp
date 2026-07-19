import './AcademicSetup.css';
import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import {
  Layers, ClipboardList, CalendarDays, Plus, Edit2, Trash2,
  CheckCircle2, AlertTriangle, Play, HelpCircle, User,
  Check, X, RefreshCw, ChevronDown, ChevronUp, Info, BookOpen, Search
} from 'lucide-react';

interface AcademicYear {
  id: string;
  name: string;
  is_current: number;
  status: string;
}

interface Course {
  id: string;
  name: string;
  course_code: string;
  department_id: string;
}

interface Section {
  id: string;
  name: string;
  course_id: string;
  academic_year_id: string;
  year_number: number;
}

interface Subject {
  id: string;
  subject_name: string;
  subject_code: string;
  weekly_hours: number;
  course_id: string;
  semester?: number;
}

interface Teacher {
  id: string;
  first_name: string;
  last_name: string;
  status: string;
}

interface Allocation {
  id: string;
  academic_year_id: string;
  section_id: string;
  subject_id: string;
  teacher_id: string;
  classes_per_week: number;
}

export default function AcademicSetup() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'curriculum';

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Core Data States
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);

  // Selected Filters
  const [selectedYearId, setSelectedYearId] = useState<string>('');
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');

  // Curriculum Modals & States
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [subjectForm, setSubjectForm] = useState({
    subject_name: '',
    subject_code: '',
    weekly_hours: 4,
    course_id: ''
  });

  // Accordion toggle states for Curriculum Grades
  const [expandedCourses, setExpandedCourses] = useState<Record<string, boolean>>({});

  // Collapsible toggle state for Advanced Views in Assignments
  const [advancedViewsExpanded, setAdvancedViewsExpanded] = useState(false);
  const [advancedViewMode, setAdvancedViewMode] = useState<'class' | 'subject' | 'teacher'>('class');

  // Currently inspected teacher workload details
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);

  // Search & Filter States
  const [curriculumSearchQuery, setCurriculumSearchQuery] = useState('');
  const [assignmentClassSearch, setAssignmentClassSearch] = useState('');
  const [assignmentSubjectSearch, setAssignmentSubjectSearch] = useState('');
  const [assignmentTeacherSearch, setAssignmentTeacherSearch] = useState('');
  const [departments, setDepartments] = useState<any[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<string>('All');
  const [assignmentStatusFilter, setAssignmentStatusFilter] = useState<string>('All');
  const [teacherLoadFilter, setTeacherLoadFilter] = useState<string>('All');
  const [assignmentCourseFilter, setAssignmentCourseFilter] = useState<string>('All');

  const handleTabChange = (tab: string) => {
    setSearchParams({ tab });
  };

  useEffect(() => {
    fetchCoreData();
  }, []);

  const fetchCoreData = async () => {
    setLoading(true);
    try {
      const [yearsData, coursesData, sectionsData, subjectsData, teachersData, deptsData] = await Promise.all([
        api.get('/academic-years').catch(() => []),
        api.get('/programs').catch(() => []), // programs map to courses in DB
        api.get('/sections').catch(() => []),
        api.get('/subjects').catch(() => []),
        api.get('/teachers').catch(() => []),
        api.get('/departments').catch(() => [])
      ]);

      setAcademicYears(yearsData || []);
      setCourses(coursesData || []);
      setSections(sectionsData || []);
      setSubjects(subjectsData || []);
      setTeachers(teachersData || []);
      setDepartments(deptsData || []);

      // Set default selected year (current or first)
      const currentYear = yearsData?.find((y: any) => y.is_current === 1) || yearsData?.[0];
      if (currentYear) {
        setSelectedYearId(currentYear.id);
        fetchAllocations(currentYear.id);
      }

      // Initialize accordion (first course expanded)
      if (coursesData && coursesData.length > 0) {
        setExpandedCourses({ [coursesData[0].id]: true });
      }

    } catch (err) {
      console.error('Failed to load academic setup data', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllocations = async (yearId: string) => {
    if (!yearId) return;
    try {
      const data = await api.get(`/teaching-allocations?academic_year_id=${yearId}`);
      setAllocations(data || []);
    } catch (err) {
      console.error('Failed to fetch teaching allocations', err);
    }
  };

  const handleYearChange = (yearId: string) => {
    setSelectedYearId(yearId);
    fetchAllocations(yearId);
    setSelectedSectionId('');
  };

  // ── Curriculum handlers ───────────────────────────────────────────────────

  const handleToggleCourse = (courseId: string) => {
    setExpandedCourses(prev => ({ ...prev, [courseId]: !prev[courseId] }));
  };

  const handleAddSubjectClick = (courseId: string) => {
    setEditingSubject(null);
    setSubjectForm({
      subject_name: '',
      subject_code: '',
      weekly_hours: 4,
      course_id: courseId
    });
    setShowSubjectModal(true);
  };

  const handleEditSubjectClick = (subject: Subject) => {
    setEditingSubject(subject);
    setSubjectForm({
      subject_name: subject.subject_name,
      subject_code: subject.subject_code,
      weekly_hours: subject.weekly_hours,
      course_id: subject.course_id
    });
    setShowSubjectModal(true);
  };

  const handleSubjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingSubject) {
        // Update subject
        await api.put(`/subjects/${editingSubject.id}`, {
          ...subjectForm,
          semester: editingSubject.semester || 1,
          is_elective: 0,
          status: 'ACTIVE'
        });
      } else {
        // Create subject
        await api.post('/subjects', {
          ...subjectForm,
          semester: 1,
          is_elective: 0,
          status: 'ACTIVE'
        });
      }
      
      // Refresh subjects
      const updatedSubs = await api.get('/subjects');
      setSubjects(updatedSubs || []);
      
      setShowSubjectModal(false);
    } catch (err: any) {
      alert(err.message || 'Failed to save subject.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSubject = async (subjectId: string) => {
    if (!confirm('Are you sure you want to delete this subject? This will soft-delete the subject record.')) return;
    try {
      await api.delete(`/subjects/${subjectId}`);
      const updatedSubs = await api.get('/subjects');
      setSubjects(updatedSubs || []);
    } catch (err: any) {
      alert(err.message || 'Error deleting subject.');
    }
  };

  // ── Subject Assignments handlers ──────────────────────────────────────────

  const getTeacherLoadInfo = (teacherId: string) => {
    if (!teacherId) return { hours: 0, classes: [] as string[], status: 'Healthy', color: 'var(--success)' };
    
    // Calculate total hours of allocations for this teacher in the active year
    const teacherAllocations = allocations.filter(a => a.teacher_id === teacherId && a.academic_year_id === selectedYearId);
    let totalHours = 0;
    const classesList: string[] = [];

    teacherAllocations.forEach(a => {
      const section = sections.find(s => s.id === a.section_id);
      const subject = subjects.find(s => s.id === a.subject_id);
      
      // Sum hours
      totalHours += a.classes_per_week || subject?.weekly_hours || 4;
      
      if (section && !classesList.includes(section.name)) {
        classesList.push(section.name);
      }
    });

    const isOverloaded = totalHours > 24;
    return {
      hours: totalHours,
      classes: classesList,
      status: isOverloaded ? 'Overloaded' : 'Healthy',
      color: isOverloaded ? 'var(--danger)' : 'var(--success)'
    };
  };

  const handleAssignmentChange = async (subjectId: string, teacherId: string) => {
    const existingAllocation = allocations.find(
      a => a.section_id === selectedSectionId && a.subject_id === subjectId && a.academic_year_id === selectedYearId
    );

    const section = sections.find(s => s.id === selectedSectionId);
    const program = courses.find(p => p.id === section?.course_id);
    const subject = subjects.find(s => s.id === subjectId);

    if (!section || !subject) return;

    try {
      if (teacherId === '') {
        // Change to unassigned (delete allocation)
        if (existingAllocation) {
          await api.delete(`/teaching-allocations/${existingAllocation.id}`);
        }
      } else {
        // Construct teaching allocation payload
        const payload = {
          section_id: selectedSectionId,
          subject_id: subjectId,
          teacher_id: teacherId,
          academic_year_id: selectedYearId,
          department_id: program?.department_id || 'DEFAULT_DEPT', // fallback if empty
          program_id: program?.id || '',
          semester: subject.semester || 1,
          year_number: section.year_number || 1,
          classes_per_week: subject.weekly_hours || 4,
          primary_teacher: 1
        };

        if (existingAllocation) {
          // Update allocation
          await api.put(`/teaching-allocations/${existingAllocation.id}`, payload);
        } else {
          // Create allocation
          const response = await api.post('/teaching-allocations', payload);
          if (response.warning) {
            alert(response.warning);
          }
        }
      }
      // Refresh allocations list
      fetchAllocations(selectedYearId);
    } catch (err: any) {
      alert(err.message || 'Failed to update teaching allocation.');
    }
  };

  // ── Timetable generator checklist validations ─────────────────────────────

  const getChecklistStatus = () => {
    const activeYear = academicYears.find(y => y.id === selectedYearId);
    const hasActiveYear = !!activeYear;

    const sectionsInYear = sections.filter(s => s.academic_year_id === selectedYearId);
    const hasClasses = sectionsInYear.length > 0;

    const hasSubjects = subjects.length > 0;

    // Check if any subject in courses has weekly_hours configured as 0
    const activeCourseIds = sectionsInYear.map(s => s.course_id);
    const relevantSubjects = subjects.filter(s => activeCourseIds.includes(s.course_id));
    const curriculumConfigured = relevantSubjects.length > 0 && relevantSubjects.every(s => s.weekly_hours > 0);

    const hasTeachers = teachers.length > 0;

    // Check if all subject allocations are complete for active sections
    let assignmentsComplete = false;
    if (hasClasses && relevantSubjects.length > 0) {
      let expectedAllocationsCount = 0;
      let actualAllocationsCount = 0;

      sectionsInYear.forEach(sec => {
        const secSubjects = subjects.filter(s => s.course_id === sec.course_id);
        expectedAllocationsCount += secSubjects.length;

        secSubjects.forEach(sub => {
          const alloc = allocations.find(a => a.section_id === sec.id && a.subject_id === sub.id && a.academic_year_id === selectedYearId);
          if (alloc && alloc.teacher_id) {
            actualAllocationsCount++;
          }
        });
      });

      assignmentsComplete = expectedAllocationsCount > 0 && actualAllocationsCount === expectedAllocationsCount;
    }

    const readyToGenerate = hasActiveYear && hasClasses && hasSubjects && curriculumConfigured && hasTeachers && assignmentsComplete;

    return {
      hasActiveYear,
      activeYearName: activeYear?.name || 'None Selected',
      hasClasses,
      classCount: sectionsInYear.length,
      hasSubjects,
      subjectCount: subjects.length,
      curriculumConfigured,
      hasTeachers,
      teacherCount: teachers.length,
      assignmentsComplete,
      readyToGenerate
    };
  };

  const checklist = getChecklistStatus();

  return (
    <Layout>
      <div className="academic-setup-page">
        {/* Banner with filters */}
        <div className="academic-setup-header">
          <div>
            <h2>Academic Setup</h2>
            <p>Academic core configuration workflow step-by-step</p>
          </div>
          <div className="academic-setup-year-filter">
            <label>School Year:</label>
            <select
              value={selectedYearId}
              onChange={(e) => handleYearChange(e.target.value)}
              className="input academic-setup-year-select"
            >
              <option value="">-- Select Year --</option>
              {academicYears.map(y => (
                <option key={y.id} value={y.id}>{y.name} {y.is_current === 1 ? '(Current)' : ''}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="academic-setup-tabs">
          <button
            onClick={() => handleTabChange('curriculum')}
            className={`academic-setup-tab-btn${activeTab === 'curriculum' ? ' is-active' : ''}`}
          >
            <Layers size={15} />
            <span>1. Curriculum & Periods</span>
          </button>
          <button
            onClick={() => handleTabChange('assignments')}
            className={`academic-setup-tab-btn${activeTab === 'assignments' ? ' is-active' : ''}`}
          >
            <ClipboardList size={15} />
            <span>2. Subject Assignments</span>
          </button>
          <button
            onClick={() => handleTabChange('timetable')}
            className={`academic-setup-tab-btn${activeTab === 'timetable' ? ' is-active' : ''}`}
          >
            <CalendarDays size={15} />
            <span>3. Timetable Generator</span>
          </button>
        </div>

        {/* Render Tab Contents */}
        {loading ? (
          <div className="academic-setup-loading-container">
            <RefreshCw size={24} className="spin academic-setup-loading-spinner" />
            <p>Loading academic details...</p>
          </div>
        ) : (
          <div className="setup-tab-content">
            {/* ──── TAB 1: CURRICULUM & PERIODS ──── */}
            {activeTab === 'curriculum' && (() => {
              const filteredCourses = courses.filter(course => {
                const matchDept = selectedDeptId === 'All' || course.department_id === selectedDeptId;
                const courseSubjects = subjects.filter(s => s.course_id === course.id);
                const matchesCourse = course.name.toLowerCase().includes(curriculumSearchQuery.toLowerCase()) ||
                                      course.course_code.toLowerCase().includes(curriculumSearchQuery.toLowerCase());
                const matchesSubject = courseSubjects.some(sub => 
                  sub.subject_name.toLowerCase().includes(curriculumSearchQuery.toLowerCase()) ||
                  sub.subject_code.toLowerCase().includes(curriculumSearchQuery.toLowerCase())
                );
                return matchDept && (matchesCourse || matchesSubject);
              });

              return (
                <div className="curriculum-container">
                  <div className="academic-setup-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <div className="academic-setup-section-header-left">
                      <h3>Curriculum Definition</h3>
                      <p>
                        Configure standard classes (Grades) and set how many periods/week each subject runs.
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      <select
                        value={selectedDeptId}
                        onChange={e => setSelectedDeptId(e.target.value)}
                        className="input"
                        style={{ padding: '0.35rem 0.65rem', fontSize: '0.85rem', minWidth: '150px', cursor: 'pointer', height: 'auto' }}
                      >
                        <option value="All">All Departments</option>
                        {departments.map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>

                      <div className="search-container">
                        <Search size={14} />
                        <input
                          type="text"
                          placeholder="Search grades or subjects..."
                          value={curriculumSearchQuery}
                          onChange={e => setCurriculumSearchQuery(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="academic-setup-list-layout">
                    {filteredCourses.length === 0 ? (
                      <div className="academic-setup-empty-container" style={{ padding: '3rem', textAlign: 'center', background: 'var(--bg-card)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)' }}>
                        <BookOpen size={32} style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }} />
                        <p style={{ fontWeight: '500', color: 'var(--text-secondary)' }}>No grades or subjects found matching "{curriculumSearchQuery}"</p>
                      </div>
                    ) : (
                      filteredCourses.map(course => {
                        const courseSubjects = subjects.filter(s => s.course_id === course.id);
                        const isExpanded = !!expandedCourses[course.id] || curriculumSearchQuery.trim() !== '';

                        return (
                          <div key={course.id} className="academic-setup-course-accordion">
                            <div
                              onClick={() => handleToggleCourse(course.id)}
                              className="academic-setup-accordion-header"
                            >
                              <div className="academic-setup-accordion-title-container">
                                <div className="academic-setup-accordion-dot"></div>
                                <span className="academic-setup-accordion-title">
                                  {course.name} <span className="academic-setup-accordion-subtitle">({course.course_code})</span>
                                </span>
                                <span className="badge badge-secondary academic-setup-accordion-badge">
                                  {courseSubjects.length} subjects
                                </span>
                              </div>
                              {isExpanded ? <ChevronUp size={16} color="var(--text-secondary)" /> : <ChevronDown size={16} color="var(--text-secondary)" />}
                            </div>

                            {isExpanded && (
                              <div className="academic-setup-accordion-content">
                                {courseSubjects.length === 0 ? (
                                  <div className="academic-setup-empty-container">
                                    <p>No subjects added to this grade yet.</p>
                                    <button
                                      type="button"
                                      onClick={() => handleAddSubjectClick(course.id)}
                                      className="btn btn-secondary academic-setup-empty-action-btn"
                                    >
                                      <Plus size={14} /> Add First Subject
                                    </button>
                                  </div>
                                ) : (
                                  <div>
                                    <table className="academic-setup-table">
                                      <thead>
                                        <tr>
                                          <th>Subject</th>
                                          <th>Code</th>
                                          <th style={{ textAlign: 'center', width: '150px' }}>Weekly Periods</th>
                                          <th style={{ textAlign: 'right', width: '120px' }}>Actions</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {courseSubjects.map(sub => (
                                          <tr key={sub.id}>
                                            <td style={{ fontWeight: '500', color: 'var(--text-main)' }}>{sub.subject_name}</td>
                                            <td style={{ color: 'var(--text-secondary)' }}>{sub.subject_code}</td>
                                            <td style={{ textAlign: 'center' }}>
                                              <div className="academic-setup-periods-badge">
                                                <button
                                                  type="button"
                                                  onClick={async () => {
                                                    if (sub.weekly_hours > 1) {
                                                      await api.put(`/subjects/${sub.id}`, { ...sub, weekly_hours: sub.weekly_hours - 1 });
                                                      const updatedSubs = await api.get('/subjects');
                                                      setSubjects(updatedSubs);
                                                    }
                                                  }}
                                                  className="academic-setup-periods-btn"
                                                >
                                                  -
                                                </button>
                                                <span className="academic-setup-periods-val">{sub.weekly_hours}</span>
                                                <button
                                                  type="button"
                                                  onClick={async () => {
                                                    await api.put(`/subjects/${sub.id}`, { ...sub, weekly_hours: sub.weekly_hours + 1 });
                                                    const updatedSubs = await api.get('/subjects');
                                                    setSubjects(updatedSubs);
                                                  }}
                                                  className="academic-setup-periods-btn"
                                                >
                                                  +
                                                </button>
                                              </div>
                                            </td>
                                            <td style={{ textAlign: 'right' }}>
                                              <div className="academic-setup-actions-row">
                                                <button
                                                  type="button"
                                                  onClick={() => handleEditSubjectClick(sub)}
                                                  className="btn-icon"
                                                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem', color: 'var(--text-secondary)' }}
                                                  title="Edit Subject"
                                                >
                                                  <Edit2 size={13} />
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => handleDeleteSubject(sub.id)}
                                                  className="btn-icon"
                                                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem', color: 'var(--danger)' }}
                                                  title="Delete Subject"
                                                >
                                                  <Trash2 size={13} />
                                                </button>
                                              </div>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                    <div className="academic-setup-footer-row">
                                      <button
                                        type="button"
                                        onClick={() => handleAddSubjectClick(course.id)}
                                        className="btn btn-primary"
                                      >
                                        <Plus size={14} /> Add Subject to {course.name}
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })()}

            {/* ──── TAB 2: SUBJECT ASSIGNMENTS ──── */}
            {activeTab === 'assignments' && (
              <div className="assignments-container">
                <div className="academic-setup-section-header">
                  <div className="academic-setup-section-header-left">
                    <h3>Teacher ↔ Subject Assignments</h3>
                    <p>
                      Assign subject teachers per class section. This updates workload balance metrics in real-time.
                    </p>
                  </div>
                  <div className="academic-setup-year-filter">
                    <label>Class Section:</label>
                    <select
                      value={selectedSectionId}
                      onChange={(e) => {
                        setSelectedSectionId(e.target.value);
                        setSelectedTeacherId(null);
                      }}
                      className="input academic-setup-year-select"
                    >
                      <option value="">-- Select Class --</option>
                      {sections
                        .filter(s => s.academic_year_id === selectedYearId)
                        .map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                  </div>
                </div>

                {selectedSectionId ? (() => {
                  const section = sections.find(s => s.id === selectedSectionId);
                  const sectionSubjects = subjects.filter(s => s.course_id === section?.course_id);
                  const filteredSectionSubjects = sectionSubjects.filter(sub => {
                    const alloc = allocations.find(
                      a => a.section_id === selectedSectionId && a.subject_id === sub.id && a.academic_year_id === selectedYearId
                    );
                    const assignedTeacherId = alloc ? alloc.teacher_id : '';
                    
                    if (assignmentStatusFilter === 'All') return true;
                    if (assignmentStatusFilter === 'Unassigned') return !assignedTeacherId;
                    if (assignmentStatusFilter === 'Assigned') return !!assignedTeacherId;
                    if (assignmentStatusFilter === 'Overloaded') {
                      if (!assignedTeacherId) return false;
                      const load = getTeacherLoadInfo(assignedTeacherId);
                      return load.hours > 24;
                    }
                    return true;
                  });

                  if (sectionSubjects.length === 0) {
                    return (
                      <div className="academic-setup-empty-container">
                        <Info size={32} style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }} />
                        <p style={{ fontWeight: '500' }}>No subjects defined for this class's curriculum grade.</p>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                          Add subjects to this course program first under the <a href="#" onClick={(e) => { e.preventDefault(); handleTabChange('curriculum'); }} style={{ color: 'var(--primary)', fontWeight: '600' }}>Curriculum</a> tab.
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div style={{ display: 'grid', gridTemplateColumns: selectedTeacherId ? '1fr 320px' : '1fr', gap: '1.5rem', alignItems: 'start' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                          <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-main)', margin: 0 }}>
                            Subject Assignments for Section {section?.name}
                          </h4>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Filter Assignment:</span>
                            <select
                              value={assignmentStatusFilter}
                              onChange={e => setAssignmentStatusFilter(e.target.value)}
                              className="input"
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', width: 'auto', height: 'auto', minWidth: '140px', cursor: 'pointer' }}
                            >
                              <option value="All">All Subjects</option>
                              <option value="Unassigned">Unassigned</option>
                              <option value="Assigned">Assigned</option>
                              <option value="Overloaded">Overloaded Teachers</option>
                            </select>
                          </div>
                        </div>

                        {filteredSectionSubjects.length === 0 ? (
                          <div className="academic-setup-empty-container" style={{ padding: '2rem', textAlign: 'center' }}>
                            <Info size={24} style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }} />
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>No subjects match the selected assignment filter.</p>
                          </div>
                        ) : (
                          <table className="academic-setup-table">
                            <thead>
                              <tr>
                                <th>Subject</th>
                                <th style={{ textAlign: 'center', width: '80px' }}>Periods</th>
                                <th style={{ width: '260px' }}>Assigned Teacher</th>
                                <th style={{ textAlign: 'right', width: '100px' }}>Load Info</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredSectionSubjects.map(sub => {
                              const alloc = allocations.find(
                                a => a.section_id === selectedSectionId && a.subject_id === sub.id && a.academic_year_id === selectedYearId
                              );
                              const assignedTeacherId = alloc ? alloc.teacher_id : '';
                              const load = getTeacherLoadInfo(assignedTeacherId);

                              return (
                                <tr key={sub.id}>
                                  <td style={{ fontWeight: '500', color: 'var(--text-main)' }}>
                                    {sub.subject_name} <span style={{ color: 'var(--text-muted)', fontWeight: '400', fontSize: '0.8rem' }}>({sub.subject_code})</span>
                                  </td>
                                  <td style={{ textAlign: 'center', fontWeight: '600', color: 'var(--text-secondary)' }}>
                                    {sub.weekly_hours}
                                  </td>
                                  <td>
                                    <select
                                      value={assignedTeacherId}
                                      onChange={(e) => handleAssignmentChange(sub.id, e.target.value)}
                                      className="input"
                                      style={{ padding: '0.3rem 0.5rem', height: 'auto', fontSize: '0.85rem', width: '100%' }}
                                    >
                                      <option value="">-- Unassigned --</option>
                                      {teachers
                                        .filter(t => t.status === 'ACTIVE')
                                        .map(t => {
                                          const tLoad = getTeacherLoadInfo(t.id);
                                          return (
                                            <option key={t.id} value={t.id}>
                                              {`${t.first_name} ${t.last_name} (${tLoad.hours}/24 periods - ${tLoad.hours > 24 ? '⚠️ Overloaded' : (tLoad.hours > 18 ? 'Nearly Full' : '✓ Available')})`}
                                            </option>
                                          );
                                        })}
                                    </select>
                                  </td>
                                  <td style={{ textAlign: 'right' }}>
                                    {assignedTeacherId ? (
                                      <button
                                        type="button"
                                        onClick={() => setSelectedTeacherId(assignedTeacherId)}
                                        className="btn"
                                        style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', height: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', borderColor: load.color, color: load.color }}
                                      >
                                        <span>{load.hours} hrs</span>
                                        <Info size={12} />
                                      </button>
                                    ) : (
                                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>-</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                        )}
                      </div>

                      {/* Teacher Load Panel */}
                      {selectedTeacherId && (() => {
                        const teacher = teachers.find(t => t.id === selectedTeacherId);
                        const load = getTeacherLoadInfo(selectedTeacherId);

                        return (
                          <div className="card teacher-load-card" style={{ borderLeft: `4px solid ${load.color}`, position: 'sticky', top: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                              <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-main)' }}>Teacher Workload</h4>
                              <button
                                type="button"
                                onClick={() => setSelectedTeacherId(null)}
                                style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
                              >
                                <X size={15} />
                              </button>
                            </div>
                            <p style={{ fontWeight: '600', fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: '0.75rem' }}>
                              {teacher?.first_name} {teacher?.last_name}
                            </p>

                            <div style={{ marginBottom: '1rem', background: 'var(--bg-subtle)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Weekly Load:</span>
                                <span style={{ fontWeight: '700', color: load.color }}>{load.hours} / 24 periods</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Status:</span>
                                <span style={{ fontWeight: '700', color: load.color }}>
                                  {load.status === 'Overloaded' ? '⚠️ Overloaded' : '🟢 Healthy'}
                                </span>
                              </div>
                            </div>

                            <div style={{ fontSize: '0.85rem' }}>
                              <div style={{ fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Assigned Classes:</div>
                              {load.classes.length === 0 ? (
                                <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No classes assigned.</p>
                              ) : (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                                  {load.classes.map(clsName => (
                                    <span key={clsName} className="badge badge-secondary" style={{ fontSize: '0.75rem' }}>
                                      {clsName}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  );
                })() : (
                  <div className="academic-setup-empty-container">
                    <Info size={32} style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }} />
                    <p style={{ fontWeight: '500' }}>Please select a class section above to view and edit subject assignments.</p>
                  </div>
                )}

                {/* Advanced Views (Collapsible filters) */}
                <div className="academic-setup-course-accordion" style={{ marginTop: '2rem' }}>
                  <div
                    onClick={() => setAdvancedViewsExpanded(!advancedViewsExpanded)}
                    className="academic-setup-accordion-header"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600', color: 'var(--text-main)', fontSize: '0.9rem' }}>
                      <ClipboardList size={16} />
                      <span>{advancedViewsExpanded ? '▼ Advanced Views' : '▶ Advanced Views'}</span>
                    </div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      View teaching assignments by Class, Subject, or Teacher
                    </span>
                  </div>

                  {advancedViewsExpanded && (
                    <div className="academic-setup-accordion-content">
                      <div className="sub-tabs" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                        <button
                          type="button"
                          onClick={() => setAdvancedViewMode('class')}
                          className={`btn ${advancedViewMode === 'class' ? 'btn-primary' : 'btn-secondary'}`}
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', height: 'auto' }}
                        >
                          By Class View
                        </button>
                        <button
                          type="button"
                          onClick={() => setAdvancedViewMode('subject')}
                          className={`btn ${advancedViewMode === 'subject' ? 'btn-primary' : 'btn-secondary'}`}
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', height: 'auto' }}
                        >
                          By Subject View
                        </button>
                        <button
                          type="button"
                          onClick={() => setAdvancedViewMode('teacher')}
                          className={`btn ${advancedViewMode === 'teacher' ? 'btn-primary' : 'btn-secondary'}`}
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', height: 'auto' }}
                        >
                          By Teacher View
                        </button>
                      </div>

                      {/* Search inputs for advanced view modes */}
                      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                        {advancedViewMode === 'class' && (
                          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                            <select
                              value={assignmentCourseFilter}
                              onChange={e => setAssignmentCourseFilter(e.target.value)}
                              className="input"
                              style={{ padding: '0.35rem 0.65rem', fontSize: '0.85rem', minWidth: '150px', cursor: 'pointer', height: 'auto' }}
                            >
                              <option value="All">All Grades</option>
                              {courses.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                              ))}
                            </select>

                            <div className="search-container">
                              <Search size={14} />
                              <input
                                type="text"
                                placeholder="Search class sections..."
                                value={assignmentClassSearch}
                                onChange={e => setAssignmentClassSearch(e.target.value)}
                              />
                            </div>
                          </div>
                        )}
                        {advancedViewMode === 'subject' && (
                          <div className="search-container">
                            <Search size={14} />
                            <input
                              type="text"
                              placeholder="Search subjects..."
                              value={assignmentSubjectSearch}
                              onChange={e => setAssignmentSubjectSearch(e.target.value)}
                            />
                          </div>
                        )}
                        {advancedViewMode === 'teacher' && (
                          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                            <select
                              value={teacherLoadFilter}
                              onChange={e => setTeacherLoadFilter(e.target.value)}
                              className="input"
                              style={{ padding: '0.35rem 0.65rem', fontSize: '0.85rem', minWidth: '155px', cursor: 'pointer', height: 'auto' }}
                            >
                              <option value="All">All Workloads</option>
                              <option value="Available">Available (load &gt; 0)</option>
                              <option value="Overloaded">Overloaded (&gt; 24)</option>
                              <option value="Unassigned">Unassigned (0 periods)</option>
                            </select>

                            <div className="search-container">
                              <Search size={14} />
                              <input
                                type="text"
                                placeholder="Search teachers..."
                                value={assignmentTeacherSearch}
                                onChange={e => setAssignmentTeacherSearch(e.target.value)}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* 1. BY CLASS VIEW */}
                      {advancedViewMode === 'class' && (() => {
                        const filteredSections = sections.filter(
                          s => s.academic_year_id === selectedYearId &&
                          s.name.toLowerCase().includes(assignmentClassSearch.toLowerCase()) &&
                          (assignmentCourseFilter === 'All' || s.course_id === assignmentCourseFilter)
                        );
                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {filteredSections.length === 0 ? (
                              <p style={{ fontStyle: 'italic', fontSize: '0.85rem', color: 'var(--text-muted)' }}>No class sections match your search.</p>
                            ) : (
                              filteredSections.map(sec => {
                                const secAllocations = allocations.filter(a => a.section_id === sec.id && a.academic_year_id === selectedYearId);
                                return (
                                  <div key={sec.id} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0.75rem 1rem' }}>
                                    <h5 style={{ fontWeight: '700', fontSize: '0.85rem', color: 'var(--text-main)', marginBottom: '0.5rem' }}>Section {sec.name}</h5>
                                    {secAllocations.length === 0 ? (
                                      <p style={{ fontStyle: 'italic', fontSize: '0.8rem', color: 'var(--text-muted)' }}>No assignments made yet.</p>
                                    ) : (
                                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
                                        {secAllocations.map(a => {
                                          const sub = subjects.find(s => s.id === a.subject_id);
                                          const teach = teachers.find(t => t.id === a.teacher_id);
                                          return (
                                            <div key={a.id} style={{ background: 'var(--bg-subtle)', padding: '0.5rem', borderRadius: 'var(--radius-xs)', fontSize: '0.8rem' }}>
                                              <span style={{ fontWeight: '600' }}>{sub?.subject_name}:</span> {teach ? `${teach.first_name} ${teach.last_name}` : 'Unassigned'}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                );
                              })
                            )}
                          </div>
                        );
                      })()}

                      {/* 2. BY SUBJECT VIEW */}
                      {advancedViewMode === 'subject' && (() => {
                        const filteredSubjects = subjects.filter(
                          sub => sub.subject_name.toLowerCase().includes(assignmentSubjectSearch.toLowerCase()) ||
                          sub.subject_code.toLowerCase().includes(assignmentSubjectSearch.toLowerCase())
                        );
                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {filteredSubjects.length === 0 ? (
                              <p style={{ fontStyle: 'italic', fontSize: '0.85rem', color: 'var(--text-muted)' }}>No subjects match your search.</p>
                            ) : (
                              filteredSubjects.map(sub => {
                                const subAllocations = allocations.filter(a => a.subject_id === sub.id && a.academic_year_id === selectedYearId);
                                if (subAllocations.length === 0) return null; // only show subjects with assignments
                                return (
                                  <div key={sub.id} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0.75rem 1rem' }}>
                                    <h5 style={{ fontWeight: '700', fontSize: '0.85rem', color: 'var(--text-main)', marginBottom: '0.5rem' }}>{sub.subject_name} ({sub.subject_code})</h5>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
                                      {subAllocations.map(a => {
                                        const sec = sections.find(s => s.id === a.section_id);
                                        const teach = teachers.find(t => t.id === a.teacher_id);
                                        return (
                                          <div key={a.id} style={{ background: 'var(--bg-subtle)', padding: '0.5rem', borderRadius: 'var(--radius-xs)', fontSize: '0.8rem' }}>
                                            <span style={{ fontWeight: '600' }}>Section {sec?.name}:</span> {teach ? `${teach.first_name} ${teach.last_name}` : 'Unassigned'}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              }).filter(Boolean)
                            )}
                          </div>
                        );
                      })()}

                      {/* 3. BY TEACHER VIEW */}
                      {advancedViewMode === 'teacher' && (() => {
                        const filteredTeachers = teachers.filter(t => {
                          if (t.status !== 'ACTIVE') return false;
                          const matchesSearch = (`${t.first_name} ${t.last_name}`).toLowerCase().includes(assignmentTeacherSearch.toLowerCase());
                          if (!matchesSearch) return false;

                          const load = getTeacherLoadInfo(t.id);
                          if (teacherLoadFilter === 'All') return true;
                          if (teacherLoadFilter === 'Overloaded') return load.hours > 24;
                          if (teacherLoadFilter === 'Available') return load.hours <= 24 && load.hours > 0;
                          if (teacherLoadFilter === 'Unassigned') return load.hours === 0;
                          return true;
                        });
                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {filteredTeachers.length === 0 ? (
                              <p style={{ fontStyle: 'italic', fontSize: '0.85rem', color: 'var(--text-muted)' }}>No teachers match your search.</p>
                            ) : (
                              filteredTeachers.map(teach => {
                                const teachAllocations = allocations.filter(a => a.teacher_id === teach.id && a.academic_year_id === selectedYearId);
                                const load = getTeacherLoadInfo(teach.id);
                                return (
                                  <div key={teach.id} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0.75rem 1rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                      <h5 style={{ fontWeight: '700', fontSize: '0.85rem', color: 'var(--text-main)' }}>
                                        {teach.first_name} {teach.last_name}
                                      </h5>
                                      <span style={{ fontSize: '0.8rem', fontWeight: '600', color: load.color }}>
                                        {load.hours} hours ({load.status})
                                      </span>
                                    </div>
                                    {teachAllocations.length === 0 ? (
                                      <p style={{ fontStyle: 'italic', fontSize: '0.8rem', color: 'var(--text-muted)' }}>No teaching assignments assigned.</p>
                                    ) : (
                                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                        {teachAllocations.map(a => {
                                          const sub = subjects.find(s => s.id === a.subject_id);
                                          const sec = sections.find(s => s.id === a.section_id);
                                          return (
                                            <span key={a.id} style={{ background: 'var(--bg-subtle)', padding: '0.3rem 0.5rem', borderRadius: 'var(--radius-xs)', fontSize: '0.75rem', border: '1px solid var(--border)' }}>
                                              {sub?.subject_name} in {sec?.name}
                                            </span>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                );
                              })
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ──── TAB 3: TIMETABLE GENERATOR ──── */}
            {activeTab === 'timetable' && (
              <div className="timetable-generator-container">
                <div style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.15rem', color: 'var(--text-main)' }}>Timetable Generator Setup Checklist</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                    Verify academic setup status. Generate or open the schedule once all steps are checked.
                  </p>
                </div>

                <div style={{ marginBottom: '2rem' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '1.25rem' }}>
                    Academic Setup Verification Checklist
                  </h4>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {/* Step 1: School Year */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {checklist.hasActiveYear ? <CheckCircle2 size={18} color="var(--success)" /> : <AlertTriangle size={18} color="var(--warning)" />}
                        <div>
                          <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>1. School Year Configured</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Active: {checklist.activeYearName}</div>
                        </div>
                      </div>
                      {checklist.hasActiveYear ? (
                        <span className="academic-checklist-completed-badge">Completed</span>
                      ) : (
                        <button type="button" onClick={() => navigate('/setup')} className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', height: 'auto' }}>
                          Setup Year →
                        </button>
                      )}
                    </div>

                    {/* Step 2: Classes */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {checklist.hasClasses ? <CheckCircle2 size={18} color="var(--success)" /> : <AlertTriangle size={18} color="var(--warning)" />}
                        <div>
                          <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>2. Class Sections Defined</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Found {checklist.classCount} sections for this year</div>
                        </div>
                      </div>
                      {checklist.hasClasses ? (
                        <span className="academic-checklist-completed-badge">Completed</span>
                      ) : (
                        <button type="button" onClick={() => navigate('/classes')} className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', height: 'auto' }}>
                          Define Classes →
                        </button>
                      )}
                    </div>

                    {/* Step 3: Subjects */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {checklist.hasSubjects ? <CheckCircle2 size={18} color="var(--success)" /> : <AlertTriangle size={18} color="var(--warning)" />}
                        <div>
                          <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>3. Subjects Created</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Found {checklist.subjectCount} subjects total</div>
                        </div>
                      </div>
                      {checklist.hasSubjects ? (
                        <span className="academic-checklist-completed-badge">Completed</span>
                      ) : (
                        <button type="button" onClick={() => navigate('/subjects')} className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', height: 'auto' }}>
                          Create Subjects →
                        </button>
                      )}
                    </div>

                    {/* Step 4: Curriculum */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {checklist.curriculumConfigured ? <CheckCircle2 size={18} color="var(--success)" /> : <AlertTriangle size={18} color="var(--warning)" />}
                        <div>
                          <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>4. Curriculum Periods Configured</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>All subjects in current grades have positive weekly periods</div>
                        </div>
                      </div>
                      {checklist.curriculumConfigured ? (
                        <span className="academic-checklist-completed-badge">Completed</span>
                      ) : (
                        <button type="button" onClick={() => handleTabChange('curriculum')} className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', height: 'auto' }}>
                          Configure Periods →
                        </button>
                      )}
                    </div>

                    {/* Step 5: Teachers */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {checklist.hasTeachers ? <CheckCircle2 size={18} color="var(--success)" /> : <AlertTriangle size={18} color="var(--warning)" />}
                        <div>
                          <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>5. Teachers Registered</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Found {checklist.teacherCount} active teachers</div>
                        </div>
                      </div>
                      {checklist.hasTeachers ? (
                        <span className="academic-checklist-completed-badge">Completed</span>
                      ) : (
                        <button type="button" onClick={() => navigate('/teachers')} className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', height: 'auto' }}>
                          Register Teachers →
                        </button>
                      )}
                    </div>

                    {/* Step 6: Subject Assignments */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {checklist.assignmentsComplete ? <CheckCircle2 size={18} color="var(--success)" /> : <AlertTriangle size={18} color="var(--warning)" />}
                        <div>
                          <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>6. Subject Assignments Completed</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>All subjects for all current class sections have teachers assigned</div>
                        </div>
                      </div>
                      {checklist.assignmentsComplete ? (
                        <span className="academic-checklist-completed-badge">Completed</span>
                      ) : (
                        <button type="button" onClick={() => handleTabChange('assignments')} className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', height: 'auto' }}>
                          Assign Teachers →
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ padding: '1.5rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)' }}>
                  <div>
                    <h4 style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text-main)', margin: 0 }}>Generate / Edit Timetable Grid</h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                      {checklist.readyToGenerate
                        ? 'All academic setup prerequisites have been satisfied! Go to scheduler to set slot times.'
                        : 'Prerequisites must be completed before configuring timetable slots. Complete the warnings above.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('/timetable')}
                    className="btn btn-primary"
                    disabled={!checklist.readyToGenerate}
                    style={{ padding: '0.6rem 1.2rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                  >
                    <span>Go to Scheduler</span>
                    <Play size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Add/Edit Subject Modal ── */}
      {showSubjectModal && (
        <div className="academic-setup-modal-overlay">
          <div className="card modal-content academic-setup-modal-card">
            <h4 className="academic-setup-modal-title">
              {editingSubject ? 'Edit Subject' : 'Add Subject'}
            </h4>
            <form onSubmit={handleSubjectSubmit}>
              <div className="academic-setup-modal-form-layout">
                <div className="academic-setup-form-group-col">
                  <label className="academic-setup-form-label-styled">Name *</label>
                  <input
                    type="text"
                    value={subjectForm.subject_name}
                    onChange={(e) => setSubjectForm({ ...subjectForm, subject_name: e.target.value })}
                    className="input"
                    placeholder="e.g. Mathematics"
                    required
                  />
                </div>

                <div className="academic-setup-form-group-col">
                  <label className="academic-setup-form-label-styled">Code</label>
                  <input
                    type="text"
                    value={subjectForm.subject_code}
                    onChange={(e) => setSubjectForm({ ...subjectForm, subject_code: e.target.value })}
                    className="input"
                    placeholder="e.g. MATH-801"
                    required
                  />
                </div>

                <div className="academic-setup-form-group-col">
                  <label className="academic-setup-form-label-styled">Weekly classes per week</label>
                  <input
                    type="number"
                    min="1"
                    max="15"
                    value={subjectForm.weekly_hours}
                    onChange={(e) => setSubjectForm({ ...subjectForm, weekly_hours: parseInt(e.target.value) || 4 })}
                    className="input"
                    required
                  />
                </div>
              </div>

              <div className="academic-setup-modal-actions-row">
                <button
                  type="button"
                  onClick={() => setShowSubjectModal(false)}
                  className="btn btn-secondary"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
