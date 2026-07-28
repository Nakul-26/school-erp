import { TeachingAllocationRepository } from './allocations.repository';
import { CreateAllocationInput, UpdateAllocationInput, AllocationFilterOptions, AllocationDependencyCounts } from './allocations.types';
import { isYearLockedOrArchived } from '../../utils/academic-year-lock';

export class AllocationServiceError extends Error {
  constructor(message: string, public statusCode: number = 400) {
    super(message);
    this.name = 'AllocationServiceError';
  }
}

export class AllocationService {
  constructor(private repo: TeachingAllocationRepository, private db: D1Database) {}

  private validateWorkloadBreakdown(
    classesPerWeek?: number | null,
    theoryHours?: number | null,
    practicalHours?: number | null,
    tutorialHours?: number | null
  ): void {
    const cpw = classesPerWeek ?? 4;
    if (typeof cpw !== 'number' || isNaN(cpw) || cpw < 1 || cpw > 40) {
      throw new AllocationServiceError('Classes per week must be a positive integer between 1 and 40.', 400);
    }

    const th = theoryHours || 0;
    const pr = practicalHours || 0;
    const tu = tutorialHours || 0;
    const directSum = th + pr + tu;

    if (cpw < directSum) {
      throw new AllocationServiceError(`Classes per week (${cpw}) must be at least the sum of theory, practical, and tutorial hours (${directSum}).`, 400);
    }
  }

  private async validateLineageAndActiveStatus(
    institutionId: string,
    teacherId: string,
    subjectId: string,
    sectionId: string,
    academicYearId: string
  ): Promise<{ teacher: any; subject: any; section: any; ay: any }> {
    // 1. Academic Year Check & Lock Status
    const ay = await this.db.prepare('SELECT id, institution_id, is_active, status, name FROM academic_years WHERE id = ?').bind(academicYearId).first<any>();
    if (!ay || ay.institution_id !== institutionId || ay.is_active !== 1) {
      throw new AllocationServiceError('Selected academic year is invalid or archived.', 400);
    }
    const isLocked = await isYearLockedOrArchived(this.db, academicYearId);
    if (isLocked) {
      throw new AllocationServiceError('This academic year is locked or archived. Modifications are not allowed.', 400);
    }

    // 2. Teacher Status Check
    const teacher = await this.db.prepare('SELECT id, institution_id, is_active, status, (first_name || " " || last_name) as name FROM teachers WHERE id = ?').bind(teacherId).first<any>();
    if (!teacher || teacher.institution_id !== institutionId || teacher.is_active !== 1 || teacher.status !== 'ACTIVE') {
      throw new AllocationServiceError(`Assigned teacher is invalid or inactive (Status: ${teacher?.status || 'NOT_FOUND'}).`, 400);
    }

    // 3. Section Check
    const section = await this.db.prepare('SELECT id, institution_id, course_id, academic_year_id, is_active, name FROM sections WHERE id = ?').bind(sectionId).first<any>();
    if (!section || section.institution_id !== institutionId || section.is_active !== 1) {
      throw new AllocationServiceError('Selected class/section is invalid or archived.', 400);
    }
    if (section.academic_year_id !== academicYearId) {
      throw new AllocationServiceError(`Section '${section.name}' belongs to a different academic year than selected (${academicYearId}).`, 400);
    }

    // 4. Subject Check & Lineage Alignment
    const subject = await this.db.prepare('SELECT id, institution_id, course_id, is_active, subject_name FROM subjects WHERE id = ?').bind(subjectId).first<any>();
    if (!subject || subject.institution_id !== institutionId || subject.is_active !== 1) {
      throw new AllocationServiceError('Selected subject is invalid or archived.', 400);
    }
    if (subject.course_id !== section.course_id) {
      const course = await this.db.prepare('SELECT name FROM courses WHERE id = ?').bind(section.course_id).first<any>();
      throw new AllocationServiceError(`Selected subject '${subject.subject_name}' does not belong to section program '${course?.name || section.course_id}'.`, 400);
    }

    return { teacher, subject, section, ay };
  }

  async createAllocation(
    institutionId: string, 
    input: CreateAllocationInput, 
    userId?: string
  ): Promise<{ id: string; warning?: string | null }> {
    if (!input.teacher_id || !input.subject_id || !input.section_id || !input.academic_year_id) {
      throw new AllocationServiceError('Teacher, Subject, Section, and Academic Year are required.', 400);
    }

    this.validateWorkloadBreakdown(input.classes_per_week, input.theory_hours, input.practical_hours, input.tutorial_hours);
    const { teacher, subject, section, ay } = await this.validateLineageAndActiveStatus(
      institutionId,
      input.teacher_id,
      input.subject_id,
      input.section_id,
      input.academic_year_id
    );

    // Duplicate Check
    const isDuplicate = await this.repo.checkDuplicateAllocation(
      input.teacher_id,
      input.subject_id,
      input.section_id,
      input.academic_year_id
    );
    if (isDuplicate) {
      throw new AllocationServiceError(`Duplicate allocation: Teacher ${teacher.name} is already assigned to ${subject.subject_name} in ${section.name}.`, 400);
    }

    // Total Workload limit check (Max 45 hours/week)
    const existingLoad = await this.repo.calculateTeacherLoad(input.teacher_id, input.academic_year_id);
    const newHours = (input.theory_hours || 0) + (input.practical_hours || 0) + (input.tutorial_hours || 0) + (input.mentoring_hours || 0) + (input.admin_hours || 0);
    const totalNewHours = existingLoad.total_hours + newHours;

    if (totalNewHours > 45) {
      throw new AllocationServiceError(`Allocation rejected: Teacher ${teacher.name} workload would reach ${totalNewHours} weekly hours (maximum limit is 45 hours/week).`, 400);
    }

    const id = crypto.randomUUID();
    const primaryFlag = input.primary_teacher ?? 1;

    await this.repo.create(id, institutionId, {
      ...input,
      department_id: input.department_id || section.course_id,
      program_id: input.program_id || section.course_id,
      semester: input.semester || 1,
      year_number: input.year_number || 1,
      primary_teacher: primaryFlag
    }, userId);

    // Handle single primary teacher rule per subject-section
    if (primaryFlag === 1) {
      await this.repo.demoteOtherPrimaryTeachers(input.subject_id, input.section_id, input.academic_year_id, id);
    }

    const warning = totalNewHours > 24 
      ? `Warning: Teacher ${teacher.name} workload is now at ${totalNewHours} weekly hours (recommended maximum is 24).`
      : null;

    return { id, warning };
  }

  async getAllocation(id: string, institutionId: string): Promise<any | null> {
    return await this.repo.findById(id, institutionId);
  }

  async getDependencies(id: string): Promise<AllocationDependencyCounts> {
    return await this.repo.getDependencyCounts(id);
  }

  async listAllocations(institutionId: string, filters: AllocationFilterOptions): Promise<any[]> {
    return await this.repo.list(institutionId, filters);
  }

  async updateAllocation(
    id: string, 
    institutionId: string, 
    input: UpdateAllocationInput, 
    userId?: string
  ): Promise<void> {
    const existing = await this.repo.findById(id, institutionId);
    if (!existing) {
      throw new AllocationServiceError('Allocation not found.', 404);
    }

    const checkTeacher = input.teacher_id || existing.teacher_id;
    const checkSubject = input.subject_id || existing.subject_id;
    const checkSection = input.section_id || existing.section_id;
    const checkAY = input.academic_year_id || existing.academic_year_id;
    const checkCPW = input.classes_per_week !== undefined ? input.classes_per_week : existing.classes_per_week;
    const checkTH = input.theory_hours !== undefined ? input.theory_hours : existing.theory_hours;
    const checkPR = input.practical_hours !== undefined ? input.practical_hours : existing.practical_hours;
    const checkTU = input.tutorial_hours !== undefined ? input.tutorial_hours : existing.tutorial_hours;

    this.validateWorkloadBreakdown(checkCPW, checkTH, checkPR, checkTU);
    await this.validateLineageAndActiveStatus(institutionId, checkTeacher, checkSubject, checkSection, checkAY);

    const isMappingChanged = 
      checkTeacher !== existing.teacher_id ||
      checkSubject !== existing.subject_id ||
      checkSection !== existing.section_id ||
      checkAY !== existing.academic_year_id;

    if (isMappingChanged) {
      const isDuplicate = await this.repo.checkDuplicateAllocation(checkTeacher, checkSubject, checkSection, checkAY, id);
      if (isDuplicate) {
        throw new AllocationServiceError('Conflict: An active teaching allocation already exists for this mapping.', 400);
      }
    }

    const primaryFlag = input.primary_teacher !== undefined ? input.primary_teacher : existing.primary_teacher;

    await this.repo.update(id, institutionId, input, userId);

    if (primaryFlag === 1) {
      await this.repo.demoteOtherPrimaryTeachers(checkSubject, checkSection, checkAY, id);
    }
  }

  async archiveAllocation(id: string, institutionId: string, userId?: string): Promise<void> {
    const existing = await this.repo.findById(id, institutionId);
    if (!existing) {
      throw new AllocationServiceError('Allocation not found.', 404);
    }

    const deps = await this.repo.getDependencyCounts(id);
    if (deps.timetables > 0) {
      throw new AllocationServiceError(`Cannot archive allocation: it is actively assigned to ${deps.timetables} timetable slot(s).`, 400);
    }

    await this.repo.softDelete(id, institutionId, userId);
  }

  async restoreAllocation(id: string, institutionId: string, userId?: string): Promise<void> {
    const existing = await this.repo.findById(id, institutionId);
    if (!existing) {
      throw new AllocationServiceError('Allocation not found.', 404);
    }

    await this.validateLineageAndActiveStatus(
      institutionId, 
      existing.teacher_id, 
      existing.subject_id, 
      existing.section_id, 
      existing.academic_year_id
    );

    // Recheck duplicate active allocation
    const isDuplicate = await this.repo.checkDuplicateAllocation(
      existing.teacher_id, 
      existing.subject_id, 
      existing.section_id, 
      existing.academic_year_id, 
      id
    );
    if (isDuplicate) {
      throw new AllocationServiceError('Cannot restore allocation: another active allocation already exists for this mapping.', 400);
    }

    await this.repo.restore(id, institutionId, userId);

    if (existing.primary_teacher === 1) {
      await this.repo.demoteOtherPrimaryTeachers(existing.subject_id, existing.section_id, existing.academic_year_id, id);
    }
  }

  async deleteAllocation(id: string, institutionId: string, userId?: string, force = false): Promise<void> {
    const existing = await this.repo.findById(id, institutionId);
    if (!existing) {
      throw new AllocationServiceError('Allocation not found.', 404);
    }

    const isLocked = await isYearLockedOrArchived(this.db, existing.academic_year_id);
    if (isLocked) {
      throw new AllocationServiceError('This academic year is locked or archived. Modifications are not allowed.', 400);
    }

    const deps = await this.repo.getDependencyCounts(id);
    if (deps.total > 0) {
      const parts: string[] = [];
      if (deps.timetables > 0) parts.push(`${deps.timetables} timetable slot(s)`);
      if (deps.attendance > 0) parts.push(`${deps.attendance} attendance session(s)`);

      const msg = `Cannot delete teaching allocation for '${existing.teacher_name}' (${existing.subject_code} - ${existing.section_name}): it is referenced by ${parts.join(', ')}.`;
      throw new AllocationServiceError(msg, 409);
    }

    if (force) {
      await this.repo.hardDelete(id, institutionId);
    } else {
      await this.repo.softDelete(id, institutionId, userId);
    }
  }
}
