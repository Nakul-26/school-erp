import { AcademicYearRepository } from './academic-year.repository';
import { AcademicYear, CreateAcademicYearInput, UpdateAcademicYearInput } from './academic-year.types';

export class AcademicYearService {
  constructor(private repo: AcademicYearRepository) {}

  async createAcademicYear(
    institutionId: string,
    input: CreateAcademicYearInput,
    userId?: string
  ): Promise<string> {
    // Input validation at service layer — fail fast with a clear message
    if (!input.name?.trim()) {
      throw new Error('Academic year name is required.');
    }
    if (!input.start_date || !input.end_date) {
      throw new Error('start_date and end_date are required.');
    }
    // Date chronology and overlap are validated inside the repository
    const id = crypto.randomUUID();
    await this.repo.create(id, institutionId, input, userId);
    return id;
  }

  async getAcademicYear(id: string): Promise<AcademicYear | null> {
    return await this.repo.findById(id);
  }

  async listAcademicYears(institutionId: string): Promise<AcademicYear[]> {
    return await this.repo.listByInstitution(institutionId);
  }

  async updateAcademicYear(
    id: string,
    institutionId: string,
    input: UpdateAcademicYearInput,
    userId?: string
  ): Promise<void> {
    // Name must not be blanked out if provided
    if ('name' in input && !input.name?.trim()) {
      throw new Error('Academic year name cannot be empty.');
    }
    // Date chronology, overlap, status transitions, and Archived read-only check
    // are all enforced inside the repository.
    await this.repo.update(id, institutionId, input, userId);
  }

  async deleteAcademicYear(id: string, userId?: string): Promise<void> {
    // Delete protection (downstream references + active-year guard) is enforced
    // inside the repository's softDelete method.
    await this.repo.softDelete(id, userId);
  }

  // ---------------------------------------------------------------------------
  // Rollover Action
  // ---------------------------------------------------------------------------
  async rollover(
    institutionId: string,
    sourceYearId: string,
    targetYearId: string,
    checklist: string[],
    preview: boolean,
    userId?: string
  ) {
    if (!sourceYearId || !targetYearId) {
      throw new Error('source_year_id and target_year_id are required.');
    }
    if (sourceYearId === targetYearId) {
      throw new Error('Source and target academic years must be different.');
    }

    const previewData = await this.repo.rolloverPreview(
      institutionId,
      sourceYearId,
      targetYearId,
      checklist
    );

    if (preview) {
      return {
        preview: true,
        summary: previewData,
        logs:
          `Simulation Mode:\n` +
          `Sections to rollover: ${previewData.sections_count}\n` +
          `Teaching Allocations to rollover: ${previewData.allocations_count}\n` +
          `Weekly Timetable slots to rollover: ${previewData.timetable_count}\n` +
          `Fee Structures to rollover: ${previewData.fees_count}`,
      };
    }

    const runResult = await this.repo.executeRollover(
      institutionId,
      sourceYearId,
      targetYearId,
      checklist,
      userId
    );
    return { preview: false, summary: previewData, logs: runResult.log_output };
  }

  // ---------------------------------------------------------------------------
  // Student Promotion Action
  // ---------------------------------------------------------------------------
  async promote(
    institutionId: string,
    sourceYearId: string,
    targetYearId: string,
    sourceCourseId: string,
    sourceSectionId: string,
    targetCourseId: string,
    targetSectionId: string,
    targetSemester: number | undefined,
    studentIds: string[],
    generateFees: boolean,
    preview: boolean,
    userId?: string
  ) {
    if (!studentIds || studentIds.length === 0) {
      throw new Error('At least one student_id is required.');
    }

    const results: Array<{
      student_id: string;
      name: string;
      status: 'Eligible' | 'Warning' | 'Not Eligible';
      details: string;
    }> = [];

    // Access the underlying D1 database through the repo for direct queries
    const db = (this.repo as any).db as D1Database;

    for (const sid of studentIds) {
      const sRow = await db
        .prepare("SELECT id, (first_name || ' ' || last_name) as full_name FROM students WHERE id = ?")
        .bind(sid)
        .first<{ id: string; full_name: string }>();

      const eligibility = await this.repo.getStudentEligibility(sid, sourceYearId);
      results.push({
        student_id: sid,
        name: sRow?.full_name || `Student ID ${sid}`,
        status: eligibility.status,
        details: eligibility.details,
      });
    }

    if (preview) {
      return { preview: true, promoted_count: 0, results };
    }

    const eligibleStudentIds = results
      .filter((item) => item.status !== 'Not Eligible')
      .map((item) => item.student_id);

    let promoted_count = 0;
    if (eligibleStudentIds.length > 0) {
      promoted_count = await this.repo.executePromotionsBatch(
        institutionId,
        targetYearId,
        targetCourseId,
        targetSectionId,
        targetSemester,
        eligibleStudentIds,
        generateFees,
        userId
      );
    }

    return { preview: false, promoted_count, results };
  }

  // ---------------------------------------------------------------------------
  // Year Closing Action
  // ---------------------------------------------------------------------------
  async closeYear(
    institutionId: string,
    academicYearId: string,
    preview: boolean,
    userId?: string
  ) {
    const checks = await this.repo.getYearClosingReport(institutionId, academicYearId);

    if (preview) {
      return { preview: true, checks };
    }

    const hasErrors = checks.some((c) => c.type === 'error');
    if (hasErrors) {
      throw new Error('Cannot close academic year: Outstanding errors must be resolved first.');
    }

    // Transition to Archived and unset current flag
    await this.repo.update(
      academicYearId,
      institutionId,
      { status: 'Archived', is_current: 0 },
      userId
    );

    return { preview: false, checks };
  }
}
