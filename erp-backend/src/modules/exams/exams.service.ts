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

export class ExamsService {
  constructor(private repo: ExamsRepository) {}

  async createExam(institutionId: string, input: CreateExamInput, userId?: string): Promise<string> {
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

  async updateExam(id: string, input: UpdateExamInput, userId?: string): Promise<void> {
    await this.repo.update(id, input, userId);
  }

  async deleteExam(id: string, userId?: string): Promise<void> {
    await this.repo.softDelete(id, userId);
  }

  // --- EXAM SUBJECTS ---
  async addExamSubject(institutionId: string, examId: string, input: CreateExamSubjectInput, userId?: string): Promise<string> {
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
    if (!examSub) throw new Error('Exam subject not found');

    const exam = await this.repo.findById(examSub.exam_id);
    if (!exam) throw new Error('Exam not found');

    return await this.repo.getMarksheet(examSubjectId, exam.academic_year_id, exam.course_id, exam.semester);
  }

  async saveMarks(institutionId: string, examSubjectId: string, marks: EnterMarkInput[], userId?: string): Promise<void> {
    // Validate all marks before writing anything
    for (let i = 0; i < marks.length; i++) {
      const m = marks[i];
      if (m.marks_obtained === undefined || m.marks_obtained === null) continue;
      const obtained = Number(m.marks_obtained);
      const max = Number(m.max_marks);
      if (isNaN(obtained) || obtained < 0) {
        throw new Error(`Row ${i + 1}: marks_obtained cannot be negative (got ${m.marks_obtained})`);
      }
      if (max > 0 && obtained > max) {
        throw new Error(`Row ${i + 1}: marks_obtained (${obtained}) exceeds max_marks (${max})`);
      }
    }
    await this.repo.saveMarks(institutionId, examSubjectId, marks, userId);
  }


  // --- RESULTS CALCULATION ---
  private calculateGrade(percentage: number): string {
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B';
    if (percentage >= 60) return 'C';
    if (percentage >= 50) return 'D';
    if (percentage >= 40) return 'E';
    return 'F';
  }

  async getStudentResult(studentId: string, examId: string, studentName: string, rollNumber: string | null, admissionNumber: string): Promise<StudentExamResult | null> {
    const exam = await this.repo.findById(examId);
    if (!exam) return null;

    const marks = await this.repo.getStudentExamMarks(studentId, examId);
    if (marks.length === 0) return null;

    let totalObtained = 0;
    let totalMax = 0;
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
    const grade = this.calculateGrade(percentage);

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
      result: hasFailedAny ? 'FAIL' : 'PASS'
    };
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
      const grade = this.calculateGrade(percentage);

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
        result: hasFailedAny ? 'FAIL' : 'PASS'
      });
    }

    return results;
  }

  async listExamsForStudent(studentId: string): Promise<any[]> {
    return await this.repo.listExamsForStudent(studentId);
  }
}
