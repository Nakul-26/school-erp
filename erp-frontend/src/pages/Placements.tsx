import React, { useEffect, useState } from 'react';
import { PageGuidance } from '../components/PageGuidance';
import Layout from '../components/Layout';
import { Briefcase, Building2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useConfirm } from '../contexts/ConfirmDialogContext';
import { hasAnyPermission, hasAnyRole } from '../utils/accessControl';

import { placementsService } from './placements/placementsService';
import { CompaniesPanel } from './placements/components/CompaniesPanel';
import { AddCompanyModal } from './placements/components/AddCompanyModal';
import { DrivesPanel } from './placements/components/DrivesPanel';
import { AddDriveModal } from './placements/components/AddDriveModal';
import { DriveApplicantsModal } from './placements/components/DriveApplicantsModal';
import type {
  Company, CreateCompanyInput, PlacementDrive, CreateDriveInput, DriveStatus,
  PlacementApplication, ApplicationStatus,
} from './placements/placements.types';

export default function Placements() {
  const { user } = useAuth();
  const confirm = useConfirm();
  const userRoles = user?.roles || (user?.role ? [user.role] : []);
  const userPermissions = user?.permissions || [];
  const canManage = hasAnyPermission(userPermissions, ['academic.manage']) ||
    hasAnyRole(userRoles, ['admin', 'super_admin', 'Principal', 'HOD']);

  const [activeTab, setActiveTab] = useState<'drives' | 'companies'>('drives');

  const [companies, setCompanies] = useState<Company[]>([]);
  const [drives, setDrives] = useState<PlacementDrive[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [showAddCompanyModal, setShowAddCompanyModal] = useState(false);
  const [companyForm, setCompanyForm] = useState<CreateCompanyInput>({ name: '' });

  const [showAddDriveModal, setShowAddDriveModal] = useState(false);
  const [driveForm, setDriveForm] = useState<CreateDriveInput>({ company_id: '', course_id: '', title: '', drive_type: 'PLACEMENT' });

  const [showApplicantsModal, setShowApplicantsModal] = useState(false);
  const [selectedDrive, setSelectedDrive] = useState<PlacementDrive | null>(null);
  const [applications, setApplications] = useState<PlacementApplication[]>([]);
  const [applicantsLoading, setApplicantsLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [companiesData, drivesData, programsData] = await Promise.all([
        placementsService.getCompanies(),
        placementsService.getDrives(),
        placementsService.getPrograms(),
      ]);
      setCompanies(companiesData || []);
      setDrives(drivesData || []);
      setPrograms(programsData || []);
    } catch (err) {
      console.error('Error fetching placements data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await placementsService.createCompany(companyForm);
      setShowAddCompanyModal(false);
      setCompanyForm({ name: '' });
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Error adding company');
    }
  };

  const handleDeleteCompany = async (company: Company) => {
    if (!await confirm(`Remove ${company.name} from the recruiter list?`)) return;
    try {
      await placementsService.deleteCompany(company.id);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Error removing company');
    }
  };

  const openAddDriveModal = () => {
    setDriveForm({ company_id: companies[0]?.id || '', course_id: programs[0]?.id || '', title: '', drive_type: 'PLACEMENT' });
    setShowAddDriveModal(true);
  };

  const handleAddDriveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await placementsService.createDrive(driveForm);
      setShowAddDriveModal(false);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Error creating drive');
    }
  };

  const handleDriveStatusChange = async (drive: PlacementDrive, status: DriveStatus) => {
    try {
      await placementsService.updateDrive(drive.id, { status });
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Error updating drive status');
    }
  };

  const handleDeleteDrive = async (drive: PlacementDrive) => {
    if (!await confirm(`Delete the drive "${drive.title}" for ${drive.company_name}?`)) return;
    try {
      await placementsService.deleteDrive(drive.id);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Error deleting drive');
    }
  };

  const openApplicantsModal = async (drive: PlacementDrive) => {
    setSelectedDrive(drive);
    setShowApplicantsModal(true);
    setApplicantsLoading(true);
    try {
      const data = await placementsService.getApplications(drive.id);
      setApplications(data || []);
    } catch (err) {
      console.error(err);
      setApplications([]);
    } finally {
      setApplicantsLoading(false);
    }
  };

  const handleApplicationStatusChange = async (app: PlacementApplication, status: ApplicationStatus) => {
    try {
      await placementsService.updateApplication(app.id, { status });
      if (selectedDrive) await openApplicantsModal(selectedDrive);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Error updating application');
    }
  };

  const handleOfferChange = async (app: PlacementApplication, offerPackage: number, offerDate: string) => {
    try {
      await placementsService.updateApplication(app.id, {
        offer_package: offerPackage || undefined,
        offer_date: offerDate || undefined,
      });
    } catch (err: any) {
      alert(err.message || 'Error updating offer details');
    }
  };

  return (
    <Layout>
      <PageGuidance
        title="Placements & Internships"
        description="Manage recruiting companies and placement/internship drives, and track student applications through to offers."
        steps={[
          'Add companies your institution recruits with.',
          'Create a placement or internship drive for a program, optionally with minimum CGPA / max-backlog eligibility gates.',
          'Students apply from their own profile; track applicants and move them through the pipeline here.',
        ]}
      />

      <div className="page-header">
        <div>
          <h2>Placements & Internships</h2>
          <p>Track recruiting companies, drives, and student applications.</p>
        </div>
      </div>

      <div className="classes-row-6" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <button
          onClick={() => setActiveTab('drives')}
          className={`btn ${activeTab === 'drives' ? 'btn-primary' : 'btn-secondary'}`}
        >
          <Briefcase size={16} /> Drives
        </button>
        <button
          onClick={() => setActiveTab('companies')}
          className={`btn ${activeTab === 'companies' ? 'btn-primary' : 'btn-secondary'}`}
        >
          <Building2 size={16} /> Companies
        </button>
      </div>

      {activeTab === 'drives' && (
        <DrivesPanel
          loading={loading}
          drives={drives}
          onAddClick={openAddDriveModal}
          onStatusChange={handleDriveStatusChange}
          onViewApplicants={openApplicantsModal}
          onDelete={handleDeleteDrive}
        />
      )}

      {activeTab === 'companies' && (
        <CompaniesPanel
          loading={loading}
          companies={companies}
          onAddClick={() => setShowAddCompanyModal(true)}
          onDelete={handleDeleteCompany}
        />
      )}

      <AddCompanyModal
        show={showAddCompanyModal && canManage}
        form={companyForm}
        setForm={setCompanyForm}
        onClose={() => setShowAddCompanyModal(false)}
        onSubmit={handleAddCompanySubmit}
      />

      <AddDriveModal
        show={showAddDriveModal && canManage}
        form={driveForm}
        setForm={setDriveForm}
        companies={companies}
        programs={programs}
        onClose={() => setShowAddDriveModal(false)}
        onSubmit={handleAddDriveSubmit}
      />

      <DriveApplicantsModal
        show={showApplicantsModal}
        drive={selectedDrive}
        applications={applications}
        loading={applicantsLoading}
        onClose={() => setShowApplicantsModal(false)}
        onStatusChange={handleApplicationStatusChange}
        onOfferChange={handleOfferChange}
      />
    </Layout>
  );
}
