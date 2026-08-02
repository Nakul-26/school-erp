export type IncidentType = 'INJURY' | 'ILLNESS' | 'ALLERGY_REACTION' | 'OTHER';
export type IncidentSeverity = 'MINOR' | 'MODERATE' | 'SEVERE';

export interface HealthVisit {
  id: string;
  institution_id: string;
  student_id: string;
  visit_date: string;
  reason: string;
  diagnosis: string | null;
  treatment: string | null;
  referred_to: string | null;
  follow_up_date: string | null;
  recorded_by: string | null;
  created_at: string;
}

export interface CreateHealthVisitInput {
  visit_date?: string;
  reason: string;
  diagnosis?: string;
  treatment?: string;
  referred_to?: string;
  follow_up_date?: string;
}

export interface Immunization {
  id: string;
  institution_id: string;
  student_id: string;
  vaccine_name: string;
  dose_number: number | null;
  administered_date: string | null;
  next_due_date: string | null;
  administered_by: string | null;
  created_at: string;
}

export interface CreateImmunizationInput {
  vaccine_name: string;
  dose_number?: number;
  administered_date?: string;
  next_due_date?: string;
  administered_by?: string;
}

export interface HealthIncident {
  id: string;
  institution_id: string;
  student_id: string;
  incident_date: string;
  incident_type: IncidentType;
  description: string;
  severity: IncidentSeverity;
  action_taken: string | null;
  parent_notified: number;
  recorded_by: string | null;
  created_at: string;
}

export interface CreateHealthIncidentInput {
  incident_date?: string;
  incident_type?: IncidentType;
  description: string;
  severity?: IncidentSeverity;
  action_taken?: string;
  parent_notified?: boolean;
}

export interface MedicalSummary {
  student_id: string;
  blood_group: string | null;
  emergency_contact: string | null;
  medical_notes: string | null;
  visits: HealthVisit[];
  immunizations: Immunization[];
  incidents: HealthIncident[];
}
