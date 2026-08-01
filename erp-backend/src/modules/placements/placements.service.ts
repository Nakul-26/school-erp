import { PlacementsRepository } from './placements.repository';
import { TranscriptService } from '../transcript/transcript.service';
import { BacklogsService } from '../backlogs/backlogs.service';
import {
  CreateCompanyInput, CreateDriveInput, EligibilityResult, UpdateApplicationInput,
  UpdateCompanyInput, UpdateDriveInput,
} from './placements.types';

export class PlacementsServiceError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

export class PlacementsService {
  constructor(
    private repo: PlacementsRepository,
    private transcriptService: TranscriptService,
    private backlogsService: BacklogsService
  ) {}

  // ---- Companies ----
  async listCompanies(institutionId: string) {
    return this.repo.listCompanies(institutionId);
  }

  async createCompany(institutionId: string, input: CreateCompanyInput, userId?: string): Promise<string> {
    if (!input.name || input.name.trim().length < 2) {
      throw new PlacementsServiceError('Company name is required.', 400);
    }
    const id = crypto.randomUUID();
    await this.repo.createCompany(id, institutionId, input, userId);
    return id;
  }

  async updateCompany(institutionId: string, id: string, input: UpdateCompanyInput, userId?: string): Promise<void> {
    const existing = await this.repo.getCompany(id, institutionId);
    if (!existing) throw new PlacementsServiceError('Company not found.', 404);
    await this.repo.updateCompany(id, input, userId);
  }

  async deleteCompany(institutionId: string, id: string, userId?: string): Promise<void> {
    const existing = await this.repo.getCompany(id, institutionId);
    if (!existing) throw new PlacementsServiceError('Company not found.', 404);
    await this.repo.softDeleteCompany(id, userId);
  }

  // ---- Drives ----
  async listDrives(institutionId: string, courseId?: string) {
    return this.repo.listDrives(institutionId, courseId);
  }

  async getDrive(institutionId: string, id: string) {
    const drive = await this.repo.getDrive(id);
    if (!drive || drive.institution_id !== institutionId) {
      throw new PlacementsServiceError('Placement drive not found.', 404);
    }
    return drive;
  }

  async createDrive(institutionId: string, input: CreateDriveInput, userId?: string): Promise<string> {
    if (!input.company_id || !input.course_id || !input.title || !input.drive_type) {
      throw new PlacementsServiceError('Company, program, title, and type are all required.', 400);
    }
    const company = await this.repo.getCompany(input.company_id, institutionId);
    if (!company) throw new PlacementsServiceError('Company not found.', 404);

    const id = crypto.randomUUID();
    await this.repo.createDrive(id, institutionId, input, userId);
    return id;
  }

  async updateDrive(institutionId: string, id: string, input: UpdateDriveInput, userId?: string): Promise<void> {
    await this.getDrive(institutionId, id);
    await this.repo.updateDrive(id, input, userId);
  }

  async deleteDrive(institutionId: string, id: string, userId?: string): Promise<void> {
    await this.getDrive(institutionId, id);
    await this.repo.softDeleteDrive(id, userId);
  }

  // ---- Eligibility ----
  // Course-scoped criteria (min CGPA, max open backlogs) only apply when the program actually
  // uses the credit/GPA system — schools and non-credit programs simply skip those two checks
  // rather than failing them, so this never blocks a school-mode drive.
  async checkEligibility(studentId: string, institutionId: string, driveId: string): Promise<EligibilityResult> {
    const drive = await this.getDrive(institutionId, driveId);
    const reasons: string[] = [];

    let cgpa: number | null = null;
    let openBacklogCount = 0;
    let creditEnabled = false;
    try {
      await this.transcriptService.requireCreditEnabledCourse(drive.course_id, institutionId);
      creditEnabled = true;
    } catch {
      creditEnabled = false;
    }

    if (creditEnabled) {
      if (drive.min_cgpa !== null) {
        const transcript = await this.transcriptService.getTranscript(studentId, institutionId, drive.course_id);
        cgpa = transcript.cgpa;
        if (cgpa === null || cgpa < drive.min_cgpa) {
          reasons.push(`Requires a minimum CGPA of ${drive.min_cgpa} (current: ${cgpa ?? 'not available'}).`);
        }
      }
      if (drive.max_backlogs !== null) {
        const backlogs = await this.backlogsService.getStudentBacklogs(studentId, institutionId, drive.course_id);
        openBacklogCount = backlogs.length;
        if (openBacklogCount > drive.max_backlogs) {
          reasons.push(`Allows at most ${drive.max_backlogs} open backlog(s) (current: ${openBacklogCount}).`);
        }
      }
    }

    return {
      is_eligible: reasons.length === 0,
      reasons,
      cgpa,
      open_backlog_count: openBacklogCount,
    };
  }

  // ---- Applications ----
  async applyToDrive(institutionId: string, studentId: string, driveId: string, userId?: string): Promise<string> {
    const drive = await this.getDrive(institutionId, driveId);
    if (drive.status !== 'OPEN') {
      throw new PlacementsServiceError('This drive is not currently open for applications.', 400);
    }
    if (drive.application_deadline && new Date(drive.application_deadline) < new Date()) {
      throw new PlacementsServiceError('The application deadline for this drive has passed.', 400);
    }

    const enrolled = await this.repo.isEnrolledInCourse(studentId, drive.course_id);
    if (!enrolled) {
      throw new PlacementsServiceError('Student is not enrolled in the program this drive is open to.', 400);
    }

    const eligibility = await this.checkEligibility(studentId, institutionId, driveId);
    if (!eligibility.is_eligible) {
      throw new PlacementsServiceError(`Not eligible for this drive: ${eligibility.reasons.join(' ')}`, 400);
    }

    const existing = await this.repo.findApplication(driveId, studentId);
    if (existing) {
      if (existing.status !== 'WITHDRAWN') {
        throw new PlacementsServiceError('Already applied to this drive.', 400);
      }
      await this.repo.reactivateApplication(existing.id, userId);
      return existing.id;
    }

    const id = crypto.randomUUID();
    await this.repo.createApplication(id, institutionId, driveId, studentId, userId);
    return id;
  }

  async withdrawApplication(institutionId: string, id: string, userId?: string): Promise<void> {
    const existing = await this.repo.findApplicationById(id);
    if (!existing || existing.institution_id !== institutionId) {
      throw new PlacementsServiceError('Application not found.', 404);
    }
    await this.repo.withdrawApplication(id, userId);
  }

  async updateApplicationStatus(institutionId: string, id: string, input: UpdateApplicationInput, userId?: string): Promise<void> {
    const existing = await this.repo.findApplicationById(id);
    if (!existing || existing.institution_id !== institutionId) {
      throw new PlacementsServiceError('Application not found.', 404);
    }
    await this.repo.updateApplicationStatus(id, input, userId);
  }

  async listApplicationsForDrive(institutionId: string, driveId: string) {
    await this.getDrive(institutionId, driveId);
    return this.repo.listApplicationsForDrive(driveId);
  }

  async listApplicationsForStudent(institutionId: string, studentId: string) {
    return this.repo.listApplicationsForStudent(institutionId, studentId);
  }
}
