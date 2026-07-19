import { GradesRepository } from './grades.repository';
import { GradeScale, ReportCard, ReportCardSubject } from './grades.types';

export class GradesService {
  constructor(private repo: GradesRepository) {}

  async listScales(institutionId: string): Promise<GradeScale[]> {
    return await this.repo.listScales(institutionId);
  }

  async replaceScales(
    institutionId: string, 
    scales: Omit<GradeScale, 'id' | 'institution_id' | 'is_active' | 'created_at' | 'updated_at'>[], 
    userId: string
  ): Promise<void> {
    await this.repo.replaceScales(institutionId, scales, userId);
  }

  async seedDefaultScales(institutionId: string, userId: string): Promise<void> {
    const defaultScales = [
      { grade: 'A+', min_percent: 90, max_percent: 100, grade_point: 10.0, remarks: 'Outstanding', is_passing: 1, sort_order: 1 },
      { grade: 'A', min_percent: 80, max_percent: 89.99, grade_point: 9.0, remarks: 'Excellent', is_passing: 1, sort_order: 2 },
      { grade: 'B+', min_percent: 70, max_percent: 79.99, grade_point: 8.0, remarks: 'Very Good', is_passing: 1, sort_order: 3 },
      { grade: 'B', min_percent: 60, max_percent: 69.99, grade_point: 7.0, remarks: 'Good', is_passing: 1, sort_order: 4 },
      { grade: 'C', min_percent: 50, max_percent: 59.99, grade_point: 6.0, remarks: 'Average', is_passing: 1, sort_order: 5 },
      { grade: 'D', min_percent: 40, max_percent: 49.99, grade_point: 5.0, remarks: 'Pass', is_passing: 1, sort_order: 6 },
      { grade: 'F', min_percent: 0, max_percent: 39.99, grade_point: 0.0, remarks: 'Fail', is_passing: 0, sort_order: 7 },
    ];
    await this.repo.replaceScales(institutionId, defaultScales, userId);
  }

  computeGrade(percent: number, scales: GradeScale[]) {
    const scale = scales.find(s => percent >= s.min_percent && percent <= s.max_percent);
    if (scale) {
      return {
        grade: scale.grade,
        grade_point: scale.grade_point,
        remarks: scale.remarks,
        is_passing: scale.is_passing === 1
      };
    }
    return {
      grade: '—',
      grade_point: 0,
      remarks: null,
      is_passing: false
    };
  }

  async buildReportCard(examId: string, studentId: string): Promise<ReportCard> {
    const exam = await this.repo.getExamWithSubjects(examId);
    if (!exam) throw new Error('Exam not found');

    const scales = await this.repo.listScales(exam.institution_id);
    const marks = await this.repo.getMarksForStudentExam(studentId, examId);
    const students = await this.repo.getStudentsForExam(examId);
    const student = students.find(s => s.id === studentId);

    if (!student) {
      throw new Error('Student has no marks entered for this exam');
    }

    let totalMax = 0;
    let totalObtained = 0;
    const subjects: ReportCardSubject[] = [];
    let hasFailedAny = false;

    for (const m of marks) {
      totalMax += m.max_marks;
      totalObtained += m.marks_obtained;
      const percent = m.max_marks > 0 ? (m.marks_obtained / m.max_marks) * 100 : 0;
      const gradeInfo = this.computeGrade(percent, scales);

      if (!gradeInfo.is_passing) {
        hasFailedAny = true;
      }

      subjects.push({
        subject_id: m.subject_id,
        subject_name: m.subject_name,
        subject_code: m.subject_code,
        max_marks: m.max_marks,
        marks_obtained: m.marks_obtained,
        percent: Math.round(percent * 10) / 10,
        grade: gradeInfo.grade,
        grade_point: gradeInfo.grade_point,
        is_passing: gradeInfo.is_passing,
        remarks: m.remarks
      });
    }

    const overallPercent = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;
    const overallGradeInfo = this.computeGrade(overallPercent, scales);

    // Calculate Rank
    const allMarks = await this.repo.getAllMarksForExam(examId);
    const sorted = [...allMarks].sort((a, b) => b.total_obtained - a.total_obtained);
    const studentRankIndex = sorted.findIndex(item => item.student_id === studentId);
    const rank = studentRankIndex !== -1 ? studentRankIndex + 1 : null;

    const attendancePercent = await this.repo.getAttendancePercent(studentId);

    return {
      student: {
        id: student.id,
        first_name: student.first_name,
        last_name: student.last_name,
        roll_number: student.roll_number,
        admission_number: student.admission_number
      },
      exam: {
        id: exam.id,
        name: exam.name,
        academic_year: exam.academic_year_name,
        course: exam.course_name
      },
      subjects,
      total: {
        max_marks: totalMax,
        marks_obtained: totalObtained,
        percent: Math.round(overallPercent * 10) / 10,
        grade: overallGradeInfo.grade,
        grade_point: overallGradeInfo.grade_point,
        rank
      },
      attendance_percent: attendancePercent,
      result: hasFailedAny ? 'FAIL' : 'PASS'
    };
  }

  async buildAllReportCards(examId: string, institutionId: string): Promise<ReportCard[]> {
    const students = await this.repo.getStudentsForExam(examId);
    const reportCards: ReportCard[] = [];
    for (const student of students) {
      try {
        const rc = await this.buildReportCard(examId, student.id);
        reportCards.push(rc);
      } catch (err) {
        console.error(`Failed to build report card for student ${student.id}:`, err);
      }
    }
    return reportCards;
  }
}
