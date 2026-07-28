import { StudentRepository } from './students.repository';
import { Student, CreateStudentInput, UpdateStudentInput, StudentFilterOptions, StudentDependencyCounts } from './students.types';

export class StudentServiceError extends Error {
  constructor(message: string, public statusCode: number = 400) {
    super(message);
    this.name = 'StudentServiceError';
  }
}

const VALID_STATUSES = new Set(['ACTIVE', 'GRADUATED', 'TRANSFERRED', 'WITHDRAWN', 'SUSPENDED', 'ALUMNI', 'APPLIED', 'ADMITTED']);

export class StudentService {
  constructor(private repo: StudentRepository, private db?: D1Database) {}

  private async validateUniqueIdentities(institutionId: string, input: any, excludeId?: string): Promise<void> {
    if (input.admission_number) {
      const codeUpper = input.admission_number.trim().toUpperCase();
      const dup = await this.repo.findDuplicateAdmissionNumber(institutionId, codeUpper, excludeId);
      if (dup) {
        throw new StudentServiceError(`Admission number '${codeUpper}' is already registered to another student.`, 400);
      }
      input.admission_number = codeUpper;
    }

    if (input.email && input.email.trim()) {
      const dupEmail = await this.repo.findDuplicateEmail(institutionId, input.email.trim(), excludeId);
      if (dupEmail) {
        throw new StudentServiceError(`Email '${input.email.trim()}' is already registered to another student.`, 400);
      }
      input.email = input.email.trim();
    }
  }

  private async validateRollNumberAndCapacity(
    institutionId: string,
    sectionId?: string,
    academicYearId?: string,
    courseId?: string,
    rollNumber?: string | null,
    excludeStudentId?: string
  ): Promise<void> {
    if (!this.db || !sectionId || !academicYearId) return;

    const section = await this.db.prepare('SELECT id, institution_id, course_id, academic_year_id, capacity, name, is_active FROM sections WHERE id = ?').bind(sectionId).first<any>();
    if (!section || section.institution_id !== institutionId || section.is_active !== 1) {
      throw new StudentServiceError('Selected class/section is invalid or archived.', 400);
    }

    if (courseId && section.course_id !== courseId) {
      const course = await this.db.prepare('SELECT name FROM courses WHERE id = ?').bind(courseId).first<any>();
      throw new StudentServiceError(`Selected section '${section.name}' does not belong to program '${course?.name || courseId}'.`, 400);
    }

    // Section Capacity Check
    if (section.capacity && section.capacity > 0 && !excludeStudentId) {
      const currentCount = await this.repo.getSectionStudentCount(sectionId, academicYearId);
      if (currentCount >= section.capacity) {
        throw new StudentServiceError(`Section '${section.name}' has reached its maximum capacity of ${section.capacity} students.`, 400);
      }
    }

    // Roll Number Uniqueness Check (409 Conflict)
    if (rollNumber && rollNumber.trim()) {
      const rollTrimmed = rollNumber.trim().toUpperCase();
      const dupRoll = await this.repo.findDuplicateRollNumber(sectionId, academicYearId, rollTrimmed, excludeStudentId);
      if (dupRoll) {
        throw new StudentServiceError(`Roll number '${rollTrimmed}' is already assigned to student '${dupRoll.first_name} ${dupRoll.last_name}' in section '${section.name}' for this academic year.`, 409);
      }
    }
  }

  async createStudent(institutionId: string, input: any, userId?: string): Promise<string> {
    if (!input.first_name || !input.first_name.trim()) {
      throw new StudentServiceError('First name is required.', 400);
    }
    if (!input.admission_number || !input.admission_number.trim()) {
      throw new StudentServiceError('Admission number is required.', 400);
    }

    input.first_name = input.first_name.trim();
    if (input.last_name) input.last_name = input.last_name.trim();

    await this.validateUniqueIdentities(institutionId, input);
    await this.validateRollNumberAndCapacity(
      institutionId,
      input.section_id,
      input.academic_year_id,
      input.course_id,
      input.roll_number
    );

    const id = crypto.randomUUID();
    await this.repo.create(id, institutionId, input, userId);
    return id;
  }

  async getStudent(id: string): Promise<any | null> {
    return await this.repo.findById(id);
  }

  async getDependencies(id: string): Promise<StudentDependencyCounts> {
    return await this.repo.getDependencyCounts(id);
  }

  async listStudents(
    institutionId: string,
    filters?: StudentFilterOptions
  ): Promise<{ students: any[]; total: number }> {
    return await this.repo.listByInstitution(institutionId, filters);
  }

  async updateStudent(id: string, institutionId: string, input: any, userId?: string): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing || existing.institution_id !== institutionId) {
      throw new StudentServiceError('Student not found.', 404);
    }

    if (input.status && !VALID_STATUSES.has(input.status.toUpperCase())) {
      throw new StudentServiceError(`Invalid student status '${input.status}'.`, 400);
    }

    await this.validateUniqueIdentities(institutionId, input, id);

    const checkSection = input.section_id || existing.section_id;
    const checkAY = input.academic_year_id || existing.academic_year_id;
    const checkCourse = input.course_id || existing.course_id;
    const checkRoll = input.roll_number !== undefined ? input.roll_number : existing.roll_number;

    if (checkSection && checkAY) {
      await this.validateRollNumberAndCapacity(institutionId, checkSection, checkAY, checkCourse, checkRoll, id);
    }

    await this.repo.update(id, input, userId);
  }

  async archiveStudent(id: string, institutionId: string, userId?: string): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing || existing.institution_id !== institutionId) {
      throw new StudentServiceError('Student not found.', 404);
    }

    const deps = await this.repo.getDependencyCounts(id);
    if (deps.attendance > 0 || deps.marks > 0) {
      throw new StudentServiceError(`Cannot archive student '${existing.first_name} ${existing.last_name}': active attendance or marks records exist.`, 400);
    }

    await this.repo.softDelete(id, userId);
  }

  async restoreStudent(id: string, institutionId: string, userId?: string): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing || existing.institution_id !== institutionId) {
      throw new StudentServiceError('Student not found.', 404);
    }
    await this.repo.restore(id, userId);
  }

  async deleteStudent(id: string, institutionId: string, userId?: string, force = false): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing || existing.institution_id !== institutionId) {
      throw new StudentServiceError('Student not found.', 404);
    }

    const deps = await this.repo.getDependencyCounts(id);
    if (deps.total > 0) {
      const parts: string[] = [];
      if (deps.attendance > 0) parts.push(`${deps.attendance} attendance record(s)`);
      if (deps.marks > 0) parts.push(`${deps.marks} mark record(s)`);
      if (deps.fee_records > 0) parts.push(`${deps.fee_records} fee record(s)`);

      const msg = `Cannot delete student '${existing.first_name} ${existing.last_name}' (${existing.admission_number}): referenced by ${parts.join(', ')}.`;
      throw new StudentServiceError(msg, 409);
    }

    if (force) {
      await this.repo.hardDelete(id);
    } else {
      await this.repo.softDelete(id, userId);
    }
  }
}
