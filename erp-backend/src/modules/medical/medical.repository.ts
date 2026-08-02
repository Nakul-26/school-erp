import { HealthVisit, CreateHealthVisitInput, Immunization, CreateImmunizationInput, HealthIncident, CreateHealthIncidentInput } from './medical.types';

export class MedicalRepository {
  constructor(private db: any) {}

  async getStudentSummaryFields(studentId: string, institutionId: string) {
    const row = await this.db.prepare(
      `SELECT id, blood_group, emergency_contact, medical_notes FROM students WHERE id = ? AND institution_id = ? AND is_active = 1`
    ).bind(studentId, institutionId).first();
    return row as { id: string; blood_group: string | null; emergency_contact: string | null; medical_notes: string | null } | null;
  }

  // ---- Visits ----
  async listVisits(studentId: string, institutionId: string): Promise<HealthVisit[]> {
    const res = await this.db.prepare(
      `SELECT * FROM student_health_visits WHERE student_id = ? AND institution_id = ? AND is_active = 1 ORDER BY visit_date DESC, created_at DESC`
    ).bind(studentId, institutionId).all();
    return (res.results || []) as HealthVisit[];
  }

  async createVisit(id: string, institutionId: string, studentId: string, input: CreateHealthVisitInput, userId?: string): Promise<void> {
    const now = new Date().toISOString();
    await this.db.prepare(`
      INSERT INTO student_health_visits (id, institution_id, student_id, visit_date, reason, diagnosis, treatment, referred_to, follow_up_date, recorded_by, created_at, updated_at, created_by, updated_by)
      VALUES (?, ?, ?, COALESCE(?, date('now')), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, institutionId, studentId, input.visit_date || null, input.reason,
      input.diagnosis || null, input.treatment || null, input.referred_to || null, input.follow_up_date || null,
      userId || null, now, now, userId || null, userId || null
    ).run();
  }

  async deleteVisit(id: string, institutionId: string): Promise<void> {
    await this.db.prepare(
      `UPDATE student_health_visits SET is_active = 0, updated_at = ? WHERE id = ? AND institution_id = ?`
    ).bind(new Date().toISOString(), id, institutionId).run();
  }

  // ---- Immunizations ----
  async listImmunizations(studentId: string, institutionId: string): Promise<Immunization[]> {
    const res = await this.db.prepare(
      `SELECT * FROM student_immunizations WHERE student_id = ? AND institution_id = ? AND is_active = 1 ORDER BY administered_date DESC, created_at DESC`
    ).bind(studentId, institutionId).all();
    return (res.results || []) as Immunization[];
  }

  async createImmunization(id: string, institutionId: string, studentId: string, input: CreateImmunizationInput, userId?: string): Promise<void> {
    const now = new Date().toISOString();
    await this.db.prepare(`
      INSERT INTO student_immunizations (id, institution_id, student_id, vaccine_name, dose_number, administered_date, next_due_date, administered_by, created_at, updated_at, created_by, updated_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, institutionId, studentId, input.vaccine_name, input.dose_number ?? null,
      input.administered_date || null, input.next_due_date || null, input.administered_by || null,
      now, now, userId || null, userId || null
    ).run();
  }

  async deleteImmunization(id: string, institutionId: string): Promise<void> {
    await this.db.prepare(
      `UPDATE student_immunizations SET is_active = 0, updated_at = ? WHERE id = ? AND institution_id = ?`
    ).bind(new Date().toISOString(), id, institutionId).run();
  }

  // ---- Incidents ----
  async listIncidents(studentId: string, institutionId: string): Promise<HealthIncident[]> {
    const res = await this.db.prepare(
      `SELECT * FROM student_health_incidents WHERE student_id = ? AND institution_id = ? AND is_active = 1 ORDER BY incident_date DESC, created_at DESC`
    ).bind(studentId, institutionId).all();
    return (res.results || []) as HealthIncident[];
  }

  async createIncident(id: string, institutionId: string, studentId: string, input: CreateHealthIncidentInput, userId?: string): Promise<void> {
    const now = new Date().toISOString();
    await this.db.prepare(`
      INSERT INTO student_health_incidents (id, institution_id, student_id, incident_date, incident_type, description, severity, action_taken, parent_notified, recorded_by, created_at, updated_at, created_by, updated_by)
      VALUES (?, ?, ?, COALESCE(?, date('now')), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, institutionId, studentId, input.incident_date || null, input.incident_type || 'OTHER', input.description,
      input.severity || 'MINOR', input.action_taken || null, input.parent_notified ? 1 : 0, userId || null,
      now, now, userId || null, userId || null
    ).run();
  }

  async deleteIncident(id: string, institutionId: string): Promise<void> {
    await this.db.prepare(
      `UPDATE student_health_incidents SET is_active = 0, updated_at = ? WHERE id = ? AND institution_id = ?`
    ).bind(new Date().toISOString(), id, institutionId).run();
  }
}
