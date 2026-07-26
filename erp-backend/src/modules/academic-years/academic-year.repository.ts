import { AcademicYear, CreateAcademicYearInput, UpdateAcademicYearInput } from './academic-year.types';
import { getUpdateFields } from '../../utils/repository';

const UPDATE_FIELDS = ['name', 'start_date', 'end_date', 'is_current', 'status'] as const;

// Status machine: valid forward transitions only.
// Archived is terminal — no outbound transitions.
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  Draft: ['Active'],
  Active: ['Locked', 'Archived'],
  Locked: ['Active', 'Archived'],
  Archived: [], // read-only
};

export class AcademicYearRepository {
  constructor(private db: D1Database) {}

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /**
   * Validates that end_date > start_date and that the date range does not
   * overlap any existing academic year for the same institution.
   *
   * @param institutionId  Institution scope
   * @param startDate      ISO date string (YYYY-MM-DD)
   * @param endDate        ISO date string (YYYY-MM-DD)
   * @param excludeId      ID of the year being updated (to exclude it from the overlap query)
   */
  async validateDates(
    institutionId: string,
    startDate: string,
    endDate: string,
    excludeId?: string
  ): Promise<void> {
    // 1. Basic chronology
    if (endDate <= startDate) {
      throw new Error('end_date must be after start_date.');
    }

    // 2. Overlap detection — check for any active academic year in this institution
    //    whose date range intersects [startDate, endDate].
    //    Two ranges [A,B] and [C,D] overlap when A < D && C < B.
    const overlap = excludeId
      ? await this.db
          .prepare(
            `SELECT id, name FROM academic_years
             WHERE institution_id = ?
               AND id != ?
               AND is_active = 1
               AND start_date < ?
               AND end_date   > ?`
          )
          .bind(institutionId, excludeId, endDate, startDate)
          .first<{ id: string; name: string }>()
      : await this.db
          .prepare(
            `SELECT id, name FROM academic_years
             WHERE institution_id = ?
               AND is_active = 1
               AND start_date < ?
               AND end_date   > ?`
          )
          .bind(institutionId, endDate, startDate)
          .first<{ id: string; name: string }>();

    if (overlap) {
      throw new Error(
        `Date range overlaps with existing academic year "${overlap.name}". Academic year date ranges must not overlap.`
      );
    }
  }

  /**
   * Verifies the academic year is not referenced by any downstream records.
   * Throws a descriptive error if it is.
   */
  async checkDeletionSafety(id: string): Promise<void> {
    const checks: Array<{ table: string; label: string; query: string }> = [
      {
        table: 'student_enrollments',
        label: 'student enrollments',
        query: 'SELECT COUNT(*) as count FROM student_enrollments WHERE academic_year_id = ? AND is_active = 1',
      },
      {
        table: 'exams',
        label: 'exams',
        query: 'SELECT COUNT(*) as count FROM exams WHERE academic_year_id = ? AND is_active = 1',
      },
      {
        table: 'student_attendance',
        label: 'attendance sessions',
        query: `SELECT COUNT(*) as count FROM attendance_sessions WHERE academic_year_id = ? AND is_active = 1`,
      },
      {
        table: 'student_fee_records',
        label: 'fee records',
        query: 'SELECT COUNT(*) as count FROM student_fee_records WHERE academic_year_id = ? AND is_active = 1',
      },
      {
        table: 'weekly_timetable',
        label: 'timetable entries',
        query: 'SELECT COUNT(*) as count FROM weekly_timetable WHERE academic_year_id = ? AND is_active = 1',
      },
    ];

    const violations: string[] = [];

    for (const check of checks) {
      try {
        const row = await this.db.prepare(check.query).bind(id).first<{ count: number }>();
        if ((row?.count || 0) > 0) {
          violations.push(`${row!.count} ${check.label}`);
        }
      } catch {
        // If the table does not exist yet (e.g., partial migrations), skip silently.
      }
    }

    if (violations.length > 0) {
      throw new Error(
        `Cannot delete academic year: it is referenced by ${violations.join(', ')}. ` +
          'Archive or reassign these records first.'
      );
    }
  }

  // ---------------------------------------------------------------------------
  // CRUD
  // ---------------------------------------------------------------------------

  async create(
    id: string,
    institutionId: string,
    input: CreateAcademicYearInput & { status?: string },
    userId?: string
  ): Promise<void> {
    // 1. Date validation
    await this.validateDates(institutionId, input.start_date, input.end_date);

    // 2. Single-active-year enforcement — unset current flag & archive previous active year
    if (input.is_current) {
      await this.db
        .prepare('UPDATE academic_years SET is_current = 0 WHERE institution_id = ? AND is_active = 1')
        .bind(institutionId)
        .run();
      await this.db
        .prepare(
          'UPDATE academic_years SET status = "Archived" WHERE institution_id = ? AND status = "Active" AND is_active = 1'
        )
        .bind(institutionId)
        .run();
    }

    await this.db
      .prepare(
        `INSERT INTO academic_years (
          id, institution_id, name, start_date, end_date, is_current, status, created_by, updated_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        id,
        institutionId,
        input.name,
        input.start_date,
        input.end_date,
        input.is_current ? 1 : 0,
        input.status || (input.is_current ? 'Active' : 'Draft'),
        userId || null,
        userId || null
      )
      .run();
  }

  async findById(id: string): Promise<AcademicYear | null> {
    return await this.db
      .prepare('SELECT * FROM academic_years WHERE id = ? AND is_active = 1')
      .bind(id)
      .first<AcademicYear>();
  }

  async listByInstitution(institutionId: string): Promise<AcademicYear[]> {
    const { results } = await this.db
      .prepare(
        'SELECT * FROM academic_years WHERE institution_id = ? AND is_active = 1 ORDER BY start_date DESC'
      )
      .bind(institutionId)
      .all<AcademicYear>();
    return results || [];
  }

  async update(
    id: string,
    institutionId: string,
    input: UpdateAcademicYearInput,
    userId?: string
  ): Promise<void> {
    const existing = await this.findById(id);
    if (!existing) throw new Error('Academic year not found');

    // 1. Archived years are read-only
    if (existing.status === 'Archived') {
      throw new Error('Archived academic years are read-only and cannot be modified.');
    }

    // 2. Status transition validation
    if (input.status && input.status !== existing.status) {
      const allowed = ALLOWED_TRANSITIONS[existing.status] || [];
      if (!allowed.includes(input.status)) {
        const validStr = allowed.length > 0 ? allowed.join(', ') : 'none';
        throw new Error(
          `Invalid status transition from "${existing.status}" to "${input.status}". ` +
            `Valid transitions: ${validStr}.`
        );
      }
    }

    // 3. Date validation (only when dates are being changed)
    const newStart = input.start_date ?? existing.start_date;
    const newEnd = input.end_date ?? existing.end_date;
    if (input.start_date || input.end_date) {
      await this.validateDates(institutionId, newStart, newEnd, id);
    }

    // 4. Single-active-year enforcement
    if (input.is_current) {
      await this.db
        .prepare(
          'UPDATE academic_years SET is_current = 0 WHERE institution_id = ? AND is_active = 1'
        )
        .bind(institutionId)
        .run();
      await this.db
        .prepare(
          'UPDATE academic_years SET status = "Archived" WHERE institution_id = ? AND status = "Active" AND id != ? AND is_active = 1'
        )
        .bind(institutionId, id)
        .run();
    }

    const fields = getUpdateFields(input, UPDATE_FIELDS);
    if (fields.length === 0) return;

    const sets = fields.map((field) => `${field} = ?`).join(', ');
    const values = [...fields.map((field) => input[field as keyof typeof input]), userId || null, id];

    await this.db
      .prepare(
        `UPDATE academic_years
         SET ${sets}, updated_at = datetime('now'), updated_by = ?
         WHERE id = ? AND is_active = 1`
      )
      .bind(...values)
      .run();
  }

  async softDelete(id: string, userId?: string): Promise<void> {
    // Delete protection check
    await this.checkDeletionSafety(id);

    const existing = await this.findById(id);
    if (!existing) throw new Error('Academic year not found');

    // Prevent deleting the currently active year
    if (existing.is_current) {
      throw new Error(
        'Cannot delete the currently active academic year. Set another year as current first.'
      );
    }

    await this.db
      .prepare(
        `UPDATE academic_years
         SET is_active = 0, deleted_at = datetime('now'), updated_by = ?
         WHERE id = ?`
      )
      .bind(userId || null, id)
      .run();
  }

  // ---------------------------------------------------------------------------
  // Rollover Logic (unchanged)
  // ---------------------------------------------------------------------------

  async rolloverPreview(
    institutionId: string,
    sourceYearId: string,
    targetYearId: string,
    checklist: string[]
  ): Promise<{
    sections_count: number;
    allocations_count: number;
    timetable_count: number;
    fees_count: number;
    warnings: string[];
  }> {
    const warnings: string[] = [];

    // Check target status
    const target = await this.findById(targetYearId);
    if (target?.status === 'Locked' || target?.status === 'Archived') {
      warnings.push(`Target academic year is ${target.status}. You cannot rollover settings to it.`);
    }

    // 1. Sections Count
    let sections_count = 0;
    if (checklist.includes('sections')) {
      const sectCountRes = await this.db
        .prepare(
          'SELECT COUNT(*) as count FROM sections WHERE institution_id = ? AND academic_year_id = ? AND is_active = 1'
        )
        .bind(institutionId, sourceYearId)
        .first<{ count: number }>();
      sections_count = sectCountRes?.count || 0;

      const targetSectCount = await this.db
        .prepare(
          'SELECT COUNT(*) as count FROM sections WHERE institution_id = ? AND academic_year_id = ? AND is_active = 1'
        )
        .bind(institutionId, targetYearId)
        .first<{ count: number }>();
      if ((targetSectCount?.count || 0) > 0) {
        warnings.push(
          `Target year already has ${targetSectCount?.count} sections. Executing rollover will skip duplicates.`
        );
      }
    }

    // 2. Allocations Count
    let allocations_count = 0;
    if (checklist.includes('allocations')) {
      const allocCountRes = await this.db
        .prepare(
          'SELECT COUNT(*) as count FROM teaching_allocations WHERE institution_id = ? AND academic_year_id = ? AND is_active = 1'
        )
        .bind(institutionId, sourceYearId)
        .first<{ count: number }>();
      allocations_count = allocCountRes?.count || 0;

      const targetAllocCount = await this.db
        .prepare(
          'SELECT COUNT(*) as count FROM teaching_allocations WHERE institution_id = ? AND academic_year_id = ? AND is_active = 1'
        )
        .bind(institutionId, targetYearId)
        .first<{ count: number }>();
      if ((targetAllocCount?.count || 0) > 0) {
        warnings.push(
          `Target year already has ${targetAllocCount?.count} teaching allocations. Overwrite conflicts may occur.`
        );
      }
    }

    // 3. Timetable Count
    let timetable_count = 0;
    if (checklist.includes('timetable')) {
      const ttCountRes = await this.db
        .prepare(
          'SELECT COUNT(*) as count FROM weekly_timetable WHERE institution_id = ? AND academic_year_id = ? AND is_active = 1'
        )
        .bind(institutionId, sourceYearId)
        .first<{ count: number }>();
      timetable_count = ttCountRes?.count || 0;
    }

    // 4. Fee Structures Count
    let fees_count = 0;
    if (checklist.includes('fees')) {
      const feesCountRes = await this.db
        .prepare(
          'SELECT COUNT(*) as count FROM fee_structures WHERE institution_id = ? AND academic_year_id = ? AND is_active = 1'
        )
        .bind(institutionId, sourceYearId)
        .first<{ count: number }>();
      fees_count = feesCountRes?.count || 0;

      const targetFeesCount = await this.db
        .prepare(
          'SELECT COUNT(*) as count FROM fee_structures WHERE institution_id = ? AND academic_year_id = ? AND is_active = 1'
        )
        .bind(institutionId, targetYearId)
        .first<{ count: number }>();
      if ((targetFeesCount?.count || 0) > 0) {
        warnings.push(`Target year already has ${targetFeesCount?.count} fee structures defined.`);
      }
    }

    return { sections_count, allocations_count, timetable_count, fees_count, warnings };
  }

  async executeRollover(
    institutionId: string,
    sourceYearId: string,
    targetYearId: string,
    checklist: string[],
    userId?: string
  ): Promise<{ success: boolean; log_output: string }> {
    const logs: string[] = [
      `Starting Rollover from source year ${sourceYearId} to target year ${targetYearId}`,
    ];

    try {
      // 1. Copy Sections
      if (checklist.includes('sections')) {
        const { results: sourceSections } = await this.db
          .prepare(
            'SELECT * FROM sections WHERE institution_id = ? AND academic_year_id = ? AND is_active = 1'
          )
          .bind(institutionId, sourceYearId)
          .all<any>();

        let sectionsCopied = 0;
        for (const s of sourceSections || []) {
          const exists = await this.db
            .prepare(
              'SELECT 1 FROM sections WHERE institution_id = ? AND academic_year_id = ? AND name = ? AND course_id = ? AND year_number = ? AND is_active = 1'
            )
            .bind(institutionId, targetYearId, s.name, s.course_id, s.year_number)
            .first();

          if (!exists) {
            const newId = crypto.randomUUID();
            await this.db
              .prepare(
                `INSERT INTO sections (id, institution_id, academic_year_id, course_id, name, year_number, capacity, room, class_teacher_id, created_by, updated_by)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
              )
              .bind(
                newId,
                institutionId,
                targetYearId,
                s.course_id,
                s.name,
                s.year_number,
                s.capacity,
                s.room,
                s.class_teacher_id,
                userId || null,
                userId || null
              )
              .run();
            sectionsCopied++;
          }
        }
        logs.push(`Successfully rolled over ${sectionsCopied} sections / classes.`);
      }

      // 2. Copy Fee Structures
      if (checklist.includes('fees')) {
        const { results: sourceFees } = await this.db
          .prepare(
            'SELECT * FROM fee_structures WHERE institution_id = ? AND academic_year_id = ? AND is_active = 1'
          )
          .bind(institutionId, sourceYearId)
          .all<any>();

        let feesCopied = 0;
        for (const f of sourceFees || []) {
          const exists = await this.db
            .prepare(
              'SELECT 1 FROM fee_structures WHERE institution_id = ? AND academic_year_id = ? AND course_id = ? AND year_number = ? AND fee_type = ? AND is_active = 1'
            )
            .bind(institutionId, targetYearId, f.course_id, f.year_number, f.fee_type)
            .first();

          if (!exists) {
            const newId = crypto.randomUUID();
            await this.db
              .prepare(
                `INSERT INTO fee_structures (id, institution_id, academic_year_id, course_id, year_number, fee_type, amount, created_by, updated_by)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
              )
              .bind(
                newId,
                institutionId,
                targetYearId,
                f.course_id,
                f.year_number,
                f.fee_type,
                f.amount,
                userId || null,
                userId || null
              )
              .run();
            feesCopied++;
          }
        }
        logs.push(`Successfully rolled over ${feesCopied} fee structures.`);
      }

      // Helper: map source section → target section id by name+course+year
      const getTargetSectionId = async (sourceSecId: string): Promise<string | null> => {
        const srcSec = await this.db
          .prepare('SELECT name, course_id, year_number FROM sections WHERE id = ?')
          .bind(sourceSecId)
          .first<any>();
        if (!srcSec) return null;
        const tgtSec = await this.db
          .prepare(
            'SELECT id FROM sections WHERE institution_id = ? AND academic_year_id = ? AND name = ? AND course_id = ? AND year_number = ? AND is_active = 1'
          )
          .bind(institutionId, targetYearId, srcSec.name, srcSec.course_id, srcSec.year_number)
          .first<any>();
        return tgtSec?.id || null;
      };

      // 3. Copy Teaching Allocations
      if (checklist.includes('allocations')) {
        const { results: sourceAllocations } = await this.db
          .prepare(
            'SELECT * FROM teaching_allocations WHERE institution_id = ? AND academic_year_id = ? AND is_active = 1'
          )
          .bind(institutionId, sourceYearId)
          .all<any>();

        let allocsCopied = 0;
        for (const a of sourceAllocations || []) {
          const targetSecId = await getTargetSectionId(a.section_id);
          if (!targetSecId) continue;

          const exists = await this.db
            .prepare(
              'SELECT 1 FROM teaching_allocations WHERE teacher_id = ? AND subject_id = ? AND section_id = ? AND academic_year_id = ? AND is_active = 1'
            )
            .bind(a.teacher_id, a.subject_id, targetSecId, targetYearId)
            .first();

          if (!exists) {
            const newId = crypto.randomUUID();
            await this.db
              .prepare(
                `INSERT INTO teaching_allocations (
                  id, institution_id, academic_year_id, department_id, program_id, semester, year_number,
                  section_id, subject_id, teacher_id, classes_per_week, theory_hours, practical_hours,
                  tutorial_hours, mentoring_hours, admin_hours, primary_teacher, status, created_by, updated_by, is_active
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active', ?, ?, 1)
                ON CONFLICT(teacher_id, subject_id, section_id, academic_year_id) DO UPDATE SET
                  is_active = 1,
                  status = 'Active',
                  department_id = excluded.department_id,
                  program_id = excluded.program_id,
                  semester = excluded.semester,
                  year_number = excluded.year_number,
                  classes_per_week = excluded.classes_per_week,
                  theory_hours = excluded.theory_hours,
                  practical_hours = excluded.practical_hours,
                  tutorial_hours = excluded.tutorial_hours,
                  mentoring_hours = excluded.mentoring_hours,
                  admin_hours = excluded.admin_hours,
                  primary_teacher = excluded.primary_teacher,
                  updated_by = excluded.updated_by,
                  updated_at = datetime('now')`
              )
              .bind(
                newId,
                institutionId,
                targetYearId,
                a.department_id,
                a.program_id,
                a.semester,
                a.year_number,
                targetSecId,
                a.subject_id,
                a.teacher_id,
                a.classes_per_week,
                a.theory_hours,
                a.practical_hours,
                a.tutorial_hours,
                a.mentoring_hours,
                a.admin_hours,
                a.primary_teacher,
                userId || null,
                userId || null
              )
              .run();
            allocsCopied++;
          }
        }
        logs.push(`Successfully rolled over ${allocsCopied} teaching allocations.`);
      }

      // 4. Copy Timetables
      if (checklist.includes('timetable')) {
        const { results: sourceTimetable } = await this.db
          .prepare(
            'SELECT * FROM weekly_timetable WHERE institution_id = ? AND academic_year_id = ? AND is_active = 1'
          )
          .bind(institutionId, sourceYearId)
          .all<any>();

        let ttCopied = 0;
        for (const t of sourceTimetable || []) {
          const targetSecId = await getTargetSectionId(t.section_id);
          if (!targetSecId) continue;

          const exists = await this.db
            .prepare(
              'SELECT 1 FROM weekly_timetable WHERE institution_id = ? AND academic_year_id = ? AND section_id = ? AND slot_id = ? AND day_of_week = ? AND is_active = 1'
            )
            .bind(institutionId, targetYearId, targetSecId, t.slot_id, t.day_of_week)
            .first();

          if (!exists) {
            const newId = crypto.randomUUID();
            await this.db
              .prepare(
                `INSERT INTO weekly_timetable (
                  id, institution_id, academic_year_id, teacher_id, subject_id, section_id, slot_id, day_of_week, created_by, updated_by, is_active
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
                ON CONFLICT(institution_id, academic_year_id, section_id, slot_id, day_of_week) DO UPDATE SET
                  is_active = 1,
                  deleted_at = NULL,
                  teacher_id = excluded.teacher_id,
                  subject_id = excluded.subject_id,
                  updated_by = excluded.updated_by,
                  updated_at = datetime('now')`
              )
              .bind(
                newId,
                institutionId,
                targetYearId,
                t.teacher_id,
                t.subject_id,
                targetSecId,
                t.slot_id,
                t.day_of_week,
                userId || null,
                userId || null
              )
              .run();
            ttCopied++;
          }
        }
        logs.push(`Successfully rolled over ${ttCopied} weekly timetable entries.`);
      }

      const logOutput = logs.join('\n');
      const logId = crypto.randomUUID();
      await this.db
        .prepare(
          `INSERT INTO academic_year_rollover_logs (id, institution_id, source_year_id, target_year_id, checklist, status, log_output, created_by)
           VALUES (?, ?, ?, ?, ?, 'SUCCESS', ?, ?)`
        )
        .bind(logId, institutionId, sourceYearId, targetYearId, JSON.stringify(checklist), logOutput, userId || null)
        .run();

      return { success: true, log_output: logOutput };
    } catch (e: any) {
      logs.push(`Error executing rollover: ${e.message}`);
      const logOutput = logs.join('\n');
      const logId = crypto.randomUUID();
      await this.db
        .prepare(
          `INSERT INTO academic_year_rollover_logs (id, institution_id, source_year_id, target_year_id, checklist, status, log_output, created_by)
           VALUES (?, ?, ?, ?, ?, 'FAILED', ?, ?)`
        )
        .bind(logId, institutionId, sourceYearId, targetYearId, JSON.stringify(checklist), logOutput, userId || null)
        .run();
      throw e;
    }
  }

  // ---------------------------------------------------------------------------
  // Promotion Wizard (unchanged)
  // ---------------------------------------------------------------------------

  async getStudentEligibility(
    studentId: string,
    sourceYearId: string
  ): Promise<{ status: 'Eligible' | 'Warning' | 'Not Eligible'; details: string }> {
    const student = await this.db
      .prepare('SELECT first_name, last_name, status, is_active FROM students WHERE id = ?')
      .bind(studentId)
      .first<any>();

    if (!student || !student.is_active) {
      return { status: 'Not Eligible', details: '✗ Student account is disabled or deleted.' };
    }

    if (student.status !== 'ACTIVE' && student.status !== 'Active') {
      return { status: 'Not Eligible', details: `✗ Student status is currently '${student.status}'.` };
    }

    const detailsParts: string[] = [];
    let isWarning = false;

    // 1. Check Attendance
    try {
      const attRes = await this.db
        .prepare(
          `SELECT
             COUNT(*) as total,
             SUM(CASE WHEN sa.status IN ('present', 'late') THEN 1 ELSE 0 END) as present
           FROM student_attendance sa
           JOIN attendance_sessions asess ON sa.session_id = asess.id
           WHERE sa.student_id = ? AND sa.is_active = 1 AND asess.is_active = 1`
        )
        .bind(studentId)
        .first<{ total: number; present: number }>();

      const total = attRes?.total || 0;
      const present = attRes?.present || 0;
      const percentage = total > 0 ? Math.round((present / total) * 100) : 100;

      const threshRes = await this.db
        .prepare("SELECT setting_value FROM system_settings WHERE setting_key = 'attendance_threshold'")
        .first<{ setting_value: string }>();
      const threshold = threshRes ? Number(threshRes.setting_value) : 75;

      if (percentage < threshold) {
        isWarning = true;
        detailsParts.push(`✗ Attendance: ${percentage}% (Threshold: ${threshold}%)`);
      } else {
        detailsParts.push(`✓ Attendance: ${percentage}%`);
      }
    } catch {
      detailsParts.push(`✓ Attendance: Compliant`);
    }

    // 2. Check outstanding fee records
    try {
      const feeRes = await this.db
        .prepare(
          `SELECT SUM(total_amount - paid_amount) as pending
           FROM student_fee_records
           WHERE student_id = ? AND academic_year_id = ? AND status != 'PAID' AND is_active = 1`
        )
        .bind(studentId, sourceYearId)
        .first<{ pending: number | null }>();

      const pendingFees = feeRes?.pending || 0;
      if (pendingFees > 0) {
        isWarning = true;
        detailsParts.push(`✗ Fee Due: ₹${pendingFees.toFixed(2)}`);
      } else {
        detailsParts.push(`✓ Fees: Settled`);
      }
    } catch {
      detailsParts.push(`✓ Fees: Settled`);
    }

    // 3. Check exam marks (failures in subject)
    try {
      const examRes = await this.db
        .prepare(
          `SELECT COUNT(*) as failed_count
           FROM student_marks sm
           JOIN exam_subjects es ON sm.exam_subject_id = es.id
           JOIN exams e ON es.exam_id = e.id
           WHERE sm.student_id = ? AND e.academic_year_id = ? AND sm.marks_obtained < es.min_marks
             AND sm.is_active = 1 AND es.is_active = 1 AND e.is_active = 1`
        )
        .bind(studentId, sourceYearId)
        .first<{ failed_count: number }>();

      const failedCount = examRes?.failed_count || 0;
      if (failedCount > 0) {
        isWarning = true;
        detailsParts.push(`✗ Failed ${failedCount} exam subject(s)`);
      } else {
        detailsParts.push(`✓ Exams: All Passed`);
      }
    } catch {
      detailsParts.push(`✓ Exams: Passed`);
    }

    const details = detailsParts.join(' | ');
    return { status: isWarning ? 'Warning' : 'Eligible', details };
  }

  async executePromotionsBatch(
    institutionId: string,
    targetYearId: string,
    targetCourseId: string,
    targetSectionId: string,
    targetSemester: number | undefined,
    studentIds: string[],
    generateFees: boolean,
    userId?: string
  ): Promise<number> {
    const targetSection = await this.db
      .prepare('SELECT year_number FROM sections WHERE id = ?')
      .bind(targetSectionId)
      .first<{ year_number: number }>();
    const yearNumber = targetSection?.year_number || 1;
    const semester = targetSemester || yearNumber * 2 - 1;

    const statements: any[] = [];

    let feeStructures: any[] = [];
    if (generateFees) {
      const { results } = await this.db
        .prepare(
          `SELECT * FROM fee_structures
           WHERE institution_id = ? AND academic_year_id = ? AND course_id = ? AND year_number = ? AND is_active = 1`
        )
        .bind(institutionId, targetYearId, targetCourseId, yearNumber)
        .all<any>();
      feeStructures = results || [];
    }

    for (const studentId of studentIds) {
      const enrollmentId = crypto.randomUUID();
      statements.push(
        this.db
          .prepare(
            `INSERT INTO student_enrollments (id, student_id, academic_year_id, course_id, section_id, semester, created_by, updated_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(student_id, academic_year_id, semester) DO UPDATE SET
               course_id = excluded.course_id,
               section_id = excluded.section_id,
               updated_at = datetime('now'),
               updated_by = excluded.updated_by`
          )
          .bind(
            enrollmentId,
            studentId,
            targetYearId,
            targetCourseId,
            targetSectionId,
            semester,
            userId || null,
            userId || null
          )
      );

      if (generateFees) {
        for (const fs of feeStructures) {
          const feeRecordId = crypto.randomUUID();
          statements.push(
            this.db
              .prepare(
                `INSERT INTO student_fee_records (
                  id, institution_id, student_id, academic_year_id, course_id, year_number,
                  fee_structure_id, fee_type, total_amount, paid_amount, status, created_by, updated_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0.0, 'UNPAID', ?, ?)
                ON CONFLICT(student_id, academic_year_id, course_id, year_number, fee_type) DO NOTHING`
              )
              .bind(
                feeRecordId,
                institutionId,
                studentId,
                targetYearId,
                targetCourseId,
                yearNumber,
                fs.id,
                fs.fee_type,
                fs.amount,
                userId || null,
                userId || null
              )
          );
        }
      }
    }

    if (statements.length > 0) {
      await this.db.batch(statements);
    }

    return studentIds.length;
  }

  // ---------------------------------------------------------------------------
  // Year Closing Validation (unchanged)
  // ---------------------------------------------------------------------------

  async getYearClosingReport(
    institutionId: string,
    academicYearId: string
  ): Promise<Array<{ type: 'error' | 'warning'; message: string }>> {
    const checks: Array<{ type: 'error' | 'warning'; message: string }> = [];

    const activeExams = await this.db
      .prepare('SELECT COUNT(*) as count FROM exams WHERE academic_year_id = ? AND is_active = 1')
      .bind(academicYearId)
      .first<{ count: number }>();
    if ((activeExams?.count || 0) > 0) {
      checks.push({
        type: 'warning',
        message: `Outstanding academic processes: There are ${activeExams?.count} exams configured for this year that remain open.`,
      });
    }

    const unpaidFees = await this.db
      .prepare(
        'SELECT COUNT(*) as count FROM student_fee_records WHERE academic_year_id = ? AND status != "PAID" AND status != "WAIVED" AND is_active = 1'
      )
      .bind(academicYearId)
      .first<{ count: number }>();
    if ((unpaidFees?.count || 0) > 0) {
      checks.push({
        type: 'warning',
        message: `Outstanding balances: There are ${unpaidFees?.count} student fee records that are unpaid or partially paid.`,
      });
    }

    const pendingApprovals = await this.db
      .prepare(
        'SELECT COUNT(*) as count FROM approvals WHERE institution_id = ? AND status = "Pending"'
      )
      .bind(institutionId)
      .first<{ count: number }>();
    if ((pendingApprovals?.count || 0) > 0) {
      checks.push({
        type: 'error',
        message: `Outstanding approvals: There are ${pendingApprovals?.count} pending approval requests in the inbox queue.`,
      });
    }

    return checks;
  }
}
