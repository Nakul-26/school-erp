import { TranscriptRepository } from './transcript.repository';
import { GradesService } from '../grades/grades.service';
import { RawSemesterMarkRow, SemesterGpaResult, TranscriptResult } from './transcript.types';

export class TranscriptServiceError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

export class TranscriptService {
  constructor(private repo: TranscriptRepository, private gradesService: GradesService) {}

  // Public: reused by BacklogsService to validate a course before scanning it for backlogs.
  async requireCreditEnabledCourse(courseId: string, institutionId: string) {
    const course = await this.repo.getCourse(courseId);
    if (!course || course.institution_id !== institutionId) {
      throw new TranscriptServiceError('Program not found', 404);
    }
    if (course.credit_system_enabled !== 1) {
      throw new TranscriptServiceError('This program does not use the credit/GPA system', 400);
    }
    return course;
  }

  // Rows arrive ordered by subject_id, then exam start_date DESC — keep the latest exam per subject.
  private latestPerSubject(rows: RawSemesterMarkRow[]): RawSemesterMarkRow[] {
    const seen = new Set<string>();
    const out: RawSemesterMarkRow[] = [];
    for (const row of rows) {
      if (seen.has(row.subject_id)) continue;
      seen.add(row.subject_id);
      out.push(row);
    }
    return out;
  }

  private async buildSemesterResult(
    studentId: string,
    institutionId: string,
    courseId: string,
    academicYearId: string,
    academicYearName: string,
    semester: number
  ): Promise<SemesterGpaResult> {
    const scales = await this.gradesService.listScales(institutionId);
    const rows = await this.repo.getSemesterMarks(studentId, institutionId, courseId, academicYearId, semester);
    const subjectRows = this.latestPerSubject(rows);

    let weightedPoints = 0;
    let totalCredits = 0;
    let hasFailedAny = false;

    const subjects = subjectRows.map(row => {
      const percent = row.max_marks > 0 ? (row.marks_obtained / row.max_marks) * 100 : 0;
      const gradeInfo = this.gradesService.computeGrade(percent, scales);
      if (!gradeInfo.is_passing) hasFailedAny = true;

      const credits = row.credits ?? null;
      if (credits && credits > 0) {
        totalCredits += credits;
        weightedPoints += credits * gradeInfo.grade_point;
      }

      return {
        subject_id: row.subject_id,
        subject_code: row.subject_code,
        subject_name: row.subject_name,
        credits,
        exam_id: row.exam_id,
        exam_name: row.exam_name,
        marks_obtained: row.marks_obtained,
        max_marks: row.max_marks,
        percent: Math.round(percent * 10) / 10,
        grade: gradeInfo.grade,
        grade_point: gradeInfo.grade_point,
        is_passing: gradeInfo.is_passing,
      };
    });

    return {
      course_id: courseId,
      academic_year_id: academicYearId,
      academic_year_name: academicYearName,
      semester,
      subjects,
      total_credits: totalCredits,
      sgpa: totalCredits > 0 ? Math.round((weightedPoints / totalCredits) * 100) / 100 : null,
      result: subjects.length === 0 ? 'PASS' : (hasFailedAny ? 'FAIL' : 'PASS'),
    };
  }

  async getSemesterGpa(
    studentId: string,
    institutionId: string,
    courseId: string,
    academicYearId: string,
    semester: number
  ): Promise<SemesterGpaResult> {
    await this.requireCreditEnabledCourse(courseId, institutionId);
    const tuples = await this.repo.getSemesterTuples(studentId, institutionId, courseId);
    const match = tuples.find(t => t.academic_year_id === academicYearId && t.semester === semester);
    const academicYearName = match?.academic_year_name || '';
    return this.buildSemesterResult(studentId, institutionId, courseId, academicYearId, academicYearName, semester);
  }

  async getTranscript(studentId: string, institutionId: string, courseId: string): Promise<TranscriptResult> {
    const course = await this.requireCreditEnabledCourse(courseId, institutionId);
    const tuples = await this.repo.getSemesterTuples(studentId, institutionId, courseId);

    const semesters: SemesterGpaResult[] = [];
    let cumulativeWeightedPoints = 0;
    let cumulativeCredits = 0;

    for (const tuple of tuples) {
      const semResult = await this.buildSemesterResult(
        studentId, institutionId, courseId, tuple.academic_year_id, tuple.academic_year_name, tuple.semester
      );
      semesters.push(semResult);
      if (semResult.sgpa !== null) {
        cumulativeCredits += semResult.total_credits;
        cumulativeWeightedPoints += semResult.total_credits * semResult.sgpa;
      }
    }

    return {
      student_id: studentId,
      course_id: courseId,
      course_name: course.name,
      semesters,
      total_credits: cumulativeCredits,
      cgpa: cumulativeCredits > 0 ? Math.round((cumulativeWeightedPoints / cumulativeCredits) * 100) / 100 : null,
    };
  }
}
