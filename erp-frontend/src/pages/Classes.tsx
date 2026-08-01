import './Classes.css';
import React, { useEffect, useState } from 'react';
import { PageGuidance } from '../components/PageGuidance';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import {
  Plus,
  SlidersHorizontal,
  BookOpen
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useConfirm } from '../contexts/ConfirmDialogContext';
import { hasAnyPermission, hasAnyRole } from '../utils/accessControl';

import { classesService } from './classes/classesService';
import { SectionsKpiCards } from './classes/components/SectionsKpiCards';
import { SectionsFiltersBar } from './classes/components/SectionsFiltersBar';
import { SectionsTable } from './classes/components/SectionsTable';
import { SectionFormModal } from './classes/components/SectionFormModal';
import { SectionDetailModal } from './classes/components/SectionDetailModal';
import { BulkActionsBar } from './classes/components/BulkActionsBar';
import { BulkTeacherModal } from './classes/components/BulkTeacherModal';
import { ProgramsKpiCards } from './classes/components/ProgramsKpiCards';
import { ProgramsFiltersBar } from './classes/components/ProgramsFiltersBar';
import { ProgramsTable } from './classes/components/ProgramsTable';
import { AddProgramModal } from './classes/components/AddProgramModal';
import { EditProgramModal } from './classes/components/EditProgramModal';
import { ProgramDetailModal } from './classes/components/ProgramDetailModal';
import { AddSemesterModal } from './classes/components/AddSemesterModal';
import type { AddSemesterForm } from './classes/components/AddSemesterModal';
import type { Semester, StudentBacklogs, PrerequisiteLink } from './classes/classes.types';

export default function Classes() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const confirm = useConfirm();

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
  const userRoles = user?.roles || (user?.role ? [user.role] : []);
  const userPermissions = user?.permissions || [];
  const canManageAcademic = hasAnyPermission(userPermissions, ['academic.manage']) ||
    hasAnyRole(userRoles, ['admin', 'super_admin', 'Principal', 'HOD']);
  const [institutionType, setInstitutionType] = useState<string>('college');

  // Terminology helpers
  const getProgramLabel = () => institutionType === 'school' ? 'Class' : 'Program';
  const getProgramsLabel = () => institutionType === 'school' ? 'Classes' : 'Programs';

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

  // Bulk Actions State
  const [selectedSectionIds, setSelectedSectionIds] = useState<string[]>([]);
  const [showBulkTeacherModal, setShowBulkTeacherModal] = useState<boolean>(false);
  const [bulkTeacherId, setBulkTeacherId] = useState<string>('');

  // ----------------------------------------------------
  // TAB 2: PROGRAM STATE & FILTERS
  // ----------------------------------------------------
  const [programSearchQuery, setProgramSearchQuery] = useState('');
  const [programStatusFilter, setProgramStatusFilter] = useState<'ACTIVE' | 'ARCHIVED' | 'ALL'>('ACTIVE');
  const [programDeptFilter, setProgramDeptFilter] = useState<string>('ALL');
  const [programDegreeFilter, setProgramDegreeFilter] = useState<string>('ALL');
  const [programDurationFilter, setProgramDurationFilter] = useState<string>('ALL');

  // Program Modals & Forms
  const [showAddProgramModal, setShowAddProgramModal] = useState(false);
  const [showEditProgramModal, setShowEditProgramModal] = useState(false);
  const [showProgramDetailModal, setShowProgramDetailModal] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<any>(null);
  const [programDetailTab, setProgramDetailTab] = useState<'info' | 'syllabus' | 'sections' | 'semesters' | 'backlogs' | 'timeline'>('info');

  // Semesters (Phase D: college readiness)
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [semestersLoading, setSemestersLoading] = useState(false);
  const [selectedSemesterYearId, setSelectedSemesterYearId] = useState('');

  // Backlogs / supplementary exam report (Phase D: college readiness)
  const [backlogs, setBacklogs] = useState<StudentBacklogs[]>([]);
  const [backlogsLoading, setBacklogsLoading] = useState(false);

  // Subject prerequisites (Phase D: college readiness)
  const [prerequisiteLinks, setPrerequisiteLinks] = useState<PrerequisiteLink[]>([]);
  const [showAddSemesterModal, setShowAddSemesterModal] = useState(false);
  const [addSemesterForm, setAddSemesterForm] = useState<AddSemesterForm>({
    semester_number: 1,
    name: '',
    start_date: '',
    end_date: ''
  });

  const [addProgramForm, setAddProgramForm] = useState({
    name: '',
    course_code: '',
    duration_years: 4,
    duration_unit: 'Years',
    degree_type: 'UG',
    department_id: '',
    semester_enabled: 1,
    credit_system_enabled: 1,
    electives_enabled: 0,
    description: ''
  });
  const [editProgramForm, setEditProgramForm] = useState({
    id: '',
    name: '',
    course_code: '',
    duration_years: 4,
    duration_unit: 'Years',
    degree_type: 'UG',
    department_id: '',
    semester_enabled: 1,
    credit_system_enabled: 1,
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
        classesService.getSections(queryStr),
        classesService.getAllSections(),
        classesService.getPrograms(),
        classesService.getAcademicYears(),
        classesService.getTeachers(),
        classesService.getDepartments(),
        classesService.getSubjects()
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
        const inst = await classesService.getInstitution(user.institution_id);
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
        const firstYear = yearsData[0];
        if (firstYear && !updated.academic_year_id) {
          updated.academic_year_id = firstYear.id;
        }
        if (programsData.length > 0 && !updated.course_id) {
          const activePrograms = programsData.filter((p: any) => p.is_active === 1);
          const defaultProgram = activePrograms[0] || programsData[0];
          if (defaultProgram) {
            updated.course_id = defaultProgram.id;
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
        classesService.getSectionStudents(section.id),
        classesService.getSectionTimetable(section.id),
        classesService.getSectionAuditLogs(section.id)
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
        await classesService.updateSection(editingSection.id, payload);
      } else {
        await classesService.createSection(payload);
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
    if (!await confirm(`Are you sure you want to ${action} this section?`)) return;
    try {
      await classesService.updateSection(section.id, { is_active: section.is_active ? 0 : 1 });
      fetchData();
    } catch (err: any) {
      alert(err.error || err.message || `Error attempting to ${action} section`);
    }
  };

  const handleDeleteSection = async (id: string) => {
    if (!await confirm({ message: 'Are you sure you want to permanently delete this section? This action is irreversible.', danger: true, confirmLabel: 'Delete' })) return;
    try {
      await classesService.deleteSection(id);
      fetchData();
    } catch (err: any) {
      alert(err.error || err.message || 'Error deleting section');
    }
  };

  // Bulk Section Selection & Action Handlers
  const handleSelectAllSections = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedSectionIds(filteredClasses.map(c => c.id));
    } else {
      setSelectedSectionIds([]);
    }
  };

  const handleSelectOneSection = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedSectionIds(prev => [...prev, id]);
    } else {
      setSelectedSectionIds(prev => prev.filter(item => item !== id));
    }
  };

  const handleBulkSectionAction = async (
    action: 'assign_class_teacher' | 'deactivate' | 'reactivate' | 'delete',
    payload?: any
  ) => {
    if (selectedSectionIds.length === 0) return;

    if (!canManageAcademic) {
      alert('You do not have permission to perform bulk actions on classes/sections.');
      return;
    }

    if (action === 'deactivate' && !await confirm(`Are you sure you want to deactivate ${selectedSectionIds.length} classes/sections?`)) return;
    if (action === 'reactivate' && !await confirm(`Are you sure you want to reactivate ${selectedSectionIds.length} classes/sections?`)) return;
    if (action === 'delete') {
      const confirmed = await confirm({
        message: `You are about to PERMANENTLY delete ${selectedSectionIds.length} classes/sections.`,
        danger: true,
        confirmLabel: 'Delete',
        requireText: 'DELETE',
      });
      if (!confirmed) {
        alert('Bulk delete cancelled.');
        return;
      }
    }

    try {
      setLoading(true);
      const res = await classesService.bulkSectionAction(selectedSectionIds, action, payload);
      alert(res.message || 'Bulk action completed successfully.');
      setSelectedSectionIds([]);
      setShowBulkTeacherModal(false);
      fetchData();
    } catch (err: any) {
      console.error(err);
      alert(`Bulk action failed: ${err.message || 'Error occurred'}`);
      setLoading(false);
    }
  };

  const handleBulkSectionExport = (format: 'csv' | 'xlsx') => {
    const exportData = filteredClasses
      .filter(cls => selectedSectionIds.length === 0 || selectedSectionIds.includes(cls.id))
      .map(cls => ({
        'Section Name': cls.name,
        'Academic Year': cls.academic_year_name || 'N/A',
        [getProgramLabel()]: cls.course_name || 'N/A',
        'Year Level': cls.year_number,
        'Room': cls.room || 'N/A',
        'Capacity': cls.capacity || 40,
        'Enrolled Students': cls.student_count || 0,
        'Class Teacher': cls.class_teacher_name || 'Unassigned',
        'Status': cls.is_active !== 0 ? 'Active' : 'Archived'
      }));

    if (exportData.length === 0) {
      alert('No sections to export');
      return;
    }

    const firstRow = exportData[0];
    if (!firstRow) return;

    if (format === 'csv') {
      const headers = Object.keys(firstRow).join(',');
      const rows = exportData.map(row => Object.values(row).map(v => `"${v}"`).join(','));
      const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `classes_sections_export_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
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
    if (addProgramForm.duration_years <= 0) {
      alert('Duration must be a positive number greater than 0.');
      return;
    }

    // Client-side duplicate check
    const dupCode = programs.find(p => p.course_code.toUpperCase() === codeVal && p.is_active === 1);
    if (dupCode) {
      alert(`A ${getProgramLabel().toLowerCase()} with identifier code '${codeVal}' already exists.`);
      return;
    }
    const dupName = programs.find(p => p.name.trim().toUpperCase() === nameVal.toUpperCase() && p.is_active === 1);
    if (dupName) {
      alert(`A ${getProgramLabel().toLowerCase()} with name '${nameVal}' already exists.`);
      return;
    }

    try {
      const payload = {
        ...addProgramForm,
        course_code: codeVal,
        name: nameVal,
        duration_years: institutionType === 'school' ? 1 : addProgramForm.duration_years,
        duration_unit: addProgramForm.duration_unit || 'Years',
        degree_type: addProgramForm.degree_type || (institutionType === 'school' ? 'School' : 'UG'),
        department_id: addProgramForm.department_id || null
      };
      await classesService.createProgram(payload);
      setShowAddProgramModal(false);
      setAddProgramForm({
        name: '',
        course_code: '',
        duration_years: institutionType === 'school' ? 1 : 4,
        duration_unit: 'Years',
        degree_type: institutionType === 'school' ? 'School' : 'UG',
        department_id: '',
        semester_enabled: 1,
        credit_system_enabled: 1,
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
    if (editProgramForm.duration_years <= 0) {
      alert('Duration must be a positive number greater than 0.');
      return;
    }

    // Client-side duplicate check excluding current editing record
    const dupCode = programs.find(p => p.id !== editProgramForm.id && p.course_code.toUpperCase() === codeVal && p.is_active === 1);
    if (dupCode) {
      alert(`A ${getProgramLabel().toLowerCase()} with identifier code '${codeVal}' already exists.`);
      return;
    }
    const dupName = programs.find(p => p.id !== editProgramForm.id && p.name.trim().toUpperCase() === nameVal.toUpperCase() && p.is_active === 1);
    if (dupName) {
      alert(`A ${getProgramLabel().toLowerCase()} with name '${nameVal}' already exists.`);
      return;
    }

    try {
      await classesService.updateProgram(editProgramForm.id, {
        name: nameVal,
        course_code: codeVal,
        duration_years: institutionType === 'school' ? 1 : editProgramForm.duration_years,
        duration_unit: editProgramForm.duration_unit || 'Years',
        degree_type: editProgramForm.degree_type || (institutionType === 'school' ? 'School' : 'UG'),
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

  const handleArchiveProgram = async (prog: any) => {
    if (!await confirm(`Are you sure you want to archive '${prog.name}' (${prog.course_code})?\n\nIt will restrict future enrollments and make this program read-only.`)) return;
    try {
      await classesService.archiveProgram(prog.id);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Error archiving program');
    }
  };

  const handleDeleteProgram = async (prog: any) => {
    if (!await confirm({
      message: `Warning: This program may be linked to classes, students, and subjects.\n\nAre you sure you want to permanently delete '${prog.name}' (${prog.course_code})?`,
      danger: true,
      confirmLabel: 'Delete',
    })) {
      return;
    }
    try {
      await classesService.deleteProgram(prog.id);
      fetchData();
      alert(`${getProgramLabel()} deleted successfully.`);
    } catch (err: any) {
      alert(err.message || 'Error deleting program. Ensure no active dependencies remain.');
    }
  };

  const handleRestoreProgram = async (id: string) => {
    try {
      await classesService.restoreProgram(id);
      fetchData();
      alert(`${getProgramLabel()} restored successfully.`);
    } catch (err: any) {
      alert(err.message || 'Error restoring program');
    }
  };

  const openEditProgramModal = (prog: any) => {
    if (prog.is_active === 0) {
      alert('Archived programs are read-only. Please restore the program first to enable editing.');
      return;
    }
    setEditProgramForm({
      id: prog.id,
      name: prog.name,
      course_code: prog.course_code,
      duration_years: prog.duration_years || 1,
      duration_unit: prog.duration_unit || 'Years',
      degree_type: prog.degree_type || 'UG',
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
    const currentYear = years.find((y: any) => y.is_current) || years[0];
    setSelectedSemesterYearId(currentYear?.id || '');
  };

  const fetchSemesters = async (courseId: string, academicYearId: string) => {
    if (!courseId || !academicYearId) {
      setSemesters([]);
      return;
    }
    setSemestersLoading(true);
    try {
      const data = await classesService.getSemesters(courseId, academicYearId);
      setSemesters(data);
    } catch (err) {
      console.error('Error fetching semesters:', err);
    } finally {
      setSemestersLoading(false);
    }
  };

  useEffect(() => {
    if (selectedProgram?.semester_enabled === 1 && selectedSemesterYearId) {
      fetchSemesters(selectedProgram.id, selectedSemesterYearId);
    } else {
      setSemesters([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProgram, selectedSemesterYearId]);

  const fetchBacklogs = async (courseId: string) => {
    setBacklogsLoading(true);
    try {
      const data = await classesService.getCourseBacklogs(courseId);
      setBacklogs(data || []);
    } catch (err) {
      console.error('Error fetching backlogs:', err);
    } finally {
      setBacklogsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedProgram?.credit_system_enabled === 1) {
      fetchBacklogs(selectedProgram.id);
    } else {
      setBacklogs([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProgram]);

  const fetchPrerequisites = async (courseId: string) => {
    try {
      const data = await classesService.getPrerequisites(courseId);
      setPrerequisiteLinks(data || []);
    } catch (err) {
      console.error('Error fetching prerequisites:', err);
    }
  };

  useEffect(() => {
    if (selectedProgram) {
      fetchPrerequisites(selectedProgram.id);
    } else {
      setPrerequisiteLinks([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProgram]);

  const handleAddPrerequisite = async (subjectId: string, prerequisiteSubjectId: string) => {
    if (!selectedProgram) return;
    try {
      await classesService.createPrerequisite({ subject_id: subjectId, prerequisite_subject_id: prerequisiteSubjectId });
      await fetchPrerequisites(selectedProgram.id);
    } catch (err: any) {
      alert(err.message || 'Error creating prerequisite link');
    }
  };

  const handleDeletePrerequisite = async (id: string) => {
    if (!selectedProgram) return;
    if (!await confirm('Remove this prerequisite link?')) return;
    try {
      await classesService.deletePrerequisite(id);
      await fetchPrerequisites(selectedProgram.id);
    } catch (err: any) {
      alert(err.message || 'Error removing prerequisite link');
    }
  };

  const openAddSemesterModal = () => {
    setAddSemesterForm({
      semester_number: semesters.length + 1,
      name: '',
      start_date: '',
      end_date: ''
    });
    setShowAddSemesterModal(true);
  };

  const handleAddSemesterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProgram || !selectedSemesterYearId) return;
    try {
      await classesService.createSemester({
        course_id: selectedProgram.id,
        academic_year_id: selectedSemesterYearId,
        semester_number: addSemesterForm.semester_number,
        ...(addSemesterForm.name.trim() ? { name: addSemesterForm.name.trim() } : {}),
        start_date: addSemesterForm.start_date || null,
        end_date: addSemesterForm.end_date || null
      });
      setShowAddSemesterModal(false);
      await fetchSemesters(selectedProgram.id, selectedSemesterYearId);
    } catch (err: any) {
      alert(err.message || 'Error creating semester');
    }
  };

  const handleSemesterStatusChange = async (semester: Semester, status: Semester['status']) => {
    try {
      await classesService.updateSemesterStatus(semester.id, status);
      await fetchSemesters(semester.course_id, semester.academic_year_id);
    } catch (err: any) {
      alert(err.message || 'Error updating semester status');
    }
  };

  const handleDeleteSemester = async (semester: Semester) => {
    const ok = await confirm({
      title: 'Delete Semester',
      message: `Delete Semester ${semester.semester_number} (${semester.name})? This cannot be undone.`,
      confirmLabel: 'Delete',
      danger: true
    });
    if (!ok) return;
    try {
      await classesService.deleteSemester(semester.id);
      await fetchSemesters(semester.course_id, semester.academic_year_id);
    } catch (err: any) {
      alert(err.message || 'Error deleting semester');
    }
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

  // Programs filters (client-side text, status, dept, degree, duration & sort order)
  const displayedPrograms = programs.filter(prog => {
    const matchesSearch = prog.name.toLowerCase().includes(programSearchQuery.toLowerCase()) ||
                          prog.course_code.toLowerCase().includes(programSearchQuery.toLowerCase());

    const matchesStatus = programStatusFilter === 'ACTIVE' ? prog.is_active === 1 :
                          programStatusFilter === 'ARCHIVED' ? prog.is_active === 0 : true;

    const matchesDept = programDeptFilter === 'ALL' ? true : prog.department_id === programDeptFilter;

    const matchesDegree = programDegreeFilter === 'ALL' ? true : (prog.degree_type || 'UG') === programDegreeFilter;

    const matchesDuration = programDurationFilter === 'ALL' ? true : String(prog.duration_years) === programDurationFilter;

    return matchesSearch && matchesStatus && matchesDept && matchesDegree && matchesDuration;
  }).sort((a, b) => {
    // Sort Order: 1. Active first (is_active DESC), 2. Name A-Z (name ASC)
    if (a.is_active !== b.is_active) {
      return b.is_active - a.is_active;
    }
    return a.name.localeCompare(b.name);
  });

  // ----------------------------------------------------
  // STATISTICS COMPUTATIONS
  // ----------------------------------------------------

  // Sections KPIs
  const activeSections = classes.filter(c => c.is_active === 1);
  const totalSectionsCount = activeSections.length;
  const assignedTeachersCount = activeSections.filter(c => c.class_teacher_id).length;
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
        {canManageAcademic && (
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
        )}
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
          <SectionsKpiCards
            totalSectionsCount={totalSectionsCount}
            assignedTeachersCount={assignedTeachersCount}
            avgCapacity={avgCapacity}
            enrolledStudentsCount={enrolledStudentsCount}
          />

          <SectionsFiltersBar
            searchQuery={sectionSearchQuery}
            setSearchQuery={setSectionSearchQuery}
            filterYear={sectionFilterYear}
            setFilterYear={setSectionFilterYear}
            filterProgram={sectionFilterProgram}
            setFilterProgram={setSectionFilterProgram}
            filterStatus={sectionFilterStatus}
            setFilterStatus={setSectionFilterStatus}
            years={years}
            programs={programs}
            getProgramLabel={getProgramLabel}
            onRefresh={fetchData}
          />

          <SectionsTable
            loading={loading}
            filteredClasses={filteredClasses}
            institutionType={institutionType}
            getProgramLabel={getProgramLabel}
            selectedSectionIds={selectedSectionIds}
            onSelectAll={handleSelectAllSections}
            onSelectOne={handleSelectOneSection}
            canManageAcademic={canManageAcademic}
            onOpenDetails={handleOpenSectionDetails}
            onNavigateToWorkspace={(id) => navigate(`/classes/${id}`)}
            onOpenEdit={handleOpenEditSection}
            onToggleStatus={handleToggleSectionStatus}
            onDelete={handleDeleteSection}
          />
        </>
      )}

      {/* 5. Tab 2: Courses / Programs Content */}
      {activeMainTab === 'programs' && (
        <>
          <ProgramsKpiCards
            totalProgramsCount={totalProgramsCount}
            semesterEnabledCount={semesterEnabledCount}
            creditSystemCount={creditSystemCount}
          />

          <ProgramsFiltersBar
            searchQuery={programSearchQuery}
            setSearchQuery={setProgramSearchQuery}
            statusFilter={programStatusFilter}
            setStatusFilter={setProgramStatusFilter}
            deptFilter={programDeptFilter}
            setDeptFilter={setProgramDeptFilter}
            degreeFilter={programDegreeFilter}
            setDegreeFilter={setProgramDegreeFilter}
            durationFilter={programDurationFilter}
            setDurationFilter={setProgramDurationFilter}
            departments={departments}
            institutionType={institutionType}
            getProgramLabel={getProgramLabel}
            onRefresh={fetchData}
          />

          <ProgramsTable
            loading={loading}
            displayedPrograms={displayedPrograms}
            institutionType={institutionType}
            getProgramLabel={getProgramLabel}
            getProgramsLabel={getProgramsLabel}
            getDeptCode={getDeptCode}
            canManageAcademic={canManageAcademic}
            onView={openProgramDetailModal}
            onEdit={openEditProgramModal}
            onArchive={handleArchiveProgram}
            onRestore={handleRestoreProgram}
            onDelete={handleDeleteProgram}
            onAddClick={() => setShowAddProgramModal(true)}
          />
        </>
      )}

      {/* ----------------------------------------------------
          MODALS SECTION
         ---------------------------------------------------- */}

      <SectionFormModal
        show={showSectionFormModal && canManageAcademic}
        editingSection={editingSection}
        form={sectionForm}
        setForm={setSectionForm}
        institutionType={institutionType}
        getProgramLabel={getProgramLabel}
        programs={programs}
        years={years}
        teachers={teachers}
        onClose={() => setShowSectionFormModal(false)}
        onSubmit={handleSectionSubmit}
      />

      <SectionDetailModal
        show={showSectionDetailModal}
        selectedSection={selectedSection}
        detailTab={sectionDetailTab}
        setDetailTab={setSectionDetailTab}
        loading={sectionDetailLoading}
        students={sectionStudents}
        timetable={sectionTimetable}
        logs={sectionLogs}
        onClose={() => setShowSectionDetailModal(false)}
      />

      <AddProgramModal
        show={showAddProgramModal && canManageAcademic}
        form={addProgramForm}
        setForm={setAddProgramForm}
        institutionType={institutionType}
        getProgramLabel={getProgramLabel}
        departments={departments}
        onClose={() => setShowAddProgramModal(false)}
        onSubmit={handleAddProgramSubmit}
      />

      <EditProgramModal
        show={showEditProgramModal && canManageAcademic}
        form={editProgramForm}
        setForm={setEditProgramForm}
        institutionType={institutionType}
        getProgramLabel={getProgramLabel}
        departments={departments}
        onClose={() => setShowEditProgramModal(false)}
        onSubmit={handleEditProgramSubmit}
      />

      <ProgramDetailModal
        show={showProgramDetailModal}
        selectedProgram={selectedProgram}
        detailTab={programDetailTab}
        setDetailTab={setProgramDetailTab}
        detailSubjects={detailSubjects}
        detailSections={detailSections}
        groupedSubjects={groupedSubjects}
        getDeptCode={getDeptCode}
        getTeacherName={getTeacherName}
        onClose={() => setShowProgramDetailModal(false)}
        academicYears={years}
        selectedSemesterYearId={selectedSemesterYearId}
        setSelectedSemesterYearId={setSelectedSemesterYearId}
        semesters={semesters}
        semestersLoading={semestersLoading}
        canManageAcademic={canManageAcademic}
        onAddSemester={openAddSemesterModal}
        onSemesterStatusChange={handleSemesterStatusChange}
        onDeleteSemester={handleDeleteSemester}
        backlogs={backlogs}
        backlogsLoading={backlogsLoading}
        prerequisiteLinks={prerequisiteLinks}
        onAddPrerequisite={handleAddPrerequisite}
        onDeletePrerequisite={handleDeletePrerequisite}
      />

      <AddSemesterModal
        show={showAddSemesterModal && canManageAcademic}
        form={addSemesterForm}
        setForm={setAddSemesterForm}
        academicYearName={years.find((y: any) => y.id === selectedSemesterYearId)?.name || ''}
        onClose={() => setShowAddSemesterModal(false)}
        onSubmit={handleAddSemesterSubmit}
      />

      <BulkActionsBar
        show={activeMainTab === 'sections' && selectedSectionIds.length > 0}
        selectedCount={selectedSectionIds.length}
        canManageAcademic={canManageAcademic}
        onAssignTeacherClick={() => setShowBulkTeacherModal(true)}
        onDeactivate={() => handleBulkSectionAction('deactivate')}
        onReactivate={() => handleBulkSectionAction('reactivate')}
        onDelete={() => handleBulkSectionAction('delete')}
        onExportCsv={() => handleBulkSectionExport('csv')}
      />

      <BulkTeacherModal
        show={showBulkTeacherModal}
        selectedCount={selectedSectionIds.length}
        teachers={teachers}
        bulkTeacherId={bulkTeacherId}
        setBulkTeacherId={setBulkTeacherId}
        onClose={() => setShowBulkTeacherModal(false)}
        onApply={() => handleBulkSectionAction('assign_class_teacher', { class_teacher_id: bulkTeacherId })}
      />
    </Layout>
  );
}
