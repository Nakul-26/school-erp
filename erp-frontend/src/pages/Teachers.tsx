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
          <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            <button className="btn btn-secondary" style={{ padding: '0.5rem' }} onClick={() => setShowModal(false)}>
              <ArrowLeft size={18} />
            </button>
            <div>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)' }}>Add New Teacher Walkthrough</h2>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Follow the steps to register a new teacher and set up their portal account.</p>
            </div>
          </div>

          <div className="card" style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
            {/* Step Indicators */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', position: 'relative', padding: '0 1rem' }}>
              <div style={{ position: 'absolute', top: '50%', left: '1rem', right: '1rem', height: '2px', backgroundColor: '#e2e8f0', transform: 'translateY(-50%)', zIndex: 0 }} />
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
                  <div key={s.step} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1, position: 'relative' }}>
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
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

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
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

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
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
                    <div className="form-group" style={{ marginTop: '0.5rem' }}>
                      <label style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.875rem' }}>Available Subjects (Autocreated Assignments)</label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem', marginTop: '0.5rem', maxHeight: '150px', overflowY: 'auto', border: '1px solid var(--border)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                        {getSubjectsForDepartment(form.department).map(s => {
                          const programName = programs.find(p => p.id === s.course_id)?.name || '';
                          return (
                            <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', cursor: 'pointer' }}>
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
                                <span style={{ fontWeight: 600 }}>{s.subject_name}</span>
                                <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)' }}>{programName}</span>
                              </div>
                            </label>
                          );
                        })}
                        {getSubjectsForDepartment(form.department).length === 0 && (
                          <span style={{ gridColumn: '1 / -1', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No subjects found for this department.</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Step 3: Account Setup */}
              {createStep === 3 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                    <input 
                      type="checkbox" 
                      checked={form.create_login} 
                      onChange={e => setForm({...form, create_login: e.target.checked})}
                      style={{ width: '1.2rem', height: '1.2rem', accentColor: 'var(--primary)' }}
                    />
                    <span>Create Login Account</span>
                  </label>

                  {form.create_login ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.25rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', backgroundColor: '#f8fafc' }}>
                      <div className="form-group">
                        <label style={{ fontWeight: 600 }}>Username *</label>
                        <input 
                          required 
                          type="text" 
                          value={form.username} 
                          onChange={e => setForm({...form, username: e.target.value})} 
                          placeholder="e.g. john.smith"
                        />
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                          Unique identifier used to access the portal.
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="form-group">
                          <label style={{ fontWeight: 600 }}>Temporary Password *</label>
                          <input 
                            required 
                            type="text" 
                            value={form.password} 
                            onChange={e => setForm({...form, password: e.target.value})} 
                            placeholder="e.g. Temp@2026"
                          />
                        </div>
                        <div className="form-group">
                          <label style={{ fontWeight: 600 }}>Role</label>
                          <input 
                            type="text" 
                            value="Teacher" 
                            disabled 
                            style={{ backgroundColor: '#e2e8f0', color: '#64748b', cursor: 'not-allowed', fontWeight: 600 }}
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1.25rem', border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)', backgroundColor: '#f8fafc', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                      <span>Login account will be created later.</span>
                    </div>
                  )}
                </div>
              )}

              {/* Step 4: Review & Confirm */}
              {createStep === 4 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={{ backgroundColor: '#f8fafc', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '1.25rem' }}>
                    <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Personal Details</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.875rem' }}>
                      <div><strong style={{ color: 'var(--text-muted)' }}>Name:</strong> {form.first_name} {form.middle_name ? form.middle_name + ' ' : ''}{form.last_name}</div>
                      <div><strong style={{ color: 'var(--text-muted)' }}>Email:</strong> {form.email || 'N/A'}</div>
                      <div><strong style={{ color: 'var(--text-muted)' }}>Phone:</strong> {form.phone || 'N/A'}</div>
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#f8fafc', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '1.25rem' }}>
                    <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Professional Details</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.875rem' }}>
                      <div><strong style={{ color: 'var(--text-muted)' }}>Employee ID:</strong> {form.employee_id}</div>
                      <div><strong style={{ color: 'var(--text-muted)' }}>Department:</strong> {form.department}</div>
                      <div><strong style={{ color: 'var(--text-muted)' }}>Designation:</strong> {form.designation || 'N/A'}</div>
                      <div><strong style={{ color: 'var(--text-muted)' }}>Joining Date:</strong> {form.joining_date || 'N/A'}</div>
                      <div><strong style={{ color: 'var(--text-muted)' }}>Qualification:</strong> {form.qualification || 'N/A'}</div>
                      <div><strong style={{ color: 'var(--text-muted)' }}>Experience:</strong> {form.experience || 'N/A'}</div>
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#f8fafc', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '1.25rem' }}>
                    <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Account Setup</h4>
                    {form.create_login ? (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.875rem' }}>
                        <div><strong style={{ color: 'var(--text-muted)' }}>Username:</strong> {form.username}</div>
                        <div><strong style={{ color: 'var(--text-muted)' }}>Password:</strong> {form.password}</div>
                        <div><strong style={{ color: 'var(--text-muted)' }}>Role:</strong> Teacher</div>
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                        Login account will be created later.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Wizard Form Actions */}
              <div className="modal-actions" style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', marginTop: '2rem', borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary" style={{ marginRight: 'auto' }}>Cancel</button>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  {createStep > 1 && (
                    <button type="button" onClick={prevStep} className="btn btn-secondary">
                      Back
                    </button>
                  )}
                  {createStep < 4 ? (
                    <button type="button" onClick={nextStep} className="btn btn-primary">
                      Next
                    </button>
                  ) : (
                    <button type="submit" className="btn btn-primary">
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
          <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
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
                  <td style={{ display: 'flex', gap: '0.5rem' }}>
                    <Link to={`/teachers/${t.id}`} className="btn btn-sm btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Eye size={14} /> View
                    </Link>
                    <button 
                      onClick={() => handleEditClick(t)} 
                      className="btn btn-sm btn-secondary"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                    >
                      <Edit3 size={14} /> Edit
                    </button>
                  </td>
                </tr>
              ))}
              {filteredTeachers.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>No teachers found.</td>
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
        <div className="modal" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.45)', zIndex: 1000, padding: '1rem' }}>
          <div className="modal-content" style={{ backgroundColor: '#ffffff', borderRadius: 'var(--radius-lg)', maxWidth: '480px', width: '100%', padding: '2.5rem', boxShadow: 'var(--shadow-lg)', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
            <div style={{
              width: '4.5rem',
              height: '4.5rem',
              borderRadius: '50%',
              backgroundColor: '#ecfdf5',
              border: '2px solid #34d399',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2rem',
              margin: '0 auto 1.5rem',
              boxShadow: '0 0 0 8px rgba(16, 185, 129, 0.1)'
            }}>
              ✓
            </div>
            
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--text-main)' }}>Teacher Created Successfully</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '2rem' }}>
              The profile for <strong>{createdCredentials.name}</strong> has been saved.
            </p>

            {createdCredentials.login_created ? (
              <div style={{
                backgroundColor: 'var(--bg-main)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '1.5rem',
                marginBottom: '2rem',
                textAlign: 'left'
              }}>
                <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  🔑 Login Credentials
                </h4>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div>
                    <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Username</span>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
                      <code style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)', fontFamily: 'monospace' }}>{createdCredentials.username}</code>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(createdCredentials.username);
                          alert('Username copied to clipboard!');
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--primary)',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          padding: '2px 6px',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: '#e0e7ff'
                        }}
                      >
                        Copy
                      </button>
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
                    <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Temporary Password</span>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
                      <code style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)', fontFamily: 'monospace' }}>{createdCredentials.password}</code>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(createdCredentials.password);
                          alert('Password copied to clipboard!');
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--primary)',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          padding: '2px 6px',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: '#e0e7ff'
                        }}
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{
                backgroundColor: '#f8fafc',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
                marginBottom: '2rem',
                fontSize: '0.875rem',
                color: 'var(--text-muted)'
              }}>
                ℹ️ Login account creation was skipped. This can be created later from user settings.
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => {
                  const text = `Teacher Credentials\nName: ${createdCredentials.name}\nUsername: ${createdCredentials.username || 'N/A'}\nTemporary Password: ${createdCredentials.password || 'N/A'}`;
                  navigator.clipboard.writeText(text);
                  alert('Credentials copied to clipboard!');
                }}
                className="btn btn-primary"
                style={{ flex: '1 1 auto', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', minWidth: '120px' }}
                disabled={!createdCredentials.login_created}
              >
                Copy Credentials
              </button>
              <button
                type="button"
                onClick={() => {
                  window.print();
                }}
                className="btn btn-secondary"
                style={{ flex: '1 1 auto', minWidth: '80px' }}
              >
                Print
              </button>
              <button
                type="button"
                onClick={() => {
                  alert('Credential delivery scheduled.');
                }}
                className="btn btn-secondary"
                style={{ flex: '1 1 auto', minWidth: '90px' }}
              >
                Send Later
              </button>
            </div>
            
            <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
              <button
                type="button"
                onClick={() => {
                  setShowSuccessDialog(false);
                  setCreatedCredentials(null);
                }}
                className="btn btn-outline"
                style={{ width: '100%' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal (Tabbed Layout) */}
      {showEditModal && editForm && (
        <div className="modal" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.45)', zIndex: 1000, padding: '1rem', overflowY: 'auto' }}>
          <div className="modal-content" style={{ backgroundColor: '#ffffff', borderRadius: 'var(--radius-lg)', maxWidth: '680px', width: '100%', padding: '2rem', boxShadow: 'var(--shadow-lg)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.5rem', color: 'var(--text-main)' }}>Edit Teacher Profile</h3>
            
            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '1.5rem', gap: '1rem', overflowX: 'auto', scrollbarWidth: 'none' }}>
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
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
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
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
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label>Designation</label>
                      <input type="text" value={editForm.designation} onChange={e => setEditForm({...editForm, designation: e.target.value})} />
                    </div>
                    <div className="form-group">
                      <label>Joining Date</label>
                      <input type="date" value={editForm.joining_date} onChange={e => setEditForm({...editForm, joining_date: e.target.value})} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
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
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-main)' }}>Add Subject Assignment</h4>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', alignItems: 'end', marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '0.75rem' }}>Academic Year</label>
                      <select 
                        value={newAssignment.academic_year_id} 
                        onChange={e => setNewAssignment({...newAssignment, academic_year_id: e.target.value})}
                      >
                        {academicYears.map(y => (
                          <option key={y.id} value={y.id}>{y.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '0.75rem' }}>Class / Program</label>
                      <select 
                        value={newAssignment.course_id} 
                        onChange={e => setNewAssignment({...newAssignment, course_id: e.target.value, section_id: '', subject_id: ''})}
                      >
                        {programs.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '0.75rem' }}>Section</label>
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

                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '0.75rem' }}>Subject</label>
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

                    <button 
                      type="button" 
                      onClick={handleAddAssignment} 
                      className="btn btn-primary btn-sm"
                      style={{ height: '38px', padding: '0 1rem' }}
                    >
                      Assign
                    </button>
                  </div>

                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-main)' }}>Current Assignments</h4>
                  <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
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
                              <button 
                                type="button" 
                                onClick={() => handleRemoveAssignment(a.id)} 
                                className="btn btn-sm btn-outline-danger"
                                style={{ color: 'var(--danger)', borderColor: 'var(--danger)', padding: '0.15rem 0.4rem', fontSize: '0.75rem' }}
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))}
                        {editAssignments.length === 0 && (
                          <tr>
                            <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1rem' }}>No assignments mapped.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 4: Account Status */}
              {editTab === 'account' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="form-group">
                    <label>Account Status</label>
                    <select value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value})}>
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="ON_LEAVE">ON LEAVE</option>
                      <option value="RESIGNED">RESIGNED</option>
                      <option value="RETIRED">RETIRED</option>
                    </select>
                  </div>
                  <div style={{ padding: '1rem', backgroundColor: '#f1f5f9', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    <strong>Administrative Note:</strong> Account credential resets and login profile adjustments must be performed through the general Users Directory access control configurations.
                  </div>
                </div>
              )}

              {/* Modal Actions */}
              <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '2rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
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
