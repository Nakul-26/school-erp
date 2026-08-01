import { PrerequisitesRepository } from './prerequisites.repository';
import { GradesService } from '../grades/grades.service';
import { CreatePrerequisiteInput, PrerequisiteEligibility, PrerequisiteLink, SubjectEligibility } from './prerequisites.types';

export class PrerequisitesServiceError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

export class PrerequisitesService {
  constructor(private repo: PrerequisitesRepository, private gradesService: GradesService) {}

  async listForCourse(institutionId: string, courseId: string): Promise<PrerequisiteLink[]> {
    return this.repo.listForCourse(institutionId, courseId);
  }

  async addPrerequisite(institutionId: string, input: CreatePrerequisiteInput, userId?: string): Promise<string> {
    if (!input.subject_id || !input.prerequisite_subject_id) {
      throw new PrerequisitesServiceError('Both the subject and the prerequisite subject are required.', 400);
    }
    if (input.subject_id === input.prerequisite_subject_id) {
      throw new PrerequisitesServiceError('A subject cannot be a prerequisite of itself.', 400);
    }

    const subject = await this.repo.getSubject(institutionId, input.subject_id);
    if (!subject) throw new PrerequisitesServiceError('Subject not found.', 404);

    const prerequisite = await this.repo.getSubject(institutionId, input.prerequisite_subject_id);
    if (!prerequisite) throw new PrerequisitesServiceError('Prerequisite subject not found.', 404);

    if (subject.course_id !== prerequisite.course_id) {
      throw new PrerequisitesServiceError('The prerequisite subject must belong to the same program.', 400);
    }

    const existing = await this.repo.findExisting(input.subject_id, input.prerequisite_subject_id);
    if (existing) {
      throw new PrerequisitesServiceError('This prerequisite link already exists.', 400);
    }

    if (await this.repo.wouldCreateCycle(input.subject_id, input.prerequisite_subject_id)) {
      throw new PrerequisitesServiceError('This link would create a circular prerequisite chain.', 400);
    }

    const id = crypto.randomUUID();
    await this.repo.create(id, institutionId, input.subject_id, input.prerequisite_subject_id, userId);
    return id;
  }

  async removePrerequisite(institutionId: string, id: string): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing || existing.institution_id !== institutionId) {
      throw new PrerequisitesServiceError('Prerequisite link not found.', 404);
    }
    await this.repo.remove(id);
  }

  async checkEligibility(studentId: string, institutionId: string, subjectId: string): Promise<SubjectEligibility> {
    const links = await this.repo.listForSubject(institutionId, subjectId);
    const scales = await this.gradesService.listScales(institutionId);

    const prerequisites: PrerequisiteEligibility[] = [];
    for (const link of links) {
      const attempt = await this.repo.getLatestAttempt(studentId, institutionId, link.prerequisite_subject_id);
      if (!attempt) {
        prerequisites.push({
          prerequisite_subject_id: link.prerequisite_subject_id,
          prerequisite_code: link.prerequisite_code,
          prerequisite_name: link.prerequisite_name,
          is_met: false,
          latest_grade: null,
          latest_percent: null,
        });
        continue;
      }

      const percent = attempt.max_marks > 0 ? (attempt.marks_obtained / attempt.max_marks) * 100 : 0;
      const gradeInfo = this.gradesService.computeGrade(percent, scales);
      prerequisites.push({
        prerequisite_subject_id: link.prerequisite_subject_id,
        prerequisite_code: link.prerequisite_code,
        prerequisite_name: link.prerequisite_name,
        is_met: gradeInfo.is_passing,
        latest_grade: gradeInfo.grade,
        latest_percent: Math.round(percent * 10) / 10,
      });
    }

    return {
      subject_id: subjectId,
      is_eligible: prerequisites.every(p => p.is_met),
      prerequisites,
    };
  }
}
