import { DepartmentRepository } from './departments.repository';
import { Department, CreateDepartmentInput, UpdateDepartmentInput } from './departments.types';

export class DepartmentService {
  constructor(private repo: DepartmentRepository) {}

  async createDepartment(institutionId: string, input: CreateDepartmentInput, userId?: string): Promise<string> {
    if (!input.name || !input.code) {
      throw new Error('Name and Code are required');
    }

    const codeUpper = input.code.trim().toUpperCase();
    const existing = await this.repo.findByCode(institutionId, codeUpper);
    if (existing) {
      throw new Error(`A department with code '${codeUpper}' already exists.`);
    }

    const id = crypto.randomUUID();
    await this.repo.create(id, institutionId, {
      ...input,
      code: codeUpper
    }, userId);
    return id;
  }

  async getDepartment(id: string): Promise<Department | null> {
    return this.repo.findById(id);
  }

  async listDepartments(institutionId: string, includeArchived = false): Promise<Department[]> {
    return this.repo.listByInstitution(institutionId, includeArchived);
  }

  async updateDepartment(id: string, input: UpdateDepartmentInput, userId?: string): Promise<void> {
    const existingDept = await this.repo.findById(id);
    if (!existingDept) {
      throw new Error('Department not found.');
    }

    if (input.code) {
      const codeUpper = input.code.trim().toUpperCase();
      if (codeUpper !== existingDept.code) {
        const duplicate = await this.repo.findByCode(existingDept.institution_id, codeUpper);
        if (duplicate) {
          throw new Error(`A department with code '${codeUpper}' already exists.`);
        }
        input.code = codeUpper;
      }
    }

    await this.repo.update(id, input, userId);
  }

  async deleteDepartment(id: string, userId?: string): Promise<void> {
    const links = await this.repo.hasLinkedActiveEntities(id);
    if (links.courses > 0 || links.teachers > 0) {
      let msg = 'Cannot archive department.';
      if (links.courses > 0) msg += ` ${links.courses} active course(s)/program(s) are linked.`;
      if (links.teachers > 0) msg += ` ${links.teachers} active teacher(s) are linked.`;
      throw new Error(msg);
    }

    await this.repo.softDelete(id, userId);
  }

  async restoreDepartment(id: string, userId?: string): Promise<void> {
    await this.repo.restore(id, userId);
  }
}
