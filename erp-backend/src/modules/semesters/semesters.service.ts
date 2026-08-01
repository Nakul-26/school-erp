import { SemesterRepository } from './semesters.repository';
import { Semester, SemesterWithDetails, CreateSemesterInput, UpdateSemesterInput, SemesterFilterOptions, SemesterDependencyCounts } from './semesters.types';

export class SemesterServiceError extends Error {
  constructor(message: string, public statusCode: number = 400) {
    super(message);
    this.name = 'SemesterServiceError';
  }
}

const STATUS_ORDER: Semester['status'][] = ['Draft', 'Active', 'Locked', 'Archived'];

export class SemesterService {
  constructor(private repo: SemesterRepository, private db: D1Database) {}

  private async validateCourseAndYear(institutionId: string, courseId: string, academicYearId: string): Promise<{ course: any }> {
    const course = await this.db.prepare('SELECT id, institution_id, is_active, semester_enabled, name FROM courses WHERE id = ?').bind(courseId).first<any>();
    if (!course || course.institution_id !== institutionId || course.is_active !== 1) {
      throw new SemesterServiceError('Selected program/course is invalid or archived for this institution.', 400);
    }
    if (course.semester_enabled !== 1) {
      throw new SemesterServiceError(`Semesters are not enabled for '${course.name}'. Enable the semester system for this program first.`, 400);
    }

    const ay = await this.db.prepare('SELECT id, institution_id, is_active FROM academic_years WHERE id = ?').bind(academicYearId).first<any>();
    if (!ay || ay.institution_id !== institutionId || ay.is_active !== 1) {
      throw new SemesterServiceError('Selected academic year is invalid or archived for this institution.', 400);
    }

    return { course };
  }

  async createSemester(institutionId: string, input: CreateSemesterInput, userId?: string): Promise<string> {
    if (!input.course_id || !input.academic_year_id) {
      throw new SemesterServiceError('Program and academic year are required.', 400);
    }
    const semesterNumber = Number(input.semester_number);
    if (!Number.isInteger(semesterNumber) || semesterNumber < 1 || semesterNumber > 20) {
      throw new SemesterServiceError('Semester number must be a whole number between 1 and 20.', 400);
    }

    const { course } = await this.validateCourseAndYear(institutionId, input.course_id, input.academic_year_id);

    const duplicate = await this.repo.findDuplicate(input.course_id, input.academic_year_id, semesterNumber);
    if (duplicate) {
      throw new SemesterServiceError(`Semester ${semesterNumber} already exists for '${course.name}' in this academic year.`, 400);
    }

    if (input.start_date && input.end_date && input.start_date > input.end_date) {
      throw new SemesterServiceError('Start date must be before end date.', 400);
    }

    const id = crypto.randomUUID();
    const name = input.name?.trim() || `Semester ${semesterNumber}`;
    await this.repo.create(id, institutionId, { ...input, semester_number: semesterNumber, name }, userId);
    return id;
  }

  async getSemester(id: string): Promise<SemesterWithDetails | null> {
    return await this.repo.findById(id);
  }

  async listSemesters(institutionId: string, filters?: SemesterFilterOptions): Promise<SemesterWithDetails[]> {
    return await this.repo.listByInstitution(institutionId, filters);
  }

  async getDependencies(semester: Semester): Promise<SemesterDependencyCounts> {
    return await this.repo.getDependencyCounts(semester.course_id, semester.academic_year_id, semester.semester_number);
  }

  async updateSemester(id: string, input: UpdateSemesterInput, userId?: string): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new SemesterServiceError('Semester not found', 404);
    }
    if (existing.status === 'Locked' || existing.status === 'Archived') {
      throw new SemesterServiceError(`Cannot edit a semester that is ${existing.status}.`, 400);
    }

    const startDate = input.start_date !== undefined ? input.start_date : existing.start_date;
    const endDate = input.end_date !== undefined ? input.end_date : existing.end_date;
    if (startDate && endDate && startDate > endDate) {
      throw new SemesterServiceError('Start date must be before end date.', 400);
    }

    await this.repo.update(id, input, userId);
  }

  async updateStatus(id: string, status: Semester['status'], userId?: string): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new SemesterServiceError('Semester not found', 404);
    }
    if (!STATUS_ORDER.includes(status)) {
      throw new SemesterServiceError('Invalid status.', 400);
    }
    if (existing.status === 'Archived') {
      throw new SemesterServiceError('Cannot change status of an archived semester.', 400);
    }
    await this.repo.updateStatus(id, status, userId);
  }

  async deleteSemester(id: string, userId?: string): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new SemesterServiceError('Semester not found', 404);
    }

    const deps = await this.getDependencies(existing);
    if (deps.total > 0) {
      const parts: string[] = [];
      if (deps.enrollments > 0) parts.push(`${deps.enrollments} student enrollment(s)`);
      if (deps.exams > 0) parts.push(`${deps.exams} exam(s)`);
      throw new SemesterServiceError(`Cannot delete semester ${existing.semester_number}: it is referenced by ${parts.join(', ')}.`, 409);
    }

    await this.repo.softDelete(id, userId);
  }
}
