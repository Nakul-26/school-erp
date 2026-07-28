import { ProgramRepository } from './programs.repository';
import { Program, CreateProgramInput, UpdateProgramInput, ProgramFilterOptions, ProgramDependencyCounts } from './programs.types';

export class ProgramServiceError extends Error {
  constructor(message: string, public statusCode: number = 400) {
    super(message);
    this.name = 'ProgramServiceError';
  }
}

const ALLOWED_DEGREE_TYPES = new Set(['UG', 'PG', 'Diploma', 'Doctorate', 'Certificate', 'School']);
const ALLOWED_DURATION_UNITS = new Set(['Years', 'Semesters']);

export class ProgramService {
  constructor(private repo: ProgramRepository) {}

  private validateDurationAndDegree(duration_years: number, duration_unit?: string, degree_type?: string): void {
    if (typeof duration_years !== 'number' || isNaN(duration_years) || duration_years <= 0) {
      throw new ProgramServiceError('Duration must be a positive number greater than 0.', 400);
    }

    if (duration_unit && !ALLOWED_DURATION_UNITS.has(duration_unit)) {
      throw new ProgramServiceError(`Invalid duration unit '${duration_unit}'. Allowed units: Years, Semesters.`, 400);
    }

    if (degree_type && !ALLOWED_DEGREE_TYPES.has(degree_type)) {
      throw new ProgramServiceError(`Invalid degree type '${degree_type}'. Allowed types: UG, PG, Diploma, Doctorate, Certificate, School.`, 400);
    }
  }

  async createProgram(institutionId: string, input: CreateProgramInput, userId?: string): Promise<string> {
    if (!input.name || !input.name.trim()) {
      throw new ProgramServiceError('Program name is required', 400);
    }
    if (!input.course_code || !input.course_code.trim()) {
      throw new ProgramServiceError('Program code/identifier is required', 400);
    }

    const codeUpper = input.course_code.trim().toUpperCase();
    const nameTrimmed = input.name.trim();

    this.validateDurationAndDegree(input.duration_years, input.duration_unit, input.degree_type);

    // 1. Unique program code per institution
    const existingCode = await this.repo.findByCode(institutionId, codeUpper);
    if (existingCode) {
      throw new ProgramServiceError(`A program with code '${codeUpper}' already exists in this institution.`, 400);
    }

    // 2. Unique program name per institution
    const existingName = await this.repo.findByName(institutionId, nameTrimmed);
    if (existingName) {
      throw new ProgramServiceError(`A program with name '${nameTrimmed}' already exists in this institution.`, 400);
    }

    const id = crypto.randomUUID();
    await this.repo.create(id, institutionId, {
      ...input,
      name: nameTrimmed,
      course_code: codeUpper,
      duration_unit: input.duration_unit || 'Years',
      degree_type: input.degree_type || 'UG'
    }, userId);

    return id;
  }

  async getProgram(id: string): Promise<Program | null> {
    return this.repo.findById(id);
  }

  async getDependencies(id: string): Promise<ProgramDependencyCounts> {
    return this.repo.getDependencyCounts(id);
  }

  async listPrograms(institutionId: string, options: ProgramFilterOptions | boolean = false): Promise<Program[]> {
    return this.repo.listByInstitution(institutionId, options);
  }

  async updateProgram(id: string, input: UpdateProgramInput, userId?: string): Promise<void> {
    const existingProg = await this.repo.findById(id);
    if (!existingProg) {
      throw new ProgramServiceError('Program not found.', 404);
    }

    // 1. Validate duration & degree if updated
    const duration = input.duration_years !== undefined ? input.duration_years : existingProg.duration_years;
    const durationUnit = input.duration_unit !== undefined ? input.duration_unit : existingProg.duration_unit;
    const degreeType = input.degree_type !== undefined ? input.degree_type : existingProg.degree_type;
    this.validateDurationAndDegree(duration, durationUnit, degreeType);

    // 2. Program Code Immutability & Duplicate check
    if (input.course_code) {
      const codeUpper = input.course_code.trim().toUpperCase();
      if (codeUpper !== existingProg.course_code) {
        // Check downstream references before allowing code change
        const deps = await this.repo.getDependencyCounts(id);
        if (deps.total > 0) {
          throw new ProgramServiceError('Cannot modify program code after creation because downstream references (classes/subjects/students) exist.', 400);
        }

        const duplicateCode = await this.repo.findByCode(existingProg.institution_id, codeUpper, id);
        if (duplicateCode) {
          throw new ProgramServiceError(`A program with code '${codeUpper}' already exists in this institution.`, 400);
        }
        input.course_code = codeUpper;
      }
    }

    // 3. Name Duplicate check
    if (input.name) {
      const nameTrimmed = input.name.trim();
      if (nameTrimmed.toUpperCase() !== existingProg.name.toUpperCase()) {
        const duplicateName = await this.repo.findByName(existingProg.institution_id, nameTrimmed, id);
        if (duplicateName) {
          throw new ProgramServiceError(`A program with name '${nameTrimmed}' already exists in this institution.`, 400);
        }
        input.name = nameTrimmed;
      }
    }

    await this.repo.update(id, input, userId);
  }

  async archiveProgram(id: string, userId?: string): Promise<void> {
    const existingProg = await this.repo.findById(id);
    if (!existingProg) {
      throw new ProgramServiceError('Program not found.', 404);
    }
    await this.repo.softDelete(id, userId);
  }

  async deleteProgram(id: string, userId?: string, force = false): Promise<void> {
    const existingProg = await this.repo.findById(id);
    if (!existingProg) {
      throw new ProgramServiceError('Program not found.', 404);
    }

    const deps = await this.repo.getDependencyCounts(id);
    if (deps.total > 0) {
      const parts: string[] = [];
      if (deps.students > 0) parts.push(`${deps.students} student(s)`);
      if (deps.classes > 0) parts.push(`${deps.classes} class/section(s)`);
      if (deps.subjects > 0) parts.push(`${deps.subjects} subject(s)`);
      if (deps.teacher_assignments > 0) parts.push(`${deps.teacher_assignments} teacher assignment(s)`);
      if (deps.timetables > 0) parts.push(`${deps.timetables} timetable slot(s)`);

      const msg = `Cannot delete program '${existingProg.name}': it is referenced by ${parts.join(', ')}.`;
      throw new ProgramServiceError(msg, 409);
    }

    if (force) {
      await this.repo.hardDelete(id);
    } else {
      await this.repo.softDelete(id, userId);
    }
  }

  async restoreProgram(id: string, userId?: string): Promise<void> {
    const existingProg = await this.repo.findById(id);
    if (!existingProg) {
      throw new ProgramServiceError('Program not found.', 404);
    }
    await this.repo.restore(id, userId);
  }
}
