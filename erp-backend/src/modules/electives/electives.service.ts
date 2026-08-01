import { ElectivesRepository } from './electives.repository';
import { PrerequisitesService } from '../prerequisites/prerequisites.service';
import { ElectiveOffering, ElectiveRosterEntry, RegisterElectiveInput, StudentElectiveChoice } from './electives.types';

export class ElectivesServiceError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

export class ElectivesService {
  constructor(private repo: ElectivesRepository, private prerequisitesService: PrerequisitesService) {}

  async registerElective(institutionId: string, studentId: string, input: RegisterElectiveInput, userId?: string): Promise<string> {
    if (!input.course_id || !input.academic_year_id || !input.semester || !input.subject_id) {
      throw new ElectivesServiceError('Program, academic year, semester, and subject are all required.', 400);
    }

    const subject = await this.repo.getSubject(institutionId, input.subject_id);
    if (!subject) throw new ElectivesServiceError('Subject not found.', 404);
    if (subject.is_elective !== 1) throw new ElectivesServiceError('This subject is not offered as an elective.', 400);
    if (subject.course_id !== input.course_id) throw new ElectivesServiceError('Subject does not belong to this program.', 400);
    if (subject.semester !== null && subject.semester !== input.semester) {
      throw new ElectivesServiceError(`This elective is offered in semester ${subject.semester}, not semester ${input.semester}.`, 400);
    }

    const enrolled = await this.repo.isEnrolled(studentId, input.course_id, input.academic_year_id, input.semester);
    if (!enrolled) throw new ElectivesServiceError('Student is not enrolled in this program/semester.', 400);

    const eligibility = await this.prerequisitesService.checkEligibility(studentId, institutionId, input.subject_id);
    if (!eligibility.is_eligible) {
      throw new ElectivesServiceError('Student does not meet the prerequisites for this elective.', 400);
    }

    const existing = await this.repo.findExisting(studentId, input.subject_id, input.academic_year_id, input.semester);
    if (existing) {
      if (existing.status === 'REGISTERED') {
        throw new ElectivesServiceError('Already registered for this elective.', 400);
      }
      await this.repo.reactivate(existing.id, userId);
      return existing.id;
    }

    const id = crypto.randomUUID();
    await this.repo.create(id, institutionId, studentId, input.course_id, input.academic_year_id, input.semester, input.subject_id, userId);
    return id;
  }

  async withdrawElective(institutionId: string, id: string, userId?: string): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing || existing.institution_id !== institutionId) {
      throw new ElectivesServiceError('Elective registration not found.', 404);
    }
    await this.repo.withdraw(id, userId);
  }

  async listOfferings(
    institutionId: string,
    courseId: string,
    semester: number,
    academicYearId: string,
    studentIdForEligibility?: string
  ): Promise<ElectiveOffering[]> {
    const subjects = await this.repo.listOfferedSubjects(institutionId, courseId, semester);
    const out: ElectiveOffering[] = [];

    for (const s of subjects) {
      const count = await this.repo.countRegistrations(courseId, academicYearId, semester, s.subject_id);
      let isRegistered = false;
      let isEligible = true;

      if (studentIdForEligibility) {
        const existing = await this.repo.findExisting(studentIdForEligibility, s.subject_id, academicYearId, semester);
        isRegistered = existing?.status === 'REGISTERED';
        const eligibility = await this.prerequisitesService.checkEligibility(studentIdForEligibility, institutionId, s.subject_id);
        isEligible = eligibility.is_eligible;
      }

      out.push({
        subject_id: s.subject_id,
        subject_code: s.subject_code,
        subject_name: s.subject_name,
        credits: s.credits,
        registered_count: count,
        is_registered: isRegistered,
        is_eligible: isEligible,
      });
    }

    return out;
  }

  async listForStudent(institutionId: string, studentId: string, courseId?: string): Promise<StudentElectiveChoice[]> {
    return this.repo.listForStudent(institutionId, studentId, courseId);
  }

  async listRoster(courseId: string, academicYearId: string, semester: number, subjectId: string): Promise<ElectiveRosterEntry[]> {
    return this.repo.listRoster(courseId, academicYearId, semester, subjectId);
  }
}
