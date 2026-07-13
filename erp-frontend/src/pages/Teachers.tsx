import './Teachers.css';
import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { api } from '../services/api';
import { Plus, Search, Eye, Edit3, Trash2, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Teachers() {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
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

  const handleAddTeacherClick = () => {
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
    if (createStep === 1) {
      if (!form.first_name || !form.last_name) {
        alert('First Name and Last Name are required.');
        return;
      }
      setCreateStep(2);
    } else if (createStep === 2) {
      if (!form.employee_id || !form.department) {
        alert('Employee ID and Department are required.');
        return;
      }
      // Auto-fill login credentials if they are empty
      const derivedUsername = (form.employee_id ? form.employee_id.toLowerCase() : '') || `${form.first_name.toLowerCase()}.${form.last_name.toLowerCase()}`;
      const derivedPassword = form.employee_id ? `${form.employee_id}@2026` : 'Teacher@2026';
      setForm((prev: any) => ({
        ...prev,
        username: prev.username || derivedUsername.replace(/[^a-zA-Z0-9._-]/g, ''),
        password: prev.password || derivedPassword
      }));
      setCreateStep(3);
    } else if (createStep === 3) {
      setCreateStep(4);
    }
  };

  const prevStep = () => {
    setCreateStep(prev => prev - 1);
  };

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

  const fetchTeachers = async () => {
    try {
      const data = await api.get('/teachers');
      setTeachers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const data = await api.get('/departments');
      setDepartments(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMetadata = async () => {
    try {
      const [programsData, subjectsData, sectionsData, yearsData] = await Promise.all([
        api.get('/programs').catch(() => []),
        api.get('/subjects').catch(() => []),
        api.get('/sections').catch(() => []),
        api.get('/academic-years').catch(() => [])
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (createStep < 4) {
      nextStep();
      return;
    }
    
    const firstName = form.first_name.trim();
    const middleName = form.middle_name ? form.middle_name.trim() : '';
    const lastName = form.last_name.trim();
    const employeeId = form.employee_id.trim();
    const email = form.email.trim();
    const phone = form.phone ? form.phone.trim() : '';
    const designation = form.designation.trim();
    const qualification = form.qualification.trim();
    const experience = form.experience.trim();

    const nameRegex = /^[a-zA-Z\s.]+$/;
    if (firstName.length < 2 || !nameRegex.test(firstName)) {
      alert('First Name must be at least 2 characters and contain only letters.');
      return;
    }
    if (middleName && !nameRegex.test(middleName)) {
      alert('Middle Name must contain only letters.');
      return;
    }
    if (lastName.length < 1 || !nameRegex.test(lastName)) {
      alert('Last Name must be at least 1 character and contain only letters.');
      return;
    }
    if (employeeId.length < 3) {
      alert('Employee ID must be at least 3 characters long.');
      return;
    }
    const empIdRegex = /^[a-zA-Z0-9_-]+$/;
    if (!empIdRegex.test(employeeId)) {
      alert('Employee ID must contain only alphanumeric characters, dashes, or underscores.');
      return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      alert('Please enter a valid email address.');
      return;
    }
    if (phone && !/^[0-9+\s-]{8,15}$/.test(phone)) {
      alert('Please enter a valid phone number (8-15 digits).');
      return;
    }
    if (!form.department) {
      alert('Please select a valid department.');
      return;
    }

    try {
      const res = await api.post('/teachers', {
        ...form,
        first_name: firstName,
        middle_name: middleName || null,
        last_name: lastName,
        employee_id: employeeId,
        email: email || null,
        phone: phone || null,
        designation: designation || null,
        qualification: qualification || null,
        experience: experience || null
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
              await api.post('/teacher-assignments', {
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
        name: `${firstName} ${lastName}`,
        username: res.username || form.username,
        password: res.password || form.password,
        login_created: res.login_created
      });

      setShowModal(false);
      setShowSuccessDialog(true);
      
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
      const assignmentsData = await api.get(`/teacher-assignments/teacher/${teacher.id}`);
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
    
    const firstName = editForm.first_name.trim();
    const middleName = editForm.middle_name ? editForm.middle_name.trim() : '';
    const lastName = editForm.last_name.trim();
    const employeeId = editForm.employee_id.trim();
    const email = editForm.email.trim();
    const designation = editForm.designation.trim();
    const qualification = editForm.qualification.trim();
    const experience = editForm.experience.trim();

    const nameRegex = /^[a-zA-Z\s.]+$/;
    if (firstName.length < 2 || !nameRegex.test(firstName)) {
      alert('First Name must be at least 2 characters and contain only letters.');
      return;
    }
    if (middleName && !nameRegex.test(middleName)) {
      alert('Middle Name must contain only letters.');
      return;
    }
    if (lastName.length < 1 || !nameRegex.test(lastName)) {
      alert('Last Name must be at least 1 character and contain only letters.');
      return;
    }
    if (employeeId.length < 3) {
      alert('Employee ID must be at least 3 characters long.');
      return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      alert('Please enter a valid email address.');
      return;
    }
    if (!editForm.department) {
      alert('Please select a valid department.');
      return;
    }

    try {
      await api.put(`/teachers/${editForm.id}`, {
        ...editForm,
        first_name: firstName,
        middle_name: middleName || null,
        last_name: lastName,
        employee_id: employeeId,
        email: email || null,
        designation: designation || null,
        qualification: qualification || null,
        experience: experience || null
      });
      setShowEditModal(false);
      fetchTeachers();
    } catch (err) {
      console.error(err);
      alert('Error updating teacher profile');
    }
  };

  const handleAddAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAssignment.academic_year_id || !newAssignment.course_id || !newAssignment.section_id || !newAssignment.subject_id) {
      alert('Please select all assignment details');
      return;
    }

    try {
      await api.post('/teacher-assignments', {
        teacher_id: editForm.id,
        subject_id: newAssignment.subject_id,
        course_id: newAssignment.course_id,
        section_id: newAssignment.section_id,
        academic_year_id: newAssignment.academic_year_id
      });
      
      const data = await api.get(`/teacher-assignments/teacher/${editForm.id}`);
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
      await api.delete(`/teacher-assignments/${assignId}`);
      const data = await api.get(`/teacher-assignments/teacher/${editForm.id}`);
      setEditAssignments(data || []);
    } catch (err) {
      console.error(err);
      alert('Failed to remove assignment.');
    }
  };

  const filteredTeachers = teachers.filter(t => 
    `${t.first_name} ${t.middle_name || ''} ${t.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
    t.employee_id.toLowerCase().includes(search.toLowerCase()) ||
    (t.department && t.department.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <Layout>
      {showModal ? (
        <>
          <div className="page-header teachers-page-header">
            <button className="btn btn-secondary teachers-btn" onClick={() => setShowModal(false)}>
              <ArrowLeft size={18} />
            </button>
            <div>
              <h2 className="teachers-title-3">Add New Teacher Walkthrough</h2>
              <p className="teachers-text-4">Follow the steps to register a new teacher and set up their portal account.</p>
            </div>
          </div>

          <div className="card teachers-card">
            {/* Step Indicators */}
            <div className="teachers-row-6">
              <div className="teachers-div-7"  />
              <div style={{ position: 'absolute', top: '50%', left: '1rem', width: `calc(${((createStep - 1) / 3) * 100}% - 2rem)`, height: '2px', backgroundColor: 'var(--primary)', transform: 'translateY(-50%)', transition: 'width 0.3s ease', zIndex: 0 }} />
              
              {[
                { step: 1, label: 'Personal' },
                { step: 2, label: 'Professional' },
                { step: 3, label: 'Account' },
                { step: 4, label: 'Review' }
              ].map((s) => {
                const isActive = createStep >= s.step;
                const isCurrent = createStep === s.step;
                return (
                  <div key={s.step} className="teachers-col-8">
                    <div style={{
                      width: '2.25rem',
                      height: '2.25rem',
                      borderRadius: '50%',
                      backgroundColor: isCurrent ? 'var(--primary)' : isActive ? '#e0e7ff' : '#ffffff',
                      border: `2px solid ${isActive ? 'var(--primary)' : '#cbd5e1'}`,
                      color: isCurrent ? '#ffffff' : isActive ? 'var(--primary)' : '#64748b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      transition: 'all 0.3s ease',
                      boxShadow: isCurrent ? '0 0 0 4px rgba(79, 70, 229, 0.15)' : 'none'
                    }}>
                      {isActive && createStep > s.step ? '✓' : s.step}
                    </div>
                    <span style={{
                      marginTop: '0.5rem',
                      fontSize: '0.75rem',
                      fontWeight: isCurrent || (isActive && createStep > s.step) ? 600 : 500,
                      color: isCurrent ? 'var(--primary)' : isActive ? 'var(--text-main)' : '#64748b',
                      whiteSpace: 'nowrap'
                    }}>
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>

            <form onSubmit={handleSubmit}>
              {/* Step 1: Personal Details */}
              {createStep === 1 && (
                <div className="teachers-col-9">
                  <div className="teachers-grid-10">
                    <div className="form-group">
                      <label>First Name *</label>
                      <input required type="text" value={form.first_name} onChange={e => setForm({...form, first_name: e.target.value})} placeholder="e.g. John" />
                    </div>
                    <div className="form-group">
                      <label>Middle Name (Optional)</label>
                      <input type="text" value={form.middle_name} onChange={e => setForm({...form, middle_name: e.target.value})} placeholder="e.g. Alan" />
                    </div>
                    <div className="form-group">
                      <label>Last Name *</label>
                      <input required type="text" value={form.last_name} onChange={e => setForm({...form, last_name: e.target.value})} placeholder="e.g. Smith" />
                    </div>
                  </div>

                  <div className="teachers-grid-11">
                    <div className="form-group">
                      <label>Email Address (Optional)</label>
                      <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="e.g. john.smith@example.com" />
                    </div>
                    <div className="form-group">
                      <label>Phone Number (Optional)</label>
                      <input type="text" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="e.g. +91 98765 43210" />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Professional Details */}
              {createStep === 2 && (
                <div className="teachers-col-12">
                  <div className="teachers-grid-13">
                    <div className="form-group">
                      <label>Employee ID *</label>
                      <input required type="text" value={form.employee_id} onChange={e => setForm({...form, employee_id: e.target.value})} placeholder="e.g. EMP1024" />
                    </div>
                    <div className="form-group">
                      <label>Department *</label>
                      <select 
                        required 
                        value={form.department} 
                        onChange={e => setForm({...form, department: e.target.value, selectedSubjects: []})}
                      >
                        <option value="">-- Choose Department --</option>
                        {departments.map(d => (
                          <option key={d.id} value={d.name}>{d.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Designation</label>
                      <input type="text" value={form.designation} onChange={e => setForm({...form, designation: e.target.value})} placeholder="e.g. Assistant Professor" />
                    </div>
                  </div>

                  <div className="teachers-grid-14">
                    <div className="form-group">
                      <label>Joining Date</label>
                      <input type="date" value={form.joining_date} onChange={e => setForm({...form, joining_date: e.target.value})} />
                    </div>
                    <div className="form-group">
                      <label>Qualification</label>
                      <input type="text" value={form.qualification} onChange={e => setForm({...form, qualification: e.target.value})} placeholder="e.g. Ph.D., M.Tech" />
                    </div>
                    <div className="form-group">
                      <label>Experience (Years / Details)</label>
                      <input type="text" value={form.experience} onChange={e => setForm({...form, experience: e.target.value})} placeholder="e.g. 5 Years" />
                    </div>
                  </div>

                  {form.department && (
                    <div className="form-group teachers-form-group">
                      <label className="teachers-label-16">Available Subjects (Autocreated Assignments)</label>
                      <div className="teachers-grid-17">
                        {getSubjectsForDepartment(form.department).map(s => {
                          const programName = programs.find(p => p.id === s.course_id)?.name || '';
                          return (
                            <label key={s.id} className="teachers-row-18">
                              <input 
                                type="checkbox" 
                                checked={form.selectedSubjects?.includes(s.id)}
                                onChange={e => {
                                  const checked = e.target.checked;
                                  const updated = checked 
                                    ? [...(form.selectedSubjects || []), s.id]
                                    : (form.selectedSubjects || []).filter((id: string) => id !== s.id);
                                  setForm({ ...form, selectedSubjects: updated });
                                }}
                              />
                              <div>
                                <span className="teachers-span-19">{s.subject_name}</span>
                                <span className="teachers-span-20">{programName}</span>
                              </div>
                            </label>
                          );
                        })}
                        {getSubjectsForDepartment(form.department).length === 0 && (
                          <span className="teachers-span-21">No subjects found for this department.</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Step 3: Account Setup */}
              {createStep === 3 && (
                <div className="teachers-col-22">
                  <label className="teachers-row-23">
                    <input type="checkbox" checked={form.create_login} onChange={e => setForm({...form, create_login: e.target.checked})} className="teachers-input-24"  />
                    <span>Create Login Account</span>
                  </label>

                  {form.create_login ? (
                    <div className="teachers-col-25">
                      <div className="form-group">
                        <label className="teachers-label-26">Username *</label>
                        <input 
                          required 
                          type="text" 
                          value={form.username} 
                          onChange={e => setForm({...form, username: e.target.value})} 
                          placeholder="e.g. john.smith"
                        />
                        <span className="teachers-span-27">
                          Unique identifier used to access the portal.
                        </span>
                      </div>

                      <div className="teachers-grid-28">
                        <div className="form-group">
                          <label className="teachers-label-29">Temporary Password *</label>
                          <input 
                            required 
                            type="text" 
                            value={form.password} 
                            onChange={e => setForm({...form, password: e.target.value})} 
                            placeholder="e.g. Temp@2026"
                          />
                        </div>
                        <div className="form-group">
                          <label className="teachers-label-30">Role</label>
                          <input type="text" value="Teacher" disabled className="teachers-input-31"  />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="teachers-row-32">
                      <span>Login account will be created later.</span>
                    </div>
                  )}
                </div>
              )}

              {/* Step 4: Review & Confirm */}
              {createStep === 4 && (
                <div className="teachers-col-33">
                  <div className="teachers-div-34">
                    <h4 className="teachers-title-35">Personal Details</h4>
                    <div className="teachers-grid-36">
                      <div><strong className="teachers-strong-37">Name:</strong> {form.first_name} {form.middle_name ? form.middle_name + ' ' : ''}{form.last_name}</div>
                      <div><strong className="teachers-strong-38">Email:</strong> {form.email || 'N/A'}</div>
                      <div><strong className="teachers-strong-39">Phone:</strong> {form.phone || 'N/A'}</div>
                    </div>
                  </div>

                  <div className="teachers-div-40">
                    <h4 className="teachers-title-41">Professional Details</h4>
                    <div className="teachers-grid-42">
                      <div><strong className="teachers-strong-43">Employee ID:</strong> {form.employee_id}</div>
                      <div><strong className="teachers-strong-44">Department:</strong> {form.department}</div>
                      <div><strong className="teachers-strong-45">Designation:</strong> {form.designation || 'N/A'}</div>
                      <div><strong className="teachers-strong-46">Joining Date:</strong> {form.joining_date || 'N/A'}</div>
                      <div><strong className="teachers-strong-47">Qualification:</strong> {form.qualification || 'N/A'}</div>
                      <div><strong className="teachers-strong-48">Experience:</strong> {form.experience || 'N/A'}</div>
                    </div>
                  </div>

                  <div className="teachers-div-49">
                    <h4 className="teachers-title-50">Account Setup</h4>
                    {form.create_login ? (
                      <div className="teachers-grid-51">
                        <div><strong className="teachers-strong-52">Username:</strong> {form.username}</div>
                        <div><strong className="teachers-strong-53">Password:</strong> {form.password}</div>
                        <div><strong className="teachers-strong-54">Role:</strong> Teacher</div>
                      </div>
                    ) : (
                      <div className="teachers-div-55">
                        Login account will be created later.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Wizard Form Actions */}
              <div className="modal-actions teachers-modal-actions">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary teachers-btn">Cancel</button>
                <div className="teachers-row-58">
                  {createStep > 1 && (
                    <button type="button" onClick={prevStep} className="btn btn-secondary">
                      Back
                    </button>
                  )}
                  {createStep < 4 ? (
                    <button key="btn-next" type="button" onClick={nextStep} className="btn btn-primary">
                      Next
                    </button>
                  ) : (
                    <button key="btn-submit" type="submit" className="btn btn-primary">
                      Create Teacher
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </>
      ) : (
        <>
          <div className="page-header teachers-page-header">
            <h2>Teachers</h2>
        <button className="btn btn-primary" onClick={handleAddTeacherClick}>
          <Plus size={18} /> Add Teacher
        </button>
      </div>

      <div className="card filters" style={{ marginBottom: '1rem' }}>
        <div className="search-container">
          <Search size={18} />
          <input 
            type="text" 
            placeholder="Search by name, ID, or department..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="card">
        {loading ? <p>Loading...</p> : (
          <table className="table">
            <thead>
              <tr>
                <th>Emp. ID</th>
                <th>Name</th>
                <th>Department</th>
                <th>Designation</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTeachers.map(t => (
                <tr key={t.id}>
                  <td>{t.employee_id}</td>
                  <td>{t.first_name} {t.middle_name ? t.middle_name + ' ' : ''}{t.last_name}</td>
                  <td>{t.department || '-'}</td>
                  <td>{t.designation || '-'}</td>
                  <td>
                    <span className={`badge badge-${t.status === 'ACTIVE' ? 'success' : 'secondary'}`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="teachers-row-61">
                    <Link to={`/teachers/${t.id}`} className="btn btn-sm btn-outline teachers-btn">
                      <Eye size={14} /> View
                    </Link>
                    <button onClick={() => handleEditClick(t)} className="btn btn-sm btn-secondary teachers-btn">
                      <Edit3 size={14} /> Edit
                    </button>
                  </td>
                </tr>
              ))}
              {filteredTeachers.length === 0 && (
                <tr>
                  <td colSpan={6} className="teachers-td-64">No teachers found.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

        </>
      )}

      {/* Success Dialog */}
      {showSuccessDialog && createdCredentials && (
        <div className="modal teachers-modal">
          <div className="modal-content teachers-modal-content">
            <div className="teachers-row-67">
              ✓
            </div>
            
            <h3 className="teachers-title-68">Teacher Created Successfully</h3>
            <p className="teachers-text-69">
              The profile for <strong>{createdCredentials.name}</strong> has been saved.
            </p>

            {createdCredentials.login_created ? (
              <div className="teachers-div-70">
                <h4 className="teachers-row-71">
                  🔑 Login Credentials
                </h4>
                
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
                ℹ️ Login account creation was skipped. This can be created later from user settings.
              </div>
            )}

            <div className="teachers-row-83">
              <button type="button" onClick={() => { const text = `Teacher Credentials\nName: ${createdCredentials.name}\nUsername: ${createdCredentials.username || 'N/A'}\nTemporary Password: ${createdCredentials.password || 'N/A'}`; navigator.clipboard.writeText(text); alert('Credentials copied to clipboard!'); }} className="btn btn-primary teachers-btn" disabled={!createdCredentials.login_created}>
                Copy Credentials
              </button>
              <button type="button" onClick={() => { window.print(); }} className="btn btn-secondary teachers-btn">
                Print
              </button>
              <button type="button" onClick={() => { alert('Credential delivery scheduled.'); }} className="btn btn-secondary teachers-btn">
                Send Later
              </button>
            </div>
            
            <div className="teachers-div-87">
              <button type="button" onClick={() => { setShowSuccessDialog(false); setCreatedCredentials(null); }} className="btn btn-outline teachers-btn">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal (Tabbed Layout) */}
      {showEditModal && editForm && (
        <div className="modal teachers-modal">
          <div className="modal-content teachers-modal-content">
            <h3 className="teachers-title-91">Edit Teacher Profile</h3>
            
            {/* Tabs */}
            <div className="teachers-row-92">
              {['personal', 'professional', 'academic', 'account'].map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setEditTab(t as any)}
                  style={{
                    padding: '0.5rem 1rem',
                    border: 'none',
                    background: 'none',
                    borderBottom: editTab === t ? '2px solid var(--primary)' : '2px solid transparent',
                    color: editTab === t ? 'var(--primary)' : '#64748b',
                    fontWeight: editTab === t ? 700 : 500,
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {t}
                </button>
              ))}
            </div>

            <form onSubmit={handleEditSubmit}>
              {/* TAB 1: Personal */}
              {editTab === 'personal' && (
                <div className="teachers-col-93">
                  <div className="teachers-grid-94">
                    <div className="form-group">
                      <label>First Name *</label>
                      <input required type="text" value={editForm.first_name} onChange={e => setEditForm({...editForm, first_name: e.target.value})} />
                    </div>
                    <div className="form-group">
                      <label>Middle Name</label>
                      <input type="text" value={editForm.middle_name} onChange={e => setEditForm({...editForm, middle_name: e.target.value})} />
                    </div>
                    <div className="form-group">
                      <label>Last Name *</label>
                      <input required type="text" value={editForm.last_name} onChange={e => setEditForm({...editForm, last_name: e.target.value})} />
                    </div>
                  </div>
                  <div className="teachers-grid-95">
                    <div className="form-group">
                      <label>Email *</label>
                      <input required type="email" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} />
                    </div>
                    <div className="form-group">
                      <label>Phone</label>
                      <input type="text" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: Professional */}
              {editTab === 'professional' && (
                <div className="teachers-col-96">
                  <div className="teachers-grid-97">
                    <div className="form-group">
                      <label>Employee ID *</label>
                      <input required type="text" value={editForm.employee_id} onChange={e => setEditForm({...editForm, employee_id: e.target.value})} />
                    </div>
                    <div className="form-group">
                      <label>Department *</label>
                      <select 
                        required 
                        value={editForm.department} 
                        onChange={e => setEditForm({...editForm, department: e.target.value})}
                      >
                        <option value="">-- Choose Department --</option>
                        {departments.map(d => (
                          <option key={d.id} value={d.name}>{d.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="teachers-grid-98">
                    <div className="form-group">
                      <label>Designation</label>
                      <input type="text" value={editForm.designation} onChange={e => setEditForm({...editForm, designation: e.target.value})} />
                    </div>
                    <div className="form-group">
                      <label>Joining Date</label>
                      <input type="date" value={editForm.joining_date} onChange={e => setEditForm({...editForm, joining_date: e.target.value})} />
                    </div>
                  </div>
                  <div className="teachers-grid-99">
                    <div className="form-group">
                      <label>Qualification</label>
                      <input type="text" value={editForm.qualification} onChange={e => setEditForm({...editForm, qualification: e.target.value})} />
                    </div>
                    <div className="form-group">
                      <label>Experience (Years)</label>
                      <input type="text" value={editForm.experience} onChange={e => setEditForm({...editForm, experience: e.target.value})} />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: Academic Assignments */}
              {editTab === 'academic' && (
                <div>
                  <h4 className="teachers-title-100">Add Subject Assignment</h4>
                  
                  <div className="teachers-grid-101">
                    <div className="form-group teachers-form-group">
                      <label className="teachers-label-103">Academic Year</label>
                      <select 
                        value={newAssignment.academic_year_id} 
                        onChange={e => setNewAssignment({...newAssignment, academic_year_id: e.target.value})}
                      >
                        {academicYears.map(y => (
                          <option key={y.id} value={y.id}>{y.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group teachers-form-group">
                      <label className="teachers-label-105">Class / Program</label>
                      <select 
                        value={newAssignment.course_id} 
                        onChange={e => setNewAssignment({...newAssignment, course_id: e.target.value, section_id: '', subject_id: ''})}
                      >
                        {programs.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group teachers-form-group">
                      <label className="teachers-label-107">Section</label>
                      <select 
                        value={newAssignment.section_id} 
                        onChange={e => setNewAssignment({...newAssignment, section_id: e.target.value})}
                      >
                        <option value="">-- Choose Section --</option>
                        {sections
                          .filter(s => s.course_id === newAssignment.course_id)
                          .map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                      </select>
                    </div>

                    <div className="form-group teachers-form-group">
                      <label className="teachers-label-109">Subject</label>
                      <select 
                        value={newAssignment.subject_id} 
                        onChange={e => setNewAssignment({...newAssignment, subject_id: e.target.value})}
                      >
                        <option value="">-- Choose Subject --</option>
                        {subjects
                          .filter(s => s.course_id === newAssignment.course_id)
                          .map(s => (
                            <option key={s.id} value={s.id}>{s.subject_name}</option>
                          ))}
                      </select>
                    </div>

                    <button type="button" onClick={handleAddAssignment} className="btn btn-primary btn-sm teachers-btn">
                      Assign
                    </button>
                  </div>

                  <h4 className="teachers-title-111">Current Assignments</h4>
                  <div className="teachers-div-112">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Year</th>
                          <th>Class</th>
                          <th>Section</th>
                          <th>Subject</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {editAssignments.map(a => (
                          <tr key={a.id}>
                            <td>{academicYears.find(y => y.id === a.academic_year_id)?.name || 'N/A'}</td>
                            <td>{programs.find(p => p.id === a.course_id)?.name || 'N/A'}</td>
                            <td>{sections.find(s => s.id === a.section_id)?.name || 'N/A'}</td>
                            <td>{subjects.find(s => s.id === a.subject_id)?.subject_name || 'N/A'}</td>
                            <td>
                              <button type="button" onClick={() => handleRemoveAssignment(a.id)} className="btn btn-sm btn-outline-danger teachers-btn">
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))}
                        {editAssignments.length === 0 && (
                          <tr>
                            <td colSpan={5} className="teachers-td-114">No assignments mapped.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 4: Account Status */}
              {editTab === 'account' && (
                <div className="teachers-col-115">
                  <div className="form-group">
                    <label>Account Status</label>
                    <select value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value})}>
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="ON_LEAVE">ON LEAVE</option>
                      <option value="RESIGNED">RESIGNED</option>
                      <option value="RETIRED">RETIRED</option>
                    </select>
                  </div>
                  <div className="teachers-div-116">
                    <strong>Administrative Note:</strong> Account credential resets and login profile adjustments must be performed through the general Users Directory access control configurations.
                  </div>
                </div>
              )}

              {/* Modal Actions */}
              <div className="modal-actions teachers-modal-actions">
                <button type="button" onClick={() => setShowEditModal(false)} className="btn btn-secondary">Cancel</button>
                {editTab !== 'academic' && (
                  <button type="submit" className="btn btn-primary">Save Changes</button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
