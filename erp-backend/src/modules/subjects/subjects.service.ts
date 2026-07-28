import { SubjectRepository } from './subjects.repository';
import { Subject, SubjectWithDetails, CreateSubjectInput, UpdateSubjectInput, SubjectFilterOptions, SubjectDependencyCounts } from './subjects.types';

export class SubjectServiceError extends Error {
  constructor(message: string, public statusCode: number = 400) {
    super(message);
    this.name = 'SubjectServiceError';
  }
}

const ALLOWED_TYPES = new Set(['Theory', 'Lab', 'Theory + Lab', 'Seminar', 'Project']);

export class SubjectService {
  constructor(private repo: SubjectRepository, private db?: D1Database) {}

  private async validateProgramAndSemester(
    institutionId: string, 
    courseId: string, 
    semester?: number | null
  ): Promise<any> {
    if (!this.db) return null;

    const course = await this.db.prepare('SELECT * FROM courses WHERE id = ?').bind(courseId).first<any>();
    if (!course || course.institution_id !== institutionId || course.is_active !== 1) {
      throw new SubjectServiceError('Selected program/course is invalid or archived for this institution.', 400);
    }

    if (semester !== undefined && semester !== null) {
      if (typeof semester !== 'number' || isNaN(semester) || semester <= 0) {
        throw new SubjectServiceError('Semester must be a positive integer.', 400);
      }

      const durationYears = course.duration_years || 4;
      const maxSemesters = course.semester_enabled === 1 ? durationYears * 2 : durationYears;

      if (semester > maxSemesters) {
        throw new SubjectServiceError(`Semester ${semester} exceeds the maximum allowed semester limit (${maxSemesters}) for program '${course.name}'.`, 400);
      }
    }

    return course;
  }

  private validateCreditsAndHours(
    credits?: number | null, 
    weeklyHours?: number | null, 
    theoryLab?: string
  ): void {
    if (credits !== undefined && credits !== null) {
      if (typeof credits !== 'number' || isNaN(credits) || credits < 0 || credits > 20) {
        throw new SubjectServiceError('Credits must be a number between 0 and 20.', 400);
      }
    }

    if (weeklyHours !== undefined && weeklyHours !== null) {
      if (typeof weeklyHours !== 'number' || isNaN(weeklyHours) || weeklyHours < 0 || weeklyHours > 60) {
        throw new SubjectServiceError('Weekly hours must be a number between 0 and 60.', 400);
      }
    }

    if (theoryLab && !ALLOWED_TYPES.has(theoryLab)) {
      throw new SubjectServiceError(`Invalid subject type '${theoryLab}'. Allowed types: Theory, Lab, Theory + Lab, Seminar, Project.`, 400);
    }

    // Rule: Lab credits <= weekly_hours
    if (
      theoryLab === 'Lab' && 
      credits !== undefined && credits !== null && 
      weeklyHours !== undefined && weeklyHours !== null && 
      weeklyHours > 0 && credits > weeklyHours
    ) {
      throw new SubjectServiceError(`For Lab subjects, credits (${credits}) cannot exceed weekly lab hours (${weeklyHours}).`, 400);
    }
  }

  async createSubject(institutionId: string, input: CreateSubjectInput, userId?: string): Promise<string> {
    if (!input.subject_code || !input.subject_code.trim()) {
      throw new SubjectServiceError('Subject code is required.', 400);
    }
    if (!input.subject_name || !input.subject_name.trim()) {
      throw new SubjectServiceError('Subject name is required.', 400);
    }
    if (!input.course_id) {
      throw new SubjectServiceError('Program/Course selection is required.', 400);
    }

    const codeUpper = input.subject_code.trim().toUpperCase();
    const nameTrimmed = input.subject_name.trim();

    await this.validateProgramAndSemester(institutionId, input.course_id, input.semester);
    this.validateCreditsAndHours(input.credits, input.weekly_hours, input.theory_lab);

    // Check duplicate code
    const dupCode = await this.repo.findDuplicateByCode(institutionId, input.course_id, codeUpper);
    if (dupCode) {
      throw new SubjectServiceError(`A subject with code '${codeUpper}' already exists for this program.`, 400);
    }

    // Check duplicate name
    const dupName = await this.repo.findDuplicateByName(institutionId, input.course_id, nameTrimmed);
    if (dupName) {
      throw new SubjectServiceError(`A subject with name '${nameTrimmed}' already exists for this program.`, 400);
    }

    const id = crypto.randomUUID();
    await this.repo.create(id, institutionId, {
      ...input,
      subject_code: codeUpper,
      subject_name: nameTrimmed,
      credits: input.credits ?? 3,
      semester: input.semester ?? 1,
      theory_lab: input.theory_lab || 'Theory'
    }, userId);

    return id;
  }

  async getSubject(id: string): Promise<SubjectWithDetails | null> {
    return await this.repo.findById(id);
  }

  async getDependencies(id: string): Promise<SubjectDependencyCounts> {
    return await this.repo.getDependencyCounts(id);
  }

  async listSubjects(institutionId: string, filters?: SubjectFilterOptions): Promise<SubjectWithDetails[]> {
    return await this.repo.listByInstitution(institutionId, filters);
  }

  async updateSubject(id: string, input: UpdateSubjectInput, userId?: string): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new SubjectServiceError('Subject not found.', 404);
    }

    const checkCode = input.subject_code !== undefined ? input.subject_code.trim().toUpperCase() : existing.subject_code;
    const checkName = input.subject_name !== undefined ? input.subject_name.trim() : existing.subject_name;
    const checkCourse = input.course_id !== undefined ? input.course_id : existing.course_id;
    const checkSemester = input.semester !== undefined ? input.semester : existing.semester;
    const checkCredits = input.credits !== undefined ? input.credits : existing.credits;
    const checkHours = input.weekly_hours !== undefined ? input.weekly_hours : existing.weekly_hours;
    const checkType = input.theory_lab !== undefined ? input.theory_lab : existing.theory_lab;

    await this.validateProgramAndSemester(existing.institution_id, checkCourse, checkSemester);
    this.validateCreditsAndHours(checkCredits, checkHours, checkType);

    // Rule 1: Code Immutability when references exist
    if (checkCode !== existing.subject_code) {
      const deps = await this.repo.getDependencyCounts(id);
      if (deps.total > 0) {
        throw new SubjectServiceError('Cannot modify subject code after creation because active downstream references (timetables/exams/assignments) exist.', 400);
      }

      const dupCode = await this.repo.findDuplicateByCode(existing.institution_id, checkCourse, checkCode, id);
      if (dupCode) {
        throw new SubjectServiceError(`A subject with code '${checkCode}' already exists for this program.`, 400);
      }
      input.subject_code = checkCode;
    }

    // Duplicate name check
    if (checkName.toUpperCase() !== existing.subject_name.toUpperCase()) {
      const dupName = await this.repo.findDuplicateByName(existing.institution_id, checkCourse, checkName, id);
      if (dupName) {
        throw new SubjectServiceError(`A subject with name '${checkName}' already exists for this program.`, 400);
      }
      input.subject_name = checkName;
    }

    // Rule 4: Archive protection
    if (input.is_active === 0) {
      const deps = await this.repo.getDependencyCounts(id);
      if (deps.timetables > 0 || deps.exams > 0 || deps.teacher_assignments > 0) {
        throw new SubjectServiceError(`Cannot archive subject '${existing.subject_name}': it is actively linked to timetables, exam schedules, or teacher allocations.`, 400);
      }
    }

    await this.repo.update(id, input, userId);
  }

  async archiveSubject(id: string, userId?: string): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new SubjectServiceError('Subject not found.', 404);
    }

    const deps = await this.repo.getDependencyCounts(id);
    if (deps.timetables > 0 || deps.exams > 0 || deps.teacher_assignments > 0) {
      throw new SubjectServiceError(`Cannot archive subject '${existing.subject_name}': it is actively linked to timetables, exam schedules, or teacher allocations.`, 400);
    }

    await this.repo.softDelete(id, userId);
  }

  async restoreSubject(id: string, userId?: string): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new SubjectServiceError('Subject not found.', 404);
    }
    await this.repo.restore(id, userId);
  }

  async deleteSubject(id: string, userId?: string, force = false): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new SubjectServiceError('Subject not found.', 404);
    }

    const deps = await this.repo.getDependencyCounts(id);
    if (deps.total > 0) {
      const parts: string[] = [];
      if (deps.teacher_assignments > 0) parts.push(`${deps.teacher_assignments} teacher assignment(s)`);
      if (deps.timetables > 0) parts.push(`${deps.timetables} timetable slot(s)`);
      if (deps.attendance > 0) parts.push(`${deps.attendance} attendance record(s)`);
      if (deps.exams > 0) parts.push(`${deps.exams} exam schedule(s)`);
      if (deps.grades > 0) parts.push(`${deps.grades} grade mark record(s)`);

      const msg = `Cannot delete subject '${existing.subject_name}' (${existing.subject_code}): it is referenced by ${parts.join(', ')}.`;
      throw new SubjectServiceError(msg, 409);
    }

    if (force) {
      await this.repo.hardDelete(id);
    } else {
      await this.repo.softDelete(id, userId);
    }
  }
}
