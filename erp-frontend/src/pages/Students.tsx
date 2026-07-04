import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { api } from '../services/api';
import { 
  Plus, Search, Eye, Edit2, ChevronLeft, ChevronRight, 
  Check, Calendar, User, Phone, Mail, GraduationCap, Grid, List, ArrowLeft 
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

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

  const setSearch = (val: string | ((prev: string) => string)) => {
    const value = typeof val === 'function' ? val(search) : val;
    updateSearchParam('search', value);
  };
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
  const setPage = (val: number | ((prev: number) => number)) => {
    const value = typeof val === 'function' ? val(page) : val;
    updateSearchParam('page', value.toString());
  };
  const [totalStudents, setTotalStudents] = useState(0);
  const limit = 12; // 12 cards per page (ideal for 3/4 column grid)

  // Layout View State
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Selection state for Bulk Actions
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [showBulkSectionModal, setShowBulkSectionModal] = useState(false);
  const [bulkSectionId, setBulkSectionId] = useState('');

  // Toast notifications
  const showToast = (message: string, type: 'success'|'error' = 'success') => {
    if (type === 'success') toast.success(message);
    else toast.error(message);
  };

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Institution & Terminology States
  const { user } = useAuth();
  const [institutionType, setInstitutionType] = useState<string>('college');
  const [editTab, setEditTab] = useState<'personal' | 'academic' | 'guardian' | 'health'>('personal');

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
    academic_year_id: '',
    course_id: '',
    section_id: '',
    guardian_name: '',
    guardian_relationship: 'Father',
    guardian_phone: '',
    guardian_email: '',
    blood_group: '',
    emergency_contact: '',
    medical_conditions: '',
    allergies: ''
  });

  // Edit form state
  const [editForm, setEditForm] = useState<any>(null);

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
          api.get('/academic-years'),
          api.get('/programs'),
          api.get('/sections')
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
          const inst = await api.get(`/institutions/${user.institution_id}`);
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

  // Fetch Students (Triggered by pagination, search or dropdown changes)
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

      const data = await api.get(`/students?${queryParams.toString()}`);
      setStudents(data.students || []);
      setTotalStudents(data.total || 0);
      setSelectedStudentIds([]); // Clear selection when list updates
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
    }, 300); // 300ms debounce for search query typing

    return () => clearTimeout(delayDebounceFn);
  }, [search]);

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

  const handleBulkAction = async (action: 'assign_section' | 'promote_semester' | 'deactivate', payload?: any) => {
    if (selectedStudentIds.length === 0) return;
    if (action === 'deactivate' && !confirm(`Are you sure you want to deactivate ${selectedStudentIds.length} students?`)) return;
    if (action === 'promote_semester' && !confirm(`Are you sure you want to promote ${selectedStudentIds.length} students?`)) return;

    try {
      setLoading(true);
      await api.post('/students/bulk-action', {
        student_ids: selectedStudentIds,
        action,
        payload
      });
      setSelectedStudentIds([]);
      setShowBulkSectionModal(false);
      fetchStudents();
    } catch (err: any) {
      console.error(err);
      showToast(`Bulk action failed: ${err.message}`, 'error');
      setLoading(false);
    }
  };

  const handleBulkExport = () => {
    if (selectedStudentIds.length === 0) return;
    const selectedStudents = students.filter(s => selectedStudentIds.includes(s.id));
    
    // CSV headers matching the mockup
    let csvContent = `Admission Number,Roll Number,First Name,Last Name,Email,Phone,${getProgramLabel()},Section,Status,Attendance Rate,Fee Due\n`;
    
    selectedStudents.forEach(s => {
      csvContent += `"${s.admission_number || ''}","${s.roll_number || ''}","${s.first_name || ''}","${s.last_name || ''}","${s.email || ''}","${s.phone || ''}","${s.program_name || ''}","${s.section_name || ''}","${s.status || ''}","${s.attendance_percentage || 100}%","${s.fee_due || 0}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `students_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Stepper handlers
  const handleNextStep = () => {
    if (step === 1) {
      if (!addForm.first_name || !addForm.last_name || !addForm.admission_number) {
        showToast('Please fill in all required fields (First Name, Last Name, Admission Number)', 'error'); return;
      }
      
      const nameRegex = /^[a-zA-Z\s.]+$/;
      const firstName = addForm.first_name.trim();
      const middleName = addForm.middle_name ? addForm.middle_name.trim() : '';
      const lastName = addForm.last_name.trim();
      const admissionNumber = addForm.admission_number.trim();
      const email = addForm.email.trim();
      const phone = addForm.phone.trim();

      if (firstName.length < 2 || !nameRegex.test(firstName)) {
        showToast('First Name must be at least 2 characters and contain only letters.', 'error'); return;
      }
      if (middleName && !nameRegex.test(middleName)) {
        showToast('Middle Name must contain only letters.', 'error'); return;
      }
      if (lastName.length < 1 || !nameRegex.test(lastName)) {
        showToast('Last Name must be at least 1 character and contain only letters.', 'error'); return;
      }
      if (admissionNumber.length < 3) {
        showToast('Admission Number must be at least 3 characters.', 'error'); return;
      }
      const admRegex = /^[a-zA-Z0-9_\-\/]+$/;
      if (!admRegex.test(admissionNumber)) {
        showToast('Admission Number must contain only alphanumeric characters, dashes, underscores, or slashes.', 'error'); return;
      }
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showToast('Please enter a valid email address.', 'error'); return;
      }
      if (phone && !/^[0-9+\s-]{8,15}$/.test(phone)) {
        showToast('Please enter a valid phone number (8-15 digits).', 'error'); return;
      }
    }
    if (step === 2) {
      if (!addForm.academic_year_id || !addForm.course_id || !addForm.section_id) {
        showToast(`Please select the Academic Year, ${getProgramLabel()}, and Section`, 'error'); return;
      }
    }
    if (step === 3) {
      const guardianName = addForm.guardian_name.trim();
      const guardianPhone = addForm.guardian_phone.trim();
      const guardianEmail = addForm.guardian_email.trim();
      const nameRegex = /^[a-zA-Z\s.]+$/;

      if (guardianName && !nameRegex.test(guardianName)) {
        showToast('Guardian Name must contain only letters.', 'error'); return;
      }
      if (guardianEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guardianEmail)) {
        showToast('Please enter a valid guardian email address.', 'error'); return;
      }
      if (guardianPhone && !/^[0-9+\s-]{8,15}$/.test(guardianPhone)) {
        showToast('Please enter a valid guardian phone number (8-15 digits).', 'error'); return;
      }
    }
    setStep(prev => prev + 1);
  };

  const handlePrevStep = () => {
    setStep(prev => prev - 1);
  };

  // Submit Add Student (includes student + enrollment + guardian)
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/students', addForm);
      showToast(`${addForm.first_name} ${addForm.last_name} added successfully!`);
      setShowAddModal(false);
      resetAddForm();
      fetchStudents();
    } catch (err) {
      console.error(err);
      showToast('Error creating student record.', 'error');
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
      academic_year_id: '',
      course_id: '',
      section_id: '',
      guardian_name: '',
      guardian_relationship: 'Father',
      guardian_phone: '',
      guardian_email: '',
      blood_group: '',
      emergency_contact: '',
      medical_conditions: '',
      allergies: ''
    });
  };

  // Edit functions
  const handleOpenEditModal = (student: any) => {
    setEditForm({
      id: student.id,
      first_name: student.first_name || '',
      middle_name: student.middle_name || '',
      last_name: student.last_name || '',
      admission_number: student.admission_number || '',
      roll_number: student.roll_number || '',
      email: student.email || '',
      phone: student.phone || '',
      gender: student.gender || 'Male',
      date_of_birth: student.date_of_birth || '',
      status: student.status || 'ACTIVE',
      // Academic Details
      academic_year_id: student.academic_year_id || '',
      course_id: student.course_id || '',
      section_id: student.section_id || '',
      semester: student.semester || 1,
      // Guardian Details
      guardian_name: student.guardian_name || '',
      guardian_relationship: student.guardian_relationship || 'Father',
      guardian_phone: student.guardian_phone || '',
      guardian_email: student.guardian_email || '',
      // Health Information
      blood_group: student.blood_group || '',
      emergency_contact: student.emergency_contact || '',
      medical_conditions: student.medical_conditions || '',
      allergies: student.allergies || ''
    });
    setEditTab('personal');
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validations
    const nameRegex = /^[a-zA-Z\s.]+$/;
    const firstName = editForm.first_name?.trim() || '';
    const middleName = editForm.middle_name ? editForm.middle_name.trim() : '';
    const lastName = editForm.last_name?.trim() || '';
    const admissionNumber = editForm.admission_number?.trim() || '';
    const email = editForm.email?.trim() || '';
    const phone = editForm.phone?.trim() || '';
    const guardianName = editForm.guardian_name?.trim() || '';
    const guardianEmail = editForm.guardian_email?.trim() || '';
    const guardianPhone = editForm.guardian_phone?.trim() || '';

    // Validate personal info
    if (firstName.length < 2 || !nameRegex.test(firstName)) {
      setEditTab('personal');
      alert('First Name must be at least 2 characters and contain only letters.');
      return;
    }
    if (middleName && !nameRegex.test(middleName)) {
      setEditTab('personal');
      alert('Middle Name must contain only letters.');
      return;
    }
    if (lastName.length < 1 || !nameRegex.test(lastName)) {
      setEditTab('personal');
      alert('Last Name must be at least 1 character and contain only letters.');
      return;
    }
    if (admissionNumber.length < 3) {
      setEditTab('personal');
      alert('Admission Number must be at least 3 characters.');
      return;
    }
    const admRegex = /^[a-zA-Z0-9_\-\/]+$/;
    if (!admRegex.test(admissionNumber)) {
      setEditTab('personal');
      alert('Admission Number must contain only alphanumeric characters, dashes, underscores, or slashes.');
      return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEditTab('personal');
      alert('Please enter a valid email address.');
      return;
    }
    if (phone && !/^[0-9+\s-]{8,15}$/.test(phone)) {
      setEditTab('personal');
      alert('Please enter a valid phone number (8-15 digits).');
      return;
    }

    // Validate guardian info
    if (guardianName && !nameRegex.test(guardianName)) {
      setEditTab('guardian');
      alert('Guardian Name must contain only letters.');
      return;
    }
    if (guardianEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guardianEmail)) {
      setEditTab('guardian');
      alert('Please enter a valid guardian email address.');
      return;
    }
    if (guardianPhone && !/^[0-9+\s-]{8,15}$/.test(guardianPhone)) {
      setEditTab('guardian');
      alert('Please enter a valid guardian phone number (8-15 digits).');
      return;
    }

    try {
      await api.put(`/students/${editForm.id}`, {
        ...editForm,
        first_name: firstName,
        middle_name: middleName || null,
        last_name: lastName,
        admission_number: admissionNumber,
        email: email || null,
        phone: phone || null,
        guardian_name: guardianName || null,
        guardian_email: guardianEmail || null,
        guardian_phone: guardianPhone || null
      });
      setShowEditModal(false);
      fetchStudents();
    } catch (err) {
      console.error(err);
      alert('Error updating student.');
    }
  };

  const totalPages = Math.ceil(totalStudents / limit) || 1;

  return (
    <Layout>
      {showAddModal ? (
        <>
          <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            <button className="btn btn-secondary" style={{ padding: '0.5rem' }} onClick={() => { setShowAddModal(false); resetAddForm(); }}>
              <ArrowLeft size={18} />
            </button>
            <div>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)' }}>Student Admission Walkthrough</h2>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Follow the steps to register and enroll a new student profile.</p>
            </div>
          </div>

          <div className="card" style={{ maxWidth: '720px', margin: '0 auto', padding: '2rem' }}>
            {/* Stepper Progress bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
              {[
                { s: 1, label: 'Personal' },
                { s: 2, label: 'Academic' },
                { s: 3, label: 'Guardian' },
                { s: 4, label: 'Review' }
              ].map(st => (
                <div key={st.s} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: step === st.s ? 'var(--primary)' : step > st.s ? '#10b981' : '#64748b', fontWeight: step === st.s ? 700 : 500 }}>
                  <div style={{ width: '26px', height: '26px', borderRadius: '50%', backgroundColor: step === st.s ? '#e0e7ff' : step > st.s ? '#d1fae5' : '#f1f5f9', color: step === st.s ? 'var(--primary)' : step > st.s ? '#065f46' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold' }}>
                    {step > st.s ? <Check size={14} /> : st.s}
                  </div>
                  <span style={{ fontSize: '0.8rem' }} className="stepper-label">{st.label}</span>
                </div>
              ))}
            </div>

            <form onSubmit={handleAddSubmit}>
              {/* STEP 1: Personal Info */}
              {step === 1 && (
                <div>
                  <h4 style={{ marginBottom: '1rem', fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)' }}>Step 1: Personal Information</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label>First Name *</label>
                      <input required type="text" value={addForm.first_name} onChange={e => setAddForm({...addForm, first_name: e.target.value})} placeholder="e.g. Alice" />
                    </div>
                    <div className="form-group">
                      <label>Middle Name (Optional)</label>
                      <input type="text" value={addForm.middle_name} onChange={e => setAddForm({...addForm, middle_name: e.target.value})} placeholder="e.g. Marie" />
                    </div>
                    <div className="form-group">
                      <label>Last Name *</label>
                      <input required type="text" value={addForm.last_name} onChange={e => setAddForm({...addForm, last_name: e.target.value})} placeholder="e.g. Wonder" />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label>Admission Number *</label>
                      <input required type="text" value={addForm.admission_number} onChange={e => setAddForm({...addForm, admission_number: e.target.value})} placeholder="e.g. ADM-2001" />
                    </div>
                    <div className="form-group">
                      <label>Roll Number (Optional)</label>
                      <input type="text" value={addForm.roll_number} onChange={e => setAddForm({...addForm, roll_number: e.target.value})} placeholder="e.g. CSE-A-12" />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Email Address</label>
                    <input type="email" value={addForm.email} onChange={e => setAddForm({...addForm, email: e.target.value})} placeholder="alice@example.com" />
                  </div>
                  <div className="form-group">
                    <label>Phone Number</label>
                    <input type="text" value={addForm.phone} onChange={e => setAddForm({...addForm, phone: e.target.value})} placeholder="e.g. +91 99999 88888" />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label>Gender</label>
                      <select value={addForm.gender} onChange={e => setAddForm({...addForm, gender: e.target.value})}>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Date of Birth</label>
                      <input type="date" value={addForm.date_of_birth} onChange={e => setAddForm({...addForm, date_of_birth: e.target.value})} />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: Academic Info */}
              {step === 2 && (
                <div>
                  <h4 style={{ marginBottom: '1rem', fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)' }}>Step 2: Academic Assignment</h4>
                  
                  <div className="form-group">
                    <label>Academic Year *</label>
                    <select required value={addForm.academic_year_id} onChange={e => setAddForm({...addForm, academic_year_id: e.target.value})}>
                      <option value="">-- Select Academic Year --</option>
                      {academicYears.map(y => (
                        <option key={y.id} value={y.id}>{y.name} {y.is_current ? '(Current)' : ''}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>{getProgramLabel()} *</label>
                    <select required value={addForm.course_id} onChange={e => setAddForm({...addForm, course_id: e.target.value})}>
                      <option value="">-- Select {getProgramLabel()} --</option>
                      {programs.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Section / Class *</label>
                    <select required value={addForm.section_id} onChange={e => setAddForm({...addForm, section_id: e.target.value})}>
                      <option value="">-- Select Section --</option>
                      {sections
                        .filter(s => !addForm.course_id || s.course_id === addForm.course_id)
                        .map(s => (
                          <option key={s.id} value={s.id}>{s.name} (Year {s.year_number})</option>
                        ))}
                    </select>
                  </div>
                </div>
              )}

              {/* STEP 3: Guardian Info */}
              {step === 3 && (
                <div>
                  <h4 style={{ marginBottom: '1rem', fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)' }}>Step 3: Guardian Details</h4>
                  
                  <div className="form-group">
                    <label>Guardian Name</label>
                    <input type="text" value={addForm.guardian_name} onChange={e => setAddForm({...addForm, guardian_name: e.target.value})} placeholder="Full name of Father/Mother/Guardian" />
                  </div>

                  <div className="form-group">
                    <label>Relationship</label>
                    <select value={addForm.guardian_relationship} onChange={e => setAddForm({...addForm, guardian_relationship: e.target.value})}>
                      <option value="Father">Father</option>
                      <option value="Mother">Mother</option>
                      <option value="Guardian">Guardian</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Guardian Phone</label>
                    <input type="text" value={addForm.guardian_phone} onChange={e => setAddForm({...addForm, guardian_phone: e.target.value})} placeholder="Phone number" />
                  </div>

                  <div className="form-group">
                    <label>Guardian Email</label>
                    <input type="email" value={addForm.guardian_email} onChange={e => setAddForm({...addForm, guardian_email: e.target.value})} placeholder="guardian@example.com" />
                  </div>
                </div>
              )}

              {/* STEP 4: Review Details */}
              {step === 4 && (
                <div>
                  <h4 style={{ marginBottom: '1rem', fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)' }}>Step 4: Review and Verify</h4>
                  
                  <div style={{ backgroundColor: '#f8fafc', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.875rem' }}>
                    <div>
                      <strong style={{ color: 'var(--primary)', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Personal</strong>
                      <div>Name: <strong>{addForm.first_name} {addForm.middle_name ? addForm.middle_name + ' ' : ''}{addForm.last_name}</strong></div>
                      <div>Admission No: <strong>{addForm.admission_number}</strong> | Roll No: <strong>{addForm.roll_number || '-'}</strong></div>
                      <div>Gender: {addForm.gender} | DOB: {addForm.date_of_birth || '-'}</div>
                      <div>Phone: {addForm.phone || '-'} | Email: {addForm.email || '-'}</div>
                    </div>

                    <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem' }}>
                      <strong style={{ color: 'var(--primary)', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Academic Enrollment</strong>
                      <div>Year: {academicYears.find(y => y.id === addForm.academic_year_id)?.name || '-'}</div>
                      <div>{getProgramLabel()}: {programs.find(p => p.id === addForm.course_id)?.name || '-'}</div>
                      <div>Section: {sections.find(s => s.id === addForm.section_id)?.name || '-'}</div>
                    </div>

                    <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem' }}>
                      <strong style={{ color: 'var(--primary)', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Guardian Contacts</strong>
                      <div>Name: {addForm.guardian_name || '-'} ({addForm.guardian_relationship})</div>
                      <div>Phone: {addForm.guardian_phone || '-'} | Email: {addForm.guardian_email || '-'}</div>
                    </div>
                  </div>

                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '1rem', textAlign: 'center' }}>
                    Confirming will automatically register the student profile, establish the class enrollment record, and instantiate ledger entries matching active fee structures.
                  </p>
                </div>
              )}

              {/* Stepper Buttons */}
              <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '2rem', borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
                <button type="button" onClick={() => { setShowAddModal(false); resetAddForm(); }} className="btn btn-secondary">Cancel</button>
                {step > 1 && (
                  <button type="button" onClick={handlePrevStep} className="btn btn-outline">Back</button>
                )}
                {step < 4 ? (
                  <button type="button" onClick={handleNextStep} className="btn btn-primary">Next</button>
                ) : (
                  <button type="submit" className="btn btn-primary">Admit Student</button>
                )}
              </div>
            </form>
          </div>
        </>
      ) : (
        <>
          <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)' }}>Student Hub</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Manage student admissions, enrollments, profiles, and fee ledgers.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {/* View Toggles */}
          <div style={{ display: 'flex', backgroundColor: '#e2e8f0', borderRadius: 'var(--radius-sm)', padding: '0.2rem' }}>
            <button 
              onClick={() => setViewMode('grid')}
              style={{ border: 'none', background: viewMode === 'grid' ? '#ffffff' : 'transparent', color: viewMode === 'grid' ? 'var(--primary)' : '#64748b', cursor: 'pointer', padding: '0.4rem 0.6rem', borderRadius: '4px', display: 'flex', alignItems: 'center' }}
            >
              <Grid size={16} />
            </button>
            <button 
              onClick={() => setViewMode('table')}
              style={{ border: 'none', background: viewMode === 'table' ? '#ffffff' : 'transparent', color: viewMode === 'table' ? 'var(--primary)' : '#64748b', cursor: 'pointer', padding: '0.4rem 0.6rem', borderRadius: '4px', display: 'flex', alignItems: 'center' }}
            >
              <List size={16} />
            </button>
          </div>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <Plus size={18} /> Admit Student
          </button>
        </div>
      </div>

      {/* Advanced Filters Section */}
      <div className="card filters" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', padding: '1.5rem', marginBottom: '1.5rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
        {/* Search */}
        <div className="search-container" style={{ flex: '1 1 250px', position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', color: '#94a3b8' }} />
          <input 
            type="text" 
            placeholder="Search by name, adm no, or roll no..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '2.5rem', width: '100%' }}
          />
        </div>

        {/* Program Filter */}
        <div style={{ flex: '1 1 150px' }}>
          <select value={selectedProgram} onChange={e => { setSelectedProgram(e.target.value); setPage(1); }}>
            <option value="">All {getProgramsLabel()}</option>
            {programs.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Section Filter */}
        <div style={{ flex: '1 1 120px' }}>
          <select value={selectedSection} onChange={e => { setSelectedSection(e.target.value); setPage(1); }}>
            <option value="">All Sections</option>
            {sections.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        {/* Academic Year Filter */}
        <div style={{ flex: '1 1 150px' }}>
          <select value={selectedAcademicYear} onChange={e => { setSelectedAcademicYear(e.target.value); setPage(1); }}>
            <option value="">All Academic Years</option>
            {academicYears.map(y => (
              <option key={y.id} value={y.id}>{y.name}</option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div style={{ flex: '1 1 120px' }}>
          <select value={selectedStatus} onChange={e => { setSelectedStatus(e.target.value); setPage(1); }}>
            <option value="">All Statuses</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="APPLIED">APPLIED</option>
            <option value="ADMITTED">ADMITTED</option>
            <option value="GRADUATED">GRADUATED</option>
            <option value="TRANSFERRED">TRANSFERRED</option>
            <option value="DROPPED">DROPPED</option>
            <option value="ALUMNI">ALUMNI</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Loading students list...</p>
        </div>
      ) : (
        <>
          {viewMode === 'grid' ? (
            /* Card Grid View (Premium Dashboard Layout with Checkboxes) */
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
              {students.map(s => (
                <div 
                  className="card" 
                  key={s.id} 
                  style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '1rem', 
                    padding: '1.5rem', 
                    border: selectedStudentIds.includes(s.id) ? '1px solid var(--primary)' : '1px solid var(--border)', 
                    borderRadius: 'var(--radius-md)', 
                    boxShadow: selectedStudentIds.includes(s.id) ? '0 0 0 2px rgba(79, 70, 229, 0.15), var(--shadow-sm)' : 'var(--shadow-sm)',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    backgroundColor: 'var(--bg-card)',
                    position: 'relative'
                  }}
                  onMouseEnter={e => {
                    if (!selectedStudentIds.includes(s.id)) {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
                      e.currentTarget.style.borderColor = '#cbd5e1';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!selectedStudentIds.includes(s.id)) {
                      e.currentTarget.style.transform = 'none';
                      e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                      e.currentTarget.style.borderColor = 'var(--border)';
                    }
                  }}
                >
                  {/* Select Checkbox */}
                  <div style={{ position: 'absolute', top: '1rem', left: '1rem', zIndex: 10 }}>
                    <input 
                      type="checkbox" 
                      checked={selectedStudentIds.includes(s.id)}
                      onChange={e => handleSelectOne(s.id, e.target.checked)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                  </div>

                  {/* Top block */}
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', paddingLeft: '1.75rem' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#e0e7ff', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.15rem' }}>
                      👤
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h4 style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>
                        {s.first_name} {s.middle_name ? s.middle_name + ' ' : ''}{s.last_name}
                      </h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.15rem 0 0' }}>
                        Adm No: <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{s.admission_number}</span>
                        {s.roll_number && <> • Roll: <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{s.roll_number}</span></>}
                      </p>
                    </div>
                    <span className={`badge badge-${s.status === 'ACTIVE' ? 'success' : s.status === 'GRADUATED' ? 'success' : 'secondary'}`} style={{ alignSelf: 'flex-start' }}>
                      {s.status}
                    </span>
                  </div>

                  {/* Program and Section label */}
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.825rem', color: '#475569', backgroundColor: '#f8fafc', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid #f1f5f9' }}>
                    <GraduationCap size={16} style={{ color: 'var(--primary)' }} />
                    <span style={{ fontWeight: 700 }}>{s.program_name || 'Unassigned'}</span>
                    {s.section_name && <>
                      <span style={{ color: '#cbd5e1' }}>•</span>
                      <span>{s.section_name}</span>
                    </>}
                  </div>

                  {/* Quick summary stats */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid #f1f5f9', backgroundColor: '#fafbfb' }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.025em', fontWeight: 600 }}>Attendance</span>
                      <span style={{ fontWeight: 800, fontSize: '0.92rem', color: s.attendance_percentage >= 75 ? '#10b981' : s.attendance_percentage === 100 && s.total_sessions === 0 ? 'var(--text-muted)' : '#f59e0b' }}>
                        {s.attendance_percentage}%
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid #f1f5f9', backgroundColor: '#fafbfb' }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.025em', fontWeight: 600 }}>Fee Due</span>
                      <span style={{ fontWeight: 800, fontSize: '0.92rem', color: s.fee_due > 0 ? '#ef4444' : '#10b981' }}>
                        ₹{(s.fee_due || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  {/* Dynamic Action Buttons */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.25rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem', marginTop: 'auto' }}>
                    <Link to={`/students/${s.id}?tab=overview`} className="btn btn-sm btn-outline" style={{ padding: '0.4rem 0.2rem', fontSize: '0.7rem' }} title="View Profile">View</Link>
                    <button onClick={() => handleOpenEditModal(s)} className="btn btn-sm btn-outline" style={{ padding: '0.4rem 0.2rem', fontSize: '0.7rem' }} title="Edit Record">Edit</button>
                    <Link to={`/students/${s.id}?tab=attendance`} className="btn btn-sm btn-secondary" style={{ padding: '0.4rem 0.2rem', fontSize: '0.68rem', backgroundColor: '#f0fdf4', color: '#166534' }} title="Attendance Details">Att.</Link>
                    <Link to={`/students/${s.id}?tab=results`} className="btn btn-sm btn-secondary" style={{ padding: '0.4rem 0.2rem', fontSize: '0.68rem', backgroundColor: '#eff6ff', color: '#1e40af' }} title="Exam Results">Results</Link>
                    <Link to={`/students/${s.id}?tab=fees`} className="btn btn-sm btn-secondary" style={{ padding: '0.4rem 0.2rem', fontSize: '0.68rem', backgroundColor: '#fffbeb', color: '#854d0e' }} title="Fee Ledger">Fees</Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Traditional Table View with Checkbox selection */
            <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', marginBottom: '2rem' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>
                      <input 
                        type="checkbox" 
                        checked={selectedStudentIds.length === students.length && students.length > 0} 
                        onChange={handleSelectAll} 
                      />
                    </th>
                    <th>Adm. No</th>
                    <th>Roll No</th>
                    <th>Name</th>
                    <th>{getProgramLabel()} & Section</th>
                    <th>Attendance</th>
                    <th>Fee Due</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map(s => (
                    <tr key={s.id} style={{ backgroundColor: selectedStudentIds.includes(s.id) ? '#f8fafc' : 'transparent' }}>
                      <td>
                        <input 
                          type="checkbox" 
                          checked={selectedStudentIds.includes(s.id)} 
                          onChange={e => handleSelectOne(s.id, e.target.checked)} 
                        />
                      </td>
                      <td><strong>{s.admission_number}</strong></td>
                      <td>{s.roll_number || '-'}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                          <span>👤</span>
                          <span>{s.first_name} {s.middle_name ? s.middle_name + ' ' : ''}{s.last_name}</span>
                        </div>
                      </td>
                      <td>{s.program_name ? `${s.program_name} • ${s.section_name || 'A'}` : 'Unassigned'}</td>
                      <td>
                        <span style={{ fontWeight: 700, color: s.attendance_percentage >= 75 ? '#10b981' : '#f59e0b' }}>
                          {s.attendance_percentage}%
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, color: s.fee_due > 0 ? '#ef4444' : '#10b981' }}>
                          ₹{(s.fee_due || 0).toLocaleString('en-IN')}
                        </span>
                      </td>
                      <td>
                        <span className={`badge badge-${s.status === 'ACTIVE' ? 'success' : 'secondary'}`}>
                          {s.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.3rem' }}>
                          <Link to={`/students/${s.id}`} className="btn btn-sm btn-outline" style={{ padding: '0.3rem 0.5rem' }}>View</Link>
                          <button onClick={() => handleOpenEditModal(s)} className="btn btn-sm btn-outline" style={{ padding: '0.3rem 0.5rem' }}><Edit2 size={12} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Empty state */}
          {students.length === 0 && (
            <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', marginBottom: '2rem' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', marginBottom: '0.5rem' }}>No student records found.</p>
              <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Try clearing filters or refining your search parameters.</p>
            </div>
          )}

          {/* Dynamic Pagination Controls */}
          {totalStudents > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '1.5rem', paddingBottom: '1.5rem' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                Showing <strong style={{ color: 'var(--text-main)' }}>{((page - 1) * limit) + 1}</strong> to <strong style={{ color: 'var(--text-main)' }}>{Math.min(page * limit, totalStudents)}</strong> of <strong style={{ color: 'var(--text-main)' }}>{totalStudents}</strong> students
              </span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  className="btn btn-outline btn-sm" 
                  disabled={page === 1}
                  onClick={() => setPage(p => Math.max(p - 1, 1))}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', opacity: page === 1 ? 0.5 : 1, cursor: page === 1 ? 'not-allowed' : 'pointer' }}
                >
                  <ChevronLeft size={16} /> Prev
                </button>
                <div style={{ display: 'flex', alignItems: 'center', padding: '0 0.75rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  Page {page} of {totalPages}
                </div>
                <button 
                  className="btn btn-outline btn-sm" 
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', opacity: page >= totalPages ? 0.5 : 1, cursor: page >= totalPages ? 'not-allowed' : 'pointer' }}
                >
                  Next <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Floating Bulk Actions Bar */}
      {selectedStudentIds.length > 0 && (
        <div style={{
          position: 'fixed',
          bottom: '2rem',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#0f172a',
          color: '#ffffff',
          padding: '0.75rem 1.5rem',
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '1.5rem',
          zIndex: 999,
          animation: 'slideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>
            {selectedStudentIds.length} Selected
          </span>
          <div style={{ width: '1px', height: '1.25rem', backgroundColor: '#334155' }} />
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-sm btn-secondary" style={{ backgroundColor: '#1e293b', color: '#f8fafc', border: '1px solid #334155' }} onClick={() => setShowBulkSectionModal(true)}>
              Assign Section
            </button>
            <button className="btn btn-sm btn-secondary" style={{ backgroundColor: '#1e293b', color: '#f8fafc', border: '1px solid #334155' }} onClick={() => handleBulkAction('promote_semester')}>
              {institutionType === 'school' ? 'Promote Class' : 'Promote Semester'}
            </button>
            <button className="btn btn-sm btn-secondary" style={{ backgroundColor: '#1e293b', color: '#f8fafc', border: '1px solid #334155' }} onClick={handleBulkExport}>
              Export CSV
            </button>
            <button className="btn btn-sm btn-danger" style={{ padding: '0.45rem 0.875rem' }} onClick={() => handleBulkAction('deactivate')}>
              Deactivate
            </button>
          </div>
        </div>
      )}

      {/* Bulk Section Modal Overlay */}
      {showBulkSectionModal && (
        <div className="modal" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.45)', zIndex: 1000, padding: '1rem' }}>
          <div className="modal-content" style={{ backgroundColor: '#ffffff', borderRadius: 'var(--radius-lg)', maxWidth: '400px', width: '100%', padding: '2rem', boxShadow: 'var(--shadow-lg)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.25rem', color: 'var(--text-main)' }}>Bulk Section Assignment</h3>
            <div className="form-group">
              <label>Select Target Section</label>
              <select value={bulkSectionId} onChange={e => setBulkSectionId(e.target.value)}>
                <option value="">-- Choose Section --</option>
                {sections.map(s => (
                  <option key={s.id} value={s.id}>{s.name} (Year {s.year_number})</option>
                ))}
              </select>
            </div>
            <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '2rem' }}>
              <button type="button" onClick={() => setShowBulkSectionModal(false)} className="btn btn-secondary">Cancel</button>
              <button type="button" className="btn btn-primary" onClick={() => handleBulkAction('assign_section', { section_id: bulkSectionId })} disabled={!bulkSectionId}>
                Assign Section
              </button>
            </div>
          </div>
        </div>
      )}

        </>
      )}

      {/* Edit Student Modal */}
      {showEditModal && editForm && (
        <div className="modal" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.45)', zIndex: 1000, padding: '1rem', overflowY: 'auto' }}>
          <div className="modal-content" style={{ backgroundColor: '#ffffff', borderRadius: 'var(--radius-lg)', maxWidth: '640px', width: '100%', padding: '2rem', boxShadow: 'var(--shadow-lg)', animation: 'slideUp 0.3s ease-out' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.5rem', color: 'var(--text-main)' }}>Edit Student Record</h3>
            
            {/* Edit Modal Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '1.5rem', gap: '1rem', overflowX: 'auto', scrollbarWidth: 'none' }}>
              {(['personal', 'academic', 'guardian', 'health'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setEditTab(t)}
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
                  {t === 'personal' ? 'Personal' : t === 'academic' ? 'Academic' : t === 'guardian' ? 'Guardian' : 'Health Card'}
                </button>
              ))}
            </div>

            <form onSubmit={handleEditSubmit}>
              {/* TAB 1: Personal Info */}
              {editTab === 'personal' && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label>First Name *</label>
                      <input required type="text" value={editForm.first_name} onChange={e => setEditForm({...editForm, first_name: e.target.value})} />
                    </div>
                    <div className="form-group">
                      <label>Middle Name (Optional)</label>
                      <input type="text" value={editForm.middle_name || ''} onChange={e => setEditForm({...editForm, middle_name: e.target.value})} />
                    </div>
                    <div className="form-group">
                      <label>Last Name *</label>
                      <input required type="text" value={editForm.last_name} onChange={e => setEditForm({...editForm, last_name: e.target.value})} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label>Admission No *</label>
                      <input required type="text" value={editForm.admission_number} onChange={e => setEditForm({...editForm, admission_number: e.target.value})} />
                    </div>
                    <div className="form-group">
                      <label>Roll No</label>
                      <input type="text" value={editForm.roll_number} onChange={e => setEditForm({...editForm, roll_number: e.target.value})} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input type="email" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Phone</label>
                    <input type="text" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label>Gender</label>
                      <select value={editForm.gender} onChange={e => setEditForm({...editForm, gender: e.target.value})}>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Status</label>
                      <select value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value})}>
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="APPLIED">APPLIED</option>
                        <option value="ADMITTED">ADMITTED</option>
                        <option value="GRADUATED">GRADUATED</option>
                        <option value="TRANSFERRED">TRANSFERRED</option>
                        <option value="DROPPED">DROPPED</option>
                        <option value="ALUMNI">ALUMNI</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Date of Birth</label>
                    <input type="date" value={editForm.date_of_birth} onChange={e => setEditForm({...editForm, date_of_birth: e.target.value})} />
                  </div>
                </div>
              )}

              {/* TAB 2: Academic Details */}
              {editTab === 'academic' && (
                <div>
                  <div className="form-group">
                    <label>Academic Year *</label>
                    <select required value={editForm.academic_year_id} onChange={e => setEditForm({...editForm, academic_year_id: e.target.value})}>
                      <option value="">-- Select Academic Year --</option>
                      {academicYears.map(y => (
                        <option key={y.id} value={y.id}>{y.name} {y.is_current ? '(Current)' : ''}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>{getProgramLabel()} *</label>
                    <select required value={editForm.course_id} onChange={e => setEditForm({...editForm, course_id: e.target.value})}>
                      <option value="">-- Select {getProgramLabel()} --</option>
                      {programs.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Section *</label>
                    <select required value={editForm.section_id} onChange={e => setEditForm({...editForm, section_id: e.target.value})}>
                      <option value="">-- Select Section --</option>
                      {sections
                        .filter(s => !editForm.course_id || s.course_id === editForm.course_id)
                        .map(s => (
                          <option key={s.id} value={s.id}>{s.name} (Year {s.year_number})</option>
                        ))}
                    </select>
                  </div>
                  {institutionType !== 'school' && (
                    <div className="form-group">
                      <label>Semester</label>
                      <input type="number" min="1" max="10" value={editForm.semester} onChange={e => setEditForm({...editForm, semester: parseInt(e.target.value) || 1})} />
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: Guardian Info */}
              {editTab === 'guardian' && (
                <div>
                  <div className="form-group">
                    <label>Guardian Name</label>
                    <input type="text" value={editForm.guardian_name} onChange={e => setEditForm({...editForm, guardian_name: e.target.value})} placeholder="Full name of Father/Mother/Guardian" />
                  </div>
                  <div className="form-group">
                    <label>Relationship</label>
                    <select value={editForm.guardian_relationship} onChange={e => setEditForm({...editForm, guardian_relationship: e.target.value})}>
                      <option value="Father">Father</option>
                      <option value="Mother">Mother</option>
                      <option value="Guardian">Guardian</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Guardian Phone</label>
                    <input type="text" value={editForm.guardian_phone} onChange={e => setEditForm({...editForm, guardian_phone: e.target.value})} placeholder="Phone number" />
                  </div>
                  <div className="form-group">
                    <label>Guardian Email</label>
                    <input type="email" value={editForm.guardian_email} onChange={e => setEditForm({...editForm, guardian_email: e.target.value})} placeholder="guardian@example.com" />
                  </div>
                </div>
              )}

              {/* TAB 4: Health Card */}
              {editTab === 'health' && (
                <div>
                  <div className="form-group">
                    <label>Blood Group</label>
                    <select value={editForm.blood_group} onChange={e => setEditForm({...editForm, blood_group: e.target.value})}>
                      <option value="">-- Choose Blood Group --</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Emergency Contact Phone</label>
                    <input type="text" value={editForm.emergency_contact} onChange={e => setEditForm({...editForm, emergency_contact: e.target.value})} placeholder="e.g. +91 98765 43210 (Father)" />
                  </div>
                  <div className="form-group">
                    <label>Medical Conditions</label>
                    <textarea value={editForm.medical_conditions} onChange={e => setEditForm({...editForm, medical_conditions: e.target.value})} placeholder="e.g. Asthma, none" rows={3} style={{ width: '100%', minHeight: '80px', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)' }} />
                  </div>
                  <div className="form-group">
                    <label>Allergies</label>
                    <textarea value={editForm.allergies} onChange={e => setEditForm({...editForm, allergies: e.target.value})} placeholder="e.g. Peanuts, Penicillin, none" rows={3} style={{ width: '100%', minHeight: '80px', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)' }} />
                  </div>
                </div>
              )}

              <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '2rem', borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
                <button type="button" onClick={() => setShowEditModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Toast notifications managed globally */}
    </Layout>
  );
}
