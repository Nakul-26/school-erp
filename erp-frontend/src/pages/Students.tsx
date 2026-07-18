import './Students.css';
import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { 
  Plus, ChevronLeft, ChevronRight, 
  Grid, List, Trash2, Archive, Check, ShieldAlert 
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { hasAnyPermission } from '../utils/accessControl';

// Modular Imports
import { studentService } from './students/studentService';
import { studentValidation } from './students/studentValidation';
import { exportHelpers } from './students/utils/exportHelpers';
import { StudentsFilters } from './students/components/StudentsFilters';
import { StudentCard } from './students/components/StudentCard';
import { StudentsTable } from './students/components/StudentsTable';
import { AddStudentWizard } from './students/components/AddStudentWizard';
import { EditStudentModal } from './students/components/EditStudentModal';
import { BulkSectionModal } from './students/components/BulkSectionModal';
import { ImportExcelModal } from './students/components/ImportExcelModal';

export default function Students() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();

  const search = searchParams.get('search') || '';
  const selectedProgram = searchParams.get('program_id') || '';
  const selectedSection = searchParams.get('section_id') || '';
  const selectedAcademicYear = searchParams.get('academic_year_id') || '';
  const selectedStatus = searchParams.get('status') || '';

  const updateSearchParam = (key: string, value: string) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (value) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
      if (key !== 'page') {
        next.set('page', '1');
      }
      return next;
    }, { replace: true });
  };

  const setSearch = (value: string) => updateSearchParam('search', value);
  const setSelectedProgram = (value: string) => updateSearchParam('program_id', value);
  const setSelectedSection = (value: string) => updateSearchParam('section_id', value);
  const setSelectedAcademicYear = (value: string) => updateSearchParam('academic_year_id', value);
  const setSelectedStatus = (value: string) => updateSearchParam('status', value);

  // Dropdowns Metadata
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);

  // Pagination States
  const page = parseInt(searchParams.get('page') || '1', 10);
  const setPage = (value: number) => {
    updateSearchParam('page', value.toString());
  };
  const [totalStudents, setTotalStudents] = useState(0);
  const limit = 12;

  // Layout View State
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Selection state for Bulk Actions
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [showBulkSectionModal, setShowBulkSectionModal] = useState(false);
  const [bulkSectionId, setBulkSectionId] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Bulk Import Excel state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number; successCount: number; errors: string[] } | null>(null);
  const [importing, setImporting] = useState(false);

  // Toast notifications
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    if (type === 'success') toast.success(message);
    else toast.error(message);
  };

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Institution & Terminology States
  const { user } = useAuth();
  const userPermissions = user?.permissions || [];
  const canViewStudent = hasAnyPermission(userPermissions, ['student.view']);
  const canCreateStudent = hasAnyPermission(userPermissions, ['student.create']);
  const canEditStudent = hasAnyPermission(userPermissions, ['student.edit']);
  const canDeleteStudent = hasAnyPermission(userPermissions, ['student.delete']);
  const [institutionType, setInstitutionType] = useState<string>('college');
  const [editTab, setEditTab] = useState<'personal' | 'academic' | 'guardian' | 'health'>('personal');

  const canUseBulkActions = canEditStudent || canDeleteStudent;
  
  const getProgramLabel = () => institutionType === 'school' ? 'Class' : 'Program';
  const getProgramsLabel = () => institutionType === 'school' ? 'Classes' : 'Programs';

  // Stepper state for Add Form
  const [step, setStep] = useState(1);
  const [addForm, setAddForm] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    admission_number: '',
    roll_number: '',
    email: '',
    phone: '',
    gender: 'Male',
    date_of_birth: '',
    address: '',
    photo: '',
    academic_year_id: '',
    course_id: '',
    section_id: '',
    guardians: [{ name: '', relationship: 'Father', phone: '', email: '' }],
    blood_group: '',
    emergency_contact: '',
    medical_notes: ''
  });

  // Edit form state
  const [editForm, setEditForm] = useState<any>(null);
  const [canSubmit, setCanSubmit] = useState(false);

  useEffect(() => {
    if (step === 5) {
      setCanSubmit(false);
      const timer = setTimeout(() => {
        setCanSubmit(true);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setCanSubmit(false);
    }
  }, [step]);

  // Auto-select section if only one is available for the selected program
  useEffect(() => {
    if (addForm.course_id) {
      const filtered = sections.filter(s => s.course_id === addForm.course_id);
      if (filtered.length === 1) {
        setAddForm(prev => ({ ...prev, section_id: filtered[0].id }));
      }
    }
  }, [addForm.course_id, sections]);

  // Load Dropdown Metadata
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [years, progs, secs] = await Promise.all([
          studentService.getAcademicYears(),
          studentService.getPrograms(),
          studentService.getSections()
        ]);
        setAcademicYears(years || []);
        setPrograms(progs || []);
        setSections(secs || []);

        // Auto-select current academic year
        const currentYear = (years || []).find((y: any) => y.is_current === 1 || y.is_current === true);
        if (currentYear) {
          setAddForm(prev => ({ ...prev, academic_year_id: currentYear.id }));
        }

        // Auto-select program if only one exists
        if (progs && progs.length === 1) {
          setAddForm(prev => ({ ...prev, course_id: progs[0].id }));
        }

        if (user?.institution_id) {
          const inst = await studentService.getInstitution(user.institution_id);
          if (inst && inst.institution_type) {
            setInstitutionType(inst.institution_type);
          }
        }
      } catch (err) {
        console.error("Failed to load filter metadata or institution setup", err);
      }
    };
    fetchMetadata();
  }, [user?.institution_id]);

  // Fetch Students
  const fetchStudents = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        limit: limit.toString(),
        offset: ((page - 1) * limit).toString()
      });
      if (search) queryParams.append('search', search);
      if (selectedProgram) queryParams.append('program_id', selectedProgram);
      if (selectedSection) queryParams.append('section_id', selectedSection);
      if (selectedAcademicYear) queryParams.append('academic_year_id', selectedAcademicYear);
      if (selectedStatus) queryParams.append('status', selectedStatus);

      const data = await studentService.getStudents(queryParams.toString());
      setStudents(data.students || []);
      setTotalStudents(data.total || 0);
      setSelectedStudentIds([]);
    } catch (err) {
      console.error("Error fetching students", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [page, selectedProgram, selectedSection, selectedAcademicYear, selectedStatus]);

  // Trigger search reset page to 1
  useEffect(() => {
    setPage(1);
    const delayDebounceFn = setTimeout(() => {
      fetchStudents();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [search]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.student-menu-container')) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Bulk selection helpers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedStudentIds(students.map(s => s.id));
    } else {
      setSelectedStudentIds([]);
    }
  };

  const handleSelectOne = (studentId: string, checked: boolean) => {
    if (checked) {
      setSelectedStudentIds([...selectedStudentIds, studentId]);
    } else {
      setSelectedStudentIds(selectedStudentIds.filter(id => id !== studentId));
    }
  };

  const handleBulkAction = async (action: 'assign_section' | 'promote_semester' | 'deactivate' | 'reactivate' | 'delete', payload?: any) => {
    if (selectedStudentIds.length === 0) return;
    if (action === 'deactivate' && !confirm(`Are you sure you want to deactivate ${selectedStudentIds.length} students?`)) return;
    if (action === 'reactivate' && !confirm(`Are you sure you want to reactivate ${selectedStudentIds.length} students?`)) return;
    if (action === 'promote_semester' && !confirm(`Are you sure you want to promote ${selectedStudentIds.length} students?`)) return;
    if (action === 'delete') {
      const confirmInput = prompt(`You are about to PERMANENTLY delete ${selectedStudentIds.length} students. This action is irreversible and will delete all their enrollments, grades, attendance, and fee history.\n\nType DELETE to confirm:`);
      if (confirmInput !== 'DELETE') {
        showToast('Bulk delete cancelled. Confirmation word did not match.', 'error');
        return;
      }
    }

    try {
      setLoading(true);
      await studentService.bulkAction(selectedStudentIds, action, payload);
      setSelectedStudentIds([]);
      setShowBulkSectionModal(false);
      fetchStudents();
    } catch (err: any) {
      console.error(err);
      showToast(`Bulk action failed: ${err.message}`, 'error');
      setLoading(false);
    }
  };

  const handleDeleteStudent = async (id: string, name: string) => {
    if (!canDeleteStudent) {
      showToast('You do not have permission to delete students.', 'error');
      return;
    }
    if (!confirm(`Are you sure you want to permanently delete student "${name}"? This action is irreversible and will delete all their records.`)) {
      return;
    }
    try {
      setLoading(true);
      await studentService.deleteStudent(id);
      showToast(`Student "${name}" deleted successfully.`);
      fetchStudents();
    } catch (err: any) {
      console.error(err);
      showToast(`Delete failed: ${err.message}`, 'error');
      setLoading(false);
    }
  };

  const handleArchiveStudent = async (id: string, name: string) => {
    if (!canEditStudent) {
      showToast('You do not have permission to archive students.', 'error');
      return;
    }
    if (!confirm(`Are you sure you want to archive student "${name}"? This will set their status to DROPPED.`)) {
      return;
    }
    try {
      setLoading(true);
      await studentService.updateStudent(id, { status: 'DROPPED' });
      showToast(`Student "${name}" archived successfully.`);
      fetchStudents();
    } catch (err: any) {
      console.error(err);
      showToast(`Archive failed: ${err.message}`, 'error');
      setLoading(false);
    }
  };

  const handleReactivateStudent = async (id: string, name: string) => {
    if (!canEditStudent) {
      showToast('You do not have permission to reactivate students.', 'error');
      return;
    }
    try {
      setLoading(true);
      await studentService.updateStudent(id, { status: 'ACTIVE' });
      showToast(`Student "${name}" reactivated successfully.`);
      fetchStudents();
    } catch (err: any) {
      console.error(err);
      showToast(`Reactivation failed: ${err.message}`, 'error');
      setLoading(false);
    }
  };

  const handleBulkExport = (format: 'csv' | 'xlsx') => {
    if (selectedStudentIds.length === 0) return;
    const selectedStudents = students.filter(s => selectedStudentIds.includes(s.id));
    if (format === 'xlsx') {
      exportHelpers.exportStudentsExcel(selectedStudents);
    } else {
      exportHelpers.exportStudentsCSV(selectedStudents, getProgramLabel);
    }
  };

  // Stepper handlers
  const handleNextStep = () => {
    const error = studentValidation.validateStep(step, addForm);
    if (error) {
      showToast(error, 'error');
      return;
    }
    setStep(prev => prev + 1);
  };

  const handlePrevStep = () => {
    setStep(prev => prev - 1);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreateStudent) {
      showToast('You do not have permission to create students.', 'error');
      return;
    }
    if (step < 5) {
      handleNextStep();
      return;
    }
    if (!canSubmit) return;

    try {
      await studentService.createStudent(addForm);
      showToast(`${addForm.first_name} ${addForm.last_name || ''} added successfully!`);
      setShowAddModal(false);
      resetAddForm();
      fetchStudents();
    } catch (err: any) {
      console.error(err);
      showToast(err instanceof Error ? err.message : 'Error creating student record.', 'error');
    }
  };

  const resetAddForm = () => {
    setStep(1);
    setAddForm({
      first_name: '',
      middle_name: '',
      last_name: '',
      admission_number: '',
      roll_number: '',
      email: '',
      phone: '',
      gender: 'Male',
      date_of_birth: '',
      address: '',
      photo: '',
      academic_year_id: academicYears.find(y => y.is_current)?.id || '',
      course_id: programs.length === 1 ? programs[0].id : '',
      section_id: '',
      guardians: [{ name: '', relationship: 'Father', phone: '', email: '' }],
      blood_group: '',
      emergency_contact: '',
      medical_notes: ''
    });
  };

  // Edit functions
  const handleOpenEditModal = async (student: any) => {
    if (!canEditStudent) {
      showToast('You do not have permission to edit students.', 'error');
      return;
    }
    try {
      const freshStudent = await studentService.getStudentById(student.id);
      setEditForm({
        id: freshStudent.id,
        first_name: freshStudent.first_name || '',
        middle_name: freshStudent.middle_name || '',
        last_name: freshStudent.last_name || '',
        admission_number: freshStudent.admission_number || '',
        roll_number: freshStudent.roll_number || '',
        email: freshStudent.email || '',
        phone: freshStudent.phone || '',
        gender: freshStudent.gender || 'Male',
        date_of_birth: freshStudent.date_of_birth || '',
        address: freshStudent.address || '',
        photo: freshStudent.photo || '',
        status: freshStudent.status || 'ACTIVE',
        academic_year_id: freshStudent.academic_year_id || '',
        course_id: freshStudent.course_id || '',
        section_id: freshStudent.section_id || '',
        semester: freshStudent.semester || 1,
        guardians: freshStudent.guardians && freshStudent.guardians.length > 0
          ? freshStudent.guardians.map((g: any) => ({
              id: g.id,
              name: g.name || '',
              relationship: g.relationship || 'Father',
              phone: g.phone || '',
              email: g.email || '',
              occupation: g.occupation || ''
            }))
          : [{ name: '', relationship: 'Father', phone: '', email: '', occupation: '' }],
        blood_group: freshStudent.blood_group || '',
        emergency_contact: freshStudent.emergency_contact || '',
        medical_notes: freshStudent.medical_notes || ''
      });
      setEditTab('personal');
      setShowEditModal(true);
    } catch (err: any) {
      console.error(err);
      showToast('Failed to fetch complete student profile details.', 'error');
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const error = studentValidation.validateEdit(editForm);
    if (error) {
      alert(error);
      return;
    }

    try {
      await studentService.updateStudent(editForm.id, {
        ...editForm,
        first_name: editForm.first_name.trim(),
        middle_name: editForm.middle_name ? editForm.middle_name.trim() : null,
        last_name: editForm.last_name.trim(),
        admission_number: editForm.admission_number.trim(),
        email: editForm.email ? editForm.email.trim() : null,
        phone: editForm.phone ? editForm.phone.trim() : null
      });
      setShowEditModal(false);
      fetchStudents();
      showToast('Student profile updated successfully!');
    } catch (err: any) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Error updating student.');
    }
  };

  const totalPages = Math.ceil(totalStudents / limit) || 1;
  const selectedStudents = students.filter(s => selectedStudentIds.includes(s.id));
  const showDeactivateBtn = selectedStudents.some(s => s.status !== 'DROPPED');
  const showReactivateBtn = selectedStudents.some(s => s.status === 'DROPPED');

  return (
    <Layout>
      {showAddModal ? (
        !canCreateStudent ? (
          <div className="card" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
            <div style={{ maxWidth: '560px', textAlign: 'center' }}>
              <ShieldAlert size={56} style={{ color: 'var(--danger)', marginBottom: '1rem' }} />
              <h2 style={{ marginBottom: '0.5rem' }}>Access Denied</h2>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                You do not have permission to create students. The admission form is hidden until the student.create permission is granted.
              </p>
              <button className="btn btn-primary" onClick={() => setShowAddModal(false)} style={{ marginTop: '1rem' }}>
                Go Back
              </button>
            </div>
          </div>
        ) : (
        <AddStudentWizard
          step={step}
          setStep={setStep}
          addForm={addForm}
          setAddForm={setAddForm}
          academicYears={academicYears}
          programs={programs}
          sections={sections}
          institutionType={institutionType}
          getProgramLabel={getProgramLabel}
          handleAddSubmit={handleAddSubmit}
          handlePrevStep={handlePrevStep}
          handleNextStep={handleNextStep}
          canSubmit={canSubmit}
          setShowAddModal={setShowAddModal}
          resetAddForm={resetAddForm}
        />
        )
      ) : (
        <>
          <div className="page-header students-page-header">
            <div>
              <h2 className="students-title-1">Students Directory</h2>
              <p className="students-text-2">Manage student enrollments, academic records, and family contacts.</p>
            </div>
            
            <div className="header-actions students-header-actions">
              {/* Layout view controls */}
              <div className="view-toggle students-view-toggle">
                <button 
                  onClick={() => setViewMode('grid')} 
                  className={`btn-view-toggle ${viewMode === 'grid' ? 'is-active' : ''}`}
                  title="Grid View"
                >
                  <Grid size={18} />
                </button>
                <button 
                  onClick={() => setViewMode('table')} 
                  className={`btn-view-toggle ${viewMode === 'table' ? 'is-active' : ''}`}
                  title="Table List View"
                >
                  <List size={18} />
                </button>
              </div>

              {canCreateStudent && (
                <button
                  className="btn btn-outline"
                  onClick={() => setShowImportModal(true)}
                >
                  Import Excel
                </button>
              )}
              {canCreateStudent && (
                <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                  <Plus size={18} /> Admit Student
                </button>
              )}
            </div>
          </div>

          <StudentsFilters
            search={search}
            setSearch={setSearch}
            selectedProgram={selectedProgram}
            setSelectedProgram={setSelectedProgram}
            selectedSection={selectedSection}
            setSelectedSection={setSelectedSection}
            selectedAcademicYear={selectedAcademicYear}
            setSelectedAcademicYear={setSelectedAcademicYear}
            selectedStatus={selectedStatus}
            setSelectedStatus={setSelectedStatus}
            programs={programs}
            sections={sections}
            academicYears={academicYears}
            getProgramsLabel={getProgramsLabel}
          />

          {loading ? (
            <div className="students-div-36">
              <p className="students-text-37">Loading students list...</p>
            </div>
          ) : (
            <>
              {/* Bulk Actions Panel */}
              {selectedStudentIds.length > 0 && (
                <div className="students-row-80 animate-slide-in">
                  <span className="students-span-81">
                    <strong className="students-strong-51">{selectedStudentIds.length}</strong> {selectedStudentIds.length === 1 ? 'student' : 'students'} selected
                  </span>
                  <div className="students-row-83">
                    {canUseBulkActions && (
                      // Bulk actions panel
                      <>
                        <button onClick={() => setShowBulkSectionModal(true)} className="btn btn-sm btn-outline">
                        Assign Section
                      </button>
                      <button onClick={() => handleBulkAction('promote_semester')} className="btn btn-sm btn-outline">
                        Promote Semester
                      </button>
                      {showDeactivateBtn && (
                        <button onClick={() => handleBulkAction('deactivate')} className="btn btn-sm btn-outline text-warning">
                          <Archive size={14} /> Deactivate
                        </button>
                      )}
                      {showReactivateBtn && (
                        <button onClick={() => handleBulkAction('reactivate')} className="btn btn-sm btn-outline text-success">
                          <Check size={14} /> Reactivate
                        </button>
                      )}
                      <button onClick={() => handleBulkAction('delete')} className="btn btn-sm btn-danger">
                        <Trash2 size={14} /> Delete
                      </button>
                      
                      <div className="students-div-82" />  
                      </>
                    )}
                    
                    <button onClick={() => handleBulkExport('xlsx')} className="btn btn-sm btn-outline">
                      Export Excel
                    </button>
                    <button onClick={() => handleBulkExport('csv')} className="btn btn-sm btn-outline">
                      Export CSV
                    </button>
                  </div>
                </div>
              )}

              {viewMode === 'grid' ? (
                <div className="students-grid-38">
                  {students.map(s => (
                    <StudentCard
                      key={s.id}
                      student={s}
                      selectedStudentIds={selectedStudentIds}
                      handleSelectOne={handleSelectOne}
                      activeMenuId={activeMenuId}
                      setActiveMenuId={setActiveMenuId}
                      handleOpenEditModal={handleOpenEditModal}
                      handleReactivateStudent={handleReactivateStudent}
                      handleArchiveStudent={handleArchiveStudent}
                      handleDeleteStudent={handleDeleteStudent}
                      canEditStudent={canEditStudent}
                      canDeleteStudent={canDeleteStudent}
                    />
                  ))}
                </div>
              ) : (
                <StudentsTable
                  students={students}
                  selectedStudentIds={selectedStudentIds}
                  handleSelectAll={handleSelectAll}
                  handleSelectOne={handleSelectOne}
                  handleOpenEditModal={handleOpenEditModal}
                  handleReactivateStudent={handleReactivateStudent}
                  handleArchiveStudent={handleArchiveStudent}
                  handleDeleteStudent={handleDeleteStudent}
                  getProgramLabel={getProgramLabel}
                  canEditStudent={canEditStudent}
                  canDeleteStudent={canDeleteStudent}
                />
              )}

              {students.length === 0 && (
                <div className="card students-empty-card">
                  <p className="students-text-71">No student records found.</p>
                  <p className="students-text-72">Try clearing filters or refining your search parameters.</p>
                </div>
              )}

              {totalStudents > 0 && (
                <div className="students-row-73">
                  <span className="students-span-74">
                    Showing <strong className="students-strong-75">{((page - 1) * limit) + 1}</strong> to <strong className="students-strong-76">{Math.min(page * limit, totalStudents)}</strong> of <strong className="students-strong-77">{totalStudents}</strong> students
                  </span>
                  
                  <div className="pagination students-pagination-btn-group">
                    <button 
                      disabled={page === 1} 
                      onClick={() => setPage(page - 1)} 
                      className="btn btn-outline btn-icon students-btn-pagination"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                      <button 
                        key={p} 
                        onClick={() => setPage(p)} 
                        className={`btn ${page === p ? 'btn-primary' : 'btn-outline'} students-btn-pagination`}
                      >
                        {p}
                      </button>
                    ))}
                    
                    <button 
                      disabled={page === totalPages} 
                      onClick={() => setPage(page + 1)} 
                      className="btn btn-outline btn-icon students-btn-pagination"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          <BulkSectionModal
            showBulkSectionModal={showBulkSectionModal}
            setShowBulkSectionModal={setShowBulkSectionModal}
            bulkSectionId={bulkSectionId}
            setBulkSectionId={setBulkSectionId}
            sections={sections}
            handleBulkAction={handleBulkAction}
          />

          <ImportExcelModal
            showImportModal={showImportModal}
            setShowImportModal={setShowImportModal}
            importing={importing}
            setImporting={setImporting}
            importProgress={importProgress}
            setImportProgress={setImportProgress}
            programs={programs}
            sections={sections}
            academicYears={academicYears}
            fetchStudents={fetchStudents}
            showToast={showToast}
          />

          {showEditModal && editForm && (
            <EditStudentModal
              editForm={editForm}
              setEditForm={setEditForm}
              editTab={editTab}
              setEditTab={setEditTab}
              academicYears={academicYears}
              programs={programs}
              sections={sections}
              institutionType={institutionType}
              getProgramLabel={getProgramLabel}
              handleEditSubmit={handleEditSubmit}
              setShowEditModal={setShowEditModal}
            />
          )}
        </>
      )}
    </Layout>
  );
}
