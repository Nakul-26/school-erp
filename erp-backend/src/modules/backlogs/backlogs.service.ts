import { BacklogsRepository } from './backlogs.repository';
import { TranscriptService } from '../transcript/transcript.service';
import { TranscriptResult } from '../transcript/transcript.types';
import { BacklogSubject, StudentBacklogs } from './backlogs.types';

export class BacklogsService {
  constructor(private repo: BacklogsRepository, private transcriptService: TranscriptService) {}

  // A subject is an "open backlog" when the latest recorded attempt for it (transcript
  // already keeps only the latest exam per subject per semester tuple) is still failing.
  // If a later-dated supplementary exam records a passing mark for the same subject,
  // it naturally supersedes the failing one and the backlog disappears on its own.
  private extractOpenBacklogs(transcript: TranscriptResult): BacklogSubject[] {
    const out: BacklogSubject[] = [];
    for (const sem of transcript.semesters) {
      for (const sub of sem.subjects) {
        if (!sub.is_passing) {
          out.push({
            subject_id: sub.subject_id,
            subject_code: sub.subject_code,
            subject_name: sub.subject_name,
            credits: sub.credits,
            semester: sem.semester,
            academic_year_id: sem.academic_year_id,
            academic_year_name: sem.academic_year_name,
            exam_id: sub.exam_id,
            exam_name: sub.exam_name,
            marks_obtained: sub.marks_obtained,
            max_marks: sub.max_marks,
            percent: sub.percent,
            grade: sub.grade,
            grade_point: sub.grade_point,
          });
        }
      }
    }
    return out;
  }

  async getStudentBacklogs(studentId: string, institutionId: string, courseId: string): Promise<BacklogSubject[]> {
    const transcript = await this.transcriptService.getTranscript(studentId, institutionId, courseId);
    return this.extractOpenBacklogs(transcript);
  }

  async getCourseBacklogs(institutionId: string, courseId: string): Promise<StudentBacklogs[]> {
    await this.transcriptService.requireCreditEnabledCourse(courseId, institutionId);

    const students = await this.repo.getEnrolledStudents(institutionId, courseId);
    const out: StudentBacklogs[] = [];

    for (const student of students) {
      const transcript = await this.transcriptService.getTranscript(student.id, institutionId, courseId);
      const openBacklogs = this.extractOpenBacklogs(transcript);
      if (openBacklogs.length > 0) {
        out.push({
          student_id: student.id,
          student_name: `${student.first_name} ${student.last_name || ''}`.trim(),
          roll_number: student.roll_number,
          admission_number: student.admission_number,
          open_backlogs: openBacklogs,
          open_backlog_count: openBacklogs.length,
        });
      }
    }

    return out;
  }
}
