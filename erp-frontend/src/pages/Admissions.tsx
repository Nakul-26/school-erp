import './Admissions.css';
import React, { useEffect, useState } from 'react';
import { PageGuidance } from '../components/PageGuidance';
import Layout from '../components/Layout';
import { Plus, UserPlus, ClipboardList, CheckCircle, Search } from 'lucide-react';
import SkeletonLoader from '../components/SkeletonLoader';
import EmptyState from '../components/EmptyState';

import { admissionsService } from './admissions/admissionsService';
import { KanbanColumn } from './admissions/components/KanbanColumn';
import { LeadCard } from './admissions/components/LeadCard';
import { AppliedCard } from './admissions/components/AppliedCard';
import { OutcomeCard } from './admissions/components/OutcomeCard';
import { AddInquiryModal } from './admissions/components/AddInquiryModal';
import { ConvertInquiryModal } from './admissions/components/ConvertInquiryModal';
import { InquiryDetailModal } from './admissions/components/InquiryDetailModal';
import { AddApplicationModal } from './admissions/components/AddApplicationModal';
import { ApplicationDetailModal } from './admissions/components/ApplicationDetailModal';
import { ApproveApplicationModal } from './admissions/components/ApproveApplicationModal';
import { RejectApplicationModal } from './admissions/components/RejectApplicationModal';
import type {
  AcademicYear, Program, Inquiry, Application, BoardStage, BoardCard,
  InquiryAddForm, ApplicationAddForm,
} from './admissions/admissions.types';

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
  const [inqAddForm, setInqAddForm] = useState<InquiryAddForm>({
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
  const [appAddForm, setAppAddForm] = useState<ApplicationAddForm>({
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
        admissionsService.getInquiries(),
        admissionsService.getApplications(),
        admissionsService.getAcademicYears(),
        admissionsService.getPrograms(),
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
      await admissionsService.createInquiry({
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
      await admissionsService.convertInquiry(convertInquiry.id, {
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
      await admissionsService.createApplication({
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
      const result = await admissionsService.approveApplication(approveApp.id);
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
      await admissionsService.rejectApplication(rejectApp.id, rejectReason);
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
      await admissionsService.updateInquiryStatus(id, status);
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
      const term = (searchTerm || '').trim().toLowerCase();
      const matchesSearch =
        !term ||
        (card.title || '').toLowerCase().includes(term) ||
        (card.subtitle || '').toLowerCase().includes(term) ||
        (card.phone || '').toLowerCase().includes(term) ||
        (card.email || '').toLowerCase().includes(term);

      const matchesClass =
        classFilter === 'All' ||
        card.classValue === classFilter ||
        (card.classLabel || '').toLowerCase().includes(classFilter.toLowerCase());

      const matchesYear =
        yearFilter === 'All' ||
        card.yearId === yearFilter;

      return matchesSearch && matchesClass && matchesYear;
    });
  };

  const filteredLeads = applyFilters(leadCards);
  const filteredApplied = applyFilters(appliedCards);
  const filteredOutcomes = applyFilters(outcomeCards);

  // Unique class options for filtering
  const uniqueClassOptions = Array.from(
    new Set([
      ...programs.map(p => p.name),
      ...inquiries.map(i => i.applying_for_class)
    ])
  ).filter(Boolean);

  const handleOutcomeView = (card: BoardCard) => {
    if (card.type === 'inquiry') {
      setDetailInquiry(card.rawItem);
    } else {
      setDetailApp(card.rawItem);
    }
  };

  return (
    <Layout>
      <div className="admissions-page-wrap">
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
      <div className="page-header admissions-page-header">
        <div>
          <h2>Admissions & Inquiry Pipeline</h2>
          <p className="admissions-text-2">
            Unified board management for lead generation and candidate enrollment
          </p>
        </div>
        <div className="admissions-row-3">
          <button className="btn btn-outline admissions-btn" onClick={() => setInqShowAdd(true)}>
            <Plus size={16} /> Add Inquiry
          </button>
          <button className="btn btn-primary admissions-btn" onClick={() => setAppShowAdd(true)}>
            <Plus size={16} /> New Application
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      <div className="card admissions-card">
        <div className="admissions-row-7">
          {/* Search bar */}
          <div className="admissions-div-8">
            <Search size={16} className="admissions-Search-9" />
            <input type="text" placeholder="Search candidate name, parent, phone..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="admissions-input-10" />
          </div>

          {/* Class Filter */}
          <div className="admissions-div-11">
            <select value={classFilter} onChange={e => setClassFilter(e.target.value)} className="admissions-select-12">
              <option value="All">All Grades/Classes</option>
              {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              {uniqueClassOptions.map(clsName => {
                if (programs.some(p => p.name === clsName)) return null;
                return <option key={clsName} value={clsName}>{clsName}</option>;
              })}
            </select>
          </div>

          {/* Year Filter */}
          <div className="admissions-div-13">
            <select value={yearFilter} onChange={e => setYearFilter(e.target.value)} className="admissions-select-14">
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
        <div className="admissions-grid-15">
          {/* COLUMN 1: Leads & Inquiries */}
          <KanbanColumn
            stage="lead"
            icon={<span className="admissions-span-18" />}
            title="Leads & Inquiries"
            count={filteredLeads.length}
            isDragOver={dragOverStage === 'lead'}
            onDragOver={(e) => handleDragOver(e, 'lead')}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, 'lead')}
          >
            {filteredLeads.map(card => (
              <LeadCard
                key={card.id}
                card={card}
                onDragStart={(e, cardId, cardType) => handleDragStart(e, cardId, cardType, 'lead')}
                onDetail={setDetailInquiry}
                onMarkContacted={(id) => updateInquiryStatus(id, 'Contacted')}
                onConvert={setConvertInquiry}
              />
            ))}

            {filteredLeads.length === 0 && (
              <EmptyState
                title="No Inquiries"
                description="No active inquiries or phone leads found in this filter."
                icon={UserPlus}
              />
            )}
          </KanbanColumn>

          {/* COLUMN 2: Applied & In Review */}
          <KanbanColumn
            stage="applied"
            icon={<span className="admissions-span-37" />}
            title="Applied & In-Review"
            count={filteredApplied.length}
            isDragOver={dragOverStage === 'applied'}
            onDragOver={(e) => handleDragOver(e, 'applied')}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, 'applied')}
          >
            {filteredApplied.map(card => (
              <AppliedCard
                key={card.id}
                card={card}
                onDragStart={(e, cardId, cardType) => handleDragStart(e, cardId, cardType, 'applied')}
                onView={setDetailApp}
                onReject={(item) => { setRejectApp(item); setRejectReason(''); }}
                onApprove={setApproveApp}
              />
            ))}

            {filteredApplied.length === 0 && (
              <EmptyState
                title="No Applications"
                description="Drag inquires here to convert, or add a new formal application."
                icon={ClipboardList}
              />
            )}
          </KanbanColumn>

          {/* COLUMN 3: Outcomes */}
          <KanbanColumn
            stage="outcome"
            icon={<span className="admissions-span-58" />}
            title="Closed Outcomes"
            count={filteredOutcomes.length}
            isDragOver={dragOverStage === 'outcome'}
            onDragOver={(e) => handleDragOver(e, 'outcome')}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, 'outcome')}
          >
            {filteredOutcomes.map(card => (
              <OutcomeCard key={card.id} card={card} onView={handleOutcomeView} />
            ))}

            {filteredOutcomes.length === 0 && (
              <EmptyState
                title="No Outcomes"
                description="Admitted and rejected profiles will appear in this column."
                icon={CheckCircle}
              />
            )}
          </KanbanColumn>
        </div>
      )}

      <AddInquiryModal
        show={inqShowAdd}
        form={inqAddForm}
        setForm={setInqAddForm}
        academicYears={academicYears}
        loading={inqAddLoading}
        onClose={() => setInqShowAdd(false)}
        onSubmit={handleInqAddSubmit}
      />

      <ConvertInquiryModal
        inquiry={convertInquiry}
        loading={convertLoading}
        onClose={() => setConvertInquiry(null)}
        onConfirm={handleConvert}
      />

      <InquiryDetailModal
        inquiry={detailInquiry}
        onClose={() => setDetailInquiry(null)}
      />

      <AddApplicationModal
        show={appShowAdd}
        form={appAddForm}
        setForm={setAppAddForm}
        academicYears={academicYears}
        programs={programs}
        loading={appAddLoading}
        onClose={() => setAppShowAdd(false)}
        onSubmit={handleAppAddSubmit}
      />

      <ApplicationDetailModal
        application={detailApp}
        onClose={() => setDetailApp(null)}
      />

      <ApproveApplicationModal
        application={approveApp}
        loading={approveLoading}
        onClose={() => setApproveApp(null)}
        onConfirm={handleApprove}
      />

      <RejectApplicationModal
        application={rejectApp}
        reason={rejectReason}
        setReason={setRejectReason}
        loading={rejectLoading}
        onClose={() => setRejectApp(null)}
        onConfirm={handleReject}
      />
      </div>
    </Layout>
  );
}
