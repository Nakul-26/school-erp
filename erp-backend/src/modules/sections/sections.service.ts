import { SectionRepository } from './sections.repository';
import { Section, SectionWithDetails, CreateSectionInput, UpdateSectionInput } from './sections.types';

export class SectionService {
  constructor(private repo: SectionRepository) {}

  private async checkNameUniqueness(
    institutionId: string, 
    name: string, 
    academicYearId: string, 
    courseId: string, 
    excludeSectionId?: string
  ): Promise<boolean> {
    const existing = await this.repo.listByInstitution(institutionId, {
      academic_year_id: academicYearId,
      course_id: courseId,
      is_active: '1' // Check against active ones
    });
    return !existing.some(s => s.name.trim().toLowerCase() === name.trim().toLowerCase() && s.id !== excludeSectionId);
  }

  async createSection(institutionId: string, input: CreateSectionInput, userId?: string): Promise<string> {
    if (!input.name || !input.academic_year_id || !input.course_id) {
      throw new Error('Name, academic year, and program/class are required.');
    }

    const isUnique = await this.checkNameUniqueness(institutionId, input.name, input.academic_year_id, input.course_id);
    if (!isUnique) {
      throw new Error(`Section name "${input.name}" already exists for this program/class in this academic year.`);
    }

    const id = crypto.randomUUID();
    await this.repo.create(id, institutionId, input, userId);
    return id;
  }

  async getSection(id: string): Promise<SectionWithDetails | null> {
    return await this.repo.findById(id);
  }

  async listSections(
    institutionId: string, 
    filters?: { academic_year_id?: string; course_id?: string; is_active?: string; search?: string }
  ): Promise<SectionWithDetails[]> {
    return await this.repo.listByInstitution(institutionId, filters);
  }

  async updateSection(id: string, input: UpdateSectionInput, userId?: string): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new Error('Section not found');
    }

    const checkName = input.name !== undefined ? input.name : existing.name;
    const checkAY = input.academic_year_id !== undefined ? input.academic_year_id : existing.academic_year_id;
    const checkCourse = input.course_id !== undefined ? input.course_id : existing.course_id;

    // Check name uniqueness if name, academic year, or course is changing
    if (
      (input.name !== undefined && input.name !== existing.name) ||
      (input.academic_year_id !== undefined && input.academic_year_id !== existing.academic_year_id) ||
      (input.course_id !== undefined && input.course_id !== existing.course_id)
    ) {
      const isUnique = await this.checkNameUniqueness(existing.institution_id, checkName, checkAY, checkCourse, id);
      if (!isUnique) {
        throw new Error(`Section name "${checkName}" already exists for this program/class in this academic year.`);
      }
    }

    // Validation: Prevent archiving if active student enrollments exist
    if (input.is_active === 0 && existing.student_count && existing.student_count > 0) {
      throw new Error(`Cannot archive section. Active student enrollments (${existing.student_count}) exist.`);
    }

    await this.repo.update(id, input, userId);
  }

  async deleteSection(id: string, userId?: string): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new Error('Section not found');
    }

    if (existing.student_count && existing.student_count > 0) {
      throw new Error(`Cannot delete section. Active student enrollments (${existing.student_count}) exist.`);
    }

    await this.repo.softDelete(id, userId);
  }
}
