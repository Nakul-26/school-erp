import { DepartmentRepository } from './departments.repository';
import { Department, CreateDepartmentInput, UpdateDepartmentInput } from './departments.types';

export class DepartmentService {
  constructor(private repo: DepartmentRepository) {}

  async createDepartment(institutionId: string, input: CreateDepartmentInput, userId?: string): Promise<string> {
    if (!input.name || !input.code) {
      throw new Error('Name and Code are required');
    }
    const id = crypto.randomUUID();
    await this.repo.create(id, institutionId, input, userId);
    return id;
  }

  async getDepartment(id: string): Promise<Department | null> {
    return this.repo.findById(id);
  }

  async listDepartments(institutionId: string): Promise<Department[]> {
    return this.repo.listByInstitution(institutionId);
  }

  async updateDepartment(id: string, input: UpdateDepartmentInput, userId?: string): Promise<void> {
    await this.repo.update(id, input, userId);
  }

  async deleteDepartment(id: string, userId?: string): Promise<void> {
    await this.repo.softDelete(id, userId);
  }
}
