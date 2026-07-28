import { WeeklyTimetableRepository } from './weekly-timetable.repository';
import { WeeklyTimetableEntry, CreateWeeklyTimetableInput, UpdateWeeklyTimetableInput } from './weekly-timetable.types';

export class WeeklyTimetableServiceError extends Error {
  constructor(message: string, public statusCode: number = 400) {
    super(message);
    this.name = 'WeeklyTimetableServiceError';
  }
}

export class WeeklyTimetableService {
  constructor(private repo: WeeklyTimetableRepository, private db?: D1Database) {}

  private async validateConflictsAndAllocation(
    institutionId: string,
    sectionId: string,
    subjectId: string,
    teacherId: string | null | undefined,
    slotId: string,
    dayOfWeek: string,
    academicYearId: string,
    roomNumber?: string | null,
    excludeEntryId?: string
  ): Promise<void> {
    if (!this.db) return;

    // Fetch entity metadata
    const [sec, sub] = await Promise.all([
      this.db.prepare('SELECT name, course_id FROM sections WHERE id = ? AND institution_id = ? AND is_active = 1').bind(sectionId, institutionId).first<any>(),
      this.db.prepare('SELECT subject_name, course_id FROM subjects WHERE id = ? AND institution_id = ? AND is_active = 1').bind(subjectId, institutionId).first<any>()
    ]);

    if (!sec || !sub) {
      throw new WeeklyTimetableServiceError('Invalid section or subject specified.', 400);
    }

    if (sub.course_id !== sec.course_id) {
      throw new WeeklyTimetableServiceError(`Subject '${sub.subject_name}' does not belong to section '${sec.name}' program.`, 400);
    }

    // 1. Section Conflict Check (409 Conflict)
    const secConflict = await this.repo.findSectionConflict(sectionId, slotId, dayOfWeek, academicYearId, excludeEntryId);
    if (secConflict) {
      throw new WeeklyTimetableServiceError(`Section '${sec.name}' already has a class ('${secConflict.subject_name}') scheduled on ${dayOfWeek} at this time slot.`, 409);
    }

    // 2. Teacher Conflict & Teaching Allocation Check
    if (teacherId) {
      const teacher = await this.db.prepare("SELECT (first_name || ' ' || last_name) as name FROM teachers WHERE id = ? AND institution_id = ? AND is_active = 1").bind(teacherId, institutionId).first<any>();
      if (!teacher) {
        throw new WeeklyTimetableServiceError('Teacher profile not found or inactive.', 400);
      }

      // Check allocation
      const isAllocated = await this.repo.checkTeacherAllocation(teacherId, subjectId, sectionId, institutionId);
      if (!isAllocated) {
        throw new WeeklyTimetableServiceError(`Teacher '${teacher.name}' is not assigned to teach '${sub.subject_name}' for section '${sec.name}'.`, 400);
      }

      // Check teacher schedule conflict
      const tConflict = await this.repo.findTeacherConflict(teacherId, slotId, dayOfWeek, academicYearId, excludeEntryId);
      if (tConflict) {
        throw new WeeklyTimetableServiceError(`Teacher '${teacher.name}' is already assigned to section '${tConflict.section_name}' (${tConflict.subject_name}) on ${dayOfWeek} at this time slot.`, 400);
      }
    }

    // 3. Room Conflict Check
    if (roomNumber && roomNumber.trim()) {
      const roomConflict = await this.repo.findRoomConflict(roomNumber.trim(), slotId, dayOfWeek, academicYearId, excludeEntryId);
      if (roomConflict) {
        throw new WeeklyTimetableServiceError(`Room '${roomNumber.trim()}' is already occupied by section '${roomConflict.section_name}' (${roomConflict.subject_name}) on ${dayOfWeek} at this time slot.`, 400);
      }
    }
  }

  async createEntry(institutionId: string, input: CreateWeeklyTimetableInput, userId?: string): Promise<string> {
    if (!input.section_id || !input.subject_id || !input.slot_id || !input.day_of_week || !input.academic_year_id) {
      throw new WeeklyTimetableServiceError('Academic year, section, subject, period slot, and day of week are required.', 400);
    }

    await this.validateConflictsAndAllocation(
      institutionId,
      input.section_id,
      input.subject_id,
      input.teacher_id,
      input.slot_id,
      input.day_of_week,
      input.academic_year_id,
      input.room_number
    );

    const id = crypto.randomUUID();
    return await this.repo.create(id, institutionId, input, userId);
  }

  async getEntry(id: string): Promise<WeeklyTimetableEntry | null> {
    return await this.repo.findById(id);
  }

  async listEntries(institutionId: string): Promise<WeeklyTimetableEntry[]> {
    return await this.repo.listByInstitution(institutionId);
  }

  async listEntriesBySection(institutionId: string, sectionId: string): Promise<WeeklyTimetableEntry[]> {
    return await this.repo.listBySection(institutionId, sectionId);
  }

  async listEntriesByTeacher(institutionId: string, teacherId: string): Promise<WeeklyTimetableEntry[]> {
    return await this.repo.listByTeacher(institutionId, teacherId);
  }

  async updateEntry(id: string, institutionId: string, input: UpdateWeeklyTimetableInput, userId?: string): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing || existing.institution_id !== institutionId) {
      throw new WeeklyTimetableServiceError('Timetable entry not found.', 404);
    }

    const checkSection = input.section_id || existing.section_id;
    const checkSubject = input.subject_id || existing.subject_id;
    const checkTeacher = input.hasOwnProperty('teacher_id') ? input.teacher_id : existing.teacher_id;
    const checkSlot = input.slot_id || existing.slot_id;
    const checkDay = input.day_of_week || existing.day_of_week;
    const checkAY = input.academic_year_id || existing.academic_year_id;
    const checkRoom = input.room_number !== undefined ? input.room_number : existing.room_number;

    await this.validateConflictsAndAllocation(
      institutionId,
      checkSection,
      checkSubject,
      checkTeacher,
      checkSlot,
      checkDay,
      checkAY,
      checkRoom,
      id
    );

    await this.repo.update(id, input, userId);
  }

  async deleteEntry(id: string, institutionId: string, userId?: string): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing || existing.institution_id !== institutionId) {
      throw new WeeklyTimetableServiceError('Timetable entry not found.', 404);
    }
    await this.repo.softDelete(id, userId);
  }
}
