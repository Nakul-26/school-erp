import './AcademicSetup.css';
import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import {
  Layers, ClipboardList, CalendarDays, Plus, Edit2, Trash2,
  CheckCircle2, AlertTriangle, Play, HelpCircle, User,
  Check, X, RefreshCw, ChevronDown, ChevronUp, Info, BookOpen
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

  const handleTabChange = (tab: string) => {
    setSearchParams({ tab });
  };

  useEffect(() => {
    fetchCoreData();
  }, []);

  const fetchCoreData = async () => {
    setLoading(true);
    try {
      const [yearsData, coursesData, sectionsData, subjectsData, teachersData] = await Promise.all([
        api.get('/academic-years').catch(() => []),
        api.get('/programs').catch(() => []), // programs map to courses in DB
        api.get('/sections').catch(() => []),
        api.get('/subjects').catch(() => []),
        api.get('/teachers').catch(() => [])
      ]);

      setAcademicYears(yearsData || []);
      setCourses(coursesData || []);
      setSections(sectionsData || []);
      setSubjects(subjectsData || []);
      setTeachers(teachersData || []);

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
        <div className="setup-banner card" style={{ padding: '1.25rem 1.5rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderLeft: '4px solid var(--primary)' }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '700', color: 'var(--text-main)' }}>Academic Setup</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
              Academic core configuration workflow step-by-step
            </p>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-secondary)' }}>School Year:</label>
            <select
              value={selectedYearId}
              onChange={(e) => handleYearChange(e.target.value)}
              className="input"
              style={{ width: '160px', padding: '0.4rem 0.6rem', height: 'auto', fontSize: '0.9rem' }}
            >
              <option value="">-- Select Year --</option>
              {academicYears.map(y => (
                <option key={y.id} value={y.id}>{y.name} {y.is_current === 1 ? '(Current)' : ''}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="setup-tabs card" style={{ padding: '0.25rem 0.5rem', marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', border: '1px solid var(--border)' }}>
          <button
            onClick={() => handleTabChange('curriculum')}
            className={`setup-tab-btn ${activeTab === 'curriculum' ? 'active' : ''}`}
          >
            <Layers size={15} />
            <span>1. Curriculum & Periods</span>
          </button>
          <button
            onClick={() => handleTabChange('assignments')}
            className={`setup-tab-btn ${activeTab === 'assignments' ? 'active' : ''}`}
          >
            <ClipboardList size={15} />
            <span>2. Subject Assignments</span>
          </button>
          <button
            onClick={() => handleTabChange('timetable')}
            className={`setup-tab-btn ${activeTab === 'timetable' ? 'active' : ''}`}
          >
            <CalendarDays size={15} />
            <span>3. Timetable Generator</span>
          </button>
        </div>

        {/* Render Tab Contents */}
        {loading ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <RefreshCw size={24} className="spin" style={{ marginBottom: '1rem' }} />
            <p>Loading academic details...</p>
          </div>
        ) : (
          <div className="setup-tab-content">
            {/* ──── TAB 1: CURRICULUM & PERIODS ──── */}
            {activeTab === 'curriculum' && (
              <div className="curriculum-container">
                <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ fontSize: '1.15rem', color: 'var(--text-main)' }}>Curriculum Definition</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                      Configure standard classes (Grades) and set how many periods/week each subject runs.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {courses.map(course => {
                    const courseSubjects = subjects.filter(s => s.course_id === course.id);
                    const isExpanded = !!expandedCourses[course.id];

                    return (
                      <div key={course.id} className="card course-accordion" style={{ padding: '0', overflow: 'hidden' }}>
                        <div
                          onClick={() => handleToggleCourse(course.id)}
                          className="accordion-header"
                          style={{
                            padding: '1rem 1.25rem',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            cursor: 'pointer',
                            background: 'var(--bg-subtle)',
                            borderBottom: isExpanded ? '1px solid var(--border)' : 'none'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)' }}></div>
                            <span style={{ fontWeight: '600', color: 'var(--text-main)', fontSize: '0.95rem' }}>
                              {course.name} <span style={{ color: 'var(--text-muted)', fontWeight: '400', fontSize: '0.85rem' }}>({course.course_code})</span>
                            </span>
                            <span className="badge" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}>
                              {courseSubjects.length} subjects
                            </span>
                          </div>
                          {isExpanded ? <ChevronUp size={16} color="var(--text-secondary)" /> : <ChevronDown size={16} color="var(--text-secondary)" />}
                        </div>

                        {isExpanded && (
                          <div className="accordion-content" style={{ padding: '1.25rem' }}>
                            {courseSubjects.length === 0 ? (
                              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-secondary)' }}>
                                <p style={{ fontSize: '0.9rem' }}>No subjects added to this grade yet.</p>
                                <button
                                  type="button"
                                  onClick={() => handleAddSubjectClick(course.id)}
                                  className="btn btn-secondary"
                                  style={{ marginTop: '0.75rem', padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}
                                >
                                  <Plus size={14} /> Add First Subject
                                </button>
                              </div>
                            ) : (
                              <div>
                                <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                  <thead>
                                    <tr>
                                      <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border)' }}>Subject</th>
                                      <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border)' }}>Code</th>
                                      <th style={{ textAlign: 'center', padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border)', width: '150px' }}>Weekly Periods</th>
                                      <th style={{ textAlign: 'right', padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border)', width: '120px' }}>Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {courseSubjects.map(sub => (
                                      <tr key={sub.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td style={{ padding: '0.65rem 0.75rem', fontWeight: '500', color: 'var(--text-main)' }}>{sub.subject_name}</td>
                                        <td style={{ padding: '0.65rem 0.75rem', color: 'var(--text-secondary)' }}>{sub.subject_code}</td>
                                        <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center' }}>
                                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-subtle)', padding: '0.25rem 0.5rem', borderRadius: 'var(--radius-sm)' }}>
                                            <button
                                              type="button"
                                              onClick={async () => {
                                                if (sub.weekly_hours > 1) {
                                                  await api.put(`/subjects/${sub.id}`, { ...sub, weekly_hours: sub.weekly_hours - 1 });
                                                  const updatedSubs = await api.get('/subjects');
                                                  setSubjects(updatedSubs);
                                                }
                                              }}
                                              style={{ border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                            >
                                              -
                                            </button>
                                            <span style={{ fontWeight: '600', minWidth: '20px' }}>{sub.weekly_hours}</span>
                                            <button
                                              type="button"
                                              onClick={async () => {
                                                await api.put(`/subjects/${sub.id}`, { ...sub, weekly_hours: sub.weekly_hours + 1 });
                                                const updatedSubs = await api.get('/subjects');
                                                setSubjects(updatedSubs);
                                              }}
                                              style={{ border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                            >
                                              +
                                            </button>
                                          </div>
                                        </td>
                                        <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right' }}>
                                          <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
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
                                <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '1rem' }}>
                                  <button
                                    type="button"
                                    onClick={() => handleAddSubjectClick(course.id)}
                                    className="btn btn-primary"
                                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
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
                  })}
                </div>
              </div>
            )}

            {/* ──── TAB 2: SUBJECT ASSIGNMENTS ──── */}
            {activeTab === 'assignments' && (
              <div className="assignments-container">
                <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.15rem', color: 'var(--text-main)' }}>Teacher ↔ Subject assignments</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                      Assign subject teachers per class section. This updates the workload load balance metrics in real-time.
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-secondary)' }}>Class Section:</label>
                    <select
                      value={selectedSectionId}
                      onChange={(e) => {
                        setSelectedSectionId(e.target.value);
                        setSelectedTeacherId(null);
                      }}
                      className="input"
                      style={{ width: '160px', padding: '0.4rem 0.6rem', height: 'auto', fontSize: '0.9rem' }}
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

                  if (sectionSubjects.length === 0) {
                    return (
                      <div className="card" style={{ padding: '2.5rem 1.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
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
                      <div className="card" style={{ padding: '1rem 1.25rem' }}>
                        <h4 style={{ fontSize: '0.95rem', fontWeight: '600', color: 'var(--text-main)', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)', marginBottom: '0.75rem' }}>
                          Subject Assignments for Section {section?.name}
                        </h4>
                        <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                          <thead>
                            <tr>
                              <th style={{ textAlign: 'left', padding: '0.5rem 0.5rem', borderBottom: '1px solid var(--border)' }}>Subject</th>
                              <th style={{ textAlign: 'center', padding: '0.5rem 0.5rem', borderBottom: '1px solid var(--border)', width: '80px' }}>Periods</th>
                              <th style={{ textAlign: 'left', padding: '0.5rem 0.5rem', borderBottom: '1px solid var(--border)', width: '220px' }}>Assigned Teacher</th>
                              <th style={{ textAlign: 'right', padding: '0.5rem 0.5rem', borderBottom: '1px solid var(--border)', width: '100px' }}>Load Info</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sectionSubjects.map(sub => {
                              const alloc = allocations.find(
                                a => a.section_id === selectedSectionId && a.subject_id === sub.id && a.academic_year_id === selectedYearId
                              );
                              const assignedTeacherId = alloc ? alloc.teacher_id : '';
                              const load = getTeacherLoadInfo(assignedTeacherId);

                              return (
                                <tr key={sub.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                  <td style={{ padding: '0.65rem 0.5rem', fontWeight: '500', color: 'var(--text-main)' }}>
                                    {sub.subject_name} <span style={{ color: 'var(--text-muted)', fontWeight: '400', fontSize: '0.8rem' }}>({sub.subject_code})</span>
                                  </td>
                                  <td style={{ padding: '0.65rem 0.5rem', textAlign: 'center', fontWeight: '600', color: 'var(--text-secondary)' }}>
                                    {sub.weekly_hours}
                                  </td>
                                  <td style={{ padding: '0.65rem 0.5rem' }}>
                                    <select
                                      value={assignedTeacherId}
                                      onChange={(e) => handleAssignmentChange(sub.id, e.target.value)}
                                      className="input"
                                      style={{ padding: '0.3rem 0.5rem', height: 'auto', fontSize: '0.85rem' }}
                                    >
                                      <option value="">-- Unassigned --</option>
                                      {teachers
                                        .filter(t => t.status === 'ACTIVE')
                                        .map(t => (
                                          <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>
                                        ))}
                                    </select>
                                  </td>
                                  <td style={{ padding: '0.65rem 0.5rem', textAlign: 'right' }}>
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
                  <div className="card" style={{ padding: '3rem 1.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <Info size={32} style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }} />
                    <p style={{ fontWeight: '500' }}>Please select a class section above to view and edit subject assignments.</p>
                  </div>
                )}

                {/* Advanced Views (Collapsible filters) */}
                <div className="card" style={{ padding: '0', overflow: 'hidden', marginTop: '2rem' }}>
                  <div
                    onClick={() => setAdvancedViewsExpanded(!advancedViewsExpanded)}
                    className="accordion-header"
                    style={{
                      padding: '1rem 1.25rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      background: 'var(--bg-subtle)',
                      borderBottom: advancedViewsExpanded ? '1px solid var(--border)' : 'none'
                    }}
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
                    <div className="accordion-content" style={{ padding: '1.25rem' }}>
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

                      {/* 1. BY CLASS VIEW */}
                      {advancedViewMode === 'class' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                          {sections
                            .filter(s => s.academic_year_id === selectedYearId)
                            .map(sec => {
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
                            })}
                        </div>
                      )}

                      {/* 2. BY SUBJECT VIEW */}
                      {advancedViewMode === 'subject' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                          {subjects.map(sub => {
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
                          }).filter(Boolean)}
                        </div>
                      )}

                      {/* 3. BY TEACHER VIEW */}
                      {advancedViewMode === 'teacher' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                          {teachers
                            .filter(t => t.status === 'ACTIVE')
                            .map(teach => {
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
                            })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ──── TAB 3: TIMETABLE GENERATOR ──── */}
            {activeTab === 'timetable' && (
              <div className="timetable-generator-container">
                <div style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.15rem', color: 'var(--text-main)' }}>Timetable Generator setup checklist</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                    Verify academic setup status. Generate or open the schedule once all steps are checked.
                  </p>
                </div>

                <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-main)', marginBottom: '1.25rem' }}>
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
                      {!checklist.hasActiveYear && (
                        <button type="button" onClick={() => navigate('/setup')} className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', height: 'auto' }}>
                          Setup Year
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
                      {!checklist.hasClasses && (
                        <button type="button" onClick={() => navigate('/classes')} className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', height: 'auto' }}>
                          Create Classes
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
                      {!checklist.hasSubjects && (
                        <button type="button" onClick={() => navigate('/subjects')} className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', height: 'auto' }}>
                          Create Subjects
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
                      {!checklist.curriculumConfigured && (
                        <button type="button" onClick={() => handleTabChange('curriculum')} className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', height: 'auto' }}>
                          Configure Periods
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
                      {!checklist.hasTeachers && (
                        <button type="button" onClick={() => navigate('/teachers')} className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', height: 'auto' }}>
                          Register Teachers
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
                      {!checklist.assignmentsComplete && (
                        <button type="button" onClick={() => handleTabChange('assignments')} className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', height: 'auto' }}>
                          Assign Teachers
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="card" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '4px solid var(--primary)' }}>
                  <div>
                    <h4 style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text-main)' }}>Generate / Edit Timetable Grid</h4>
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
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.40)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card modal-content" style={{ width: '420px', padding: '1.5rem' }}>
            <h4 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '1rem' }}>
              {editingSubject ? 'Edit Subject Details' : 'Add Subject to Curriculum'}
            </h4>
            <form onSubmit={handleSubjectSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-secondary)' }}>Subject Name</label>
                  <input
                    type="text"
                    value={subjectForm.subject_name}
                    onChange={(e) => setSubjectForm({ ...subjectForm, subject_name: e.target.value })}
                    className="input"
                    placeholder="e.g. Mathematics"
                    required
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-secondary)' }}>Subject Code</label>
                  <input
                    type="text"
                    value={subjectForm.subject_code}
                    onChange={(e) => setSubjectForm({ ...subjectForm, subject_code: e.target.value })}
                    className="input"
                    placeholder="e.g. MATH-801"
                    required
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-secondary)' }}>Weekly Periods</label>
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

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
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
                  {submitting ? 'Saving...' : 'Save Subject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
