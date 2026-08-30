import { ExamsRepository } from './exams.repository';
import { 
  Exam, 
  ExamSubject, 
  CreateExamInput, 
  UpdateExamInput, 
  CreateExamSubjectInput, 
  EnterMarkInput, 
  StudentExamResult, 
  StudentSubjectResult 
} from './exams.types';

export class ExamsServiceError extends Error {
  constructor(message: string, public statusCode: number = 400) {
    super(message);
    this.name = 'ExamsServiceError';
  }
}

export class ExamsService {
  constructor(private repo: ExamsRepository, private db?: D1Database) {}

  private calculateGradeAndPoints(percentage: number): { grade: string; points: number } {
    if (percentage >= 90) return { grade: 'A+', points: 10 };
    if (percentage >= 80) return { grade: 'A', points: 9 };
    if (percentage >= 70) return { grade: 'B', points: 8 };
    if (percentage >= 60) return { grade: 'C', points: 7 };
    if (percentage >= 50) return { grade: 'D', points: 6 };
    if (percentage >= 40) return { grade: 'E', points: 5 };
    return { grade: 'F', points: 0 };
  }

  async createExam(institutionId: string, input: CreateExamInput, userId?: string): Promise<string> {
    if (!input.name || !input.academic_year_id || !input.course_id || !input.semester || !input.start_date || !input.end_date) {
      throw new ExamsServiceError('Name, academic year, course/program, semester, start date, and end date are required.', 400);
    }

    if (new Date(input.start_date) > new Date(input.end_date)) {
      throw new ExamsServiceError('Exam start date cannot be after end date.', 400);
    }

    if (this.db) {
      const ay = await this.db.prepare('SELECT id, is_active FROM academic_years WHERE id = ? AND institution_id = ? AND is_active = 1').bind(input.academic_year_id, institutionId).first();
      if (!ay) {
        throw new ExamsServiceError('Invalid or inactive academic year selected.', 400);
      }

      const course = await this.db.prepare('SELECT id FROM courses WHERE id = ? AND institution_id = ? AND is_active = 1').bind(input.course_id, institutionId).first();
      if (!course) {
        throw new ExamsServiceError('Invalid or inactive course/program selected.', 400);
      }
    }

    const id = crypto.randomUUID();
    await this.repo.create(id, institutionId, input, userId);
    return id;
  }

  async getExam(id: string): Promise<Exam | null> {
    return await this.repo.findById(id);
  }

  async listExams(institutionId: string): Promise<Exam[]> {
    return await this.repo.listByInstitution(institutionId);
  }

  async updateExam(id: string, input: UpdateExamInput, userId?: string, allowOverride = false): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new ExamsServiceError('Exam not found.', 404);
    }

    if (existing.status === 'COMPLETED' && input.status !== 'COMPLETED' && !allowOverride) {
      throw new ExamsServiceError('Completed exams are locked and cannot be reopened without override permission.', 403);
    }

    if (input.start_date && input.end_date && new Date(input.start_date) > new Date(input.end_date)) {
      throw new ExamsServiceError('Exam start date cannot be after end date.', 400);
    }

    await this.repo.update(id, input, userId);
  }

  async deleteExam(id: string, userId?: string): Promise<void> {
    await this.repo.softDelete(id, userId);
  }

  // --- EXAM SUBJECTS ---
  async addExamSubject(institutionId: string, examId: string, input: CreateExamSubjectInput, userId?: string): Promise<string> {
    const exam = await this.repo.findById(examId);
    if (!exam || exam.institution_id !== institutionId) {
      throw new ExamsServiceError('Exam not found.', 404);
    }

    if (input.max_marks <= 0) {
      throw new ExamsServiceError('Maximum marks must be greater than 0.', 400);
    }
    if (input.min_marks < 0 || input.min_marks > input.max_marks) {
      throw new ExamsServiceError('Passing (minimum) marks must be between 0 and maximum marks.', 400);
    }

    if (this.db) {
      const subject = await this.db.prepare('SELECT id, course_id, subject_name FROM subjects WHERE id = ? AND institution_id = ? AND is_active = 1').bind(input.subject_id, institutionId).first<any>();
      if (!subject) {
        throw new ExamsServiceError('Invalid or inactive subject specified.', 400);
      }
      if (subject.course_id !== exam.course_id) {
        throw new ExamsServiceError(`Subject '${subject.subject_name}' does not belong to the curriculum program of this exam.`, 400);
      }
    }

    const id = crypto.randomUUID();
    await this.repo.addSubject(id, institutionId, examId, input, userId);
    return id;
  }

  async listExamSubjects(examId: string): Promise<ExamSubject[]> {
    return await this.repo.listSubjects(examId);
  }

  async removeExamSubject(id: string, userId?: string): Promise<void> {
    await this.repo.removeSubject(id, userId);
  }

  // --- MARKS ---
  async getMarksheet(examSubjectId: string): Promise<any[]> {
    const examSub = await this.repo.findSubjectById(examSubjectId);
    if (!examSub) throw new ExamsServiceError('Exam subject not found', 404);

    const exam = await this.repo.findById(examSub.exam_id);
    if (!exam) throw new ExamsServiceError('Exam not found', 404);

    return await this.repo.getMarksheet(examSubjectId, exam.academic_year_id, exam.course_id, exam.semester);
  }

  async saveMarks(institutionId: string, examSubjectId: string, marks: EnterMarkInput[], userId?: string, allowOverride = false): Promise<void> {
    const examSub = await this.repo.findSubjectById(examSubjectId);
    if (!examSub || examSub.institution_id !== institutionId) {
      throw new ExamsServiceError('Exam subject not found.', 404);
    }

    const exam = await this.repo.findById(examSub.exam_id);
    if (!exam) throw new ExamsServiceError('Exam not found.', 404);

    if (exam.status === 'COMPLETED' && !allowOverride) {
      throw new ExamsServiceError('Marks for completed exams are locked and cannot be modified without override permission.', 403);
    }

    // Validate all marks, and default a missing max_marks to the exam subject's
    // configured max — student_marks.max_marks is NOT NULL, so a raw API caller
    // omitting it would otherwise fail with a raw D1 constraint error.
    for (let i = 0; i < marks.length; i++) {
      const m = marks[i];
      if (m.max_marks === undefined || m.max_marks === null) {
        m.max_marks = examSub.max_marks;
      }
      if (m.marks_obtained === undefined || m.marks_obtained === null) continue;
      const obtained = Number(m.marks_obtained);
      const max = Number(m.max_marks);
      if (isNaN(obtained) || obtained < 0) {
        throw new ExamsServiceError(`Row ${i + 1}: Obtained marks cannot be negative (got ${m.marks_obtained}).`, 400);
      }
      if (max > 0 && obtained > max) {
        throw new ExamsServiceError(`Row ${i + 1}: Obtained marks (${obtained}) exceed maximum allowed marks (${max}).`, 400);
      }
    }
    await this.repo.saveMarks(institutionId, examSubjectId, marks, userId);
  }

  // --- HALL TICKET ELIGIBILITY ---
  async checkHallTicketEligibility(institutionId: string, examId: string, studentId: string): Promise<any> {
    if (!this.db) {
      return { eligible: true, attendance_percentage: 100 };
    }

    const student = await this.db.prepare('SELECT id, first_name, last_name, status FROM students WHERE id = ? AND institution_id = ? AND is_active = 1').bind(studentId, institutionId).first<any>();
    if (!student || student.status !== 'ACTIVE') {
      return { eligible: false, reason: 'Student profile is inactive or non-enrolled.', attendance_percentage: 0 };
    }

    // Calculate student attendance percentage
    const attRow = await this.db.prepare(`
      SELECT 
        COUNT(sa.id) AS total_sessions,
        SUM(CASE WHEN sa.status IN ('present', 'late') THEN 1 ELSE 0 END) AS present_count
      FROM student_attendance sa
      WHERE sa.student_id = ? AND sa.institution_id = ? AND sa.is_active = 1
    `).bind(studentId, institutionId).first<any>();

    const total = attRow?.total_sessions || 0;
    const present = attRow?.present_count || 0;
    const percentage = total > 0 ? Math.round((present / total) * 10000) / 100 : 100;

    const isEligible = percentage >= 75;
    return {
      eligible: isEligible,
      attendance_percentage: percentage,
      reason: isEligible ? 'Eligible for Hall Ticket issuance' : `Attendance (${percentage}%) is below the mandatory 75% threshold.`
    };
  }

  // --- RESULTS CALCULATION ---
  async getStudentResult(studentId: string, examId: string, studentName: string, rollNumber: string | null, admissionNumber: string): Promise<StudentExamResult | null> {
    const exam = await this.repo.findById(examId);
    if (!exam) return null;

    const marks = await this.repo.getStudentExamMarks(studentId, examId);
    if (marks.length === 0) return null;

    let totalObtained = 0;
    let totalMax = 0;
    let totalPoints = 0;
    let countSubjects = 0;
    let hasFailedAny = false;

    const subjects: StudentSubjectResult[] = marks.map((m: any) => {
      const marksObtained = m.marks_obtained !== null ? Number(m.marks_obtained) : 0;
      const maxMarks = m.sm_max_marks !== null ? Number(m.sm_max_marks) : Number(m.es_max_marks);
      const minMarks = Number(m.es_min_marks);
      
      const isPassed = m.marks_obtained !== null && marksObtained >= minMarks;
      if (!isPassed) {
        hasFailedAny = true;
      }

      totalObtained += marksObtained;
      totalMax += maxMarks;

      const subPercentage = maxMarks > 0 ? (marksObtained / maxMarks) * 100 : 0;
      const { points } = this.calculateGradeAndPoints(subPercentage);
      totalPoints += points;
      countSubjects += 1;

      return {
        subject_id: m.subject_id,
        subject_name: m.subject_name,
        subject_code: m.subject_code,
        marks_obtained: marksObtained,
        max_marks: maxMarks,
        min_marks: minMarks,
        remarks: m.remarks,
        status: isPassed ? 'PASS' : 'FAIL'
      };
    });

    const percentage = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;
    const { grade } = this.calculateGradeAndPoints(percentage);
    const gpa = countSubjects > 0 ? Math.round((totalPoints / countSubjects) * 100) / 100 : 0;

    return {
      exam_id: exam.id,
      exam_name: exam.name,
      student_id: studentId,
      student_name: studentName,
      roll_number: rollNumber,
      admission_number: admissionNumber,
      subjects,
      total_obtained: totalObtained,
      total_max: totalMax,
      percentage: Math.round(percentage * 100) / 100,
      grade: hasFailedAny ? 'F' : grade,
      result: hasFailedAny ? 'FAIL' : 'PASS',
      gpa: hasFailedAny ? 0 : gpa
    } as any;
  }

  async getExamResults(examId: string): Promise<StudentExamResult[]> {
    const exam = await this.repo.findById(examId);
    if (!exam) return [];

    const rawMarks = await this.repo.getAllStudentsExamMarks(examId, exam.academic_year_id, exam.course_id, exam.semester);
    if (rawMarks.length === 0) return [];

    const studentGroups = new Map<string, any[]>();
    for (const row of rawMarks) {
      if (!studentGroups.has(row.student_id)) {
        studentGroups.set(row.student_id, []);
      }
      studentGroups.get(row.student_id)!.push(row);
    }

    const results: StudentExamResult[] = [];

    for (const [studentId, rows] of studentGroups.entries()) {
      const firstRow = rows[0];
      const studentName = firstRow.student_name;
      const rollNumber = firstRow.roll_number;
      const admissionNumber = firstRow.admission_number;

      let totalObtained = 0;
      let totalMax = 0;
      let totalPoints = 0;
      let countSubjects = 0;
      let hasFailedAny = false;

      const subjects: StudentSubjectResult[] = rows.map((m: any) => {
        const marksObtained = m.marks_obtained !== null ? Number(m.marks_obtained) : 0;
        const maxMarks = m.sm_max_marks !== null ? Number(m.sm_max_marks) : Number(m.es_max_marks);
        const minMarks = Number(m.es_min_marks);
        
        const isPassed = m.marks_obtained !== null && marksObtained >= minMarks;
        if (!isPassed) {
          hasFailedAny = true;
        }

        totalObtained += marksObtained;
        totalMax += maxMarks;

        const subPercentage = maxMarks > 0 ? (marksObtained / maxMarks) * 100 : 0;
        const { points } = this.calculateGradeAndPoints(subPercentage);
        totalPoints += points;
        countSubjects += 1;

        return {
          subject_id: m.subject_id,
          subject_name: m.subject_name,
          subject_code: m.subject_code,
          marks_obtained: marksObtained,
          max_marks: maxMarks,
          min_marks: minMarks,
          remarks: m.remarks,
          status: isPassed ? 'PASS' : 'FAIL'
        };
      });

      const percentage = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;
      const { grade } = this.calculateGradeAndPoints(percentage);
      const gpa = countSubjects > 0 ? Math.round((totalPoints / countSubjects) * 100) / 100 : 0;

      results.push({
        exam_id: exam.id,
        exam_name: exam.name,
        student_id: studentId,
        student_name: studentName,
        roll_number: rollNumber,
        admission_number: admissionNumber,
        subjects,
        total_obtained: totalObtained,
        total_max: totalMax,
        percentage: Math.round(percentage * 100) / 100,
        grade: hasFailedAny ? 'F' : grade,
        result: hasFailedAny ? 'FAIL' : 'PASS',
        gpa: hasFailedAny ? 0 : gpa
      } as any);
    }

    return results;
  }

  async listExamsForStudent(studentId: string): Promise<any[]> {
    return await this.repo.listExamsForStudent(studentId);
  }
}
