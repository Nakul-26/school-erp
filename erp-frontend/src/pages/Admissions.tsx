import React, { useEffect, useState } from 'react';
import { PageGuidance } from '../components/PageGuidance';
import Layout from '../components/Layout';
import { api } from '../services/api';
import { 
  Plus, ArrowRight, Eye, UserPlus, CheckCircle, XCircle, ClipboardList,
  Search, Calendar, User, Phone, Mail, FileText, ChevronRight, HelpCircle
} from 'lucide-react';
import SkeletonLoader from '../components/SkeletonLoader';
import EmptyState from '../components/EmptyState';

// ─── Shared Interfaces ────────────────────────────────────────────────────────

interface AcademicYear {
  id: string;
  name: string;
}

interface Program {
  id: string;
  name: string;
}

// ─── Inquiry Interfaces ────────────────────────────────────────────────────────

interface Inquiry {
  id: string;
  student_name: string;
  parent_name: string;
  parent_phone: string;
  parent_email: string | null;
  date_of_birth: string | null;
  applying_for_class: string;
  academic_year_id: string | null;
  academic_year_name: string | null;
  source: string;
  notes: string | null;
  status: 'New' | 'Contacted' | 'Applied' | 'Admitted' | 'Rejected';
  created_at: string;
}

// ─── Application Interfaces ──────────────────────────────────────────────────

interface Application {
  id: string;
  institution_id: string;
  inquiry_id: string | null;
  application_number: string;
  student_first_name: string;
  student_last_name: string;
  date_of_birth: string | null;
  gender: string | null;
  applying_for_course_id: string | null;
  course_name: string | null;
  academic_year_id: string;
  academic_year_name: string;
  parent_name: string;
  parent_phone: string;
  parent_email: string | null;
  previous_school: string | null;
  previous_class: string | null;
  status: 'Submitted' | 'Under Review' | 'Approved' | 'Rejected';
  rejection_reason: string | null;
  approved_by: string | null;
  approved_at: string | null;
  converted_student_id: string | null;
  created_at: string;
}

// ─── Kanban Board Interfaces ──────────────────────────────────────────────────

type BoardStage = 'lead' | 'applied' | 'outcome';

interface BoardCard {
  id: string;
  type: 'inquiry' | 'application';
  title: string;
  subtitle: string; // Parent name
  phone: string;
  email: string;
  classLabel: string;
  classValue: string; // for filtering
  yearId: string;
  status: string;
  createdDate: string;
  rawItem: any;
}

export default function Admissions() {
  // Shared state
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);

  // Raw states
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);

  // Search and Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState('All');
  const [yearFilter, setYearFilter] = useState('All');

  // Drag over columns tracking (for styling)
  const [dragOverStage, setDragOverStage] = useState<BoardStage | null>(null);

  // Inquiry – Add modal
  const [inqShowAdd, setInqShowAdd] = useState(false);
  const [inqAddForm, setInqAddForm] = useState({
    student_name: '', parent_name: '', parent_phone: '', parent_email: '',
    date_of_birth: '', applying_for_class: '', source: 'Walk-in', notes: '', academic_year_id: '',
  });
  const [inqAddLoading, setInqAddLoading] = useState(false);

  // Inquiry – Convert modal
  const [convertInquiry, setConvertInquiry] = useState<Inquiry | null>(null);
  const [convertLoading, setConvertLoading] = useState(false);

  // Inquiry – Detail modal
  const [detailInquiry, setDetailInquiry] = useState<Inquiry | null>(null);

  // Application – Add modal
  const [appShowAdd, setAppShowAdd] = useState(false);
  const [appAddForm, setAppAddForm] = useState({
    student_first_name: '', student_last_name: '', date_of_birth: '', gender: '',
    applying_for_course_id: '', academic_year_id: '',
    parent_name: '', parent_phone: '', parent_email: '',
    previous_school: '', previous_class: '',
  });
  const [appAddLoading, setAppAddLoading] = useState(false);

  // Application – Detail modal
  const [detailApp, setDetailApp] = useState<Application | null>(null);

  // Application – Approve modal
  const [approveApp, setApproveApp] = useState<Application | null>(null);
  const [approveLoading, setApproveLoading] = useState(false);

  // Application – Reject modal
  const [rejectApp, setRejectApp] = useState<Application | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectLoading, setRejectLoading] = useState(false);

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchData = async () => {
    try {
      setLoading(true);
      const [inqs, apps, years, progs] = await Promise.all([
        api.get('/admissions/inquiries'),
        api.get('/admissions/applications'),
        api.get('/academic-years'),
        api.get('/programs'),
      ]);
      setInquiries(inqs);
      setApplications(apps);
      setAcademicYears(years);
      setPrograms(progs);

      // Default form fields to current active year if found
      if (years.length > 0) {
        const currentYear = years.find((y: any) => y.is_current) || years[0];
        setInqAddForm(f => ({ ...f, academic_year_id: currentYear.id }));
        setAppAddForm(f => ({ ...f, academic_year_id: currentYear.id }));
      }
    } catch (err) {
      console.error('Error fetching admission data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleInqAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInqAddLoading(true);
    try {
      await api.post('/admissions/inquiries', {
        ...inqAddForm,
        parent_email: inqAddForm.parent_email || undefined,
        date_of_birth: inqAddForm.date_of_birth || undefined,
        academic_year_id: inqAddForm.academic_year_id || undefined,
        notes: inqAddForm.notes || undefined,
      });
      setInqShowAdd(false);
      setInqAddForm({
        student_name: '', parent_name: '', parent_phone: '', parent_email: '',
        date_of_birth: '', applying_for_class: '', source: 'Walk-in', notes: '', academic_year_id: '',
      });
      alert('Admission inquiry added successfully!');
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to create inquiry');
    } finally {
      setInqAddLoading(false);
    }
  };

  const handleConvert = async () => {
    if (!convertInquiry) return;
    setConvertLoading(true);
    try {
      await api.post(`/admissions/inquiries/${convertInquiry.id}/convert`, {
        academic_year_id: convertInquiry.academic_year_id || undefined,
      });
      setConvertInquiry(null);
      alert('Inquiry converted to application successfully!');
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to convert inquiry');
    } finally {
      setConvertLoading(false);
    }
  };

  const handleAppAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAppAddLoading(true);
    try {
      await api.post('/admissions/applications', {
        ...appAddForm,
        date_of_birth: appAddForm.date_of_birth || undefined,
        gender: appAddForm.gender || undefined,
        applying_for_course_id: appAddForm.applying_for_course_id || undefined,
        parent_email: appAddForm.parent_email || undefined,
        previous_school: appAddForm.previous_school || undefined,
        previous_class: appAddForm.previous_class || undefined,
      });
      setAppShowAdd(false);
      setAppAddForm({
        student_first_name: '', student_last_name: '', date_of_birth: '', gender: '',
        applying_for_course_id: '', academic_year_id: '',
        parent_name: '', parent_phone: '', parent_email: '',
        previous_school: '', previous_class: '',
      });
      alert('Admission application created successfully!');
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to create application');
    } finally {
      setAppAddLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!approveApp) return;
    setApproveLoading(true);
    try {
      const result = await api.patch(`/admissions/applications/${approveApp.id}/approve`, {});
      setApproveApp(null);
      alert(`Application approved! Student record created with Admission No: ${result.admissionNumber}`);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to approve application');
    } finally {
      setApproveLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectApp) return;
    setRejectLoading(true);
    try {
      await api.patch(`/admissions/applications/${rejectApp.id}/reject`, { reason: rejectReason });
      setRejectApp(null);
      setRejectReason('');
      alert('Application rejected.');
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to reject application');
    } finally {
      setRejectLoading(false);
    }
  };

  const updateInquiryStatus = async (id: string, status: 'New' | 'Contacted') => {
    try {
      await api.patch(`/admissions/inquiries/${id}`, { status });
      alert(`Inquiry marked as ${status}.`);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to update inquiry status');
    }
  };

  // ── Drag & Drop ─────────────────────────────────────────────────────────────

  const handleDragStart = (e: React.DragEvent, cardId: string, cardType: 'inquiry' | 'application', currentStage: BoardStage) => {
    e.dataTransfer.setData('cardId', cardId);
    e.dataTransfer.setData('cardType', cardType);
    e.dataTransfer.setData('currentStage', currentStage);
  };

  const handleDragOver = (e: React.DragEvent, stage: BoardStage) => {
    e.preventDefault();
    setDragOverStage(stage);
  };

  const handleDragLeave = () => {
    setDragOverStage(null);
  };

  const handleDrop = async (e: React.DragEvent, targetStage: BoardStage) => {
    e.preventDefault();
    setDragOverStage(null);

    const cardId = e.dataTransfer.getData('cardId');
    const cardType = e.dataTransfer.getData('cardType');
    const currentStage = e.dataTransfer.getData('currentStage') as BoardStage;

    if (currentStage === targetStage) return;

    if (targetStage === 'lead') {
      if (cardType === 'inquiry') {
        // Move back to lead (e.g. status New or Contacted)
        updateInquiryStatus(cardId, 'New');
      } else {
        alert('Cannot move a formal application to leads stage.');
      }
    } else if (targetStage === 'applied') {
      if (cardType === 'inquiry') {
        const inq = inquiries.find(i => i.id === cardId);
        if (inq) {
          setConvertInquiry(inq);
        }
      } else {
        alert('Application is already submitted.');
      }
    } else if (targetStage === 'outcome') {
      if (cardType === 'application') {
        const app = applications.find(a => a.id === cardId);
        if (app) {
          setApproveApp(app);
        }
      } else {
        alert('Please convert inquiry to a formal application first to finalize outcomes.');
      }
    }
  };

  // ── Derived Kanban Cards ─────────────────────────────────────────────────────

  // Column 1: Leads & Inquiries
  const leadCards: BoardCard[] = inquiries
    .filter(i => i.status === 'New' || i.status === 'Contacted')
    .map(i => ({
      id: i.id,
      type: 'inquiry',
      title: i.student_name,
      subtitle: i.parent_name,
      phone: i.parent_phone,
      email: i.parent_email || '',
      classLabel: i.applying_for_class,
      classValue: i.applying_for_class,
      yearId: i.academic_year_id || '',
      status: i.status,
      createdDate: i.created_at,
      rawItem: i
    }));

  // Column 2: Applied & In-Review Applications
  const appliedCards: BoardCard[] = applications
    .filter(a => a.status === 'Submitted' || a.status === 'Under Review')
    .map(a => ({
      id: a.id,
      type: 'application',
      title: `${a.student_first_name} ${a.student_last_name}`,
      subtitle: a.parent_name,
      phone: a.parent_phone,
      email: a.parent_email || '',
      classLabel: a.course_name || 'Class',
      classValue: a.applying_for_course_id || '',
      yearId: a.academic_year_id,
      status: a.status,
      createdDate: a.created_at,
      rawItem: a
    }));

  // Column 3: Outcomes (Finalized admissions or rejections)
  const outcomeCards: BoardCard[] = [
    ...applications
      .filter(a => a.status === 'Approved' || a.status === 'Rejected')
      .map(a => ({
        id: a.id,
        type: 'application' as const,
        title: `${a.student_first_name} ${a.student_last_name}`,
        subtitle: a.parent_name,
        phone: a.parent_phone,
        email: a.parent_email || '',
        classLabel: a.course_name || 'Class',
        classValue: a.applying_for_course_id || '',
        yearId: a.academic_year_id,
        status: a.status === 'Approved' ? 'Admitted' : 'Rejected',
        createdDate: a.created_at,
        rawItem: a
      })),
    // Include inquiries marked Admitted/Rejected that did not spawn an application
    ...inquiries
      .filter(i => (i.status === 'Admitted' || i.status === 'Rejected') && !applications.some(a => a.inquiry_id === i.id))
      .map(i => ({
        id: i.id,
        type: 'inquiry' as const,
        title: i.student_name,
        subtitle: i.parent_name,
        phone: i.parent_phone,
        email: i.parent_email || '',
        classLabel: i.applying_for_class,
        classValue: i.applying_for_class,
        yearId: i.academic_year_id || '',
        status: i.status,
        createdDate: i.created_at,
        rawItem: i
      }))
  ];

  // Apply filters
  const applyFilters = (cards: BoardCard[]) => {
    return cards.filter(card => {
      const matchesSearch = 
        card.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        card.subtitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        card.phone.includes(searchTerm) ||
        card.email.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesClass = 
        classFilter === 'All' || 
        card.classValue === classFilter || 
        card.classLabel.toLowerCase().includes(classFilter.toLowerCase());

      const matchesYear = 
        yearFilter === 'All' || 
        card.yearId === yearFilter;

      return matchesSearch && matchesClass && matchesYear;
    });
  };

  const filteredLeads = applyFilters(leadCards);
  const filteredApplied = applyFilters(appliedCards);
  const filteredOutcomes = applyFilters(outcomeCards);

  // Status Style Maps
  const getBadgeStyle = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'new' || s === 'submitted') return { bg: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' };
    if (s === 'contacted' || s === 'under review') return { bg: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' };
    if (s === 'admitted' || s === 'approved') return { bg: 'rgba(16, 185, 129, 0.1)', color: '#10b981' };
    if (s === 'rejected') return { bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' };
    return { bg: '#f3f4f6', color: '#374151' };
  };

  // Unique class options for filtering
  const uniqueClassOptions = Array.from(
    new Set([
      ...programs.map(p => p.name),
      ...inquiries.map(i => i.applying_for_class)
    ])
  ).filter(Boolean);

  return (
    <Layout>
      <PageGuidance
        title="Admissions & Inquiry Workspace"
        description="Track candidate progress from their initial inquiry and campus walk-in to formal application reviews and final student admissions. Drag and drop cards across columns to progress candidate stages."
        steps={[
          'Add walking inquiries or prospects in the Leads column.',
          'Drag inquiries into the Applied column to trigger application conversions.',
          'Review applications, then drag to Outcome to approve/reject and auto-create student records.'
        ]}
      />

      {/* Header */}
      <div className="page-header" style={{ marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2>Admissions & Inquiry Pipeline</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Unified board management for lead generation and candidate enrollment
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            className="btn btn-outline"
            onClick={() => setInqShowAdd(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
          >
            <Plus size={16} /> Add Inquiry
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setAppShowAdd(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
          >
            <Plus size={16} /> New Application
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
          {/* Search bar */}
          <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search candidate name, parent, phone..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 1rem 0.5rem 2.25rem',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                fontSize: '0.875rem'
              }}
            />
          </div>

          {/* Class Filter */}
          <div style={{ minWidth: '180px' }}>
            <select
              value={classFilter}
              onChange={e => setClassFilter(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.875rem' }}
            >
              <option value="All">All Grades/Classes</option>
              {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              {uniqueClassOptions.map(clsName => {
                if (programs.some(p => p.name === clsName)) return null;
                return <option key={clsName} value={clsName}>{clsName}</option>;
              })}
            </select>
          </div>

          {/* Year Filter */}
          <div style={{ minWidth: '180px' }}>
            <select
              value={yearFilter}
              onChange={e => setYearFilter(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.875rem' }}
            >
              <option value="All">All Academic Years</option>
              {academicYears.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <SkeletonLoader type="card" count={3} />
      ) : (
        /* Kanban Board Grid */
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
          gap: '1.5rem',
          alignItems: 'start'
        }}>
          {/* COLUMN 1: Leads & Inquiries */}
          <div
            onDragOver={(e) => handleDragOver(e, 'lead')}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, 'lead')}
            style={{
              background: '#f8fafc',
              border: dragOverStage === 'lead' ? '2px dashed var(--primary)' : '1px solid var(--border)',
              borderRadius: '12px',
              padding: '1rem',
              minHeight: '550px',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              transition: 'background 0.2s'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6' }} />
                Leads & Inquiries
              </h3>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '12px', background: '#e2e8f0', color: 'var(--text-secondary)' }}>
                {filteredLeads.length}
              </span>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {filteredLeads.map(card => {
                const badge = getBadgeStyle(card.status);
                return (
                  <div
                    key={card.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, card.id, card.type, 'lead')}
                    style={{
                      background: 'white',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      padding: '1rem',
                      cursor: 'grab',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      transition: 'transform 0.15s, box-shadow 0.15s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.08)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                      <span style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                        {card.classLabel}
                      </span>
                      <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.15rem 0.4rem', borderRadius: '4px', background: badge.bg, color: badge.color }}>
                        {card.status}
                      </span>
                    </div>

                    <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' }}>
                      {card.title}
                    </h4>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <User size={12} style={{ opacity: 0.6 }} />
                        <span>{card.subtitle}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Phone size={12} style={{ opacity: 0.6 }} />
                        <span>{card.phone}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '0.5rem' }}>
                      <button
                        className="btn btn-sm btn-outline"
                        onClick={() => setDetailInquiry(card.rawItem)}
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                      >
                        <Eye size={11} /> Details
                      </button>

                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        {card.status === 'New' && (
                          <button
                            className="btn btn-sm"
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', background: '#f1f5f9', border: 'none', color: 'var(--text-main)' }}
                            onClick={() => updateInquiryStatus(card.id, 'Contacted')}
                          >
                            Mark Called
                          </button>
                        )}
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => setConvertInquiry(card.rawItem)}
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.15rem' }}
                        >
                          Convert <ArrowRight size={11} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {filteredLeads.length === 0 && (
                <EmptyState
                  title="No Inquiries"
                  description="No active inquiries or phone leads found in this filter."
                  icon={UserPlus}
                />
              )}
            </div>
          </div>

          {/* COLUMN 2: Applied & In Review */}
          <div
            onDragOver={(e) => handleDragOver(e, 'applied')}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, 'applied')}
            style={{
              background: '#f8fafc',
              border: dragOverStage === 'applied' ? '2px dashed var(--primary)' : '1px solid var(--border)',
              borderRadius: '12px',
              padding: '1rem',
              minHeight: '550px',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              transition: 'background 0.2s'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#8b5cf6' }} />
                Applied & In-Review
              </h3>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '12px', background: '#e2e8f0', color: 'var(--text-secondary)' }}>
                {filteredApplied.length}
              </span>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {filteredApplied.map(card => {
                const badge = getBadgeStyle(card.status);
                return (
                  <div
                    key={card.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, card.id, card.type, 'applied')}
                    style={{
                      background: 'white',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      padding: '1rem',
                      cursor: 'grab',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      transition: 'transform 0.15s, box-shadow 0.15s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.08)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                      <code style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--primary)' }}>
                        {card.rawItem.application_number}
                      </code>
                      <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.15rem 0.4rem', borderRadius: '4px', background: badge.bg, color: badge.color }}>
                        {card.status}
                      </span>
                    </div>

                    <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' }}>
                      {card.title}
                    </h4>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <ChevronRight size={11} style={{ opacity: 0.6 }} />
                        <span>Applying Grade: <strong>{card.classLabel}</strong></span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <User size={12} style={{ opacity: 0.6 }} />
                        <span>{card.subtitle}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Phone size={12} style={{ opacity: 0.6 }} />
                        <span>{card.phone}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '0.5rem' }}>
                      <button
                        className="btn btn-sm btn-outline"
                        onClick={() => setDetailApp(card.rawItem)}
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                      >
                        <Eye size={11} /> View App
                      </button>

                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={() => { setRejectApp(card.rawItem); setRejectReason(''); }}
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', border: '1px solid #ef4444', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.15rem' }}
                        >
                          <XCircle size={11} /> Reject
                        </button>
                        <button
                          className="btn btn-sm"
                          onClick={() => setApproveApp(card.rawItem)}
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', background: '#10b981', color: 'white', border: 'none', display: 'flex', alignItems: 'center', gap: '0.15rem' }}
                        >
                          <CheckCircle size={11} /> Admit
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {filteredApplied.length === 0 && (
                <EmptyState
                  title="No Applications"
                  description="Drag inquires here to convert, or add a new formal application."
                  icon={ClipboardList}
                />
              )}
            </div>
          </div>

          {/* COLUMN 3: Outcomes */}
          <div
            onDragOver={(e) => handleDragOver(e, 'outcome')}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, 'outcome')}
            style={{
              background: '#f8fafc',
              border: dragOverStage === 'outcome' ? '2px dashed var(--primary)' : '1px solid var(--border)',
              borderRadius: '12px',
              padding: '1rem',
              minHeight: '550px',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              transition: 'background 0.2s'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
                Closed Outcomes
              </h3>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '12px', background: '#e2e8f0', color: 'var(--text-secondary)' }}>
                {filteredOutcomes.length}
              </span>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {filteredOutcomes.map(card => {
                const badge = getBadgeStyle(card.status);
                return (
                  <div
                    key={card.id}
                    style={{
                      background: 'white',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      padding: '1rem',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      opacity: 0.9
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                      <span style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                        {card.classLabel}
                      </span>
                      <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.15rem 0.4rem', borderRadius: '4px', background: badge.bg, color: badge.color }}>
                        {card.status}
                      </span>
                    </div>

                    <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' }}>
                      {card.title}
                    </h4>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <User size={12} style={{ opacity: 0.6 }} />
                        <span>{card.subtitle}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <FileText size={12} style={{ opacity: 0.6 }} />
                        <span>Flow Type: <strong>{card.type.toUpperCase()}</strong></span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '0.5rem' }}>
                      <button
                        className="btn btn-sm btn-outline"
                        onClick={() => {
                          if (card.type === 'inquiry') {
                            setDetailInquiry(card.rawItem);
                          } else {
                            setDetailApp(card.rawItem);
                          }
                        }}
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.2', width: '100%', justifyContent: 'center' }}
                      >
                        <Eye size={11} /> View Record
                      </button>
                    </div>
                  </div>
                );
              })}

              {filteredOutcomes.length === 0 && (
                <EmptyState
                  title="No Outcomes"
                  description="Admitted and rejected profiles will appear in this column."
                  icon={CheckCircle}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          MODALS — INQUIRIES
      ════════════════════════════════════════════════════════════════════════ */}

      {/* Add Inquiry Modal */}
      {inqShowAdd && (
        <div className="modal-overlay" onClick={() => setInqShowAdd(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '560px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Add Admission Inquiry</h3>
              <button className="modal-close" onClick={() => setInqShowAdd(false)}>×</button>
            </div>
            <form onSubmit={handleInqAddSubmit}>
              <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Student Name *</label>
                  <input
                    required value={inqAddForm.student_name}
                    onChange={e => setInqAddForm(f => ({ ...f, student_name: e.target.value }))}
                    placeholder="Full name of the student"
                  />
                </div>
                <div className="form-group">
                  <label>Parent / Guardian Name *</label>
                  <input
                    required value={inqAddForm.parent_name}
                    onChange={e => setInqAddForm(f => ({ ...f, parent_name: e.target.value }))}
                    placeholder="Parent's full name"
                  />
                </div>
                <div className="form-group">
                  <label>Parent Phone *</label>
                  <input
                    required value={inqAddForm.parent_phone}
                    onChange={e => setInqAddForm(f => ({ ...f, parent_phone: e.target.value }))}
                    placeholder="+91 98765 43210"
                  />
                </div>
                <div className="form-group">
                  <label>Parent Email</label>
                  <input
                    type="email" value={inqAddForm.parent_email}
                    onChange={e => setInqAddForm(f => ({ ...f, parent_email: e.target.value }))}
                    placeholder="email@example.com"
                  />
                </div>
                <div className="form-group">
                  <label>Date of Birth</label>
                  <input
                    type="date" value={inqAddForm.date_of_birth}
                    onChange={e => setInqAddForm(f => ({ ...f, date_of_birth: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label>Applying For Class *</label>
                  <input
                    required value={inqAddForm.applying_for_class}
                    onChange={e => setInqAddForm(f => ({ ...f, applying_for_class: e.target.value }))}
                    placeholder="e.g. Grade 5, Class X"
                  />
                </div>
                <div className="form-group">
                  <label>Source</label>
                  <select value={inqAddForm.source} onChange={e => setInqAddForm(f => ({ ...f, source: e.target.value }))}>
                    <option>Walk-in</option>
                    <option>Phone</option>
                    <option>Website</option>
                    <option>Referral</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Academic Year</label>
                  <select value={inqAddForm.academic_year_id} onChange={e => setInqAddForm(f => ({ ...f, academic_year_id: e.target.value }))}>
                    <option value="">— Select Year —</option>
                    {academicYears.map(y => (
                      <option key={y.id} value={y.id}>{y.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Notes</label>
                  <textarea
                    value={inqAddForm.notes}
                    onChange={e => setInqAddForm(f => ({ ...f, notes: e.target.value }))}
                    rows={3}
                    placeholder="Any additional notes or observations..."
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setInqShowAdd(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={inqAddLoading}>
                  {inqAddLoading ? 'Adding...' : 'Add Inquiry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Convert Confirmation Modal */}
      {convertInquiry && (
        <div className="modal-overlay" onClick={() => setConvertInquiry(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Convert to Application</h3>
              <button className="modal-close" onClick={() => setConvertInquiry(null)}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '1rem' }}>
                Convert <strong>{convertInquiry.student_name}</strong>'s inquiry into a formal admission application?
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                This will create an application record and mark this inquiry as <strong>Applied</strong>. You can review and approve the application from the Applied tab.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setConvertInquiry(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleConvert} disabled={convertLoading}>
                {convertLoading ? 'Converting...' : 'Confirm Convert'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inquiry Detail Modal */}
      {detailInquiry && (
        <div className="modal-overlay" onClick={() => setDetailInquiry(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Inquiry Details</h3>
              <button className="modal-close" onClick={() => setDetailInquiry(null)}>×</button>
            </div>
            <div className="modal-body">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <tbody>
                  {[
                    ['Student Name', detailInquiry.student_name],
                    ['Parent Name', detailInquiry.parent_name],
                    ['Phone', detailInquiry.parent_phone],
                    ['Email', detailInquiry.parent_email || '—'],
                    ['Date of Birth', detailInquiry.date_of_birth || '—'],
                    ['Applying For', detailInquiry.applying_for_class],
                    ['Source', detailInquiry.source],
                    ['Academic Year', detailInquiry.academic_year_name || '—'],
                    ['Notes', detailInquiry.notes || '—'],
                    ['Status', detailInquiry.status],
                    ['Created', new Date(detailInquiry.created_at).toLocaleString()],
                  ].map(([label, value]) => (
                    <tr key={label} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.6rem 0.5rem', color: 'var(--text-muted)', width: '40%' }}>{label}</td>
                      <td style={{ padding: '0.6rem 0.5rem', fontWeight: 500 }}>
                        {label === 'Status' ? (
                          <span style={{
                            display: 'inline-block', padding: '0.2rem 0.65rem', borderRadius: '9999px',
                            fontSize: '0.75rem', fontWeight: 600,
                            background: getBadgeStyle(String(value)).bg,
                            color: getBadgeStyle(String(value)).color,
                          }}>{String(value)}</span>
                        ) : value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setDetailInquiry(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          MODALS — APPLICATIONS
      ════════════════════════════════════════════════════════════════════════ */}

      {/* Add Application Modal */}
      {appShowAdd && (
        <div className="modal-overlay" onClick={() => setAppShowAdd(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '620px' }}>
            <div className="modal-header">
              <h3 className="modal-title">New Admission Application</h3>
              <button className="modal-close" onClick={() => setAppShowAdd(false)}>×</button>
            </div>
            <form onSubmit={handleAppAddSubmit}>
              <div className="modal-body">
                <p style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Student Information</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>First Name *</label>
                    <input required value={appAddForm.student_first_name} onChange={e => setAppAddForm(f => ({ ...f, student_first_name: e.target.value }))} placeholder="First name" />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Last Name *</label>
                    <input required value={appAddForm.student_last_name} onChange={e => setAppAddForm(f => ({ ...f, student_last_name: e.target.value }))} placeholder="Last name" />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Date of Birth</label>
                    <input type="date" value={appAddForm.date_of_birth} onChange={e => setAppAddForm(f => ({ ...f, date_of_birth: e.target.value }))} />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Gender</label>
                    <select value={appAddForm.gender} onChange={e => setAppAddForm(f => ({ ...f, gender: e.target.value }))}>
                      <option value="">— Select —</option>
                      <option>Male</option>
                      <option>Female</option>
                      <option>Other</option>
                    </select>
                  </div>
                </div>

                <p style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Academic Details</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Applying For (Course / Program)</label>
                    <select value={appAddForm.applying_for_course_id} onChange={e => setAppAddForm(f => ({ ...f, applying_for_course_id: e.target.value }))}>
                      <option value="">— Select Program —</option>
                      {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Academic Year *</label>
                    <select required value={appAddForm.academic_year_id} onChange={e => setAppAddForm(f => ({ ...f, academic_year_id: e.target.value }))}>
                      <option value="">— Select Year —</option>
                      {academicYears.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
                    </select>
                  </div>
                </div>

                <p style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Parent / Guardian</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Parent Name *</label>
                    <input required value={appAddForm.parent_name} onChange={e => setAppAddForm(f => ({ ...f, parent_name: e.target.value }))} placeholder="Full name" />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Parent Phone *</label>
                    <input required value={appAddForm.parent_phone} onChange={e => setAppAddForm(f => ({ ...f, parent_phone: e.target.value }))} placeholder="+91 98765 43210" />
                  </div>
                  <div className="form-group" style={{ margin: 0, gridColumn: '1 / -1' }}>
                    <label>Parent Email</label>
                    <input type="email" value={appAddForm.parent_email} onChange={e => setAppAddForm(f => ({ ...f, parent_email: e.target.value }))} placeholder="email@example.com" />
                  </div>
                </div>

                <p style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Previous Education</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Previous School</label>
                    <input value={appAddForm.previous_school} onChange={e => setAppAddForm(f => ({ ...f, previous_school: e.target.value }))} placeholder="Name of last school attended" />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Previous Class</label>
                    <input value={appAddForm.previous_class} onChange={e => setAppAddForm(f => ({ ...f, previous_class: e.target.value }))} placeholder="e.g. Class 9" />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setAppShowAdd(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={appAddLoading}>
                  {appAddLoading ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Application Detail Modal */}
      {detailApp && (
        <div className="modal-overlay" onClick={() => setDetailApp(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '540px' }}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Application Details</h3>
                <code style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{detailApp.application_number}</code>
              </div>
              <button className="modal-close" onClick={() => setDetailApp(null)}>×</button>
            </div>
            <div className="modal-body">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                <tbody>
                  {[
                    ['Student Name', `${detailApp.student_first_name} ${detailApp.student_last_name}`],
                    ['Date of Birth', detailApp.date_of_birth || '—'],
                    ['Gender', detailApp.gender || '—'],
                    ['Course / Program', detailApp.course_name || '—'],
                    ['Academic Year', detailApp.academic_year_name],
                    ['Parent Name', detailApp.parent_name],
                    ['Parent Phone', detailApp.parent_phone],
                    ['Parent Email', detailApp.parent_email || '—'],
                    ['Previous School', detailApp.previous_school || '—'],
                    ['Previous Class', detailApp.previous_class || '—'],
                    ['Status', detailApp.status],
                    ['Rejection Reason', detailApp.rejection_reason || '—'],
                    ['Approved At', detailApp.approved_at ? new Date(detailApp.approved_at).toLocaleString() : '—'],
                    ['Applied On', new Date(detailApp.created_at).toLocaleString()],
                  ].map(([label, value]) => (
                    <tr key={label} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.55rem 0.5rem', color: 'var(--text-muted)', width: '42%' }}>{label}</td>
                      <td style={{ padding: '0.55rem 0.5rem', fontWeight: 500 }}>
                        {label === 'Status' ? (
                          <span style={{
                            display: 'inline-block', padding: '0.2rem 0.65rem', borderRadius: '9999px',
                            fontSize: '0.75rem', fontWeight: 600,
                            background: getBadgeStyle(String(value)).bg,
                            color: getBadgeStyle(String(value)).color,
                          }}>{String(value)}</span>
                        ) : value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setDetailApp(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Approve Confirmation Modal */}
      {approveApp && (
        <div className="modal-overlay" onClick={() => setApproveApp(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Approve Application</h3>
              <button className="modal-close" onClick={() => setApproveApp(null)}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '0.75rem' }}>
                Approve application for <strong>{approveApp.student_first_name} {approveApp.student_last_name}</strong>?
              </p>
              <div style={{
                background: '#fffbeb', border: '1px solid #f59e0b', borderRadius: '8px',
                padding: '0.75rem 1rem', color: '#92400e', fontSize: '0.875rem',
              }}>
                ⚠️ Approving will <strong>automatically create a student record</strong> in the system with admission number <code>{approveApp.application_number}</code>.
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setApproveApp(null)}>Cancel</button>
              <button
                className="btn"
                style={{ background: '#16a34a', color: '#fff' }}
                onClick={handleApprove}
                disabled={approveLoading}
              >
                {approveLoading ? 'Approving...' : 'Approve & Create Student'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectApp && (
        <div className="modal-overlay" onClick={() => setRejectApp(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Reject Application</h3>
              <button className="modal-close" onClick={() => setRejectApp(null)}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '1rem' }}>
                Reject application for <strong>{rejectApp.student_first_name} {rejectApp.student_last_name}</strong>?
              </p>
              <div className="form-group">
                <label>Rejection Reason</label>
                <textarea
                  rows={3}
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  placeholder="Provide a reason for rejection (optional)..."
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setRejectApp(null)}>Cancel</button>
              <button
                className="btn"
                style={{ background: '#dc2626', color: '#fff' }}
                onClick={handleReject}
                disabled={rejectLoading}
              >
                {rejectLoading ? 'Rejecting...' : 'Reject Application'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
