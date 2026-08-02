import { MedicalRepository } from './medical.repository';
import { CreateHealthVisitInput, CreateImmunizationInput, CreateHealthIncidentInput, MedicalSummary } from './medical.types';

export class MedicalServiceError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

export class MedicalService {
  constructor(private repo: MedicalRepository) {}

  async getSummary(studentId: string, institutionId: string): Promise<MedicalSummary> {
    const student = await this.repo.getStudentSummaryFields(studentId, institutionId);
    if (!student) throw new MedicalServiceError('Student not found.', 404);

    const [visits, immunizations, incidents] = await Promise.all([
      this.repo.listVisits(studentId, institutionId),
      this.repo.listImmunizations(studentId, institutionId),
      this.repo.listIncidents(studentId, institutionId),
    ]);

    return {
      student_id: studentId,
      blood_group: student.blood_group,
      emergency_contact: student.emergency_contact,
      medical_notes: student.medical_notes,
      visits,
      immunizations,
      incidents,
    };
  }

  async addVisit(studentId: string, institutionId: string, input: CreateHealthVisitInput, userId?: string): Promise<string> {
    if (!input.reason || input.reason.trim().length === 0) {
      throw new MedicalServiceError('Visit reason is required.', 400);
    }
    const student = await this.repo.getStudentSummaryFields(studentId, institutionId);
    if (!student) throw new MedicalServiceError('Student not found.', 404);
    const id = crypto.randomUUID();
    await this.repo.createVisit(id, institutionId, studentId, input, userId);
    return id;
  }

  async deleteVisit(institutionId: string, id: string): Promise<void> {
    await this.repo.deleteVisit(id, institutionId);
  }

  async addImmunization(studentId: string, institutionId: string, input: CreateImmunizationInput, userId?: string): Promise<string> {
    if (!input.vaccine_name || input.vaccine_name.trim().length === 0) {
      throw new MedicalServiceError('Vaccine name is required.', 400);
    }
    const student = await this.repo.getStudentSummaryFields(studentId, institutionId);
    if (!student) throw new MedicalServiceError('Student not found.', 404);
    const id = crypto.randomUUID();
    await this.repo.createImmunization(id, institutionId, studentId, input, userId);
    return id;
  }

  async deleteImmunization(institutionId: string, id: string): Promise<void> {
    await this.repo.deleteImmunization(id, institutionId);
  }

  async addIncident(studentId: string, institutionId: string, input: CreateHealthIncidentInput, userId?: string): Promise<string> {
    if (!input.description || input.description.trim().length === 0) {
      throw new MedicalServiceError('Incident description is required.', 400);
    }
    const student = await this.repo.getStudentSummaryFields(studentId, institutionId);
    if (!student) throw new MedicalServiceError('Student not found.', 404);
    const id = crypto.randomUUID();
    await this.repo.createIncident(id, institutionId, studentId, input, userId);
    return id;
  }

  async deleteIncident(institutionId: string, id: string): Promise<void> {
    await this.repo.deleteIncident(id, institutionId);
  }
}
