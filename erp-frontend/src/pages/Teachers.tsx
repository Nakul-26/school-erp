import './Teachers.css';
import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { Plus, Grid, List, Eye } from 'lucide-react';

// Modular Imports
import { teacherService } from './teachers/teacherService';
import { teacherValidation } from './teachers/teacherValidation';
import { TeachersFilters } from './teachers/components/TeachersFilters';
import { TeacherCard } from './teachers/components/TeacherCard';
import { TeachersTable } from './teachers/components/TeachersTable';
import { AddTeacherWizard } from './teachers/components/AddTeacherWizard';
import { EditTeacherModal } from './teachers/components/EditTeacherModal';

export default function Teachers() {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search and Advanced Filters
  const [search, setSearch] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedDesignation, setSelectedDesignation] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Layout View State
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Creation Modal & Onboarding Wizard State
  const [showModal, setShowModal] = useState(false);
  const [createStep, setCreateStep] = useState(1);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<any>(null);

  const [form, setForm] = useState<any>({
    employee_id: '',
    first_name: '',
    middle_name: '',
    last_name: '',
    email: '',
    phone: '',
    designation: '',
    department: '',
    status: 'ACTIVE',
    joining_date: '',
    qualification: '',
    experience: '',
    selectedSubjects: [],
    create_login: true,
    username: '',
    password: ''
  });

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState<any>(null);
  const [editTab, setEditTab] = useState<'personal' | 'professional' | 'academic' | 'account'>('personal');
  const [editAssignments, setEditAssignments] = useState<any[]>([]);
  const [newAssignment, setNewAssignment] = useState({
    academic_year_id: '',
    course_id: '',
    section_id: '',
    subject_id: ''
  });

  useEffect(() => {
    fetchTeachers();
    fetchDepartments();
    fetchMetadata();
  }, []);

  // Close menus when clicking outside
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

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      const data = await teacherService.getTeachers();
      setTeachers(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const data = await teacherService.getDepartments();
      setDepartments(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMetadata = async () => {
    try {
      const [programsData, subjectsData, sectionsData, yearsData] = await Promise.all([
        teacherService.getPrograms().catch(() => []),
        teacherService.getSubjects().catch(() => []),
        teacherService.getSections().catch(() => []),
        teacherService.getAcademicYears().catch(() => [])
      ]);
      setPrograms(programsData || []);
      setSubjects(subjectsData || []);
      setSections(sectionsData || []);
      setAcademicYears(yearsData || []);
    } catch (err) {
      console.error(err);
    }
  };

  const getSubjectsForDepartment = (deptName: string) => {
    const selectedDept = departments.find(d => d.name === deptName);
    if (!selectedDept) return [];
    const deptPrograms = programs.filter(p => p.department_id === selectedDept.id);
    return subjects.filter(s => deptPrograms.some(p => p.id === s.course_id));
  };

  const handleAddTeacherClick = () => {
    const currentYear = academicYears.find(y => y.is_current) || academicYears[0];
    setForm({
      employee_id: '',
      first_name: '',
      middle_name: '',
      last_name: '',
      email: '',
      phone: '',
      designation: '',
      department: '',
      status: 'ACTIVE',
      joining_date: '',
      qualification: '',
      experience: '',
      selectedSubjects: [],
      create_login: true,
      username: '',
      password: ''
    });
    setCreateStep(1);
    setShowModal(true);
  };

  const nextStep = () => {
    const error = teacherValidation.validateStep(createStep, form);
    if (error) {
      alert(error);
      return;
    }

    if (createStep === 2) {
      // Auto-fill login credentials if empty
      const derivedUsername = (form.employee_id ? form.employee_id.toLowerCase() : '') || `${form.first_name.toLowerCase()}.${form.last_name.toLowerCase()}`;
      const derivedPassword = form.employee_id ? `${form.employee_id}@2026` : 'Teacher@2026';
      setForm((prev: any) => ({
        ...prev,
        username: prev.username || derivedUsername.replace(/[^a-zA-Z0-9._-]/g, ''),
        password: prev.password || derivedPassword
      }));
    }
    setCreateStep(prev => prev + 1);
  };

  const prevStep = () => {
    setCreateStep(prev => prev - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (createStep < 4) {
      nextStep();
      return;
    }

    const error = teacherValidation.validateStep(createStep, form);
    if (error) {
      alert(error);
      return;
    }

    try {
      const res = await teacherService.createTeacher({
        ...form,
        first_name: form.first_name.trim(),
        middle_name: form.middle_name ? form.middle_name.trim() : null,
        last_name: form.last_name.trim(),
        employee_id: form.employee_id.trim(),
        email: form.email.trim(),
        phone: form.phone ? form.phone.trim() : null,
        designation: form.designation ? form.designation.trim() : null,
        qualification: form.qualification ? form.qualification.trim() : null,
        experience: form.experience ? form.experience.trim() : null
      });

      const newTeacherId = res.id;

      if (newTeacherId && form.selectedSubjects && form.selectedSubjects.length > 0) {
        const currentYear = academicYears.find(y => y.is_current) || academicYears[0];
        for (const subId of form.selectedSubjects) {
          const subjectObj = subjects.find(s => s.id === subId);
          if (!subjectObj) continue;
          
          const sectionObj = sections.find(sec => sec.course_id === subjectObj.course_id && sec.academic_year_id === currentYear?.id) 
            || sections.find(sec => sec.course_id === subjectObj.course_id);
            
          if (sectionObj && currentYear) {
            try {
              await teacherService.createAssignment({
                teacher_id: newTeacherId,
                subject_id: subId,
                course_id: subjectObj.course_id,
                section_id: sectionObj.id,
                academic_year_id: currentYear.id
              });
            } catch (assignErr) {
              console.error('Failed to assign subject during creation:', assignErr);
            }
          }
        }
      }

      setCreatedCredentials({
        name: `${form.first_name} ${form.last_name}`,
        username: res.username || form.username,
        password: res.password || form.password,
        login_created: res.login_created
      });

      setShowModal(false);
      setShowSuccessDialog(true);
      fetchTeachers();
    } catch (err: any) {
      alert(err.message || 'Error adding teacher');
    }
  };

  const handleEditClick = async (teacher: any) => {
    setEditForm({
      id: teacher.id,
      employee_id: teacher.employee_id || '',
      first_name: teacher.first_name || '',
      middle_name: teacher.middle_name || '',
      last_name: teacher.last_name || '',
      email: teacher.email || '',
      phone: teacher.phone || '',
      designation: teacher.designation || '',
      department: teacher.department || '',
      status: teacher.status || 'ACTIVE',
      joining_date: teacher.joining_date || '',
      qualification: teacher.qualification || '',
      experience: teacher.experience || ''
    });
    setEditTab('personal');
    setShowEditModal(true);
    
    try {
      const assignmentsData = await teacherService.getAssignmentsByTeacher(teacher.id);
      setEditAssignments(assignmentsData || []);
    } catch (err) {
      console.error(err);
      setEditAssignments([]);
    }

    const currentYear = academicYears.find(y => y.is_current) || academicYears[0];
    setNewAssignment({
      academic_year_id: currentYear?.id || '',
      course_id: programs[0]?.id || '',
      section_id: '',
      subject_id: ''
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const error = teacherValidation.validateEdit(editForm);
    if (error) {
      alert(error);
      return;
    }

    try {
      await teacherService.updateTeacher(editForm.id, {
        ...editForm,
        first_name: editForm.first_name.trim(),
        middle_name: editForm.middle_name ? editForm.middle_name.trim() : null,
        last_name: editForm.last_name.trim(),
        employee_id: editForm.employee_id.trim(),
        email: editForm.email.trim(),
        designation: editForm.designation ? editForm.designation.trim() : null,
        qualification: editForm.qualification ? editForm.qualification.trim() : null,
        experience: editForm.experience ? editForm.experience.trim() : null
      });
      setShowEditModal(false);
      fetchTeachers();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Error updating teacher profile');
    }
  };

  const handleAddAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAssignment.academic_year_id || !newAssignment.course_id || !newAssignment.section_id || !newAssignment.subject_id) {
      alert('Please select all assignment details');
      return;
    }

    try {
      await teacherService.createAssignment({
        teacher_id: editForm.id,
        subject_id: newAssignment.subject_id,
        course_id: newAssignment.course_id,
        section_id: newAssignment.section_id,
        academic_year_id: newAssignment.academic_year_id
      });
      
      const data = await teacherService.getAssignmentsByTeacher(editForm.id);
      setEditAssignments(data || []);
      setNewAssignment(prev => ({ ...prev, subject_id: '' }));
    } catch (err) {
      console.error(err);
      alert('Failed to add subject assignment.');
    }
  };

  const handleRemoveAssignment = async (assignId: string) => {
    if (!confirm('Are you sure you want to remove this assignment?')) return;
    try {
      await teacherService.deleteAssignment(assignId);
      const data = await teacherService.getAssignmentsByTeacher(editForm.id);
      setEditAssignments(data || []);
    } catch (err) {
      console.error(err);
      alert('Failed to remove assignment.');
    }
  };

  const handleDeleteTeacher = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to permanently delete teacher "${name}"? This action is irreversible.`)) return;
    try {
      setLoading(true);
      await teacherService.deleteTeacher(id);
      fetchTeachers();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Delete failed.');
      setLoading(false);
    }
  };

  // Filters logic
  const filteredTeachers = teachers.filter(t => {
    const fullName = `${t.first_name} ${t.middle_name || ''} ${t.last_name}`.toLowerCase();
    const searchMatch = fullName.includes(search.toLowerCase()) ||
                        t.employee_id.toLowerCase().includes(search.toLowerCase()) ||
                        (t.department && t.department.toLowerCase().includes(search.toLowerCase()));

    const departmentMatch = !selectedDepartment || t.department === selectedDepartment;
    const designationMatch = !selectedDesignation || t.designation === selectedDesignation;
    const statusMatch = !selectedStatus || t.status === selectedStatus;

    return searchMatch && departmentMatch && designationMatch && statusMatch;
  });

  // Extract unique designations dynamically
  const uniqueDesignations = Array.from(
    new Set(teachers.map(t => t.designation).filter(Boolean))
  ) as string[];

  return (
    <Layout>
      {showModal ? (
        <AddTeacherWizard
          createStep={createStep}
          setCreateStep={setCreateStep}
          form={form}
          setForm={setForm}
          departments={departments}
          programs={programs}
          subjects={subjects}
          sections={sections}
          academicYears={academicYears}
          getSubjectsForDepartment={getSubjectsForDepartment}
          handleSubmit={handleSubmit}
          prevStep={prevStep}
          nextStep={nextStep}
          setShowModal={setShowModal}
        />
      ) : (
        <>
          <div className="page-header teachers-page-header">
            <div>
              <h2 className="teachers-title-3">Teachers Directory</h2>
              <p className="teachers-text-4">Manage academic faculty members, subject assignments, and login credentials.</p>
            </div>
            
            <div className="teachers-header-actions">
              {/* Layout view controls */}
              <div className="view-toggle teachers-view-toggle">
                <button 
                  onClick={() => setViewMode('grid')} 
                  className={`btn-view-toggle teachers-btn-view-toggle ${viewMode === 'grid' ? 'is-active' : ''}`}
                  title="Grid View"
                >
                  <Grid size={18} />
                </button>
                <button 
                  onClick={() => setViewMode('table')} 
                  className={`btn-view-toggle teachers-btn-view-toggle ${viewMode === 'table' ? 'is-active' : ''}`}
                  title="Table List View"
                >
                  <List size={18} />
                </button>
              </div>

              <button className="btn btn-primary" onClick={handleAddTeacherClick}>
                <Plus size={18} /> Add Teacher
              </button>
            </div>
          </div>

          <TeachersFilters
            search={search}
            setSearch={setSearch}
            selectedDepartment={selectedDepartment}
            setSelectedDepartment={setSelectedDepartment}
            selectedDesignation={selectedDesignation}
            setSelectedDesignation={setSelectedDesignation}
            selectedStatus={selectedStatus}
            setSelectedStatus={setSelectedStatus}
            departments={departments}
            designations={uniqueDesignations}
          />

          {loading ? (
            <div className="students-div-36">
              <p className="students-text-37">Loading teachers list...</p>
            </div>
          ) : (
            <>
              {viewMode === 'grid' ? (
                <div className="teachers-grid-container">
                  {filteredTeachers.map(t => (
                    <TeacherCard
                      key={t.id}
                      teacher={t}
                      activeMenuId={activeMenuId}
                      setActiveMenuId={setActiveMenuId}
                      handleEditClick={handleEditClick}
                      handleDeleteTeacher={handleDeleteTeacher}
                    />
                  ))}
                </div>
              ) : (
                <TeachersTable
                  teachers={filteredTeachers}
                  handleEditClick={handleEditClick}
                  handleDeleteTeacher={handleDeleteTeacher}
                />
              )}

              {filteredTeachers.length === 0 && (
                <div className="card students-empty-card">
                  <p className="students-text-71">No teacher records found.</p>
                  <p className="students-text-72">Try clearing filters or refining your search parameters.</p>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Success Dialog */}
      {showSuccessDialog && createdCredentials && (
        <div className="modal teachers-modal">
          <div className="modal-content teachers-modal-content">
            <div className="teachers-row-67">✓</div>
            <h3 className="teachers-title-68">Teacher Created Successfully</h3>
            <p className="teachers-text-69">
              The profile for <strong>{createdCredentials.name}</strong> has been saved.
            </p>

            {createdCredentials.login_created ? (
              <div className="teachers-div-70">
                <h4 className="teachers-row-71">🔑 Login Credentials</h4>
                <div className="teachers-col-72">
                  <div>
                    <span className="teachers-span-73">Username</span>
                    <div className="teachers-row-74">
                      <code className="teachers-code-75">{createdCredentials.username}</code>
                      <button type="button" onClick={() => { navigator.clipboard.writeText(createdCredentials.username); alert('Username copied to clipboard!'); }} className="teachers-btn-76">
                        Copy
                      </button>
                    </div>
                  </div>
                  <div className="teachers-div-77">
                    <span className="teachers-span-78">Temporary Password</span>
                    <div className="teachers-row-79">
                      <code className="teachers-code-80">{createdCredentials.password}</code>
                      <button type="button" onClick={() => { navigator.clipboard.writeText(createdCredentials.password); alert('Password copied to clipboard!'); }} className="teachers-btn-81">
                        Copy
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="teachers-div-82">
                Login credentials were not generated. You can configure them later.
              </div>
            )}

            <div className="teachers-row-83">
              <button type="button" onClick={() => { const text = `Teacher Credentials\nName: ${createdCredentials.name}\nUsername: ${createdCredentials.username || 'N/A'}\nTemporary Password: ${createdCredentials.password || 'N/A'}`; navigator.clipboard.writeText(text); alert('Credentials copied to clipboard!'); }} className="btn btn-primary teachers-btn" disabled={!createdCredentials.login_created}>
                Copy All Details
              </button>
              <button type="button" onClick={() => { window.print(); }} className="btn btn-secondary teachers-btn">
                Print Setup
              </button>
              <button type="button" onClick={() => { setShowSuccessDialog(false); setCreatedCredentials(null); }} className="btn btn-outline teachers-btn">
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && editForm && (
        <EditTeacherModal
          editForm={editForm}
          setEditForm={setEditForm}
          editTab={editTab}
          setEditTab={setEditTab}
          editAssignments={editAssignments}
          newAssignment={newAssignment}
          setNewAssignment={setNewAssignment}
          departments={departments}
          programs={programs}
          subjects={subjects}
          sections={sections}
          academicYears={academicYears}
          handleEditSubmit={handleEditSubmit}
          handleAddAssignment={handleAddAssignment}
          handleRemoveAssignment={handleRemoveAssignment}
          setShowEditModal={setShowEditModal}
        />
      )}
    </Layout>
  );
}
