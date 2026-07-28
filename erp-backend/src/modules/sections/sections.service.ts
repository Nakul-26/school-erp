import { SectionRepository } from './sections.repository';
import { Section, SectionWithDetails, CreateSectionInput, UpdateSectionInput, SectionFilterOptions, SectionDependencyCounts } from './sections.types';

export class SectionServiceError extends Error {
  constructor(message: string, public statusCode: number = 400) {
    super(message);
    this.name = 'SectionServiceError';
  }
}

export class SectionService {
  constructor(private repo: SectionRepository, private db?: D1Database) {}

  private validateCapacity(capacity?: number | null): void {
    if (capacity !== undefined && capacity !== null) {
      if (typeof capacity !== 'number' || isNaN(capacity) || capacity < 1 || capacity > 500) {
        throw new SectionServiceError('Section capacity must be a positive number between 1 and 500.', 400);
      }
    }
  }

  private async validateProgramAndAcademicYear(institutionId: string, courseId: string, academicYearId: string): Promise<void> {
    if (!this.db) return;

    const course = await this.db.prepare('SELECT id, institution_id, is_active FROM courses WHERE id = ?').bind(courseId).first<any>();
    if (!course || course.institution_id !== institutionId || course.is_active !== 1) {
      throw new SectionServiceError('Selected program/course is invalid or archived for this institution.', 400);
    }

    const ay = await this.db.prepare('SELECT id, institution_id, is_active FROM academic_years WHERE id = ?').bind(academicYearId).first<any>();
    if (!ay || ay.institution_id !== institutionId || ay.is_active !== 1) {
      throw new SectionServiceError('Selected academic year is invalid or archived for this institution.', 400);
    }
  }

  async createSection(institutionId: string, input: CreateSectionInput, userId?: string): Promise<string> {
    if (!input.name || !input.name.trim() || !input.academic_year_id || !input.course_id) {
      throw new SectionServiceError('Name, academic year, and program/class are required.', 400);
    }

    const nameTrimmed = input.name.trim();
    const yearNumber = typeof input.year_number === 'number' && input.year_number > 0 ? input.year_number : 1;

    this.validateCapacity(input.capacity);
    await this.validateProgramAndAcademicYear(institutionId, input.course_id, input.academic_year_id);

    // 1. Duplicate Class Prevention per Institution + Program + Academic Year + Year Level + Section Name
    const duplicate = await this.repo.findDuplicateSection(
      institutionId, 
      input.course_id, 
      input.academic_year_id, 
      yearNumber, 
      nameTrimmed
    );

    if (duplicate) {
      throw new SectionServiceError(`A class/section named '${nameTrimmed}' already exists for this program and academic year at year level ${yearNumber}.`, 400);
    }

    const id = crypto.randomUUID();
    await this.repo.create(id, institutionId, {
      ...input,
      name: nameTrimmed,
      year_number: yearNumber,
      capacity: input.capacity || 40
    }, userId);

    return id;
  }

  async getSection(id: string): Promise<SectionWithDetails | null> {
    return await this.repo.findById(id);
  }

  async getDependencies(id: string): Promise<SectionDependencyCounts> {
    return await this.repo.getDependencyCounts(id);
  }

  async listSections(
    institutionId: string, 
    filters?: SectionFilterOptions
  ): Promise<SectionWithDetails[]> {
    return await this.repo.listByInstitution(institutionId, filters);
  }

  async updateSection(id: string, input: UpdateSectionInput, userId?: string): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new SectionServiceError('Section not found', 404);
    }

    const checkName = input.name !== undefined ? input.name.trim() : existing.name;
    const checkAY = input.academic_year_id !== undefined ? input.academic_year_id : existing.academic_year_id;
    const checkCourse = input.course_id !== undefined ? input.course_id : existing.course_id;
    const checkYearNumber = input.year_number !== undefined ? Number(input.year_number) : existing.year_number;

    this.validateCapacity(input.capacity);

    // Validate Program & AY if changed
    if (input.course_id || input.academic_year_id) {
      await this.validateProgramAndAcademicYear(existing.institution_id, checkCourse, checkAY);
    }

    // 2. Immutable Year/Semester & Program logic: Block changing course, year_number, or AY if references exist
    const isStructuralChange = 
      checkCourse !== existing.course_id || 
      checkYearNumber !== existing.year_number || 
      checkAY !== existing.academic_year_id;

    if (isStructuralChange) {
      const deps = await this.repo.getDependencyCounts(id);
      if (deps.total > 0) {
        throw new SectionServiceError('Cannot change Program, Academic Year, or Year/Semester level because active students, timetables, or attendance records exist.', 400);
      }
    }

    // 3. Duplicate section check
    if (
      checkName.toUpperCase() !== existing.name.toUpperCase() || isStructuralChange
    ) {
      const duplicate = await this.repo.findDuplicateSection(
        existing.institution_id, 
        checkCourse, 
        checkAY, 
        checkYearNumber, 
        checkName, 
        id
      );
      if (duplicate) {
        throw new SectionServiceError(`A class/section named '${checkName}' already exists for this program and academic year at year level ${checkYearNumber}.`, 400);
      }
    }

    // 4. Archive validation
    if (input.is_active === 0) {
      const deps = await this.repo.getDependencyCounts(id);
      if (deps.students > 0) {
        throw new SectionServiceError(`Cannot archive section. ${deps.students} active student enrollment(s) exist.`, 400);
      }
    }

    await this.repo.update(id, input, userId);
  }

  async archiveSection(id: string, userId?: string): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new SectionServiceError('Section not found', 404);
    }

    const deps = await this.repo.getDependencyCounts(id);
    if (deps.students > 0) {
      throw new SectionServiceError(`Cannot archive section. ${deps.students} active student enrollment(s) exist.`, 400);
    }

    await this.repo.softDelete(id, userId);
  }

  async restoreSection(id: string, userId?: string): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new SectionServiceError('Section not found', 404);
    }
    await this.repo.restore(id, userId);
  }

  async deleteSection(id: string, userId?: string, force = false): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new SectionServiceError('Section not found', 404);
    }

    const deps = await this.repo.getDependencyCounts(id);
    if (deps.total > 0) {
      const parts: string[] = [];
      if (deps.students > 0) parts.push(`${deps.students} student(s)`);
      if (deps.timetables > 0) parts.push(`${deps.timetables} timetable slot(s)`);
      if (deps.attendance > 0) parts.push(`${deps.attendance} attendance record(s)`);
      if (deps.teacher_assignments > 0) parts.push(`${deps.teacher_assignments} teacher assignment(s)`);

      const msg = `Cannot delete class/section '${existing.name}': it is referenced by ${parts.join(', ')}.`;
      throw new SectionServiceError(msg, 409);
    }

    if (force) {
      await this.repo.hardDelete(id);
    } else {
      await this.repo.softDelete(id, userId);
    }
  }
}
